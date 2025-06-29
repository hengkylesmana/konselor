// PERUBAHAN: Nama cache diubah untuk memaksa pembaruan total
const CACHE_NAME = 'rasa-cache-v4'; 
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
      .then(() => {
        // PERUBAHAN: Memaksa service worker baru untuk aktif tanpa menunggu
        return self.skipWaiting();
      })
  );
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
    }).then(() => {
      // PERUBAHAN: Mengambil kontrol halaman yang terbuka agar langsung menggunakan service worker baru
      return self.clients.claim(); 
    })
  );
});

// 3. Proses Fetch: Mengambil file dari cache (strategi Cache First)
self.addEventListener('fetch', event => {
  // Selalu coba ambil dari network untuk API calls
  if (event.request.url.includes('/api/')) {
    return; // Biarkan browser menanganinya
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, sajikan dari cache. 
        // Jika tidak, ambil dari network
        return response || fetch(event.request);
      }
    )
  );
});
