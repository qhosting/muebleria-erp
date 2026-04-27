
const CACHE_NAME = 'vertexerp-v3.2.0';
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/cobranza',
  '/dashboard/cobranza-mobile',
  '/dashboard/clientes',
  '/dashboard/usuarios', 
  '/dashboard/reportes',
  '/dashboard/pagos',
  '/dashboard/rutas',
  '/dashboard/plantillas',
  '/dashboard/configuracion',
  '/dashboard/morosidad',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico',
  '/furniture_ecommerce_hero.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v3.2.0');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache VertexERP v3.2.0 abierto');
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] No se pudo cachear ${url}:`, err);
              return null;
            })
          )
        );
      })
  );
  self.skipWaiting();
});

// Activar Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker v3.2.0');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('vertexerp-')) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Estrategia: Network First con Timeout para navegación, Cache First para estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== self.location.origin) return;

  // Ignorar APIs y HMR
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Estrategia para páginas de navegación
  if (url.pathname.startsWith('/dashboard') || url.pathname === '/login' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/dashboard')))
    );
    return;
  }

  // Estrategia Cache First para otros recursos (imágenes, fuentes, scripts)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        });
      })
  );
});

// Sincronización en background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncPayments() {
  try {
    console.log('[SW] Sincronizando pagos pendientes...');
    const response = await fetch('/api/sync/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'background-sync' })
    });
    if (response.ok) console.log('[SW] Pagos sincronizados exitosamente');
  } catch (error) {
    console.error('[SW] Error en sincronización:', error);
  }
}
