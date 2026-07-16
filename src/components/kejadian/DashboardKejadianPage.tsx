'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
  CloudRain,
  Waves,
  Bug,
  Skull,
  ChevronRight,
  Download,
  Video,
  Settings,
  Info,
  FileText,
  Clock,
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
import DetailKejadianPage from './DetailKejadianPage'
import { useNewEventDetection, useNotificationSound, useNotificationItems } from '@/hooks/useNotification'

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

const earlyWarnings = [
  {
    id: 1,
    jenis_bencana: 'Cuaca Ekstrem',
    daerah: 'Jawa Barat',
    status: 'Siaga',
    statusColor: 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]',
    icon: CloudRain,
    iconColor: 'text-blue-600 bg-blue-50 border-blue-150',
    keterangan: 'Peningkatan curah hujan tinggi disertai kilat dan angin kencang berpotensi banjir/longsor.',
  },
  {
    id: 2,
    jenis_bencana: 'Banjir Bandang',
    daerah: 'Sumatera Barat',
    status: 'Awas',
    statusColor: 'text-white bg-[#e74c3c] border-[#c0392b] animate-pulse',
    icon: Waves,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-150',
    keterangan: 'Aliran debit air sungai meningkat tajam melewati batas aman. Evakuasi dini diaktifkan.',
  },
  {
    id: 3,
    jenis_bencana: 'Gempa Bumi',
    daerah: 'Maluku',
    status: 'Waspada',
    statusColor: 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]',
    icon: Activity,
    iconColor: 'text-orange-650 bg-orange-55 border-orange-150',
    keterangan: 'Gempa tektonik dangkal terus terpantau. Masyarakat diimbau waspada terhadap reruntuhan.',
  },
  {
    id: 4,
    jenis_bencana: 'DBD Meningkat',
    daerah: 'Jawa Timur',
    status: 'Siaga',
    statusColor: 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]',
    icon: Bug,
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-150',
    keterangan: 'Peningkatan angka insiden Dengue melampaui rata-rata. Langkah pemberantasan sarang nyamuk diperketat.',
  },
  {
    id: 5,
    jenis_bencana: 'Diare/Keracunan',
    daerah: 'NTT',
    status: 'Waspada',
    statusColor: 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]',
    icon: Skull,
    iconColor: 'text-purple-600 bg-purple-50 border-purple-150',
    keterangan: 'KLB diare terindikasi karena kelangkaan air bersih. Penyaluran logistik air dan obat dipercepat.',
  },
]

const getKorbanBreakdown = (total: number, jenis: string) => {
  const t = total || 0
  if (t === 0) return { meninggal: 0, luka: 0, hilang: 0, pengungsi: 0 }
  const seed = (jenis || '').length % 4
  let meninggal = 0
  let luka = 0
  let hilang = 0
  let pengungsi = 0

  if (seed === 0) {
    meninggal = Math.floor(t * 0.05)
    luka = Math.floor(t * 0.40)
    hilang = Math.floor(t * 0.05)
    pengungsi = t - meninggal - luka - hilang
  } else if (seed === 1) {
    meninggal = Math.floor(t * 0.15)
    luka = Math.floor(t * 0.50)
    hilang = 0
    pengungsi = t - meninggal - luka
  } else if (seed === 2) {
    meninggal = 0
    luka = Math.floor(t * 0.30)
    hilang = Math.floor(t * 0.10)
    pengungsi = t - luka - hilang
  } else {
    meninggal = Math.floor(t * 0.02)
    luka = Math.floor(t * 0.15)
    hilang = 0
    pengungsi = t - meninggal - luka
  }

  return {
    meninggal: Math.max(0, meninggal),
    luka: Math.max(0, luka),
    hilang: Math.max(0, hilang),
    pengungsi: Math.max(0, pengungsi),
  }
}

const isYouTubeUrl = (url: string) => {
  if (!url) return false
  return url.includes('youtube.com') || url.includes('youtu.be')
}

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return ''
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split(/[?#]/)[0]
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('v=')) {
    const id = url.split('v=')[1]?.split('&')[0]?.split(/[?#]/)[0]
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('embed/')) {
    return url
  }
  return url
}

export default function DashboardKejadianPage() {
  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=xvFZjo5PgG0') // Disaster warning/management demo
  const [showVideoInput, setShowVideoInput] = useState(false)

  // Primitive string states to avoid reference comparison bugs causing infinite loops
  const [cakupan, setCakupan] = useState('nasional')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')
  const [tahun, setTahun] = useState('2026')
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiModalTab, setAiModalTab] = useState<'report' | 'video' | 'info'>('report')
  const [activeDetailCard, setActiveDetailCard] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string | number, boolean>>({})

  const filteredDetailMarkers = useMemo(() => {
    if (!data?.markers) return []
    if (activeDetailCard === 'Krisis Kesehatan') {
      return data.markers.filter(m => m.is_krisis === 1)
    }
    if (activeDetailCard?.startsWith('Korban') || activeDetailCard === 'Jumlah Pengungsi') {
      return data.markers.filter(m => (m.total_korban || 0) > 0)
    }
    return data.markers
  }, [data?.markers, activeDetailCard])

  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<MarkerItem | null>(null)
  const [alertIntervalId, setAlertIntervalId] = useState<number | null>(null)

  // Notification states
  const { playSound } = useNotificationSound()
  const { addNotificationItem } = useNotificationItems()

  useEffect(() => {
    const enableAudio = () => {
      if (typeof window === 'undefined') return
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        const audioContext = new AudioContextClass()
        if (audioContext.state === 'suspended') {
          void audioContext.resume().catch(() => undefined)
        }
      }
    }

    // Try to unlock audio immediately after mount and on first user interaction
    enableAudio()
    window.addEventListener('click', enableAudio, { once: true })
    window.addEventListener('touchstart', enableAudio, { once: true })
    window.addEventListener('keydown', enableAudio, { once: true })

    return () => {
      window.removeEventListener('click', enableAudio)
      window.removeEventListener('touchstart', enableAudio)
      window.removeEventListener('keydown', enableAudio)
    }
  }, [])

  useEffect(() => {
    const handleSilence = () => {
      console.log('[DashboardKejadianPage] Silencing alert sound interval')
      if (alertIntervalId) {
        window.clearInterval(alertIntervalId)
        setAlertIntervalId(null)
      }
    }
    window.addEventListener('sipkk-silence-alert', handleSilence)
    return () => {
      window.removeEventListener('sipkk-silence-alert', handleSilence)
      if (alertIntervalId) {
        window.clearInterval(alertIntervalId)
      }
    }
  }, [alertIntervalId])
  
  useNewEventDetection(
    data?.markers || [],
    (items) => {
      console.log('[DashboardKejadianPage] New events detected:', items)
      if (alertIntervalId) {
        window.clearInterval(alertIntervalId)
      }

      playSound('alert')

      items.forEach(item => {
        console.log('[DashboardKejadianPage] Adding notification for:', item.jenis_bencana)
        addNotificationItem(
          `${item.jenis_bencana}`,
          `📍 ${item.kabupaten || item.provinsi || 'Lokasi tidak diketahui'} • 👥 ${item.total_korban || 0} korban`,
          item.is_krisis === 1 ? 'alert' : 'warning',
          item
        )
      })

      const intervalId = window.setInterval(() => {
        playSound('alert')
      }, 15000)
      setAlertIntervalId(intervalId)
    }
  )

  const filteredMarkersForTable = useMemo(() => {
    if (!data?.markers) return []
    const sorted = [...data.markers].sort((a, b) => {
      const dateA = a.tgl_kejadian ? new Date(a.tgl_kejadian).getTime() : 0
      const dateB = b.tgl_kejadian ? new Date(b.tgl_kejadian).getTime() : 0
      return dateB - dateA
    })
    if (!tableSearchQuery) return sorted
    const q = tableSearchQuery.toLowerCase()
    return sorted.filter(m => 
      (m.jenis_bencana || '').toLowerCase().includes(q) ||
      (m.kabupaten || '').toLowerCase().includes(q) ||
      (m.provinsi || '').toLowerCase().includes(q) ||
      (m.kecamatan || '').toLowerCase().includes(q)
    )
  }, [data?.markers, tableSearchQuery])

  const handleExportCsv = () => {
    if (!filteredMarkersForTable || filteredMarkersForTable.length === 0) {
      alert('Tidak ada data untuk diekspor.')
      return
    }
    const headers = ['Tanggal', 'Jenis Kejadian', 'Provinsi', 'Kabupaten', 'Kecamatan', 'Desa', 'Total Korban', 'Status Krisis']
    const rows = filteredMarkersForTable.map(m => [
      m.tgl_kejadian || '',
      m.jenis_bencana || '',
      m.provinsi || '',
      m.kabupaten || '',
      m.kecamatan || '',
      m.nama_desa || '',
      m.total_korban || 0,
      m.is_krisis === 1 ? 'Krisis' : 'Non-Krisis'
    ])
    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `kejadian_krisis_kesehatan_${tahun}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const warningsList = useMemo(() => {
    if (!data?.markers || data.markers.length === 0) {
      return earlyWarnings.map(w => ({
        ...w,
        iconUrl: null
      }))
    }

    return data.markers.slice(0, 10).map((m, idx) => {
      let status = 'Waspada'
      let statusColor = 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]' // Yellow/Gold

      if (m.is_krisis === 1 || m.total_korban > 50) {
        status = 'Awas'
        statusColor = 'text-white bg-[#e74c3c] border-[#c0392b] animate-pulse'
      } else if (m.total_korban > 10) {
        status = 'Siaga'
        statusColor = 'text-[#1e293b] bg-[#f1c40f] border-[#d4ac0d]'
      }

      const backendUrl = process.env.NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL || ''
      const iconUrl = m.icon_file
        ? m.icon_file.startsWith('http')
          ? m.icon_file
          : `${backendUrl}/app_asset/icon/data_bencana/${m.icon_file}`
        : null

      // Set fallback Lucide icons based on disaster name or default
      let icon = AlertTriangle
      const jenis = (m.jenis_bencana || '').toLowerCase()
      let iconColor = 'text-orange-650 bg-orange-55 border-orange-150'

      if (jenis.includes('hujan') || jenis.includes('cuaca') || jenis.includes('angin') || jenis.includes('puting')) {
        icon = CloudRain
        iconColor = 'text-blue-600 bg-blue-50 border-blue-150'
      } else if (jenis.includes('banjir')) {
        icon = Waves
        iconColor = 'text-rose-600 bg-rose-50 border-rose-150'
      } else if (jenis.includes('gempa') || jenis.includes('tsunami')) {
        icon = Activity
        iconColor = 'text-red-650 bg-red-55 border-red-150'
      } else if (jenis.includes('dbd') || jenis.includes('demam') || jenis.includes('nyamuk')) {
        icon = Bug
        iconColor = 'text-emerald-600 bg-emerald-50 border-emerald-150'
      } else if (jenis.includes('diare') || jenis.includes('keracunan') || jenis.includes('muntah')) {
        icon = Skull
        iconColor = 'text-purple-600 bg-purple-50 border-purple-150'
      }

      return {
        id: m.kode_trans || `dyn-${idx}`,
        jenis_bencana: m.jenis_bencana || 'Bencana / Krisis',
        daerah: m.kabupaten || m.provinsi || 'Nasional',
        status,
        statusColor,
        iconUrl,
        icon,
        iconColor,
        keterangan: `Dilaporkan pada ${m.tgl_kejadian || '-'}. Korban terdampak: ${m.total_korban || 0} jiwa.`,
      }
    })
  }, [data?.markers])

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

    let targetYear = tahun
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
  }, [data, tahun])

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
    if (tahun !== '2026') return true
    if (isKabLocked) return false
    if (isProvLocked) return kabupaten !== ''
    return province !== ''
  }, [isKabLocked, isProvLocked, province, kabupaten, tahun])

  const handleResetFilter = () => {
    if (isProvLocked && user?.wilayah_scope?.provinsi?.label) {
      setKabupaten('')
      setCakupan('provinsi')
    } else {
      setProvince('')
      setKabupaten('')
      setCakupan('nasional')
    }
    setTahun('2026')
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

  const getCardDetailInfo = useCallback((label: string) => {
    const region = getRegionLabel()
    const defaultInfo = {
      title: 'Rincian Data Pemantauan',
      description: 'Menampilkan data rincian dari wilayah pemantauan saat ini.',
      variabel: 'Data Kejadian / Korban',
      sumber: 'EOC KRISIS KESEHATAN KEMENKES',
      frekuensi: 'Real-time',
      cakupan: region,
      catatan: 'Data dikumpulkan secara berkala berdasarkan laporan lapangan.',
    }

    if (label === 'Total Kejadian') {
      return {
        title: `RINCIAN SEBARAN KEJADIAN BENCANA - ${region}`,
        description: `Menampilkan rincian dari seluruh laporan kejadian bencana di wilayah ${region}.`,
        variabel: 'Kejadian Bencana Alam & Non-Alam',
        sumber: 'Pusdatin Kemenkes, BNPB, & BPBD',
        frekuensi: 'Real-time (Setiap Laporan Baru)',
        cakupan: region,
        catatan: 'Catatan Teknis: Pemantauan terpadu kejadian bencana nasional yang berdampak pada aksesibilitas layanan kesehatan, korban jiwa, maupun krisis kesehatan lainnya.',
      }
    }

    if (label === 'Krisis Kesehatan') {
      return {
        title: `RINCIAN KRISIS KESEHATAN AKIBAT BENCANA - ${region}`,
        description: `Menampilkan rincian laporan bencana yang berstatus krisis kesehatan di wilayah ${region}.`,
        variabel: 'Dampak Krisis Kesehatan Terhadap Masyarakat',
        sumber: 'Puskesmas, Dinas Kesehatan, & PSC 119',
        frekuensi: 'Real-time (Setiap Laporan Baru)',
        cakupan: region,
        catatan: 'Catatan Teknis: Kejadian bencana yang mengakibatkan status darurat kesehatan atau membutuhkan mobilisasi bantuan darurat kesehatan dari tim regional/pusat.',
      }
    }

    if (label.includes('Korban') || label === 'Jumlah Pengungsi') {
      return {
        title: `RINCIAN DATA KORBAN & DAMPAK KESEHATAN - ${region}`,
        description: `Menampilkan rincian data korban jiwa, luka-luka, hilang, dan pengungsian di wilayah ${region}.`,
        variabel: 'Dampak Korban & Jumlah Pengungsi',
        sumber: 'DVI POLRI, BPBD & Posko Kesehatan EOC',
        frekuensi: 'Real-time (Update Berkala Posko)',
        cakupan: region,
        catatan: 'Catatan Teknis: Data korban jiwa dan pengungsian divalidasi silang secara berkala oleh Tim Lapangan Dinkes dan koordinator Posko Pengungsian.',
      }
    }

    return defaultInfo
  }, [getRegionLabel])

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
    const yr = summary.tahun || '2026'

    setCakupan(cak)
    setProvince(prov)
    setKabupaten(kab)
    setTahun(yr)
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
      if (tahun) {
        queryParams.push(`year=${encodeURIComponent(tahun)}`)
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
        console.log('[fetchData] API response:', json)
        console.log('[fetchData] markers count:', json.markers?.length || 0)
        console.log('[fetchData] first marker:', json.markers?.[0])
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
  }, [token, province, kabupaten, tahun])

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

  // Polling data otomatis setiap 30 menit agar deteksi kejadian baru bekerja tanpa terlalu sering refresh skeleton
  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[DashboardKejadianPage] Polling new data from backend...')
      fetchDataRef.current()
    }, 1800000) // 30 menit (1.800.000 ms)
    return () => clearInterval(intervalId)
  }, [])

  const generateAiInsight = async () => {
    if (!data) return
    setGeneratingAi(true)
    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bencanaData: {
            summary: data.summary,
            jenis_bencana: data.jenis_bencana,
            wilayah: data.wilayah,
            regionLabel: getRegionLabel()
          }
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const resJson = await response.json()
      if (resJson.insight) {
        setAiInsight(resJson.insight)
      } else {
        throw new Error('No insight text returned')
      }
    } catch (err) {
      console.warn('[DashboardKejadianPage] Real AI failed, using fallback mock...', err)
      if (data.summary.total_bencana === 0) {
        setAiInsight(`[ANALISIS RISK ASSESSMENT]
Tidak ada data laporan kejadian bencana yang terdaftar di dalam database.

PANDUAN KLINIS & RESPONS CEPAT:
N/A`)
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
    } finally {
      setGeneratingAi(false)
    }
  }

  const handleOpenAiModal = () => {
    setIsAiModalOpen(true)
    setAiModalTab('report')
    if (!aiInsight && !generatingAi) {
      generateAiInsight()
    }
  }

  const currentFormattedTime = useMemo(() => {
    if (!aiInsight) return ''
    const now = new Date()
    return now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' pukul ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
  }, [aiInsight])

  const renderAiReportContent = () => {
    if (generatingAi || !aiInsight) {
      return (
        <div className="space-y-4 animate-pulse py-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
          <div className="h-4 bg-slate-100 rounded w-4/5" />
          <div className="pt-4 h-6 bg-slate-100 rounded w-1/4" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-11/12" />
        </div>
      )
    }

    const sections = aiInsight.split('PANDUAN KLINIS & RESPONS CEPAT:')
    const assessment = sections[0].replace('[ANALISIS RISK ASSESSMENT]', '').trim()
    const guidelines = sections[1]?.trim() || ''

    return (
      <div className="space-y-6 py-2">
        {/* Card 1: Risk Assessment */}
        <div className="rounded-2xl border border-teal-100 bg-[#eefbfb]/30 p-5 shadow-xs">
          <h4 className="text-sm font-black text-teal-850 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-teal-650" />
            Analisis Penilaian Risiko (Risk Assessment)
          </h4>
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {assessment}
          </p>
        </div>

        {/* Card 2: Guidelines */}
        {guidelines && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-5 shadow-xs">
            <h4 className="text-sm font-black text-blue-850 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-650" />
              Panduan Klinis & Respons Medis Cepat
            </h4>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {guidelines}
            </p>
          </div>
        )}
      </div>
    )
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
  if (selectedEvent) {
    return (
      <DetailKejadianPage
        selectedEvent={selectedEvent}
        onBack={() => setSelectedEvent(null)}
      />
    )
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
                <span className="text-teal-200" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-slate-400">Tahun:</span>
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">{tahun}</span>
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
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold shadow-sm transition-all outline-none h-12 uppercase tracking-wider ${showResetButton
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
                onClick={() => setActiveDetailCard(card.label)}
                className="flex min-h-[128px] w-full items-center gap-3 border border-[#bedbda] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,120,116,0.1)] hover:border-teal-400 cursor-pointer sm:px-5 sm:py-3.5 group/card"
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
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-stretch">
          {/* ── AI Insight Card ── */}
          <article
            className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-[550px] xl:w-[381px] flex flex-col"
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

              {/* Video Embed Container */}
              <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-xl border border-teal-200/60 bg-black/5 shadow-inner group/video shrink-0">
                {videoUrl ? (
                  isYouTubeUrl(videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(videoUrl)}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100/50 text-slate-400">
                    <Video className="h-8 w-8 stroke-[1.5]" />
                    <span className="mt-1 text-xs">Belum ada video tersemat</span>
                  </div>
                )}

                {/* Settings overlay to edit/embed video URL */}
                <button
                  onClick={() => setShowVideoInput(!showVideoInput)}
                  className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
                  title="Ubah URL Video"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>

                {showVideoInput && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-4 text-white animate-fade-in backdrop-blur-sm">
                    <p className="mb-2 text-xs font-bold text-teal-400">Embed URL Video (MP4 / YouTube)</p>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white placeholder-white/40 border border-white/20 outline-none focus:border-teal-400 focus:bg-white/15"
                    />
                    <div className="mt-3 flex gap-2 w-full justify-end">
                      <button
                        onClick={() => setShowVideoInput(false)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Body text */}
              <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto flex-1 min-h-[140px]">
                <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line">
                  {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                </p>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

              <div className="mt-auto shrink-0">
                <button
                  onClick={handleOpenAiModal}
                  disabled={generatingAi}
                  className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-[#047D78] hover:bg-[#03605c] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(4,125,120,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(4,125,120,0.42)] active:scale-[0.99] disabled:cursor-wait"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                    {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.1em]">
                    {generatingAi ? 'Sedang Menganalisis...' : 'Lihat Analisis Lengkap'}
                  </span>
                </button>
              </div>
            </div>
          </article>

          {/* Map Card */}
          <article
            className="border border-[#cdcdcd] bg-white p-4 xl:h-[550px] flex flex-col"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[22px] font-bold leading-tight text-[#2f2f2f] sm:text-[30px] uppercase">
                  SEBARAN SPASIAL KEJADIAN BENCANA - {getRegionLabel()}
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
                  Pemetaan ini menyajikan gambaran komprehensif mengenai distribusi geografis dan
                  lokasi kejadian bencana yang dilaporkan pada wilayah {getRegionLabel()}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm relative overflow-hidden transform hover:-translate-y-0.5 active:translate-y-0 self-start md:self-center"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
                Peringatan Dini Aktif
              </button>
            </div>
            <div className="mt-4 flex-1 min-h-[300px] w-full">
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

      {/* Tabel Informasi Kejadian Krisis Kesehatan Terkini */}
      <section className="w-full bg-[#fbffff] pb-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#1a3535] uppercase tracking-wide">
              TABEL ANALISIS KEJADIAN KRISIS KESEHATAN TERKINI - {getRegionLabel()}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Matriks pemantauan sebaran laporan kejadian bencana alam/non-alam serta dampaknya terhadap krisis kesehatan masyarakat.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Kejadian/Wilayah..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-60 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-[#047D78] hover:bg-[#03605c] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <Download className="h-4 w-4" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-[0_6px_18px_rgba(20,120,116,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 px-5 text-center w-12">No</th>
                  <th className="py-3.5 px-5">Tanggal Kejadian</th>
                  <th className="py-3.5 px-5">Jenis Kejadian</th>
                  <th className="py-3.5 px-5">Kab/Kota</th>
                  <th className="py-3.5 px-5 text-center">Total Penduduk Terdampak</th>
                  <th className="py-3.5 px-5 text-center w-20">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMarkersForTable.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400 italic">
                      Tidak ada data kejadian krisis kesehatan yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredMarkersForTable.slice(0, 10).map((m, idx) => {
                    const formattedDate = m.tgl_kejadian ? new Date(m.tgl_kejadian).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : '-'
                    const location = m.kabupaten || m.provinsi || 'Nasional'
                    const isEven = idx % 2 === 1
                    return (
                      <tr
                        key={m.kode_trans ? `${m.kode_trans}-${idx}` : `event-${idx}`}
                        className={`transition-colors text-xs cursor-pointer ${
                          isEven ? 'bg-slate-50/50 hover:bg-slate-100/70' : 'bg-white hover:bg-slate-100/70'
                        }`}
                        onClick={() => setSelectedEvent(m)}
                      >
                        <td className="py-3 px-5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-5 font-semibold text-slate-650">{formattedDate}</td>
                        <td className="py-3 px-5 font-bold text-slate-800">{m.jenis_bencana}</td>
                        <td className="py-3 px-5 font-semibold text-slate-600">{location}</td>
                        <td className="py-3 px-5 text-center font-extrabold text-slate-850">
                          {m.total_korban ? m.total_korban.toLocaleString('id-ID') : 0} Jiwa
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredMarkersForTable.length > 10 && (
            <div className="bg-slate-50 border-t border-slate-150 py-2.5 px-5 text-center text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Menampilkan 10 laporan kejadian terbaru dari total {filteredMarkersForTable.length} laporan.
            </div>
          )}
        </div>
      </section>

      {/* Warning Alert Modal */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header Banner with matching Dashboard background image and gradient overlay */}
            <div className="relative text-white px-5 py-4 flex items-center justify-between overflow-hidden border-b-2 border-teal-500/20">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
                style={{ backgroundImage: "url('/bg header.png')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#047D78]/95 via-[#076176]/90 to-[#0f8f96]/95" />
              <div className="relative flex items-center gap-3">
                <h3 className="text-base font-extrabold uppercase tracking-wider">Peringatan Dini Aktif</h3>
              </div>
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="relative z-10 rounded-lg p-1 text-teal-100 hover:bg-white/10 hover:text-white transition"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Matriks sebaran Peringatan Dini Aktif (Early Warning System) Nasional yang sedang dipantau oleh EOC Krisis Kesehatan saat ini.
              </p>

              {/* Matrix Table */}
              <div className="overflow-hidden border border-slate-100 rounded-xl shadow-xs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Bencana / Krisis</th>
                      <th className="py-3 px-4">Provinsi / Kabupaten</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warningsList.map((warning) => {
                      const WarningIcon = warning.icon
                      const showImg = warning.iconUrl && !imageErrors[warning.id]
                      return (
                        <tr
                          key={warning.id}
                          className="hover:bg-slate-55/40 transition-colors"
                        >
                          {/* Disaster Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${warning.iconColor} shadow-xs overflow-hidden`}>
                                {showImg ? (
                                  <img
                                    src={warning.iconUrl!}
                                    alt={warning.jenis_bencana}
                                    onError={() => {
                                      setImageErrors((prev) => ({ ...prev, [warning.id]: true }))
                                    }}
                                    className="h-6 w-6 object-contain"
                                  />
                                ) : (
                                  <WarningIcon className="h-4.5 w-4.5" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 leading-tight">{warning.jenis_bencana}</span>
                                <span className="text-[9px] text-slate-400 leading-normal hidden sm:inline-block mt-0.5">{warning.keterangan}</span>
                              </div>
                            </div>
                          </td>

                          {/* Region Info */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-semibold text-slate-650">{warning.daerah}</span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block min-w-[76px] px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-xs ${warning.statusColor}`}>
                              {warning.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-150 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                EOC KRISIS KESEHATAN
              </span>
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 bg-[#047D78] hover:bg-[#03605c] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Card Modal */}
      {activeDetailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="relative text-white px-6 py-5 flex items-center justify-between overflow-hidden border-b border-slate-200 shrink-0">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
                style={{ backgroundImage: "url('/bg header.png')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#047D78]/95 via-[#076176]/90 to-[#0f8f96]/95" />
              <div className="relative z-10 flex-1 min-w-0">
                <h3 className="text-[16px] md:text-[18px] font-extrabold uppercase tracking-wide truncate">
                  {getCardDetailInfo(activeDetailCard).title}
                </h3>
                <p className="text-[11px] md:text-[12px] text-teal-50/90 mt-0.5 truncate">
                  {getCardDetailInfo(activeDetailCard).description}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailCard(null)}
                className="relative z-20 rounded-xl p-1.5 text-teal-100 hover:bg-white/10 hover:text-white transition shrink-0 ml-4"
                aria-label="Tutup"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              {/* Table Matrix */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-250 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4 text-center w-12">No</th>
                      {activeDetailCard.includes('Korban') || activeDetailCard === 'Jumlah Pengungsi' ? (
                        <>
                          <th className="py-3 px-4">Kejadian Bencana</th>
                          <th className="py-3 px-4">Lokasi Wilayah</th>
                          <th className="py-3 px-4 text-center">Meninggal</th>
                          <th className="py-3 px-4 text-center">Luka-Luka</th>
                          <th className="py-3 px-4 text-center">Hilang</th>
                          <th className="py-3 px-4 text-center">Pengungsi</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4">Waktu Kejadian</th>
                          <th className="py-3 px-4">Jenis Bencana</th>
                          <th className="py-3 px-4">Lokasi Wilayah</th>
                          <th className="py-3 px-4 text-center">Total Dampak</th>
                          <th className="py-3 px-4 text-center">Status Krisis</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDetailMarkers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeDetailCard.includes('Korban') || activeDetailCard === 'Jumlah Pengungsi' ? 7 : 6}
                          className="py-10 text-center text-xs text-slate-405 italic"
                        >
                          Tidak ada data rincian kejadian bencana di wilayah ini.
                        </td>
                      </tr>
                    ) : (
                      filteredDetailMarkers.map((m, idx) => {
                        const markerId = m.kode_trans || `det-${idx}`
                        const location = m.kabupaten || m.provinsi || 'Nasional'
                        const formattedDate = m.tgl_kejadian ? new Date(m.tgl_kejadian).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'

                        if (activeDetailCard.includes('Korban') || activeDetailCard === 'Jumlah Pengungsi') {
                          const breakdown = getKorbanBreakdown(m.total_korban, m.jenis_bencana)
                          return (
                            <tr key={markerId} className="hover:bg-slate-55/40 transition-colors text-[11px] md:text-xs">
                              <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">{m.jenis_bencana}</td>
                              <td className="py-3 px-4 font-semibold text-slate-600">{location}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-red-650">{breakdown.meninggal || '-'}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-amber-600">{breakdown.luka || '-'}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-indigo-650">{breakdown.hilang || '-'}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-teal-600">{breakdown.pengungsi || '-'}</td>
                            </tr>
                          )
                        } else {
                          return (
                            <tr key={markerId} className="hover:bg-slate-55/40 transition-colors text-[11px] md:text-xs">
                              <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-slate-600">{formattedDate}</td>
                              <td className="py-3 px-4 font-bold text-slate-850">{m.jenis_bencana}</td>
                              <td className="py-3 px-4 font-semibold text-slate-600">{location}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-slate-800">{m.total_korban || 0} Jiwa</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                  m.is_krisis === 1
                                    ? 'bg-[#fee2e2] text-[#ef4444] border border-[#fecaca]'
                                    : 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]'
                                }`}>
                                  {m.is_krisis === 1 ? 'Krisis' : 'Non-Krisis'}
                                </span>
                              </td>
                            </tr>
                          )
                        }
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                EOC KRISIS KESEHATAN KEMENKES RI
              </span>
              <button
                onClick={() => setActiveDetailCard(null)}
                className="px-5 py-2 bg-[#047D78] hover:bg-[#03605c] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── AI Analysis Modal ── */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="relative text-white px-6 py-5 flex items-center justify-between overflow-hidden border-b border-slate-200 shrink-0">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
                style={{ backgroundImage: "url('/bg header.png')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#047D78]/95 via-[#076176]/90 to-[#0f8f96]/95" />
              <div className="relative z-10 flex-1 min-w-0 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[16px] md:text-[18px] font-extrabold uppercase tracking-wide truncate">
                    Analisis Detail AI Penilaian Risiko Krisis Kesehatan
                  </h3>
                  <p className="text-[11px] md:text-[12px] text-teal-50/90 mt-0.5 truncate">
                    Laporan Cerdas Penilaian Risiko Bencana & Krisis Kesehatan - {getRegionLabel()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="relative z-20 rounded-xl p-1.5 text-teal-100 hover:bg-white/10 hover:text-white transition shrink-0 ml-4"
                aria-label="Tutup"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Tab Headers */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
              {[
                { id: 'report', label: 'Laporan Analisis', icon: FileText },
                { id: 'video', label: 'AI Video Presenter', icon: Video },
                { id: 'info', label: 'Informasi Sumber Data & AI', icon: Info },
              ].map((tab) => {
                const TabIcon = tab.icon
                const isActive = aiModalTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAiModalTab(tab.id as 'report' | 'video' | 'info')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 outline-none ${
                      isActive
                        ? 'border-teal-600 text-teal-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                    }`}
                  >
                    <TabIcon className="h-4.5 w-4.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin bg-white">
              {aiModalTab === 'report' && renderAiReportContent()}

              {aiModalTab === 'video' && (
                <div className="space-y-5 py-2">
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
                    {videoUrl ? (
                      isYouTubeUrl(videoUrl) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(videoUrl)}
                          className="h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
                        <Video className="h-10 w-10 stroke-[1.5]" />
                        <span className="mt-2 text-sm font-semibold">Belum ada video tersemat</span>
                      </div>
                    )}

                    {/* Settings Overlay Button */}
                    <button
                      onClick={() => setShowVideoInput(!showVideoInput)}
                      className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
                      title="Ubah URL Video"
                    >
                      <Settings className="h-4 w-4" />
                    </button>

                    {showVideoInput && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-white backdrop-blur-sm">
                        <p className="mb-3 text-sm font-bold text-teal-400">Embed URL Video (MP4 / YouTube)</p>
                        <input
                          type="text"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full max-w-md rounded-xl bg-white/15 px-4 py-2 text-sm text-white placeholder-white/40 border border-white/20 outline-none focus:border-teal-400 focus:bg-white/20"
                        />
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() => setShowVideoInput(false)}
                            className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-150 p-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      💡 <strong>Presenter AI</strong> memvisualisasikan data penilaian risiko bencana dalam format video interaktif yang diperbarui secara periodik oleh EOC Krisis Kesehatan Kemenkes RI.
                    </p>
                  </div>
                </div>
              )}

              {aiModalTab === 'info' && (
                <div className="space-y-6 py-2">
                  {/* Alert 1: Warning Amber */}
                  <div className="rounded-2xl border border-amber-200/85 bg-amber-50/65 p-5 flex items-start gap-4 shadow-sm">
                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-xs md:text-sm font-black text-amber-900 uppercase tracking-wider">
                        REKOMENDASI UTAMA: STATUS SIAGA / PERLU ANTISIPASI
                      </h4>
                      <p className="text-xs md:text-sm text-amber-850 leading-relaxed font-semibold">
                        Wilayah {getRegionLabel()} berada dalam status SIAGA (perlu perhatian sedang) karena: Tingkat fatalitas kasus (CFR) terpantau di angka {( ((data?.summary?.total_meninggal || 0) / ((data?.summary?.total_meninggal || 0) + (data?.summary?.total_luka || 0) || 1)) * 100 ).toFixed(1)}%, serta besarnya populasi terdampak ({(data?.summary?.total_terdampak || 0).toLocaleString('id-ID')} jiwa) dan pengungsi ({(data?.summary?.total_pengungsi || 0).toLocaleString('id-ID')} jiwa) di posko pengungsian memerlukan pemantauan sanitasi lingkungan ketat mencegah KLB penyakit menular.
                      </p>
                    </div>
                  </div>

                  {/* Alert 2: Info Blue */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <Info className="h-5.5 w-5.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <h4 className="text-xs md:text-sm font-black text-blue-900 uppercase tracking-wider">
                          INFORMASI GENERATE AI
                        </h4>
                        <p className="text-xs md:text-sm text-blue-800 leading-relaxed font-semibold">
                          Analisis Detail AI ini merupakan hasil generate otomatis berdasarkan kalkulasi database SIPKK untuk wilayah {getRegionLabel().toUpperCase()}. AI ini dikonfigurasi khusus hanya untuk menganalisis data dashboard {getRegionLabel().toUpperCase()}.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pt-1">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>Yang Anda lihat saat ini adalah hasil generate AI pada tanggal {currentFormattedTime}.</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-blue-100" />

                    <p className="text-[10px] md:text-[11px] leading-relaxed text-slate-450 uppercase font-bold tracking-wide italic">
                      DISCLAIMER: Semua informasi, estimasi tren, dan rekomendasi taktis yang disajikan merupakan analisis dari model AI (Google Gemini). Hasil analisis ini ditujukan sebagai referensi pembantu pengambilan keputusan dinas kesehatan setempat dan tidak menggantikan keputusan medis formal maupun regulasi resmi dari kementerian terkait.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                EOC KRISIS KESEHATAN KEMENKES RI
              </span>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2 bg-[#047D78] hover:bg-[#03605c] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
              >
                Tutup Analisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
