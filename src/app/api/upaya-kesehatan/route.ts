import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GOOGLE_APPS_SCRIPT_UPAYA_URL =
  process.env.GOOGLE_APPS_SCRIPT_UPAYA_URL ||
  process.env.GOOGLE_APPS_SCRIPT_KORBAN_URL ||
  process.env.NEXT_PUBLIC_NTT_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwt-VTU0wNteo_03CyCJIALO2KZ8I6cyya049A16OnslSal6nKqzw7e-y_JIYPIjUZn/exec'

// Server-side memory cache (30s TTL untuk efisiensi fetch langsung ke Google Spreadsheet)
let cachedUpayaPayload: any = null
let cachedUpayaTimestamp = 0
const UPAYA_CACHE_TTL_MS = 30_000

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const requestedKab = searchParams.get('kabupaten')?.trim().toLowerCase() || ''
    const requestedSub = searchParams.get('sub_klaster')?.trim().toLowerCase() || ''
    const noCache = searchParams.get('nocache') === 'true' || searchParams.get('refresh') === 'true'

    let rawPayload: any = null
    const now = Date.now()

    // 1. Cek Server Cache (jika tidak diminta nocache)
    if (!noCache && cachedUpayaPayload && (now - cachedUpayaTimestamp < UPAYA_CACHE_TTL_MS)) {
      rawPayload = cachedUpayaPayload
    } else {
      // 2. Fetch Langsung 100% ke Google Apps Script Spreadsheet API (?type=upaya_kesehatan)
      const fetchUrl = `${GOOGLE_APPS_SCRIPT_UPAYA_URL}${GOOGLE_APPS_SCRIPT_UPAYA_URL.includes('?') ? '&' : '?'}type=upaya_kesehatan${noCache ? '&nocache=true' : ''}`
      const res = await fetch(fetchUrl, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      })

      if (!res.ok) {
        throw new Error(`Google Apps Script API merespon dengan status HTTP ${res.status}`)
      }

      const json = await res.json()
      if (!json || !json.success || !Array.isArray(json.data)) {
        throw new Error(json?.error || 'Format respon dari Spreadsheet API tidak valid atau sheet kosong.')
      }

      rawPayload = json
      cachedUpayaPayload = json
      cachedUpayaTimestamp = now
    }

    let items = Array.isArray(rawPayload.data) ? [...rawPayload.data] : []

    // 3. Terapkan filter dinamis jika ada parameter kabupaten / sub_klaster
    if (requestedKab && requestedKab !== 'semua') {
      items = items.filter((it: any) =>
        String(it.kabupaten || '').toLowerCase().includes(requestedKab)
      )
    }

    if (requestedSub && requestedSub !== 'semua') {
      items = items.filter((it: any) =>
        String(it.sub_klaster || '').toLowerCase().includes(requestedSub)
      )
    }

    // Bangun ulang struktur grouping dinamis
    const byKabupaten: Record<string, Record<string, string[]>> = {}
    const bySubKlaster: Record<string, { kabupaten: string; upaya: string }[]> = {}
    const setKab = new Set<string>()
    const setSub = new Set<string>()

    items.forEach((item: any) => {
      const kab = item.kabupaten || 'Kabupaten NTT'
      const sub = item.sub_klaster || 'Sub Klaster Pelayanan Kesehatan'

      setKab.add(kab)
      setSub.add(sub)

      if (!byKabupaten[kab]) byKabupaten[kab] = {}
      if (!byKabupaten[kab][sub]) byKabupaten[kab][sub] = []
      byKabupaten[kab][sub].push(item.upaya)

      if (!bySubKlaster[sub]) bySubKlaster[sub] = []
      bySubKlaster[sub].push({
        kabupaten: kab,
        upaya: item.upaya
      })
    })

    const daftarKabupaten = Array.from(setKab)
    const daftarSubKlaster = Array.from(setSub)

    return NextResponse.json({
      success: true,
      source: 'google_spreadsheet_api_live',
      sheet_name: rawPayload.sheet_name || 'UPAYA BIDANG KESEHATAN',
      updated_at: rawPayload.updated_at || new Date().toISOString(),
      total: items.length,
      summary: {
        total_upaya: items.length,
        total_kabupaten: daftarKabupaten.length,
        total_sub_klaster: daftarSubKlaster.length,
        daftar_kabupaten: daftarKabupaten,
        daftar_sub_klaster: daftarSubKlaster,
      },
      data: items,
      by_kabupaten: byKabupaten,
      by_sub_klaster: bySubKlaster
    })
  } catch (err: any) {
    console.error('[API Upaya Kesehatan Error]', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal memuat data upaya kesehatan dari Spreadsheet API',
        data: [],
        summary: { total_upaya: 0, total_kabupaten: 0, total_sub_klaster: 0, daftar_kabupaten: [], daftar_sub_klaster: [] }
      },
      { status: 502 }
    )
  }
}
