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

  if (normalizedPath.startsWith('/api/')) {
    return `${BACKEND_BASE_URL}${normalizedPath}`
  }

  if (normalizedPath.startsWith('/web_api/')) {
    return `${BACKEND_BASE_URL}${normalizedPath}`
  }

  return `${getApiBaseUrl()}${normalizedPath}`
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
