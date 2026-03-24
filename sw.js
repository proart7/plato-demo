/* ============================================================
   SERVICE WORKER — Espace Serveur PWA
   Gère le cache offline + les notifications en arrière-plan
============================================================ */
const CACHE_NAME = 'serveur-v1';
const ASSETS = [
  '/serveur.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

/* ---- INSTALL ---- */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

/* ---- ACTIVATE ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---- FETCH (cache-first for offline support) ---- */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Always try network first for HTML (to get latest version)
      if (event.request.url.includes('.html')) {
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        }).catch(() => cached);
      }
      return cached || fetch(event.request);
    })
  );
});

/* ---- NOTIFICATION CLICK ---- */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('serveur.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/serveur.html');
    })
  );
});

/* ---- MESSAGE from main thread to show notification ---- */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, requireInteraction, notifType } = event.data;
    self.registration.showNotification(title, {
      body: body,
      tag: tag,
      renotify: true,
      requireInteraction: requireInteraction || false,
      vibrate: notifType === 'ready' ? [300, 100, 300, 100, 300, 100, 300] : [200, 100, 200],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      silent: false,
      actions: notifType === 'ready' ? [{ action: 'open', title: 'Voir' }] : []
    });
  }
});
