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

    const fetchApiIndonesia = async (endpoint: string) => {
      try {
        const res = await fetch(`https://use.apiindonesia.id/api/v1/gempa/${endpoint}`, {
          next: { revalidate: 60 },
          headers: {
            'x-api-key': 'aip_live_JoPepl4CUFWgDIZMqJ6VPWmsabaRyEeA',
            Accept: 'application/json',
          },
        })
        if (!res.ok) return []
        const json = await res.json()
        return Array.isArray(json?.data) ? json.data : []
      } catch {
        return []
      }
    }

    const [autogempa, gempaterkini, gempadirasakan, apiIndoTerkini, apiIndoDirasakan] = await Promise.all([
      fetchBmkg('autogempa.json'),
      fetchBmkg('gempaterkini.json'),
      fetchBmkg('gempadirasakan.json'),
      fetchApiIndonesia('terkini'),
      fetchApiIndonesia('dirasakan'),
    ])

    const formatGempa = (g: any) => {
      if (!g) return null
      return {
        ...g,
        shakemapUrl: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : null,
      }
    }

    // Convert apiindonesia format to BMKG standard format if needed
    const mapApiIndoToBmkg = (item: any) => {
      if (!item) return null
      return {
        Tanggal: item.datetime ? item.datetime.split('T')[0] || item.datetime.split(' ')[0] : '',
        Jam: item.datetime ? (item.datetime.split('T')[1] || item.datetime.split(' ')[1] || '').substring(0, 8) : '',
        DateTime: item.datetime || '',
        Coordinates: `${item.lat},${item.lng}`,
        Lintang: String(item.lat || ''),
        Bujur: String(item.lng || ''),
        Magnitude: String(item.magnitude || ''),
        Kedalaman: `${item.depth_km || item.depth || 10} km`,
        Wilayah: item.region || '',
        Potensi: item.potential || 'Tidak berpotensi tsunami',
        Dirasakan: item.felt_areas || '',
        Source: item.source || 'BMKG',
      }
    }

    const mergedTerkini = Array.isArray(gempaterkini)
      ? gempaterkini.map(formatGempa)
      : (gempaterkini ? [formatGempa(gempaterkini)] : apiIndoTerkini.map(mapApiIndoToBmkg))

    const mergedDirasakan = Array.isArray(gempadirasakan)
      ? gempadirasakan.map(formatGempa)
      : (gempadirasakan ? [formatGempa(gempadirasakan)] : apiIndoDirasakan.map(mapApiIndoToBmkg))

    const data = {
      autogempa: formatGempa(autogempa) || (apiIndoTerkini[0] ? mapApiIndoToBmkg(apiIndoTerkini[0]) : null),
      gempaterkini: mergedTerkini,
      gempadirasakan: mergedDirasakan,
      apiindonesia: {
        terkini: apiIndoTerkini,
        dirasakan: apiIndoDirasakan,
      },
      sumber: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) & API Indonesia (use.apiindonesia.id)',
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
