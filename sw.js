const CACHE_NAME = 'msouwout-v52';
const ASSETS = [
  '/',
  '/index.html',
  '/js/share.js',
  '/assets/msouwout-icon.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && e.request.method === 'GET') {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

/* ── NEW-RIDE ALERTS FOR DRIVERS ───────────────────────────────────────────
   28 Sep. Until now a driver only learned about a ride if this page happened
   to be open, which is why a real customer waited five hours for a car nobody
   knew he wanted. A service worker receives these with the browser CLOSED.

   ⚠️ The payload is data the server chose, but it is still rendered into a
   notification, so every field is coerced to a string and length-capped. */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  const title = String(d.title || 'MsouWout').slice(0, 80);
  const body  = String(d.body  || 'Nouvo kous').slice(0, 200);
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    /* Same tag = a second alert REPLACES the first instead of stacking six
       notifications for six rides he has not looked at yet. */
    tag: String(d.tag || 'msouwout-ride').slice(0, 60),
    renotify: true,
    requireInteraction: true,     // stays until he deals with it
    vibrate: [200, 100, 200, 100, 200],
    data: { url: String(d.url || '/driver-login.html').slice(0, 300) }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/driver-login.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(list => {
      /* If his driver page is already open somewhere, raise THAT rather than
         opening a second copy that then fights the first one for the ride. */
      for (const c of list) {
        if (c.url.indexOf('driver-login') >= 0 && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    }));
});
