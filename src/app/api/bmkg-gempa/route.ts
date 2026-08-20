import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const fetchBmkg = async (endpoint: string) => {
      try {
        const res = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${endpoint}`, {
          next: { revalidate: 60 },
          headers: {
            'User-Agent': 'SIPKK-EOC-Kemenkes/1.0',
            Accept: 'application/json',
          },
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.Infogempa?.gempa || null
      } catch {
        return null
      }
    }

    const [autogempa, gempaterkini, gempadirasakan] = await Promise.all([
      fetchBmkg('autogempa.json'),
      fetchBmkg('gempaterkini.json'),
      fetchBmkg('gempadirasakan.json'),
    ])

    const formatGempa = (g: any) => {
      if (!g) return null
      return {
        ...g,
        shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : null
      }
    }

    const data = {
      autogempa: formatGempa(autogempa),
      gempaterkini: (Array.isArray(gempaterkini) ? gempaterkini : (gempaterkini ? [gempaterkini] : [])).map(formatGempa),
      gempadirasakan: (Array.isArray(gempadirasakan) ? gempadirasakan : (gempadirasakan ? [gempadirasakan] : [])).map(formatGempa),
      sumber: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) - data.bmkg.go.id & gis.bmkg.go.id'
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[BMKG API Proxy Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch BMKG data' },
      { status: 500 }
    )
  }
}
