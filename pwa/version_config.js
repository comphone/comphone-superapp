// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 44 - Dashboard Modernization + Setup Fix
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.18.27-vision-preview-line-router',
  buildDate: '2026-05-07',
  buildTimestamp: '20260507_1910',
  cacheVersion: 'comphone-v5.18.27-vision-preview-line-router-20260507_1910',
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
    'AI Vision execution preview and LINE room router'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;


// Backward-compatible exports for legacy modules and guards
const APP_VERSION = 'v5.18.27-vision-preview-line-router';
const BUILD_TIMESTAMP = '20260507_1910';
const CACHE_VERSION = 'comphone-v5.18.27-vision-preview-line-router-20260507_1910';
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_CACHE = CACHE_VERSION;
