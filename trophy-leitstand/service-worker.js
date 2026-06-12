/* UrPils Trophy Leitstand — Service Worker (Offline-Cache der App)
   Hinweis: OSM-Kartenkacheln werden hier NICHT gecacht (separate Offline-Lösung). */
const CACHE = 'trophy-leitstand-v10';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/vendor/leaflet.js',
  './assets/vendor/leaflet.css',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    try { await c.add('../trophy-quiz/index.html'); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('basemaps.cartocdn.com')) return; // Online-Karten-Fallback nicht abfangen
  const bypass = (req.cache === 'reload' || req.cache === 'no-store'); // erzwungenes Neuladen → frisch holen & Cache überschreiben
  e.respondWith((async () => {
    const cached = bypass ? null : await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok && url.origin === location.origin) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return resp;
    } catch (err) {
      if (req.mode === 'navigate') {
        const idx = await caches.match('./index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
