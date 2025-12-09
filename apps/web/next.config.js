/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@smartmed/ui", "@smartmed/types"],
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },
  webpack: (config, { isServer }) => {
    // Externalize canvas for server-side rendering
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas'];
    }
    // Ignore node-specific modules on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
