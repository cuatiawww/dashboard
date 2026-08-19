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
  penyakit: [],
  markers: [],
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString()
  const targetUrl = `${BACKEND_BASE_URL}/api/bencana-stats${search ? `?${search}` : ''}`

  // Teruskan token dari Authorization header via TTOKEN (hindari Apache 400 dari backslash)
  const authHeader = request.headers.get('authorization') || ''
  let clientToken = ''
  if (authHeader.startsWith('Bearer ')) {
    clientToken = authHeader.substring(7).trim()
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
  }
  const dashboardToken = process.env.SIPKK_DASHBOARD_TTOKEN?.trim()
  const tokenToSend = clientToken || dashboardToken
  if (tokenToSend) headers.TTOKEN = tokenToSend

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
      // Filter out events with future incident dates
      if (Array.isArray(payload.markers)) {
        const nowMs = Date.now() + 60000 // 1 minute tolerance
        const parseDate = (tgl: string | undefined): Date | null => {
          if (!tgl) return null
          const clean = tgl.replace(/\s*WIB/gi, '').trim()
          let d = new Date(clean)
          if (!isNaN(d.getTime())) return d
          d = new Date(clean.replace(' ', 'T'))
          if (!isNaN(d.getTime())) return d
          const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
          if (dmyMatch) {
            d = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10))
            if (!isNaN(d.getTime())) return d
          }
          return null
        }

        const originalCount = payload.markers.length
        payload.markers = payload.markers.filter((m: any) => {
          const d = parseDate(m.tgl_kejadian)
          if (d && d.getTime() > nowMs) return false
          return true
        })

        if (payload.summary && payload.markers.length !== originalCount) {
          payload.summary.total_bencana = Math.max(0, (payload.summary.total_bencana || 0) - (originalCount - payload.markers.length))
        }
      }

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
