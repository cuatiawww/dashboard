import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy server-side untuk /api/refresh-mv
 * Backend endpoint: BACKEND_BASE_URL/api/refresh-mv
 */

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const targetUrl = `${BACKEND_BASE_URL}/api/refresh-mv`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'SIPKK-Dashboard-Proxy/1.0',
  }
  const dashboardToken = process.env.SIPKK_DASHBOARD_TTOKEN?.trim()
  if (dashboardToken) headers.TTOKEN = dashboardToken

  try {
    const backendRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(30000), // 30 seconds for MV refresh
    })

    const payload = await backendRes.json().catch(() => null)

    if (payload !== null) {
      return NextResponse.json(payload, { status: backendRes.status })
    }

    return NextResponse.json(
      { success: false, message: 'Failed to refresh Materialized View (No JSON response from backend).' },
      { status: 500 }
    )

  } catch (error: any) {
    console.error('[refresh-mv proxy] Error:', error?.message)
    return NextResponse.json(
      { success: false, message: 'Network error or timeout: ' + error?.message },
      { status: 500 }
    )
  }
}
