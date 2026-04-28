// ============================================================
// COMPHONE SUPER APP V5.5
// pwa_install.js — PWA Install Banner + Service Worker Registration
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   - Register Service Worker (sw.js)
//   - ดัก beforeinstallprompt event
//   - แสดง Install Banner เมื่อเข้าใช้ครั้งที่ 3+
//   - ซ่อน 7 วันถ้ากด "ไม่ใช่ตอนนี้"
//   - ซ่อนถาวรหลังติดตั้งสำเร็จ
// ============================================================

'use strict';

const PWA_VISIT_KEY    = 'cpa_visit_count';
const PWA_DISMISS_KEY  = 'cpa_banner_dismissed_until';
const PWA_INSTALLED_KEY = 'cpa_installed';
const SHOW_BANNER_AFTER = 3; // แสดงหลังเข้าใช้ครั้งที่ 3

let _deferredPrompt = null;

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================
/**
 * Register Service Worker
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return;
  }

  const swUrl = typeof getVersionedUrl === 'function'
    ? getVersionedUrl('sw.js')
    : './sw.js';

  navigator.serviceWorker.register(swUrl, { scope: './' })
    .then(registration => {
      console.log('[PWA] SW registered:', registration.scope);
      registration.update();

      // ตรวจสอบ update
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            _showUpdateBanner_();
          }
        });
      });

      // Background Sync registration
      if ('sync' in registration) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync.register('comphone-offline-queue')
            .catch(err => console.warn('[PWA] BG Sync registration failed:', err.message));
        });
      }
    })
    .catch(err => {
      console.error('[PWA] SW registration failed:', err.message);
    });

  // รับ message จาก SW
  navigator.serviceWorker.addEventListener('message', event => {
    if (!event.data) return;
    if (event.data.type === 'SYNC_OFFLINE_QUEUE') {
      // Trigger offline queue flush ใน error_boundary.js
      if (typeof syncOfflineQueue === 'function') {
        syncOfflineQueue();
      }
    }
    if (event.data.type === 'SYNC_COMPLETE') {
      console.log('[PWA] Sync complete from SW');
    }
  });
}

// ============================================================
// INSTALL BANNER
// ============================================================
/**
 * เริ่มต้น Install Banner logic
 */
function initInstallBanner() {
  // ถ้าติดตั้งแล้ว ไม่ต้องแสดง
  if (localStorage.getItem(PWA_INSTALLED_KEY) === 'true') return;

  // นับ visit
  const count = (parseInt(localStorage.getItem(PWA_VISIT_KEY), 10) || 0) + 1;
  localStorage.setItem(PWA_VISIT_KEY, count);

  // ดัก beforeinstallprompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;

    // ตรวจสอบว่าควรแสดง banner หรือไม่
    if (count >= SHOW_BANNER_AFTER && _shouldShowBanner_()) {
      _showInstallBanner_();
    }
  });

  // ดัก appinstalled
  window.addEventListener('appinstalled', () => {
    localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    _hideInstallBanner_();
    _deferredPrompt = null;
    console.log('[PWA] App installed successfully');
    showToast('✅ ติดตั้งแอปสำเร็จ!');
  });
}

/**
 * ตรวจสอบว่าควรแสดง banner หรือไม่
 * @return {boolean}
 */
function _shouldShowBanner_() {
  const dismissedUntil = localStorage.getItem(PWA_DISMISS_KEY);
  if (!dismissedUntil) return true;
  return Date.now() > parseInt(dismissedUntil, 10);
}

/**
 * แสดง Install Banner (bottom sheet)
 */
function _showInstallBanner_() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'ติดตั้งแอป COMPHONE');
  banner.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    border-radius: 16px 16px 0 0;
    padding: 16px 20px 24px;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
    transform: translateY(100%);
    transition: transform 0.3s ease;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <img src="./icons/icon-72.png" alt="COMPHONE"
        style="width:48px;height:48px;border-radius:10px;object-fit:cover"
        onerror="this.style.display='none'">
      <div>
        <div style="font-weight:700;font-size:15px;color:#111827">COMPHONE Super App</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">ติดตั้งเพื่อใช้งานแบบออฟไลน์ได้</div>
      </div>
      <button id="pwa-banner-dismiss-x"
        style="margin-left:auto;background:none;border:none;font-size:20px;color:#9ca3af;cursor:pointer;padding:4px"
        aria-label="ปิด">✕</button>
    </div>
    <div style="display:flex;gap:8px">
      <button id="pwa-install-btn"
        style="flex:2;padding:11px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
        📲 ติดตั้งแอป
      </button>
      <button id="pwa-later-btn"
        style="flex:1;padding:11px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer">
        ไม่ใช่ตอนนี้
      </button>
    </div>`;

  document.body.appendChild(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });
  });

  // Event listeners
  document.getElementById('pwa-install-btn')
    .addEventListener('click', _triggerInstall_);

  document.getElementById('pwa-later-btn')
    .addEventListener('click', _dismissBanner_);

  document.getElementById('pwa-banner-dismiss-x')
    .addEventListener('click', _dismissBanner_);
}

/**
 * ซ่อน Install Banner
 */
function _hideInstallBanner_() {
  const banner = document.getElementById('pwa-install-banner');
  if (!banner) return;
  banner.style.transform = 'translateY(100%)';
  setTimeout(() => banner.remove(), 350);
}

/**
 * กด "ติดตั้งแอป"
 */
async function _triggerInstall_() {
  if (!_deferredPrompt) {
    showToast('ไม่สามารถติดตั้งได้ในขณะนี้');
    return;
  }

  _hideInstallBanner_();

  try {
    await _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);

    if (outcome === 'accepted') {
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      showToast('✅ กำลังติดตั้ง...');
    }
  } catch (err) {
    console.error('[PWA] Install prompt error:', err.message);
  }

  _deferredPrompt = null;
}

/**
 * กด "ไม่ใช่ตอนนี้" — ซ่อน 7 วัน
 */
function _dismissBanner_() {
  const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(PWA_DISMISS_KEY, until);
  _hideInstallBanner_();
}

// ============================================================
// UPDATE BANNER
// ============================================================
/**
 * แสดง banner เมื่อมี SW version ใหม่
 */
function _showUpdateBanner_() {
  if (document.getElementById('pwa-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: #1d4ed8;
    color: #fff;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  `;
  banner.innerHTML = `
    <span>🔄 มีอัปเดตใหม่พร้อมใช้งาน</span>
    <button id="pwa-update-btn"
      style="padding:5px 12px;background:#fff;color:#1d4ed8;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">
      อัปเดตเลย
    </button>`;

  document.body.insertBefore(banner, document.body.firstChild);

  document.getElementById('pwa-update-btn')
    .addEventListener('click', () => {
      navigator.serviceWorker.getRegistration()
        .then(reg => {
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          window.location.reload();
        });
    });
}

// ============================================================
// INIT
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    initInstallBanner();
  });
} else {
  registerServiceWorker();
  initInstallBanner();
}

// ============================================================
// EXPOSE
// ============================================================
window.registerServiceWorker = registerServiceWorker;
window.initInstallBanner     = initInstallBanner;
