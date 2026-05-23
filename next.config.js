/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === 'production') {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}