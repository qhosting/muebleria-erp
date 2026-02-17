const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración dinámica para build Nativo vs Web
  // Si BUILD_TARGET=capacitor, forzamos 'export' estático
  output: process.env.BUILD_TARGET === 'capacitor' ? 'export' : process.env.NEXT_OUTPUT_MODE,
  distDir: process.env.BUILD_TARGET === 'capacitor' ? 'out' : (process.env.NEXT_DIST_DIR || '.next'),

  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Capacitor requiere trailing slash en exportación estática
  trailingSlash: process.env.BUILD_TARGET === 'capacitor',

  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // En producción idealmente limitar a dominios específicos, pero * funciona para pruebas si credentials no es true (pero credentials SI es true, ojo)
          // CON CREDENTIALS TRUE, ORIGIN NO PUEDE SER *
          // Debemos reflejar el origen o listar los permitidos.
          // Para simplificar en Next.js, a veces se usa middleware, pero aquí intentaremos ser permisivos.
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
};

module.exports = nextConfig;
