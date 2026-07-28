import { NextRequest, NextResponse } from 'next/server'

const getBackendUrl = () => {
  let url = process.env.SIPKK_BACKEND_BASE_URL || 'http://localhost/sipkk-baru'
  if (url.includes('localhost') && !url.includes('/sipkk-baru')) {
    url = `${url.replace(/\/+$/, '')}/sipkk-baru`
  }
  return url.replace(/\/+$/, '')
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString()
  const backendBase = getBackendUrl()
  const targetUrl = `${backendBase}/api/wilayah-geojson${search ? `?${search}` : ''}`

  try {
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SIPKK-Wilayah-GeoJSON-Proxy/1.0',
        ...(process.env.SIPKK_DASHBOARD_TTOKEN?.trim()
          ? { TTOKEN: process.env.SIPKK_DASHBOARD_TTOKEN.trim() }
          : {}),
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    const payload = await backendRes.json().catch(() => null)
    if (payload !== null) {
      return NextResponse.json(payload, {
        status: backendRes.status || 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=600',
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Backend tidak mengembalikan JSON.' },
      { status: 502 },
    )
  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    return NextResponse.json(
      { success: false, message: isTimeout ? 'Permintaan geojson timeout.' : 'Gagal menghubungi backend.' },
      { status: 502 },
    )
  }
}
