// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.14-auth-guard',
  buildDate: '2026-05-06',
  buildTimestamp: '20260507_0915',
  cacheVersion: 'comphone-v5.18.14-auth-guard-20260507_0915',
  theme: 'glassmorphism-2.0',
  author: 'Comphone Team',
  features: [
    'Fixed Setup/Login (saveSetup) Bug',
    'DashboardBundle API (10x faster)',
    'Glassmorphism 2.0 KPI Cards',
    'Improved Cache Busting',
    'Stable Login Flow'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.14-auth-guard';
const BUILD_TIMESTAMP = '20260507_0915';
const CACHE_VERSION = 'comphone-v5.18.14-auth-guard-20260507_0915';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;
