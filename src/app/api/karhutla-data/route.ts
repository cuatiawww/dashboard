import { NextRequest, NextResponse } from 'next/server'

// ─── Cache Memory Server-Side untuk Payload Utama & Data Dukung ──────────────
let cachedGasPayload: any = null
let cachedGasTimestamp = 0
let inFlightGasPromise: Promise<any> | null = null

let cachedHotspots: any = null
let cachedHotspotsTimestamp = 0

const GAS_STALE_TTL_MS = 60_000 // 1 menit
const HOTSPOT_CACHE_TTL_MS = 10 * 60_000 // 10 menit untuk NASA FIRMS

const DEFAULT_KARHUTLA_APPS_SCRIPT_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQrgPfjNZ5BJQrOyPF-Fa6fcB7OLacj-nIw9idFSda1lGM_XvSxd0lWB0KHbnaS7GfDlcMsAIIaprkcie0M6vJfQv20eFa8pd_Vom8kaLFW0D-PizFkQCRsIwthJGK3xSqG3FPgFuZOsd3T2AVH8FFVicipzxaPupH-scv8VDt4r6HE6bdRy2MjQNePSvlidTGssQ1GTrqK5lPKPB97yRNSdRcv6yO0A0coiTNRWwyMhDWQux-mIygk8bsaoQFGs-wB34qCKJK1NeuYoeBfARP5oUAsjQ&lib=MJDqNJ7KZb-xY-mdADesuGqUP6vH7slX0'

function getGasUrl(): string {
  return (
    process.env.GOOGLE_APPS_SCRIPT_KARHUTLA_URL ||
    process.env.NEXT_PUBLIC_KARHUTLA_APPS_SCRIPT_URL ||
    DEFAULT_KARHUTLA_APPS_SCRIPT_URL
  )
}

// ─── Direct Fallback Fetcher: NASA FIRMS 24h Public Active Fire CSV ─────────
async function fetchNasaFirmsHotspots(targetProvinsi?: string | null): Promise<any> {
  const now = Date.now()
  if (cachedHotspots && now - cachedHotspotsTimestamp < HOTSPOT_CACHE_TTL_MS) {
    return filterHotspotsByProv(cachedHotspots, targetProvinsi)
  }

  try {
    const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv'
    const res = await fetch(url, { headers: { Accept: 'text/csv' }, cache: 'no-store' })
    if (!res.ok) throw new Error(`NASA FIRMS HTTP ${res.status}`)

    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length <= 1) return { total: 0, points: [], ringkasan: {} }

    const points: any[] = []
    const ringkasanProv: Record<string, number> = {
      'Kalimantan Tengah': 0,
      'Sumatera Selatan': 0,
      'Kalimantan Barat': 0,
      'Kalimantan Selatan': 0,
      'Kalimantan Timur': 0,
      'Riau': 0,
      'Jambi': 0,
      'Lainnya': 0,
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      const lat = parseFloat(cols[0])
      const lng = parseFloat(cols[1])

      // Bounding box Indonesia: lat -11 s.d 6, lng 95 s.d 141
      if (lat >= -11.0 && lat <= 6.0 && lng >= 95.0 && lng <= 141.0) {
        let prov = 'Lainnya'

        // Klasifikasi spasial kasar 7 Provinsi Prioritas Karhutla
        if (lat >= -3.5 && lat <= 0.5 && lng >= 111.0 && lng <= 116.0) prov = 'Kalimantan Tengah'
        else if (lat >= -5.0 && lat <= -1.5 && lng >= 102.0 && lng <= 106.5) prov = 'Sumatera Selatan'
        else if (lat >= -3.0 && lat <= 2.2 && lng >= 108.5 && lng <= 111.5) prov = 'Kalimantan Barat'
        else if (lat >= -4.2 && lat <= -1.2 && lng >= 114.2 && lng <= 116.5) prov = 'Kalimantan Selatan'
        else if (lat >= -2.5 && lat <= 2.5 && lng >= 115.5 && lng <= 119.2) prov = 'Kalimantan Timur'
        else if (lat >= -1.0 && lat <= 2.8 && lng >= 100.0 && lng <= 104.2) prov = 'Riau'
        else if (lat >= -2.8 && lat <= -0.7 && lng >= 101.1 && lng <= 104.6) prov = 'Jambi'

        ringkasanProv[prov] = (ringkasanProv[prov] || 0) + 1

        points.push({
          lat,
          lng,
          brightness: parseFloat(cols[2]) || 0,
          acq_date: cols[5],
          acq_time: cols[6],
          satellite: cols[7] || 'VIIRS_SNPP',
          confidence: cols[8] || 'nominal',
          frp: parseFloat(cols[11]) || 0,
          provinsi: prov,
        })
      }
    }

    const payload = {
      success: true,
      source: 'nasa_firms_viirs_24h_live',
      updated_at: new Date().toISOString(),
      total_indonesia: points.length,
      ringkasan: ringkasanProv,
      data: points.slice(0, 1000), // Batasi 1000 titik teratas untuk payload optimal
    }

    cachedHotspots = payload
    cachedHotspotsTimestamp = now

    return filterHotspotsByProv(payload, targetProvinsi)
  } catch (err: any) {
    console.warn('[fetchNasaFirmsHotspots] Error:', err.message)
    return {
      success: false,
      source: 'fallback_error',
      total_indonesia: 0,
      ringkasan: {},
      data: [],
    }
  }
}

function filterHotspotsByProv(payload: any, targetProv?: string | null) {
  if (!targetProv || targetProv === 'semua' || targetProv === 'all') return payload
  const provClean = targetProv.toLowerCase()
  const filteredData = (payload.data || []).filter((p: any) =>
    p.provinsi ? p.provinsi.toLowerCase().includes(provClean) : false
  )
  return {
    ...payload,
    filter_active: targetProv,
    data: filteredData,
  }
}

async function triggerBackgroundGasRefresh(bypassCache = false): Promise<any> {
  if (inFlightGasPromise) return inFlightGasPromise

  inFlightGasPromise = (async () => {
    try {
      const url = getGasUrl()
      if (!url) return null

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        redirect: 'follow',
        cache: bypassCache ? 'no-store' : 'default',
      })

      if (res.ok) {
        const fetched = await res.json()
        if (fetched && fetched.success) {
          cachedGasPayload = fetched
          cachedGasTimestamp = Date.now()
          return fetched
        }
      }
    } catch (err) {
      console.warn('[api/karhutla-data] Gagal fetch dari Google Apps Script:', err)
    } finally {
      inFlightGasPromise = null
    }
    return null
  })()

  return inFlightGasPromise
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')?.trim().toLowerCase() || 'all'
    const noCache = searchParams.get('nocache') === 'true' || searchParams.get('refresh') === 'true'
    const filterProvinsi = searchParams.get('provinsi')?.trim().toLowerCase() || null

    // ─── 1. Endpoint Khusus Data Dukung: NASA FIRMS Hotspots ──────────────────
    if (type === 'hotspot' || type === 'hotspots') {
      // Coba fetch ke GAS jika URL aktif berakhiran /exec
      const gasUrl = getGasUrl()
      if (gasUrl.includes('/exec')) {
        try {
          const gasRes = await fetch(`${gasUrl}${gasUrl.includes('?') ? '&' : '?'}type=hotspot`, {
            cache: 'no-store',
          })
          if (gasRes.ok) {
            const gasJson = await gasRes.json()
            if (gasJson && gasJson.success && Array.isArray(gasJson.data) && gasJson.data.length > 0) {
              return NextResponse.json(gasJson)
            }
          }
        } catch (e) {
          // fallback ke direct NASA FIRMS
        }
      }
      // Direct Fallback Engine
      const liveHotspots = await fetchNasaFirmsHotspots(filterProvinsi)
      return NextResponse.json(liveHotspots)
    }

    if (type === 'hotspot_ringkasan') {
      const liveHotspots = await fetchNasaFirmsHotspots(filterProvinsi)
      return NextResponse.json({
        success: true,
        source: 'nasa_firms_viirs_ringkasan',
        updated_at: liveHotspots.updated_at,
        total_nasional: liveHotspots.total_indonesia,
        ringkasan_per_provinsi: liveHotspots.ringkasan,
      })
    }

    // ─── 2. Fetch Default Data Spreadsheet (8 Sheet Utama) ───────────────────
    const now = Date.now()
    const cacheAge = now - cachedGasTimestamp
    const hasCache = cachedGasPayload !== null

    let rawData: any = null

    if (noCache) {
      rawData = await triggerBackgroundGasRefresh(true)
      if (!rawData && hasCache) {
        rawData = cachedGasPayload
      }
    } else if (hasCache) {
      rawData = cachedGasPayload
      if (cacheAge > GAS_STALE_TTL_MS) {
        triggerBackgroundGasRefresh()
      }
    } else {
      rawData = await triggerBackgroundGasRefresh()
    }

    if (!rawData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal memuat data dari endpoint Google Apps Script Karhutla.',
        },
        { status: 502 }
      )
    }

    // Ambil data dukung NASA FIRMS secara paralel untuk melengkapi ringkasan
    let firmsData = null
    try {
      firmsData = await fetchNasaFirmsHotspots(filterProvinsi)
    } catch {
      // ignore
    }

    let responseData = {
      ...rawData,
      data_dukung: {
        nasa_firms: firmsData
          ? {
              total_nasional: firmsData.total_indonesia,
              ringkasan: firmsData.ringkasan,
              sample_titik: (firmsData.data || []).slice(0, 100),
            }
          : null,
      },
    }

    // ─── 3. Filter Provinsi (jika diminta) ────────────────────────────────────
    if (filterProvinsi && filterProvinsi !== 'semua' && filterProvinsi !== 'all') {
      const matchProv = (provName?: string) =>
        provName ? provName.toLowerCase().includes(filterProvinsi) : false

      const filteredPenduduk = (rawData.penduduk_terdampak?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredIspa = (rawData.ispa?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredPenyakit = (rawData.penyakit_lainnya?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredIspu = (rawData.ispu?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredLogDinkes = (rawData.logistik?.dinkes?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredLogPuskris = (rawData.logistik?.puskris?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredSdmk = (rawData.sdmk?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredUpaya = (rawData.upaya?.data || []).filter(
        (d: any) => matchProv(d.wilayah) || d.wilayah?.toLowerCase() === 'nasional'
      )

      responseData = {
        ...responseData,
        filter_active: filterProvinsi,
        penduduk_terdampak: {
          ...rawData.penduduk_terdampak,
          data: filteredPenduduk,
        },
        ispa: {
          ...rawData.ispa,
          data: filteredIspa,
        },
        penyakit_lainnya: {
          ...rawData.penyakit_lainnya,
          data: filteredPenyakit,
        },
        ispu: {
          ...rawData.ispu,
          data: filteredIspu,
        },
        logistik: {
          dinkes: {
            ...rawData.logistik?.dinkes,
            data: filteredLogDinkes,
          },
          puskris: {
            ...rawData.logistik?.puskris,
            data: filteredLogPuskris,
          },
        },
        sdmk: {
          ...rawData.sdmk,
          data: filteredSdmk,
        },
        upaya: {
          ...rawData.upaya,
          data: filteredUpaya,
        },
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('[api/karhutla-data] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
