const CACHE = 'tambo-v41';

// Recursos a cachear al instalar
const PRECACHE = [
  '/Tambo-/',
  '/Tambo-/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://accounts.google.com/gsi/client',
];

// Instalar: cachear recursos base
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cachear lo que se pueda, ignorar errores individuales
      return Promise.allSettled(
        PRECACHE.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.log('SW: no se pudo cachear', url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first para recursos estáticos, network-first para el AppScript
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // AppScript (datos): siempre intentar red primero, sin cache
  if (url.includes('script.google.com')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        // Sin red: devolver respuesta vacía para que el app use caché local
        return new Response(JSON.stringify({error:'offline'}), {
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // Google Sign In: solo red (no cachear)
  if (url.includes('accounts.google.com') || url.includes('googleapis.com')) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('', {status: 503});
    }));
    return;
  }

  // Todo lo demás: cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cachear respuestas válidas
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Sin red y sin cache: para navegación devolver index.html
        if (e.request.mode === 'navigate') {
          return caches.match('/Tambo-/index.html');
        }
        return new Response('', {status: 503});
      });
    })
  );
});
