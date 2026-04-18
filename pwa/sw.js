const CACHE_NAME = 'comphone-v1.0.0';
const BASE = '/comphone-superapp/pwa';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/app.js',
  BASE + '/style.css',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache First for assets, Network First for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and chrome-extension
  if (e.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Network first for Google Apps Script API calls
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (e.request.destination === 'document') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', e => {
  if (e.tag === 'sync-jobs') {
    e.waitUntil(syncOfflineJobs());
  }
});

async function syncOfflineJobs() {
  // Will sync offline job updates when back online
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
}

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch(err) { data = { title: 'Comphone', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(data.title || 'Comphone', {
      body: data.body || 'มีการอัปเดตใหม่',
      icon: data.icon || BASE + '/icons/icon-192.png',
      badge: data.badge || BASE + '/icons/icon-72.png',
      tag: data.tag || 'comphone-notif',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: { url: data.url || BASE + '/', ...( data.data || {}) },
      actions: data.actions || []
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE + '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // ถ้ามีหน้าต่างเปิดอยู่แล้ว ให้เปลี่ยนไปหน้านั้น
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      // เปิดหน้าต่างใหม่
      return clients.openWindow(url);
    })
  );
});
