// ===========================================================
// COMPHONE SUPER APP v5.18.12-nav-ux - Service Worker
// 3 Cache Strategies: Cache First | Network First | Network Only
// Background Sync: flush IndexedDB offline queue
// ===========================================================
const CACHE_V = 'comphone-v5.18.12-nav-ux-20260507_0015';
const CACHE_NAME = CACHE_V; // alias for compat
const BASE = '/comphone-superapp/pwa';

importScripts(BASE + '/pwa_asset_manifest.js');

const ASSETS = (self.COMPHONE_PWA_ASSETS && self.COMPHONE_PWA_ASSETS.precache || []).map(asset =>
  asset === '/' ? BASE + '/' : BASE + '/' + asset
).concat([
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  BASE + '/style_deep_black_ultra.css', // Add Deep Black Ultra theme
  BASE + '/style.css'
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

// ===== INSTALL =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precaching assets:', ASSETS.length);
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      ).then(() => {
        // Notify all clients that SW is activated
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_V,
              timestamp: Date.now()
            });
          });
        });
      }).then(() => self.clients.claim())
    )
  );
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network Only
  if (NETWORK_ONLY.some(pattern => pattern.test(url.pathname + url.search))) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // API patterns (Network First)
  if (API_PATTERNS.some(pattern => pattern.test(url.href))) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache First (default)
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).then(fetchResponse => {
        // Cache successful GET requests
        if (event.request.method === 'GET' && fetchResponse.status === 200) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => caches.match(event.request))
    )
  );
});

// ===== MESSAGE HANDLER =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
