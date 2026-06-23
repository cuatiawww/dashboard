import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  const searchParams = req.nextUrl.searchParams
  const q = searchParams.get('q') || ''
  
  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] }, { headers: CORS_HEADERS })
  }

  // Get Auth token from headers (forward to backend to check scope)
  const authHeader = req.headers.get('Authorization') || ''

  try {
    const backendUrl = `${BACKEND_BASE_URL}/api/search-region?q=${encodeURIComponent(q)}`
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const res = await fetch(backendUrl, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    })

    if (res.status >= 300) {
      return NextResponse.json(
        { success: false, message: 'Backend returned redirect or error.' },
        { status: res.status, headers: CORS_HEADERS }
      )
    }

    const json = await res.json()
    return NextResponse.json(json, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[regions-search] Proxy error:', err)
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
