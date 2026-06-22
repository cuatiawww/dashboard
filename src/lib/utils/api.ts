/**
 * buildApiUrl — Semua request API diarahkan melalui Next.js server-side
 * agar tidak ada CORS error dari browser ke backend secara langsung.
 *
 * Routing strategy:
 *   /api/login    → /api/login    (dedicated Next.js route, proxy ke web_api/v1/login)
 *   /api/captcha  → /api/captcha  (dedicated Next.js route, proxy ke web_api/v1/captcha)
 *   /api/...      → /api/backend/api/...  (proxy umum ke web_api/v1/...)
 *   /web_api/...  → /api/backend/web_api/...  (proxy umum)
 */

/** Endpoint yang punya dedicated Next.js API route sendiri */
const DEDICATED_ROUTES = new Set(['/api/login', '/api/captcha', '/api/regions'])

export function getApiBaseUrl(): string {
  return '/api/backend/api'
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Pisahkan path dari query string untuk cek dedicated route
  const pathWithoutQuery = normalizedPath.split('?')[0]
  if (DEDICATED_ROUTES.has(pathWithoutQuery)) {
    return normalizedPath // gunakan dedicated Next.js API route langsung
  }

  if (normalizedPath === '/api') {
    return '/api/backend/api'
  }

  // /api/... → /api/backend/api/...
  if (normalizedPath.startsWith('/api/')) {
    return `/api/backend${normalizedPath}`
  }

  // /web_api/... → /api/backend/web_api/...
  if (normalizedPath.startsWith('/web_api/')) {
    return `/api/backend${normalizedPath}`
  }

  // Fallback
  return `/api/backend/api${normalizedPath}`
}

/**
 * Khusus untuk endpoint regions: gunakan Next.js API route /api/regions
 * yang memiliki fallback otomatis jika backend belum mendukung endpoint publik.
 * Format: /api/regions atau /api/regions?province_id=XX
 */
export function buildRegionsUrl(query?: Record<string, string>): string {
  const params = query ? new URLSearchParams(query).toString() : ''
  return params ? `/api/regions?${params}` : '/api/regions'
}

