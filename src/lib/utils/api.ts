/**
 * URL builder untuk request frontend.
 *
 * Untuk endpoint yang sensitif terhadap CORS, gunakan route internal Next.js
 * agar browser tetap request ke origin aplikasi sendiri.
 */

const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  return `${BACKEND_BASE_URL}/api`
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (normalizedPath === '/api') {
    return getApiBaseUrl()
  }

  // /api/... dan /web_api/... → semua langsung ke backend
  if (normalizedPath.startsWith('/api/') || normalizedPath.startsWith('/web_api/')) {
    return `${BACKEND_BASE_URL}${normalizedPath}`
  }

  // Fallback
  return `${getApiBaseUrl()}${normalizedPath}`
}

export function buildBencanaStatsUrl(token?: string | null): string {
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `/api/bencana-stats${query}`
}

/**
 * Endpoint wilayah juga langsung ke backend agar tidak tergantung route Vercel.
 */
export function buildRegionsUrl(query?: Record<string, string>): string {
  const params = query ? new URLSearchParams(query).toString() : ''
  const queryString = params ? `?${params}` : ''
  return `${BACKEND_BASE_URL}/api/regions${queryString}`
}
