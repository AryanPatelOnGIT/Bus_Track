const CACHE_NAME = 'bustrack-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Caching Strategy: Stale-While-Revalidate for static assets and routes
// Network-Only for realtime DB and WebSockets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker for WebSockets, Realtime DB, and Auth 
  if (
    url.protocol === 'ws:' || 
    url.protocol === 'wss:' || 
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') || 
    url.pathname.startsWith('/api/buses') || // Live buses (use Sockets ideally)
    url.pathname.startsWith('/socket.io')
  ) {
    return; // Network only
  }

  // 2. Stale-While-Revalidate for Cloud Firestore & Route APIs
  if (url.hostname.includes('firestore.googleapis.com') || url.pathname.startsWith('/api/routes')) {
    event.respondWith(
      caches.open('bustrack-data').then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Cache-First for App Shell / UI assets
  if (event.request.destination === 'document' || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }
});
