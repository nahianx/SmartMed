/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@smartmed/ui', '@smartmed/types'],
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas')
    }
    return config
  },
}

module.exports = nextConfig
