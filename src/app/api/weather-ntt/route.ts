import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 menit cache

interface WeatherKabupaten {
  kabupaten: string
  lat: number
  lng: number
  temp: number
  humidity: number
  windSpeed: number
  windDirection: number
  weatherCode: number
  condition: string
  iconType: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'thunderstorm'
  description: string
  warningStatus: 'Aman' | 'Waspada Hujan' | 'Waspada Angin Kencang' | 'Waspada Gelombang'
}

const NTT_LOCATIONS: { kabupaten: string; lat: number; lng: number }[] = [
  { kabupaten: 'Flores Timur', lat: -8.3421, lng: 122.9814 },
  { kabupaten: 'Sikka', lat: -8.6214, lng: 122.2155 },
  { kabupaten: 'Ende', lat: -8.8415, lng: 121.6582 },
  { kabupaten: 'Nagekeo', lat: -8.6752, lng: 121.2891 },
  { kabupaten: 'Ngada', lat: -8.7891, lng: 120.9664 },
  { kabupaten: 'Manggarai', lat: -8.6148, lng: 120.4632 },
  { kabupaten: 'Manggarai Timur', lat: -8.8033, lng: 120.5982 },
  { kabupaten: 'Manggarai Barat', lat: -8.5142, lng: 119.8924 },
  { kabupaten: 'Kota Kupang', lat: -10.1772, lng: 123.6070 },
]

function mapWmoCode(code: number): {
  condition: string
  iconType: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'thunderstorm'
  warning: 'Aman' | 'Waspada Hujan' | 'Waspada Angin Kencang' | 'Waspada Gelombang'
} {
  if (code === 0) {
    return { condition: 'Cerah', iconType: 'sunny', warning: 'Aman' }
  }
  if (code === 1 || code === 2) {
    return { condition: 'Cerah Berawan', iconType: 'partly_cloudy', warning: 'Aman' }
  }
  if (code === 3) {
    return { condition: 'Berawan Tebal', iconType: 'cloudy', warning: 'Aman' }
  }
  if (code >= 45 && code <= 48) {
    return { condition: 'Berkabut', iconType: 'cloudy', warning: 'Aman' }
  }
  if (code >= 51 && code <= 55) {
    return { condition: 'Gerimis Ringan', iconType: 'rain', warning: 'Aman' }
  }
  if (code >= 61 && code <= 65) {
    return { condition: 'Hujan Sedang', iconType: 'rain', warning: 'Waspada Hujan' }
  }
  if (code >= 80 && code <= 82) {
    return { condition: 'Hujan Lebat / Deras', iconType: 'heavy_rain', warning: 'Waspada Hujan' }
  }
  if (code >= 95 && code <= 99) {
    return { condition: 'Hujan Petir & Angin Kencang', iconType: 'thunderstorm', warning: 'Waspada Angin Kencang' }
  }
  return { condition: 'Berawan', iconType: 'partly_cloudy', warning: 'Aman' }
}

let cachedWeatherData: { timestamp: number; data: WeatherKabupaten[]; summary: any } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 menit

export async function GET() {
  const now = Date.now()
  if (cachedWeatherData && now - cachedWeatherData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      source: 'cache',
      updated_at: new Date(cachedWeatherData.timestamp).toISOString(),
      summary: cachedWeatherData.summary,
      data: cachedWeatherData.data,
    })
  }

  try {
    const lats = NTT_LOCATIONS.map((l) => l.lat.toFixed(4)).join(',')
    const lngs = NTT_LOCATIONS.map((l) => l.lng.toFixed(4)).join(',')

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia%2FMakassar`

    const res = await fetch(url, { next: { revalidate: 300 } })
    
    if (res.ok) {
      const json = await res.json()
      const results = Array.isArray(json) ? json : [json]

      const weatherList: WeatherKabupaten[] = results.map((item: any, idx: number) => {
        const loc = NTT_LOCATIONS[idx] || { kabupaten: `Wilayah ${idx + 1}`, lat: item.latitude, lng: item.longitude }
        const current = item.current || {}
        const temp = Math.round(Number(current.temperature_2m ?? 29))
        const humidity = Math.round(Number(current.relative_humidity_2m ?? 75))
        const windSpeed = Math.round(Number(current.wind_speed_10m ?? 14))
        const windDir = Math.round(Number(current.wind_direction_10m ?? 120))
        const weatherCode = Number(current.weather_code ?? 1)
        const mapped = mapWmoCode(weatherCode)

        return {
          kabupaten: loc.kabupaten,
          lat: loc.lat,
          lng: loc.lng,
          temp,
          humidity,
          windSpeed,
          windDirection: windDir,
          weatherCode,
          condition: mapped.condition,
          iconType: mapped.iconType,
          description: `${mapped.condition}, Angin ${windSpeed} km/jam`,
          warningStatus: windSpeed > 30 ? 'Waspada Angin Kencang' : mapped.warning,
        }
      })

      // Calculate summary for the province
      const avgTemp = Math.round(weatherList.reduce((s, w) => s + w.temp, 0) / weatherList.length)
      const avgHumidity = Math.round(weatherList.reduce((s, w) => s + w.humidity, 0) / weatherList.length)
      const avgWind = Math.round(weatherList.reduce((s, w) => s + w.windSpeed, 0) / weatherList.length)

      const summary = {
        provinsi: 'NUSA TENGGARA TIMUR',
        avg_temp: avgTemp,
        avg_humidity: avgHumidity,
        avg_wind_speed: avgWind,
        predominant_condition: 'Cerah Berawan',
        status_cuaca_umum: avgWind > 25 ? 'Waspada Gelombang & Angin Kencang' : 'Kondisi Cuaca Cukup Kondusif',
      }

      cachedWeatherData = {
        timestamp: now,
        data: weatherList,
        summary,
      }

      return NextResponse.json({
        success: true,
        source: 'open-meteo-live',
        updated_at: new Date(now).toISOString(),
        summary,
        data: weatherList,
      })
    }
  } catch (err) {
    console.warn('[API weather-ntt] Fetch error, returning fallback:', err)
  }

  // Return clean empty state if live weather provider is unreachable (no fake dummy data)
  return NextResponse.json({
    success: false,
    source: 'live_unavailable',
    updated_at: new Date(now).toISOString(),
    summary: null,
    data: [],
    message: 'Data cuaca stasiun BMKG / Open-Meteo sedang dalam pembaruan',
  })
}
