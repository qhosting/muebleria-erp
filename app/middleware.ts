
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedOrigins = [
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://erp.mueblesdaso.com'
];

// Lógica de CORS y sanitización general
function customMiddleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const response = NextResponse.next();

  // Configurar CORS dinámicamente
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  return response;
}

// Middleware de autenticación encapsulado
const authMiddleware = withAuth(
  function middleware(req) {
    return customMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Middleware principal interceptor
export default async function middleware(req: NextRequest, event: any) {
  // Bloquear de inmediato cualquier petición que tenga la cabecera Next-Action
  // para evitar excepciones del framework Next.js ya que no usamos Server Actions.
  if (req.headers.has('next-action')) {
    return new NextResponse('Bad Request: Server Actions not supported', { status: 400 });
  }

  const path = req.nextUrl.pathname;
  
  // Determinar si es una ruta que requiere autenticación
  const isAuthRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/mobile') || 
    path.startsWith('/api/sync') || 
    path.startsWith('/api/dashboard');

  if (isAuthRoute) {
    // Ejecutar lógica de autenticación
    return (authMiddleware as any)(req, event);
  }

  // Ejecutar lógica estándar sin autenticación (para páginas de login, APIs públicas, etc.)
  return customMiddleware(req);
}

export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto:
     * - _next/static (archivos estáticos compilados)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono de la pestaña)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

