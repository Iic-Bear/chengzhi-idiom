const CACHE_NAME = 'rizhi-v6';
const ASSETS = [
  './index.html',
  './manifest.json',
  './supabase-sync.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './chengyu-data-1.js',
  './chengyu-data-2.js',
  './chengyu-data-3.js',
  './chengyu-data-4.js',
  './chengyu-data-5.js',
  './chengyu-data-6.js',
  './chengyu-data-7.js',
  './chengyu-data-8.js',
  './chengyu-data-9.js',
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML (always get latest), network-first for fonts, cache-first for other assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts: network-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML (index.html): network-first to always show latest version
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Other local assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
