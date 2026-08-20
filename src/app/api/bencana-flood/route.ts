import { NextResponse } from 'next/server'

/**
 * API Route: /api/bencana-flood
 * 
 * Combines real-time hydrology data from multiple open APIs:
 * 1. Open-Meteo Flood API (GloFAS) → River Discharge (debit sungai) as TMA replacement
 * 2. Open-Meteo Soil Moisture → Real soil saturation data
 * 3. Open-Meteo Weather (enhanced) → Hourly rainfall for precise peak detection
 * 4. PetaBencana.id → Crowd-sourced flood depth reports
 * 
 * All APIs are free, no API key required, and return real measured/modeled data.
 */

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const dateParam = searchParams.get('date') // YYYY-MM-DD

  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return NextResponse.json({ success: false, message: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const baseDate = dateParam ? new Date(dateParam) : new Date()
    if (isNaN(baseDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid date' }, { status: 400 })
    }

    const startObj = new Date(baseDate)
    startObj.setDate(baseDate.getDate() - 7)
    const endObj = new Date(baseDate)
    endObj.setDate(baseDate.getDate() + 3)

    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const startStr = fmt(startObj)
    const endStr = fmt(endObj)
    const eventDateStr = fmt(baseDate)

    // Determine if event is in the past (>14 days ago) for archive API
    const isPast = (Date.now() - baseDate.getTime()) > 1000 * 60 * 60 * 24 * 14

    // ── 1. Open-Meteo Flood API (GloFAS River Discharge Model) ──
    const fetchRiverDischarge = async () => {
      try {
        const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&past_days=7&forecast_days=3&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        if (!json?.daily?.time || !json?.daily?.river_discharge) return null

        const times: string[] = json.daily.time
        const values: number[] = json.daily.river_discharge

        // Find event day index
        const eventIdx = times.indexOf(eventDateStr)
        const currentVal = eventIdx >= 0 ? (values[eventIdx] || 0) : (values[values.length - 1] || 0)
        const peakVal = Math.max(...values.filter((v: number) => v != null && !isNaN(v)), 0)
        const validValues = values.filter((v: number) => v != null && !isNaN(v) && v > 0)
        const avgVal = validValues.length > 0 ? validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length : 0

        const timeline = times.map((t: string, i: number) => ({
          date: t,
          discharge: values[i] ?? 0,
          isEventDay: t === eventDateStr,
        }))

        return {
          current: Math.round(currentVal * 100) / 100,
          peak: Math.round(peakVal * 100) / 100,
          average: Math.round(avgVal * 100) / 100,
          unit: 'm³/s',
          timeline,
          latitude: json.latitude,
          longitude: json.longitude,
        }
      } catch (err) {
        console.error('[Flood API] River discharge fetch failed:', err)
        return null
      }
    }

    // ── 2. Open-Meteo Soil Moisture ──
    const fetchSoilMoisture = async () => {
      try {
        const apiDomain = isPast ? 'archive-api.open-meteo.com' : 'api.open-meteo.com'
        const apiPath = isPast ? 'archive' : 'forecast'
        const url = `https://${apiDomain}/v1/${apiPath}?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm&start_date=${startStr}&end_date=${endStr}&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        if (!json?.hourly?.time || !json?.hourly?.soil_moisture_0_to_1cm) return null

        const times: string[] = json.hourly.time
        const sm0: number[] = json.hourly.soil_moisture_0_to_1cm
        const sm1: number[] = json.hourly.soil_moisture_1_to_3cm || []
        const sm3: number[] = json.hourly.soil_moisture_3_to_9cm || []

        // Find event day hourly values (match date prefix)
        const eventDayValues: number[] = []
        const allValues: number[] = []

        times.forEach((t: string, i: number) => {
          const avgLayers = [sm0[i], sm1[i], sm3[i]].filter((v) => v != null && !isNaN(v))
          const avgVal = avgLayers.length > 0 ? avgLayers.reduce((a, b) => a + b, 0) / avgLayers.length : 0
          if (avgVal > 0) allValues.push(avgVal)
          if (t.startsWith(eventDateStr) && avgVal > 0) {
            eventDayValues.push(avgVal)
          }
        })

        const currentAvg = eventDayValues.length > 0
          ? eventDayValues.reduce((a, b) => a + b, 0) / eventDayValues.length
          : (allValues.length > 0 ? allValues[allValues.length - 1] : 0)
        const peakVal = Math.max(...allValues, 0)

        // Soil moisture in m³/m³: typical range 0.05 (very dry) to 0.50 (saturated)
        // Convert to % saturation (approximate: assuming field capacity ~0.40 m³/m³)
        const fieldCapacity = 0.40
        const saturationPercent = Math.min(100, Math.round((currentAvg / fieldCapacity) * 100))

        return {
          current: Math.round(currentAvg * 1000) / 1000,
          peak: Math.round(peakVal * 1000) / 1000,
          saturationPercent,
          unit: 'm³/m³',
        }
      } catch (err) {
        console.error('[Flood API] Soil moisture fetch failed:', err)
        return null
      }
    }

    // ── 3. Open-Meteo Enhanced Rainfall (hourly for peak detection) ──
    const fetchEnhancedRainfall = async () => {
      try {
        const apiDomain = isPast ? 'archive-api.open-meteo.com' : 'api.open-meteo.com'
        const apiPath = isPast ? 'archive' : 'forecast'
        const url = `https://${apiDomain}/v1/${apiPath}?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,rain_sum,weathercode,temperature_2m_max,temperature_2m_min&start_date=${startStr}&end_date=${endStr}&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        if (!json?.daily?.time) return null

        const times: string[] = json.daily.time
        const precip: number[] = json.daily.precipitation_sum || []
        const rain: number[] = json.daily.rain_sum || []
        const codes: number[] = json.daily.weathercode || []
        const tMax: number[] = json.daily.temperature_2m_max || []
        const tMin: number[] = json.daily.temperature_2m_min || []

        const eventIdx = times.indexOf(eventDateStr)
        const eventDayPrecip = eventIdx >= 0 ? (precip[eventIdx] || 0) : 0
        const totalPrecip = precip.reduce((a: number, b: number) => a + (b || 0), 0)
        const peakPrecip = Math.max(...precip.filter((v: number) => v != null), 0)

        const timeline = times.map((t: string, i: number) => ({
          date: t,
          precipitation: Math.round((precip[i] || 0) * 10) / 10,
          rain: Math.round((rain[i] || 0) * 10) / 10,
          weathercode: codes[i] || 0,
          tempMax: Math.round((tMax[i] || 0) * 10) / 10,
          tempMin: Math.round((tMin[i] || 0) * 10) / 10,
          isEventDay: t === eventDateStr,
        }))

        return {
          eventDay: Math.round(eventDayPrecip * 10) / 10,
          total: Math.round(totalPrecip * 10) / 10,
          peak: Math.round(peakPrecip * 10) / 10,
          timeline,
        }
      } catch (err) {
        console.error('[Flood API] Enhanced rainfall fetch failed:', err)
        return null
      }
    }

    // ── 4. PetaBencana.id Flood Reports ──
    const fetchPetaBencana = async () => {
      try {
        const pbStart = fmt(startObj)
        const pbEnd = fmt(endObj)
        const url = `https://data.petabencana.id/reports/archive?start=${pbStart}T00:00:00Z&end=${pbEnd}T23:59:59Z`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return null
        const json = await res.json()
        const geometries = json?.result?.objects?.output?.geometries || []

        // Find nearest flood report
        for (const geom of geometries) {
          const coords = geom.coordinates || []
          if (coords.length >= 2) {
            const dist = haversineDist(lat, lng, coords[1], coords[0])
            if (dist <= 100) {
              const props = geom.properties || {}
              return {
                floodDepth: props.report_data?.flood_depth || null,
                city: props.tags?.city || props.title || '',
                text: props.text || '',
                imageUrl: props.image_url || '',
                distanceKm: Math.round(dist),
                status: props.status,
                disasterType: props.disaster_type,
              }
            }
          }
        }
        return null
      } catch (err) {
        console.error('[Flood API] PetaBencana fetch failed:', err)
        return null
      }
    }

    // Execute all fetches in parallel
    const [riverDischarge, soilMoisture, rainfall, petaBencana] = await Promise.all([
      fetchRiverDischarge(),
      fetchSoilMoisture(),
      fetchEnhancedRainfall(),
      fetchPetaBencana(),
    ])

    // Build source attribution
    const sources: string[] = []
    if (riverDischarge) sources.push('GloFAS/Open-Meteo (Debit Sungai)')
    if (soilMoisture) sources.push('Open-Meteo (Kelembaban Tanah)')
    if (rainfall) sources.push('Open-Meteo (Curah Hujan)')
    if (petaBencana) sources.push('PetaBencana.id')

    return NextResponse.json({
      success: true,
      data: {
        riverDischarge,
        soilMoisture,
        rainfall,
        petaBencana,
        sumber: sources.length > 0 ? sources.join(' + ') : 'Tidak ada data tersedia',
      },
    })
  } catch (error: any) {
    console.error('[Bencana Flood API Error]:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
