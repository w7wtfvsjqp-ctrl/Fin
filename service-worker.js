// FinTrack Service Worker — cache offline-first
const CACHE_NAME = 'fintrack-cache-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instala e guarda os arquivos essenciais do app no cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // não trava a instalação se algum recurso externo falhar
  );
});

// Remove caches antigos quando uma nova versão do SW assume
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia: cache primeiro, com atualização em segundo plano quando online.
// Isso cobre tanto os arquivos locais quanto os recursos externos (fontes, ícones, chart.js),
// que vão sendo guardados automaticamente na primeira vez que o app é usado com internet.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached); // sem internet: usa o que tem em cache

      return cached || networkFetch;
    })
  );
});
