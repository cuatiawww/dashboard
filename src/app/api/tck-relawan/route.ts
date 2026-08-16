import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy endpoint untuk API Tenaga Cadangan Kesehatan (TCK) Kemkes.
 * Endpoint: POST https://tenagacadangankesehatan.kemkes.go.id/web/web_api/v1/relawan-tck
 * Parameters: kd_prop (kode provinsi), kd_kab (opsional, kode kabupaten)
 */
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
          'Origin': 'https://tenagacadangankesehatan.kemkes.go.id',
          'Referer': 'https://tenagacadangankesehatan.kemkes.go.id/',
        },
        // Next.js cache: revalidate setiap 5 menit
        next: { revalidate: 300 }
      }
    )

    if (!res.ok) {
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
