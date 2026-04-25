const CACHE = 'tambo-v90';
const PRECACHE = [
  '/Tambo-/',
  '/Tambo-/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(cache) {
    return Promise.allSettled(PRECACHE.map(function(url) {
      return cache.add(url).catch(function(){});
    }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if(url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(function(){
      return new Response(JSON.stringify({error:'offline'}),{headers:{'Content-Type':'application/json'}});
    }));
    return;
  }
  if(url.includes('accounts.google.com')||url.includes('googleapis.com')) {
    e.respondWith(fetch(e.request).catch(function(){ return new Response('',{status:503}); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(cached) {
    if(cached) return cached;
    return fetch(e.request).then(function(response) {
      if(response&&response.status===200&&response.type!=='opaque'){
        var clone=response.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request,clone); });
      }
      return response;
    }).catch(function(){
      if(e.request.mode==='navigate') return caches.match('/Tambo-/index.html');
      return new Response('',{status:503});
    });
  }));
});
