// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://sipkk-new.mediaciptainformasi.co.id/:path*',
      },
    ]
  },
}

export default nextConfig