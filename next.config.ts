import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  process.env.LEGACY_BACKEND_BASE_URL ||
  'http://sipkk-baru.test'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['svg-captcha'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
