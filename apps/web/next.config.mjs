/** @type {import('next').NextConfig} */
// Vercel-optimized Next.js configuration

const nextConfig = {
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Production optimizations for Vercel
  productionBrowserSourceMaps: false, // Disable source maps in production for security
  poweredByHeader: false, // Remove X-Powered-By header
  generateEtags: true, // Enable ETags for better caching
  compress: true, // Enable gzip compression
  reactStrictMode: false, // Disable strict mode for better wallet compatibility

  // Build optimization (swcMinify is default in Next.js 13+)
  
  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },

  // Image optimization
  images: {
    domains: [
      'localhost',
      'vercel.app',
      'monad-synapse.vercel.app',
      'monad-synapse-web.vercel.app',
      'monad-synapse-lesnak1.vercel.app',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vercel.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    unoptimized: false,
  },

  // Webpack configuration for Web3 compatibility
  webpack: (config, { isServer }) => {
    // Handle node modules for browser
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Fix WalletConnect pino-pretty issue
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };

    // Optimize for Web3 libraries
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        bufferutil: 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
        'pino-pretty': 'pino-pretty',
      });
    }

    return config;
  },

  // Output configuration for Vercel
  output: 'standalone',
  
  // Security: Headers handled by middleware.ts for better Web3 extension support
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false, // Ensure TypeScript errors fail the build
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false, // Ensure ESLint errors fail the build
  },

  // Redirects and rewrites
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;


