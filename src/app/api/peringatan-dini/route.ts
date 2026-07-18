import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provinsi = searchParams.get('provinsi') || ''

  const apiKey = process.env.API_INDONESIA_KEY || 'aip_live_KmS4W3mHxXS4x6SV7Dh35QFHCKmT3Fts'
  const url = `https://use.apiindonesia.id/api/v1/peringatan-dini?provinsi=${encodeURIComponent(provinsi)}`

  try {
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey
      },
      next: { revalidate: 300 } // Cache for 5 minutes (300 seconds)
    })

    if (!res.ok) {
      throw new Error(`API Indonesia returned HTTP ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[API Indonesia Proxy Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch Peringatan Dini data' },
      { status: 500 }
    )
  }
}
