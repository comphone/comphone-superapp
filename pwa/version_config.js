// ============================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 34 Frontend COMPLETE (2026-05-01)
// ============================================================
const APP_VERSION = '5.12.0-phase34';
const CACHE_VERSION = 'comphone-v5.12.0-phase34-20260501_1800';
const BUILD_TIMESTAMP = '20260501_1800';
const GAS_VERSION = '524';

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge
