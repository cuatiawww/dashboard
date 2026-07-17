import { NextResponse } from 'next/server'

export async function GET() {
  const url = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json'

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 } // Cache for 60 seconds
    })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from BMKG (HTTP ${res.status})`)
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[BMKG API Proxy Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch BMKG data' },
      { status: 500 }
    )
  }
}
