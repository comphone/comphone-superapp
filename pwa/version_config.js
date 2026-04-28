// ============================================================
// COMPHONE SUPER APP — Centralized Version Config
// Single Source of Truth for all version numbers
// ============================================================
const APP_VERSION = '5.9.0-phase2d';
const CACHE_VERSION = 'comphone-v5.9.0-phase2d-20260428_1725';
const BUILD_TIMESTAMP = '20260428_1725';
const GAS_VERSION = '503';

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge

// Cache busting helper
function getVersionedUrl(url) {
  if (url.startsWith('http') || url.startsWith('//')) return url; // Skip external URLs
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'v=' + APP_VERSION + '&t=' + BUILD_TIMESTAMP;
}

// Register SW with cache busting
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(getVersionedUrl('sw.js'))
      .then(reg => {
        console.log('[SW] Registered:', reg);
        // Force update check
        reg.update();
      })
      .catch(err => console.error('[SW] Registration failed:', err));
  }
}
