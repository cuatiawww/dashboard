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
    const endObj = new Date(baseDate)
    endObj.setDate(baseDate.getDate() + 7)

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

    // 3. Fetch API Indonesia (use.apiindonesia.id) for direct clean JSON
    const fetchApiIndonesia = async () => {
      try {
        const apiKey = process.env.API_INDONESIA_KEY || 'aip_live_JoPepl4CUFWgDIZMqJ6VPWmsabaRyEeA'
        const [terkiniRes, dirasakanRes] = await Promise.all([
          fetch('https://use.apiindonesia.id/api/v1/gempa/terkini', {
            next: { revalidate: 60 },
            headers: { 'x-api-key': apiKey, Accept: 'application/json' },
          }),
          fetch('https://use.apiindonesia.id/api/v1/gempa/dirasakan', {
            next: { revalidate: 60 },
            headers: { 'x-api-key': apiKey, Accept: 'application/json' },
          }),
        ])
        const [tJson, dJson] = await Promise.all([
          terkiniRes.ok ? terkiniRes.json() : null,
          dirasakanRes.ok ? dirasakanRes.json() : null,
        ])
        const tList = Array.isArray(tJson?.data) ? tJson.data : []
        const dList = Array.isArray(dJson?.data) ? dJson.data : []
        return [...tList, ...dList]
      } catch {
        return []
      }
    }

    // 4. Fetch PetaBencana.id Verified Field Archive
    const fetchPetaBencana = async () => {
      try {
        const pbUrl = `https://data.petabencana.id/reports/archive?start=${startStr}T00:00:00Z&end=${endStr}T23:59:59Z`
        const res = await fetch(pbUrl, {
          next: { revalidate: 3600 },
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return []
        const json = await res.json()
        return json?.result?.objects?.output?.geometries || []
      } catch {
        return []
      }
    }

    const [autogempa, gempaterkini, gempadirasakan, usgsFeatures, apiIndoList, petaBencanaList] = await Promise.all([
      fetchBmkg('autogempa.json'),
      fetchBmkg('gempaterkini.json'),
      fetchBmkg('gempadirasakan.json'),
      fetchUsgs(),
      fetchApiIndonesia(),
      fetchPetaBencana(),
    ])

    // Match PetaBencana field reports by spatial distance
    let petaBencanaMatch: any = null
    for (const geom of petaBencanaList) {
      const coords = geom.coordinates || []
      if (coords.length >= 2) {
        const dist = haversineDist(lat, lng, coords[1], coords[0])
        if (dist <= 350) {
          petaBencanaMatch = {
            ...geom.properties,
            distanceKm: Math.round(dist),
            coordinates: coords,
          }
          break
        }
      }
    }

    // Helper: Verify if a BMKG or API item strictly occurred on dateParam
    const isMatchingEventDate = (dtStr?: string, tglStr?: string) => {
      if (dtStr) {
        try {
          const itemDate = new Date(dtStr).toISOString().split('T')[0]
          if (itemDate === dateParam) return true
        } catch {}
      }
      if (tglStr) {
        const match = tglStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
        if (match) {
          const bDay = parseInt(match[1], 10)
          const bYear = parseInt(match[3], 10)
          if (bDay === baseDate.getDate() && bYear === baseDate.getFullYear()) {
            return true
          }
        }
      }
      return false
    }

    // Match API Indonesia earthquake ONLY if the date strictly matches the disaster date
    let apiIndoMatch: any = null
    const locKeywords = `${kabParam} ${provParam}`.toLowerCase()

    for (const item of apiIndoList) {
      if (!isMatchingEventDate(item.datetime || item.created_at, item.date || item.tanggal)) {
        continue
      }
      if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        const dist = haversineDist(lat, lng, item.lat, item.lng)
        if (dist <= 350) {
          apiIndoMatch = { ...item, distanceKm: Math.round(dist) }
          break
        }
      }
      const reg = (item.region || '').toLowerCase()
      if (locKeywords.trim() && kabParam && reg.includes(kabParam.toLowerCase())) {
        apiIndoMatch = item
        break
      }
    }

    const allBmkg = [
      ...(Array.isArray(gempadirasakan) ? gempadirasakan : (gempadirasakan ? [gempadirasakan] : [])),
      ...(Array.isArray(gempaterkini) ? gempaterkini : (gempaterkini ? [gempaterkini] : [])),
      autogempa,
    ].filter(Boolean)

    let bmkgMatch: any = null

    for (const bg of allBmkg) {
      // Strictly ensure the BMKG event is on the disaster date
      if (!isMatchingEventDate(bg.DateTime, bg.Tanggal)) {
        continue
      }
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

    // Build earthquakeFeatures array with ALL USGS seismic points for map rendering
    const earthquakeFeatures = usgsFeatures.map((f: any) => {
      const p = f.properties
      const geom = f.geometry?.coordinates || []
      const eDate = new Date(p.time).toISOString().split('T')[0]
      return {
        lat: geom[1],
        lng: geom[0],
        magnitude: Number(p.mag) || 0,
        depth: Math.round(geom[2] || 10),
        place: p.place || '',
        time: new Date(p.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        dateStr: eDate,
        dateLabel: new Date(p.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        distKm: Math.round(haversineDist(lat, lng, geom[1], geom[0])),
        isMainshock: eDate === dateParam && p.mag >= 5.0,
        mmi: p.mmi || null,
        tsunami: p.tsunami || 0,
        url: p.url || '',
      }
    }).sort((a: any, b: any) => b.magnitude - a.magnitude)

    const isNtt = provParam.toLowerCase().includes('nusa tenggara timur') || kabParam.toLowerCase().includes('flores') || kabParam.toLowerCase().includes('manggarai')

    // Determine Main Characteristics for Disaster Date (dateParam)
    const mainDayEq = byDate[dateParam]
    const parsedDbMag = parseFloat(dbMag)
    const hasDbMag = !isNaN(parsedDbMag) && parsedDbMag > 0
    const mainMagNum = bmkgMatch?.Magnitude
      ? parseFloat(bmkgMatch.Magnitude)
      : hasDbMag
      ? parsedDbMag
      : mainDayEq
      ? parseFloat(mainDayEq.mag)
      : 0

    const magnitude = bmkgMatch?.Magnitude
      ? `${bmkgMatch.Magnitude} SR`
      : apiIndoMatch?.magnitude
      ? `${apiIndoMatch.magnitude} SR`
      : hasDbMag
      ? `${dbMag} SR`
      : mainDayEq
      ? `${Number(mainDayEq.mag).toFixed(1)} SR`
      : '-'

    const kedalaman = bmkgMatch?.Kedalaman
      ? bmkgMatch.Kedalaman
      : apiIndoMatch?.depth_km || apiIndoMatch?.depth
      ? `${apiIndoMatch.depth_km || apiIndoMatch.depth} km`
      : dbDepth
      ? (String(dbDepth).includes('km') ? dbDepth : `${dbDepth} km`)
      : mainDayEq
      ? `${mainDayEq.depth} km`
      : '-'

    const potensiTsunami = bmkgMatch?.Potensi
      ? bmkgMatch.Potensi
      : apiIndoMatch?.potential
      ? apiIndoMatch.potential
      : dbTsunami
      ? dbTsunami
      : (mainMagNum >= 7.0 ? 'Berpotensi Tsunami' : '-')

    const intensitasMmi = bmkgMatch?.Dirasakan
      ? bmkgMatch.Dirasakan
      : apiIndoMatch?.felt_areas
      ? apiIndoMatch.felt_areas
      : dbMmi
      ? (dbMmi.includes('MMI') ? dbMmi : `${dbMmi} MMI`)
      : mainDayEq?.mmi
      ? `${mainDayEq.mmi} MMI`
      : '-'

    const rawMmi = intensitasMmi !== '-' ? intensitasMmi.split(',')[0].trim() : '-'
    const mmiMatch = rawMmi !== '-' ? rawMmi.match(/([I|V|X]+(\s*-\s*[I|V|X]+)?)/i) : null
    const mmiVal = mmiMatch ? `${mmiMatch[1]} MMI` : (intensitasMmi !== '-' ? intensitasMmi : '-')

    // Build 7-day timeline strictly starting from Event Date (Day 0 to Day 6)
    // Strictly NO synthetic or fake decay aftershocks: only real USGS/BMKG records
    const timeline = []

    for (let i = 0; i < 7; i++) {
      const curr = new Date(baseDate)
      curr.setDate(baseDate.getDate() + i)
      const dStr = curr.toISOString().split('T')[0]
      const isEventDay = i === 0

      const dayName = curr.toLocaleDateString('id-ID', { weekday: 'short' })
      const dateLabel = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

      if (isEventDay) {
        if (mainMagNum > 0) {
          timeline.push({
            offset: i,
            dateStr: dStr,
            dayName,
            dateLabel,
            topLabel: `M ${mainMagNum.toFixed(1)}`,
            bottomLabel: mmiVal !== '-' ? `${mmiVal} (Gempa Utama)` : 'Gempa Utama',
            magnitude: mainMagNum,
            depth: kedalaman,
            place: bmkgMatch?.Wilayah || apiIndoMatch?.region || mainDayEq?.place || `${kabParam}, ${provParam}`,
            statusType: 'mainshock',
            isPeak: true,
          })
        } else {
          timeline.push({
            offset: i,
            dateStr: dStr,
            dayName,
            dateLabel,
            topLabel: '-',
            bottomLabel: 'Tidak ada rekaman',
            magnitude: 0,
            depth: '-',
            place: '-',
            statusType: 'none',
            isPeak: false,
          })
        }
      } else if (byDate[dStr]) {
        const eq = byDate[dStr]
        const bottomLabel = eq.mag >= 4.0 ? 'Susulan' : 'Peluruhan'

        timeline.push({
          offset: i,
          dateStr: dStr,
          dayName,
          dateLabel,
          topLabel: `M ${Number(eq.mag).toFixed(1)}`,
          bottomLabel,
          magnitude: eq.mag,
          depth: `${eq.depth} km`,
          place: eq.place,
          statusType: 'aftershock',
          isPeak: false,
        })
      } else {
        // Honest representation: No earthquakes recorded on this day
        timeline.push({
          offset: i,
          dateStr: dStr,
          dayName,
          dateLabel,
          topLabel: '-',
          bottomLabel: 'Tidak ada rekaman',
          magnitude: 0,
          depth: '-',
          place: '-',
          statusType: 'none',
          isPeak: false,
        })
      }
    }

    const shakemapUrl = bmkgMatch?.Shakemap
      ? `https://data.bmkg.go.id/DataMKG/TEWS/${bmkgMatch.Shakemap}`
      : null

    const isMatched = Boolean(bmkgMatch || apiIndoMatch || mainDayEq || hasDbMag)

    return NextResponse.json({
      success: true,
      data: {
        matched: isMatched,
        characteristics: {
          magnitude,
          kedalaman,
          potensiTsunami,
          intensitasMmi,
          shakemapUrl,
          wilayah: bmkgMatch?.Wilayah || apiIndoMatch?.region || mainDayEq?.place || (hasDbMag ? `${kabParam}, ${provParam}` : '-'),
        },
        petaBencana: petaBencanaMatch ? {
          disasterType: petaBencanaMatch.disaster_type,
          city: petaBencanaMatch.tags?.city || petaBencanaMatch.title || '',
          text: petaBencanaMatch.text || '',
          imageUrl: petaBencanaMatch.image_url || '',
          distanceKm: petaBencanaMatch.distanceKm,
          status: petaBencanaMatch.status,
          reportData: petaBencanaMatch.report_data,
        } : null,
        timeline,
        earthquakeFeatures,
        sumber: bmkgMatch
          ? 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'
          : apiIndoMatch
          ? 'API Indonesia & BMKG (use.apiindonesia.id)'
          : petaBencanaMatch
          ? 'PetaBencana.id & BMKG'
          : mainDayEq
          ? 'USGS (United States Geological Survey)'
          : hasDbMag
          ? 'SIPKK EOC Official Report'
          : 'Katalog Seismik BMKG & TEWS',
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

