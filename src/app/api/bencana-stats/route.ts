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
    const targetUrl = `${BACKEND_BASE_URL}/web_api/v1/bencana-stats${queryString}`

    // Teruskan Authorization header jika ada
    const forwardHeaders: HeadersInit = {
      Accept: 'application/json',
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader
    }

    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders,
      cache: 'no-store',
      redirect: 'manual',
    })

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

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: payload?.message || 'Gagal mengambil data statistik bencana dari server.',
        },
        { status: backendRes.status || 502 },
      )
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('[bencana-stats proxy error]', error)
    return NextResponse.json(
      { success: false, message: 'Tidak dapat menghubungi server backend.' },
      { status: 503 },
    )
  }
}
