/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
    ],
    domains: ['firebasestorage.googleapis.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  async rewrites() {
    return [];
  },
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
    externalResolver: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  functions: {
    'api/extract-recipe': {
      maxDuration: 300,
    },
  },
};

module.exports = nextConfig; 