// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 35 Advanced Integration & Mobile Enhancement (2026-05-01)
// ===========================================================
const APP_VERSION = '5.13.0-phase35';
const CACHE_VERSION = 'comphone-v5.13.0-phase35-20260501_1930';
const BUILD_TIMESTAMP = '20260501_1930';
const GAS_VERSION = '524'; // จะอัปเดตหลัง deploy GAS Phase 35

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge
