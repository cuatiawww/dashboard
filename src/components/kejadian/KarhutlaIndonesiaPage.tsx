'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DetailKejadianPage from './DetailKejadianPage'
import { useHeaderStore } from '@/lib/headerStore'

const safeParseInt = (val: any): number => {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.floor(val)
  }
  const clean = String(val)
    .replace(/\s*[a-zA-Z]+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .trim()
  const parsed = parseInt(clean, 10)
  return isNaN(parsed) ? 0 : parsed
}

const fmtId = (n: number) => Number(n || 0).toLocaleString('id-ID')

// Narasi dibangun dari angka API (bukan teks statis) agar selalu sinkron dengan spreadsheet
const buildKronologis = (json: any, hotspotRingkasan: any): string => {
  const k = json?.ringkasan?.kartu || {}
  const prov: string[] = json?.ringkasan?.provinsi_terdampak || []
  const logAll = [...(k.logistik_dinkes_jenis || []), ...(k.logistik_puskris_jenis || [])]
  const sumJenis = (key: string) => logAll.filter((x: any) => x.jenis_key === key).reduce((s: number, x: any) => s + safeParseInt(x.jumlah), 0)
  const parts = [
    `Kebakaran hutan dan lahan (Karhutla) berdampak pada ${fmtId(k.penduduk_terdampak)} penduduk di ${fmtId(k.kabupaten_terdampak)} kab/kota pada ${prov.length} provinsi${prov.length ? ` (${prov.join(', ')})` : ''}.`,
    `Tercatat ${fmtId(k.kasus_ispa)} kasus ISPA (${fmtId(k.kasus_ispa_balita)} balita), ${fmtId(k.kasus_penyakit_lainnya)} kasus penyakit lainnya, ${fmtId(k.rawat_inap)} rawat inap, dan ${fmtId(k.meninggal)} meninggal.`,
  ]
  if (k.ispu_tertinggi?.nilai_ispu !== undefined) {
    parts.push(`ISPU tertinggi ${fmtId(k.ispu_tertinggi.nilai_ispu)} (${k.ispu_tertinggi.kategori}) di ${k.ispu_tertinggi.stasiun}, ${k.ispu_tertinggi.provinsi}; ${fmtId(k.stasiun_ispu_berbahaya)} stasiun berkategori Berbahaya.`)
  }
  if (hotspotRingkasan?.kartu) {
    parts.push(`NASA FIRMS mendeteksi ${fmtId(hotspotRingkasan.kartu.hotspot_24jam)} titik panas dalam 24 jam terakhir.`)
  }
  parts.push(`Kemenkes dan Dinkes melakukan ${fmtId(k.jumlah_upaya)} upaya kesehatan, menggerakkan ${fmtId(k.sdmk_digerakkan)} SDMK, serta menyalurkan ${fmtId(sumJenis('masker'))} masker dan ${fmtId(sumJenis('oksigen_konsentrator'))} unit oksigen konsentrator.`)
  return parts.join(' ')
}

// Metadata kejadian. Semua angka/teks dampak diisi dari API (/api/karhutla-data); nilai awal kosong sampai data termuat.
// Spreadsheet belum memuat tanggal mulai kejadian & status kedaruratan, jadi keduanya tidak ditampilkan.
// tgl_kejadian_riil diisi tanggal data terakhir API (dibutuhkan komponen detail untuk kalkulasi tanggal).
// latitude/longitude: titik referensi internal (Palangka Raya) untuk komponen detail; tidak ditampilkan sebagai data.
const nowWib = () => {
  const d = new Date(Date.now() + 7 * 3600_000)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
const apiDateWib = (iso: any): string => {
  const d = new Date(iso)
  if (!iso || isNaN(d.getTime())) return nowWib()
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 19).replace('T', ' ')
}
const INITIAL_DATE = nowWib()
const BASE_KARHUTLA_EVENT = {
  id: 'EVT-KARHUTLA-ID-2026',
  kode_trans: 'EVT-KARHUTLA-ID-2026',
  nama: 'Kebakaran Hutan dan Lahan (Karhutla) Wilayah Indonesia 2026',
  nama_bencana: 'Kebakaran Hutan dan Lahan',
  jenis_bencana: 'Kebakaran Hutan dan Lahan',
  provinsi: 'INDONESIA',
  kabupaten: '',
  kecamatan: '',
  waktu_kejadian: '',
  tgl_kejadian_riil: INITIAL_DATE,
  tgl_kejadian: '',
  tgl_laporan: '',
  updated_at: '',
  latitude: -2.2136,
  longitude: 113.9108,
  status_bencana: '',
  keterangan: '',
  kronologis: '',
  deskripsi: '',
  buletin_eoc: '',
  meninggal: 0,
  luka_berat: 0,
  luka_ringan: 0,
  luka: 0,
  hilang: 0,
  pengungsi: 0,
  penduduk_terdampak: 0,
  populasi_terdampak: 0,
  karhutla: null as any,
  detailData: {
    id: 'EVT-KARHUTLA-ID-2026',
    kode_trans: 'EVT-KARHUTLA-ID-2026',
    nama_bencana: 'Kebakaran Hutan dan Lahan',
    jenis_bencana: 'Kebakaran Hutan dan Lahan',
    provinsi: 'INDONESIA',
    kabupaten: '',
    kecamatan: '',
    waktu_kejadian: '',
    tgl_kejadian_riil: INITIAL_DATE,
    tgl_kejadian: '',
    tgl_laporan: '',
    updated_at: '',
    latitude: -2.2136,
    longitude: 113.9108,
    deskripsi: '',
    kronologis: '',
    keterangan: '',
    buletin_eoc: '',
    status_tanggap_darurat: '',
    korban_meninggal: 0,
    korban_luka_berat: 0,
    korban_luka_ringan: 0,
    korban_luka: 0,
    korban_hilang: 0,
    pengungsi: 0,
    populasi_terdampak: 0,
    meninggal: 0,
    luka_berat: 0,
    luka_ringan: 0,
    luka: 0,
    hilang: 0,
    penduduk_terdampak: 0,
    breakdown_kabupaten: [] as any[],
    faskes_terdampak: [] as any[],
    faskes_terdekat: [] as any[],
    lokasi: [] as any[],
    pos_pengungsi: [] as any[],
    logistik: [] as any[],
    tck: [] as any[],
    upaya_kesehatan: null as any,
    karhutla: null as any,
  },
}

// Global in-memory cache agar navigasi instan tanpa skeleton loading ulang
let globalKarhutlaEventCache: any = null
let globalKarhutlaHasLoadedOnce = false

const fetchJson = async (url: string): Promise<any> => {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    return await res.json()
  } catch (e: any) {
    return { success: false, error: e?.message || 'fetch gagal' }
  }
}

export default function KarhutlaIndonesiaPage() {
  const router = useRouter()
  const { setHeader, resetHeader } = useHeaderStore()
  const [eventData, setEventData] = useState<any>(globalKarhutlaEventCache || BASE_KARHUTLA_EVENT)
  const [isLoading, setIsLoading] = useState<boolean>(!globalKarhutlaHasLoadedOnce && !globalKarhutlaEventCache)

  useEffect(() => {
    setHeader({
      title: 'DASHBOARD SITUASI KARHUTLA - INDONESIA',
      description:
        'Analisis spasial kejadian kebakaran hutan dan lahan (Karhutla): penduduk terdampak, kasus ISPA dan penyakit terkait asap, kualitas udara (ISPU), titik panas, serta respon sumber daya kesehatan.',
    })

    return () => {
      resetHeader()
    }
  }, [setHeader, resetHeader])

  // Muat data live dari API Google Sheets Karhutla (/api/karhutla-data) + data dukung (hotspot, kualitas udara model)
  const loadKarhutlaData = async () => {
    if (!globalKarhutlaHasLoadedOnce && !globalKarhutlaEventCache) {
      setIsLoading(true)
    }
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const api = `${basePath}/api/karhutla-data`
      const [json, hotspot, hotspotRingkasan, udara] = await Promise.all([
        fetchJson(api),
        fetchJson(`${api}?type=hotspot&limit=5000`),
        fetchJson(`${api}?type=hotspot_ringkasan`),
        fetchJson(`${api}?type=kualitas_udara_model`),
      ])
      if (!json || !json.success) return

      const errors: string[] = []
      if (!hotspot?.success) errors.push(`titik panas (${hotspot?.error || 'tidak tersedia'})`)
      if (!hotspotRingkasan?.success) errors.push(`ringkasan titik panas (${hotspotRingkasan?.error || 'tidak tersedia'})`)
      if (!udara?.success || udara?.tersedia === false) errors.push(`kualitas udara model (${udara?.error || udara?.pesan || 'tidak tersedia'})`)

      const karhutla = {
        all: json,
        hotspot: hotspot?.success ? hotspot : null,
        hotspotRingkasan: hotspotRingkasan?.success ? hotspotRingkasan : null,
        udara: udara?.success && udara?.tersedia !== false ? udara : null,
        errors,
      }

      const kartu = json.ringkasan?.kartu || {}
      const updateText = json.ringkasan?.ispu_update_text || ''
      const meninggalVal = safeParseInt(kartu.meninggal)
      const rawatInapVal = safeParseInt(kartu.rawat_inap)
      const rawatJalanVal = safeParseInt(json.penduduk_terdampak?.summary?.luka_ringan_rawat_jalan)
      const pengungsiVal = safeParseInt(json.penduduk_terdampak?.summary?.pengungsi)
      const pendudukTerdampakVal = safeParseInt(kartu.penduduk_terdampak)
      const ispaBalitaVal = safeParseInt(kartu.kasus_ispa_balita)
      const ispuTop = kartu.ispu_tertinggi || json.ispu?.summary?.stasiun_tertinggi || null
      const ispuVal = ispuTop ? safeParseInt(ispuTop.nilai_ispu) : 0
      const ispuLokasi = ispuTop ? `${ispuTop.stasiun}, ${ispuTop.provinsi} (${ispuTop.kategori})` : ''
      const hotspotTotal = karhutla.hotspotRingkasan?.kartu?.hotspot_24jam ?? karhutla.hotspot?.total ?? null
      const kronologis = buildKronologis(json, karhutla.hotspotRingkasan)

      // Breakdown kab/kota: data korban riil per kab/kota dari tab DATA PENDUDUK TERDAMPAK (tanpa estimasi/pembagian rata)
      const rawPendudukList = Array.isArray(json.penduduk_terdampak?.data) ? json.penduduk_terdampak.data : []
      const breakdownKab = rawPendudukList.map((row: any, idx: number) => {
        const k = row.korban || {}
        const pop = safeParseInt(row.penduduk_terdampak)
        const lb = safeParseInt(k.luka_berat_rawat_inap)
        const lr = safeParseInt(k.luka_ringan_rawat_jalan)
        return {
          id: row.id || `kab-${idx + 1}`,
          kabupaten: row.kabupaten,
          provinsi: row.provinsi,
          nama_kab: row.kabupaten,
          populasi_terdampak: pop,
          penduduk_terdampak: pop,
          meninggal: safeParseInt(k.meninggal),
          luka_berat: lb,
          luka_ringan: lr,
          luka: lb + lr,
          hilang: 0,
          pengungsi: safeParseInt(k.pengungsi),
        }
      })

      // Tenaga kesehatan (SDMK) per provinsi: sheet hanya memuat jumlah & jenis tenaga
      const tckList = (Array.isArray(json.sdmk?.data) ? json.sdmk.data : []).map((item: any, idx: number) => ({
        id: item.id || `sdmk-${idx + 1}`,
        nama: `SDMK ${item.provinsi}`,
        profesi: (item.jenis_tenaga || []).join(', ') || '-',
        jumlah: safeParseInt(item.jumlah),
        instansi: 'Dinas Kesehatan',
        lokasi_tugas: item.provinsi,
        provinsi: item.provinsi,
        status: 'Digerakkan',
      }))

      // Logistik riil (Dinkes + Puskris)
      const logistikList = [
        ...(json.logistik?.dinkes?.data || []),
        ...(json.logistik?.puskris?.data || []),
      ].map((item: any, idx: number) => ({
        id: item.id || `log-${idx + 1}`,
        nama_barang: item.jenis_logistik,
        jumlah: safeParseInt(item.jumlah),
        satuan: item.satuan || '-',
        sumber: item.sumber,
        penerima: item.provinsi,
        provinsi: item.provinsi,
        keterangan: item.keterangan || '',
      }))

      const rawUpayaList = Array.isArray(json.upaya?.data) ? json.upaya.data : []

      const provTerdampak: string[] = json.ringkasan?.provinsi_terdampak || []
      const common = {
        kabupaten: provTerdampak.join(', '),
        tgl_kejadian_riil: apiDateWib(json.updated_at),
        tgl_laporan: updateText,
        updated_at: json.updated_at || updateText,
        meninggal: meninggalVal,
        luka_berat: rawatInapVal,
        luka_ringan: rawatJalanVal,
        luka: rawatInapVal + rawatJalanVal,
        pengungsi: pengungsiVal,
        penduduk_terdampak: pendudukTerdampakVal,
        populasi_terdampak: pendudukTerdampakVal,
        ispa_balita: ispaBalitaVal,
        ispu_tertinggi: ispuVal || null,
        ispu_lokasi: ispuLokasi,
        hotspot: hotspotTotal,
        titik_panas: hotspotTotal,
        keterangan: kronologis,
        kronologis,
        deskripsi: kronologis,
        buletin_eoc: kronologis,
        karhutla,
        karhutla_ringkasan: json.ringkasan,
        karhutla_penduduk: json.penduduk_terdampak,
        karhutla_ispa: json.ispa,
        karhutla_penyakit: json.penyakit_lainnya,
        karhutla_ispu: json.ispu,
        karhutla_logistik_dinkes: json.logistik?.dinkes,
        karhutla_logistik_puskris: json.logistik?.puskris,
        karhutla_sdmk: json.sdmk,
        karhutla_upaya: json.upaya,
        karhutla_hotspot: karhutla.hotspotRingkasan,
      }

      setEventData((prev: any) => {
        const next = {
          ...prev,
          ...common,
          detailData: {
            ...prev.detailData,
            ...common,
            korban_meninggal: meninggalVal,
            korban_luka_berat: rawatInapVal,
            korban_luka_ringan: rawatJalanVal,
            korban_luka: rawatInapVal + rawatJalanVal,
            breakdown_kabupaten: breakdownKab,
            tck: tckList,
            logistik: logistikList,
            upaya_kesehatan: rawUpayaList.length > 0 ? { data: rawUpayaList } : null,
            lokasi: [],
          },
        }

        globalKarhutlaEventCache = next
        globalKarhutlaHasLoadedOnce = true
        return next
      })
    } catch (err) {
      console.warn('[KarhutlaIndonesiaPage] Gagal memuat data karhutla:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKarhutlaData()

    // Polling live setiap 15 menit secara background
    const interval = setInterval(() => {
      loadKarhutlaData()
    }, 15 * 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="w-full">
      <DetailKejadianPage
        selectedEvent={eventData}
        onBack={() => router.push('/')}
        isLoading={isLoading}
        hideBack={true}
      />
    </div>
  )
}
