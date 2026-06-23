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

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
  }

  const { path } = await params
  const pathStr = path.join('/')

  // Ambil query string dari URL asli
  const searchParams = req.nextUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ''

  /**
   * Remapping path: api/* → web_api/v1/*
   *
   * Mengapa? Aplikasi utama Yii2 (ApiController) di server production
   * masih menggunakan konfigurasi lama yang memblokir request publik.
   * Sub-aplikasi web_api (V1Controller) memiliki konfigurasi akses
   * publik yang terpisah dan sudah benar. Semua endpoint yang sama tersedia
   * di kedua controller (captcha, login, register, regions, dll).
   *
   * Mapping contoh:
   *   /api/backend/api/regions  →  BACKEND/web_api/v1/regions  ✓
   *   /api/backend/api/login    →  BACKEND/web_api/v1/login    ✓
   *   /api/backend/web_api/...  →  BACKEND/web_api/...  (tidak berubah) ✓
   */
  let targetPath = pathStr
  if (!pathStr.startsWith('api/')) {
    targetPath = `api/${pathStr}`
  }

  // Bangun URL tujuan ke backend
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}${queryString}`

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
          { status: 401, headers: corsHeaders }
        )
      }

      // Redirect lain (bukan ke login) — teruskan ke klien
      return NextResponse.redirect(location, { status: backendRes.status, headers: corsHeaders })
    }

    // Salin semua header dari response backend
    const responseHeaders = new Headers(corsHeaders)
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
      { status: 503, headers: corsHeaders }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
