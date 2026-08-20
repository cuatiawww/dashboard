import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Parameter id diperlukan.' },
        { status: 400 }
      )
    }

    const token =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      process.env.SIPKK_DASHBOARD_TTOKEN?.trim() ||
      ''

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    }
    if (token) {
      headers['TTOKEN'] = token
    }

    const targetUrl = `${BACKEND_BASE_URL}/api/bencana-detail?id=${encodeURIComponent(id)}`
    const res = await fetch(targetUrl, {
      headers,
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Server backend mengembalikan respon HTTP ${res.status}.`,
        },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API Bencana Detail Error]', err)
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Terjadi kesalahan saat memuat detail kejadian bencana.',
      },
      { status: 500 }
    )
  }
}
