
// Service Worker para PWA
const CACHE_NAME = 'laeconomica-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/clientes',
  '/dashboard/cobranza',
  '/dashboard/cobranza-mobile',
  '/dashboard/pagos',
  '/dashboard/morosidad',
  '/dashboard/reportes',
  '/dashboard/rutas',
  '/dashboard/configuracion',
  '/dashboard/usuarios',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Error al cachear:', error);
      })
  );
  // Activar inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control inmediatamente
  return self.clients.claim();
});

// Estrategia de caché: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar peticiones a API externas
  if (event.request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, clonarla y guardarla en caché
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar obtener de caché
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay caché y es navegación, devolver página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/dashboard');
            }
          });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
