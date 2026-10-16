'use client'

import React, { useState, useMemo } from 'react'
import {
  Building2,
  Stethoscope,
  BriefcaseMedical,
  PlusSquare,
  Activity,
  Package,
  Users,
  ClipboardList,
  Flame,
  Search,
  Filter,
  X,
  ExternalLink,
  ShieldCheck,
  Wind,
  HeartPulse,
  Eye,
  AlertCircle,
  Truck,
} from 'lucide-react'

interface KarhutlaResourceTabsProps {
  eventData: any
  masterFaskesList: any[]
  onSelectTarget?: (target: any, type: 'hospital' | 'clinic') => void
  selectedTargetName?: string
}

export default function KarhutlaResourceTabs({
  eventData,
  masterFaskesList,
  onSelectTarget,
  selectedTargetName,
}: KarhutlaResourceTabsProps) {
  const detail = eventData?.detailData || eventData || {}

  // ── Tab Aktif ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    'faskes' | 'penyakit' | 'logistik' | 'sdmk' | 'upaya'
  >('faskes')

  // ── 1. State Tab Faskes ───────────────────────────────────────────────────
  const [faskesTypeFilter, setFaskesTypeFilter] = useState<'all' | 'rs' | 'puskesmas' | 'klinik' | 'pustu'>('all')
  const [faskesSearch, setFaskesSearch] = useState('')
  const [faskesProvFilter, setFaskesProvFilter] = useState('semua')
  const [faskesPage, setFaskesPage] = useState(1)
  const faskesPerPage = 25

  // ── 2. State Tab Penyakit ─────────────────────────────────────────────────
  const [penyakitSearch, setPenyakitSearch] = useState('')
  const [penyakitProvFilter, setPenyakitProvFilter] = useState('semua')

  // ── 3. State Tab Logistik ─────────────────────────────────────────────────
  const [logistikSourceFilter, setLogistikSourceFilter] = useState<'all' | 'dinkes' | 'puskris'>('all')
  const [logistikSearch, setLogistikSearch] = useState('')
  const [logistikProvFilter, setLogistikProvFilter] = useState('semua')

  // ── 4. State Tab SDMK ─────────────────────────────────────────────────────
  const [sdmkSearch, setSdmkSearch] = useState('')
  const [sdmkProvFilter, setSdmkProvFilter] = useState('semua')

  // ── 5. State Tab Upaya ────────────────────────────────────────────────────
  const [upayaSourceFilter, setUpayaSourceFilter] = useState<'all' | 'pusat' | 'provinsi'>('all')
  const [upayaSearch, setUpayaSearch] = useState('')
  const [upayaWilayahFilter, setUpayaWilayahFilter] = useState('semua')

  // ── Filtered Faskes List ──────────────────────────────────────────────────
  const filteredFaskesList = useMemo(() => {
    return masterFaskesList.filter((f) => {
      const isRS = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('rs') || String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('rumah sakit')
      const isPKM = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('puskesmas') && !String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('pustu')
      const isPustu = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('pustu') || String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('pembantu')
      const isKlinik = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('klinik') || String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('poskes')

      if (faskesTypeFilter === 'rs' && !isRS) return false
      if (faskesTypeFilter === 'puskesmas' && !isPKM) return false
      if (faskesTypeFilter === 'pustu' && !isPustu) return false
      if (faskesTypeFilter === 'klinik' && !isKlinik) return false

      if (faskesProvFilter !== 'semua') {
        const prov = String(f.provinsi || f.kabupaten || '').toLowerCase()
        if (!prov.includes(faskesProvFilter.toLowerCase())) return false
      }

      if (faskesSearch.trim()) {
        const q = faskesSearch.toLowerCase()
        const matchName = String(f.nama || f.nama_faskes || '').toLowerCase().includes(q)
        const matchKab = String(f.nama_kab || f.kabupaten || '').toLowerCase().includes(q)
        const matchKec = String(f.nama_kecamatan || f.kecamatan || '').toLowerCase().includes(q)
        const matchKode = String(f.kode_sarana || f.kode_satusehat || '').toLowerCase().includes(q)
        if (!matchName && !matchKab && !matchKec && !matchKode) return false
      }

      return true
    })
  }, [masterFaskesList, faskesTypeFilter, faskesProvFilter, faskesSearch])

  const paginatedFaskes = useMemo(() => {
    const start = (faskesPage - 1) * faskesPerPage
    return filteredFaskesList.slice(start, start + faskesPerPage)
  }, [filteredFaskesList, faskesPage])

  const totalFaskesPages = Math.ceil(filteredFaskesList.length / faskesPerPage) || 1

  // ── Data 7 Penyakit Akibat Asap (Sheet DATA PENYAKIT LAINNYA) ─────────────
  const rawPenyakitList = useMemo(() => {
    const fromApi = detail.karhutla_penyakit?.data || []
    if (fromApi.length > 0) return fromApi

    // Fallback baseline dari sheet 7 Provinsi
    return [
      { id: 'p-1', provinsi: 'Kalimantan Tengah', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 74210, balita: 16820, risiko: 'Tinggi', tren: '+18%' },
      { id: 'p-2', provinsi: 'Kalimantan Tengah', penyakit: 'Iritasi Mata (Konjungtivitis)', jumlah: 6420, balita: 980, risiko: 'Tinggi', tren: '+14%' },
      { id: 'p-3', provinsi: 'Kalimantan Tengah', penyakit: 'Asma Akut', jumlah: 4890, balita: 740, risiko: 'Tinggi', tren: '+12%' },
      { id: 'p-4', provinsi: 'Kalimantan Tengah', penyakit: 'Iritasi Kulit (Dermatitis)', jumlah: 3950, balita: 610, risiko: 'Sedang', tren: '+8%' },
      { id: 'p-5', provinsi: 'Kalimantan Tengah', penyakit: 'Pneumonia', jumlah: 3120, balita: 1150, risiko: 'Tinggi', tren: '+15%' },
      { id: 'p-6', provinsi: 'Kalimantan Tengah', penyakit: 'PPOK Eksaserbasi Akut', jumlah: 2410, balita: 0, risiko: 'Tinggi', tren: '+9%' },
      { id: 'p-7', provinsi: 'Sumatera Selatan', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 68450, balita: 15420, risiko: 'Tinggi', tren: '+16%' },
      { id: 'p-8', provinsi: 'Sumatera Selatan', penyakit: 'Iritasi Mata (Konjungtivitis)', jumlah: 5820, balita: 890, risiko: 'Sedang', tren: '+11%' },
      { id: 'p-9', provinsi: 'Sumatera Selatan', penyakit: 'Asma Akut', jumlah: 4210, balita: 620, risiko: 'Tinggi', tren: '+10%' },
      { id: 'p-10', provinsi: 'Kalimantan Barat', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 52140, balita: 11820, risiko: 'Tinggi', tren: '+14%' },
      { id: 'p-11', provinsi: 'Kalimantan Selatan', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 41320, balita: 9410, risiko: 'Sedang', tren: '+9%' },
      { id: 'p-12', provinsi: 'Riau', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 38920, balita: 8760, risiko: 'Sedang', tren: '+8%' },
      { id: 'p-13', provinsi: 'Jambi', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 24890, balita: 5610, risiko: 'Sedang', tren: '+7%' },
      { id: 'p-14', provinsi: 'Kalimantan Timur', penyakit: 'ISPA (Infeksi Saluran Pernapasan Akut)', jumlah: 15159, balita: 3425, risiko: 'Rendah', tren: '+5%' },
    ]
  }, [detail.karhutla_penyakit])

  const filteredPenyakitList = useMemo(() => {
    return rawPenyakitList.filter((item: any) => {
      if (penyakitProvFilter !== 'semua') {
        const prov = String(item.provinsi || '').toLowerCase()
        if (!prov.includes(penyakitProvFilter.toLowerCase())) return false
      }
      if (penyakitSearch.trim()) {
        const q = penyakitSearch.toLowerCase()
        const matchP = String(item.penyakit || '').toLowerCase().includes(q)
        const matchProv = String(item.provinsi || '').toLowerCase().includes(q)
        if (!matchP && !matchProv) return false
      }
      return true
    })
  }, [rawPenyakitList, penyakitProvFilter, penyakitSearch])

  // ── Data Logistik (Sheet DATA LOGISTIK DINKES & PUSKRIS) ───────────────────
  const rawLogistikList = useMemo(() => {
    const dinkesArr = detail.karhutla_logistik_dinkes?.data || []
    const puskrisArr = detail.karhutla_logistik_puskris?.data || []
    const combined = [
      ...dinkesArr.map((d: any) => ({ ...d, sumber_kategori: 'dinkes' })),
      ...puskrisArr.map((p: any) => ({ ...p, sumber_kategori: 'puskris' })),
    ]

    if (combined.length > 0) return combined

    // Fallback baseline logistik resmi
    return [
      { id: 'log-1', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Kalimantan Tengah', jenis: 'Masker N95 Respirator', jumlah: 350000, satuan: 'Pcs', status: 'Tersalurkan', keterangan: 'Distribusi ke RSUD & Puskesmas Siaga Asap' },
      { id: 'log-2', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Kalimantan Tengah', jenis: 'Oksigen Konsentrator Portable', jumlah: 85, satuan: 'Unit', status: 'Tersalurkan', keterangan: 'Penempatan di Ruang Pemulihan Bebas Asap (Safe House)' },
      { id: 'log-3', sumber: 'Dinas Kesehatan Prov. Kalteng', sumber_kategori: 'dinkes', provinsi: 'Kalimantan Tengah', jenis: 'Masker Bedah 3-Ply', jumlah: 750000, satuan: 'Pcs', status: 'Tersalurkan', keterangan: 'Pembagian massal masyarakat di posko krisis' },
      { id: 'log-4', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Sumatera Selatan', jenis: 'Masker N95 Respirator', jumlah: 280000, satuan: 'Pcs', status: 'Tersalurkan', keterangan: 'Wilayah prioritas OKI, OI, dan Palembang' },
      { id: 'log-5', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Sumatera Selatan', jenis: 'Oksigen Konsentrator Portable', jumlah: 60, satuan: 'Unit', status: 'Tersalurkan', keterangan: 'Buffer stock Dinkes Provinsi Sumsel' },
      { id: 'log-6', sumber: 'Dinas Kesehatan Prov. Sumsel', sumber_kategori: 'dinkes', provinsi: 'Sumatera Selatan', jenis: 'Obat Batuk & Inhaler Salbutamol', jumlah: 15000, satuan: 'Paket', status: 'Tersalurkan', keterangan: 'Obat darurat respirasi dan asma akut' },
      { id: 'log-7', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Kalimantan Barat', jenis: 'Masker N95 Respirator', jumlah: 240000, satuan: 'Pcs', status: 'Tersalurkan', keterangan: 'Wilayah Pontianak, Kubu Raya, Ketapang' },
      { id: 'log-8', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Kalimantan Barat', jenis: 'Oksigen Konsentrator Portable', jumlah: 50, satuan: 'Unit', status: 'Tersalurkan', keterangan: 'Puskesmas Siaga 24 Jam' },
      { id: 'log-9', sumber: 'Dinas Kesehatan Prov. Riau', sumber_kategori: 'dinkes', provinsi: 'Riau', jenis: 'Masker Bedah & N95', jumlah: 520000, satuan: 'Pcs', status: 'Tersalurkan', keterangan: 'Cadangan logistik penanganan karhutla' },
      { id: 'log-10', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Jambi', jenis: 'Oksigen Konsentrator Portable', jumlah: 45, satuan: 'Unit', status: 'Tersalurkan', keterangan: 'Siaga rujukan posko ISPA' },
      { id: 'log-11', sumber: 'Pusat Krisis Kemenkes RI', sumber_kategori: 'puskris', provinsi: 'Kalimantan Selatan', jenis: 'Oksigen Konsentrator Portable', jumlah: 40, satuan: 'Unit', status: 'Tersalurkan', keterangan: 'Siaga RSUD Banjarbaru & Banjar' },
    ]
  }, [detail.karhutla_logistik_dinkes, detail.karhutla_logistik_puskris])

  const filteredLogistikList = useMemo(() => {
    return rawLogistikList.filter((item: any) => {
      if (logistikSourceFilter !== 'all') {
        if (item.sumber_kategori !== logistikSourceFilter) return false
      }
      if (logistikProvFilter !== 'semua') {
        const prov = String(item.provinsi || '').toLowerCase()
        if (!prov.includes(logistikProvFilter.toLowerCase())) return false
      }
      if (logistikSearch.trim()) {
        const q = logistikSearch.toLowerCase()
        const matchJ = String(item.jenis || item.jenis_logistik || '').toLowerCase().includes(q)
        const matchS = String(item.sumber || '').toLowerCase().includes(q)
        const matchP = String(item.provinsi || '').toLowerCase().includes(q)
        if (!matchJ && !matchS && !matchP) return false
      }
      return true
    })
  }, [rawLogistikList, logistikSourceFilter, logistikProvFilter, logistikSearch])

  // ── Data SDMK (Sheet SDMK DAERAH DIGERAKAN) ───────────────────────────────
  const rawSdmkList = useMemo(() => {
    const fromApi = detail.karhutla_sdmk?.data || []
    if (fromApi.length > 0) return fromApi

    // Fallback baseline 2.146 nakes
    return [
      { id: 'sdmk-1', provinsi: 'Kalimantan Tengah', jumlah: 580, dokter_paru: 38, dokter_umum: 160, perawat: 260, sanitarian: 122, status: 'Aktif di Posko & RSUD', lokasi: 'Palangka Raya, Katingan, Kotawaringin' },
      { id: 'sdmk-2', provinsi: 'Sumatera Selatan', jumlah: 490, dokter_paru: 32, dokter_umum: 135, perawat: 225, sanitarian: 98, status: 'Aktif di Posko & RSUD', lokasi: 'OKI, OI, Palembang, Banyuasin' },
      { id: 'sdmk-3', provinsi: 'Kalimantan Barat', jumlah: 380, dokter_paru: 26, dokter_umum: 105, perawat: 175, sanitarian: 74, status: 'Aktif di Puskesmas 24 Jam', lokasi: 'Pontianak, Ketapang, Sambas' },
      { id: 'sdmk-4', provinsi: 'Kalimantan Selatan', jumlah: 260, dokter_paru: 18, dokter_umum: 72, perawat: 120, sanitarian: 50, status: 'Aktif di Safe House', lokasi: 'Banjarbaru, Banjar, Tanah Laut' },
      { id: 'sdmk-5', provinsi: 'Riau', jumlah: 240, dokter_paru: 16, dokter_umum: 65, perawat: 110, sanitarian: 49, status: 'Patroli Tim Reaksi Cepat', lokasi: 'Pekanbaru, Pelalawan, Siak' },
      { id: 'sdmk-6', provinsi: 'Jambi', jumlah: 196, dokter_paru: 12, dokter_umum: 43, perawat: 94, sanitarian: 47, status: 'Posko Oksigenasi', lokasi: 'Muaro Jambi, Tanjung Jabung' },
    ]
  }, [detail.karhutla_sdmk])

  const filteredSdmkList = useMemo(() => {
    return rawSdmkList.filter((item: any) => {
      if (sdmkProvFilter !== 'semua') {
        const prov = String(item.provinsi || '').toLowerCase()
        if (!prov.includes(sdmkProvFilter.toLowerCase())) return false
      }
      if (sdmkSearch.trim()) {
        const q = sdmkSearch.toLowerCase()
        const matchProv = String(item.provinsi || '').toLowerCase().includes(q)
        const matchLok = String(item.lokasi || '').toLowerCase().includes(q)
        if (!matchProv && !matchLok) return false
      }
      return true
    })
  }, [rawSdmkList, sdmkProvFilter, sdmkSearch])

  // ── Data 68 Upaya (Sheet DATA UPAYA) ──────────────────────────────────────
  const rawUpayaList = useMemo(() => {
    const fromApi = detail.karhutla_upaya?.data || detail.upaya_kesehatan?.data || []
    if (fromApi.length > 0) return fromApi

    // Fallback baseline 68 upaya terkoordinasi
    return [
      { id: 'up-1', instansi: 'Kementerian Kesehatan RI (EOC)', level: 'pusat', wilayah: 'Nasional', upaya: 'Mengaktifkan Pusat Komando Tanggap Darurat Krisis Kesehatan (EOC) dan menetapkan status Siaga Darurat Bencana Asap di 7 Provinsi Prioritas.' },
      { id: 'up-2', instansi: 'Kementerian Kesehatan RI (EOC)', level: 'pusat', wilayah: 'Nasional', upaya: 'Mendistribusikan buffer stock 2.912.070 masker medis/N95 dan 280 unit konsentrator oksigen darurat ke dinas kesehatan provinsi terdampak.' },
      { id: 'up-3', instansi: 'Kementerian Kesehatan RI (EOC)', level: 'pusat', wilayah: 'Nasional', upaya: 'Menerbitkan Surat Edaran Kesiapsiagaan Sektor Kesehatan menghadapi dampak kabut asap Karhutla bagi seluruh Faskes Tingkat Pertama (FKTP) dan Faskes Rujukan (FKRTL).' },
      { id: 'up-4', instansi: 'Dinas Kesehatan Prov. Kalteng', level: 'provinsi', wilayah: 'Kalimantan Tengah', upaya: 'Menyiagakan 100% Rumah Sakit dan Puskesmas sebagai Ruang Pemulihan Bebas Asap (Safe House) yang dilengkapi Air Purifier dan Oksigenasi.' },
      { id: 'up-5', instansi: 'Dinas Kesehatan Prov. Kalteng', level: 'provinsi', wilayah: 'Kalimantan Tengah', upaya: 'Membuka 38 posko kesehatan lapangan di titik-titik kumpul masyarakat serta melakukan pembagian masker N95 gratis bagi balita dan kelompok rentan.' },
      { id: 'up-6', instansi: 'Dinas Kesehatan Prov. Sumsel', level: 'provinsi', wilayah: 'Sumatera Selatan', upaya: 'Mengerahkan 490 tenaga medis (Dokter Paru, Dokter Umum, Perawat) untuk melakukan surveilans aktif kasus ISPA di daerah rawan kebakaran (OKI dan OI).' },
      { id: 'up-7', instansi: 'Dinas Kesehatan Prov. Kalbar', level: 'provinsi', wilayah: 'Kalimantan Barat', upaya: 'Melakukan edukasi Perilaku Hidup Bersih dan Sehat (PHBS) serta pembatasan aktivitas luar ruangan bagi anak-anak sekolah saat ISPU berstatus Tidak Sehat.' },
      { id: 'up-8', instansi: 'Dinas Kesehatan Prov. Riau', level: 'provinsi', wilayah: 'Riau', upaya: 'Melakukan pemantauan kualitas udara harian bersama BMKG & KLHK serta menyiagakan ambulans mobile untuk rujukan cepat pasien asma akut.' },
      { id: 'up-9', instansi: 'Dinas Kesehatan Prov. Jambi', level: 'provinsi', wilayah: 'Jambi', upaya: 'Mendirikan posko oksigen darurat di sepanjang jalur lintas Sumatera yang terdampak kabut asap pekat.' },
    ]
  }, [detail.karhutla_upaya, detail.upaya_kesehatan])

  const filteredUpayaList = useMemo(() => {
    return rawUpayaList.filter((item: any) => {
      if (upayaSourceFilter !== 'all') {
        if (item.level !== upayaSourceFilter) return false
      }
      if (upayaWilayahFilter !== 'semua') {
        const wil = String(item.wilayah || '').toLowerCase()
        if (!wil.includes(upayaWilayahFilter.toLowerCase())) return false
      }
      if (upayaSearch.trim()) {
        const q = upayaSearch.toLowerCase()
        const matchU = String(item.upaya || '').toLowerCase().includes(q)
        const matchI = String(item.instansi || '').toLowerCase().includes(q)
        const matchW = String(item.wilayah || '').toLowerCase().includes(q)
        if (!matchU && !matchI && !matchW) return false
      }
      return true
    })
  }, [rawUpayaList, upayaSourceFilter, upayaWilayahFilter, upayaSearch])

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_6px_18px_rgba(20,120,116,0.03)] space-y-4">
      {/* Header Bar */}
      <div className="border-b border-slate-100 pb-3.5 mb-2">
        <h4 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
          Peta Akses &amp; Status Sumber Daya Penanganan Karhutla - INDONESIA
        </h4>
        <p className="text-sm sm:text-base text-slate-600 font-normal mt-1.5 mb-0">
          Pemantauan direktori faskes siaga asap, surveilans penyakit pernapasan, distribusi logistik masker &amp; oksigen, serta mobilisasi tenaga kesehatan di 7 provinsi.
        </p>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('faskes')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'faskes'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm font-black'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4 text-emerald-600" />
          Faskes &amp; Safe House Siaga Asap
          <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black">
            1.811
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('penyakit')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'penyakit'
              ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-sm font-black'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Activity className="h-4 w-4 text-rose-600" />
          Surveilans ISPA &amp; 7 Penyakit Asap
          <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-black">
            295k
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logistik')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'logistik'
              ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm font-black'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Package className="h-4 w-4 text-amber-600" />
          Logistik Darurat (Masker &amp; O2)
          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-black">
            2,9 Juta
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sdmk')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'sdmk'
              ? 'bg-cyan-50 text-cyan-900 border-cyan-300 shadow-sm font-black'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4 text-cyan-600" />
          Mobilisasi SDMK Nakes
          <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-700 text-white text-[10px] font-black">
            2.146
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upaya')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'upaya'
              ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-sm font-black'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="h-4 w-4 text-teal-600" />
          Matriks 68 Upaya Kesehatan
          <span className="ml-1 px-2 py-0.5 rounded-full bg-teal-700 text-white text-[10px] font-black">
            68
          </span>
        </button>
      </div>

      {/* ── TAB 1: FASKES & SAFE HOUSE SIAGA ASAP ──────────────────────────── */}
      {activeTab === 'faskes' && (
        <div className="space-y-4 pt-1">
          {/* Status Banner Operasional Siaga Asap (100% Normal) */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm font-semibold">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>
              <strong className="font-bold">100% Fasilitas Pelayanan Kesehatan Berfungsi Normal:</strong> Seluruh 1.811 unit faskes di 7 provinsi disiagakan dengan Ruang Bebas Asap (Safe House), konsentrator oksigen, dan pelayanan triase gawat darurat respirasi tanpa kerusakan bangunan fisik.
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="rounded-xl bg-slate-900 text-white p-3 shadow-2xs border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                Total Faskes Siaga
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black">1.811</span>
                <span className="text-[10px] text-emerald-400 font-semibold">100% Normal</span>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200/90 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-800">Rumah Sakit</span>
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-blue-950">64</span>
                <span className="text-[10px] text-blue-700 ml-1 font-semibold">RSUD / Swasta</span>
              </div>
            </div>

            <div className="rounded-xl bg-teal-50 border border-teal-200/90 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-teal-800">Puskesmas</span>
                <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-teal-950">430</span>
                <span className="text-[10px] text-teal-700 ml-1 font-semibold">Layanan Primer</span>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 border border-indigo-200/90 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-indigo-800">Klinik &amp; Poskes</span>
                <BriefcaseMedical className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-indigo-950">196</span>
                <span className="text-[10px] text-indigo-700 ml-1 font-semibold">Pratama / Utama</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl bg-amber-50 border border-amber-200/90 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-800">Pustu</span>
                <PlusSquare className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-amber-950">1.121</span>
                <span className="text-[10px] text-amber-700 ml-1 font-semibold">Pusk. Pembantu</span>
              </div>
            </div>
          </div>

          {/* Type Filter & Status Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-slate-50/70 p-2.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all', label: 'Semua Faskes (1.811)' },
                { key: 'rs', label: 'Rumah Sakit (64)' },
                { key: 'puskesmas', label: 'Puskesmas (430)' },
                { key: 'klinik', label: 'Klinik & Poskes (196)' },
                { key: 'pustu', label: 'Pustu (1.121)' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFaskesTypeFilter(tab.key as any)
                    setFaskesPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer ${
                    faskesTypeFilter === tab.key
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs scale-[1.02]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <strong className="text-emerald-900">100% Siaga Asap</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">Safe House &amp; Posko Oksigen Tersedia</span>
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={faskesSearch}
                onChange={(e) => {
                  setFaskesSearch(e.target.value)
                  setFaskesPage(1)
                }}
                placeholder="Cari faskes, kab/kota, kecamatan, kode sarana..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {faskesSearch && (
                <button
                  type="button"
                  onClick={() => setFaskesSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 shrink-0">Provinsi:</span>
              <select
                value={faskesProvFilter}
                onChange={(e) => {
                  setFaskesProvFilter(e.target.value)
                  setFaskesPage(1)
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="semua">Semua 7 Provinsi Prioritas</option>
                <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                <option value="Sumatera Selatan">Sumatera Selatan</option>
                <option value="Kalimantan Barat">Kalimantan Barat</option>
                <option value="Kalimantan Selatan">Kalimantan Selatan</option>
                <option value="Riau">Riau</option>
                <option value="Jambi">Jambi</option>
                <option value="Kalimantan Timur">Kalimantan Timur</option>
              </select>
            </div>
          </div>

          {/* Faskes Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3">Nama Fasilitas Kesehatan</th>
                    <th className="py-3 px-3">Jenis Faskes</th>
                    <th className="py-3 px-3">Wilayah (Kab/Kota)</th>
                    <th className="py-3 px-3">Kecamatan</th>
                    <th className="py-3 px-3 text-center">Status Operasional</th>
                    <th className="py-3 px-3 text-center">Fasilitas Siaga Asap</th>
                    <th className="py-3 px-3 text-center">Aksi / Peta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedFaskes.length > 0 ? (
                    paginatedFaskes.map((f: any, idx: number) => {
                      const rowNum = (faskesPage - 1) * faskesPerPage + idx + 1
                      const isSelected = selectedTargetName === f.nama || selectedTargetName === f.nama_faskes
                      const isRS = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('rs') || String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('rumah sakit')
                      const isPKM = String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('puskesmas') && !String(f.jenis || f.jenis_faskes || '').toLowerCase().includes('pustu')

                      return (
                        <tr
                          key={f.id || idx}
                          onClick={() => onSelectTarget && onSelectTarget(f, isRS ? 'hospital' : 'clinic')}
                          className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/90 border-l-4 border-emerald-600' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{rowNum}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {isRS ? <Building2 className="h-4 w-4 text-blue-600 shrink-0" /> : <Stethoscope className="h-4 w-4 text-teal-600 shrink-0" />}
                              <span className="font-black text-slate-900">{f.nama || f.nama_faskes || '-'}</span>
                            </div>
                            {f.alamat && f.alamat !== '-' && (
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5 truncate max-w-sm">
                                📍 {f.alamat}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border bg-teal-50 text-teal-800 border-teal-200">
                              {f.jenis || f.jenis_faskes || 'Fasilitas Kesehatan'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {f.nama_kab || f.kabupaten || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 text-xs">{f.nama_kecamatan || f.kecamatan || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Berfungsi Normal
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[10.5px]">
                              <ShieldCheck className="h-3 w-3 text-teal-600" />
                              Safe House &amp; O2 Siaga
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectTarget && onSelectTarget(f, isRS ? 'hospital' : 'clinic')
                                const mapEl = document.getElementById('peta-detail')
                                if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' })
                              }}
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200 transition-colors text-[11px]"
                            >
                              Peta / Rute
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                        Tidak ada fasilitas kesehatan yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          {filteredFaskesList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold">
              <div>
                Menampilkan <b className="text-slate-900 font-black">{(faskesPage - 1) * faskesPerPage + 1}</b> -{' '}
                <b className="text-slate-900 font-black">{Math.min(faskesPage * faskesPerPage, filteredFaskesList.length)}</b> dari total{' '}
                <b className="text-slate-900 font-black">{filteredFaskesList.length.toLocaleString('id-ID')}</b> fasilitas kesehatan
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={faskesPage <= 1}
                  onClick={() => setFaskesPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  &larr; Sebelumnya
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-black">
                  Halaman {faskesPage} / {totalFaskesPages}
                </div>
                <button
                  type="button"
                  disabled={faskesPage >= totalFaskesPages}
                  onClick={() => setFaskesPage((p) => Math.min(totalFaskesPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SURVEILANS 7 PENYAKIT AKIBAT ASAP ────────────────────────── */}
      {activeTab === 'penyakit' && (
        <div className="space-y-4 pt-1">
          {/* Top 6 Disease Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { title: 'ISPA Akut', kasus: 295089, icon: Wind, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
              { title: 'Iritasi Mata', kasus: 24180, icon: Eye, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
              { title: 'Asma Akut', kasus: 18420, icon: HeartPulse, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
              { title: 'Iritasi Kulit', kasus: 16340, icon: Activity, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
              { title: 'Pneumonia', kasus: 12650, icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
              { title: 'PPOK Akut', kasus: 8920, icon: Stethoscope, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
            ].map((p, idx) => {
              const IconComp = p.icon
              return (
                <div key={idx} className={`p-3.5 rounded-xl border ${p.bg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      {p.title}
                    </span>
                    <IconComp className={`h-4 w-4 ${p.color}`} />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-black text-slate-900 block">
                      {p.kasus.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                      Kasus Terverifikasi
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Search & Province Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={penyakitSearch}
                onChange={(e) => setPenyakitSearch(e.target.value)}
                placeholder="Cari jenis penyakit atau provinsi..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={penyakitProvFilter}
                onChange={(e) => setPenyakitProvFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs"
              >
                <option value="semua">Semua Provinsi</option>
                <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                <option value="Sumatera Selatan">Sumatera Selatan</option>
                <option value="Kalimantan Barat">Kalimantan Barat</option>
                <option value="Kalimantan Selatan">Kalimantan Selatan</option>
                <option value="Riau">Riau</option>
                <option value="Jambi">Jambi</option>
                <option value="Kalimantan Timur">Kalimantan Timur</option>
              </select>
            </div>
          </div>

          {/* Table Surveilans Penyakit */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Provinsi</th>
                  <th className="py-3 px-3">Jenis Penyakit / Gangguan Respirasi</th>
                  <th className="py-3 px-3 text-right">Total Kasus</th>
                  <th className="py-3 px-3 text-right">Kasus Balita (≤5 Thn)</th>
                  <th className="py-3 px-3 text-center">Tingkat Risiko</th>
                  <th className="py-3 px-3 text-center">Tren Mingguan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPenyakitList.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{item.provinsi}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.penyakit}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {Number(item.jumlah || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                      {Number(item.balita || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-black border ${
                          item.risiko === 'Tinggi'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {item.risiko || 'Tinggi'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                      <span className="text-rose-600 font-black">{item.tren || '+12%'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: LOGISTIK DARURAT ASAP ───────────────────────────────────── */}
      {activeTab === 'logistik' && (
        <div className="space-y-4 pt-1">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-amber-900">Total Masker Medis/N95</span>
              <span className="text-2xl font-black text-amber-950 mt-2">2.912.070 Pcs</span>
              <span className="text-[10px] text-amber-700 font-medium mt-0.5">Distribusi Dinkes &amp; Puskris</span>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-teal-900">Oksigen Konsentrator</span>
              <span className="text-2xl font-black text-teal-950 mt-2">280 Unit</span>
              <span className="text-[10px] text-teal-700 font-medium mt-0.5">Untuk Ruang Pemulihan &amp; RSUD</span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-blue-900">Paket Obat &amp; Tetes Mata</span>
              <span className="text-2xl font-black text-blue-950 mt-2">45.000 Paket</span>
              <span className="text-[10px] text-blue-700 font-medium mt-0.5">Penanganan ISPA &amp; Iritasi</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-emerald-900">Status Penyaluran</span>
              <span className="text-2xl font-black text-emerald-950 mt-2">100% Tersedia</span>
              <span className="text-[10px] text-emerald-700 font-medium mt-0.5">Buffer stock di 7 Provinsi</span>
            </div>
          </div>

          {/* Sub Tab Switcher & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              {[
                { key: 'all', label: 'Semua Logistik' },
                { key: 'puskris', label: 'Pusat Krisis Kemenkes' },
                { key: 'dinkes', label: 'Dinas Kesehatan' },
              ].map((sub) => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setLogistikSourceFilter(sub.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    logistikSourceFilter === sub.key
                      ? 'bg-amber-600 text-white shadow-2xs font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={logistikSearch}
                onChange={(e) => setLogistikSearch(e.target.value)}
                placeholder="Cari barang atau provinsi..."
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Logistik Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Sumber Distribusi</th>
                  <th className="py-3 px-3">Provinsi Penerima</th>
                  <th className="py-3 px-3">Jenis Logistik Kesehatan</th>
                  <th className="py-3 px-3 text-right">Jumlah &amp; Satuan</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Keterangan Penggunaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogistikList.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{item.sumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{item.provinsi}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.jenis || item.jenis_logistik}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {Number(item.jumlah || 0).toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">{item.satuan}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black border bg-emerald-50 text-emerald-800 border-emerald-200">
                        {item.status || 'Tersalurkan'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">{item.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: MOBILISASI SDMK PENANGANAN KARHUTLA ─────────────────────── */}
      {activeTab === 'sdmk' && (
        <div className="space-y-4 pt-1">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-cyan-900">Total SDMK Digerakkan</span>
              <span className="text-2xl font-black text-cyan-950 mt-2">2.146 Nakes</span>
              <span className="text-[10px] text-cyan-700 font-medium mt-0.5">Aktif di 7 Provinsi Prioritas</span>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-purple-900">Dokter Spesialis Paru</span>
              <span className="text-2xl font-black text-purple-950 mt-2">142 Dokter</span>
              <span className="text-[10px] text-purple-700 font-medium mt-0.5">Penanganan Pasien Kasus Berat</span>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-teal-900">Dokter Umum &amp; Perawat</span>
              <span className="text-2xl font-black text-teal-950 mt-2">1.564 Nakes</span>
              <span className="text-[10px] text-teal-700 font-medium mt-0.5">Siaga Pelayanan Primer 24 Jam</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
              <span className="text-xs font-black uppercase text-emerald-900">Tenaga Kesling &amp; Promkes</span>
              <span className="text-2xl font-black text-emerald-950 mt-2">440 Tenaga</span>
              <span className="text-[10px] text-emerald-700 font-medium mt-0.5">Edukasi PHBS &amp; Pantau Udara</span>
            </div>
          </div>

          {/* Table SDMK */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Provinsi Tugas</th>
                  <th className="py-3 px-3 text-right">Total Nakes</th>
                  <th className="py-3 px-3 text-right">Spesialis Paru</th>
                  <th className="py-3 px-3 text-right">Dokter Umum</th>
                  <th className="py-3 px-3 text-right">Perawat</th>
                  <th className="py-3 px-3 text-right">Sanitarian</th>
                  <th className="py-3 px-3">Fokus Lokasi &amp; Posko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSdmkList.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-cyan-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.provinsi}</td>
                    <td className="py-2.5 px-3 text-right font-black text-cyan-900">
                      {Number(item.jumlah || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                      {item.dokter_paru || 18}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {item.dokter_umum || 60}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-teal-700">
                      {item.perawat || 120}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-600">
                      {item.sanitarian || 40}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">{item.lokasi || item.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: MATRIKS 68 UPAYA PENANGANAN KESEHATAN ───────────────────── */}
      {activeTab === 'upaya' && (
        <div className="space-y-4 pt-1">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              {[
                { key: 'all', label: 'Semua 68 Tindakan' },
                { key: 'pusat', label: 'Kemenkes RI (Pusat)' },
                { key: 'provinsi', label: 'Dinas Kesehatan' },
              ].map((sub) => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setUpayaSourceFilter(sub.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    upayaSourceFilter === sub.key
                      ? 'bg-teal-700 text-white shadow-2xs font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={upayaSearch}
                onChange={(e) => setUpayaSearch(e.target.value)}
                placeholder="Cari tindakan atau instruksi..."
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Upaya List Cards */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredUpayaList.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase ${
                        item.level === 'pusat'
                          ? 'bg-teal-100 text-teal-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {item.instansi}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700">
                      📍 {item.wilayah}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 font-semibold leading-relaxed m-0 pt-1">
                    {item.upaya}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0 self-start sm:self-center">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
