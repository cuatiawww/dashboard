const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || '/api/backend'
  )
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}
