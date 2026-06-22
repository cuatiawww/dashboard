import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = (
  process.env.SIPKK_BACKEND_BASE_URL ||
  'https://sipkk-new.mediaciptainformasi.co.id'
).replace(/\/+$/, '')

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string
      password?: string
      captcha_key?: string
      captcha_value?: string
    }

    const username = body.username?.trim() ?? ''
    const password = body.password ?? ''
    const captchaKey = body.captcha_key ?? ''
    const captchaValue = body.captcha_value?.trim() ?? ''

    if (!username || !password || !captchaKey || !captchaValue) {
      return NextResponse.json(
        { success: false, message: 'Username, password, dan captcha wajib diisi.' },
        { status: 400 },
      )
    }

    const response = await fetch(`${BACKEND_BASE_URL}/web_api/v1/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        captcha_key: captchaKey,
        captcha_value: captchaValue,
      }),
      cache: 'no-store',
      redirect: 'manual',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: payload?.message || 'Login gagal. Backend mengembalikan respons tidak valid.',
        },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('Failed to proxy login to backend', error)

    return NextResponse.json(
      { success: false, message: 'Gagal menghubungi server login.' },
      { status: 503 },
    )
  }
}
