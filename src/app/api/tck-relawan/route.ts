import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint untuk API Tenaga Cadangan Kesehatan (TCK) Kemkes RI.
 * Endpoint: POST https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck
 * Header: TTOKEN: <token>
 * Body (FormData): kd_prop, kd_kab
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { kd_prop, kd_kab, token } = body

    if (!kd_prop) {
      return NextResponse.json(
        { success: false, message: 'Parameter kd_prop (kode provinsi) diperlukan.' },
        { status: 400 }
      )
    }

    const tckToken = token || process.env.TCK_KEMKES_TOKEN || 'eyJpdiI6InhVTFwvTEsyXC9vZStSYXhzR2lKRmppZz09IiwidmFsdWUiOiJiN3ZlXC9VR2dsZDhWNGJWY0pnRXZ6TVFxQWRweFZMRVdGa1YrZTY5RW9ZY0dmOXBLUFFGbFNIdU5Hck51aWJ6ZW9Tb05ad3BHaFYzQ3pWY3pPYTFxOHArd1pHNWN5SHkxRHl6VEZEemRJMDZ4RFM5bDZYQ05VcGY5aW5qNmdyY0pqZGQ1OGRYajhGTlwveGZUbU5ZcVNqbkxcL05US29XOE40Z3lDOUNmOGJPRGZSSllYeUw5MHRQSTBuQnIwUjF0SzQiLCJtYWMiOiJlNjk5ZTYzOGMxM2EzZjVmYWQyNjE4Nzg3NWM2NTdlOTNiZGVkNTQwNjY2YjhlMDVhNzFmODQ3MTc0MGM2MGM1In0'

    const formData = new FormData()
    formData.append('kd_prop', String(kd_prop))
    formData.append('kd_kab', kd_kab ? String(kd_kab) : '')

    const res = await fetch(
      'https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck',
      {
        method: 'POST',
        body: formData,
        headers: {
          'TTOKEN': tckToken,
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      return NextResponse.json({
        success: false,
        source: 'api_kemkes_error',
        status: res.status,
        message: `Gagal memuat data dari API TCK Kemkes (HTTP ${res.status}): ${errorText.substring(0, 200)}`,
        total: 0,
        data: []
      }, { status: res.status })
    }

    const json = await res.json()
    const relawanList = Array.isArray(json?.data) ? json.data : []
    const totalCount = json?.total || relawanList.length

    return NextResponse.json({
      success: true,
      status: json?.status ?? true,
      source: 'live_kemkes',
      total: totalCount,
      filter: json?.filter || { kd_prop: String(kd_prop), kd_kab: kd_kab || '' },
      data: relawanList
    })
  } catch (error: any) {
    console.error('[TCK Relawan API Proxy Error]:', error.message)
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Gagal menghubungi server API TCK Kemkes.',
        total: 0,
        data: []
      },
      { status: 500 }
    )
  }
}
