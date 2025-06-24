// Nama cache diubah untuk memaksa pembaruan
const CACHE_NAME = 'rasa-cache-v2'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Proses Instalasi: Menyimpan file ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Proses Fetch: Mengambil file dari cache jika offline
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/chat')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 3. Proses Aktivasi: Membersihkan cache lama
self.addEventListener('activate', event => {
  // Array ini berisi semua nama cache yang ingin dipertahankan
  const cacheWhitelist = [CACHE_NAME]; 
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika cache lama tidak ada di dalam whitelist, maka hapus
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
