/**
 * Custom Proxy Handler untuk Backend Yii2
 *
 * Mengapa ini diperlukan?
 * Konfigurasi `rewrites()` di next.config.ts meneruskan redirect (302) dari
 * backend langsung ke browser. Akibatnya browser mengakses server backend
 * secara langsung yang tidak memiliki CORS header, sehingga terjadi CORS error.
 *
 * Solusi: API route ini mem-proxy request secara MANUAL di server Next.js.
 * Semua redirect dari backend ditangkap di sini dan tidak pernah diteruskan
 * ke browser, sehingga CORS error tidak akan terjadi.
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL || 'http://sipkk-baru.test'
).replace(/\/+$/, '')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With',
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  const { path } = await params
  const pathStr = path.join('/')

  // Ambil query string dari URL asli
  const searchParams = req.nextUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ''

  // Bangun URL tujuan ke backend
  const targetUrl = `${BACKEND_BASE_URL}/${pathStr}${queryString}`

  // Salin headers dari request asli (hapus host agar tidak konflik)
  const forwardHeaders = new Headers()
  req.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  })

  let body: BodyInit | null = null
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.arrayBuffer()
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body,
      // PENTING: Jangan ikuti redirect otomatis!
      // Dengan ini, jika backend me-redirect ke /site/login, kita tangkap di sini.
      redirect: 'manual',
    })

    // Jika backend me-redirect (302/301) ke halaman login, kembalikan 401 JSON
    if (backendRes.status === 301 || backendRes.status === 302 || backendRes.status === 307 || backendRes.status === 308) {
      const location = backendRes.headers.get('location') || ''
      const isLoginRedirect = location.includes('site/login') || location.includes('/login')

      if (isLoginRedirect) {
        return NextResponse.json(
          { success: false, message: 'Sesi tidak valid atau akses ditolak. Silakan login kembali.' },
          { status: 401, headers: CORS_HEADERS }
        )
      }

      // Redirect lain (bukan ke login) — teruskan ke klien
      return NextResponse.redirect(location, { status: backendRes.status, headers: CORS_HEADERS })
    }

    // Salin semua header dari response backend
    const responseHeaders = new Headers(CORS_HEADERS)
    backendRes.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    const responseBody = await backendRes.arrayBuffer()

    return new NextResponse(responseBody, {
      status: backendRes.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[Proxy Error]', targetUrl, error)
    return NextResponse.json(
      { success: false, message: 'Tidak dapat menghubungi server backend. Pastikan server aktif.' },
      { status: 503, headers: CORS_HEADERS }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
