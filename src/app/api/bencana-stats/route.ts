import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/bencana-stats
 * Backend endpoint: BACKEND_BASE_URL/api/bencana-stats
 *
 * Meneruskan Authorization header dari frontend ke backend
 * agar backend bisa apply wilayah_scope filter dari JWT token user.
 * Endpoint ini bisa diakses tanpa token (national scope) maupun dengan token (filtered scope).
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

export async function GET(request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/api/bencana-stats`

  // Teruskan Authorization header dari client ke backend
  // agar getRequestWilayahScope() bisa apply filter berdasarkan wilayah_scope user
  const authHeader = request.headers.get('authorization') || ''

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
  }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    const payload = await backendRes.json().catch(() => null)

    if (payload !== null) {
      return NextResponse.json(payload, { status: 200 })
    }

    console.warn('[bencana-stats proxy] Backend tidak return JSON. Status:', backendRes.status)
    return NextResponse.json(EMPTY_RESPONSE, { status: 200 })

  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    console.error('[bencana-stats proxy] Error:', error?.message)
    return NextResponse.json(
      { ...EMPTY_RESPONSE, _error: isTimeout ? 'timeout' : 'network_error' },
      { status: 200 },
    )
  }
}
