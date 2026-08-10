import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/bencana-years
 * Backend endpoint: BACKEND_BASE_URL/api/bencana-years
 */

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

const EMPTY_RESPONSE = {
  success: true,
  data: [2026, 2025, 2024, 2023, 2022, 2021, 2020]
}

export async function GET(request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/api/bencana-years`

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
      return NextResponse.json(payload, { status: 200 })
    }

    console.warn('[bencana-years proxy] Backend tidak return JSON. Status:', backendRes.status)
    return NextResponse.json(EMPTY_RESPONSE, { status: 200 })

  } catch (error: any) {
    console.error('[bencana-years proxy] Error:', error?.message)
    return NextResponse.json(
      { ...EMPTY_RESPONSE, _error: 'network_error' },
      { status: 200 },
    )
  }
}
