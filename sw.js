const CACHE = 'forma60-v42';
const CORE = [
  './app.html',
  './css/styles.css',
  './js/media.js',
  './js/store.js',
  './js/voice.js',
  './js/music.js',
  './js/workout.js',
  './js/poseCheck.js',
  './js/app.js',
  './data/content.js',
  './data/exercises.json',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp && resp.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
