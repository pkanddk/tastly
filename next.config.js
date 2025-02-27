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
      // Add more domains as needed
    ],
  },
};

module.exports = nextConfig; 