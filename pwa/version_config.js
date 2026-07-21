// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 213 - Protected Menu Collision Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.47-sprint219',
  buildDate: '2026-07-21',
  buildTimestamp: '20260721_1541',
  cacheVersion: 'comphone-v5.18.47-sprint219-20260721_1541',
  theme: 'glassmorphism-2.0',
  author: 'Comphone Team',
  features: [
    'Fixed Setup/Login (saveSetup) Bug',
    'DashboardBundle API (10x faster)',
    'Glassmorphism 2.0 KPI Cards',
    'Improved Cache Busting',
    'Stable Login Flow',
    'Runtime Self-Test Panel',
    'Write-flow idempotency and offline replay stability',
    'Gated staging write smoke for create flows',
    'AI Vision capability audit and workflow contract',
    'AI Vision PC and mobile operations panel',
    'AI Vision runtime smoke and browser self-test',
    'AI Vision Gemini readiness indicators',
    'AI Vision E2E safety gate and human review queue',
    'AI Vision field job timeline link',
    'AI Vision suggested next actions',
    'AI Vision controlled execution gate',
    'AI Vision execution preview and LINE room router',
    'LINE Command Center with room status, ack tracking, and safe room messaging',
    'CI/CD deploy reliability guards and Pages freshness checks',
    'Sprint 99 live cache-bust and operator readiness verification',
    'Sprint 100 operator menu click-through guard',
    'Sprint 112 Admin Repair Console for PC Settings and Mobile Admin',
    'Sprint 113-117 Jobs/Billing/Reports/Vision/LINE operational hardening',
    'Sprint 118 mobile quick action modal switching',
    'Sprint 119 Inventory/PO/Warranty workflow hardening',
    'Sprint 120 Settings/Admin runtime hardening',
    'Sprint 121 performance/accessibility guardrails',
    'Sprint 122 dashboard operator analytics polish',
    'Sprint 123 live visual QA and mobile asset manifest completeness',
    'Sprint 124 protected visual/menu QA runbook',
    'Sprint 125 role-based dashboard widgets',
    'Sprint 127 per-room LINE notification controls',
    'Sprint 154 post-deploy Pages confirmation',
    'Sprint 155 owner data backfill readiness',
    'Sprint 156 mobile menu E2E guard',
    'Sprint 157 PC dashboard workflow guard',
    'Sprint 158 AI Vision and LINE room control guard',
    'Sprint 159 post-deploy publish confirmation',
    'Sprint 160 real browser click-through contract',
    'Sprint 161 protected live token sweep',
    'Sprint 162 owner data cleanup decision pack',
    'Sprint 163 AI Vision real sample pilot gate',
    'Sprint 164 Pages publish lock',
    'Sprint 165 browser profile click-through pack',
    'Sprint 166 protected token full sweep pack',
    'Sprint 167 owner cleanup execution readiness',
    'Sprint 168 AI Vision real sample runbook',
    'Sprint 169 Pages fresh release gate',
    'Sprint 170 protected browser acceptance gate',
    'Sprint 171 AI Vision sample evidence contract',
    'Sprint 172 LINE room notification matrix gate',
    'Sprint 173 release readiness master gate',
    'Sprint 174 strict protected browser runbook',
    'Sprint 175 AI Vision sample pilot gate',
    'Sprint 176 published protected acceptance',
    'Sprint 177 AI Vision real sample evidence',
    'Sprint 178 strict live acceptance gate',
    'Sprint 179 AI Vision real sample execution gate',
    'Sprint 180 strict protected live proof',
    'Sprint 181 AI Vision owner sample run gate',
    'Sprint 182 smoke/test data cleanup execution controls',
    'Sprint 183 LINE AI Vision ingress readiness guard',
    'Sprint 184 Jobs detail and archive-delete repair',
    'Sprint 185 LINE group image pilot readiness guard',
    'Sprint 188 per-room LINE bot reply toggle controls (separate from notification)',
    'Sprint 189 LINE reply noise suppression (Worker quiet-group-forward v1.0.5)',
    'Sprint 190 AI Vision Review Inbox (PC + mobile) with approve/reject workflow',
    'Sprint 191 AI Vision inbox render smoke — syntax/render regression guard',
    'Sprint 192 Mobile dashboard simplification: 4 quick actions, fast-boot cache, progressive More menu',
    'Sprint 193 Delete/Camera hardening: camera stays in job detail, cleanup-tools shortcut for admin/owner',
    'Sprint 194 Job Archive Restore: preview + duplicate-block + RESTORE_JOB confirm gate in admin Archive tab',
    'Sprint 195 Mobile tap reliability: explicit display:flex on job detail modal, renderTechHome null guard, SW update banner on SW_ACTIVATED, dead code cleanup',
    'Sprint 196 SW auto-reload: SW_ACTIVATED now sends activatedByUser=true so old clients auto-reload on new SW activation without waiting for user action',
    'Sprint 197-200 SW update reliability: user-confirmed SKIP_WAITING activation, controllerchange auto-reload, startup/focus version checks, and graceful Archive deployment errors',
    'Sprint 198 Guaranteed update delivery: inline version guard in index.html (detects stale cached scripts on fresh page load and force-reloads); SW navigation uses cache:no-cache to bypass iOS WebKit HTTP cache; periodic registration.update() every 10 min + on visibilitychange',
    'Sprint 199 Auto version-bump tooling: bump-version.js auto-updates all ?v= params in index.html/dashboard_pc.html/sw.js/version.json from single source of truth; version_config.js added to SW NETWORK_ONLY so clients always receive the latest build version even before SW updates',
    'Sprint 200 Fix SW update banner deadlock: remove skipWaiting() from install event so new SW stays in installed (waiting) state until user taps banner; add controllerchange+SW_ACTIVATED auto-reload in version_config.js as emergency fallback for all client versions',
    'Sprint 211 15-step system test with 167 deterministic checks',
    'Sprint 212 auth-aware warranty startup, demand-driven Background Sync, and CI completion guard',
    'Sprint 213 protected PC/mobile acceptance and canonical Jobs detail ownership'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.47-sprint219';
const BUILD_TIMESTAMP = '20260721_1541';
const CACHE_VERSION = 'comphone-v5.18.47-sprint219-20260721_1541';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;

// Emergency auto-reload — attached before pwa_install.js loads.
// version_config.js is NETWORK_ONLY so this code is always fresh.
// Handles the case where old pwa_install.js has _reloadAfterSwUpdate gate
// or no SW_ACTIVATED handler (sprint194 clients).
(function () {
  if (!('serviceWorker' in navigator)) return;
  var _vcReloaded_ = false;
  function _vcAutoReload_() {
    if (_vcReloaded_) return;
    _vcReloaded_ = true;
    console.log('[VER] Auto-reload triggered from version_config.js');
    setTimeout(function () { window.location.reload(); }, 300);
  }
  // controllerchange: new SW took control → reload immediately
  navigator.serviceWorker.addEventListener('controllerchange', _vcAutoReload_);
  // SW_ACTIVATED with activatedByUser=true: new SW notified us directly
  navigator.serviceWorker.addEventListener('message', function (evt) {
    if (evt.data && evt.data.type === 'SW_ACTIVATED' && evt.data.activatedByUser) {
      _vcAutoReload_();
    }
  });

  // This file is NETWORK_ONLY in every supported service worker. Keep the
  // update-button bridge here so clients with an older cached pwa_install.js
  // can still request, activate, and reload into the current build.
  window.COMPHONE_FORCE_PWA_UPDATE = async function (button) {
    if (button) {
      button.disabled = true;
      button.textContent = 'กำลังอัปเดต...';
    }
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return _vcAutoReload_();
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      if (reg.installing) {
        var worker = reg.installing;
        var activate = function () {
          if (worker.state === 'installed' && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        worker.addEventListener('statechange', activate);
        activate();
        setTimeout(function () {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          else _vcAutoReload_();
        }, 10000);
        return;
      }
      _vcAutoReload_();
    } catch (error) {
      console.warn('[VER] Service worker update bridge failed:', error && error.message ? error.message : error);
      _vcAutoReload_();
    }
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    var button = target && target.closest ? target.closest('#pwa-update-btn') : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.COMPHONE_FORCE_PWA_UPDATE(button);
  }, true);
}());
