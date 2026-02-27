/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ada-ai/core'],
  webpack: (config) => {
    // Resolve .js extension imports in @ada-ai/core source to .ts files
    // when transpilePackages triggers source compilation
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

module.exports = nextConfig;
