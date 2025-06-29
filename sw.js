// PERUBAHAN: Nama cache diubah untuk memaksa pembaruan
const CACHE_NAME = 'rasa-cache-v3'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/testData.json',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Proses Instalasi: Menyimpan file ke cache baru
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        // Menambahkan file-file penting ke dalam cache
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Memaksa service worker baru untuk aktif
});

// 2. Proses Aktivasi: Membersihkan cache LAMA
self.addEventListener('activate', event => {
  // Array ini berisi NAMA CACHE YANG BARU (yang ingin dipertahankan)
  const cacheWhitelist = [CACHE_NAME]; 
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika nama cache LAMA tidak ada di dalam whitelist, maka HAPUS
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Mengambil kontrol halaman yang terbuka agar langsung menggunakan service worker baru
  return self.clients.claim(); 
});

// 3. Proses Fetch: Mengambil file dari cache (strategi Cache First)
self.addEventListener('fetch', event => {
  // Selalu coba ambil dari network untuk API calls
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, sajikan dari cache
        if (response) {
          return response;
        }
        // Jika tidak ada, ambil dari network
        return fetch(event.request);
      }
    )
  );
});
