// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 40 - Metro UI (Windows Phone 8.1 Style) - 2026-05-05
// ===========================================================
const APP_VERSION = 'v5.15.0-phase40';
const CACHE_VERSION = 'comphone-v5.15.0-phase40-20260505_0930';
const BUILD_TIMESTAMP = '20260505_0930';
const GAS_VERSION = 'v5.15.0-phase40'; // Auto-deployed 2026-05-05 Phase 40

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge

// Metro UI Flag
window.METRO_UI_ENABLED = true;
window.COMPHONE_THEME = 'metro-dark-v7.0';
