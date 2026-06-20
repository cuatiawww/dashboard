import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['svg-captcha'],
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.LEGACY_BACKEND_BASE_URL || 'https://sipkk-new.mediaciptainformasi.co.id/sipkk-baru'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
