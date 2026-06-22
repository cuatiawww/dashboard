const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  // Menggunakan proxy routing Next.js internal (/api/backend) untuk menyembunyikan CORS
  return '/api/backend'
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
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
