const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  // Menggunakan proxy routing Next.js internal (/api/backend) untuk menyembunyikan CORS
  return '/api/backend'
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}
