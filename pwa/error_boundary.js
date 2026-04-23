// ============================================================
// COMPHONE SUPER APP V5.5
// error_boundary.js — Global Error Boundary + Offline Queue
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   1. Global Error Handler (window.onerror + unhandledrejection)
//   2. Offline Queue ที่ sync จริงเมื่อกลับมา online
//   3. Error reporting ไป GAS (ถ้า online)
//   4. User-friendly error display
// ============================================================

'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const EB_QUEUE_KEY    = 'comphone_offline_queue';
const EB_ERROR_KEY    = 'comphone_error_log';
const EB_MAX_QUEUE    = 100;  // สูงสุด 100 รายการ
const EB_MAX_ERRORS   = 50;   // สูงสุด 50 error logs
const EB_RETRY_LIMIT  = 3;    // retry สูงสุด 3 ครั้ง

// ============================================================
// 1. GLOBAL ERROR HANDLER
// ============================================================
/**
 * Catch uncaught JS errors
 */
window.onerror = function(message, source, lineno, colno, error) {
  const errInfo = {
    type:    'uncaught',
    message: String(message || ''),
    source:  String(source || '').replace(window.location.origin, ''),
    line:    lineno,
    col:     colno,
    stack:   error ? (error.stack || '') : '',
    time:    Date.now(),
    page:    typeof APP !== 'undefined' ? APP.currentPage : 'unknown',
    user:    typeof APP !== 'undefined' && APP.user ? (APP.user.name || APP.user.username) : 'anonymous'
  };

  _logError(errInfo);

  // แสดง toast เฉพาะ error ที่ user เห็นได้
  if (!message.includes('ResizeObserver') && !message.includes('Script error')) {
    _showErrorToast('⚠️ เกิดข้อผิดพลาด — ข้อมูลถูกบันทึกแล้ว');
  }

  return false; // ไม่ suppress default behavior
};

/**
 * Catch unhandled Promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
  const reason = event.reason;
  const errInfo = {
    type:    'promise',
    message: reason instanceof Error ? reason.message : String(reason || 'Promise rejected'),
    stack:   reason instanceof Error ? (reason.stack || '') : '',
    time:    Date.now(),
    page:    typeof APP !== 'undefined' ? APP.currentPage : 'unknown',
    user:    typeof APP !== 'undefined' && APP.user ? (APP.user.name || APP.user.username) : 'anonymous'
  };

  _logError(errInfo);
});

// ============================================================
// 2. ERROR LOGGER
// ============================================================
/**
 * บันทึก error ลง localStorage
 * @param {Object} errInfo
 */
function _logError(errInfo) {
  try {
    const logs = JSON.parse(localStorage.getItem(EB_ERROR_KEY) || '[]');
    logs.push(errInfo);
    // เก็บแค่ล่าสุด EB_MAX_ERRORS รายการ
    localStorage.setItem(EB_ERROR_KEY, JSON.stringify(logs.slice(-EB_MAX_ERRORS)));
  } catch (e) {
    // localStorage อาจเต็ม — ล้างแล้วเริ่มใหม่
    try { localStorage.removeItem(EB_ERROR_KEY); } catch (_) {}
  }
}

/**
 * ดึง error logs ล่าสุด
 * @param {number} n - จำนวนที่ต้องการ
 * @return {Array}
 */
function getErrorLogs(n) {
  try {
    const logs = JSON.parse(localStorage.getItem(EB_ERROR_KEY) || '[]');
    return logs.slice(-(n || 20)).reverse();
  } catch (e) {
    return [];
  }
}

/**
 * ล้าง error logs
 */
function clearErrorLogs() {
  localStorage.removeItem(EB_ERROR_KEY);
}

// ============================================================
// 3. OFFLINE QUEUE (Enhanced — sync จริง)
// ============================================================
/**
 * บันทึก action ลง offline queue
 * Override saveOfflineAction ใน app.js
 * @param {Object} action - { action, params, time, retries }
 */
window.saveOfflineAction = function(action) {
  try {
    const queue = JSON.parse(localStorage.getItem(EB_QUEUE_KEY) || '[]');
    queue.push({
      ...action,
      time:    action.time    || Date.now(),
      retries: action.retries || 0,
      id:      action.id      || `qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    });
    // เก็บแค่ EB_MAX_QUEUE รายการล่าสุด
    localStorage.setItem(EB_QUEUE_KEY, JSON.stringify(queue.slice(-EB_MAX_QUEUE)));
  } catch (e) {
    console.warn('saveOfflineAction: localStorage error', e);
  }
};

/**
 * Sync offline queue เมื่อกลับมา online
 * Override syncOfflineQueue ใน app.js
 */
window.syncOfflineQueue = async function() {
  const queue = JSON.parse(localStorage.getItem(EB_QUEUE_KEY) || '[]');
  if (!queue.length) return;

  const url = typeof APP !== 'undefined' ? (APP.scriptUrl || '') : '';
  if (!url) return;

  showToast(`🔄 กำลัง Sync ${queue.length} รายการ...`);

  const remaining = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of queue) {
    // ข้ามถ้า retry เกินกำหนด
    if ((item.retries || 0) >= EB_RETRY_LIMIT) {
      _logError({
        type: 'offline_queue_expired',
        message: `Action ${item.action || item.type} expired after ${EB_RETRY_LIMIT} retries`,
        time: Date.now()
      });
      failCount++;
      continue;
    }

    try {
      const payload = item.action
        ? { action: item.action, ...(item.params || {}) }
        : item;

      // เพิ่ม auth token ถ้ามี
      if (typeof AUTH !== 'undefined' && AUTH.token) {
        payload.token    = AUTH.token;
        payload.username = AUTH.username;
      } else if (typeof APP !== 'undefined' && APP.user?.authToken) {
        payload.token    = APP.user.authToken;
        payload.username = APP.user.username;
      }

      let data;
      if (window.AI_EXECUTOR && window.AI_EXECUTOR.execute) {
        // PHASE 20.4: ใช้ AI_EXECUTOR แทน fetch โดยตรง
        const action = payload.action;
        const params = Object.assign({}, payload);
        delete params.action;
        const method = (typeof isReadAction === 'function' && isReadAction(action)) ? 'query' : 'execute';
        data = await window.AI_EXECUTOR[method]({ action: action, payload: params });
      } else {
        // Fallback: GET with query params (POST body หายตอน GAS 302 redirect)
        const qs = new URLSearchParams(payload).toString();
        const res = await fetch(url + '?' + qs, { redirect: 'follow' });
        data = await res.json();
      }

      if (data && data.success) {
        successCount++;
      } else {
        // Retry
        remaining.push({ ...item, retries: (item.retries || 0) + 1 });
        failCount++;
      }
    } catch (e) {
      // Network error — retry
      remaining.push({ ...item, retries: (item.retries || 0) + 1 });
      failCount++;
    }
  }

  // บันทึก queue ที่เหลือ
  if (remaining.length > 0) {
    localStorage.setItem(EB_QUEUE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(EB_QUEUE_KEY);
  }

  // แสดงผล
  if (successCount > 0 && failCount === 0) {
    showToast(`✅ Sync สำเร็จ ${successCount} รายการ`);
  } else if (successCount > 0) {
    showToast(`✅ Sync ${successCount} รายการ (ล้มเหลว ${failCount})`);
  } else if (failCount > 0) {
    showToast(`⚠️ Sync ล้มเหลว ${failCount} รายการ — จะลองใหม่`);
  }

  // Reload data หลัง sync
  if (successCount > 0 && typeof loadLiveData === 'function') {
    setTimeout(loadLiveData, 500);
  }
};

/**
 * ดึงจำนวน pending items ใน offline queue
 * @return {number}
 */
function getOfflineQueueCount() {
  try {
    return JSON.parse(localStorage.getItem(EB_QUEUE_KEY) || '[]').length;
  } catch (e) {
    return 0;
  }
}

/**
 * ล้าง offline queue (ใช้เมื่อต้องการ reset)
 */
function clearOfflineQueue() {
  localStorage.removeItem(EB_QUEUE_KEY);
}

// ============================================================
// 4. ERROR TOAST (ไม่ใช้ showToast เพื่อหลีกเลี่ยง circular)
// ============================================================
/**
 * แสดง error toast แบบ non-blocking
 * @param {string} msg
 */
function _showErrorToast(msg) {
  try {
    if (typeof showToast === 'function') {
      showToast(msg);
    } else {
      // Fallback ถ้า showToast ยังไม่โหลด
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:10px 20px;border-radius:12px;z-index:9999;font-size:14px';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 3000);
    }
  } catch (e) {
    // Ignore
  }
}

// ============================================================
// 5. QUEUE BADGE — แสดงจำนวน pending ใน UI
// ============================================================
/**
 * อัปเดต badge แสดงจำนวน offline queue
 */
function updateQueueBadge() {
  const count = getOfflineQueueCount();
  const badge = document.getElementById('offline-queue-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ============================================================
// INIT — ตรวจสอบ queue เมื่อโหลดหน้า
// ============================================================
window.addEventListener('load', function() {
  // แสดง badge ถ้ามี pending queue
  setTimeout(updateQueueBadge, 2000);

  // ถ้า online และมี queue — sync ทันที
  if (navigator.onLine) {
    const count = getOfflineQueueCount();
    if (count > 0) {
      setTimeout(function() {
        showToast(`📦 มี ${count} รายการรอ Sync`);
        setTimeout(syncOfflineQueue, 1000);
      }, 3000);
    }
  }
});

// Expose
window.getErrorLogs       = getErrorLogs;
window.clearErrorLogs     = clearErrorLogs;
window.getOfflineQueueCount = getOfflineQueueCount;
window.clearOfflineQueue  = clearOfflineQueue;
window.updateQueueBadge   = updateQueueBadge;
