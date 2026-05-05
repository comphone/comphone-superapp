// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 42 - Deep Black Ultra Theme
// ===========================================================

const VERSION_CONFIG = {
  version: 'v5.17.0-phase42',
  buildDate: '2026-05-05',
  theme: 'deep-black-ultra-v9',
  author: 'Comphone Team',
  features: [
    'Deep Black Ultra Theme (#000000 + Neon Cyan/Purple)',
    'Fixed J0017 Modal Container Error',
    'Smoother Page Transitions (400ms cubic-bezier)',
    'Enhanced Search with History & Filters',
    'All Menu Buttons Restored',
    'Glassmorphism with Neon Glow Effects'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;
