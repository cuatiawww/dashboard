import { NextResponse } from 'next/server'

export async function GET() {
  const url = 'https://opsroom.sipongidata.my.id/api/gfs'
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!res.ok) {
      throw new Error(`GFS Wind API returned HTTP ${res.status}`)
    }

    const data = await res.json()
    // Handle cases where data is wrapped in a { data: ... } property, otherwise return directly
    const result = data && typeof data === 'object' && 'data' in data ? data.data : data
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[GFS Wind Proxy Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch GFS Wind data' },
      { status: 500 }
    )
  }
}
