import { NextRequest, NextResponse } from 'next/server'

// Proxy API Karhutla -> Google Apps Script (spreadsheet DATA DASHBOARD KARHUTLA 2026).
// URL GAS hanya dari environment (tanpa default hardcoded):
//   GOOGLE_APPS_SCRIPT_KARHUTLA_URL (server)  atau  NEXT_PUBLIC_KARHUTLA_APPS_SCRIPT_URL (fallback lama)
// Gunakan URL web app ".../macros/s/<deployment-id>/exec" agar parameter type/filter bisa diteruskan.
// URL "script.googleusercontent.com/macros/echo?user_content_key=..." hanya hasil redirect satu kali
// (selalu type=all, tanpa filter) sehingga data dukung (hotspot, kualitas_udara_model) tidak bisa diambil.

// ---- Cache memori server ----
let cachedGasPayload: any = null
let cachedGasTimestamp = 0
let inFlightGasPromise: Promise<any> | null = null

const dukungCache: Record<string, { ts: number; payload: any }> = {}
let cachedFirms: { ts: number; payload: any } | null = null
let cachedProvGeo: { ts: number; index: any[] } | null = null

const GAS_STALE_TTL_MS = 60_000 // 1 menit
const DUKUNG_CACHE_TTL_MS = 5 * 60_000 // 5 menit untuk tipe data dukung dari GAS
const FIRMS_CACHE_TTL_MS = 10 * 60_000 // 10 menit untuk fallback NASA FIRMS langsung

const DATA_DUKUNG_TYPES = ['hotspot', 'hotspot_ringkasan', 'kualitas_udara_model']
const PASS_FILTERS = [
  'provinsi', 'kabupaten', 'penyakit', 'kategori', 'instansi', 'jenis', 'q', 'limit', 'offset',
  'tanggal', 'tanggal_dari', 'tanggal_sampai', 'jam', 'confidence', 'sumber',
]

function getGasUrl(): string {
  return (process.env.GOOGLE_APPS_SCRIPT_KARHUTLA_URL || process.env.NEXT_PUBLIC_KARHUTLA_APPS_SCRIPT_URL || '').trim()
}

const isExecUrl = (u: string) => /\/macros\/s\/[^/]+\/exec/.test(u)

function buildGasUrl(base: string, type: string, sp: URLSearchParams): string {
  const u = new URL(base)
  u.searchParams.set('type', type)
  PASS_FILTERS.forEach((k) => {
    const v = sp.get(k)
    if (v !== null && v !== '') u.searchParams.set(k, v)
  })
  const token = process.env.KARHUTLA_API_TOKEN
  if (token) u.searchParams.set('token', token)
  return u.toString()
}

// ---- Batas provinsi untuk fallback FIRMS (point-in-polygon, tanpa kotak koordinat manual) ----
async function loadProvinceIndex(origin: string): Promise<any[]> {
  const now = Date.now()
  if (cachedProvGeo && now - cachedProvGeo.ts < 24 * 3600_000) return cachedProvGeo.index
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const res = await fetch(`${origin}${basePath}/indonesia-provinces.geojson`, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`geojson HTTP ${res.status}`)
  const geo = await res.json()
  const index = (geo.features || []).map((f: any) => {
    const g = f.geometry || {}
    const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : []
    let minX = 999, minY = 999, maxX = -999, maxY = -999
    polys.forEach((p: any) => (p[0] || []).forEach(([x, y]: number[]) => {
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y
    }))
    const raw = String(f.properties?.Propinsi || f.properties?.PROVINSI || f.properties?.name || '')
    return { name: titleCaseProv(raw), polys, bbox: [minX, minY, maxX, maxY] }
  })
  cachedProvGeo = { ts: now, index }
  return index
}

function titleCaseProv(s: string): string {
  return s
    .toLowerCase()
    .replace(/^di\.?\s*/, 'di ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/^Di /, 'DI ')
    .replace(/^Dki /, 'DKI ')
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) inside = !inside
  }
  return inside
}

function assignProvince(index: any[], lng: number, lat: number): string | null {
  for (const p of index) {
    const [a, b, c, d] = p.bbox
    if (lng < a || lng > c || lat < b || lat > d) continue
    for (const poly of p.polys) {
      if (poly[0] && pointInRing(lng, lat, poly[0])) {
        let inHole = false
        for (let h = 1; h < poly.length; h++) if (pointInRing(lng, lat, poly[h])) { inHole = true; break }
        if (!inHole) return p.name
      }
    }
  }
  return null
}

// ---- Fallback: NASA FIRMS CSV publik 24 jam (dipakai hanya jika GAS /exec tidak tersedia) ----
async function fetchFirmsFallback(origin: string): Promise<any> {
  const now = Date.now()
  if (cachedFirms && now - cachedFirms.ts < FIRMS_CACHE_TTL_MS) return cachedFirms.payload
  const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv'
  const res = await fetch(url, { headers: { Accept: 'text/csv' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`NASA FIRMS HTTP ${res.status}`)
  const text = await res.text()
  const lines = text.trim().split('\n')
  const head = (lines[0] || '').split(',').map((h) => h.trim().toLowerCase())
  const col = (n: string) => head.indexOf(n)
  const iLat = col('latitude'), iLng = col('longitude'), iDate = col('acq_date'), iTime = col('acq_time')
  const iSat = col('satellite'), iConf = col('confidence'), iFrp = col('frp'), iDn = col('daynight')
  const index = await loadProvinceIndex(origin)
  const points: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',')
    const lat = parseFloat(c[iLat]), lng = parseFloat(c[iLng])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const conf = String(c[iConf] || '').trim().toLowerCase()
    if (conf === 'l' || conf === 'low') continue // confidence rendah dibuang (sama dengan DataDukung.gs)
    const prov = assignProvince(index, lng, lat)
    if (!prov) continue // di luar daratan Indonesia (Malaysia, Brunei, Timor Leste, PNG, laut)
    const date = c[iDate] || ''
    const t = String(c[iTime] || '').padStart(4, '0')
    const utc = new Date(`${date}T${t.slice(0, 2)}:${t.slice(2)}:00Z`)
    const wib = new Date(utc.getTime() + 7 * 3600_000)
    points.push({
      id: `${lat}|${lng}|${date}|${t}`,
      latitude: lat,
      longitude: lng,
      tanggal_wib: isNaN(wib.getTime()) ? date : wib.toISOString().slice(0, 10),
      jam_wib: isNaN(wib.getTime()) ? t : wib.toISOString().slice(11, 16),
      waktu_utc: isNaN(utc.getTime()) ? '' : utc.toISOString(),
      provinsi: prov,
      confidence: conf === 'h' || conf === 'high' ? 'tinggi' : 'sedang',
      confidence_asli: conf,
      sumber: 'VIIRS_SNPP',
      satelit: c[iSat] === 'N' ? 'Suomi NPP' : c[iSat] || 'Suomi NPP',
      frp_mw: parseFloat(c[iFrp]) || null,
      siang_malam: c[iDn] || '',
      metode_wilayah: 'poligon indonesia-provinces.geojson',
    })
  }
  points.sort((a, b) => (a.waktu_utc < b.waktu_utc ? 1 : -1))
  const payload = { points, updated_at: new Date().toISOString() }
  cachedFirms = { ts: now, payload }
  return payload
}

const FALLBACK_ATRIBUSI = [
  'NASA FIRMS (LANCE/EOSDIS) - VIIRS S-NPP 375 m NRT, file CSV publik Asia Tenggara 24 jam. https://firms.modaps.eosdis.nasa.gov',
  'Batas provinsi: Peta Dasar BAKOSURTANAL (public/indonesia-provinces.geojson)',
]

function firmsAsHotspot(fb: any, sp: URLSearchParams) {
  const prov = (sp.get('provinsi') || '').toLowerCase()
  const conf = (sp.get('confidence') || '').toLowerCase()
  const data = fb.points.filter((p: any) => (!prov || String(p.provinsi).toLowerCase().includes(prov)) && (!conf || p.confidence === conf))
  const limit = Math.min(Number(sp.get('limit')) || 500, 5000)
  const offset = Number(sp.get('offset')) || 0
  const page = data.slice(offset, offset + limit)
  const perProv: Record<string, number> = {}
  const perConf: Record<string, number> = { tinggi: 0, sedang: 0 }
  data.forEach((p: any) => { perProv[p.provinsi] = (perProv[p.provinsi] || 0) + 1; perConf[p.confidence]++ })
  return {
    success: true,
    type: 'hotspot',
    source: 'nasa_firms_public_csv_fallback',
    tersedia: true,
    updated_at: fb.updated_at,
    total: data.length,
    summary: {
      jumlah_hotspot: data.length,
      per_confidence: perConf,
      per_provinsi: Object.entries(perProv).map(([provinsi, jumlah]) => ({ provinsi, jumlah })).sort((a, b) => b.jumlah - a.jumlah),
    },
    data: page,
    pagination: { total: data.length, offset, limit, returned: page.length, has_more: offset + page.length < data.length },
    atribusi: FALLBACK_ATRIBUSI,
    catatan: ['Fallback langsung ke NASA FIRMS (hanya VIIRS S-NPP, ~24-48 jam) karena URL GAS /exec belum dikonfigurasi.'],
  }
}

function firmsAsRingkasan(fb: any, sp: URLSearchParams) {
  const prov = (sp.get('provinsi') || '').toLowerCase()
  const data = fb.points.filter((p: any) => !prov || String(p.provinsi).toLowerCase().includes(prov))
  const since24 = Date.now() - 24 * 3600_000
  const byProv: Record<string, any> = {}
  const byTgl: Record<string, any> = {}
  data.forEach((h: any) => {
    const o = (byProv[h.provinsi] = byProv[h.provinsi] || { provinsi: h.provinsi, jumlah: 0, jumlah_24jam: 0, tinggi: 0, sedang: 0, frp_total_mw: 0, frp_maks_mw: 0 })
    o.jumlah++
    if (Date.parse(h.waktu_utc) >= since24) o.jumlah_24jam++
    if (h.confidence === 'tinggi') o.tinggi++; else o.sedang++
    const fr = Number(h.frp_mw) || 0
    o.frp_total_mw = Math.round((o.frp_total_mw + fr) * 10) / 10
    if (fr > o.frp_maks_mw) o.frp_maks_mw = fr
    const t = (byTgl[h.tanggal_wib] = byTgl[h.tanggal_wib] || { tanggal_wib: h.tanggal_wib, jumlah: 0, per_provinsi: {} })
    t.jumlah++
    t.per_provinsi[h.provinsi] = (t.per_provinsi[h.provinsi] || 0) + 1
  })
  const provArr = Object.values(byProv).sort((a: any, b: any) => b.jumlah - a.jumlah)
  return {
    success: true,
    type: 'hotspot_ringkasan',
    source: 'nasa_firms_public_csv_fallback',
    tersedia: true,
    updated_at: fb.updated_at,
    total: provArr.length,
    kartu: {
      hotspot_total: data.length,
      hotspot_24jam: provArr.reduce((s: number, o: any) => s + o.jumlah_24jam, 0),
      hotspot_tinggi: provArr.reduce((s: number, o: any) => s + o.tinggi, 0),
      jumlah_provinsi: provArr.length,
      provinsi_teratas: provArr.length ? { provinsi: (provArr[0] as any).provinsi, jumlah: (provArr[0] as any).jumlah } : null,
    },
    by_provinsi: provArr,
    by_tanggal: Object.keys(byTgl).sort().reverse().map((k) => byTgl[k]),
    data: provArr,
    atribusi: FALLBACK_ATRIBUSI,
    catatan: ['Fallback langsung ke NASA FIRMS (hanya VIIRS S-NPP) karena URL GAS /exec belum dikonfigurasi.'],
  }
}

async function fetchGasDukung(type: string, sp: URLSearchParams, noCache: boolean): Promise<any | null> {
  const base = getGasUrl()
  if (!base || !isExecUrl(base)) return null
  const url = buildGasUrl(base, type, sp)
  const key = url
  const now = Date.now()
  if (!noCache && dukungCache[key] && now - dukungCache[key].ts < DUKUNG_CACHE_TTL_MS) return dukungCache[key].payload
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, redirect: 'follow', cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    if (json && json.success && json.tersedia !== false) {
      dukungCache[key] = { ts: now, payload: json }
      return json
    }
  } catch (err) {
    console.warn(`[api/karhutla-data] Gagal fetch GAS type=${type}:`, err)
  }
  return null
}

async function triggerBackgroundGasRefresh(bypassCache = false): Promise<any> {
  if (inFlightGasPromise) return inFlightGasPromise

  inFlightGasPromise = (async () => {
    try {
      const base = getGasUrl()
      if (!base) return null
      const url = isExecUrl(base) ? buildGasUrl(base, 'all', new URLSearchParams()) : base

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

    if (!getGasUrl()) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_APPS_SCRIPT_KARHUTLA_URL belum dikonfigurasi di environment.' },
        { status: 503 }
      )
    }

    // ---- 1. Data dukung: hotspot, hotspot_ringkasan, kualitas_udara_model ----
    const normType = type === 'hotspots' || type === 'hotspot_firms' ? 'hotspot' : type
    if (DATA_DUKUNG_TYPES.includes(normType)) {
      const gas = await fetchGasDukung(normType, searchParams, noCache)
      if (gas) return NextResponse.json(gas, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } })

      if (normType === 'kualitas_udara_model') {
        return NextResponse.json(
          {
            success: false,
            type: normType,
            tersedia: false,
            error: isExecUrl(getGasUrl())
              ? 'Tab KUALITAS_UDARA_MODEL belum terisi di GAS (jalankan runAllFetchers/setupTriggers).'
              : 'Butuh URL GAS web app (/exec) di GOOGLE_APPS_SCRIPT_KARHUTLA_URL untuk tipe ini.',
          },
          { status: 200 }
        )
      }
      try {
        const fb = await fetchFirmsFallback(req.nextUrl.origin)
        const payload = normType === 'hotspot' ? firmsAsHotspot(fb, searchParams) : firmsAsRingkasan(fb, searchParams)
        return NextResponse.json(payload, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
      } catch (e: any) {
        return NextResponse.json({ success: false, type: normType, tersedia: false, error: `Fallback NASA FIRMS gagal: ${e?.message || e}` }, { status: 200 })
      }
    }

    // ---- 2. Tipe spreadsheet lain via /exec (ringkasan, ispa, ispu, dst.) ----
    if (type !== 'all' && isExecUrl(getGasUrl())) {
      try {
        const res = await fetch(buildGasUrl(getGasUrl(), type, searchParams), { headers: { Accept: 'application/json' }, redirect: 'follow', cache: 'no-store' })
        const json = await res.json()
        return NextResponse.json(json, { status: res.ok ? 200 : res.status })
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Gagal fetch GAS' }, { status: 502 })
      }
    }

    // ---- 3. Payload utama (type=all) ----
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

    let responseData: any = { ...rawData }

    // ---- 4. Filter provinsi (jika diminta) ----
    if (filterProvinsi && filterProvinsi !== 'semua' && filterProvinsi !== 'all') {
      const matchProv = (provName?: string) => (provName ? provName.toLowerCase().includes(filterProvinsi) : false)
      const f = (arr: any) => (Array.isArray(arr) ? arr.filter((d: any) => matchProv(d.provinsi)) : [])

      responseData = {
        ...responseData,
        filter_active: filterProvinsi,
        penduduk_terdampak: { ...rawData.penduduk_terdampak, data: f(rawData.penduduk_terdampak?.data), by_provinsi: f(rawData.penduduk_terdampak?.by_provinsi) },
        ispa: { ...rawData.ispa, data: f(rawData.ispa?.data) },
        penyakit_lainnya: { ...rawData.penyakit_lainnya, data: f(rawData.penyakit_lainnya?.data), by_provinsi: f(rawData.penyakit_lainnya?.by_provinsi) },
        ispu: { ...rawData.ispu, data: f(rawData.ispu?.data), by_provinsi: f(rawData.ispu?.by_provinsi) },
        logistik: {
          dinkes: { ...rawData.logistik?.dinkes, data: f(rawData.logistik?.dinkes?.data) },
          puskris: { ...rawData.logistik?.puskris, data: f(rawData.logistik?.puskris?.data) },
        },
        sdmk: { ...rawData.sdmk, data: f(rawData.sdmk?.data) },
        upaya: {
          ...rawData.upaya,
          data: (rawData.upaya?.data || []).filter((d: any) => matchProv(d.wilayah) || d.wilayah?.toLowerCase() === 'nasional'),
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
