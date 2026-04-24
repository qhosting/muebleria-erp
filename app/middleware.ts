
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

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/mobile/:path*',
    '/api/sync/:path*',
    '/api/dashboard/:path*',
  ],
};
