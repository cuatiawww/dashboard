import { NextRequest, NextResponse } from 'next/server'

/**
 * Dedicated proxy route for /api/bencana-stats
 *
 * Meneruskan request ke web_api/v1/bencana-stats di server backend (server-to-server),
 * sehingga tidak ada CORS issue dari browser ke backend secara langsung.
 *
 * Endpoint backend: BACKEND/web_api/v1/bencana-stats?token=...
 * V1Controller::actionBencanaStats() membaca token dari:
 *   - Header Authorization: Bearer <token>  (prioritas utama)
 *   - Query param ?token=<token>            (fallback)
 */

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Teruskan query string (termasuk ?token=...) ke backend
    const searchParams = request.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ''

    const endpoints = [
      `${BACKEND_BASE_URL}/web_api/v1/bencana-stats${queryString}`,
      `${BACKEND_BASE_URL}/api/bencana-stats${queryString}`,
    ]

    // Teruskan Authorization header jika ada
    const forwardHeaders: HeadersInit = {
      Accept: 'application/json',
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader
    }

    let lastRes: Response | null = null
    let lastPayload: any = null

    for (const targetUrl of endpoints) {
      try {
        const backendRes = await fetch(targetUrl, {
          method: 'GET',
          headers: forwardHeaders,
          cache: 'no-store',
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        })

        lastRes = backendRes

        // Jika backend redirect ke login (session expired) → return 401
        if ([301, 302, 307, 308].includes(backendRes.status)) {
          const location = backendRes.headers.get('location') || ''
          if (location.includes('site/login') || location.includes('/login')) {
            return NextResponse.json(
              { success: false, message: 'Sesi tidak valid. Silakan login kembali.' },
              { status: 401 },
            )
          }
        }

        const payload = await backendRes.json().catch(() => null)
        lastPayload = payload

        if (backendRes.ok && payload) {
          return NextResponse.json(payload, { status: 200 })
        }
      } catch (err) {
        console.warn(`[bencana-stats proxy] Gagal memanggil ${targetUrl}:`, err)
      }
    }

    // Jika semua endpoint gagal
    if (lastRes) {
      return NextResponse.json(
        {
          success: false,
          message: lastPayload?.message || 'Gagal mengambil data statistik bencana dari server.',
        },
        { status: lastRes.status || 502 },
      )
    }

    return NextResponse.json(
      { success: false, message: 'Tidak dapat menghubungi server backend.' },
      { status: 503 },
    )
  } catch (error) {
    console.error('[bencana-stats proxy error]', error)
    return NextResponse.json(
      { success: false, message: 'Tidak dapat menghubungi server backend.' },
      { status: 503 },
    )
  }
}
