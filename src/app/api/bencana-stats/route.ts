import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/bencana-stats
 * Backend endpoint: BACKEND_BASE_URL/api/bencana-stats
 * Endpoint ini PUBLIC — tidak butuh token/auth.
 */

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

const EMPTY_RESPONSE = {
  success: true,
  summary: {
    total_bencana: 0,
    total_meninggal: 0,
    total_luka: 0,
    total_hilang: 0,
    total_pengungsi: 0,
    total_terdampak: 0,
  },
  jenis_bencana: [],
  wilayah: [],
  markers: [],
  faskes: [],
}

export async function GET(_request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/api/bencana-stats`

  try {
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
      },
      cache: 'no-store',
      // Ikuti redirect otomatis — mencegah 502 akibat Apache canonical/HTTPS redirect
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    const payload = await backendRes.json().catch(() => null)

    // Jika dapat JSON valid dari backend, teruskan ke frontend
    if (payload !== null) {
      return NextResponse.json(payload, { status: 200 })
    }

    // Backend tidak return JSON (mungkin HTML error page)
    console.warn('[bencana-stats proxy] Backend tidak return JSON. Status:', backendRes.status)
    return NextResponse.json(EMPTY_RESPONSE, { status: 200 })

  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    console.error('[bencana-stats proxy] Error:', error?.message)
    // Return data kosong agar dashboard tetap tampil (bukan error)
    return NextResponse.json(
      { ...EMPTY_RESPONSE, _error: isTimeout ? 'timeout' : 'network_error' },
      { status: 200 },
    )
  }
}
