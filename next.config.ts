import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sipkk-new.mediaciptainformasi.co.id',
      },
    ],
  },
  serverExternalPackages: ['svg-captcha'],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/detail-kejadian/:jenis/:id',
          destination: '/',
        },
      ],
      fallback: [
        // Semua /api/* yang tidak ada dedicated route.ts → proxy ke backend utama (web.php)
        {
          source: '/api/:path*',
          destination: `${backendBaseUrl}/api/:path*`,
        },
      ],
    }
  },
};

export default nextConfig;
