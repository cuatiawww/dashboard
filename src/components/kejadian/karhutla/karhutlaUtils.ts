// Utilitas bersama dashboard Karhutla Indonesia (data dari API GAS karhutla via /api/karhutla-data).
// Semua angka di dashboard diambil dari API; file ini hanya berisi formatter, legenda resmi, dan normalisasi nama wilayah.

export const fmtNum = (v: any, digits = 0): string => {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return '-'
  return n.toLocaleString('id-ID', { maximumFractionDigits: digits })
}

export const toNum = (v: any): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export const titleCase = (s: any): string =>
  String(s || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())

// Normalisasi nama wilayah untuk pencocokan (huruf besar, tanpa tanda baca, tanpa prefiks administratif)
export const normName = (s: any): string =>
  String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(PROVINSI|PROV|KABUPATEN|KAB|KOTA|ADM|ADMINISTRASI)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Alias nama provinsi API (34/38 provinsi) -> nama poligon di public/indonesia-provinces.geojson
// (BAKOSURTANAL lama, 32 provinsi). Pemetaan umum per provinsi, bukan per data.
const PROV_GEO_ALIAS: Record<string, string> = {
  ACEH: 'DI ACEH',
  'NANGGROE ACEH DARUSSALAM': 'DI ACEH',
  'NUSA TENGGARA BARAT': 'NUSATENGGARA BARAT',
  BANTEN: 'PROBANTEN',
  'KEPULAUAN BANGKA BELITUNG': 'BANGKA BELITUNG',
  'BANGKA BELITUNG': 'BANGKA BELITUNG',
  'KEPULAUAN RIAU': 'RIAU',
  'KALIMANTAN UTARA': 'KALIMANTAN TIMUR',
  'SULAWESI BARAT': 'SULAWESI SELATAN',
  'DI YOGYAKARTA': 'DAERAH ISTIMEWA YOGYAKARTA',
  YOGYAKARTA: 'DAERAH ISTIMEWA YOGYAKARTA',
  'DKI JAKARTA': 'DKI JAKARTA',
  JAKARTA: 'DKI JAKARTA',
  'PAPUA BARAT': 'IRIAN JAYA BARAT',
  'PAPUA BARAT DAYA': 'IRIAN JAYA BARAT',
  PAPUA: 'IRIAN JAYA TIMUR',
  'PAPUA TENGAH': 'IRIAN JAYA TENGAH',
  'PAPUA PEGUNUNGAN': 'IRIAN JAYA TENGAH',
  'PAPUA SELATAN': 'IRIAN JAYA TIMUR',
}

export const provGeoKey = (prov: any): string => {
  const k = normName(prov).replace(/^DI /, 'DI ')
  return PROV_GEO_ALIAS[k] || k
}

// Legenda ISPU resmi (Permen LHK P.14/2020) - dipakai bila API tidak mengirim legenda
export const ISPU_LEGEND_DEFAULT = [
  { min: 0, max: 50, kategori: 'Baik', hex: '#22C55E' },
  { min: 51, max: 100, kategori: 'Sedang', hex: '#3B82F6' },
  { min: 101, max: 200, kategori: 'Tidak Sehat', hex: '#EAB308' },
  { min: 201, max: 300, kategori: 'Sangat Tidak Sehat', hex: '#EF4444' },
  { min: 301, max: null, kategori: 'Berbahaya', hex: '#111827' },
]

export const ispuColor = (val: any, legend?: any[]): string => {
  const n = Number(val)
  if (val === null || val === undefined || !Number.isFinite(n)) return '#94A3B8'
  const lg = Array.isArray(legend) && legend.length ? legend : ISPU_LEGEND_DEFAULT
  for (const l of lg) {
    if (l.max === null || l.max === undefined || n <= Number(l.max)) return l.hex || '#94A3B8'
  }
  return '#111827'
}

// Skala US AQI (label Indonesia) - sama dengan DataDukung.gs
export const US_AQI_LEGEND_DEFAULT = [
  { max: 50, kategori: 'Baik', hex: '#22C55E' },
  { max: 100, kategori: 'Sedang', hex: '#EAB308' },
  { max: 150, kategori: 'Tidak Sehat bagi Kelompok Sensitif', hex: '#F97316' },
  { max: 200, kategori: 'Tidak Sehat', hex: '#EF4444' },
  { max: 300, kategori: 'Sangat Tidak Sehat', hex: '#8B5CF6' },
  { max: null, kategori: 'Berbahaya', hex: '#7F1D1D' },
]

export const aqiColor = (val: any, legend?: any[]): string => {
  const n = Number(val)
  if (val === null || val === undefined || !Number.isFinite(n)) return '#94A3B8'
  const lg = Array.isArray(legend) && legend.length ? legend : US_AQI_LEGEND_DEFAULT
  for (const l of lg) {
    if (l.max === null || l.max === undefined || n <= Number(l.max)) return l.hex || '#94A3B8'
  }
  return '#7F1D1D'
}

export const HOTSPOT_CONF_COLORS: Record<string, string> = {
  tinggi: '#DC2626',
  sedang: '#F59E0B',
  rendah: '#FDE047',
}

export const hotspotConfKey = (c: any): string => {
  const s = String(c || '').toLowerCase()
  if (s === 'h' || s === 'high' || s === 'tinggi') return 'tinggi'
  if (s === 'l' || s === 'low' || s === 'rendah') return 'rendah'
  const n = Number(s)
  if (Number.isFinite(n) && s !== '') return n >= 80 ? 'tinggi' : n >= 30 ? 'sedang' : 'rendah'
  return 'sedang'
}

// Normalisasi satu titik hotspot dari GAS (latitude/longitude) atau fallback (lat/lng)
export const normalizeHotspot = (h: any) => ({
  id: h.id || h.key || `${h.latitude ?? h.lat}|${h.longitude ?? h.lng}|${h.tanggal_wib ?? h.acq_date}|${h.jam_wib ?? h.acq_time}`,
  lat: Number(h.latitude ?? h.lat),
  lng: Number(h.longitude ?? h.lng),
  tanggal: h.tanggal_wib || h.acq_date || '',
  jam: h.jam_wib || h.acq_time || '',
  provinsi: h.provinsi || null,
  confidence: hotspotConfKey(h.confidence),
  frp: h.frp_mw ?? h.frp ?? null,
  satelit: h.satelit || h.satellite || h.sumber || '',
  sumber: h.sumber || h.source || '',
})

export const SOURCE_CREDITS = {
  sheet: 'Spreadsheet DATA DASHBOARD KARHUTLA 2026 (PUSKRIS Kemenkes) via API Google Apps Script',
  ispu: 'ISPU KLHK (diinput ke spreadsheet karhutla)',
  firms: 'NASA FIRMS (LANCE/EOSDIS) VIIRS/MODIS NRT',
  openmeteo: 'Open-Meteo.com (CC BY 4.0), Copernicus CAMS (model, bukan stasiun)',
  batas: 'Batas provinsi: Peta Dasar BAKOSURTANAL 1:250.000 (public/indonesia-provinces.geojson)',
}

export const fmtUpdated = (iso: any): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return (
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'
  )
}

// Ambil teks "pembaruan terakhir" dari payload data dukung GAS ({ waktu_wib }) atau fallback (updated_at)
export const dataDukungUpdated = (payload: any): string => {
  if (!payload) return '-'
  const p = payload.pembaruan_terakhir
  if (p && p.waktu_wib) return `${p.waktu_wib} WIB`
  if (payload.updated_at) return fmtUpdated(payload.updated_at)
  return '-'
}

// Cari koordinat kab/kota dari daftar titik (mis. kualitas_udara_model yang memuat lat/lon per kab/kota LOKASI_PANTAU)
export const buildKabCoordIndex = (rows: any[]) => {
  const idx: Record<string, { lat: number; lng: number }> = {}
  ;(rows || []).forEach((r: any) => {
    const lat = Number(r.latitude ?? r.lat)
    const lng = Number(r.longitude ?? r.lon ?? r.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const prov = normName(r.provinsi)
    ;[r.kabupaten, r.nama_lokasi].forEach((n: any) => {
      const k = normName(n)
      if (!k) return
      if (!idx[`${prov}|${k}`]) idx[`${prov}|${k}`] = { lat, lng }
      if (!idx[`*|${k}`]) idx[`*|${k}`] = { lat, lng }
    })
  })
  return idx
}

const compact = (s: string) => s.replace(/\s+/g, '')

export const lookupKabCoord = (idx: Record<string, { lat: number; lng: number }>, name: any, prov?: any) => {
  const k = normName(name)
  if (!k) return null
  const p = normName(prov)
  if (idx[`${p}|${k}`]) return idx[`${p}|${k}`]
  if (idx[`*|${k}`]) return idx[`*|${k}`]
  // Cocokkan tanpa spasi (mis. "PEKAN BARU" vs "PEKANBARU")
  const ck = compact(k)
  for (const key of Object.keys(idx)) {
    const [kp, kn] = key.split('|')
    if ((kp === p || kp === '*') && compact(kn) === ck) return idx[key]
  }
  return null
}

// Cocokkan nama stasiun ISPU (mis. "Kabupaten Katingan", "Palangkaraya Jekan Raya") ke kab/kota terdekat namanya
export const matchStationCoord = (idx: Record<string, { lat: number; lng: number }>, station: any, prov?: any) => {
  const s = compact(normName(station))
  if (!s) return null
  const p = normName(prov)
  let best: { lat: number; lng: number } | null = null
  let bestLen = 0
  for (const key of Object.keys(idx)) {
    const [kp, kn] = key.split('|')
    if (kp !== p) continue
    const ck = compact(kn)
    if (ck.length >= 4 && s.includes(ck) && ck.length > bestLen) {
      best = idx[key]
      bestLen = ck.length
    }
  }
  return best
}
