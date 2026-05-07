// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.19-vision-audit',
  buildDate: '2026-05-07',
  buildTimestamp: '20260507_1230',
  cacheVersion: 'comphone-v5.18.19-vision-audit-20260507_1230',
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
    'AI Vision capability audit and workflow contract'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.19-vision-audit';
const BUILD_TIMESTAMP = '20260507_1230';
const CACHE_VERSION = 'comphone-v5.18.19-vision-audit-20260507_1230';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;
