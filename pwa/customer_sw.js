// customer_sw.js — Service Worker for Customer Portal
// COMPHONE SUPER APP V5.5

const CACHE_NAME = 'comphone-customer-v1.0.0';
const BASE = '/comphone-superapp';
const ASSETS = [
  BASE + '/customer_portal.html',
  BASE + '/customer_manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {}); // ไม่ fail ถ้า asset ไม่ได้
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Network first สำหรับ GAS API
  if (url.hostname.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache first สำหรับ assets
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
        if (e.request.destination === 'document') {
          return caches.match(BASE + '/customer_portal.html');
        }
      });
    })
  );
});
