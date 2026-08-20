import { NextResponse } from 'next/server'

/**
 * API Route: /api/bencana-flood
 * 
 * Comprehensive Environmental & Disaster Hydrology/Atmospheric/Marine API:
 * 1. Open-Meteo Flood API (GloFAS) → River Discharge (m³/s)
 * 2. Open-Meteo Soil Moisture → Soil Saturation (%)
 * 3. Open-Meteo Marine API → Sea Wave Height (m), Period (s), Direction (°)
 * 4. Open-Meteo Air Quality API → ISPU / US AQI, PM2.5, PM10, SO2 (Volcanic), CO (Fire), Dust, UV
 * 5. Open-Meteo Weather API → Temperature, Humidity (%), Pressure (hPa), Wind Speed & Gusts (km/h), ET0 Evapotranspiration
 * 6. PetaBencana.id → Crowd-sourced flood depth
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

    const isPast = (Date.now() - baseDate.getTime()) > 1000 * 60 * 60 * 24 * 14

    // ── 1. Open-Meteo Flood API (GloFAS River Discharge) ──
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
        }
      } catch {
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
        const fieldCapacity = 0.40
        const saturationPercent = Math.min(100, Math.round((currentAvg / fieldCapacity) * 100))

        return {
          current: Math.round(currentAvg * 1000) / 1000,
          peak: Math.round(peakVal * 1000) / 1000,
          saturationPercent,
          unit: 'm³/m³',
        }
      } catch {
        return null
      }
    }

    // ── 3. Open-Meteo Marine API (Waves / Tsunami / Rob / Coastal) ──
    const fetchMarine = async () => {
      try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_direction_dominant,wave_period_max&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        if (!json?.daily?.time || !json?.daily?.wave_height_max) return null

        const times: string[] = json.daily.time
        const waves: number[] = json.daily.wave_height_max || []
        const dirs: number[] = json.daily.wave_direction_dominant || []
        const periods: number[] = json.daily.wave_period_max || []

        const eventIdx = times.indexOf(eventDateStr)
        const currentWave = eventIdx >= 0 ? (waves[eventIdx] || 0) : (waves[0] || 0)
        const currentDir = eventIdx >= 0 ? (dirs[eventIdx] || 0) : (dirs[0] || 0)
        const currentPeriod = eventIdx >= 0 ? (periods[eventIdx] || 0) : (periods[0] || 0)

        const directions = [
          'Utara', 'Utara - Timur Laut', 'Timur Laut', 'Timur - Timur Laut',
          'Timur', 'Timur - Tenggara', 'Tenggara', 'Selatan - Tenggara',
          'Selatan', 'Selatan - Barat Daya', 'Barat Daya', 'Barat - Barat Daya',
          'Barat', 'Barat - Barat Laut', 'Barat Laut', 'Utara - Barat Laut'
        ]
        const dirText = directions[Math.round((currentDir % 360) / 22.5) % 16] || '-'

        return {
          waveHeight: Math.round(currentWave * 100) / 100,
          waveDirection: currentDir,
          waveDirectionText: dirText,
          wavePeriod: Math.round(currentPeriod * 10) / 10,
          unit: 'm',
        }
      } catch {
        return null
      }
    }

    // ── 4. Open-Meteo Air Quality (ISPU, PM2.5, PM10, SO2, CO, Dust, UV) ──
    const fetchAirQuality = async () => {
      try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 1800 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        const c = json?.current
        if (!c) return null

        const aqi = Math.round(c.us_aqi || 0)
        let aqiLabel = 'Baik'
        if (aqi > 300) aqiLabel = 'Berbahaya'
        else if (aqi > 200) aqiLabel = 'Sangat Tidak Sehat'
        else if (aqi > 150) aqiLabel = 'Tidak Sehat'
        else if (aqi > 100) aqiLabel = 'Sensitif'
        else if (aqi > 50) aqiLabel = 'Sedang'

        return {
          aqi,
          aqiLabel,
          pm25: Math.round((c.pm2_5 || 0) * 10) / 10,
          pm10: Math.round((c.pm10 || 0) * 10) / 10,
          so2: Math.round((c.sulphur_dioxide || 0) * 10) / 10,
          co: Math.round((c.carbon_monoxide || 0) * 10) / 10,
          dust: Math.round((c.dust || 0) * 10) / 10,
          uvIndex: Math.round((c.uv_index || 0) * 10) / 10,
        }
      } catch {
        return null
      }
    }

    // ── 5. Open-Meteo Comprehensive Weather (Temp, Humidity, Pressure, Wind, Gusts, ET0) ──
    const fetchWeatherComp = async () => {
      try {
        const apiDomain = isPast ? 'archive-api.open-meteo.com' : 'api.open-meteo.com'
        const apiPath = isPast ? 'archive' : 'forecast'
        const url = `https://${apiDomain}/v1/${apiPath}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&start_date=${startStr}&end_date=${endStr}&timezone=Asia/Jakarta`
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'SIPKK-EOC/1.0' },
        })
        if (!res.ok) return null
        const json = await res.json()
        const c = json?.current || {}
        const d = json?.daily || {}

        const times: string[] = d.time || []
        const precip: number[] = d.precipitation_sum || []
        const tMax: number[] = d.temperature_2m_max || []
        const tMin: number[] = d.temperature_2m_min || []
        const et0List: number[] = d.et0_fao_evapotranspiration || []
        const windMax: number[] = d.wind_speed_10m_max || []
        const gustsMax: number[] = d.wind_gusts_10m_max || []

        const eventIdx = times.indexOf(eventDateStr)
        const eventPrecip = eventIdx >= 0 ? (precip[eventIdx] || 0) : (c.precipitation || 0)
        const totalPrecip = precip.reduce((a: number, b: number) => a + (b || 0), 0)
        const peakPrecip = Math.max(...precip.filter((v: number) => v != null), 0)
        const eventTMax = eventIdx >= 0 ? (tMax[eventIdx] || c.temperature_2m || 0) : (c.temperature_2m || 0)
        const eventEt0 = eventIdx >= 0 ? (et0List[eventIdx] || 0) : (et0List[0] || 0)
        const eventWindMax = eventIdx >= 0 ? (windMax[eventIdx] || c.wind_speed_10m || 0) : (c.wind_speed_10m || 0)
        const eventGustMax = eventIdx >= 0 ? (gustsMax[eventIdx] || c.wind_gusts_10m || 0) : (c.wind_gusts_10m || 0)

        const directions = [
          'Utara', 'Utara - Timur Laut', 'Timur Laut', 'Timur - Timur Laut',
          'Timur', 'Timur - Tenggara', 'Tenggara', 'Selatan - Tenggara',
          'Selatan', 'Selatan - Barat Daya', 'Barat Daya', 'Barat - Barat Daya',
          'Barat', 'Barat - Barat Laut', 'Barat Laut', 'Utara - Barat Laut'
        ]
        const windDeg = c.wind_direction_10m || 0
        const windDirText = directions[Math.round((windDeg % 360) / 22.5) % 16] || '-'

        // Calculate Fire Weather Index Proxy (Indeks Kerentanan Karhutla 0-100)
        // High temp (>32) + low humidity (<60) + high wind (>15) + low rain (<1) = High FWI
        const tempScore = Math.min(35, Math.max(0, (eventTMax - 22) * 2.5))
        const rhVal = c.relative_humidity_2m || 75
        const rhScore = Math.min(35, Math.max(0, (85 - rhVal) * 1.0))
        const windScore = Math.min(20, (eventGustMax / 40) * 20)
        const rainDeduction = Math.min(40, totalPrecip * 3)
        const fwiScore = Math.min(100, Math.max(5, Math.round(tempScore + rhScore + windScore - rainDeduction + 15)))

        let fwiCategory = 'Rendah'
        if (fwiScore >= 80) fwiCategory = 'Ekstrem'
        else if (fwiScore >= 60) fwiCategory = 'Tinggi'
        else if (fwiScore >= 40) fwiCategory = 'Sedang'

        return {
          currentTemp: Math.round((c.temperature_2m || 0) * 10) / 10,
          maxTemp: Math.round(eventTMax * 10) / 10,
          humidity: Math.round(c.relative_humidity_2m || 0),
          pressure: Math.round((c.surface_pressure || 1012) * 10) / 10,
          windSpeed: Math.round((c.wind_speed_10m || eventWindMax) * 10) / 10,
          windGust: Math.round((c.wind_gusts_10m || eventGustMax) * 10) / 10,
          windDirectionDeg: windDeg,
          windDirectionText: windDirText,
          precipitationEvent: Math.round(eventPrecip * 10) / 10,
          precipitationTotal7d: Math.round(totalPrecip * 10) / 10,
          precipitationPeak: Math.round(peakPrecip * 10) / 10,
          evapotranspiration: Math.round(eventEt0 * 100) / 100,
          weatherCode: c.weather_code || 0,
          fireWeatherIndex: fwiScore,
          fireWeatherCategory: fwiCategory,
        }
      } catch {
        return null
      }
    }

    // ── 6. PetaBencana.id Flood Reports ──
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
      } catch {
        return null
      }
    }

    // Parallel fetch
    const [riverDischarge, soilMoisture, marine, airQuality, weatherComp, petaBencana] = await Promise.all([
      fetchRiverDischarge(),
      fetchSoilMoisture(),
      fetchMarine(),
      fetchAirQuality(),
      fetchWeatherComp(),
      fetchPetaBencana(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        riverDischarge,
        soilMoisture,
        marine,
        airQuality,
        weather: weatherComp,
        petaBencana,
        sumber: 'Open-Meteo (GloFAS, Marine, Air Quality, ECMWF Weather) & PetaBencana',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
