import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint untuk API Tenaga Cadangan Kesehatan (TCK) Kemkes.
 * Endpoint: POST https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck
 * Parameters: kd_prop (kode provinsi), kd_kab (opsional, kode kabupaten)
 */

// Token otorisasi untuk TCK Kemkes API
const TCK_TOKEN = 'eyJpdiI6InhVTFwvTEsyXC9vZStSYXhzR2lKRmppZz09IiwidmFsdWUiOiJiN3ZlXC9VR2dsZDhWNGJWY0pnRXZ6TVFxQWRweFZMRVdGa1YrZTY5RW9ZY0dmOXBLUFFGbFNIdU5Hck51aWJ6ZW9Tb05ad3BHaFYzQ3pWY3pPYTFxOHArd1pHNWN5SHkxRHl6VEZEemRJMDZ4RFM5bDZYQ05VcGY5aW5qNmdyQ0pqZGQ1OGRYajhGTlwveGZUbU5ZcVNqbkxcL05US29XOE40Z3lDOUNmOGJPRGZSSllYeUw5MHRQSTBuQnIwUjF0SzQiLCJtYWMiOiJlNjk5ZTYzOGMxM2EzZjVmYWQyNjE4Nzg3NWM2NTdlOTNiZGVkNTQwNjY2YjhlMDVhNzFmODQ3MTc0MGM2MGM1In0'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { kd_prop, kd_kab } = body

    if (!kd_prop) {
      return NextResponse.json(
        { success: false, message: 'kd_prop diperlukan' },
        { status: 400 }
      )
    }

    const formData = new FormData()
    formData.append('kd_prop', String(kd_prop))
    if (kd_kab) {
      formData.append('kd_kab', String(kd_kab))
    }

    const res = await fetch(
      'https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TCK_TOKEN}`,
          'Cookie': `token=${TCK_TOKEN}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://tenagacadangankesehatan.kemkes.go.id',
          'Referer': 'https://tenagacadangankesehatan.kemkes.go.id/web/tck',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        // cache bersih agar token baru selalu dipakai
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[TCK API] HTTP ${res.status}:`, errText.slice(0, 200))
      throw new Error(`TCK API responded with HTTP ${res.status}`)
    }

    const data = await res.json()

    return NextResponse.json({
      success: true,
      total: data.total || 0,
      filter: data.filter || {},
      data: data.data || []
    })
  } catch (error: any) {
    console.error('[TCK Relawan API Proxy]:', error.message)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data TCK Kemkes' },
      { status: 500 }
    )
  }
}
