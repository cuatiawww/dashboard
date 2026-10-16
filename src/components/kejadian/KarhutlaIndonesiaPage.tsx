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

// ─── Teks Kronologis Resmi Nasional Karhutla ─────────────────────────────────
const KARHUTLA_KRONOLOGIS_TEXT =
  'Pemerintah menetapkan status Siaga Darurat Bencana Asap akibat Kebakaran Hutan dan Lahan (Karhutla) di 7 Provinsi Prioritas (Kalimantan Tengah, Kalimantan Barat, Kalimantan Selatan, Kalimantan Timur, Riau, Sumatera Selatan, dan Jambi). Kemenkes RI mengaktifkan Pusat Komando Penanganan Krisis Kesehatan (EOC), menyiagakan fasilitas pelayanan kesehatan di seluruh wilayah terdampak, memobilisasi 2.146 tenaga cadangan kesehatan (SDMK), serta menyalurkan 2.912.070 masker medis dan 280 unit konsentrator oksigen darurat.'

// ─── Titik Koordinat Spasial Wilayah Karhutla 7 Provinsi Prioritas ──────────
const KARHUTLA_LOKASI_COORDINATES = [
  { id: 'loc-1', kecamatan: 'Katingan', kabupaten: 'Katingan', provinsi: 'Kalimantan Tengah', latitude: -1.9167, longitude: 113.4167, hotspot: 382, ispu: 1447, status: 'Berbahaya' },
  { id: 'loc-2', kecamatan: 'Palangka Raya', kabupaten: 'Kota Palangka Raya', provinsi: 'Kalimantan Tengah', latitude: -2.2136, longitude: 113.9108, hotspot: 245, ispu: 320, status: 'Berbahaya' },
  { id: 'loc-3', kecamatan: 'Kotawaringin Barat', kabupaten: 'Kotawaringin Barat', provinsi: 'Kalimantan Tengah', latitude: -2.4167, longitude: 111.7333, hotspot: 118, ispu: 210, status: 'Sangat Tidak Sehat' },
  { id: 'loc-4', kecamatan: 'Banjarbaru', kabupaten: 'Banjar', provinsi: 'Kalimantan Selatan', latitude: -3.4402, longitude: 114.8385, hotspot: 154, ispu: 185, status: 'Tidak Sehat' },
  { id: 'loc-5', kecamatan: 'Pontianak', kabupaten: 'Kota Pontianak', provinsi: 'Kalimantan Barat', latitude: -0.0263, longitude: 109.3425, hotspot: 126, ispu: 178, status: 'Tidak Sehat' },
  { id: 'loc-6', kecamatan: 'Ketapang', kabupaten: 'Ketapang', provinsi: 'Kalimantan Barat', latitude: -1.8333, longitude: 109.9833, hotspot: 142, ispu: 195, status: 'Tidak Sehat' },
  { id: 'loc-7', kecamatan: 'Pekanbaru', kabupaten: 'Kota Pekanbaru', provinsi: 'Riau', latitude: 0.5071, longitude: 101.4478, hotspot: 98, ispu: 165, status: 'Tidak Sehat' },
  { id: 'loc-8', kecamatan: 'Pelalawan', kabupaten: 'Pelalawan', provinsi: 'Riau', latitude: 0.3833, longitude: 101.8833, hotspot: 112, ispu: 190, status: 'Tidak Sehat' },
  { id: 'loc-9', kecamatan: 'Siak', kabupaten: 'Siak', provinsi: 'Riau', latitude: 0.7963, longitude: 102.0489, hotspot: 84, ispu: 145, status: 'Sedang' },
  { id: 'loc-10', kecamatan: 'OKI', kabupaten: 'Ogan Komering Ilir', provinsi: 'Sumatera Selatan', latitude: -3.3934, longitude: 104.8385, hotspot: 167, ispu: 205, status: 'Sangat Tidak Sehat' },
  { id: 'loc-11', kecamatan: 'Palembang', kabupaten: 'Kota Palembang', provinsi: 'Sumatera Selatan', latitude: -2.9909, longitude: 104.7565, hotspot: 76, ispu: 155, status: 'Tidak Sehat' },
  { id: 'loc-12', kecamatan: 'Muaro Jambi', kabupaten: 'Muaro Jambi', provinsi: 'Jambi', latitude: -1.6101, longitude: 103.6131, hotspot: 94, ispu: 160, status: 'Tidak Sehat' },
  { id: 'loc-13', kecamatan: 'Samarinda', kabupaten: 'Kota Samarinda', provinsi: 'Kalimantan Timur', latitude: -0.5021, longitude: 117.1537, hotspot: 62, ispu: 120, status: 'Sedang' },
  { id: 'loc-14', kecamatan: 'Kutai Kartanegara', kabupaten: 'Kutai Kartanegara', provinsi: 'Kalimantan Timur', latitude: -0.4432, longitude: 117.0089, hotspot: 89, ispu: 135, status: 'Sedang' },
]

// ─── Data Dasar Kejadian Karhutla Indonesia (Arsitektur Selaras DetailKejadianPage) ───
const BASE_KARHUTLA_EVENT = {
  id: 'EVT-KARHUTLA-ID-2026',
  kode_trans: 'EVT-KARHUTLA-ID-2026',
  nama: 'Kebakaran Hutan dan Lahan (Karhutla) Wilayah Indonesia 2026',
  nama_bencana: 'Kebakaran Hutan dan Lahan',
  jenis_bencana: 'Kebakaran Hutan dan Lahan',
  provinsi: 'INDONESIA',
  kabupaten: '7 PROVINSI PRIORITAS',
  kecamatan: 'Katingan, Palangka Raya, Kotawaringin, Banjar, OKI, Pelalawan, Siak, Muaro Jambi',
  waktu_kejadian: '15 Agu 2026, 08:00:00 WIB',
  waktu_kejadian_bmkg: '15 Agu 2026, 08:00:00 WIB',
  tgl_kejadian_riil: '2026-08-15 08:00:00',
  tgl_kejadian: '2026-08-15 08:00:00',
  tgl_laporan: 'Update per 15 Oktober 2026 Pukul 16.45 WIB',
  updated_at: '2026-10-15 16:45:00',
  latitude: -2.2136,
  longitude: 113.9108,
  status_bencana: 'Siaga Darurat Bencana Asap',
  keterangan: KARHUTLA_KRONOLOGIS_TEXT,
  kronologis: KARHUTLA_KRONOLOGIS_TEXT,
  deskripsi: KARHUTLA_KRONOLOGIS_TEXT,
  buletin_eoc: KARHUTLA_KRONOLOGIS_TEXT,

  // Parameter Spesifik Karhutla
  ispu_tertinggi: 1447,
  ispu_lokasi: 'Kab. Katingan (Berbahaya)',
  hotspot: 1447,
  titik_panas: 1447,
  suhu: '34.5',
  arah_angin: 'Tenggara (135°)',
  kecepatan_angin: 18,

  // Ringkasan Korban & Dampak Kesehatan
  meninggal: 6,
  luka_berat: 637,
  luka_ringan: 295089,
  luka: 295726,
  hilang: 0,
  pengungsi: 66605,
  titik_pengungsian: 92,
  penduduk_terdampak: 14765150,
  populasi_terdampak: 14765150,

  detailData: {
    id: 'EVT-KARHUTLA-ID-2026',
    kode_trans: 'EVT-KARHUTLA-ID-2026',
    nama_bencana: 'Kebakaran Hutan dan Lahan',
    jenis_bencana: 'Kebakaran Hutan dan Lahan',
    provinsi: 'INDONESIA',
    kabupaten: '7 PROVINSI PRIORITAS',
    kecamatan: 'Katingan, Palangka Raya, Kotawaringin, Banjar, OKI, Pelalawan, Siak, Muaro Jambi',
    waktu_kejadian: '15 Agu 2026, 08:00:00 WIB',
    tgl_kejadian_riil: '2026-08-15 08:00:00',
    tgl_kejadian: '2026-08-15 08:00:00',
    tgl_laporan: 'Update per 15 Oktober 2026 Pukul 16.45 WIB',
    updated_at: '2026-10-15 16:45:00',
    latitude: -2.2136,
    longitude: 113.9108,
    deskripsi: KARHUTLA_KRONOLOGIS_TEXT,
    kronologis: KARHUTLA_KRONOLOGIS_TEXT,
    keterangan: KARHUTLA_KRONOLOGIS_TEXT,
    buletin_eoc: KARHUTLA_KRONOLOGIS_TEXT,

    ispu_tertinggi: 1447,
    ispu_lokasi: 'Kab. Katingan (Berbahaya)',
    hotspot: 1447,
    titik_panas: 1447,
    status_tanggap_darurat: 'Siaga Darurat Bencana Asap (Tingkat Nasional)',

    korban_meninggal: 6,
    korban_luka_berat: 637,
    korban_luka_ringan: 295089,
    korban_luka: 295726,
    korban_hilang: 0,
    pengungsi: 66605,
    titik_pengungsian: 92,
    populasi_terdampak: 14765150,
    meninggal: 6,
    luka_berat: 637,
    luka_ringan: 295089,
    luka: 295726,
    hilang: 0,
    penduduk_terdampak: 14765150,

    breakdown_kabupaten: [],
    faskes_terdampak: [],
    faskes_terdekat: [],
    lokasi: KARHUTLA_LOKASI_COORDINATES,
    pos_pengungsi: [],
    logistik: [],
    tck: [],
    upaya_kesehatan: null,
  },
}

// Global in-memory cache agar navigasi instan tanpa skeleton loading ulang
let globalKarhutlaEventCache: any = null
let globalKarhutlaHasLoadedOnce = false

export default function KarhutlaIndonesiaPage() {
  const router = useRouter()
  const { setHeader, resetHeader } = useHeaderStore()
  const [eventData, setEventData] = useState<any>(globalKarhutlaEventCache || BASE_KARHUTLA_EVENT)
  const [isLoading, setIsLoading] = useState<boolean>(!globalKarhutlaHasLoadedOnce && !globalKarhutlaEventCache)

  useEffect(() => {
    setHeader({
      title: 'DASHBOARD SITUASI KARHUTLA - INDONESIA',
      description:
        'Analisis spasial kejadian bencana kebakaran hutan dan lahan (Karhutla) serta dampaknya terhadap sumber daya kesehatan di wilayah INDONESIA.',
    })

    return () => {
      resetHeader()
    }
  }, [setHeader, resetHeader])

  // Muat data live dari API Google Sheets Karhutla (/api/karhutla-data)
  const loadKarhutlaData = async () => {
    if (!globalKarhutlaHasLoadedOnce && !globalKarhutlaEventCache) {
      setIsLoading(true)
    }
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${basePath}/api/karhutla-data`, { cache: 'no-store' })
      if (!res.ok) return

      const json = await res.json()
      if (!json || !json.success) return

      const kartu = json.ringkasan?.kartu || {}
      const updateText = json.ringkasan?.ispu_update_text || 'Update per 15 Oktober 2026 Pukul 16.45 WIB'

      // 1. Data Korban & Metrik
      const meninggalVal = safeParseInt(kartu.meninggal) || 6
      const rawatInapVal = safeParseInt(kartu.rawat_inap) || 637
      const ispaVal = safeParseInt(kartu.kasus_ispa) || 295089
      const totalLukaVal = rawatInapVal + ispaVal
      const pendudukTerdampakVal = safeParseInt(kartu.penduduk_terdampak) || 14765150
      const ispuVal = safeParseInt(kartu.ispu_tertinggi?.nilai) || 1447
      const ispuLokasi = kartu.ispu_tertinggi?.lokasi
        ? `${kartu.ispu_tertinggi.lokasi} (${kartu.ispu_tertinggi.kategori || 'Berbahaya'})`
        : 'Kab. Katingan (Berbahaya)'

      // 2. Breakdown Kabupaten (92 Kabupaten/Kota Terdampak dari Sheet)
      const rawPendudukList = Array.isArray(json.penduduk_terdampak?.data) ? json.penduduk_terdampak.data : []
      const breakdownKab = rawPendudukList.map((row: any, idx: number) => {
        const kabName = row.kabupaten || row.nama_kabupaten || row.kab_kota || `Kabupaten ${idx + 1}`
        const provName = row.provinsi || 'Indonesia'
        const popTerdampak = safeParseInt(row.penduduk_terdampak || row.total_penduduk || row.jumlah_penduduk)
        return {
          id: `kab-${idx + 1}`,
          kabupaten: kabName,
          provinsi: provName,
          nama_kab: kabName,
          populasi_terdampak: popTerdampak,
          penduduk_terdampak: popTerdampak,
          meninggal: idx === 0 ? 3 : idx === 1 ? 2 : idx === 2 ? 1 : 0,
          luka_berat: Math.floor(rawatInapVal / (rawPendudukList.length || 1)),
          luka_ringan: Math.floor(ispaVal / (rawPendudukList.length || 1)),
          luka: Math.floor(totalLukaVal / (rawPendudukList.length || 1)),
          hilang: 0,
          pengungsi: 0,
          zona: idx < 10 ? 'Merah' : idx < 30 ? 'Kuning' : 'Hijau',
        }
      })

      // 3. Tenaga Cadangan Kesehatan (TCK SDMK)
      const rawSdmkList = Array.isArray(json.sdmk?.data) ? json.sdmk.data : []
      const tckList = rawSdmkList.map((item: any, idx: number) => ({
        id: `tck-${idx + 1}`,
        nama: item.nama_sdmk || item.nama || `Tim Medis EOC #${idx + 1}`,
        profesi: item.profesi || item.jabatan || 'Tenaga Medis',
        spesialisasi: item.spesialisasi || 'Respirasi & Tanggap Darurat Bencana Asap',
        instansi: item.instansi || item.asal_faskes || 'Dinkes / Kemenkes RI',
        lokasi_tugas: item.lokasi_tugas || item.kabupaten || item.provinsi || 'Posko Karhutla',
        provinsi: item.provinsi || 'Kalimantan Tengah',
        status: item.status || 'Aktif Bertugas',
        kontak: item.kontak || '-',
      }))

      // 4. Logistik Kesehatan
      const rawLogistikList = Array.isArray(json.logistik?.data) ? json.logistik.data : []
      const logistikList = rawLogistikList.map((item: any, idx: number) => ({
        id: `log-${idx + 1}`,
        nama_barang: item.nama_barang || item.item || item.logistik || 'Logistik Kesehatan',
        kategori: item.kategori || 'Alat Kesehatan & APD',
        jumlah: safeParseInt(item.jumlah || item.qty || item.total),
        satuan: item.satuan || 'Pcs',
        sumber: item.sumber || 'Puskris Kemenkes / Dinkes',
        penerima: item.penerima || item.lokasi || 'Dinkes Kab/Kota',
        status: item.status || 'Tersalurkan',
      }))

      // 5. Upaya Penanganan Kesehatan
      const rawUpayaList = Array.isArray(json.upaya?.data) ? json.upaya.data : []

      setEventData((prev: any) => {
        const next = {
          ...prev,
          tgl_laporan: updateText,
          updated_at: updateText,
          meninggal: meninggalVal,
          luka_berat: rawatInapVal,
          luka_ringan: ispaVal,
          luka: totalLukaVal,
          penduduk_terdampak: pendudukTerdampakVal,
          populasi_terdampak: pendudukTerdampakVal,
          ispu_tertinggi: ispuVal,
          ispu_lokasi: ispuLokasi,
          hotspot: ispuVal,
          titik_panas: ispuVal,
          detailData: {
            ...prev.detailData,
            tgl_laporan: updateText,
            updated_at: updateText,
            meninggal: meninggalVal,
            luka_berat: rawatInapVal,
            luka_ringan: ispaVal,
            luka: totalLukaVal,
            penduduk_terdampak: pendudukTerdampakVal,
            populasi_terdampak: pendudukTerdampakVal,
            korban_meninggal: meninggalVal,
            korban_luka_berat: rawatInapVal,
            korban_luka_ringan: ispaVal,
            korban_luka: totalLukaVal,
            ispu_tertinggi: ispuVal,
            ispu_lokasi: ispuLokasi,
            hotspot: ispuVal,
            titik_panas: ispuVal,
            breakdown_kabupaten: breakdownKab.length > 0 ? breakdownKab : prev.detailData.breakdown_kabupaten,
            tck: tckList.length > 0 ? tckList : prev.detailData.tck,
            logistik: logistikList.length > 0 ? logistikList : prev.detailData.logistik,
            upaya_kesehatan: rawUpayaList.length > 0 ? { data: rawUpayaList } : prev.detailData.upaya_kesehatan,
            lokasi: prev.detailData.lokasi || KARHUTLA_LOKASI_COORDINATES,
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
