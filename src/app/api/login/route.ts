import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { CAPTCHA_COOKIE_NAME } from '@/lib/captcha/config'

const DEMO_USERNAME = process.env.DEMO_LOGIN_USERNAME ?? 'admin'
const DEMO_PASSWORD = process.env.DEMO_LOGIN_PASSWORD ?? 'demo12345'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const captchaVerified = cookieStore.get(CAPTCHA_COOKIE_NAME)?.value === '1'

  if (!captchaVerified) {
    return NextResponse.json(
      { success: false, message: 'CAPTCHA harus diverifikasi terlebih dahulu.' },
      { status: 403 },
    )
  }

  cookieStore.delete(CAPTCHA_COOKIE_NAME)

  try {
    const body = (await request.json()) as {
      username?: string
      password?: string
    }

    const username = body.username?.trim() ?? ''
    const password = body.password ?? ''

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 },
      )
    }

    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah.' },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      token: crypto.randomUUID(),
      user: {
        id_user: 1,
        username: DEMO_USERNAME,
        email: 'admin@example.com',
        nama_lengkap: 'Admin Demo',
        level_user_id: 1,
        level_name: 'Administrator',
      },
    })
  } catch (error) {
    console.error('Failed to process login', error)

    return NextResponse.json(
      { success: false, message: 'Request login tidak valid.' },
      { status: 400 },
    )
  }
}
