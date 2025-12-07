/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // For VPS deployment
  output: 'standalone',
  
  // Disable telemetry for production
  experimental: {
    instrumentationHook: false,
  },
};

module.exports = nextConfig;