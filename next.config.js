/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración del analizador de bundle nativo de Next.js
  experimental: {
    // Habilitar solo cuando se necesite analizar el bundle
    // Para habilitar: ANALYZE=true npm run build
    bundleAnalyzer: process.env.ANALYZE === 'true',
  },
  // Optimización de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
    // Dominios permitidos para imágenes externas si los hay
    // domains: ['example.com'],
  },
  // Estrategia de compilación optimizada para LCP
  compiler: {
    // Eliminar código innecesario
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Configuración de rutas estáticas adicionales
  // Esto permite prefetch y optimización
  async redirects() {
    return [];
  },
  // Optimización de cache HTTP en rutas estáticas
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|ttf|woff|woff2)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
