const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.includes('mediaciptainformasi.co.id')) {
      return 'https://sipkk-new.mediaciptainformasi.co.id/sipkk-baru'
    }
  }
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || '/api/backend'
  )
}
