/**
 * buildApiUrl — URL builder untuk semua request ke backend SIPKK.
 *
 * Endpoint mapping (semua ke backend: sipkk-new.mediaciptainformasi.co.id):
 *   /api/captcha             → BACKEND/api/captcha       (ApiController::actionCaptcha)
 *   /api/login               → BACKEND/api/login         (ApiController::actionLogin)
 *   /api/register            → BACKEND/api/register      (ApiController::actionRegister)
 *   /api/regions             → BACKEND/api/regions       (ApiController::actionRegions)
 *   /api/forgot-password-*   → BACKEND/api/...           (ApiController)
 *   /web_api/v1/bencana-*    → Next.js proxy /api/backend/web_api/... (menghindari CORS preflight)
 *
 * Catatan: Backend (ApiController) sudah set CORS header di setiap action,
 * sehingga request dari browser ke backend aman (tidak diblokir CORS).
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

  // /web_api/v1/bencana-stats dan endpoint web_api lain yang perlu Auth header
  // → lewat Next.js proxy untuk menghindari CORS preflight issue
  if (normalizedPath.startsWith('/web_api/')) {
    return `/api/backend${normalizedPath}`
  }

  // /api/captcha, /api/login, /api/register, dll
  // → langsung ke backend (ApiController sudah ada CORS header)
  if (normalizedPath.startsWith('/api/')) {
    return `${BACKEND_BASE_URL}${normalizedPath}`
  }

  if (normalizedPath === '/api') {
    return getApiBaseUrl()
  }

  // Fallback
  return `${getApiBaseUrl()}${normalizedPath}`
}

/**
 * Khusus untuk endpoint regions: gunakan Next.js API route /api/regions
 * yang memiliki fallback otomatis jika backend belum mendukung endpoint publik.
 */
export function buildRegionsUrl(query?: Record<string, string>): string {
  const params = query ? new URLSearchParams(query).toString() : ''
  return params ? `/api/regions?${params}` : '/api/regions'
}
