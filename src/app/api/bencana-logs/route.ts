import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'Parameter id diperlukan.' }, { status: 400 })
    }

    const targetUrl = `${BACKEND_BASE_URL}/laporan-kejadian/get-logs?id=${encodeURIComponent(id)}`
    const res = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      next: { revalidate: 30 }, // cache 30 seconds for live updates
    })

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        message: `Gagal menghubungi server backend (HTTP ${res.status})`,
        logs: []
      }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API Bencana Logs Error]', err)
    return NextResponse.json({
      success: false,
      message: err.message || 'Terjadi kesalahan saat memuat log aktivitas.',
      logs: []
    }, { status: 500 })
  }
}
