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
    ignoreBuildErrors: true,
  },

  // Capacitor requiere trailing slash en exportación estática
  trailingSlash: process.env.BUILD_TARGET === 'capacitor',

  images: { unoptimized: true },

  webpack: (config) => {
    if (Array.isArray(config.externals)) {
      config.externals.push({
        canvg: 'canvg',
        html2canvas: 'html2canvas',
        dompurify: 'dompurify',
      });
    } else if (config.externals && typeof config.externals === 'object') {
      config.externals = {
        ...config.externals,
        canvg: 'canvg',
        html2canvas: 'html2canvas',
        dompurify: 'dompurify',
      };
    } else {
      config.externals = [{
        canvg: 'canvg',
        html2canvas: 'html2canvas',
        dompurify: 'dompurify',
      }];
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ]
      }
    ];
  },
};

module.exports = nextConfig;
