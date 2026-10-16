'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useHeaderStore } from '@/lib/headerStore'
import {
  Flame,
  Wind,
  HeartPulse,
  AlertTriangle,
  Building2,
  Users,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  BriefcaseMedical,
  Layers,
  Activity,
  MapPin,
  Stethoscope,
  ShieldAlert,
  Warehouse,
  FileSpreadsheet,
  X,
  Loader2
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Dynamic import DisasterMap (OpenLayers Map Engine) to ensure SSR safe execution
const DisasterMap = dynamic(() => import('./DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
      <div className="text-center space-y-3">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Memuat Peta Spasial Karhutla & InaRISK...
        </p>
      </div>
    </div>
  ),
})

// ─── Koordinat Spasial Wilayah untuk Penempatan Titik Peta ─────────────────────
const PROV_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Kalimantan Tengah': { lat: -2.2136, lng: 113.9108 },
  'Kalimantan Barat': { lat: -0.0263, lng: 109.3425 },
  'Kalimantan Selatan': { lat: -3.4402, lng: 114.8385 },
  'Kalimantan Timur': { lat: -0.5021, lng: 117.1537 },
  'Riau': { lat: 0.5071, lng: 101.4478 },
  'Sumatera Selatan': { lat: -2.9909, lng: 104.7565 },
  'Jambi': { lat: -1.6101, lng: 103.6131 },
}

const KAB_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Katingan': { lat: -1.9167, lng: 113.4167 },
  'Kota Palangka Raya': { lat: -2.2136, lng: 113.9108 },
  'Gunung Mas': { lat: -1.1333, lng: 113.8667 },
  'Kotawaringin Barat': { lat: -2.4167, lng: 111.7333 },
  'Kotawaringin Timur': { lat: -2.5361, lng: 112.9572 },
  'Pulang Pisau': { lat: -2.7531, lng: 114.2536 },
  'Kapuas': { lat: -2.8500, lng: 114.3833 },
  'Barito Selatan': { lat: -1.8667, lng: 114.9333 },
  'Barito Utara': { lat: -0.9667, lng: 115.0167 },
  'Murung Raya': { lat: -0.0167, lng: 114.5333 },
  'Seruyan': { lat: -2.3333, lng: 112.2833 },
  'Sukamara': { lat: -2.6333, lng: 111.2333 },
  'Lamandau': { lat: -1.8333, lng: 111.2833 },
  'Barito Timur': { lat: -1.9500, lng: 115.1167 },

  'Ogan Komering Ilir': { lat: -3.3934, lng: 104.8385 },
  'Kota Palembang': { lat: -2.9909, lng: 104.7565 },
  'Musi Banyu Asin': { lat: -2.8833, lng: 103.8167 },
  'Penukal Abab Lematang Ilir (PALI)': { lat: -3.2167, lng: 103.8500 },
  'Kota Prabumulih': { lat: -3.4333, lng: 104.2333 },
  'Musi Rawas': { lat: -3.0833, lng: 103.0167 },
  'Lahat': { lat: -3.7833, lng: 103.5333 },
  'Muara Enim': { lat: -3.6500, lng: 103.7667 },
  'Ogan Ilir': { lat: -3.4333, lng: 104.6667 },

  'Siak': { lat: 0.7963, lng: 102.0489 },
  'Kampar': { lat: 0.3333, lng: 101.0167 },
  'Bengkalis': { lat: 1.4833, lng: 102.1167 },
  'Pelalawan': { lat: 0.3833, lng: 101.8833 },
  'Kota Pekan Baru': { lat: 0.5071, lng: 101.4478 },
  'Meranti': { lat: 0.9833, lng: 102.7000 },
  'Indragiri Hilir': { lat: -0.3333, lng: 103.1667 },
  'Rokan Hulu': { lat: 0.8833, lng: 100.5167 },
  'Kota Dumai': { lat: 1.6667, lng: 101.4500 },

  'Kota Jambi': { lat: -1.6101, lng: 103.6131 },
  'Muaro Jambi': { lat: -1.5333, lng: 103.7833 },
  'Tanjung Jabung Barat': { lat: -0.9833, lng: 103.4833 },
  'Tanjung Jabung Timur': { lat: -1.1833, lng: 103.8833 },
  'Batang Hari': { lat: -1.7500, lng: 103.2500 },
  'Tebo': { lat: -1.4500, lng: 102.4333 },
  'Bungo': { lat: -1.5000, lng: 102.0833 },
  'Sarolangun': { lat: -2.3000, lng: 102.6500 },
  'Merangin': { lat: -2.1500, lng: 102.1333 },

  'Ketapang': { lat: -1.8485, lng: 109.9754 },
  'Kota Pontianak': { lat: -0.0263, lng: 109.3425 },
  'Kubu Raya': { lat: -0.2167, lng: 109.3833 },
  'Sintang': { lat: 0.0667, lng: 111.4833 },
  'Kapuas Hulu': { lat: 0.8167, lng: 112.9333 },
  'Sambas': { lat: 1.3667, lng: 109.3000 },
  'Bengkayang': { lat: 0.9833, lng: 109.6500 },
  'Landak': { lat: 0.4167, lng: 109.7667 },
  'Mempawah': { lat: 0.3667, lng: 108.9667 },
  'Sanggau': { lat: 0.1167, lng: 110.5833 },
  'Sekadau': { lat: 0.0333, lng: 110.9500 },
  'Melawi': { lat: -0.3333, lng: 111.7000 },
  'Kayong Utara': { lat: -1.1833, lng: 109.9167 },
  'Kota Singkawang': { lat: 0.9000, lng: 108.9833 },

  'Banjar': { lat: -3.4141, lng: 114.8528 },
  'Kota Banjar Baru': { lat: -3.4402, lng: 114.8385 },
  'Kota Banjarmasin': { lat: -3.3167, lng: 114.5833 },
  'Barito Kuala': { lat: -3.0000, lng: 114.6167 },
  'Hulu Sungai Selatan': { lat: -2.7167, lng: 115.2000 },
  'Tanah Laut': { lat: -3.8833, lng: 114.8667 },
  'Tanah Bumbu': { lat: -3.4500, lng: 115.7000 },
  'Tapin': { lat: -2.9167, lng: 115.1500 },

  'Kutai Timur': { lat: 0.5333, lng: 117.5500 },
  'Kutai Barat': { lat: -0.4833, lng: 115.7167 },
  'Kota Samarinda': { lat: -0.5021, lng: 117.1537 },
  'Kota Balikpapan': { lat: -1.2654, lng: 116.8312 },
  'Kota Bontang': { lat: 0.1333, lng: 117.5000 },
}

const safeNumber = (val: any): number => {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const parsed = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
  return isNaN(parsed) ? 0 : parsed
}

export default function KarhutlaIndonesiaPage() {
  const router = useRouter()
  const { setHeader, resetHeader } = useHeaderStore()

  // State Management
  const [activeTab, setActiveTab] = useState<'peta' | 'wilayah' | 'surveilans' | 'ispu' | 'logistik' | 'upaya'>('peta')
  const [selectedProvinsi, setSelectedProvinsi] = useState<string>('semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [apiData, setApiData] = useState<any>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedKorbanModal, setSelectedKorbanModal] = useState<any | null>(null)
  const [ispuFilterKategori, setIspuFilterKategori] = useState<string>('semua')
  const [upayaInstansiFilter, setUpayaInstansiFilter] = useState<'semua' | 'kemenkes' | 'dinkes'>('semua')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setHeader({
      title: 'DASHBOARD SITUASI KARHUTLA INDONESIA',
      description:
        'Pemantauan spasial karhutla, kualitas udara ISPU PM2.5, morbiditas ISPA & 7 penyakit lainnya, kesiagaan SDMK, dan logistik kesehatan terintegrasi langsung dari Google Spreadsheet Puskris Kemenkes.',
    })

    return () => {
      resetHeader()
    }
  }, [setHeader, resetHeader])

  // Load data MURNI dari API route /api/karhutla-data
  const fetchKarhutlaData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true)
      setApiError(null)
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const url = `${basePath}/api/karhutla-data${forceRefresh ? '?refresh=true' : ''}`
      const res = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: Gagal memuat data dari API`)
      }
      const json = await res.json()
      if (json && json.success) {
        setApiData(json)
        if (forceRefresh) {
          setToastMessage('Data Karhutla berhasil diperbarui dari Google Spreadsheet!')
          setTimeout(() => setToastMessage(null), 3500)
        }
      } else {
        throw new Error(json?.error || 'Format data API tidak valid')
      }
    } catch (err: any) {
      console.error('[KarhutlaIndonesiaPage] Gagal memuat data:', err)
      setApiError(err?.message || 'Gagal terhubung ke Google Apps Script')
      if (forceRefresh) {
        setToastMessage('Gagal menyegarkan data.')
        setTimeout(() => setToastMessage(null), 3500)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchKarhutlaData()
  }, [])

  // ─── Ekstraksi Murni Data Provinsi (Dinamis dari API) ────────────────────────
  const listProvinsi = useMemo(() => {
    if (Array.isArray(apiData?.ringkasan?.provinsi_terdampak) && apiData.ringkasan.provinsi_terdampak.length > 0) {
      return apiData.ringkasan.provinsi_terdampak
    }
    if (Array.isArray(apiData?.penduduk_terdampak?.by_provinsi)) {
      return apiData.penduduk_terdampak.by_provinsi.map((p: any) => p.provinsi)
    }
    return []
  }, [apiData])

  // ─── Kalkulasi Dinamis Ringkasan Kartu (100% Dari API) ────────────────────────
  const ringkasanKartu = useMemo(() => {
    if (!apiData) {
      return {
        penduduk_terdampak: 0,
        kabupaten_terdampak: 0,
        meninggal: 0,
        rawat_inap: 0,
        kasus_ispa: 0,
        kasus_ispa_balita: 0,
        kasus_penyakit_lainnya: 0,
        stasiun_ispu_berbahaya: 0,
        ispu_tertinggi: null,
        sdmk_digerakkan: 0,
        jumlah_upaya: 0,
        total_masker: 0,
        total_konsentrator: 0,
      }
    }

    const rawKartu = apiData?.ringkasan?.kartu || {}

    // Jika filter provinsi tertentu aktif
    if (selectedProvinsi !== 'semua') {
      const matchProv = (p?: string) => p?.toLowerCase().trim() === selectedProvinsi.toLowerCase().trim()

      // 1. Penduduk & korban dari sheet penduduk_terdampak
      const provPenduduk = (apiData.penduduk_terdampak?.data || []).filter((d: any) => matchProv(d.provinsi))
      const pendudukTot = provPenduduk.reduce((acc: number, cur: any) => acc + safeNumber(cur.penduduk_terdampak), 0)
      const kabTerdampak = provPenduduk.filter((d: any) => safeNumber(d.penduduk_terdampak) > 0).length
      const rawatInap = provPenduduk.reduce((acc: number, cur: any) => acc + safeNumber(cur.korban?.luka_berat_rawat_inap), 0)
      const meninggal = provPenduduk.reduce((acc: number, cur: any) => acc + safeNumber(cur.korban?.meninggal), 0)

      // 2. ISPA
      const provIspa = (apiData.ispa?.data || []).find((d: any) => matchProv(d.provinsi))
      const ispaTot = provIspa?.total_kasus ?? 0
      const ispaBalita = provIspa?.kategori_umur?.le_5_tahun ?? 0

      // 3. Penyakit lainnya
      const provPenyakit = (apiData.penyakit_lainnya?.by_provinsi || []).find((d: any) => matchProv(d.provinsi))
      const penyakitTot = provPenyakit?.total ?? 0

      // 4. ISPU
      const provIspu = (apiData.ispu?.data || []).filter((d: any) => matchProv(d.provinsi) && d.data_tersedia)
      const ispuMax = provIspu.reduce((prev: any, cur: any) => (cur.nilai_ispu > (prev?.nilai_ispu || 0) ? cur : prev), null)
      const ispuBerbahaya = provIspu.filter((d: any) => d.kategori === 'Berbahaya').length

      // 5. SDMK
      const provSdmk = (apiData.sdmk?.data || []).find((d: any) => matchProv(d.provinsi))
      const sdmkTot = provSdmk?.jumlah ?? 0

      // 6. Upaya
      const provUpaya = (apiData.upaya?.data || []).filter((d: any) => matchProv(d.wilayah))
      const upayaTot = provUpaya.length

      // 7. Logistik Masker & Konsentrator khusus provinsi ini
      const dinkesMasker = (apiData.logistik?.dinkes?.data || [])
        .filter((d: any) => matchProv(d.provinsi) && d.jenis_key === 'masker')
        .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)
      const puskrisMasker = (apiData.logistik?.puskris?.data || [])
        .filter((d: any) => matchProv(d.provinsi) && d.jenis_key === 'masker')
        .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)

      const dinkesKons = (apiData.logistik?.dinkes?.data || [])
        .filter((d: any) => matchProv(d.provinsi) && d.jenis_key === 'oksigen_konsentrator')
        .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)
      const puskrisKons = (apiData.logistik?.puskris?.data || [])
        .filter((d: any) => matchProv(d.provinsi) && d.jenis_key === 'oksigen_konsentrator')
        .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)

      return {
        penduduk_terdampak: pendudukTot,
        kabupaten_terdampak: kabTerdampak,
        meninggal: meninggal,
        rawat_inap: rawatInap,
        kasus_ispa: ispaTot,
        kasus_ispa_balita: ispaBalita,
        kasus_penyakit_lainnya: penyakitTot,
        stasiun_ispu_berbahaya: ispuBerbahaya,
        ispu_tertinggi: ispuMax,
        sdmk_digerakkan: sdmkTot,
        jumlah_upaya: upayaTot,
        total_masker: dinkesMasker + puskrisMasker,
        total_konsentrator: dinkesKons + puskrisKons,
      }
    }

    // Default: Rekapitulasi Nasional Murni dari API
    const dinkesMasker = (rawKartu.logistik_dinkes_jenis || []).find((j: any) => j.jenis_key === 'masker')?.jumlah ?? 0
    const puskrisMasker = (rawKartu.logistik_puskris_jenis || []).find((j: any) => j.jenis_key === 'masker')?.jumlah ?? 0
    const dinkesKons = (rawKartu.logistik_dinkes_jenis || []).find((j: any) => j.jenis_key === 'oksigen_konsentrator')?.jumlah ?? 0
    const puskrisKons = (rawKartu.logistik_puskris_jenis || []).find((j: any) => j.jenis_key === 'oksigen_konsentrator')?.jumlah ?? 0

    return {
      penduduk_terdampak: rawKartu.penduduk_terdampak ?? 0,
      kabupaten_terdampak: rawKartu.kabupaten_terdampak ?? 0,
      meninggal: rawKartu.meninggal ?? 0,
      rawat_inap: rawKartu.rawat_inap ?? 0,
      kasus_ispa: rawKartu.kasus_ispa ?? 0,
      kasus_ispa_balita: rawKartu.kasus_ispa_balita ?? 0,
      kasus_penyakit_lainnya: rawKartu.kasus_penyakit_lainnya ?? 0,
      stasiun_ispu_berbahaya: rawKartu.stasiun_ispu_berbahaya ?? 0,
      ispu_tertinggi: rawKartu.ispu_tertinggi ?? null,
      sdmk_digerakkan: rawKartu.sdmk_digerakkan ?? 0,
      jumlah_upaya: rawKartu.jumlah_upaya ?? 0,
      total_masker: dinkesMasker + puskrisMasker,
      total_konsentrator: dinkesKons + puskrisKons,
    }
  }, [apiData, selectedProvinsi])

  // Data Penduduk & Korban Terdampak (Tabel 92 Kabupaten)
  const filteredPendudukData = useMemo(() => {
    const list = apiData?.penduduk_terdampak?.data || []
    return list.filter((item: any) => {
      const matchProv = selectedProvinsi === 'semua' || item.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase()
      const matchSearch =
        searchQuery === '' ||
        item.kabupaten?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provinsi?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchProv && matchSearch
    })
  }, [apiData, selectedProvinsi, searchQuery])

  // Data Stasiun ISPU (48 Stasiun)
  const filteredIspuData = useMemo(() => {
    const list = apiData?.ispu?.data || []
    return list.filter((item: any) => {
      const matchProv = selectedProvinsi === 'semua' || item.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase()
      const matchKat = ispuFilterKategori === 'semua' || item.kategori === ispuFilterKategori
      const matchSearch =
        searchQuery === '' ||
        item.stasiun?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provinsi?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchProv && matchKat && matchSearch
    })
  }, [apiData, selectedProvinsi, ispuFilterKategori, searchQuery])

  // Data Upaya Kesehatan (68 Upaya)
  const filteredUpayaData = useMemo(() => {
    const list = apiData?.upaya?.data || []
    return list.filter((item: any) => {
      const matchProv =
        selectedProvinsi === 'semua' ||
        item.wilayah?.toLowerCase() === selectedProvinsi.toLowerCase() ||
        item.wilayah?.toLowerCase() === 'nasional'
      const matchInstansi =
        upayaInstansiFilter === 'semua' ||
        (upayaInstansiFilter === 'kemenkes' && item.instansi?.includes('KEMENTERIAN')) ||
        (upayaInstansiFilter === 'dinkes' && item.instansi?.includes('DINAS'))
      const matchSearch =
        searchQuery === '' ||
        item.upaya?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.wilayah?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchProv && matchInstansi && matchSearch
    })
  }, [apiData, selectedProvinsi, upayaInstansiFilter, searchQuery])

  // Data Bar Chart ISPA per Provinsi
  const ispaChartData = useMemo(() => {
    const list = apiData?.ispa?.data || []
    return list
      .filter((item: any) => selectedProvinsi === 'semua' || item.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase())
      .map((item: any) => ({
        provinsi: item.provinsi.replace('Kalimantan', 'Kal.').replace('Sumatera', 'Sum.'),
        Balita: item.kategori_umur?.le_5_tahun || 0,
        'Non-Balita': item.kategori_umur?.gt_5_tahun || 0,
        total: item.total_kasus || 0,
      }))
  }, [apiData, selectedProvinsi])

  // Data 7 Penyakit Lainnya
  const penyakitLainnyaChart = useMemo(() => {
    if (selectedProvinsi !== 'semua') {
      const provData = (apiData?.penyakit_lainnya?.by_provinsi || []).find(
        (p: any) => p.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase()
      )
      if (provData && provData.penyakit) {
        return Object.entries(provData.penyakit).map(([name, count]) => ({
          penyakit: name,
          jumlah: Number(count) || 0,
        }))
      }
    }
    const list = apiData?.penyakit_lainnya?.by_penyakit || []
    return list.map((p: any) => ({
      penyakit: p.penyakit,
      jumlah: p.jumlah || 0,
    }))
  }, [apiData, selectedProvinsi])

  // Data Markers untuk Peta Spasial (OpenLayers DisasterMap)
  const mapMarkers = useMemo(() => {
    const markers: any[] = []

    // 1. Tambahkan titik stasiun ISPU riil dari API
    const stasiunList = apiData?.ispu?.data || []
    stasiunList.forEach((st: any) => {
      if (!st.data_tersedia) return
      const coord = KAB_COORDINATES[st.stasiun] || PROV_COORDINATES[st.provinsi]
      if (coord) {
        markers.push({
          id: `ispu-${st.id}`,
          name: `ISPU ${st.stasiun}: ${st.nilai_ispu} (${st.kategori})`,
          bencana_nama: `Indeks Standar Pencemar Udara (${st.kategori})`,
          latitude: coord.lat + (Math.sin(st.no) * 0.05),
          longitude: coord.lng + (Math.cos(st.no) * 0.05),
          korban: st.nilai_ispu,
          tanggal: apiData?.ringkasan?.ispu_update_text || 'Live ISPU',
          status: `Kategori: ${st.kategori} • Parameter: ${st.parameter_kritis || 'PM2.5'}`,
          icon_url: 'https://pusatkrisis.kemkes.go.id/spasial/images/bencana.png',
        })
      }
    })

    // 2. Tambahkan titik kabupaten terdampak dari API
    const kabList = (apiData?.penduduk_terdampak?.data || []).filter(
      (k: any) => safeNumber(k.penduduk_terdampak) > 0 || safeNumber(k.korban?.meninggal) > 0
    )
    kabList.forEach((k: any) => {
      const coord = KAB_COORDINATES[k.kabupaten] || PROV_COORDINATES[k.provinsi]
      if (coord) {
        markers.push({
          id: `kab-${k.id}`,
          name: `${k.kabupaten}, ${k.provinsi}`,
          bencana_nama: 'Wilayah Terdampak Asap Karhutla',
          latitude: coord.lat,
          longitude: coord.lng,
          korban: k.penduduk_terdampak,
          tanggal: 'Live Sheet',
          status: `${k.penduduk_terdampak.toLocaleString('id-ID')} Terdampak • ${k.korban?.luka_berat_rawat_inap || 0} Rawat Inap`,
          icon_url: 'https://pusatkrisis.kemkes.go.id/spasial/images/bencana.png',
        })
      }
    })

    return markers
  }, [apiData])

  // ─── Tampilan Jika Sedang Loading Murni (Tanpa Data Palsu) ─────────────────────
  if (isLoading || !apiData) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f8fafc] p-6 text-slate-700">
        <div className="text-center space-y-4 max-w-md">
          <div className="relative mx-auto h-16 w-16">
            <div className="h-16 w-16 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
            <Flame className="absolute inset-0 m-auto h-7 w-7 text-orange-600 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Memuat Data Situasi Karhutla Indonesia...
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Mengambil data resmi dari Google Spreadsheet EOC Pusat Krisis Kesehatan Kemenkes RI.
            </p>
          </div>
          {apiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
              <p>Gagal memuat feed: {apiError}</p>
              <button
                type="button"
                onClick={() => fetchKarhutlaData(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                <RefreshCw className="h-3 w-3" /> Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] pb-24 text-slate-800">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 shadow-xl text-xs font-bold text-emerald-800 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header Banner ── */}
      <div className="sticky top-0 z-20 border-b border-orange-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-orange-500/20">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  DASHBOARD SITUASI KARHUTLA INDONESIA
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  SIAGA DARURAT BENCANA ASAP
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                  GS FEED LIVE
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Pusat Krisis Kesehatan Kemenkes RI • Waktu Pembaruan Data: <span className="font-bold text-slate-700">{apiData.ringkasan?.ispu_update_text || apiData.updated_at || 'Terbaru'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchKarhutlaData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-orange-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/karhutla-indonesia/tv')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mode TV Command Center
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 pt-6">
        {/* ── Filter Provinsi Interaktif Dinamis ── */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Filter Provinsi:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedProvinsi('semua')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedProvinsi === 'semua'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua Wilayah ({listProvinsi.length} Provinsi)
            </button>
            {listProvinsi.map((prov: string) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvinsi(prov)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedProvinsi === prov
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </section>

        {/* ── 6 Card Ringkasan Eksekutif (100% Real API) ── */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {/* Card 1: Penduduk Terdampak */}
          <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Penduduk Terdampak</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 leading-tight">
              {ringkasanKartu.penduduk_terdampak.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              {ringkasanKartu.kabupaten_terdampak} Kab/Kota Terdampak
            </p>
          </div>

          {/* Card 2: Korban Meninggal & Rawat Inap */}
          <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Korban Jiwa & Inap</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600 leading-tight">
              {ringkasanKartu.meninggal} <span className="text-xs font-bold text-slate-500">Meninggal</span>
            </p>
            <p className="mt-1 text-[11px] font-bold text-rose-700">
              {ringkasanKartu.rawat_inap.toLocaleString('id-ID')} Pasien Rawat Inap
            </p>
          </div>

          {/* Card 3: Kasus ISPA */}
          <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kasus ISPA</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <HeartPulse className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-purple-900 leading-tight">
              {ringkasanKartu.kasus_ispa.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Kasus</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold text-purple-700">
              Balita: {ringkasanKartu.kasus_ispa_balita.toLocaleString('id-ID')} Jiwa
            </p>
          </div>

          {/* Card 4: Kualitas Udara ISPU Terburuk */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 text-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ISPU Tertinggi</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white">
                <Wind className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-400 leading-tight">
              {ringkasanKartu.ispu_tertinggi?.nilai_ispu ?? '-'} <span className="text-xs font-semibold text-white">ISPU</span>
            </p>
            <p className="mt-1 text-[11px] font-bold text-amber-300 truncate">
              {ringkasanKartu.ispu_tertinggi?.stasiun ?? 'Tidak ada stasiun'} ({ringkasanKartu.ispu_tertinggi?.kategori ?? '-'})
            </p>
          </div>

          {/* Card 5: SDMK Digerakkan */}
          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SDMK Digerakkan</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Stethoscope className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-blue-900 leading-tight">
              {ringkasanKartu.sdmk_digerakkan.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Nakes</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold text-blue-700">
              Dokter, Perawat & Kesmas
            </p>
          </div>

          {/* Card 6: Logistik Masker & Oksigen */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Logistik Masker & O2</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <BriefcaseMedical className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-800 leading-tight">
              {ringkasanKartu.total_masker.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-700 truncate">
              {ringkasanKartu.total_konsentrator} Oksigen Konsentrator
            </p>
          </div>
        </section>

        {/* ── Status Sinkronisasi & Cakupan Pemantauan ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Cakupan Wilayah & Integrasi Data Krisis Kesehatan
                </p>
                <p className="text-xs text-slate-500">
                  Sumber data: Google Spreadsheet &quot;DATA DASHBOARD KARHUTLA 2026 PUSKRIS&quot; • {ringkasanKartu.stasiun_ispu_berbahaya} Stasiun ISPU Kategori Berbahaya (&gt;300).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                Wilayah Aktif: <strong className="text-slate-900">{selectedProvinsi === 'semua' ? 'Seluruh Indonesia' : selectedProvinsi}</strong>
              </span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                Total Upaya: <strong className="text-slate-900">{ringkasanKartu.jumlah_upaya} Tindakan</strong>
              </span>
            </div>
          </div>
        </section>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
          {[
            { key: 'peta', label: 'Peta Spasial & InaRISK', icon: Layers },
            { key: 'wilayah', label: `Penduduk Terdampak (${filteredPendudukData.length} Kab/Kota)`, icon: MapPin },
            { key: 'surveilans', label: 'Surveilans ISPA & 7 Penyakit', icon: Activity },
            { key: 'ispu', label: `Kualitas Udara ISPU (${apiData.ispu?.summary?.jumlah_stasiun || 48} Stasiun)`, icon: Wind },
            { key: 'logistik', label: 'Logistik Darurat (Dinkes & Puskris)', icon: BriefcaseMedical },
            { key: 'upaya', label: `SDMK & Upaya Respon (${apiData.upaya?.summary?.total_upaya || 68})`, icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── TAB CONTENT ── */}

        {/* TAB 1: PETA SPASIAL & INARISK */}
        {activeTab === 'peta' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pemetaan Spasial Hotspot, Stasiun Pantau ISPU & Kabupaten Terdampak
                </h2>
                <p className="text-xs text-slate-500">
                  Layer Bahaya Kebakaran Hutan dan Lahan BNPB (InaRISK ArcGIS) terintegrasi dengan koordinat stasiun KLHK.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
                <span className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-0.5 text-white">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  ISPU Berbahaya (&gt;300)
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-rose-100 px-2 py-0.5 text-rose-800">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  Sangat Tidak Sehat (201-300)
                </span>
                <span className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  Tidak Sehat (101-200)
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <DisasterMap
                markers={mapMarkers}
                faskesList={[]}
                poskoList={[]}
                disasterType="Kebakaran Hutan dan Lahan"
                isFloodEocMode={true}
              />
            </div>
          </section>
        )}

        {/* TAB 2: PENDUDUK TERDAMPAK PER KABUPATEN */}
        {activeTab === 'wilayah' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Data Penduduk Terdampak & Dampak Kesehatan per Kabupaten/Kota
                </h2>
                <p className="text-xs text-slate-500">
                  Sumber: Sheet &quot;DATA PENDUDUK TERDAMPAK&quot; • {filteredPendudukData.length} Kabupaten/Kota Terdata.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kabupaten / provinsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium placeholder:text-slate-400 focus:border-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5">Provinsi</th>
                    <th className="px-4 py-3.5">Kabupaten / Kota</th>
                    <th className="px-4 py-3.5 text-right">Penduduk Terdampak</th>
                    <th className="px-4 py-3.5 text-center">Rawat Inap</th>
                    <th className="px-4 py-3.5 text-center">Meninggal</th>
                    <th className="px-4 py-3.5 text-center">Pengungsi</th>
                    <th className="px-4 py-3.5 text-left">Catatan Khusus Korban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPendudukData.map((d: any) => {
                    const meninggal = safeNumber(d.korban?.meninggal)
                    const rawatInap = safeNumber(d.korban?.luka_berat_rawat_inap)
                    const terdampak = safeNumber(d.penduduk_terdampak)

                    return (
                      <tr key={d.id} className="hover:bg-orange-50/40 transition">
                        <td className="px-4 py-3 font-semibold text-slate-700">{d.provinsi}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                            <span>{d.kabupaten}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          {terdampak > 0 ? (
                            terdampak.toLocaleString('id-ID')
                          ) : (
                            <span className="text-slate-300 font-normal">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rawatInap > 0 ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                              {rawatInap} Inap
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {meninggal > 0 ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 font-black text-rose-700 animate-pulse">
                              {meninggal} Jiwa
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {d.korban?.pengungsi || 0}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          {d.keterangan?.meninggal || d.keterangan?.luka_berat_rawat_inap ? (
                            <button
                              type="button"
                              onClick={() => setSelectedKorbanModal(d)}
                              className="text-left font-semibold text-rose-700 hover:underline line-clamp-1"
                            >
                              {d.keterangan?.meninggal || d.keterangan?.luka_berat_rawat_inap}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: SURVEILANS ISPA & 7 PENYAKIT */}
        {activeTab === 'surveilans' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Surveilans Epidemiologi ISPA & 7 Penyakit Akibat Dampak Asap Karhutla
                </h2>
                <p className="text-xs text-slate-500">
                  Total Kasus ISPA: {ringkasanKartu.kasus_ispa.toLocaleString('id-ID')} jiwa • Total Kasus Penyakit Lainnya: {ringkasanKartu.kasus_penyakit_lainnya.toLocaleString('id-ID')} jiwa.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Chart 1: Kasus ISPA per Provinsi (Balita vs Non-Balita) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Distribusi Kasus ISPA (Balita vs Non-Balita)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Data umur riil per provinsi dari sheet &quot;DATA ISPA&quot;.
                    </p>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ispaChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="provinsi" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Balita" fill="#f97316" radius={[4, 4, 0, 0]} name="Balita (≤ 5 Thn)" />
                      <Bar dataKey="Non-Balita" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Non-Balita (> 5 Thn)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: 7 Penyakit Terkait Bencana Karhutla */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      7 Morbiditas Penyakit Terkait Karhutla
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sumber: Sheet &quot;DATA PENYAKIT LAINNYA&quot;.
                    </p>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={penyakitLainnyaChart}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis
                        type="category"
                        dataKey="penyakit"
                        tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="jumlah" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Total Kasus" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabel Rincian 7 Penyakit per Provinsi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Matriks Kasus 7 Penyakit Lainnya per Provinsi
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Provinsi</th>
                      <th className="px-4 py-3 text-right">Diare Akut</th>
                      <th className="px-4 py-3 text-right">Pneumonia</th>
                      <th className="px-4 py-3 text-right">Penyakit Kulit</th>
                      <th className="px-4 py-3 text-right">Keracunan</th>
                      <th className="px-4 py-3 text-right">Sakit Mata</th>
                      <th className="px-4 py-3 text-right">ILI</th>
                      <th className="px-4 py-3 text-right">Heat Stroke</th>
                      <th className="px-4 py-3 text-right font-black text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(apiData.penyakit_lainnya?.by_provinsi || [])
                      .filter((row: any) => selectedProvinsi === 'semua' || row.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase())
                      .map((row: any) => (
                        <tr key={row.provinsi} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{row.provinsi}</td>
                          <td className="px-4 py-2.5 text-right">{row.penyakit['DIARE AKUT']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right text-rose-700 font-bold">{row.penyakit['PNEUMONIA']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right">{row.penyakit['PENYAKIT KULIT (GATAL-GATAL, KUDIS)']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right">{row.penyakit['KERACUNAN PANGAN']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right text-amber-700 font-bold">{row.penyakit['SAKIT MATA']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right">{row.penyakit['ILI (PENYAKIT SERUPA INFLUENZA)']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right">{row.penyakit['HEAT STROKE']?.toLocaleString('id-ID') || 0}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900">{row.total?.toLocaleString('id-ID') || 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: KUALITAS UDARA ISPU */}
        {activeTab === 'ispu' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pemantauan Indeks Standar Pencemar Udara (ISPU - PM2.5)
                </h2>
                <p className="text-xs text-slate-500">
                  {apiData.ispu?.summary?.jumlah_stasiun || 48} Stasiun Sensor KLHK/Kemenkes di Pulau Sumatera & Kalimantan • {apiData.ringkasan?.ispu_update_text}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama stasiun..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-52 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium placeholder:text-slate-400 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <select
                  value={ispuFilterKategori}
                  onChange={(e) => setIspuFilterKategori(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:border-orange-500 focus:outline-hidden"
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="Berbahaya">Berbahaya (&gt;300)</option>
                  <option value="Sangat Tidak Sehat">Sangat Tidak Sehat (201-300)</option>
                  <option value="Tidak Sehat">Tidak Sehat (101-200)</option>
                  <option value="Sedang">Sedang (51-100)</option>
                  <option value="Baik">Baik (0-50)</option>
                </select>
              </div>
            </div>

            {/* 5 Card Legenda Kategori ISPU (Hitungan Murni dari API) */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { cat: 'Baik', rentang: '0 - 50', hex: '#22C55E' },
                { cat: 'Sedang', rentang: '51 - 100', hex: '#3B82F6' },
                { cat: 'Tidak Sehat', rentang: '101 - 200', hex: '#EAB308' },
                { cat: 'Sangat Tidak Sehat', rentang: '201 - 300', hex: '#EF4444' },
                { cat: 'Berbahaya', rentang: '> 300', hex: '#111827' },
              ].map((item) => {
                const count = (apiData.ispu?.data || []).filter(
                  (st: any) =>
                    st.kategori === item.cat &&
                    (selectedProvinsi === 'semua' || st.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase())
                ).length

                return (
                  <div
                    key={item.cat}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{item.rentang}</span>
                      <p className="text-xs font-black text-slate-900">{item.cat}</p>
                    </div>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white"
                      style={{ backgroundColor: item.hex }}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Grid Stasiun ISPU */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredIspuData.map((st: any) => {
                const isBerbahaya = st.kategori === 'Berbahaya'
                const isSangatTidakSehat = st.kategori === 'Sangat Tidak Sehat'
                const isTidakSehat = st.kategori === 'Tidak Sehat'

                let cardBorder = 'border-slate-200'
                let badgeColor = 'bg-slate-100 text-slate-700'
                if (isBerbahaya) {
                  cardBorder = 'border-slate-900 shadow-sm'
                  badgeColor = 'bg-slate-950 text-white'
                } else if (isSangatTidakSehat) {
                  cardBorder = 'border-rose-300'
                  badgeColor = 'bg-rose-100 text-rose-800'
                } else if (isTidakSehat) {
                  cardBorder = 'border-amber-300'
                  badgeColor = 'bg-amber-100 text-amber-800'
                }

                return (
                  <div
                    key={st.id}
                    className={`rounded-2xl border ${cardBorder} bg-white p-4 shadow-xs transition hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Stasiun #{st.no} • {st.provinsi}
                      </span>
                      {st.data_tersedia ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${badgeColor}`}>
                          {st.kategori}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          Data Belum Tersedia
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                      {st.stasiun}
                    </h3>

                    {st.data_tersedia ? (
                      <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Nilai ISPU</span>
                          <p className="text-xl font-black text-slate-900 leading-none mt-0.5">
                            {st.nilai_ispu} <span className="text-xs font-semibold text-slate-400">ISPU</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Parameter Kritis</span>
                          <p className="text-xs font-black text-rose-600 mt-0.5">{st.parameter_kritis || 'PM2.5'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400 italic border-t border-slate-100 pt-2.5">
                        Alat sensor dalam proses kalibrasi atau maintenance jaringan.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* TAB 5: LOGISTIK DARURAT (DINKES & PUSKRIS) */}
        {activeTab === 'logistik' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Distribusi & Ketersediaan Logistik Darurat Klaster Kesehatan
              </h2>
              <p className="text-xs text-slate-500">
                Rekapitulasi logistik dari sheet &quot;DATA LOGISTIK DI DISTRIBUSIKAN PUSKRIS&quot; dan &quot;DATA LOGISTIK DI DISTRIBUSIKAN OLEH DINKES&quot;.
              </p>
            </div>

            {/* Bagian 1: Distribusi oleh Pusat Krisis Kesehatan Kemenkes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Warehouse className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Distribusi Logistik oleh Pusat Krisis Kesehatan (Kemenkes)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Suplai langsung ke Dinas Kesehatan Provinsi dan Penguatan Buffer Stock di Gudang Regional.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {(apiData.logistik?.puskris?.by_jenis || []).map((j: any) => {
                  let jumlahTampil = j.jumlah
                  if (selectedProvinsi !== 'semua') {
                    jumlahTampil = (apiData.logistik?.puskris?.data || [])
                      .filter((d: any) => d.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase() && d.jenis_key === j.jenis_key)
                      .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)
                  }

                  return (
                    <div key={j.jenis_logistik} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-400 truncate">{j.jenis_logistik}</p>
                      <p className="mt-1 text-base font-black text-slate-900">{jumlahTampil.toLocaleString('id-ID')}</p>
                      <span className="text-[10px] font-semibold text-slate-500">{j.satuan}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900">
                <span className="font-bold">Informasi Buffer Stock Regional:</span> Logistik bertanda Buffer Stock tersimpan di Gudang Regional Pusat Krisis Kesehatan Provinsi Sumatera Selatan dan Kalimantan Selatan.
              </div>
            </div>

            {/* Bagian 2: Distribusi oleh Dinas Kesehatan Provinsi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Distribusi Logistik oleh Dinas Kesehatan Provinsi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Didistribusikan ke Puskesmas, Rumah Sakit, dan penduduk terdampak kabut asap.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(apiData.logistik?.dinkes?.by_jenis || []).map((j: any) => {
                  let jumlahTampil = j.jumlah
                  if (selectedProvinsi !== 'semua') {
                    jumlahTampil = (apiData.logistik?.dinkes?.data || [])
                      .filter((d: any) => d.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase() && d.jenis_key === j.jenis_key)
                      .reduce((sum: number, cur: any) => sum + safeNumber(cur.jumlah), 0)
                  }

                  return (
                    <div key={j.jenis_logistik} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-400 truncate">{j.jenis_logistik}</p>
                      <p className="mt-1 text-base font-black text-orange-700">{jumlahTampil.toLocaleString('id-ID')}</p>
                      <span className="text-[10px] font-semibold text-slate-500">{j.satuan}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* TAB 6: SDMK & UPAYA RESPON KESEHATAN */}
        {activeTab === 'upaya' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tenaga Cadangan Kesehatan (SDMK) & Upaya Penanganan Karhutla
              </h2>
              <p className="text-xs text-slate-500">
                Mobilisasi {ringkasanKartu.sdmk_digerakkan.toLocaleString('id-ID')} SDMK dan {filteredUpayaData.length} Tindakan Upaya Respon Strategis dari sheet &quot;DATA UPAYA&quot;.
              </p>
            </div>

            {/* Card SDMK Digerakkan per Provinsi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Sebaran SDMK Daerah Digerakkan Penanganan Karhutla
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(apiData.sdmk?.data || [])
                  .filter((s: any) => selectedProvinsi === 'semua' || s.provinsi?.toLowerCase() === selectedProvinsi.toLowerCase())
                  .map((s: any) => (
                    <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{s.provinsi}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-800">
                          {s.jumlah} Nakes
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {s.keterangan}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Upaya Respon Kesehatan Terpadu */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-orange-600" />
                  Daftar Upaya Penanganan Bidang Kesehatan ({filteredUpayaData.length} Tindakan)
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUpayaInstansiFilter('semua')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      upayaInstansiFilter === 'semua'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpayaInstansiFilter('kemenkes')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      upayaInstansiFilter === 'kemenkes'
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Kemenkes RI
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpayaInstansiFilter('dinkes')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      upayaInstansiFilter === 'dinkes'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Dinas Kesehatan
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredUpayaData.map((u: any, idx: number) => {
                  const isKemenkes = u.instansi?.includes('KEMENTERIAN')
                  return (
                    <div key={u.id} className="py-3 flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isKemenkes ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.instansi}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">• {u.wilayah}</span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">{u.upaya}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── Modal Catatan Diagnosa Korban ── */}
      {selectedKorbanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                  Catatan Medis Korban Karhutla
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">{selectedKorbanModal.kabupaten}</h3>
                <p className="text-xs text-slate-500">{selectedKorbanModal.provinsi}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKorbanModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
                <p className="font-bold text-rose-900 text-xs">Keterangan Medis Resmi:</p>
                <p className="mt-1 text-rose-800 whitespace-pre-line leading-relaxed font-medium">
                  {selectedKorbanModal.keterangan?.meninggal || selectedKorbanModal.keterangan?.luka_berat_rawat_inap || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedKorbanModal(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
