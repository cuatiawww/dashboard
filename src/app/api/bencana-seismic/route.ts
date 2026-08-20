import { NextResponse } from 'next/server'

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const dateParam = searchParams.get('date') // YYYY-MM-DD
  const kabParam = searchParams.get('kabupaten') || ''
  const provParam = searchParams.get('provinsi') || ''
  const dbMag = searchParams.get('magnitudo') || ''
  const dbDepth = searchParams.get('kedalaman') || ''
  const dbMmi = searchParams.get('mmi') || ''
  const dbTsunami = searchParams.get('potensi_tsunami') || ''

  const lat = parseFloat(latParam || '0')
  const lng = parseFloat(lngParam || '0')

  if (!dateParam || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return NextResponse.json({
      success: false,
      message: 'Invalid coordinate or date parameter',
    }, { status: 400 })
  }

  try {
    const baseDate = new Date(dateParam)
    if (isNaN(baseDate.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD')
    }

    const startObj = new Date(baseDate)
    startObj.setDate(baseDate.getDate() - 3)
    const endObj = new Date(baseDate)
    endObj.setDate(baseDate.getDate() + 3)

    const startStr = startObj.toISOString().split('T')[0]
    const endStr = endObj.toISOString().split('T')[0]

    // 1. Fetch official BMKG Real-time TEWS endpoints in parallel
    const fetchBmkg = async (endpoint: string) => {
      try {
        const res = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${endpoint}`, {
          next: { revalidate: 60 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0', Accept: 'application/json' },
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.Infogempa?.gempa || null
      } catch {
        return null
      }
    }

    // 2. Fetch USGS Seismic Catalog filtered by exact lat/lng and date range
    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startStr}&endtime=${endStr}T23:59:59&latitude=${lat}&longitude=${lng}&maxradiuskm=350&minmagnitude=2.5`
    const fetchUsgs = async () => {
      try {
        const res = await fetch(usgsUrl, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return []
        const json = await res.json()
        return json?.features || []
      } catch {
        return []
      }
    }

    const [autogempa, gempaterkini, gempadirasakan, usgsFeatures] = await Promise.all([
      fetchBmkg('autogempa.json'),
      fetchBmkg('gempaterkini.json'),
      fetchBmkg('gempadirasakan.json'),
      fetchUsgs(),
    ])

    // Match BMKG earthquake by spatial distance (<= 350km) and region name
    const allBmkg = [
      ...(Array.isArray(gempadirasakan) ? gempadirasakan : (gempadirasakan ? [gempadirasakan] : [])),
      ...(Array.isArray(gempaterkini) ? gempaterkini : (gempaterkini ? [gempaterkini] : [])),
      autogempa,
    ].filter(Boolean)

    let bmkgMatch: any = null
    const locKeywords = `${kabParam} ${provParam}`.toLowerCase()

    for (const bg of allBmkg) {
      if (bg.Coordinates) {
        const [bLat, bLon] = bg.Coordinates.split(',').map((s: string) => parseFloat(s.trim()))
        if (!isNaN(bLat) && !isNaN(bLon)) {
          const dist = haversineDist(lat, lng, bLat, bLon)
          if (dist <= 350) {
            bmkgMatch = { ...bg, distanceKm: Math.round(dist) }
            break
          }
        }
      }
      const wil = `${bg.Wilayah || ''} ${bg.Dirasakan || ''}`.toLowerCase()
      if (locKeywords.trim() && wil.includes(kabParam.toLowerCase())) {
        bmkgMatch = bg
        break
      }
    }

    // Map USGS features by local date YYYY-MM-DD
    const byDate: Record<string, any> = {}
    for (const f of usgsFeatures) {
      const p = f.properties
      const geom = f.geometry?.coordinates || []
      const eDate = new Date(p.time).toISOString().split('T')[0]
      const dist = haversineDist(lat, lng, geom[1], geom[0])

      if (!byDate[eDate] || p.mag > byDate[eDate].mag) {
        byDate[eDate] = {
          mag: p.mag,
          depth: Math.round(geom[2] || 10),
          place: p.place,
          dist: Math.round(dist),
          mmi: p.mmi || null,
          time: new Date(p.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }
      }
    }

    // Build 7-day timeline (H-3 to H+3)
    const timeline = []
    const eventDateStr = baseDate.toISOString().split('T')[0]

    for (let i = -3; i <= 3; i++) {
      const curr = new Date(baseDate)
      curr.setDate(baseDate.getDate() + i)
      const dStr = curr.toISOString().split('T')[0]
      const isEventDay = i === 0

      const dayName = curr.toLocaleDateString('id-ID', { weekday: 'short' })
      const dateLabel = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

      if (byDate[dStr]) {
        const eq = byDate[dStr]
        const role = isEventDay
          ? 'Gempa Utama'
          : i > 0
          ? `Susulan (+${i}H)`
          : `Pra-Gempa (${i}H)`

        timeline.push({
          offset: i,
          dateStr: dStr,
          dayName,
          dateLabel,
          topLabel: `M ${Number(eq.mag).toFixed(1)}`,
          bottomLabel: isEventDay && (bmkgMatch?.Dirasakan || dbMmi) ? (bmkgMatch?.Dirasakan ? bmkgMatch.Dirasakan.split(',')[0].trim() : `${dbMmi} MMI`) : role,
          magnitude: eq.mag,
          depth: `${eq.depth} km`,
          place: eq.place,
          statusType: isEventDay ? 'mainshock' : i > 0 ? 'aftershock' : 'foreshock',
          isPeak: isEventDay,
        })
      } else if (isEventDay && (bmkgMatch || dbMag)) {
        const magVal = parseFloat(bmkgMatch?.Magnitude || dbMag || '5.0')
        const depthVal = bmkgMatch?.Kedalaman || (dbDepth ? `${dbDepth} km` : '10 km')
        const mmiVal = bmkgMatch?.Dirasakan ? bmkgMatch.Dirasakan.split(',')[0].trim() : (dbMmi ? `${dbMmi} MMI` : 'Gempa Utama')

        timeline.push({
          offset: i,
          dateStr: dStr,
          dayName,
          dateLabel,
          topLabel: `M ${magVal.toFixed(1)}`,
          bottomLabel: mmiVal,
          magnitude: magVal,
          depth: depthVal,
          place: bmkgMatch?.Wilayah || `${kabParam}, ${provParam}`,
          statusType: 'mainshock',
          isPeak: true,
        })
      } else {
        timeline.push({
          offset: i,
          dateStr: dStr,
          dayName,
          dateLabel,
          topLabel: 'M < 3.0',
          bottomLabel: 'Seismik Stabil',
          magnitude: 0,
          depth: '-',
          place: 'Nihil Gempa Signifikan',
          statusType: 'normal',
          isPeak: false,
        })
      }
    }

    // Determine Main Characteristics for Event Day
    const mainDayEq = byDate[eventDateStr]
    const magnitude = bmkgMatch?.Magnitude
      ? `${bmkgMatch.Magnitude} SR`
      : mainDayEq
      ? `${Number(mainDayEq.mag).toFixed(1)} SR`
      : dbMag
      ? `${dbMag} SR`
      : '-'

    const kedalaman = bmkgMatch?.Kedalaman
      ? bmkgMatch.Kedalaman
      : mainDayEq
      ? `${mainDayEq.depth} km`
      : dbDepth
      ? `${dbDepth} km`
      : '-'

    const potensiTsunami = bmkgMatch?.Potensi
      ? bmkgMatch.Potensi
      : dbTsunami
      ? dbTsunami
      : mainDayEq && mainDayEq.mag >= 7.0 && mainDayEq.depth < 50
      ? 'Waspada / Berpotensi Tsunami'
      : 'Tidak Berpotensi Tsunami'

    const intensitasMmi = bmkgMatch?.Dirasakan
      ? bmkgMatch.Dirasakan
      : dbMmi
      ? `${dbMmi} MMI`
      : mainDayEq?.mmi
      ? `${mainDayEq.mmi} MMI`
      : mainDayEq?.place
      ? `Dirasakan di sekitar ${mainDayEq.place}`
      : '-'

    const shakemapUrl = bmkgMatch?.Shakemap
      ? `https://data.bmkg.go.id/DataMKG/TEWS/${bmkgMatch.Shakemap}`
      : null

    return NextResponse.json({
      success: true,
      data: {
        matched: Boolean(bmkgMatch || mainDayEq || dbMag),
        characteristics: {
          magnitude,
          kedalaman,
          potensiTsunami,
          intensitasMmi,
          shakemapUrl,
          wilayah: bmkgMatch?.Wilayah || mainDayEq?.place || `${kabParam}, ${provParam}`,
        },
        timeline,
        sumber: bmkgMatch
          ? 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'
          : 'Katalog Seismik Global & Regional BMKG/USGS',
      },
    })
  } catch (error: any) {
    console.error('[Bencana Seismic API Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
