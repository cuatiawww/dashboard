import { NextRequest, NextResponse } from 'next/server'
import { findMasterFaskes, getNttMasterFaskesList } from '@/lib/nttFaskesMasterMapper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_FASKES_URL ||
  'https://script.google.com/macros/s/AKfycbyARvzwA-r1NIlBC4xf8TNJK31FQNywIdnKYH71M0gxkWJNmR8Dg7nJ7wdY-zXoArHXiA/exec'

// Koordinat default per kabupaten di NTT jika faskes belum tercatat koordinatnya di master
const NTT_KAB_CENTER_COORDS: Record<string, { lat: number; lng: number }> = {
  'ende': { lat: -8.8415, lng: 121.6582 },
  'sikka': { lat: -8.6214, lng: 122.2155 },
  'flores timur': { lat: -8.3421, lng: 122.9814 },
  'nagekeo': { lat: -8.6752, lng: 121.2891 },
  'ngada': { lat: -8.7891, lng: 120.9664 },
  'manggarai timur': { lat: -8.8033, lng: 120.5982 },
  'manggarai': { lat: -8.6148, lng: 120.4632 },
  'manggarai barat': { lat: -8.5142, lng: 119.8924 },
  'kupang': { lat: -10.1772, lng: 123.607 },
  'kota kupang': { lat: -10.1772, lng: 123.607 },
  'alor': { lat: -8.2917, lng: 124.5719 },
  'lembata': { lat: -8.3758, lng: 123.5519 },
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const requestedKab = searchParams.get('kabupaten')?.trim().toLowerCase() || ''
    const requestedKerusakan = searchParams.get('kerusakan')?.trim().toLowerCase() || ''

    // 1. Fetch from Google Apps Script Web App
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`Google Apps Script API responded with status ${res.status}`)
    }

    const json = await res.json()
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.error || 'Format respon Google Apps Script tidak valid')
    }

    const rawRows = json.data

    // 2. Enrich each row with official 1,818 Master Faskes NTT dataset (coordinates, codes, kecamatan)
    let rusakBerat = 0
    let rusakSedang = 0
    let rusakRingan = 0
    let normal = 0

    let opPenuh = 0
    let opSebagian = 0
    let opTutup = 0

    let krisisListrik = 0
    let krisisAir = 0
    let butuhTenda = 0
    let butuhOksigen = 0
    let butuhObat = 0
    let butuhDokter = 0

    const enrichedRows = rawRows.map((item: any, idx: number) => {
      const rawName = String(item.nama_asli_sheet || item.nama_faskes || item.nama || '').trim()
      const rawKab = String(item.kabupaten || '').trim()
      const cleanKab = rawKab.toLowerCase().replace(/^kab\.\s*/i, '').trim()

      // Cari master faskes NTT
      const master = findMasterFaskes(rawName, cleanKab)

      // Fallback koordinat kabupaten jika master tidak ada koordinat
      const kabCoord = NTT_KAB_CENTER_COORDS[cleanKab] || { lat: -8.6, lng: 121.5 }
      const lat = master?.latitude ?? (kabCoord.lat ? kabCoord.lat + (Math.random() - 0.5) * 0.05 : null)
      const lng = master?.longitude ?? (kabCoord.lng ? kabCoord.lng + (Math.random() - 0.5) * 0.05 : null)

      // Hitung ringkasan
      const k = String(item.kondisi_bangunan || '').toLowerCase()
      if (k.includes('berat')) rusakBerat++
      else if (k.includes('sedang')) rusakSedang++
      else if (k.includes('ringan')) rusakRingan++
      else normal++

      const op = String(item.status_operasional || '').toLowerCase()
      if (op.includes('tidak') || op.includes('tutup') || op.includes('lumpuh')) opTutup++
      else if (op.includes('sebagian') || op.includes('tenda') || op.includes('luar gedung')) opSebagian++
      else opPenuh++

      const listrikLower = String(item.listrik || '').toLowerCase()
      if (listrikLower.includes('tidak stabil') || listrikLower.includes('padam') || listrikLower.includes('mati')) {
        krisisListrik++
      }

      const airLower = String(item.air_bersih || '').toLowerCase()
      if (airLower.includes('butuh') || airLower.includes('krisis') || airLower.includes('terbatas') || airLower.includes('tidak')) {
        krisisAir++
      }

      const kebLower = String(item.kebutuhan_mendesak || '').toLowerCase()
      if (kebLower.includes('tenda')) butuhTenda++
      if (kebLower.includes('oksigen')) butuhOksigen++
      if (kebLower.includes('obat')) butuhObat++
      if (kebLower.includes('sdm') || kebLower.includes('dokter')) butuhDokter++

      return {
        id: item.id || `faskes-terdampak-${idx + 1}`,
        no: item.no || idx + 1,
        nama: item.nama_faskes || rawName,
        nama_faskes: item.nama_faskes || rawName,
        nama_master: master?.nama_master || item.nama_faskes || rawName,
        nama_asli_sheet: item.nama_asli_sheet || rawName,
        jenis: item.jenis_faskes || master?.jenis_faskes || 'Puskesmas',
        jenis_faskes: item.jenis_faskes || master?.jenis_faskes || 'Puskesmas',
        subjenis: master?.subjenis || item.jenis_faskes || 'Puskesmas',
        kode_sarana: master?.kode_sarana || '-',
        kode_satusehat: master?.kode_satusehat || '-',
        kabupaten: item.kabupaten || (master ? `Kab. ${master.nama_kab}` : 'Kab. NTT'),
        nama_kab: cleanKab,
        kecamatan: master?.nama_kecamatan || item.kecamatan || '-',
        alamat: master?.alamat || '-',
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        master_matched: Boolean(master),
        kondisi_bangunan: item.kondisi_bangunan || 'Normal',
        tingkat_kerusakan: item.kondisi_bangunan || 'Normal',
        status_operasional: item.status_operasional || 'Operasional Penuh',
        listrik: item.listrik || 'Stabil',
        internet: item.internet || 'Stabil',
        ambulans: item.ambulans || '-',
        air_bersih: item.air_bersih || 'Terpenuhi',
        oksigen: item.oksigen || 'Terpenuhi',
        sdm_medis: item.sdm_medis || '-',
        alkes: item.alkes || '-',
        kebutuhan_mendesak: item.kebutuhan_mendesak || 'Terpenuhi',
        dokumentasi: item.dokumentasi || '-',
      }
    })

    // Hanya ambil faskes yang benar-benar mengalami kerusakan fisik (Rusak Berat, Rusak Sedang, Rusak Ringan). Faskes berkondisi Normal TIDAK boleh masuk.
    const terdampakOnlyRows = enrichedRows.filter((r: any) => {
      const k = String(r.kondisi_bangunan || '').toLowerCase().trim()
      if (k.includes('normal') || !k) return false
      return k.includes('berat') || k.includes('sedang') || k.includes('ringan') || k.includes('rusak')
    })

    // Filter jika ada query parameter
    let filtered = terdampakOnlyRows
    if (requestedKab && requestedKab !== 'semua') {
      filtered = filtered.filter((r: any) =>
        String(r.kabupaten || '').toLowerCase().includes(requestedKab) ||
        String(r.nama_kab || '').toLowerCase().includes(requestedKab)
      )
    }
    if (requestedKerusakan && requestedKerusakan !== 'semua') {
      filtered = filtered.filter((r: any) =>
        String(r.kondisi_bangunan || '').toLowerCase().includes(requestedKerusakan)
      )
    }

    const summary = {
      total_faskes_terpantau: rawRows.length,
      total_terdampak: rusakBerat + rusakSedang + rusakRingan,
      rusak_berat: rusakBerat,
      rusak_sedang: rusakSedang,
      rusak_ringan: rusakRingan,
      normal: normal,
      operasional_penuh: opPenuh,
      operasional_sebagian: opSebagian,
      tidak_operasional: opTutup,
      krisis_listrik: krisisListrik,
      krisis_air: krisisAir,
      butuh_tenda: butuhTenda,
      butuh_oksigen: butuhOksigen,
      butuh_obat: butuhObat,
      butuh_dokter: butuhDokter,
    }

    return NextResponse.json({
      success: true,
      source: 'google_apps_script_ntt',
      updated_at: json.updated_at || new Date().toISOString(),
      summary,
      penyakit: json.penyakit || null,
      total: filtered.length,
      data: filtered,
    })
  } catch (error: any) {
    console.error('[API Faskes Terdampak Error]', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memuat data faskes terdampak dari Google Sheets.',
        summary: {
          total_faskes_terpantau: 0,
          total_terdampak: 0,
          rusak_berat: 0,
          rusak_sedang: 0,
          rusak_ringan: 0,
          normal: 0,
          operasional_penuh: 0,
          operasional_sebagian: 0,
          tidak_operasional: 0,
          krisis_listrik: 0,
          krisis_air: 0,
          butuh_tenda: 0,
          butuh_oksigen: 0,
          butuh_obat: 0,
          butuh_dokter: 0,
        },
        data: [],
      },
      { status: 500 }
    )
  }
}
