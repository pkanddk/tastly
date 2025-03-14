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
    domains: ['firebasestorage.googleapis.com', 'replicate.delivery'],
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
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig; 