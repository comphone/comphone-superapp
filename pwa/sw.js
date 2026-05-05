// ===========================================================
// COMPHONE SUPER APP v5.14.2-phase39 - Service Worker v5.14.2-phase39
// 3 Cache Strategies: Cache First | Network First | Network Only
// Background Sync: flush IndexedDB offline queue
// ===========================================================
const CACHE_V = 'comphone-v5.14.2-phase39-20260505_0700';
const CACHE_NAME = CACHE_V; // alias for compat
const BASE = '/comphone-superapp/pwa';
importScripts(BASE + '/pwa_asset_manifest.js');
const ASSETS = (self.COMPHONE_PWA_ASSETS && self.COMPHONE_PWA_ASSETS.precache || []).map(asset => (
  asset === '/' ? BASE + '/' : BASE + '/' + asset
)).concat([
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
]);

// Network Only patterns (never cache)
const NETWORK_ONLY = [
  /\/line\/webhook/,
  /action=health/,
  /action=ping/,
  /script\.google\.com/,
  /macros\/s\//,
];

// API patterns (Network First)
const API_PATTERNS = [
  /workers\.dev/,
];
