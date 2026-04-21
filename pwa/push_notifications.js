// ============================================================
// push_notifications.js — Web Push API (PWA side)
// COMPHONE SUPER APP V5.5
// Subscribe/Unsubscribe Web Push Notifications
// ============================================================

'use strict';

const PUSH = {
  subscription: null,
  // VAPID Public Key — ต้องตรงกับ GAS Script Properties
  VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBuyAjqh2D-cXQFXbGAQ'
};

// ===== ตรวจสอบว่า Browser รองรับ Push หรือไม่ =====
function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// ===== ขอสิทธิ์และ Subscribe =====
async function subscribePushNotifications() {
  if (!isPushSupported()) {
    showToast('⚠️ Browser นี้ไม่รองรับ Push Notifications');
    return false;
  }

  try {
    // ขอสิทธิ์
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('❌ ไม่ได้รับสิทธิ์การแจ้งเตือน');
      return false;
    }

    // รอ Service Worker พร้อม
    const registration = await navigator.serviceWorker.ready;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array_(PUSH.VAPID_PUBLIC_KEY)
    });

    PUSH.subscription = subscription;

    // ส่ง subscription ไปเก็บที่ GAS
    const res = await callAPI('savePushSubscription', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64_(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64_(subscription.getKey('auth'))
      },
      username: (APP.user && APP.user.name) || 'unknown'
    });

    if (res && res.success) {
      localStorage.setItem('push_subscribed', 'true');
      showToast('🔔 เปิดการแจ้งเตือนแล้ว!');
      updateNotifToggle_(true);
      return true;
    } else {
      showToast('⚠️ บันทึก Subscription ไม่สำเร็จ');
      return false;
    }

  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    showToast('❌ เปิดการแจ้งเตือนไม่สำเร็จ: ' + err.message);
    return false;
  }
}

// ===== Unsubscribe =====
async function unsubscribePushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // แจ้ง GAS ให้ลบ subscription
      await callAPI('removePushSubscription', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }

    PUSH.subscription = null;
    localStorage.removeItem('push_subscribed');
    showToast('🔕 ปิดการแจ้งเตือนแล้ว');
    updateNotifToggle_(false);
    return true;

  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    return false;
  }
}

// ===== Toggle Notifications =====
async function toggleNotifications() {
  const isSubscribed = localStorage.getItem('push_subscribed') === 'true';

  if (isSubscribed) {
    await unsubscribePushNotifications();
  } else {
    await subscribePushNotifications();
  }
}

// ===== ตรวจสอบสถานะ subscription เมื่อ app เปิด =====
async function checkPushSubscriptionStatus() {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    PUSH.subscription = subscription;
    const isSubscribed = !!subscription;
    localStorage.setItem('push_subscribed', isSubscribed ? 'true' : 'false');
    updateNotifToggle_(isSubscribed);

  } catch (err) {
    console.warn('[Push] Status check error:', err);
  }
}

// ===== ส่ง Local Notification (ไม่ต้องผ่าน GAS) =====
function showLocalNotification(title, body, options) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body: body,
      icon: '/comphone-superapp/icons/icon-192.png',
      badge: '/comphone-superapp/icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: (options && options.tag) || 'comphone',
      data: (options && options.data) || {},
      actions: (options && options.actions) || []
    });
  });
}

// ===== อัปเดต Toggle UI =====
function updateNotifToggle_(isOn) {
  const toggle = document.getElementById('notif-toggle');
  if (!toggle) return;
  toggle.className = 'toggle-switch ms-auto' + (isOn ? ' active' : '');
  toggle.innerHTML = `<div class="toggle-knob"></div>`;
}

// ===== Helpers =====
function urlBase64ToUint8Array_(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64_(buffer) {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return window.btoa(binary);
}

// ===== Init: ตรวจสอบสถานะเมื่อ app โหลด =====
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkPushSubscriptionStatus, 3000);
});

// ===== Service Worker: รับ Push Message =====
// (ใส่ใน sw.js)
/*
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/comphone-superapp/icons/icon-192.png',
      badge: data.badge || '/comphone-superapp/icons/icon-72.png',
      tag: data.tag || 'comphone',
      data: data.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
*/
