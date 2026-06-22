import { NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/web_api/v1/captcha`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'manual',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      return NextResponse.json(
        { success: false, message: payload?.message || 'Gagal memuat CAPTCHA.' },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error) {
    console.error('Failed to load captcha from backend', error)

    return NextResponse.json(
      { success: false, message: 'Gagal menghubungi server CAPTCHA.' },
      { status: 503 },
    )
  }
}
