// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d - Service Worker v5.9.0-phase2d
// 3 Cache Strategies: Cache First | Network First | Network Only
// Background Sync: flush IndexedDB offline queue
// ============================================================
const CACHE_V = 'comphone-v5.9.0-phase2d-20260428_1830';
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

const NETWORK_TIMEOUT_MS = 15000;  // 15s - GAS cold start can take 5-10s
const SYNC_TAG = 'comphone-offline-queue';

// Install: pre-cache static assets (graceful - ไม่ fail ถ้า asset ไม่พบ)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_V)
      .then(cache => Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err =>
          console.warn('[SW] Pre-cache skip:', url, err.message)
        ))
      ))
      .then(() => { console.log('[SW] Installed:', CACHE_V); return self.skipWaiting(); })
  );
});

// Activate: clear old caches + reload all tabs (PHASE 25.4)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(clientsArr => {
      clientsArr.forEach(client => client.navigate(client.url));
    })
  );
});

// Fetch: Route ตาม 3 strategies
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = request.url;

  // ข้าม non-GET และ chrome-extension
  if (request.method !== 'GET' || url.startsWith('chrome-extension:')) return;

  // 1. Network Only - LINE webhook, health check
  if (NETWORK_ONLY.some(p => p.test(url))) {
    e.respondWith(fetch(request));
    return;
  }

  // 2. Network First (timeout 3s) - API calls
  if (API_PATTERNS.some(p => p.test(url))) {
    e.respondWith(_networkFirst_(request));
    return;
  }

  // 3. Cache First - static assets
  e.respondWith(_cacheFirst_(request));
});

// Background Sync - flush offline queue จาก error_boundary.js
self.addEventListener('sync', e => {
  if (e.tag === SYNC_TAG || e.tag === 'sync-jobs') {
    console.log('[SW] Background sync:', e.tag);
    e.waitUntil(_flushOfflineQueue_());
  }
});

// Message handler
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION') e.ports[0]?.postMessage({ version: CACHE_V });
});

// ============================================================
// STRATEGY IMPLEMENTATIONS
// ============================================================
async function _cacheFirst_(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE_V);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    // Document fallback
    if (request.destination === 'document') {
      const fb = await caches.match(BASE + '/index.html');
      if (fb) return fb;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function _networkFirst_(request) {
  try {
    const res = await _fetchWithTimeout_(request, NETWORK_TIMEOUT_MS);
    if (res.ok) {
      const cache = await caches.open(CACHE_V);
      cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ success: false, error: 'OFFLINE', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function _fetchWithTimeout_(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(r => { clearTimeout(t); resolve(r); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

async function _flushOfflineQueue_() {
  const DB_NAME = 'comphone_offline';
  const STORE   = 'action_queue'; // FIXED: read from action_queue (where app writes)
  let db;
  try {
    db = await new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 2);  // v2: force onupgradeneeded to create 'queue' store
      r.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      r.onsuccess = e => res(e.target.result);
      r.onerror   = e => rej(e.target.error);
    });
  } catch (_) { return; }

  const items = await new Promise(res => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    r.onsuccess = e => res(e.target.result || []);
    r.onerror   = () => res([]);
  });

  // แจ้ง clients ให้ flush
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.postMessage({ type: 'SYNC_OFFLINE_QUEUE', count: items.length }));

  db.close();
  console.log('[SW] Notified clients to flush', items.length, 'offline items');
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
