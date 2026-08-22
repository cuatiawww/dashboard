import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint Proxy resmi Tenaga Cadangan Kesehatan (TCK) Kemkes RI.
 * Official Endpoint: POST https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck
 * Parameter: kd_prop (NTT = 53), kd_kab
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const OFFICIAL_TCK_TOKEN = 'eyJpdiI6InhVTFwvTEsyXC9vZStSYXhzR2lKRmppZz09IiwidmFsdWUiOiJiN3ZlXC9VR2dsZDhWNGJWY0pnRXZ6TVFxQWRweFZMRVdGa1YrZTY5RW9ZY0dmOXBLUFFGbFNIdU5Hck51aWJ6ZW9Tb05ad3BHaFYzQ3pWY3pPYTFxOHArd1pHNWN5SHkxRHl6VEZEemRJMDZ4RFM5bDZYQ05VcGY5aW5qNmdyY0pqZGQ1OGRYajhGTlwveGZUbU5ZcVNqbkxcL05US29XOE40Z3lDOUNmOGJPRGZSSllYeUw5MHRQSTBuQnIwUjF0SzQiLCJtYWMiOiJlNjk5ZTYzOGMxM2EzZjVmYWQyNjE4Nzg3NWM2NTdlOTNiZGVkNTQwNjY2YjhlMDVhNzFmODQ3MTc0MGM2MGM1In0'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { kd_prop, kd_kab, token } = body

    const targetProp = String(kd_prop || '53').trim()
    const tckToken = token || process.env.TCK_KEMKES_TOKEN || OFFICIAL_TCK_TOKEN

    // Format parameter x-www-form-urlencoded sesuai spesifikasi cURL Kemkes
    const params = new URLSearchParams()
    params.append('kd_prop', targetProp)
    params.append('kd_kab', kd_kab ? String(kd_kab) : '')

    let relawanList: any[] = []
    let isSuccess = false
    let errorMessage = ''

    try {
      const res = await fetch(
        'https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck',
        {
          method: 'POST',
          body: params.toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'TTOKEN': tckToken,
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        }
      )

      if (res.ok) {
        const json = await res.json().catch(() => null)
        if (Array.isArray(json?.data)) {
          relawanList = json.data
          isSuccess = true
        } else if (Array.isArray(json)) {
          relawanList = json
          isSuccess = true
        } else if (json && typeof json === 'object') {
          // Jika payload memiliki kunci data atau list lain
          const possibleData = json.relawan || json.list || json.result
          if (Array.isArray(possibleData)) {
            relawanList = possibleData
            isSuccess = true
          }
        }
      } else {
        errorMessage = `API Kemkes merespons HTTP ${res.status}: ${res.statusText}`
      }
    } catch (e: any) {
      console.warn('[TCK Kemkes Direct Fetch Warning]:', e.message)
      errorMessage = `Gagal terhubung ke server TCK Kemkes: ${e.message}`
    }

    return NextResponse.json({
      success: isSuccess,
      status: isSuccess,
      source: 'live_kemkes_api',
      total: relawanList.length,
      filter: { kd_prop: targetProp, kd_kab: kd_kab || '' },
      data: relawanList,
      message: !isSuccess ? (errorMessage || 'Data TCK dari API Kemkes sedang tidak dapat dijangkau.') : undefined
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: false,
      source: 'live_kemkes_api',
      total: 0,
      data: [],
      error: error.message
    })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kd_prop = searchParams.get('kd_prop') || '53'
  const kd_kab = searchParams.get('kd_kab') || ''

  const reqMock = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ kd_prop, kd_kab })
  })

  return POST(reqMock)
}
