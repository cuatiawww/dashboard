import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const getBackendUrl = () => {
  let url = process.env.SIPKK_BACKEND_BASE_URL || 'http://localhost/sipkk-baru'
  if (url.includes('localhost') && !url.includes('/sipkk-baru')) {
    url = `${url.replace(/\/+$/, '')}/sipkk-baru`
  }
  return url.replace(/\/+$/, '')
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get('level') || 'provinsi'
  const province = request.nextUrl.searchParams.get('province') || ''
  const search = request.nextUrl.searchParams.toString()

  // 1. Jika meminta level kabupaten NTT, sajikan langsung data geojson batas kabupaten NTT
  if (level === 'kabupaten' && (!province || province.toUpperCase().includes('NUSA TENGGARA TIMUR') || province.toUpperCase().includes('NTT'))) {
    try {
      const nttPath = path.join(process.cwd(), 'public', 'data', 'ntt-kabupaten.geojson')
      if (fs.existsSync(nttPath)) {
        const geojson = JSON.parse(fs.readFileSync(nttPath, 'utf-8'))
        return NextResponse.json({
          success: true,
          geojson
        }, {
          headers: {
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          }
        })
      }
    } catch (e) {
      console.warn('[wilayah-geojson] Error reading local ntt-kabupaten.geojson:', e)
    }
  }

  // 2. Coba ambil dari backend jika ada
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
      signal: AbortSignal.timeout(6000),
    })

    const payload = await backendRes.json().catch(() => null)
    if (payload !== null && payload.success && payload.geojson) {
      return NextResponse.json(payload, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      })
    }
  } catch (error: any) {
    // Backend fallback
  }

  // 3. Fallback level provinsi ke indonesia-provinces.geojson lokal
  if (level === 'provinsi') {
    try {
      const provPath = path.join(process.cwd(), 'public', 'indonesia-provinces.geojson')
      if (fs.existsSync(provPath)) {
        const geojson = JSON.parse(fs.readFileSync(provPath, 'utf-8'))
        return NextResponse.json({
          success: true,
          geojson
        }, {
          headers: {
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          }
        })
      }
    } catch (e) {
      console.warn('[wilayah-geojson] Error reading local indonesia-provinces.geojson:', e)
    }
  }

  return NextResponse.json(
    { success: false, message: 'GeoJSON tidak ditemukan.' },
    { status: 404 },
  )
}
