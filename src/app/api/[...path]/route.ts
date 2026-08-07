import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
  }

  const { path } = await params
  const pathStr = path.join('/')
  const searchParams = req.nextUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ''

  const targetPath = pathStr.startsWith('api/')
    ? pathStr
    : `api/${pathStr}`
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}${queryString}`

  // Extract token from incoming Authorization header
  let clientToken = ''
  const authHeader = req.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    clientToken = authHeader.substring(7).trim()
  }

  const forwardHeaders = new Headers()
  req.headers.forEach((value, key) => {
    // Exclude authorization header to prevent raw backslashes triggering Apache 400 Bad Request
    if (!['host', 'connection', 'authorization'].includes(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  })

  const dashboardToken = process.env.SIPKK_DASHBOARD_TTOKEN?.trim()
  const tokenToSend = clientToken || dashboardToken
  if (tokenToSend) {
    forwardHeaders.set('TTOKEN', tokenToSend)
  }
  if (!forwardHeaders.has('accept')) {
    forwardHeaders.set('Accept', 'application/json')
  }

  let body: BodyInit | null = null
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.arrayBuffer()
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      cache: 'no-store',
      redirect: 'manual',
    })

    if ([301, 302, 307, 308].includes(backendRes.status)) {
      const location = backendRes.headers.get('location') || ''
      const isLoginRedirect =
        location.includes('site/login') || location.includes('/login')

      if (isLoginRedirect) {
        return NextResponse.json(
          {
            success: false,
            message: 'Sesi tidak valid atau akses ditolak. Silakan login kembali.',
          },
          { status: 401, headers: corsHeaders },
        )
      }

      return NextResponse.redirect(location, {
        status: backendRes.status,
        headers: corsHeaders,
      })
    }

    // Salin semua header dari response backend (hapus www-authenticate agar tidak memicu Basic Auth popup di browser)
    const responseHeaders = new Headers(corsHeaders)
    backendRes.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'www-authenticate'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    return new NextResponse(await backendRes.arrayBuffer(), {
      status: backendRes.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[API Proxy Error]', targetUrl, error)

    return NextResponse.json(
      {
        success: false,
        message: 'Tidak dapat menghubungi server backend. Pastikan server aktif.',
      },
      { status: 503, headers: corsHeaders },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
