import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  process.env.LEGACY_BACKEND_BASE_URL ||
  'http://sipkk-baru.test'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['svg-captcha'],
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
