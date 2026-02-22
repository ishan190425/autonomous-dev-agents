/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ada-ai/core'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
