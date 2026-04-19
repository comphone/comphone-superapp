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
const COMPHONE_DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec';
const COMPHONE_SESSION_KEY = 'comphone_auth_session';
const COMPHONE_GAS_URL_KEY = 'comphone_gas_url';
const COMPHONE_API_TIMEOUT = 30000; // 30s

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

  try {
    const res = await fetch(bustUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      redirect: 'follow',
      signal: controller.signal
    });
    const data = await res.json();
    return normalizeApiResponse(data);
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, error: 'Request timeout (' + (timeout / 1000) + 's)' };
    }
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

// ===== EXPORT สำหรับ PC Dashboard (ถ้าโหลดก่อน app.js) =====
if (typeof window !== 'undefined') {
  window.callApi = window.callApi || callApi;
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
}
