const CACHE_NAME = 'brago-padeiro-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/reset.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/animations.css',
  '/css/styles.css',
  '/css/modal-move.css',
  '/css/padeiro-flow.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/components.js',
  '/js/admin-dashboard.js',
  '/js/gestao.js',
  '/js/filiais.js',
  '/js/metas.js',
  '/js/avaliacoes.js',
  '/js/cronograma.js',
  '/js/padeiro-flow.js',
  '/js/padeiro-agenda.js',
  '/js/padeiro-dashboard.js',
  '/js/relatorios.js',
  '/js/location-service.js',
  '/js/rastreamento.js',
  '/js/dev.js',
  '/js/modules/cronograma/cronograma.styles.js',
  '/js/modules/cronograma/cronograma.render.js',
  '/js/modules/cronograma/cronograma.drag.js',
  '/js/modules/cronograma/cronograma.tasks.js',
  '/js/modules/cronograma/cronograma.mensal.js',
  '/js/modules/cronograma/cronograma.smart.js',
  '/assets/logo.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@turf/turf@6/turf.min.js'
];


// Install Event: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching system assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Offline-first strategy for assets, Network-first for API
self.addEventListener('fetch', (event) => {
  // Skip API calls and Socket.io (should not be cached/intercepted)
  if (event.request.url.includes('/api/') || event.request.url.includes('/socket.io/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      // Return from cache OR fetch from network
      return response || fetch(event.request).then((fetchResponse) => {
        // Optional: dynamically cache new assets here if desired
        return fetchResponse;
      });
    }).catch(() => {
      // Fallback for when offline and asset not in cache
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html', { ignoreSearch: true });
      }
      
      return new Response('Offline - Recurso não disponível', { 
        status: 503, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    })
  );
});
