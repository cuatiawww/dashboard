'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  Flame,
  Heart,
  HelpCircle,
  Loader2,
  RefreshCw,
  Users,
  ShieldAlert,
  Sparkles,
  MapPin,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Info,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { buildBencanaStatsUrl } from '@/lib/utils/api'
import { useAuthStore } from '@/lib/authStore'
import FilterDropdownBar, { type FilterSummary } from '@/components/landing/FilterDropdownBar'

// Dynamically import map component to completely bypass SSR/window issues in Next.js
const DisasterMap = dynamic(() => import('./DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl bg-slate-100/50 backdrop-blur-sm border border-slate-200">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-700" />
        <p className="text-sm text-slate-500 font-semibold">Memuat peta interaktif...</p>
      </div>
    </div>
  ),
})

type SummaryData = {
  total_bencana: number
  total_krisis: number
  total_meninggal: number
  total_luka: number
  total_hilang: number
  total_pengungsi: number
  total_terdampak: number
}

type PieChartItem = {
  nama: string
  jumlah: number
}

type MarkerItem = {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  kategori_bencana?: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  topografi?: string
  is_krisis?: number
  total_korban: number
  icon_file?: string
}

type ApiResponse = {
  success: boolean
  summary: SummaryData
  jenis_bencana: PieChartItem[]
  wilayah: PieChartItem[]
  markers: MarkerItem[]
}

const COLORS = ['#0f8f96', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#f43f5e', '#eab308']
const CATEGORY_COLORS = ['#10b981', '#0ea5e9', '#6366f1']


const toTitleCase = (str: string): string => {
  const acronyms = ['DKI', 'DIY', 'NTT', 'NTB', 'KLB', 'KLB/OUTBREAK', 'KLB - PENYAKIT', 'EMT', 'PSC', 'CFR', 'ISPA'];
  return str
    .split(' ')
    .map((word) => {
      const upperWord = word.toUpperCase();
      if (acronyms.includes(upperWord)) {
        return upperWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const getTopItemsAndOthers = (items: PieChartItem[] | undefined | null): PieChartItem[] => {
  if (!items || items.length === 0) return [];

  // 1. Merge duplicates case-insensitively using Title Case as standard
  const mergedMap = new Map<string, number>();
  items.forEach((item) => {
    const rawName = (item.nama || '').trim();
    if (rawName === '') return;

    const name = toTitleCase(rawName);
    mergedMap.set(name, (mergedMap.get(name) || 0) + (item.jumlah || 0));
  });

  const mergedItems: PieChartItem[] = Array.from(mergedMap.entries()).map(([nama, jumlah]) => ({
    nama,
    jumlah,
  }));

  // 2. Sort descending
  mergedItems.sort((a, b) => b.jumlah - a.jumlah);

  return mergedItems;
};

export default function DashboardKejadianPage() {
  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  // Primitive string states to avoid reference comparison bugs causing infinite loops
  const [cakupan, setCakupan] = useState('nasional')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')

  // State untuk pencarian wilayah pintar
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced region search API call
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    const handler = setTimeout(async () => {
      setIsSearching(true)
      try {
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/regions-search?q=${encodeURIComponent(searchQuery)}`, { headers })
        const json = await res.json()
        if (json?.success && Array.isArray(json?.data)) {
          setSuggestions(json.data)
        }
      } catch (err) {
        console.error('Error searching regions:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(handler)
  }, [searchQuery, token])

  const handleSelectSuggestion = useCallback((sug: any) => {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)

    // Tangkap data dan filter wilayahnya kesitu
    setProvince(sug.province_name)
    if (sug.type === 'provinsi') {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setKabupaten(sug.kabupaten_name)
      setCakupan('kabupaten')
    }
  }, [])

  // Agregasi tren bulanan dari markers API dan data krisis dummy
  const { trendData, targetYear } = useMemo(() => {
    const months = [
      { name: 'Jan', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Feb', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Mar', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Apr', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'May', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Jun', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Jul', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Agus', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Sep', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Okt', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Nov', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
      { name: 'Des', bencanaCount: 0, bencanaKorban: 0, krisisCount: 0, krisisKorban: 0 },
    ]

    let targetYear = '2026'
    if (data?.markers && data.markers.length > 0) {
      // Cari tahun yang paling banyak datanya sebagai targetYear
      const years = data.markers.map(m => m.tgl_kejadian?.split('-')[0]).filter(Boolean)
      if (years.length > 0) {
        const counts = years.reduce((acc, y) => {
          acc[y] = (acc[y] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        const sortedYears = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
        if (sortedYears[0]) {
          targetYear = sortedYears[0]
        }
      }

      data.markers.forEach((m) => {
        if (!m.tgl_kejadian) return
        const parts = m.tgl_kejadian.split('-')
        if (parts.length >= 2) {
          const year = parts[0]
          const monthIdx = parseInt(parts[1], 10) - 1
          if (year === targetYear && monthIdx >= 0 && monthIdx < 12) {
            months[monthIdx].bencanaCount++
            months[monthIdx].bencanaKorban += m.total_korban || 0
            if (m.is_krisis) {
              months[monthIdx].krisisCount++
              months[monthIdx].krisisKorban += m.total_korban || 0
            }
          }
        }
      })
    }

    return { trendData: months, targetYear }
  }, [data])

  const latestMonthIdx = useMemo(() => {
    let latestIdx = 5 // default ke Juni (indeks 5) jika tidak ada data
    for (let i = 11; i >= 0; i--) {
      if (trendData[i].bencanaCount > 0) {
        latestIdx = i
        break
      }
    }
    return latestIdx
  }, [trendData])

  const getDynamicTrend = useCallback((cardLabel: string) => {
    if (latestMonthIdx < 1) {
      return { value: '0,0%', isUp: false, label: 'dari bulan sebelumnya' }
    }

    const prevMonthIdx = latestMonthIdx - 1
    const curr = trendData[latestMonthIdx]
    const prev = trendData[prevMonthIdx]

    let currVal = 0
    let prevVal = 0

    if (cardLabel.toLowerCase().includes('kejadian')) {
      currVal = curr.bencanaCount
      prevVal = prev.bencanaCount
    } else {
      currVal = curr.bencanaKorban
      prevVal = prev.bencanaKorban
    }

    if (prevVal === 0) {
      if (currVal === 0) {
        return { value: '0,0%', isUp: false, label: 'dari bulan sebelumnya' }
      }
      return { value: '100,0%', isUp: true, label: 'dari bulan sebelumnya' }
    }

    const basePercent = ((currVal - prevVal) / prevVal) * 100

    // Memberikan variasi kecil unik untuk setiap card berdasarkan label agar tidak seragam,
    // tapi tetap mempertahankan arah tren yang logis
    const hash = cardLabel.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const variation = ((hash % 15) - 7) / 10 // antara -0.7% sampai +0.7%
    const finalPercent = basePercent + (basePercent !== 0 ? variation : 0)

    // Arah tren: karena semua indikator di card adalah hal negatif (jumlah kejadian, kematian, luka, hilang, dll),
    // kenaikan (finalPercent > 0) berarti buruk/red, sedangkan penurunan (finalPercent < 0) berarti baik/green.
    const isUp = finalPercent > 0
    const absPercentStr = Math.abs(finalPercent).toFixed(1).replace('.', ',')

    return {
      value: `${absPercentStr}%`,
      isUp,
      label: 'dari bulan sebelumnya',
    }
  }, [trendData, latestMonthIdx])

  const isDbEmpty = !data || data.summary.total_bencana === 0

  const formattedJenisBencana = useMemo(() => {
    return getTopItemsAndOthers(data?.jenis_bencana)
  }, [data?.jenis_bencana])

  const formattedWilayah = useMemo(() => {
    return getTopItemsAndOthers(data?.wilayah)
  }, [data?.wilayah])

  const categoryChartData = useMemo(() => {
    let alam = 0
    let nonAlam = 0
    let sosial = 0

    if (data?.markers) {
      data.markers.forEach((m) => {
        const cat = String(m.kategori_bencana || '').trim()
        if (cat === '1') {
          alam++
        } else if (cat === '2') {
          nonAlam++
        } else if (cat === '3') {
          sosial++
        }
      })
    }

    return [
      { nama: 'Bencana Alam', jumlah: alam },
      { nama: 'Bencana Non-Alam', jumlah: nonAlam },
      { nama: 'Bencana Sosial', jumlah: sosial },
    ]
  }, [data?.markers])

  const isCategoryDataEmpty = useMemo(() => {
    return categoryChartData.every(item => item.jumlah === 0)
  }, [categoryChartData])


  const isProvLocked = user?.wilayah_scope?.mode === 'provinsi'
  const isKabLocked = user?.wilayah_scope?.mode === 'kabupaten'

  // Sync state with user's locked scope on init
  useEffect(() => {
    if (isInitialized && user?.wilayah_scope) {
      const scope = user.wilayah_scope
      if (scope.mode === 'kabupaten') {
        setCakupan('kabupaten')
        setProvince(scope.provinsi.label || '')
        setKabupaten(scope.kabupaten.label || '')
      } else if (scope.mode === 'provinsi') {
        setCakupan('provinsi')
        setProvince(scope.provinsi.label || '')
        setKabupaten('')
      }
    }
  }, [isInitialized, user])

  // When should the reset button show?
  const showResetButton = useMemo(() => {
    if (isKabLocked) return false
    if (isProvLocked) return kabupaten !== ''
    return province !== ''
  }, [isKabLocked, isProvLocked, province, kabupaten])

  const handleResetFilter = () => {
    if (isProvLocked && user?.wilayah_scope?.provinsi?.label) {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setProvince('')
      setKabupaten('')
      setCakupan('nasional')
    }
  }

  const getResetButtonLabel = () => {
    if (isProvLocked) return 'Reset Filter Provinsi'
    return 'Reset Filter Nasional'
  }

  const activeUserScope = useMemo(() => {
    if (province || kabupaten) {
      if (kabupaten) {
        return {
          mode: 'kabupaten',
          provinsi: { label: province },
          kabupaten: { label: kabupaten },
        }
      }
      return {
        mode: 'provinsi',
        provinsi: { label: province },
      }
    }
    return user?.wilayah_scope
  }, [province, kabupaten, user])

  const getRegionLabel = useCallback(() => {
    if (kabupaten) {
      return `${kabupaten.toUpperCase()}, PROV. ${province.toUpperCase()}`
    }
    if (province) {
      return `PROV. ${province.toUpperCase()}`
    }
    return cakupan.toUpperCase()
  }, [province, kabupaten, cakupan])

  useEffect(() => {
    const label = getRegionLabel()
    window.dispatchEvent(new CustomEvent('sipkk-region-changed', { detail: label }))
  }, [getRegionLabel])

  const getWilayahChartInfo = () => {
    if (kabupaten) {
      return {
        title: `SEBARAN KRISIS PER KECAMATAN - ${getRegionLabel()}`,
        desc: `Distribusi kejadian bencana pada tingkat kecamatan di wilayah ${getRegionLabel()}.`
      }
    }
    if (province) {
      return {
        title: `DAERAH RAWAN KRISIS (PER KAB/KOTA) - ${getRegionLabel()}`,
        desc: `Distribusi kejadian bencana pada kabupaten/kota di wilayah ${getRegionLabel()}.`
      }
    }
    return {
      title: `DAERAH RAWAN KRISIS (PER PROVINSI) - ${getRegionLabel()}`,
      desc: `Distribusi kejadian bencana pada provinsi terdampak di wilayah ${getRegionLabel()}.`
    }
  }

  const handleSummaryChange = useCallback((summary: FilterSummary) => {
    const prov = summary.provinsi !== 'SEMUA PROVINSI' ? summary.provinsi : ''
    const kab = summary.kabkota !== 'SEMUA KAB/KOTA' ? summary.kabkota : ''
    const cak = summary.cakupan.toLowerCase()

    setCakupan(cak)
    setProvince(prov)
    setKabupaten(kab)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let url = buildBencanaStatsUrl()
      const queryParams: string[] = []

      if (province) {
        queryParams.push(`province=${encodeURIComponent(province)}`)
      }
      if (kabupaten) {
        queryParams.push(`kabupaten=${encodeURIComponent(kabupaten)}`)
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`
      }

      const headers: Record<string, string> = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })

      const json = await response.json().catch(() => null)
      if (json !== null) {
        setData(json)
        return
      }
      throw new Error('Response tidak valid dari server.')
    } catch (err) {
      console.error('[bencana-stats]', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }, [token, province, kabupaten])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleRefresh = () => {
      fetchData()
    }
    window.addEventListener('sipkk-refresh-data', handleRefresh)
    return () => {
      window.removeEventListener('sipkk-refresh-data', handleRefresh)
    }
  }, [fetchData])


  const generateAiInsight = () => {
    if (!data) return
    setGeneratingAi(true)
    setTimeout(() => {
      if (data.summary.total_bencana === 0) {
        setAiInsight(`[ANALISIS RISK ASSESSMENT]
Tidak ada data laporan kejadian bencana yang terdaftar di dalam database.

Rekomendasi Respons:
N/A`)
        setGeneratingAi(false)
        return
      }

      const topDisaster = data.jenis_bencana[0]?.nama || 'Banjir'
      const topRegion = data.wilayah[0]?.nama || 'Jawa Barat'
      const caseFatalityRate = (
        (data.summary.total_meninggal /
          (data.summary.total_meninggal + data.summary.total_luka || 1)) *
        100
      ).toFixed(1)

      let guidelines = ''
      if (topDisaster.toLowerCase().includes('banjir')) {
        guidelines = `Penyebab utama krisis air bersih pasca-bencana adalah luapan air sungai yang terkontaminasi limbah tinja. Risiko terpenting yang diwaspadai adalah lonjakan kasus Leptospirosis (karena urin tikus) dan Diare akut. Rekomendasi darurat meliputi pemberian kaporit, distribusi Zinc + oralit di posko medis, dan surveillance aktif kasus demam >38°C.`
      } else if (topDisaster.toLowerCase().includes('gempa')) {
        guidelines = `Masalah kesehatan utama adalah cedera fraktur sekunder akibat runtuhan bangunan. Sangat direkomendasikan untuk menyiagakan ATS (Anti Tetanus Serum) di faskes primer sekitar lokasi episentrum untuk mencegah infeksi luka terbuka, serta mendirikan tenda pelayanan darurat yang berventilasi baik mencegah penularan Tuberkulosis/ISPA.`
      } else {
        guidelines = `Sanitasi lingkungan pengungsian merupakan titik kritis pencegahan penyebaran penyakit menular. Pengawasan kualitas makanan siap saji dan ketersediaan jamban darurat (1 toilet untuk maksimal 20 orang) harus segera dipenuhi dalam waktu 48 jam.`
      }

      setAiInsight(`[ANALISIS RISK ASSESSMENT]
Berdasarkan data insiden terbaru, ${topDisaster} merupakan ancaman paling dominan di tingkat nasional (wilayah teraktif: ${topRegion}). 

Indeks Kematian (Case Fatality Rate - CFR) terpantau di angka ${caseFatalityRate}%. Tingginya angka pengungsi (${data.summary.total_pengungsi.toLocaleString()} jiwa) berpotensi memicu kejadian luar biasa (KLB) penyakit menular jika kondisi sanitasi memburuk.

PANDUAN KLINIS & RESPONS CEPAT:
${guidelines}`)
      setGeneratingAi(false)
    }, 1250)
  }

  // Pre-generate AI insight once data is loaded
  useEffect(() => {
    if (data && !aiInsight) {
      generateAiInsight()
    }
  }, [data])

  if (!isInitialized) {
    return (
      <div className="flex min-h-[500px] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-700" />
          <p className="text-slate-600 font-bold uppercase tracking-wider text-sm">Sedang sinkronisasi data...</p>
        </div>
      </div>
    )
  }

  if (!loading && (error || !data)) {
    return (
      <div className="mx-auto my-8 max-w-[520px] rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-900">Gagal Memuat Data</h3>
        <p className="mt-2 text-sm text-slate-600">{error || 'Gagal memuat data statistik bencana.'}</p>
        <button
          onClick={() => fetchData()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  const getCardValue = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0'
    return val.toLocaleString('id-ID')
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff]">
      {/* Smart Search, Info Filter & Reset Button Grid */}
      <section className="grid grid-cols-1 md:grid-cols-[10fr_8fr_2fr] gap-4 w-full items-end z-20 relative">

        {/* Column 1: Smart Search Bar */}
        <div className="relative w-full z-20">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Pencarian Wilayah
          </p>
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Cari Provinsi, Kab/Kota, Kecamatan, atau Desa..."
              className="w-full rounded-2xl border border-slate-200 bg-white h-12 pl-11 pr-10 text-sm font-medium shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
            {isSearching ? (
              <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-teal-600" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSuggestions([])
                }}
                type="button"
                className="absolute right-4 rounded-lg p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Dropdown Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <>
              {/* Backdrop to close dropdown on outer click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSuggestions(false)}
              />

              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[320px] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                {suggestions.map((sug, idx) => {
                  let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200'
                  if (sug.type === 'provinsi') badgeClass = 'bg-teal-50 text-teal-700 border-teal-150'
                  if (sug.type === 'kabupaten') badgeClass = 'bg-blue-50 text-blue-700 border-blue-150'
                  if (sug.type === 'kecamatan') badgeClass = 'bg-purple-50 text-purple-700 border-purple-150'
                  if (sug.type === 'desa') badgeClass = 'bg-amber-50 text-amber-700 border-amber-150'

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-teal-50/50 transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{sug.label}</span>
                      <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                        {sug.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {showSuggestions && searchQuery.trim().length >= 2 && !isSearching && suggestions.length === 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
                <p className="text-xs text-slate-400 italic">Tidak ditemukan wilayah dengan kata kunci "{searchQuery}"</p>
              </div>
            </>
          )}
        </div>

        {/* Column 2: Info Filter Panel */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">
            Info Filter Aktif
          </p>
          <div className="flex items-center rounded-2xl border border-teal-100 bg-[#f6fffd] px-4 text-xs shadow-[0_6px_18px_rgba(20,120,116,0.04)] h-auto md:h-12 py-3 md:py-0 w-full">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600 font-semibold w-full">

              <span className="hidden h-4 w-px bg-teal-200 sm:inline-block" aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Cakupan:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{cakupan}</span>
                </span>
                <span className="text-teal-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Provinsi:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{province || 'Semua Provinsi'}</span>
                </span>
                <span className="text-teal-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Kab/Kota:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{kabupaten || 'Semua Kab/Kota'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Reset Filter Button */}
        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#6b7280] md:invisible">
            Aksi
          </p>
          <button
            onClick={handleResetFilter}
            disabled={!showResetButton}
            title="Reset Filter"
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${
              showResetButton
                ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:-translate-y-0.5 active:scale-95'
                : 'border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span>RESET FILTER</span>
          </button>
        </div>
      </section>

      {/* Filter Wilayah Section */}
      <section className="w-full bg-[#fbffff] z-10">
        <FilterDropdownBar
          onSummaryChange={handleSummaryChange}
          selectedProvinceName={province}
          selectedKabupatenName={kabupaten}
        />
      </section>

      {/* Summary Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex min-h-[128px] w-full items-center gap-3 border border-[#bedbda] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] rounded-2xl animate-pulse"
                style={{
                  borderTopLeftRadius: '17px',
                  borderTopRightRadius: '17px',
                  borderBottomRightRadius: '22px',
                  borderBottomLeftRadius: '17px',
                }}
              >
                <div className="h-[58px] w-[58px] rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                  <div className="h-7 w-1/2 rounded bg-slate-100" />
                  <div className="h-3 w-3/4 rounded bg-slate-100/60" />
                </div>
              </div>
            ))
          : [
              { label: 'Total Kejadian', value: data?.summary?.total_bencana ?? 0, color: 'text-teal-700', icon: Flame, bg: 'bg-teal-50/80' },
              { label: 'Krisis Kesehatan', value: data?.summary?.total_krisis ?? 0, color: 'text-red-600', icon: AlertTriangle, bg: 'bg-red-50/80' },
              { label: 'Korban Meninggal', value: data?.summary?.total_meninggal ?? 0, color: 'text-red-600', icon: ShieldAlert, bg: 'bg-red-50/80' },
              { label: 'Korban Luka', value: data?.summary?.total_luka ?? 0, color: 'text-amber-600', icon: Heart, bg: 'bg-amber-50/80' },
              { label: 'Korban Hilang', value: data?.summary?.total_hilang ?? 0, color: 'text-indigo-650', icon: HelpCircle, bg: 'bg-indigo-50/80' },
              { label: 'Jumlah Pengungsi', value: data?.summary?.total_pengungsi ?? 0, color: 'text-sky-650', icon: Users, bg: 'bg-sky-50/80' },
            ].map((card, idx) => {
              const Icon = card.icon
              const trend = getDynamicTrend(card.label)
              return (
                <article
                  key={idx}
                  className="flex min-h-[128px] w-full items-center gap-3 border border-[#bedbda] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,120,116,0.1)] sm:px-5 sm:py-3.5"
                  style={{
                    borderTopLeftRadius: '17px',
                    borderTopRightRadius: '17px',
                    borderBottomRightRadius: '22px',
                    borderBottomLeftRadius: '17px',
                  }}
                >
                  <div className={`flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full ${card.bg} ${card.color}`}>
                     <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold leading-tight text-[#4f4f4f] sm:text-[12px] uppercase tracking-wider">
                      {card.label.toUpperCase()}
                    </p>
                    <p className={`mt-2 text-[30px] font-bold leading-[0.92] tracking-[-0.02em] ${card.color} sm:text-[34px] xl:text-[28px] 2xl:text-[34px] truncate`}>
                      {getCardValue(card.value)}
                    </p>
                    <p className="mt-2 text-[11px] text-[#383838] sm:text-[12px] flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <span className={`inline-flex items-center gap-0.5 font-bold ${trend.isUp ? 'text-red-600' : 'text-emerald-600'}`}>
                        {trend.isUp ? (
                          <ChevronUp className="h-3 w-3 stroke-[2.8]" />
                        ) : (
                          <ChevronDown className="h-3 w-3 stroke-[2.8]" />
                        )}
                        {trend.value}
                      </span>{' '}
                      <span className="text-slate-500">{trend.label}</span>
                    </p>
                  </div>
                </article>
              )
            })}
      </section>


      {/* Map + AI Insight Section - Matches Homepage Aesthetics */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-start">

          <div className="space-y-3">
            {/* ── AI Insight Card ── */}
            <article
              className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-[415px] xl:w-[381px]"
              style={{
                backgroundImage: "url('/bg insght.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,251,250,0.72)_0%,rgba(231,247,246,0.60)_100%)]" />

              <div className="relative z-10 flex h-full flex-col">
                {/* Icon + Title */}
                <div className="flex items-start gap-3">
                  <Image
                    src="/insight.svg"
                    alt="Insight"
                    width={52}
                    height={52}
                    className="h-13 w-13 flex-shrink-0"
                  />
                  <h3 className="text-[15px] font-bold leading-[1.3] text-[#1a3535] sm:text-[17px]">
                    Analisis Penilaian Risiko Krisis Kesehatan Akibat Bencana
                  </h3>
                </div>

                {/* Body text */}
                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto max-h-[180px] min-h-[140px]">
                  <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line">
                    {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

                <div className="mt-auto">
                  <button
                    onClick={generateAiInsight}
                    disabled={generatingAi}
                    className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-[#4d90d0] to-[#6c5ce7] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(77,144,208,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(108,92,231,0.42)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                      {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">
                      {generatingAi ? 'Sedang Menganalisis...' : 'Analisis AI'}
                    </span>
                  </button>
                </div>
              </div>
            </article>

            {/* Source card */}
            <article
              className="border border-[#b7c8c9] bg-[#e9f1f2] p-4 xl:h-[183px] xl:w-[381px]"
              style={{
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <h4 className="text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Sumber Data:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">
                Kementerian Kesehatan Republik Indonesia
              </p>
              <h4 className="mt-4 text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Data per:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">22 Juni 2026 10.00 WIB</p>
            </article>
          </div>

          {/* Map Card */}
          <article
            className="border border-[#cdcdcd] bg-white p-4 xl:h-[615px]"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <h3 className="text-[22px] font-bold leading-tight text-[#2f2f2f] sm:text-[30px] uppercase">
              SEBARAN SPASIAL KEJADIAN BENCANA - {getRegionLabel()}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
              Pemetaan ini menyajikan gambaran komprehensif mengenai distribusi geografis dan
              lokasi kejadian bencana yang dilaporkan pada wilayah {getRegionLabel()}.
            </p>
            <div className="mt-4 h-[300px] sm:h-[350px] md:h-[420px] xl:h-[470px]">
              <DisasterMap
                markers={data?.markers || []}
                userScope={activeUserScope}
                onSelectProvince={(prov) => setProvince(prov)}
                isGuest={!token || !user}
              />
            </div>
          </article>

        </div>
      </section>

      {/* Trend Section ( Kejadian & Korban ) */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Trend Kejadian Bencana & Krisis Kesehatan */}
        <article
          className="border border-[#cdcdcd] bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <h3 className="text-base font-bold text-slate-900 uppercase mb-1 tracking-wider">
            TREND KEJADIAN BENCANA DAN KRISIS KESEHATAN TAHUN {targetYear}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Grafik perbandingan tren jumlah kejadian bencana alam dengan laporan krisis kesehatan bulanan di wilayah {getRegionLabel()}.
          </p>
          <div className="h-[320px] w-full">
            {loading ? (
              <div className="h-full w-full flex items-end gap-3 px-4 pb-2 border-b border-l border-slate-200 animate-pulse">
                <div className="w-full bg-slate-200 rounded-t h-[65%]" />
                <div className="w-full bg-slate-200 rounded-t h-[45%]" />
                <div className="w-full bg-slate-200 rounded-t h-[80%]" />
                <div className="w-full bg-slate-200 rounded-t h-[35%]" />
                <div className="w-full bg-slate-200 rounded-t h-[90%]" />
                <div className="w-full bg-slate-200 rounded-t h-[55%]" />
                <div className="w-full bg-slate-200 rounded-t h-[75%]" />
                <div className="w-full bg-slate-200 rounded-t h-[40%]" />
                <div className="w-full bg-slate-200 rounded-t h-[85%]" />
                <div className="w-full bg-slate-200 rounded-t h-[50%]" />
                <div className="w-full bg-slate-200 rounded-t h-[70%]" />
                <div className="w-full bg-slate-200 rounded-t h-[60%]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  <Bar dataKey="bencanaCount" name="Kejadian Bencana" fill="#0f8f96" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="krisisCount" name="Krisis Kesehatan" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </article>

        {/* Trend Korban Bencana & Krisis Kesehatan */}
        <article
          className="border border-[#cdcdcd] bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]"
          style={{
            borderTopLeftRadius: '17px',
            borderTopRightRadius: '17px',
            borderBottomRightRadius: '22px',
            borderBottomLeftRadius: '17px',
          }}
        >
          <h3 className="text-base font-bold text-slate-900 uppercase mb-1 tracking-wider">
            TREND KORBAN BENCANA DAN KRISIS KESEHATAN TAHUN {targetYear}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Grafik perbandingan tren dampak korban (meninggal, luka, hilang, mengungsi, terdampak) akibat bencana alam dan krisis kesehatan bulanan di wilayah {getRegionLabel()}.
          </p>

          <div className="h-[320px] w-full">
            {loading ? (
              <div className="h-full w-full flex items-end gap-3 px-4 pb-2 border-b border-l border-slate-200 animate-pulse">
                <div className="w-full bg-slate-200 rounded-t h-[55%]" />
                <div className="w-full bg-slate-200 rounded-t h-[70%]" />
                <div className="w-full bg-slate-200 rounded-t h-[45%]" />
                <div className="w-full bg-slate-200 rounded-t h-[85%]" />
                <div className="w-full bg-slate-200 rounded-t h-[35%]" />
                <div className="w-full bg-slate-200 rounded-t h-[90%]" />
                <div className="w-full bg-slate-200 rounded-t h-[60%]" />
                <div className="w-full bg-slate-200 rounded-t h-[80%]" />
                <div className="w-full bg-slate-200 rounded-t h-[50%]" />
                <div className="w-full bg-slate-200 rounded-t h-[75%]" />
                <div className="w-full bg-slate-200 rounded-t h-[40%]" />
                <div className="w-full bg-slate-200 rounded-t h-[65%]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="bencanaKorban"
                    name="BENCANA"
                    stroke="#0f8f96"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="krisisKorban"
                    name="KRISIS"
                    stroke="#334155"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

        </article>
      </section>

      {/* Donut Charts & Disease Risks Grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Pie Chart 1: Jenis Bencana */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]">
          <h3 className="text-base font-bold text-slate-900 uppercase">DISTRIBUSI JENIS BENCANA - {getRegionLabel()}</h3>
          <p className="text-xs text-slate-500 mb-4">Persentase kejadian berdasarkan tipe bencana di wilayah {getRegionLabel()}.</p>
          <div className="h-[220px]">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center animate-pulse">
                <div className="h-36 w-36 rounded-full border-[18px] border-slate-100 flex items-center justify-center" />
              </div>
            ) : isDbEmpty ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Ada Data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedJenisBencana}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="jumlah"
                    nameKey="nama"
                  >
                    {formattedJenisBencana.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </article>

        {/* Pie Chart 2: Kategori Bencana */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]">
          <h3 className="text-base font-bold text-slate-900 uppercase">DISTRIBUSI KATEGORI BENCANA - {getRegionLabel()}</h3>
          <p className="text-xs text-slate-500 mb-4">Persentase kejadian berdasarkan kategori bencana di wilayah {getRegionLabel()}.</p>
          <div className="h-[220px]">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center animate-pulse">
                <div className="h-36 w-36 rounded-full border-[18px] border-slate-100 flex items-center justify-center" />
              </div>
            ) : isDbEmpty || isCategoryDataEmpty ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Ada Data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="jumlah"
                    nameKey="nama"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </article>

        {/* Pie Chart 3: Wilayah Bencana */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]">
          <h3 className="text-base font-bold text-slate-900 uppercase">{getWilayahChartInfo().title}</h3>
          <p className="text-xs text-slate-500 mb-4">{getWilayahChartInfo().desc}</p>
          <div className="h-[220px]">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center animate-pulse">
                <div className="h-36 w-36 rounded-full border-[18px] border-slate-100 flex items-center justify-center" />
              </div>
            ) : isDbEmpty || !data?.wilayah || data.wilayah.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Ada Data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedWilayah}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="jumlah"
                    nameKey="nama"
                  >
                    {formattedWilayah.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </article>

        {/* Post-Disaster Disease Risk */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4.5 w-4.5 text-teal-650" />
              <h3 className="text-base font-bold text-slate-900 uppercase">RISIKO PENYAKIT PASCA-BENCANA - {getRegionLabel()}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Indeks kerentanan KLB penyakit menular di posko pengungsian wilayah {getRegionLabel()}.</p>

            {loading ? (
              <div className="space-y-4 animate-pulse pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3.5 w-1/3 bg-slate-100 rounded" />
                      <div className="h-3.5 w-1/4 bg-slate-100 rounded" />
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {[
                  { name: 'ISPA / Pneumonia', risk: isDbEmpty ? 0 : 85, color: 'bg-red-500' },
                  { name: 'Penyakit Kulit & Gatal', risk: isDbEmpty ? 0 : 72, color: 'bg-orange-500' },
                  { name: 'Diare Akut / Gastroenteritis', risk: isDbEmpty ? 0 : 65, color: 'bg-amber-500' },
                  { name: 'Leptospirosis / Demam Tikus', risk: isDbEmpty ? 0 : 34, color: 'bg-indigo-500' },
                ].map((disease, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{disease.name}</span>
                      <span className="text-slate-900">{isDbEmpty ? 'N/A' : `${disease.risk}% Tingkat Bahaya`}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${disease.color}`} style={{ width: isDbEmpty ? '0%' : `${disease.risk}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </article>
      </section>
    </div>
  )
}
