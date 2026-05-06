// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.2-dashboard',
  buildDate: '2026-05-06',
  buildTimestamp: '20260506_1430',
  cacheVersion: 'comphone-v5.18.2-dashboard',
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
