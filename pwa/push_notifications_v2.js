// ===========================================================
// push_notifications_v2.js — Phase 35.4 Enhanced Push Notifications
// COMPHONE SUPER APP V5.13.0-phase35
// Location-based + History-based + Smart Targeting
// ===========================================================

'use strict';

const PUSH_V2 = {
  subscription: null,
  locationWatchId: null,
  locationEnabled: false,
  historyEnabled: false,
  schedules: [],
  preferences: {
    locationRadius: 1000, // meters
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 6,   // 6 AM
    maxPerDay: 10
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    loadPushPreferencesV2();
    checkPushSubscriptionStatusV2();
  }, 3000);
});

// ===== LOAD PREFERENCES =====
function loadPushPreferencesV2() {
  try {
    const saved = localStorage.getItem('push_preferences_v2');
    if (saved) {
      PUSH_V2.preferences = JSON.parse(saved);
    }
    const schedules = localStorage.getItem('push_schedules');
    if (schedules) {
      PUSH_V2.schedules = JSON.parse(schedules);
    }
  } catch (e) {
    console.warn('[Push V2] Load preferences error:', e);
  }
}

function savePushPreferencesV2() {
  localStorage.setItem('push_preferences_v2', JSON.stringify(PUSH_V2.preferences));
}

// ===== ENHANCED SUBSCRIPTION =====
async function subscribePushNotificationsV2() {
  if (!isPushSupported()) {
    showToast('⚠️ Browser นี้ไม่รองรับ Push Notifications');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('❌ ไม่ได้รับสิทธิ์การแจ้งเตือน');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array_(PUSH.VAPID_PUBLIC_KEY)
    });

    PUSH_V2.subscription = subscription;

    // Save to GAS with enhanced data
    const res = await callApi('savePushSubscriptionV2', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64_(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64_(subscription.getKey('auth'))
      },
      username: (APP.user && APP.user.name) || 'unknown',
      preferences: PUSH_V2.preferences,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });

    if (res && res.success) {
      localStorage.setItem('push_subscribed_v2', 'true');
      showToast('🔔 เปิดการแจ้งเตือน V2 แล้ว!');
      updateNotifToggleV2_(true);
      
      // Start location tracking if enabled
      if (PUSH_V2.preferences.locationEnabled) {
        startLocationTracking();
      }
      
      return true;
    } else {
      showToast('⚠️ บันทึก Subscription ไม่สำเร็จ');
      return false;
    }

  } catch (err) {
    console.error('[Push V2] Subscribe error:', err);
    showToast('❌ เปิดการแจ้งเตือนไม่สำเร็จ: ' + err.message);
    return false;
  }
}

// ===== LOCATION-BASED NOTIFICATIONS =====
function startLocationTracking() {
  if (!('geolocation' in navigator)) {
    console.warn('[Push V2] Geolocation not supported');
    return;
  }

  // Watch position
  PUSH_V2.locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      // Send to GAS for location-based notification check
      callApi('checkLocationBasedNotifications', {
        lat: latitude,
        lng: longitude,
        radius: PUSH_V2.preferences.locationRadius
      }).then(res => {
        if (res && res.notifications) {
          res.notifications.forEach(n => {
            showLocalNotificationV2(n.title, n.body, {
              tag: 'location-' + Date.now(),
              data: n.data
            });
          });
        }
      }).catch(err => {
        console.warn('[Push V2] Location check error:', err);
      });
    },
    (error) => {
      console.warn('[Push V2] Geolocation error:', error);
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    }
  );

  PUSH_V2.locationEnabled = true;
  savePushPreferencesV2();
}

function stopLocationTracking() {
  if (PUSH_V2.locationWatchId !== null) {
    navigator.geolocation.clearWatch(PUSH_V2.locationWatchId);
    PUSH_V2.locationWatchId = null;
  }
  PUSH_V2.locationEnabled = false;
  savePushPreferencesV2();
}

// ===== CUSTOMER HISTORY-BASED NOTIFICATIONS =====
async function trackCustomerInteraction(customerPhone, interactionType, data = {}) {
  try {
    await callApi('trackCustomerInteraction', {
      customer_phone: customerPhone,
      interaction_type: interactionType, // 'call', 'visit', 'purchase', 'complaint'
      timestamp: Date.now(),
      data: data
    });
  } catch (err) {
    console.warn('[Push V2] Track interaction error:', err);
  }
}

async function getCustomerNotificationHistory(customerPhone) {
  try {
    const res = await callApi('getCustomerNotificationHistory', {
      customer_phone: customerPhone
    });
    return res && res.history ? res.history : [];
  } catch (err) {
    console.warn('[Push V2] Get history error:', err);
    return [];
  }
}

// ===== SMART TARGETING =====
async function sendTargetedNotification(targeting) {
  // targeting: { segment, conditions, notification }
  // segment: 'new_customers', 'vip', 'inactive', 'location_based'
  // conditions: { last_visit_days, min_purchases, location_radius }
  
  try {
    const res = await callApi('sendTargetedNotification', {
      targeting: targeting,
      notification: {
        title: targeting.notification.title,
        body: targeting.notification.body,
        icon: '/comphone-superapp/pwa/icons/icon-192.png',
        tag: targeting.notification.tag || 'targeted',
        data: targeting.notification.data || {}
      }
    });

    if (res && res.success) {
      showToast(`✅ ส่งแจ้งเตือนให้ ${res.sent_count || 0} คนสำเร็จ`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push V2] Targeted notification error:', err);
    return false;
  }
}

// ===== NOTIFICATION SCHEDULING =====
function scheduleNotification(schedule) {
  // schedule: { name, title, body, send_at (timestamp), recurring (daily/weekly/monthly), enabled }
  
  const schedules = PUSH_V2.schedules;
  schedules.push({
    id: Date.now(),
    ...schedule,
    created_at: Date.now(),
    sent_count: 0
  });
  
  localStorage.setItem('push_schedules', JSON.stringify(schedules));
  PUSH_V2.schedules = schedules;
  
  showToast(`✅ ตั้งเวลาส่ง "${schedule.name}" แล้ว`);
  return true;
}

function cancelScheduledNotification(scheduleId) {
  const schedules = PUSH_V2.schedules.filter(s => s.id !== scheduleId);
  localStorage.setItem('push_schedules', JSON.stringify(schedules));
  PUSH_V2.schedules = schedules;
  showToast('✅ ยกเลิกการตั้งเวลาแล้ว');
}

async function processScheduledNotifications() {
  const now = Date.now();
  const schedules = PUSH_V2.schedules;
  let updated = false;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    if (schedule.send_at > now) continue;

    // Send notification
    try {
      await callApi('sendScheduledNotification', {
        schedule_id: schedule.id,
        title: schedule.title,
        body: schedule.body,
        data: schedule.data || {}
      });

      schedule.sent_count = (schedule.sent_count || 0) + 1;
      schedule.last_sent = now;
      updated = true;

      // Handle recurring
      if (schedule.recurring === 'daily') {
        schedule.send_at = now + (24 * 60 * 60 * 1000);
      } else if (schedule.recurring === 'weekly') {
        schedule.send_at = now + (7 * 24 * 60 * 60 * 1000);
      } else if (schedule.recurring === 'monthly') {
        schedule.send_at = now + (30 * 24 * 60 * 60 * 1000);
      } else {
        schedule.enabled = false; // One-time, disable after send
      }
    } catch (err) {
      console.warn('[Push V2] Send scheduled error:', err);
    }
  }

  if (updated) {
    localStorage.setItem('push_schedules', JSON.stringify(schedules));
    PUSH_V2.schedules = schedules;
  }
}

// ===== SHOW LOCAL NOTIFICATION V2 =====
function showLocalNotificationV2(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  // Check quiet hours
  const hour = new Date().getHours();
  const { quietHoursStart, quietHoursEnd } = PUSH_V2.preferences;
  if (hour >= quietHoursStart || hour < quietHoursEnd) {
    console.log('[Push V2] Quiet hours, notification suppressed');
    return;
  }

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body: body,
      icon: options.icon || '/comphone-superapp/pwa/icons/icon-192.png',
      badge: options.badge || '/comphone-superapp/pwa/icons/icon-72.png',
      vibrate: options.vibrate || [200, 100, 200],
      tag: options.tag || 'comphone-v2',
      data: options.data || {},
      actions: options.actions || [],
      requireInteraction: options.requireInteraction || false
    });
  });
}

// ===== UNSUBSCRIBE V2 =====
async function unsubscribePushNotificationsV2() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await callApi('removePushSubscriptionV2', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }

    PUSH_V2.subscription = null;
    PUSH_V2.schedules = [];
    localStorage.removeItem('push_subscribed_v2');
    localStorage.removeItem('push_schedules');
    
    stopLocationTracking();
    
    showToast('🔕 ปิดการแจ้งเตือน V2 แล้ว');
    updateNotifToggleV2_(false);
    return true;
  } catch (err) {
    console.error('[Push V2] Unsubscribe error:', err);
    return false;
  }
}

// ===== CHECK SUBSCRIPTION STATUS V2 =====
async function checkPushSubscriptionStatusV2() {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    PUSH_V2.subscription = subscription;
    const isSubscribed = !!subscription;
    localStorage.setItem('push_subscribed_v2', isSubscribed ? 'true' : 'false');
    updateNotifToggleV2_(isSubscribed);

    // Start scheduled notification processor
    if (isSubscribed) {
      setInterval(processScheduledNotifications, 60000); // Check every minute
    }
  } catch (err) {
    console.warn('[Push V2] Status check error:', err);
  }
}

// ===== UPDATE TOGGLE UI V2 =====
function updateNotifToggleV2_(isOn) {
  const toggle = document.getElementById('notif-toggle-v2');
  if (!toggle) return;
  toggle.className = 'toggle-switch ms-auto' + (isOn ? ' active' : '');
  toggle.innerHTML = '<div class="toggle-knob"></div>';
}

// ===== TOGGLE NOTIFICATIONS V2 =====
async function toggleNotificationsV2() {
  const isSubscribed = localStorage.getItem('push_subscribed_v2') === 'true';
  if (isSubscribed) {
    await unsubscribePushNotificationsV2();
  } else {
    await subscribePushNotificationsV2();
  }
}

// ===== SHOW PUSH V2 SETTINGS UI =====
function showPushV2Settings() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = () => modal.remove();
  
  const isSubscribed = localStorage.getItem('push_subscribed_v2') === 'true';
  const prefs = PUSH_V2.preferences;
  
  modal.innerHTML = `
    <div class="modal-sheet" onclick="event.stopPropagation()" style="padding:0 0 24px;">
      <div class="modal-handle"></div>
      <div class="modal-title">🔔 ตั้งค่าแจ้งเตือน V2</div>
      
      <div style="padding:0 16px;">
        <!-- Subscription Toggle -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:10px;">
          <div>
            <div style="font-weight:600;font-size:14px;">การแจ้งเตือน</div>
            <div style="font-size:12px;color:#6b7280;">เปิด/ปิดการรับแจ้งเตือน</div>
          </div>
          <div id="notif-toggle-v2" class="toggle-switch ms-auto ${isSubscribed ? 'active' : ''}" onclick="toggleNotificationsV2()">
            <div class="toggle-knob"></div>
          </div>
        </div>

        <!-- Location-based -->
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;">📍 แจ้งเตือนตามพื้นที่</div>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
            <input type="checkbox" id="push-location-enabled" ${prefs.locationEnabled ? 'checked' : ''} onchange="updatePushPrefV2('locationEnabled', this.checked)">
            <label for="push-location-enabled" style="font-size:13px;">เปิดใช้งาน</label>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <label style="font-size:12px;color:#6b7280;">รัศมี (เมตร):</label>
            <input type="number" id="push-location-radius" value="${prefs.locationRadius || 1000}" style="width:80px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
          </div>
        </div>

        <!-- Quiet Hours -->
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;">🌙 เวลางดเว้น (Quiet Hours)</div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div>
              <label style="font-size:12px;color:#6b7280;">เริ่ม (ชม.):</label>
              <input type="number" id="push-quiet-start" value="${prefs.quietHoursStart || 22}" min="0" max="23" style="width:60px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
            </div>
            <div>
              <label style="font-size:12px;color:#6b7280;">สิ้นสุด (ชม.):</label>
              <input type="number" id="push-quiet-end" value="${prefs.quietHoursEnd || 6}" min="0" max="23" style="width:60px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
            </div>
          </div>
        </div>

        <!-- Max notifications per day -->
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;">📊 จำนวนสูงสุดต่อวัน</div>
          <input type="number" id="push-max-per-day" value="${prefs.maxPerDay || 10}" min="1" max="100" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;">
        </div>

        <button onclick="savePushV2Settings()" style="width:100%;padding:10px;background:#1e40af;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">
          <i class="bi bi-check-circle"></i> บันทึกตั้งค่า
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function updatePushPrefV2(key, value) {
  PUSH_V2.preferences[key] = value;
  savePushPreferencesV2();
}

function savePushV2Settings() {
  PUSH_V2.preferences = {
    locationEnabled: document.getElementById('push-location-enabled')?.checked || false,
    locationRadius: parseInt(document.getElementById('push-location-radius')?.value) || 1000,
    quietHoursStart: parseInt(document.getElementById('push-quiet-start')?.value) || 22,
    quietHoursEnd: parseInt(document.getElementById('push-quiet-end')?.value) || 6,
    maxPerDay: parseInt(document.getElementById('push-max-per-day')?.value) || 10
  };
  
  savePushPreferencesV2();
  
  // Update location tracking
  if (PUSH_V2.preferences.locationEnabled && !PUSH_V2.locationWatchId) {
    startLocationTracking();
  } else if (!PUSH_V2.preferences.locationEnabled && PUSH_V2.locationWatchId) {
    stopLocationTracking();
  }
  
  showToast('✅ บันทึกตั้งค่าแจ้งเตือนแล้ว');
  
  // Close modal
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
}

// ===== END OF FILE =====
