// ===========================================================
// COMPHONE SUPER APP - Service Worker
// 3 Cache Strategies: Cache First | Network First | Network Only
// Background Sync: flush IndexedDB offline queue
// ===========================================================
const CACHE_V = 'comphone-v5.18.47-sprint221-20260721_1622';
const CACHE_NAME = CACHE_V; // alias for compat
const BASE = new URL(self.registration.scope).pathname.replace(/\/+$/, '');
const NAVIGATION_FALLBACK = BASE + '/index.html';

importScripts(BASE + '/pwa_asset_manifest.js');

const ASSETS = (self.COMPHONE_PWA_ASSETS && self.COMPHONE_PWA_ASSETS.precache || []).map(asset =>
  asset === '/' ? BASE + '/' : BASE + '/' + asset
).concat([
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.woff2?dd67030699838ea613ee6dbda90effa6',
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
  /\/version\.json/,       // always fetch fresh for version checks
  /\/version_config\.js/,  // always fetch fresh so clients see the latest build version
];

// API patterns (Network First)
const API_PATTERNS = [
  /workers\.dev/,
];

// ===== INSTALL =====
self.addEventListener('install', event => {
  // Intentionally no auto-activation here — the new SW stays in the 'installed'
  // (waiting) state so the update banner remains visible until the user confirms.
  // Auto-activating during install fires controllerchange before the user taps,
  // making the banner tap a no-op (sprint197-199 bug). Activation happens only via
  // the SKIP_WAITING message handler below (sent when user confirms the update).
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precaching assets:', ASSETS.length);
      return Promise.allSettled(ASSETS.map(asset => cache.add(asset))).then(results => {
        const failed = results.filter(result => result.status === 'rejected');
        if (failed.length) console.warn('[SW] Some assets were not precached:', failed.length);
      });
    })
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      const deletions = [];
      keys.forEach(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          deletions.push(caches.delete(key));
        }
      });
      return Promise.all(deletions).then(() => {
        // Notify all clients that SW is activated
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_V,
              activatedByUser: true,
              timestamp: Date.now()
            });
          });
        });
      }).then(() => self.clients.claim())
    })
  );
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  
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
  // For navigations, bypass the browser's HTTP cache (cache:'no-cache') so the
  // browser always validates index.html with the server even if max-age hasn't
  // expired — critical for iOS WebKit home-screen PWAs that otherwise serve stale HTML.
  const fetchReq = isNavigation
    ? new Request(event.request, { cache: 'no-cache' })
    : event.request;
  event.respondWith(
    (isNavigation ? fetch(fetchReq) : caches.match(event.request).then(response => response || fetch(event.request)))
      .then(fetchResponse => {
        // Cache successful GET requests
        if (!isNavigation && event.request.method === 'GET' && fetchResponse.status === 200) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return fetchResponse;
      }).catch(() => isNavigation ? caches.match(NAVIGATION_FALLBACK) : caches.match(event.request))
  );
});

// ===== MESSAGE HANDLER =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
