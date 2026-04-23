/**
 * api_client.js — COMPHONE SUPER APP V5.5
 * Unified API Client (Single Source of Truth)
 *
 * RULE 1: ใช้ callApi() เท่านั้น — ห้ามใช้ callGas() หรือ fetch() โดยตรง
 * RULE 2: Auth ใช้ localStorage['comphone_auth_session'] เท่านั้น
 *
 * Usage:
 *   const res = await callApi('getDashboardData');
 *   const res = await callApi('loginUser', { username, password });
 */

'use strict';

// ===== CONFIG =====
// URL source: GAS_CONFIG.url (from gas_config.js) > localStorage > fallback
const COMPHONE_DEFAULT_GAS_URL = (window.GAS_CONFIG && window.GAS_CONFIG.url) || 'https://script.google.com/macros/s/AKfycbwC8youQ6kfwGZ5DRi0P757KrJh9vhvesE7n8VcVTaj0v54ZbXdpqoJXVh9XzfqwcqtMA/exec';
const COMPHONE_SESSION_KEY = 'comphone_auth_session';
const COMPHONE_GAS_URL_KEY = 'comphone_gas_url';
const COMPHONE_API_TIMEOUT = 30000; // 30s
const COMPHONE_CACHE_TTL = 15000; // 15s frontend cache (real-time)
const COMPHONE_CACHE_TTL_SLOW = 60000; // 60s for slow-changing data

/**
 * getGasUrl() — ดึง GAS URL จาก localStorage หรือ default
 */
function getGasUrl() {
  return localStorage.getItem(COMPHONE_GAS_URL_KEY) || COMPHONE_DEFAULT_GAS_URL;
}

/**
 * getAuthToken() — ดึง token จาก comphone_auth_session
 */
function getAuthToken() {
  try {
    const sess = JSON.parse(localStorage.getItem(COMPHONE_SESSION_KEY) || '{}');
    return sess.token || '';
  } catch (e) {
    return '';
  }
}

/**
 * getAuthSession() — ดึง session object ทั้งหมด
 */
function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(COMPHONE_SESSION_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

/**
 * normalizeApiResponse(data) — normalize response จาก GAS ให้เป็นมาตรฐาน
 * รองรับ: { success, data } / { success, summary } / flat object
 */
function normalizeApiResponse(data) {
  if (!data) return { success: false, error: 'No response' };
  if (data._headers) delete data._headers;
  return data;
}

/**
 * callApi(action, payload, options) — Unified API call
 * @param {string} action - GAS action name
 * @param {object} payload - additional payload
 * @param {object} options - { timeout, noAuth }
 * @returns {Promise<object>}
 */
// ===== FRONTEND CACHE (15s TTL) =====
const _apiCache = {};

/**
 * cachedCallApi(action, payload, ttl, force) — call with frontend cache
 * @param {string} action
 * @param {object} payload
 * @param {number} ttl - cache TTL in ms (default 15s)
 * @param {boolean} force - bypass cache if true
 */
// ===== LAST UPDATED TRACKER =====
const _lastUpdated = {}; // { action: timestamp }

async function cachedCallApi(action, payload = {}, ttl = COMPHONE_CACHE_TTL, force = false) {
  const key = action + ':' + JSON.stringify(payload);
  const now = Date.now();
  if (!force && _apiCache[key] && (now - _apiCache[key].ts) < ttl) {
    return Promise.resolve(_apiCache[key].data);
  }
  // Hard mode: if force=true, also tell GAS to bypass its CacheService
  const payload2 = force ? Object.assign({}, payload, { _nocache: 1, _t: Date.now() }) : payload;
  const data = await callApi(action, payload2);
  if (data && data.success !== false) {
    _apiCache[key] = { data, ts: Date.now() };
    _lastUpdated[action] = Date.now();
    // Dispatch event for UI to update "Last Updated" display
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('comphone:data-updated', { detail: { action, ts: _lastUpdated[action] } }));
    }
  }
  return data;
}

/**
 * getLastUpdated(action) — ดึง timestamp ล่าสุดที่ fetch action นั้น
 */
function getLastUpdated(action) {
  return _lastUpdated[action] || null;
}

/**
 * clearApiCache(action) — ล้าง cache ทั้งหมดหรือเฉพาะ action
 */
function clearApiCache(action) {
  if (action) {
    Object.keys(_apiCache).filter(k => k.startsWith(action + ':')).forEach(k => delete _apiCache[k]);
  } else {
    Object.keys(_apiCache).forEach(k => delete _apiCache[k]);
  }
}

async function callApi(action, payload = {}, options = {}) {
  const url = getGasUrl();
  const timeout = options.timeout || COMPHONE_API_TIMEOUT;
  // Cache busting
  const bustUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  // Token auth
  const token = options.noAuth ? '' : getAuthToken();
  const body = JSON.stringify({ action, token, ...payload });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const _t0 = Date.now(); // เริ่ม timing

  try {
    const res = await fetch(bustUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    const data = await res.json();
    const _elapsed = Date.now() - _t0;
    // API Logging: action, elapsed time, success/fail
    if (typeof console !== 'undefined') {
      if (data && data.success === false) {
        console.warn('[callApi] ❌ ' + action + ' | ' + _elapsed + 'ms | error: ' + (data.error || 'unknown'));
      } else {
        console.log('[callApi] ✅ ' + action + ' | ' + _elapsed + 'ms');
      }
    }
    return normalizeApiResponse(data);
  } catch (e) {
    const _elapsed = Date.now() - _t0;
    if (e.name === 'AbortError') {
      console.error('[callApi] ⏱ ' + action + ' | TIMEOUT ' + _elapsed + 'ms');
      return { success: false, error: 'Request timeout (' + (timeout / 1000) + 's)' };
    }
    console.error('[callApi] ❌ ' + action + ' | ' + _elapsed + 'ms | ' + e.message);
    return { success: false, error: e.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * safeHide(elementId) — ซ่อน element อย่างปลอดภัย
 */
function safeHide(elementId) {
  const el = typeof elementId === 'string'
    ? document.getElementById(elementId)
    : elementId;
  if (el) {
    el.classList.add('hidden');
    el.style.display = 'none';
  }
}

/**
 * safeShow(elementId, displayType) — แสดง element อย่างปลอดภัย
 */
function safeShow(elementId, displayType = '') {
  const el = typeof elementId === 'string'
    ? document.getElementById(elementId)
    : elementId;
  if (el) {
    el.classList.remove('hidden');
    if (displayType) el.style.display = displayType;
    else el.style.removeProperty('display');
  }
}

/**
 * safeRender(containerId, html) — render HTML ใน container อย่างปลอดภัย
 */
function safeRender(containerId, html) {
  const el = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  if (el) el.innerHTML = html;
}

/**
 * emptyState(icon, title, subtitle, btnLabel, btnOnclick) — สร้าง empty state HTML
 */
function emptyState(icon = 'bi-inbox', title = 'ไม่มีข้อมูล', subtitle = '', btnLabel = '', btnOnclick = '') {
  return `
    <div style="text-align:center;padding:48px 20px;color:#9ca3af">
      <i class="bi ${icon}" style="font-size:48px;display:block;margin-bottom:12px;opacity:0.4"></i>
      <p style="font-size:15px;font-weight:700;color:#374151;margin-bottom:4px">${title}</p>
      ${subtitle ? `<p style="font-size:13px;margin-bottom:12px">${subtitle}</p>` : ''}
      ${btnLabel ? `<button onclick="${btnOnclick}" style="background:#1e40af;color:#fff;border:none;border-radius:10px;padding:8px 20px;font-size:13px;cursor:pointer;font-weight:600">${btnLabel}</button>` : ''}
    </div>`;
}

/**
 * loadingState(message) — สร้าง loading state HTML
 */
function loadingState(message = 'กำลังโหลด...') {
  return `
    <div style="text-align:center;padding:48px 20px;color:#9ca3af">
      <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div>
      <p style="font-size:14px">${message}</p>
    </div>`;
}

/**
 * errorState(message, retryFn) — สร้าง error state HTML
 */
function errorState(message = 'เกิดข้อผิดพลาด', retryFn = '') {
  return `
    <div style="text-align:center;padding:48px 20px;color:#9ca3af">
      <i class="bi bi-wifi-off" style="font-size:48px;display:block;margin-bottom:12px;color:#d1d5db"></i>
      <p style="font-size:15px;font-weight:700;color:#374151;margin-bottom:4px">ไม่สามารถโหลดข้อมูลได้</p>
      <p style="font-size:13px;margin-bottom:12px">${message}</p>
      ${retryFn ? `<button onclick="${retryFn}" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:8px 20px;font-size:13px;cursor:pointer;font-weight:600"><i class="bi bi-arrow-clockwise"></i> ลองใหม่</button>` : ''}
    </div>`;
}

/**
 * batchCallApi(calls, options) — เรียก API หลายครั้งพร้อมกัน
 * @param {Array<{action, ...payload}>} calls
 * @returns {Promise<Array>}
 */
async function batchCallApi(calls, options) {
  if (!Array.isArray(calls) || !calls.length) return [];
  return Promise.all(calls.map(function(c) {
    var action = c.action;
    var payload = Object.assign({}, c);
    delete payload.action;
    return callApi(action, payload, options || {});
  }));
}

/**
 * checkApiVersion() — ตรวจสอบ version ของ GAS Backend
 * ถ้า major version ไม่ตรงกัน → แจ้เตือนและ reload
 */
async function checkApiVersion() {
  var CLIENT_VERSION = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '5.5.8'; // Version Lock V5.5.8
  try {
    var res = await callApi('getVersion', {}, { noAuth: true });
    var serverVersion = res && res.version ? String(res.version).replace(/^V/i, '') : null;
    if (serverVersion) {
      // เปรียบ major.minor (5.5)
      var clientMajorMinor = CLIENT_VERSION.split('.').slice(0, 2).join('.');
      var serverMajorMinor = serverVersion.split('.').slice(0, 2).join('.');
      if (clientMajorMinor !== serverMajorMinor) {
        console.warn('[COMPHONE] ⚠️ Version mismatch (major.minor): client=' + CLIENT_VERSION + ' server=' + serverVersion);
        // major.minor ไม่ตรง → force reload หลัง 3 วินาที
        if (typeof showToast === 'function') {
          showToast('⚠️ Version ไม่ตรงกัน: Client ' + CLIENT_VERSION + ' / Server ' + serverVersion + ' — กำลังโหลดใหม่...', 'warning');
        }
        setTimeout(function() {
          console.warn('[COMPHONE] Force reload due to major.minor version mismatch');
          if (typeof window !== 'undefined') window.location.reload(true);
        }, 3000);
      } else {
        // ตรวจ patch version (5.5.x)
        var clientPatch = CLIENT_VERSION.split('.')[2] || '0';
        var serverPatch = serverVersion.split('.')[2] || '0';
        if (clientPatch !== serverPatch) {
          console.info('[COMPHONE] ℹ️ Patch version diff: client=' + CLIENT_VERSION + ' server=' + serverVersion + ' (OK — no reload)');
        } else {
          console.info('[COMPHONE] ✅ Version match: ' + CLIENT_VERSION);
        }
      }
    }
    return serverVersion;
  } catch(e) { return null; }
}

/**
 * validateToken(token) — ตรวจ format ของ token (HMAC-signed: 32hex.8hex)
 * ใช้ client-side pre-check ก่อนส่งไป GAS
 */
function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [random, sig] = parts;
  return random.length === 32 && sig.length === 8 && /^[0-9a-f]+$/.test(random) && /^[0-9a-f]+$/.test(sig);
}

/**
 * isSessionExpired() — ตรวจว่า session หมดอายุหรือยัง (client-side)
 */
function isSessionExpired() {
  try {
    const sess = getAuthSession();
    if (!sess || !sess.token) return true;
    if (!validateToken(sess.token)) return true;
    if (sess.expires_at) {
      return new Date() > new Date(sess.expires_at);
    }
    return false;
  } catch (e) {
    return true;
  }
}

/**
 * normalizeJobData(j) — normalize job object จาก GAS ให้เป็นมาตรฐาน
 */
function normalizeJobData(j) {
  if (!j) return null;
  return {
    id: j.id || j.job_id || '-',
    title: j.symptom || j.device || j.title || 'ไม่ระบุอาการ',
    customer: j.customer || j.customer_name || '-',
    phone: j.phone || j.customer_phone || '-',
    status: j.status || j.status_label || '-',
    tech: j.tech || j.technician || null,
    price: j.price || j.estimated_price || 0,
    created: j.created || j.created_at || '',
    note: j.note || j.notes || j.remark || ''
  };
}

/**
 * normalizeInventoryItem(item) — normalize inventory item
 */
function normalizeInventoryItem(item) {
  if (!item) return null;
  return {
    id: item.item_id || item.id || '-',
    name: item.item_name || item.name || '-',
    code: item.item_code || item.code || '-',
    qty: parseInt(item.qty || item.quantity || 0, 10),
    min_qty: parseInt(item.min_qty || item.reorder_point || 5, 10),
    price: parseFloat(item.price || item.unit_price || 0),
    location: item.location || item.branch_id || '-',
    low_stock: parseInt(item.qty || 0, 10) <= parseInt(item.min_qty || 5, 10)
  };
}

// ===== AUTO REFRESH MANAGER =====
const _autoRefreshHandlers = {};

/**
 * startAutoRefresh(key, fn, intervalMs) — เริ่ม auto refresh
 * @param {string} key - unique key สำหรับ handler นี้
 * @param {Function} fn - function ที่จะเรียกซ้ำ
 * @param {number} intervalMs - ระยะเวลา (default 30s)
 */
// ===== VISIBILITY PAUSE =====
// pause all auto refresh when tab is hidden, resume when visible
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Pause: store remaining time and clear intervals
      Object.keys(_autoRefreshHandlers).forEach(k => {
        if (_autoRefreshHandlers[k] && _autoRefreshHandlers[k]._fn) {
          clearInterval(_autoRefreshHandlers[k]._id);
          _autoRefreshHandlers[k]._paused = true;
        }
      });
      console.log('[AutoRefresh] ⏸ Tab hidden — paused all');
    } else {
      // Resume: restart intervals
      Object.keys(_autoRefreshHandlers).forEach(k => {
        const h = _autoRefreshHandlers[k];
        if (h && h._paused) {
          h._id = setInterval(h._fn, h._ms);
          h._paused = false;
          console.log('[AutoRefresh] ▶ Resumed ' + k);
        }
      });
    }
  });
}

function startAutoRefresh(key, fn, intervalMs = 30000) {
  stopAutoRefresh(key); // clear เก่าก่อน (no duplicate)
  const handler = {
    _fn: fn,
    _ms: intervalMs,
    _paused: false,
    _id: setInterval(fn, intervalMs)
  };
  _autoRefreshHandlers[key] = handler;
  console.log('[AutoRefresh] ▶ ' + key + ' every ' + (intervalMs/1000) + 's');
}

/**
 * stopAutoRefresh(key) — หยุด auto refresh
 */
function stopAutoRefresh(key) {
  const h = _autoRefreshHandlers[key];
  if (h) {
    clearInterval(h._id || h); // support both object and raw id
    delete _autoRefreshHandlers[key];
    console.log('[AutoRefresh] ⏹ ' + key);
  }
}

/**
 * stopAllAutoRefresh() — หยุดทั้งหมด
 */
function stopAllAutoRefresh() {
  Object.keys(_autoRefreshHandlers).forEach(k => stopAutoRefresh(k));
}

// ===== EXPORT สำหรับ PC Dashboard (ถ้าโหลดก่อน app.js) =====
if (typeof window !== 'undefined') {
  window._comphone_api_client_loaded = true; // flag บอก app.js ว่า api_client.js โหลดแล้ว
  window.callApi  = callApi; // api_client.js เป็น Single Source of Truth เสมอ
  window.safeHide = safeHide;
  window.safeShow = safeShow;
  window.safeRender = safeRender;
  window.emptyState = emptyState;
  window.loadingState = loadingState;
  window.errorState = errorState;
  window.getAuthSession = getAuthSession;
  window.getAuthToken = getAuthToken;
  window.getGasUrl = getGasUrl;
  window.normalizeApiResponse = normalizeApiResponse;
  window.batchCallApi = batchCallApi;
  window.cachedCallApi = cachedCallApi;
  window.clearApiCache = clearApiCache;
  window.getLastUpdated = getLastUpdated;
  window.startAutoRefresh = startAutoRefresh;
  window.stopAutoRefresh = stopAutoRefresh;
  window.stopAllAutoRefresh = stopAllAutoRefresh;
  window.COMPHONE_CACHE_TTL = COMPHONE_CACHE_TTL;
  window.COMPHONE_CACHE_TTL_SLOW = COMPHONE_CACHE_TTL_SLOW;
  window.checkApiVersion = checkApiVersion;
  window.normalizeJobData = normalizeJobData;
  window.normalizeInventoryItem = normalizeInventoryItem;
  window.validateToken = validateToken;
  window.isSessionExpired = isSessionExpired;
}

// ═══════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER — Send frontend errors to backend
// ═══════════════════════════════════════════════════════
(function() {
  const ERROR_ENDPOINT = window.COMPHONE_GAS_URL || window.GAS_URL || '';
  const MAX_ERRORS_PER_MINUTE = 5;
  let errorCount = 0;
  let lastReset = Date.now();

  function shouldSendError() {
    if (Date.now() - lastReset > 60000) {
      errorCount = 0;
      lastReset = Date.now();
    }
    return errorCount < MAX_ERRORS_PER_MINUTE;
  }

  function sendErrorToBackend(errorData) {
    if (!ERROR_ENDPOINT || !shouldSendError()) return;
    errorCount++;
    try {
      fetch(ERROR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logSystemError',
          level: errorData.level || 'ERROR',
          source: errorData.source || 'frontend',
          message: errorData.message || 'Unknown error',
          stack: errorData.stack || '',
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: localStorage.getItem('comphone_user') || ''
        }),
        mode: 'no-cors' // GAS requires this
      }).catch(() => {});
    } catch (_) {}
  }

  // Catch uncaught JS errors
  window.onerror = function(message, source, lineno, colno, error) {
    sendErrorToBackend({
      level: 'CRITICAL',
      source: source || 'window.onerror',
      message: message,
      stack: error ? error.stack : ''
    });
    return false; // Don't suppress the error
  };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    sendErrorToBackend({
      level: 'CRITICAL',
      source: 'unhandledrejection',
      message: event.reason ? event.reason.message || String(event.reason) : 'Unknown rejection',
      stack: event.reason && event.reason.stack ? event.reason.stack : ''
    });
  });

  // Expose manual error reporter
  window.reportError = function(message, level, source) {
    sendErrorToBackend({
      level: level || 'WARNING',
      source: source || 'manual',
      message: message,
      stack: ''
    });
  };

  console.log('[ERROR_HANDLER] Global error handler installed — reporting to backend');
})();
