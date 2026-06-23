import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/bencana-stats
 *
 * Meneruskan request ke ApiController::actionBencanaStats() di backend utama
 * via web.php. Endpoint ini PUBLIC — tidak butuh token/auth.
 *
 * Backend endpoint: BACKEND_BASE_URL/api/bencana-stats
 */

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/api/bencana-stats`

  try {
    let backendRes: Response
    try {
      backendRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
        },
        cache: 'no-store',
        redirect: 'manual',
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

    // Jika backend redirect — ini berarti backend tidak mengenali endpoint ini sebagai public.
    // Kembalikan 502 (bukan 401) agar frontend tidak menganggap ini masalah sesi.
    if ([301, 302, 303, 307, 308].includes(backendRes.status)) {
      const location = backendRes.headers.get('location') || ''
      console.warn('[bencana-stats proxy] Backend redirect ke:', location, '| target:', targetUrl)
      return NextResponse.json(
        {
          success: false,
          message: 'Endpoint bencana-stats tidak dapat diakses. Periksa konfigurasi backend.',
        },
        { status: 502 },
      )
    }

    // Parse JSON dari backend
    const payload = await backendRes.json().catch(() => null)

    if (backendRes.ok && payload !== null) {
      return NextResponse.json(payload, { status: 200 })
    }

    // Backend error
    return NextResponse.json(
      {
        success: false,
        message: payload?.message || 'Gagal mengambil data statistik bencana dari server.',
      },
      { status: backendRes.status >= 400 ? backendRes.status : 502 },
    )
  } catch (error) {
    console.error('[bencana-stats proxy error]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal pada proxy.' },
      { status: 500 },
    )
  }
}
