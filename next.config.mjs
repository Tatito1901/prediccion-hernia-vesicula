/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
      // We don't use Supabase Realtime on the client – alias it to an empty module to avoid bundling warnings
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@supabase/realtime-js': false,
      };
    }
    // On the server, keep it external so webpack doesn't parse it (we don't use it anyway)
    if (isServer) {
      config.externals.push('@supabase/realtime-js');
    }
    config.externals.push('encoding');
    return config;
  },
};

export default nextConfig
