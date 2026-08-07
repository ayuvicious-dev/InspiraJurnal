/* Inspira Ledger — Service Worker
   Network-first untuk file app shell (HTML/JS inti) supaya perubahan kode langsung
   kepakai begitu online, dengan cache sebagai fallback kalau offline.
   Aset statis (ikon, manifest) tetap cache-first karena jarang berubah. */
const CACHE_NAME = 'inspira-ledger-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// File-file yang HARUS selalu dicoba ambil versi terbaru dulu (network-first).
// Kalau offline / gagal fetch, baru jatuh ke cache lama.
const NETWORK_FIRST = ['./', './index.html'];

// Dipanggil dari banner "Muat Ulang" di halaman (lewat postMessage) supaya SW yang lagi
// menunggu (waiting) langsung aktif begitu user klik, tanpa perlu tutup-buka app manual.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isNetworkFirst(url) {
  const path = new URL(url).pathname;
  return NETWORK_FIRST.some((p) => path.endsWith(p.replace('./', '')) || path === '/' );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // PENTING: cache.addAll() itu atomik — kalau SATU SAJA file gagal di-fetch (mis.
      // koneksi lagi jelek, atau satu ikon sempat tidak kebaca), instalasi SW baru ini
      // gagal TOTAL & diam-diam, dan device itu akan terus jalankan versi lama selamanya
      // walau server sudah update. Jadi di sini tiap file dicoba SATU-SATU secara independen
      // (pakai .catch per file) supaya kegagalan satu file (biasanya cuma ikon, bukan
      // file inti) tidak menggagalkan keseluruhan proses update.
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Gagal cache saat install (dilewati, tidak menghentikan update):', url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isNav = event.request.mode === 'navigate';
  const networkFirst = isNav || isNetworkFirst(event.request.url);

  if (networkFirst) {
    // NETWORK-FIRST: coba ambil versi terbaru dulu. Kalau berhasil, simpan ke cache
    // dan langsung tampilkan (jadi update kode selalu kepakai saat online).
    // Kalau gagal (offline), baru pakai cache lama sebagai fallback.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CACHE-FIRST untuk aset statis (ikon dll) — jarang berubah, jadi aman tampil dari
  // cache dulu supaya cepat & tetap kerja offline, sambil tetap refresh cache di belakang layar.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
