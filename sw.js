var CACHE_NAME = 'tambo-v166';
var urlsToCache = [
  '/Tambo-/',
  '/Tambo-/index.html',
  '/Tambo-/manifest.json',
  '/Tambo-/icon-192.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if(event.request.url.indexOf('script.google.com') !== -1) return;
  if(event.request.url.indexOf('firebase') !== -1) return;
  if(event.request.url.indexOf('googleapis.com') !== -1) return;

  // Network-first para index.html — siempre baja la versión más reciente,
  // ignorando la caché HTTP del navegador (cache: 'no-store')
  var isHTML = event.request.url.endsWith('/Tambo-/') ||
               event.request.url.indexOf('/Tambo-/index.html') !== -1 ||
               event.request.mode === 'navigate';

  if(isHTML) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          if(response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first para el resto (íconos, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if(response) return response;
      return fetch(event.request).then(function(response) {
        if(!response || response.status !== 200 || response.type !== 'basic') return response;
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
