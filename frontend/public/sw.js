/* Masterliqours service worker — push notifications only.
   IMPORTANT: this SW intentionally does NOT cache the HTML or app shell.
   A previous version cached '/' (index.html) under a fixed cache name that never
   changed, so after new deploys it kept serving stale HTML pointing at CSS/JS
   hashes that no longer existed → unstyled / broken pages. This version caches
   nothing for navigation (always goes to network) and purges any old caches. */
const CACHE_NAME = 'masterliqours-v3-nocache';

self.addEventListener('install', () => {
  // Activate immediately, don't wait.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL old caches (including the old 'masterliqours-v1' that held
      // the stale index.html). This self-heals every device on next load.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// NO fetch handler → the browser fetches HTML/CSS/JS straight from the network
// as normal. Nothing is intercepted, nothing goes stale.

// Push notifications — new order / low stock / status updates from the backend.
self.addEventListener('push', (event) => {
  let data = { title: 'Masterliqours', body: 'You have a new update.' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/staff' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Masterliqours', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
