// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 36 System Hardening & UX Polish (2026-05-02)
// ===========================================================
const APP_VERSION = 'v5.13.0-phase36';
const CACHE_VERSION = 'comphone-v5.13.0-phase36-20260502_1430';
const BUILD_TIMESTAMP = '20260502_1430';
const GAS_VERSION = 'v5.13.0-phase36'; // Updated 2026-05-02 Phase 36

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge
