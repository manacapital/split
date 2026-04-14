const CACHE_NAME = "split-app-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./ceopag.png",
  "./gontijo.png",
  "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request)),
  );
});
