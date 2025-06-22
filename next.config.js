/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración del analizador de bundle nativo de Next.js
  // La opción bundleAnalyzer no está soportada directamente en Next.js 15+
  // Usar @next/bundle-analyzer como plugin si se necesita analizar el bundle
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

module.exports = {
  ...nextConfig,
  // Resolver los warnings de Supabase
  webpack: (config, { isServer }) => {
    // Ignorar warnings específicos para @supabase/realtime-js
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
    ];
    return config;
  },
};
