const CACHE_NAME = 'orbit-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './google-sync.js',
  './manifest.json',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: Cache all essential assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older caches and claim control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-First for static assets, network-first for Google APIs with full offline fallback
self.addEventListener('fetch', (event) => {
  // Pass Google API and Auth requests directly to network
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('accounts.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation and document requests when completely offline
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('./index.html') || caches.match('/');
        }
      });
    })
  );
});

// System Notification Click: Bring app to focus and navigate to callbacks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const contactId = event.notification.data ? event.notification.data.contactId : null;
  const targetUrl = contactId ? `./index.html?contact=${contactId}` : './index.html?filter=owe_call';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
