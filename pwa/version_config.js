// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 38 - Modern Dark Theme + Swiper Integration (2026-05-05)
// ===========================================================
const APP_VERSION = 'v5.14.1-phase38';
const CACHE_VERSION = 'comphone-v5.14.1-phase38-20260505_0630';
const BUILD_TIMESTAMP = '20260505_0630';
const GAS_VERSION = 'v5.14.1-phase38'; // Auto-deployed 2026-05-05 Phase 38

// Export for use in other modules
window.COMPHONE_VERSION = APP_VERSION;
window.COMPHONE_CACHE = CACHE_VERSION;
window.COMPHONE_BUILD = BUILD_TIMESTAMP;
window.COMPHONE_GAS_VER = GAS_VERSION;
window.__APP_VERSION = 'v' + APP_VERSION; // For version badge
