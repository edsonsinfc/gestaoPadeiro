const CACHE_NAME = 'brago-padeiro-v62';

// Arquivos externos (CDN) — cache-first, raramente mudam
const STATIC_CDN = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@turf/turf@6/turf.min.js'
];

// Assets locais que devem ser pré-cacheados (fallback offline imediato)
const LOCAL_ASSETS = [
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
  '/js/timeline.js',
  '/js/dev.js',
  '/js/modules/cronograma/cronograma.styles.js',
  '/js/modules/cronograma/cronograma.render.js',
  '/js/modules/cronograma/cronograma.drag.js',
  '/js/modules/cronograma/cronograma.tasks.js',
  '/js/modules/cronograma/cronograma.mensal.js',
  '/js/modules/cronograma/cronograma.smart.js',
  '/js/modules/cronograma/cronograma.templates.js',
  '/js/lucide.min.js',
  '/assets/logo.svg'
];

// ─── INSTALL: Pré-cacheia apenas assets mínimos ─────────
self.addEventListener('install', (event) => {
  console.log('[SW v59] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cacheia assets locais essenciais (ignora erros de CDN)
      return cache.addAll(LOCAL_ASSETS).catch(() => {});
    })
  );
  // Forçando a atualização imediata para garantir que os clientes peguem as mudanças de design
  self.skipWaiting();
});

// ─── ACTIVATE: Remove caches antigos e toma controle de todos os clientes ────
self.addEventListener('activate', (event) => {
  console.log('[SW v59] Ativando — limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      )
    )
  );
  // CRÍTICO: Assume controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// ─── FETCH: Estratégias por tipo de recurso ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. API e Socket.io — sempre rede, nunca cache
  if (url.includes('/api/') || url.includes('/socket.io/')) {
    return; // deixa o browser lidar normalmente
  }

  // 2. Assets CDN externos — Cache-First (raramente mudam)
  if (STATIC_CDN.some((cdn) => url.startsWith(cdn.split('/').slice(0, 3).join('/')))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 3. JS, CSS e HTML locais — Network-First (prioriza atualizações)
  if (
    url.includes('/js/') ||
    url.includes('/css/') ||
    event.request.mode === 'navigate' ||
    url.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Atualiza o cache com a versão mais recente
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline: usa cache como fallback
          return caches.match(event.request).then(
            (cached) => cached || caches.match('/index.html')
          );
        })
    );
    return;
  }

  // 4. Demais assets (imagens, SVG, etc.) — Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ─── MESSAGES: Força atualização manual via postMessage ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Forçando atualização via SKIP_WAITING...');
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] Cache limpo com sucesso!');
    });
  }
});

// ─── PUSH NOTIFICATIONS (Web Fallback) ───────────────────────────────────────
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: payload.icon || '/assets/icon-192.png',
        badge: payload.badge || '/assets/icon-192.png',
        data: { url: payload.url || '/' }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title, options)
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Brago Distribuidora', {
          body: text,
          icon: '/assets/icon-192.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focar em aba existente ou abrir nova
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.host) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
