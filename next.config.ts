<<<<<<< HEAD
// next.config.ts
const useLegacyBackendProxy =
  process.env.ENABLE_LEGACY_BACKEND_PROXY === 'true' &&
  !!process.env.LEGACY_BACKEND_BASE_URL

const nextConfig = {
  serverExternalPackages: ['svg-captcha'],
  async rewrites() {
    if (!useLegacyBackendProxy) {
      return []
    }

    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.LEGACY_BACKEND_BASE_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
=======
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
>>>>>>> parent of 6ce4452 (up)
