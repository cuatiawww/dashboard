/**
 * Next.js API Route: /api/regions
 *
 * Route ini mencoba mengambil data wilayah dari backend Yii2.
 * Jika backend belum mendukung endpoint publik (masih redirect ke login),
 * fallback ke data 34 provinsi Indonesia yang sudah hardcoded.
 *
 * URL patterns yang dicoba (urut prioritas):
 *  1. BACKEND/web_api/v1/regions   (sub-app V1Controller)
 *  2. BACKEND/api/regions          (main app ApiController)
 *  Jika keduanya gagal → return data 34 provinsi statis
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL || 'http://sipkk-baru.test'
).replace(/\/+$/, '')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Data 34 Provinsi Indonesia (fallback jika backend tidak tersedia)
const PROVINSI_FALLBACK = [
  { code: '11', name: 'ACEH' },
  { code: '12', name: 'SUMATERA UTARA' },
  { code: '13', name: 'SUMATERA BARAT' },
  { code: '14', name: 'RIAU' },
  { code: '15', name: 'JAMBI' },
  { code: '16', name: 'SUMATERA SELATAN' },
  { code: '17', name: 'BENGKULU' },
  { code: '18', name: 'LAMPUNG' },
  { code: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
  { code: '21', name: 'KEPULAUAN RIAU' },
  { code: '31', name: 'DKI JAKARTA' },
  { code: '32', name: 'JAWA BARAT' },
  { code: '33', name: 'JAWA TENGAH' },
  { code: '34', name: 'DI YOGYAKARTA' },
  { code: '35', name: 'JAWA TIMUR' },
  { code: '36', name: 'BANTEN' },
  { code: '51', name: 'BALI' },
  { code: '52', name: 'NUSA TENGGARA BARAT' },
  { code: '53', name: 'NUSA TENGGARA TIMUR' },
  { code: '61', name: 'KALIMANTAN BARAT' },
  { code: '62', name: 'KALIMANTAN TENGAH' },
  { code: '63', name: 'KALIMANTAN SELATAN' },
  { code: '64', name: 'KALIMANTAN TIMUR' },
  { code: '65', name: 'KALIMANTAN UTARA' },
  { code: '71', name: 'SULAWESI UTARA' },
  { code: '72', name: 'SULAWESI TENGAH' },
  { code: '73', name: 'SULAWESI SELATAN' },
  { code: '74', name: 'SULAWESI TENGGARA' },
  { code: '75', name: 'GORONTALO' },
  { code: '76', name: 'SULAWESI BARAT' },
  { code: '81', name: 'MALUKU' },
  { code: '82', name: 'MALUKU UTARA' },
  { code: '91', name: 'PAPUA BARAT' },
  { code: '94', name: 'PAPUA' },
]

/**
 * Coba fetch dari URL backend. Return null jika backend me-redirect ke login
 * atau tidak mengembalikan JSON yang valid.
 */
async function tryBackendFetch(url: string): Promise<object[] | null> {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    // Jika redirect ke login atau status error → anggap tidak tersedia
    if (res.status >= 300) return null

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null

    const json = await res.json()
    if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
      return json.data
    }
    return null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  const searchParams = req.nextUrl.searchParams
  const provinceId = searchParams.get('province_id') || ''
  const kabupatenId = searchParams.get('kabupaten_id') || ''
  const kecamatanId = searchParams.get('kecamatan_id') || ''

  const qs = searchParams.toString() ? `?${searchParams.toString()}` : ''

  // Endpoint yang dicoba secara berurutan
  const endpoints = [
    `${BACKEND_BASE_URL}/web_api/v1/regions${qs}`,
    `${BACKEND_BASE_URL}/api/regions${qs}`,
  ]

  // Coba setiap endpoint
  for (const url of endpoints) {
    const data = await tryBackendFetch(url)
    if (data !== null) {
      return NextResponse.json(
        { success: true, data },
        { headers: CORS_HEADERS }
      )
    }
  }

  // Fallback: jika ada province_id/kabupaten_id → tidak ada data statis untuk sub-wilayah
  if (provinceId || kabupatenId || kecamatanId) {
    return NextResponse.json(
      { success: false, message: 'Data sub-wilayah tidak tersedia saat ini.', data: [] },
      { status: 503, headers: CORS_HEADERS }
    )
  }

  // Fallback: kembalikan 34 provinsi statis
  console.warn('[regions] Backend tidak tersedia, menggunakan data provinsi fallback.')
  return NextResponse.json(
    { success: true, data: PROVINSI_FALLBACK, fallback: true },
    { headers: CORS_HEADERS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}
