
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://app.mueblerialaeconomica.com'
];

export default withAuth(
  function middleware(req) {
    const origin = req.headers.get('origin');
    const response = NextResponse.next();

    // Configurar CORS dinámicamente
    // Si el origen está en la lista blanca, o NO hay origen (server-to-server), permitimos
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    }

    // Respuesta inmediata para preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Manejar preflight OPTIONS explícitamente sin auth
        if (req.method === 'OPTIONS') {
          return true;
        }

        // Permitir acceso a recursos estáticos y rutas públicas
        if (
          path === '/login' ||
          path === '/' ||
          path.startsWith('/api/') || // Dejar que las rutas API manejen su propia auth (o usar token si es necesario)
          path.startsWith('/_next') ||
          path.includes('.') // Archivos con extensión
        ) {
          return true;
        }

        // Para rutas del dashboard, requiere token
        if (path.startsWith('/dashboard') || path.startsWith('/mobile')) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|manifest.json|sw.js).*)',
  ],
};
