/* Sykon map service worker — network-first for the app + data, cache-first
   for immutable CDN libraries. Map tiles are never cached (size). */
const CACHE = 'sykon-map-v1';
const PRECACHE = ['./', './index.html', './data/live/fx.json', './data/live/rates.json'];
const CDN_CACHE = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.concat(CDN_CACHE)).catch(() => null)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('cartocdn') || url.hostname.includes('goatcounter')) return; // tiles/analytics: network only
  const isCdnLib = CDN_CACHE.some(u => req.url.startsWith(u)) || url.hostname.includes('fonts.g');
  if (isCdnLib) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  if (req.mode === 'navigate' || (url.origin === location.origin)) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
  }
});
