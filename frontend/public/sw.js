const CACHE = 'spin-shell-v6';
const SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  // Precached so the first notification is audible immediately rather than
  // racing a cold fetch for the tone.
  '/sound/notify.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// WEB PUSH -------------------------------------------------------------------
self.addEventListener('push', (event) => {
  // Defensive: a push with no body, or a non-JSON one, still shows something
  // rather than throwing inside the service worker where nobody sees it.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'spin';
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        // Collapses repeats for the same machine instead of stacking them up.
        tag: data.tag || 'spin-notification',
        renotify: true,
        // The tone itself is the OS's choice — NotificationOptions.sound is in
        // no shipping browser. Vibration is the one cue we can actually set.
        vibrate: [180, 90, 180],
        data: { url: data.url || '/app' },
      }),
      // Tell any open tab, so our own sound plays when the app is in the
      // foreground. The page dedupes against the polled banner.
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: 'spin:push' })))
        .catch(() => undefined),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app';

  // Focus an open tab if there is one; only open a new window as a fallback,
  // so tapping a notification does not pile up duplicate tabs.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // API calls always go to the network — never served from cache.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // Media must not be intercepted. <video> fetches with Range headers and
  // expects a 206 Partial Content; a service worker that hands back a full 200
  // (or a cached whole-file response) makes the element fail to render at all.
  // Returning without calling respondWith lets the browser handle it natively.
  if (request.headers.has('range')) return;
  if (/\.(mp4|webm|ogv|mov|m4v)$/i.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html').then((res) => res || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => cached))
  );
});
