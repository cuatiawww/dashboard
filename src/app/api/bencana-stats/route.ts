import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/bencana-stats
 *
 * Meneruskan request ke ApiController::actionBencanaStats() di backend utama
 * via web.php (BUKAN web_api). Ini server-to-server, sehingga tidak ada CORS.
 *
 * Backend endpoint: BACKEND_BASE_URL/api/bencana-stats
 * Token diteruskan via:
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

    const targetUrl = `${BACKEND_BASE_URL}/api/bencana-stats${queryString}`

    // Teruskan Authorization header jika ada
    const forwardHeaders: HeadersInit = {
      Accept: 'application/json',
      'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader
    }

    let backendRes: Response
    try {
      backendRes = await fetch(targetUrl, {
        method: 'GET',
        headers: forwardHeaders,
        cache: 'no-store',
        redirect: 'manual',   // jangan ikuti redirect — tangani manual
        signal: AbortSignal.timeout(8000),
      })
    } catch (fetchErr: any) {
      const isTimeout = fetchErr?.name === 'TimeoutError' || fetchErr?.name === 'AbortError'
      console.error('[bencana-stats proxy] Gagal menghubungi backend:', fetchErr?.message)
      return NextResponse.json(
        {
          success: false,
          message: isTimeout
            ? 'Server backend tidak merespons (timeout). Silakan coba lagi.'
            : 'Tidak dapat menghubungi server backend.',
        },
        { status: 503 },
      )
    }

    // Jika backend redirect ke login → backend menganggap ini butuh auth
    // Tapi bencana-stats harusnya public. Kembalikan 502 (bukan 401)
    // agar frontend TIDAK memperlakukan ini sebagai session expired.
    if ([301, 302, 303, 307, 308].includes(backendRes.status)) {
      const location = backendRes.headers.get('location') || ''
      console.warn('[bencana-stats proxy] Backend redirect ke:', location)
      return NextResponse.json(
        {
          success: false,
          message: 'Endpoint bencana-stats tidak dapat diakses saat ini. Hubungi administrator.',
        },
        { status: 502 },
      )
    }

    // Parse JSON dari backend
    const payload = await backendRes.json().catch(() => null)

    if (backendRes.ok && payload?.success !== false) {
      return NextResponse.json(payload ?? {}, { status: 200 })
    }

    // Backend merespons dengan error (4xx/5xx)
    return NextResponse.json(
      {
        success: false,
        message: payload?.message || 'Gagal mengambil data statistik bencana dari server.',
      },
      { status: backendRes.status >= 400 && backendRes.status < 600 ? backendRes.status : 502 },
    )
  } catch (error) {
    console.error('[bencana-stats proxy error]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal pada proxy.' },
      { status: 500 },
    )
  }
}
