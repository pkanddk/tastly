/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thecozycook.com',
      },
      {
        protocol: 'https',
        hostname: 'www.allrecipes.com',
      },
      {
        protocol: 'https',
        hostname: 'www.simplyrecipes.com',
      },
      {
        protocol: 'https',
        hostname: 'www.foodnetwork.com',
      },
      {
        protocol: 'https',
        hostname: 'www.epicurious.com',
      },
      // WordPress image domains
      {
        protocol: 'https',
        hostname: 'i0.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i3.wp.com',
      },
      {
        protocol: 'https',
        hostname: 'i4.wp.com',
      },
      // Add downshiftology.com
      {
        protocol: 'https',
        hostname: 'www.downshiftology.com',
      },
      // Add a wildcard pattern for WordPress domains
      {
        protocol: 'https',
        hostname: '**.wp.com',
      },
      // Add more domains as needed
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
};

module.exports = nextConfig; 