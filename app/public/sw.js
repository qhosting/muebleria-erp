
const CACHE_NAME = 'vertexerp-v1.4.0';
const urlsToCache = [
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
  '/favicon.ico'
];

// Instalar Service Worker con manejo de errores mejorado
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v1.4.0');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache VertexERP Muebles v1.4.0 abierto');
        // Intentar agregar todas las URLs, pero continuar si alguna falla
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] No se pudo cachear ${url}:`, err);
              return null;
            })
          )
        );
      })
      .catch(err => {
        console.error('[SW] Error al abrir cache:', err);
      })
  );
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activar Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker v1.4.0');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar cachés que no sean la actual
          if (cacheName !== CACHE_NAME && 
              (cacheName.startsWith('muebleria-cobranza-') || 
               cacheName.startsWith('laeconomica-') || 
               cacheName.startsWith('appmuebles-') ||
               cacheName.startsWith('vertexerp-'))) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service Worker activado correctamente');
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim();
    })
    .catch(err => {
      console.error('[SW] Error al activar Service Worker:', err);
    })
  );
});

// Buscar en cache con estrategia Network First para páginas dinámicas
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Si es la raíz, redirigir directamente a /login sin cachear
  if (url.pathname === '/' && url.origin === self.location.origin) {
    event.respondWith(Response.redirect('/login', 302));
    return;
  }

  // Solo manejar requests del mismo origen
  if (url.origin !== self.location.origin) {
    return;
  }

  // Ignorar requests de API y WebSocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) {
    return;
  }

  // Para páginas de dashboard, usar estrategia Network First con timeout
  if (url.pathname.startsWith('/dashboard') || url.pathname === '/login') {
    event.respondWith(
      // Intentar fetch con timeout
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        )
      ])
      .then((response) => {
        // Si la respuesta es exitosa, guardar en cache y devolver
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(err => console.warn('[SW] Error al guardar en cache:', err));
        }
        return response;
      })
      .catch((err) => {
        console.log('[SW] Red no disponible, usando cache para:', url.pathname);
        // Si la red falla, intentar desde cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no hay cache y es una página de navegación, devolver el dashboard principal
            if (url.pathname.startsWith('/dashboard') && url.pathname !== '/dashboard') {
              return caches.match('/dashboard');
            }
            
            // Para login, intentar desde cache
            if (url.pathname === '/login') {
              return caches.match('/login');
            }
            
            return new Response('Página no disponible offline', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
    );
    return;
  }

  // Para otros recursos, usar estrategia Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => console.warn('[SW] Error al guardar recurso en cache:', err));

            return response;
          })
          .catch(err => {
            console.warn('[SW] Error al cargar recurso:', url.pathname, err);
            return new Response('Recurso no disponible', { 
              status: 404,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
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
    // Obtener pagos pendientes de sincronización desde IndexedDB
    // Esta funcionalidad se implementaría con IndexedDB
    console.log('Sincronizando pagos pendientes...');
    
    // Simulación de sincronización
    const response = await fetch('/api/sync/pagos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pagos: [] // Pagos desde IndexedDB
      })
    });

    if (response.ok) {
      console.log('Pagos sincronizados exitosamente');
      // Limpiar pagos sincronizados de IndexedDB
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}

// Notificaciones push (para futuras implementaciones)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Tienes pagos pendientes de sincronización',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification('VertexERP Muebles', options)
  );
});

