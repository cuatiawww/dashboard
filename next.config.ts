import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  serverExternalPackages: ['svg-captcha'],
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/web_api/:path*',
          destination: `${backendBaseUrl}/web_api/:path*`,
        },
        {
          source: '/api/:path*',
          destination: `${backendBaseUrl}/api/:path*`,
        },
      ],
    }
  },
};

export default nextConfig;
