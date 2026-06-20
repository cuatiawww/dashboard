import { NextResponse } from 'next/server'

import { generateCaptcha } from '@/lib/captcha/service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const captcha = await generateCaptcha()

    return NextResponse.json(captcha)
  } catch (error) {
    console.error('Failed to generate captcha', error)

    return NextResponse.json(
      { message: 'Gagal membuat CAPTCHA.' },
      { status: 500 },
    )
  }
}
