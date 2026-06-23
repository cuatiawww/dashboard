/**
 * buildApiUrl — URL builder untuk semua request ke backend SIPKK.
 *
 * SEMUA endpoint langsung ke BACKEND URL (bukan proxy Next.js),
 * karena Backend (ApiController & V1Controller) sudah set CORS header.
 *
 * Endpoint mapping:
 *   /api/captcha             → BACKEND/api/captcha       (ApiController, CORS ✅)
 *   /api/login               → BACKEND/api/login         (ApiController, CORS ✅)
 *   /api/register            → BACKEND/api/register      (ApiController, CORS ✅)
 *   /api/regions             → BACKEND/api/regions       (ApiController, CORS ✅)
 *   /web_api/v1/bencana-*    → BACKEND/web_api/v1/...    (V1Controller, CORS ✅)
 *
 * PENTING: Untuk menghindari CORS preflight pada request ke web_api,
 * jangan kirim Authorization header — cukup gunakan ?token=... di URL.
 * Simple GET tanpa custom header TIDAK trigger preflight OPTIONS.
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
  return `${BACKEND_BASE_URL}/web_api/v1/bencana-stats${query}`
}

/**
 * Endpoint wilayah juga langsung ke backend agar tidak tergantung route Vercel.
 */
export function buildRegionsUrl(query?: Record<string, string>): string {
  const params = query ? new URLSearchParams(query).toString() : ''
  const queryString = params ? `?${params}` : ''
  return `${BACKEND_BASE_URL}/api/regions${queryString}`
}
