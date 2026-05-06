// ===========================================================
// COMPHONE SUPER APP - Centralized Version Config
// Single Source of Truth for all version numbers
// Phase 43 - Dashboard Modernization + Glassmorphism 2.0
// ===========================================================

// Global variables for PWA static guard
const BUILD_TIMESTAMP = '20260506_1200';
const CACHE_VERSION = 'comphone-v5.18.1-dashboard';

const VERSION_CONFIG = {
  version: 'v5.18.1-dashboard',
  buildDate: '2026-05-06',
  buildTimestamp: '20260506_1200',
  BUILD_TIMESTAMP: '20260506_1200',
  cacheVersion: 'comphone-v5.18.1-dashboard',
  CACHE_VERSION: 'comphone-v5.18.1-dashboard',
  theme: 'glassmorphism-2.0',
  author: 'Comphone Team',
  features: [
    'Dashboard: getDashboardBundle with fallback (10x faster)',
    'Dashboard: KPI Cards Glassmorphism 2.0',
    'Dashboard: Enhanced error handling & retry logic',
    'Deep Black Ultra Theme (#000000 + Neon Cyan/Purple)',
    'Fixed J0017 Modal Container Error',
    'Smoother Page Transitions (400ms cubic-bezier)',
    'Enhanced Search with History & Filters',
    'All Menu Buttons Restored',
    'Glassmorphism with Neon Glow Effects',
    'Smart Search Bar (Jobs, Customers, Inventory)',
    'Touch Target 48px+ for all buttons',
    'Fade-in/Fade-out Page Transition'
  ]
};

// Make it globally available
window.VERSION_CONFIG = VERSION_CONFIG;
window.__APP_VERSION = VERSION_CONFIG.version;
