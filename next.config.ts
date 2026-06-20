// next.config.ts
const useLegacyBackendProxy =
  process.env.ENABLE_LEGACY_BACKEND_PROXY === 'true' &&
  !!process.env.LEGACY_BACKEND_BASE_URL

const nextConfig = {
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
