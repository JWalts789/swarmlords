// SWARMLORDS service worker — cache-first PWA shell.
// BUMP THE CACHE VERSION on every deploy so clients pick up new files.
const CACHE = 'swarmlords-v22';

const CORE = [
  '.',
  'index.html',
  'css/style.css',
  'js/rng.js',
  'js/data.js',
  'js/sprites.js',
  'js/audio.js',
  'js/save.js',
  'js/mapgen.js',
  'js/battle.js',
  'js/conquest.js',
  'js/shop.js',
  'js/ui.js',
  'js/main.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Music is large and served with Range requests; a cache-first full
  // response can break seeking, so let it go straight to the network.
  if (e.request.url.includes('/assets/music/')) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // opportunistically cache art/music drops so they work offline too
        if (res.ok && (e.request.url.includes('/assets/') || e.request.url.includes('/icons/'))) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
