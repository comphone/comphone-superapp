// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 37 Settings Complete + Auto-Deploy (2026-05-04)
// ===========================================================
const APP_VERSION = 'v5.14.5-phase37';
const CACHE_VERSION = 'comphone-v5.14.5-phase37-20260504_2037';
const BUILD_TIMESTAMP = '20260504_2037';
const GAS_VERSION = 'v5.14.5-phase37'; // Auto-deployed 2026-05-04 Phase 37 (Version 539)

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge
