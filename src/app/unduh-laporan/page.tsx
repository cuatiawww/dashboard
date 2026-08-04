'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Download,
  Filter,
  Search,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  ExternalLink,
  ShieldAlert,
  Building2,
  Users,
  Sparkles,
  Printer,
  RotateCcw,
  Info,
  Check,
  Globe,
  Loader2,
  Home,
} from 'lucide-react'
import { useHeaderStore } from '@/lib/headerStore'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
import { useAuthStore } from '@/lib/authStore'
import { buildRegionsUrl } from '@/lib/utils/api'

// Data model type
export type LaporanItem = {
  id: number
  kode_laporan: string
  tgl_kejadian: string
  tgl_kejadian_formatted: string
  jam_kejadian: string
  tgl_perkembangan: string
  tgl_perkembangan_formatted: string
  jam_perkembangan: string
  tingkat_bencana: string
  provinsi: string
  kabupaten: string
  kecamatan: string
  desa: string
  jenis_bencana: string
  korban_meninggal: number
  korban_luka_berat: number
  korban_luka_ringan: number
  korban_hilang: number
  penduduk_terdampak: number
  pengungsi: number
  faskes_terdampak: number
  status_verifikasi: 'Diverifikasi' | 'Menunggu Verifikasi' | 'Draft'
  deskripsi: string
  petugas: string
}

// Region Autocomplete Suggestion type
export type RegionSuggestion = {
  id: string
  level: 'PROVINSI' | 'KABUPATEN' | 'KECAMATAN' | 'DESA'
  name: string
  fullName: string // e.g. "KEC. Rajadesa (Kab. Ciamis, Jawa Barat)"
  provinsi: string
  kabupaten?: string
  kecamatan?: string
  desa?: string
}

// Full 38 Indonesian Provinces list
const ALL_INDONESIA_PROVINCES = [
  'ACEH',
  'SUMATERA UTARA',
  'SUMATERA BARAT',
  'RIAU',
  'KEPULAUAN RIAU',
  'JAMBI',
  'SUMATERA SELATAN',
  'KEPULAUAN BANGKA BELITUNG',
  'BENGKULU',
  'LAMPUNG',
  'DKI JAKARTA',
  'JAWA BARAT',
  'BANTEN',
  'JAWA TENGAH',
  'DI YOGYAKARTA',
  'JAWA TIMUR',
  'BALI',
  'NUSA TENGGARA BARAT',
  'NUSA TENGGARA TIMUR',
  'KALIMANTAN BARAT',
  'KALIMANTAN TENGAH',
  'KALIMANTAN SELATAN',
  'KALIMANTAN TIMUR',
  'KALIMANTAN UTARA',
  'SULAWESI UTARA',
  'GORONTALO',
  'SULAWESI TENGAH',
  'SULAWESI BARAT',
  'SULAWESI SELATAN',
  'SULAWESI TENGGARA',
  'MALUKU',
  'MALUKU UTARA',
  'PAPUA',
  'PAPUA BARAT',
  'PAPUA BARAT DAYA',
  'PAPUA TENGAH',
  'PAPUA PEGUNUNGAN',
  'PAPUA SELATAN',
]

// Comprehensive Master list of Region Autocomplete Suggestions (PROVINSI, KABUPATEN, KECAMATAN, DESA)
const MASTER_REGION_SUGGESTIONS: RegionSuggestion[] = [
  // === PROVINSI ===
  ...ALL_INDONESIA_PROVINCES.map((prov, i) => ({
    id: `prov-${i + 1}`,
    level: 'PROVINSI' as const,
    name: prov,
    fullName: `PROV. ${prov}`,
    provinsi: prov,
  })),

  // === KABUPATEN / KOTA ===
  {
    id: 'kab-1',
    level: 'KABUPATEN',
    name: 'Ciamis',
    fullName: 'KAB. Ciamis (Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIAMIS',
  },
  {
    id: 'kab-2',
    level: 'KABUPATEN',
    name: 'Musi Banyuasin',
    fullName: 'KAB. Musi Banyuasin (Sumatera Selatan)',
    provinsi: 'SUMATERA SELATAN',
    kabupaten: 'KAB. MUSI BANYUASIN',
  },
  {
    id: 'kab-3',
    level: 'KABUPATEN',
    name: 'Pekalongan',
    fullName: 'KAB. Pekalongan (Jawa Tengah)',
    provinsi: 'JAWA TENGAH',
    kabupaten: 'KAB. PEKALONGAN',
  },
  {
    id: 'kab-4',
    level: 'KABUPATEN',
    name: 'Sumbawa',
    fullName: 'KAB. Sumbawa (Nusa Tenggara Barat)',
    provinsi: 'NUSA TENGGARA BARAT',
    kabupaten: 'KAB. SUMBAWA',
  },
  {
    id: 'kab-5',
    level: 'KABUPATEN',
    name: 'Cirebon',
    fullName: 'KAB. Cirebon (Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIREBON',
  },
  {
    id: 'kab-6',
    level: 'KABUPATEN',
    name: 'Sarolangun',
    fullName: 'KAB. Sarolangun (Jambi)',
    provinsi: 'JAMBI',
    kabupaten: 'KAB. SAROLANGUN',
  },
  {
    id: 'kab-7',
    level: 'KABUPATEN',
    name: 'Kampar',
    fullName: 'KAB. Kampar (Riau)',
    provinsi: 'RIAU',
    kabupaten: 'KAB. KAMPAR',
  },
  {
    id: 'kab-8',
    level: 'KABUPATEN',
    name: 'Kota Palangka Raya',
    fullName: 'KOTA Palangka Raya (Kalimantan Tengah)',
    provinsi: 'KALIMANTAN TENGAH',
    kabupaten: 'KOTA PALANGKA RAYA',
  },
  {
    id: 'kab-9',
    level: 'KABUPATEN',
    name: 'Probolinggo',
    fullName: 'KAB. Probolinggo (Jawa Timur)',
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KAB. PROBOLINGGO',
  },
  {
    id: 'kab-10',
    level: 'KABUPATEN',
    name: 'Cianjur',
    fullName: 'KAB. Cianjur (Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIANJUR',
  },
  {
    id: 'kab-11',
    level: 'KABUPATEN',
    name: 'Gayo Lues',
    fullName: 'KAB. Gayo Lues (Aceh)',
    provinsi: 'ACEH',
    kabupaten: 'KAB. GAYO LUES',
  },
  {
    id: 'kab-12',
    level: 'KABUPATEN',
    name: 'Padang Pariaman',
    fullName: 'KAB. Padang Pariaman (Sumatera Barat)',
    provinsi: 'SUMATERA BARAT',
    kabupaten: 'KAB. PADANG PARIAMAN',
  },
  {
    id: 'kab-13',
    level: 'KABUPATEN',
    name: 'Flores Timur',
    fullName: 'KAB. Flores Timur (Nusa Tenggara Timur)',
    provinsi: 'NUSA TENGGARA TIMUR',
    kabupaten: 'KAB. FLORES TIMUR',
  },
  {
    id: 'kab-14',
    level: 'KABUPATEN',
    name: 'Belitung Timur',
    fullName: 'KAB. Belitung Timur (Kep. Bangka Belitung)',
    provinsi: 'KEPULAUAN BANGKA BELITUNG',
    kabupaten: 'KAB. BELITUNG TIMUR',
  },
  {
    id: 'kab-15',
    level: 'KABUPATEN',
    name: 'Kota Banjarbaru',
    fullName: 'KOTA Banjarbaru (Kalimantan Selatan)',
    provinsi: 'KALIMANTAN SELATAN',
    kabupaten: 'KOTA BANJAR BARU',
  },
  {
    id: 'kab-16',
    level: 'KABUPATEN',
    name: 'Kota Tangerang',
    fullName: 'KOTA Tangerang (Banten)',
    provinsi: 'BANTEN',
    kabupaten: 'KAB. KOTA TANGERANG',
  },
  {
    id: 'kab-17',
    level: 'KABUPATEN',
    name: 'Pasaman Barat',
    fullName: 'KAB. Pasaman Barat (Sumatera Barat)',
    provinsi: 'SUMATERA BARAT',
    kabupaten: 'KAB. PASAMAN BARAT',
  },
  {
    id: 'kab-18',
    level: 'KABUPATEN',
    name: 'Sukabumi',
    fullName: 'KAB. Sukabumi (Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. SUKABUMI',
  },
  {
    id: 'kab-19',
    level: 'KABUPATEN',
    name: 'Intan Jaya',
    fullName: 'KAB. Intan Jaya (Papua Tengah)',
    provinsi: 'PAPUA TENGAH',
    kabupaten: 'KAB. INTAN JAYA',
  },
  {
    id: 'kab-20',
    level: 'KABUPATEN',
    name: 'Sumedang',
    fullName: 'KAB. Sumedang (Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. SUMEDANG',
  },
  {
    id: 'kab-21',
    level: 'KABUPATEN',
    name: 'Luwu Utara',
    fullName: 'KAB. Luwu Utara (Sulawesi Selatan)',
    provinsi: 'SULAWESI SELATAN',
    kabupaten: 'KAB. LUWU UTARA',
  },

  // === KECAMATAN ===
  {
    id: 'sug-1',
    level: 'KECAMATAN',
    name: 'Rajadesa',
    fullName: 'KEC. Rajadesa (Kab. Ciamis, Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIAMIS',
    kecamatan: 'Rajadesa',
  },
  {
    id: 'sug-2',
    level: 'KECAMATAN',
    name: 'Sanga Desa',
    fullName: 'KEC. Sanga Desa (Kab. Musi Banyuasin, Sumatera Selatan)',
    provinsi: 'SUMATERA SELATAN',
    kabupaten: 'KAB. MUSI BANYUASIN',
    kecamatan: 'Sanga Desa',
  },
  {
    id: 'sug-3',
    level: 'KECAMATAN',
    name: 'Wiradesa',
    fullName: 'KEC. Wiradesa (Kab. Pekalongan, Jawa Tengah)',
    provinsi: 'JAWA TENGAH',
    kabupaten: 'KAB. PEKALONGAN',
    kecamatan: 'Wiradesa',
  },
  {
    id: 'sug-11',
    level: 'KECAMATAN',
    name: 'Jekan Raya',
    fullName: 'KEC. Jekan Raya (Kota Palangka Raya, Kalimantan Tengah)',
    provinsi: 'KALIMANTAN TENGAH',
    kabupaten: 'KOTA PALANGKA RAYA',
    kecamatan: 'Jekan Raya',
  },
  {
    id: 'sug-12',
    level: 'KECAMATAN',
    name: 'Cugenang',
    fullName: 'KEC. Cugenang (Kab. Cianjur, Jawa Barat)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIANJUR',
    kecamatan: 'Cugenang',
  },
  {
    id: 'sug-13',
    level: 'KECAMATAN',
    name: 'Blangkejeren',
    fullName: 'KEC. Blangkejeren (Kab. Gayo Lues, Aceh)',
    provinsi: 'ACEH',
    kabupaten: 'KAB. GAYO LUES',
    kecamatan: 'Blangkejeren',
  },
  {
    id: 'sug-14',
    level: 'KECAMATAN',
    name: 'Tegalwenuan',
    fullName: 'KEC. Tegalwenuan (Kab. Probolinggo, Jawa Timur)',
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KAB. PROBOLINGGO',
    kecamatan: 'Tegalwenuan',
  },
  {
    id: 'sug-16',
    level: 'KECAMATAN',
    name: 'Adonara',
    fullName: 'KEC. Adonara (Kab. Flores Timur, NTT)',
    provinsi: 'NUSA TENGGARA TIMUR',
    kabupaten: 'KAB. FLORES TIMUR',
    kecamatan: 'Adonara',
  },
  {
    id: 'sug-18',
    level: 'KECAMATAN',
    name: 'Batuceper',
    fullName: 'KEC. Batuceper (Kota Tangerang, Banten)',
    provinsi: 'BANTEN',
    kabupaten: 'KAB. KOTA TANGERANG',
    kecamatan: 'Batuceper',
  },
  {
    id: 'sug-20',
    level: 'KECAMATAN',
    name: 'Masamba',
    fullName: 'KEC. Masamba (Kab. Luwu Utara, Sulawesi Selatan)',
    provinsi: 'SULAWESI SELATAN',
    kabupaten: 'KAB. LUWU UTARA',
    kecamatan: 'Masamba',
  },

  // === DESA / KELURAHAN ===
  {
    id: 'sug-4',
    level: 'DESA',
    name: 'Bao Desa',
    fullName: 'DESA/KEL. Bao Desa (KEC. Batu Lanteh, Kab. Sumbawa)',
    provinsi: 'NUSA TENGGARA BARAT',
    kabupaten: 'KAB. SUMBAWA',
    kecamatan: 'Batu Lanteh',
    desa: 'Bao Desa',
  },
  {
    id: 'sug-5',
    level: 'DESA',
    name: 'Bodesari',
    fullName: 'DESA/KEL. Bodesari (KEC. Plumbon, Kab. Cirebon)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIREBON',
    kecamatan: 'Plumbon',
    desa: 'Bodesari',
  },
  {
    id: 'sug-6',
    level: 'DESA',
    name: 'Desa Baru',
    fullName: 'DESA/KEL. Desa Baru (KEC. Air Hitam, Kab. Sarolangun)',
    provinsi: 'JAMBI',
    kabupaten: 'KAB. SAROLANGUN',
    kecamatan: 'Air Hitam',
    desa: 'Desa Baru',
  },
  {
    id: 'sug-7',
    level: 'DESA',
    name: 'Desa Baru',
    fullName: 'DESA/KEL. Desa Baru (KEC. Siak Hulu, Kab. Kampar)',
    provinsi: 'RIAU',
    kabupaten: 'KAB. KAMPAR',
    kecamatan: 'Siak Hulu',
    desa: 'Desa Baru',
  },
  {
    id: 'sug-8',
    level: 'DESA',
    name: 'Kelurahan Palangka',
    fullName: 'DESA/KEL. Kelurahan Palangka (KEC. Jekan Raya, Kota Palangka Raya)',
    provinsi: 'KALIMANTAN TENGAH',
    kabupaten: 'KOTA PALANGKA RAYA',
    kecamatan: 'Jekan Raya',
    desa: 'Kelurahan Palangka',
  },
  {
    id: 'sug-9',
    level: 'DESA',
    name: 'Desa Gasol',
    fullName: 'DESA/KEL. Desa Gasol (KEC. Cugenang, Kab. Cianjur)',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KAB. CIANJUR',
    kecamatan: 'Cugenang',
    desa: 'Desa Gasol',
  },
  {
    id: 'sug-10',
    level: 'DESA',
    name: 'Gampong Kutelintang',
    fullName: 'DESA/KEL. Gampong Kutelintang (KEC. Blangkejeren, Kab. Gayo Lues)',
    provinsi: 'ACEH',
    kabupaten: 'KAB. GAYO LUES',
    kecamatan: 'Blangkejeren',
    desa: 'Gampong Kutelintang',
  },
  {
    id: 'sug-15',
    level: 'DESA',
    name: 'Desa Tegalwenuan Wetan',
    fullName: 'DESA/KEL. Desa Tegalwenuan Wetan (KEC. Tegalwenuan, Kab. Probolinggo)',
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KAB. PROBOLINGGO',
    kecamatan: 'Tegalwenuan',
    desa: 'Desa Tegalwenuan Wetan',
  },
  {
    id: 'sug-17',
    level: 'DESA',
    name: 'Desa Klatanlo',
    fullName: 'DESA/KEL. Desa Klatanlo (KEC. Adonara, Kab. Flores Timur)',
    provinsi: 'NUSA TENGGARA TIMUR',
    kabupaten: 'KAB. FLORES TIMUR',
    kecamatan: 'Adonara',
    desa: 'Desa Klatanlo',
  },
  {
    id: 'sug-19',
    level: 'DESA',
    name: 'Kelurahan Batuceper',
    fullName: 'DESA/KEL. Kelurahan Batuceper (KEC. Batuceper, Kota Tangerang)',
    provinsi: 'BANTEN',
    kabupaten: 'KAB. KOTA TANGERANG',
    kecamatan: 'Batuceper',
    desa: 'Kelurahan Batuceper',
  },
  {
    id: 'sug-21',
    level: 'DESA',
    name: 'Kelurahan Bone',
    fullName: 'DESA/KEL. Kelurahan Bone (KEC. Masamba, Kab. Luwu Utara)',
    provinsi: 'SULAWESI SELATAN',
    kabupaten: 'KAB. LUWU UTARA',
    kecamatan: 'Masamba',
    desa: 'Kelurahan Bone',
  },
]

const ALL_JENIS_BENCANA: string[] = [
  'Banjir',
  'Kebakaran Hutan dan Lahan',
  'Gempa Bumi',
  'Letusan Gunung Api',
  'Angin Puting Beliung',
  'Tanah Longsor',
  'Banjir Bandang',
  'Gelombang Tinggi / Abrasi',
  'Konflik Sosial atau Kerusuhan Sosial',
  'Kebakaran Permukiman',
  'Kekeringan',
  'Tsunami',
  'Wabah / KLB Penyakit',
  'Keracunan',
  'Lainnya',
]

export default function UnduhLaporanPage() {
  const { setHeader } = useHeaderStore()
  const { user } = useAuthStore()

  // Initialize Header store titles on mount
  useEffect(() => {
    setHeader({
      title: 'REKAP & UNDUH LAPORAN KEJADIAN BENCANA',
      description: 'Pusat filter terpadu dan ekstraksi matriks laporan kejadian bencana kesehatan real-time untuk kebutuhan unduh data (Excel, PDF, CSV).',
      lastUpdated: 'Baru Saja'
    })
  }, [setHeader])

  // MULTIPLE SELECT FILTER STATES & LIVE API DATA FETCHING
  const [reports, setReports] = useState<LaporanItem[]>([])
  const [loadingApiReports, setLoadingApiReports] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('all')
  const [filterKorbanOnly, setFilterKorbanOnly] = useState(false)
  const [filterFaskesOnly, setFilterFaskesOnly] = useState(false)

  // Fetch live reports data from API proxy (/api/bencana-stats)
  useEffect(() => {
    const fetchLiveReports = async () => {
      setLoadingApiReports(true)
      try {
        const token = useAuthStore.getState().token
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${basePath}/api/bencana-stats`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        })

        if (res.ok) {
          const json = await res.json().catch(() => null)
          if (json?.markers && Array.isArray(json.markers) && json.markers.length > 0) {
            const mapped: LaporanItem[] = json.markers.map((m: any, idx: number) => {
              const d = m.tgl_kejadian ? new Date(m.tgl_kejadian) : new Date()
              const dateStr = !isNaN(d.getTime())
                ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : m.tgl_kejadian || 'Terbaru'
              const timeStr = !isNaN(d.getTime())
                ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                : '08:00 WIB'

              return {
                id: idx + 1,
                kode_laporan: m.kode_trans || m.id || `LAP-${d.getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
                tgl_kejadian: m.tgl_kejadian || new Date().toISOString(),
                tgl_kejadian_formatted: dateStr,
                jam_kejadian: timeStr,
                tgl_perkembangan: m.tgl_perkembangan || m.tgl_kejadian || new Date().toISOString(),
                tgl_perkembangan_formatted: dateStr,
                jam_perkembangan: timeStr,
                tingkat_bencana: m.provinsi ? 'Provinsi' : 'Kab/Kota',
                provinsi: (m.provinsi || 'Lainnya').toUpperCase(),
                kabupaten: (m.kabupaten || 'Lainnya').toUpperCase(),
                kecamatan: m.kecamatan || m.nama_kecamatan || 'Kecamatan',
                desa: m.nama_desa || m.desa || 'Desa',
                jenis_bencana: m.jenis_bencana || m.kategori_bencana || 'Lainnya',
                korban_meninggal: Number(m.jml_meninggal || m.korban_meninggal || 0),
                korban_luka_berat: Number(m.jml_lkbrt || m.korban_luka_berat || 0),
                korban_luka_ringan: Number(m.jml_lkringan || m.korban_luka_ringan || 0),
                korban_hilang: Number(m.jml_hilang || m.korban_hilang || 0),
                penduduk_terdampak: Number(m.jml_pdk_terdampak || m.penduduk_terdampak || 0),
                pengungsi: Number(m.jml_pengungsi || m.pengungsi || 0),
                faskes_terdampak: Number(m.faskes_terdampak || m.jml_faskes || (m.is_krisis ? 1 : 0)),
                status_verifikasi: (m.status_verifikasi as any) || 'Diverifikasi',
                deskripsi: m.deskripsi || m.narasi || `Kejadian bencana ${m.jenis_bencana || 'kesehatan'} di wilayah ${m.provinsi || ''} ${m.kabupaten || ''}. Tim EOC Krisis Kesehatan melayani pendampingan pasien dan pengungsi.`,
                petugas: m.petugas || m.created_by || 'Petugas EOC Kemenkes'
              }
            })

            setReports(mapped)
            console.log('[UnduhLaporanPage] Loaded live reports from API:', mapped.length)
          }
        }
      } catch (err) {
        console.error('[UnduhLaporanPage] Error loading live reports API, using fallback data:', err)
      } finally {
        setLoadingApiReports(false)
      }
    }

    fetchLiveReports()
  }, [])

  // Smart Region Autocomplete Search State (PROV, KAB, KEC, DESA)
  const [regionInputQuery, setRegionInputQuery] = useState('')
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [selectedRegionPills, setSelectedRegionPills] = useState<RegionSuggestion[]>([])
  const regionDropdownRef = useRef<HTMLDivElement>(null)

  const [provinceSearch, setProvinceSearch] = useState('')
  const [provinceList, setProvinceList] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProvinces, setLoadingProvinces] = useState(true)

  // Close region autocomplete dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) {
        setShowRegionDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch live 38 provinces from API or fallback
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true)
      try {
        const res = await fetch(buildRegionsUrl())
        const contentType = res.headers.get('content-type') || ''
        if (res.ok && contentType.includes('application/json')) {
          const payload = await res.json()
          if (payload?.success && Array.isArray(payload?.data) && payload.data.length > 0) {
            const mapped = payload.data.map((item: any) => ({
              id: String(item.code || item.id),
              name: String(item.name).toUpperCase(),
            }))
            setProvinceList(mapped)
            return
          }
        }
      } catch (err) {
        console.error('Failed loading provinces API, using full fallback list:', err)
      } finally {
        setLoadingProvinces(false)
      }

      setProvinceList(ALL_INDONESIA_PROVINCES.map((p, idx) => ({ id: String(idx + 1), name: p })))
    }

    fetchProvinces()
  }, [])

  // Sync initial scope from dashboard user state if present
  useEffect(() => {
    if (user?.wilayah_scope?.provinsi?.label) {
      const activeProvName = user.wilayah_scope.provinsi.label.toUpperCase()
      const match = provinceList.find(p => p.name.toUpperCase() === activeProvName)
      if (match && selectedProvinces.length === 0) {
        setSelectedProvinces([match.name])
      }
    }
  }, [user, provinceList, selectedProvinces.length])

  // Accordion toggle states in Filter Sidebar
  const [expandedSection, setExpandedSection] = useState<{ [key: string]: boolean }>({
    smartRegion: true,
    provinsi: true,
    jenisBencana: true,
    tanggal: true,
    status: true,
    dampak: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Selected report for detail modal
  const [detailItem, setDetailItem] = useState<LaporanItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Region Autocomplete Suggestions Calculation (Full PROV, KAB, KEC, DESA)
  const filteredRegionSuggestions = useMemo(() => {
    if (!regionInputQuery.trim() || regionInputQuery.trim().length < 2) return []
    const q = regionInputQuery.toLowerCase().trim()

    // Filter master region suggestions
    const matches = MASTER_REGION_SUGGESTIONS.filter((sug) =>
      sug.fullName.toLowerCase().includes(q) ||
      sug.name.toLowerCase().includes(q) ||
      (sug.kabupaten && sug.kabupaten.toLowerCase().includes(q)) ||
      (sug.kecamatan && sug.kecamatan.toLowerCase().includes(q)) ||
      (sug.desa && sug.desa.toLowerCase().includes(q))
    )

    // Deduplicate by fullName
    const seen = new Set()
    return matches.filter((item) => {
      const duplicateKey = item.fullName.toLowerCase()
      if (seen.has(duplicateKey)) return false
      seen.add(duplicateKey)
      return true
    }).slice(0, 14)
  }, [regionInputQuery])

  // Select region suggestion handler
  const handleSelectRegionSuggestion = (sug: RegionSuggestion) => {
    if (!selectedRegionPills.some((r) => r.id === sug.id || r.fullName === sug.fullName)) {
      setSelectedRegionPills([...selectedRegionPills, sug])
    }
    setRegionInputQuery('')
    setShowRegionDropdown(false)
    setCurrentPage(1)
    showToast(`Filter wilayah "${sug.name}" (${sug.level}) diterapkan!`)
  }

  const handleRemoveRegionPill = (id: string) => {
    setSelectedRegionPills(selectedRegionPills.filter((r) => r.id !== id))
    setCurrentPage(1)
  }

  // Multiple toggle handlers
  const handleTypeToggle = (jenis: string) => {
    if (selectedTypes.includes(jenis)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== jenis))
    } else {
      setSelectedTypes([...selectedTypes, jenis])
    }
    setCurrentPage(1)
  }

  const handleProvinceToggle = (provName: string) => {
    if (selectedProvinces.includes(provName)) {
      setSelectedProvinces(selectedProvinces.filter((p) => p !== provName))
    } else {
      setSelectedProvinces([...selectedProvinces, provName])
    }
    setCurrentPage(1)
  }

  const handleSelectAllProvinces = () => {
    if (selectedProvinces.length === provinceList.length) {
      setSelectedProvinces([])
    } else {
      setSelectedProvinces(provinceList.map((p) => p.name))
    }
    setCurrentPage(1)
  }

  const handleStatusToggle = (st: string) => {
    if (selectedStatuses.includes(st)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== st))
    } else {
      setSelectedStatuses([...selectedStatuses, st])
    }
    setCurrentPage(1)
  }

  // Clear all filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedTypes([])
    setSelectedProvinces([])
    setSelectedStatuses([])
    setSelectedDatePreset('all')
    setFilterKorbanOnly(false)
    setFilterFaskesOnly(false)
    setProvinceSearch('')
    setRegionInputQuery('')
    setSelectedRegionPills([])
    setCurrentPage(1)
    showToast('Semua filter telah dibersihkan.')
  }

  // Active filter count computation
  const activeFilterCount = useMemo(() => {
    let count = 0
    count += selectedTypes.length
    count += selectedProvinces.length
    count += selectedStatuses.length
    count += selectedRegionPills.length
    if (selectedDatePreset !== 'all') count += 1
    if (filterKorbanOnly) count += 1
    if (filterFaskesOnly) count += 1
    if (searchQuery.trim() !== '') count += 1
    return count
  }, [selectedTypes, selectedProvinces, selectedStatuses, selectedRegionPills, selectedDatePreset, filterKorbanOnly, filterFaskesOnly, searchQuery])

  // Filtering engine supporting deep location hierarchy (Prov, Kab, Kec, Desa)
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // 1. Text Search Query (Searches code, disaster, province, kabupaten, kecamatan, desa, narasi)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch =
          item.kode_laporan.toLowerCase().includes(q) ||
          item.jenis_bencana.toLowerCase().includes(q) ||
          item.provinsi.toLowerCase().includes(q) ||
          item.kabupaten.toLowerCase().includes(q) ||
          item.kecamatan.toLowerCase().includes(q) ||
          item.desa.toLowerCase().includes(q) ||
          item.deskripsi.toLowerCase().includes(q) ||
          item.petugas.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      // 2. Multiple Jenis Bencana Checkboxes
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(item.jenis_bencana)) return false
      }

      // 3. Multiple Provinsi Checkboxes (38 provinces exact match)
      if (selectedProvinces.length > 0) {
        const itemProvUpper = item.provinsi.toUpperCase().trim()
        const matchesProv = selectedProvinces.some((p) => p.toUpperCase().trim() === itemProvUpper)
        if (!matchesProv) return false
      }

      // 4. Smart Region Pills (Autocomplete Pills: Prov, Kab, Kec, Desa)
      if (selectedRegionPills.length > 0) {
        const matchesAnyPill = selectedRegionPills.some((pill) => {
          const nameLower = pill.name.toLowerCase().trim()
          if (pill.level === 'PROVINSI') {
            return item.provinsi.toLowerCase().includes(nameLower)
          }
          if (pill.level === 'KABUPATEN') {
            return item.kabupaten.toLowerCase().includes(nameLower)
          }
          if (pill.level === 'KECAMATAN') {
            return item.kecamatan.toLowerCase().includes(nameLower)
          }
          if (pill.level === 'DESA') {
            return item.desa.toLowerCase().includes(nameLower)
          }
          return false
        })
        if (!matchesAnyPill) return false
      }

      // 5. Multiple Status Verifikasi
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(item.status_verifikasi)) return false
      }

      // 6. Korban Only
      if (filterKorbanOnly) {
        const totalKorban = item.korban_meninggal + item.korban_luka_berat + item.korban_luka_ringan + item.korban_hilang
        if (totalKorban === 0) return false
      }

      // 7. Faskes Terdampak Only
      if (filterFaskesOnly) {
        if (item.faskes_terdampak === 0) return false
      }

      // 8. Date Filter Preset
      if (selectedDatePreset === '7days') {
        if (!item.tgl_kejadian_formatted.includes('22 Jul') && !item.tgl_kejadian_formatted.includes('21 Jul') && !item.tgl_kejadian_formatted.includes('20 Jul')) {
          return false
        }
      } else if (selectedDatePreset === '30days') {
        if (!item.tgl_kejadian_formatted.includes('Jul 2026')) {
          return false
        }
      }

      return true
    })
  }, [reports, searchQuery, selectedTypes, selectedProvinces, selectedRegionPills, selectedStatuses, filterKorbanOnly, filterFaskesOnly, selectedDatePreset])

  // Filtered Province List for Search
  const filteredProvinceList = useMemo(() => {
    if (!provinceSearch.trim()) return provinceList
    const q = provinceSearch.toLowerCase().trim()
    return provinceList.filter((p) => p.name.toLowerCase().includes(q))
  }, [provinceList, provinceSearch])

  // Dynamic Metrics Overview Cards
  const metrics = useMemo(() => {
    const totalReports = filteredReports.length
    let totalMeninggal = 0
    let totalLuka = 0
    let totalTerdampak = 0
    let totalFaskes = 0

    filteredReports.forEach((r) => {
      totalMeninggal += r.korban_meninggal
      totalLuka += r.korban_luka_berat + r.korban_luka_ringan
      totalTerdampak += r.penduduk_terdampak + r.pengungsi
      totalFaskes += r.faskes_terdampak
    })

    return {
      totalReports,
      totalMeninggal,
      totalLuka,
      totalTerdampak,
      totalFaskes,
    }
  }, [filteredReports])

  // Pagination logic
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredReports.slice(start, start + itemsPerPage)
  }, [filteredReports, currentPage, itemsPerPage])

  // EXPORT EXCEL (.CSV format with UTF-8 BOM)
  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      showToast('Tidak ada data yang sesuai filter untuk diunduh.')
      return
    }

    const headers = [
      'No',
      'Kode Laporan',
      'Tanggal Kejadian',
      'Jam Kejadian',
      'Tanggal Perkembangan',
      'Tingkat Bencana',
      'Provinsi',
      'Kabupaten/Kota',
      'Kecamatan',
      'Desa/Kelurahan',
      'Jenis Bencana',
      'Meninggal',
      'Luka Berat',
      'Luka Ringan',
      'Hilang',
      'Penduduk Terdampak',
      'Pengungsi',
      'Faskes Terdampak',
      'Status Verifikasi',
      'Petugas Pelapor',
      'Deskripsi Narasi',
    ]

    const csvRows = [headers.join(',')]

    filteredReports.forEach((item, index) => {
      const row = [
        index + 1,
        `"${item.kode_laporan}"`,
        `"${item.tgl_kejadian_formatted}"`,
        `"${item.jam_kejadian}"`,
        `"${item.tgl_perkembangan_formatted}"`,
        `"${item.tingkat_bencana}"`,
        `"${item.provinsi}"`,
        `"${item.kabupaten}"`,
        `"${item.kecamatan}"`,
        `"${item.desa}"`,
        `"${item.jenis_bencana}"`,
        item.korban_meninggal,
        item.korban_luka_berat,
        item.korban_luka_ringan,
        item.korban_hilang,
        item.penduduk_terdampak,
        item.pengungsi,
        item.faskes_terdampak,
        `"${item.status_verifikasi}"`,
        `"${item.petugas}"`,
        `"${item.deskripsi.replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = '\uFEFF' + csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `Laporan_Kejadian_Bencana_Kemenkes_${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast(`Berhasil mengunduh ${filteredReports.length} data dalam format Excel/CSV!`)
  }

  // EXPORT SUMMARY PDF
  const handleExportPDF = () => {
    if (filteredReports.length === 0) {
      showToast('Tidak ada data terfilter untuk dicetak ke PDF.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Pop-up terblokir oleh browser. Harap izinkan pop-up.')
      return
    }

    type RegionGroup = {
      name: string
      total_laporan: number
      korban_meninggal: number
      korban_luka: number
      korban_hilang: number
      penduduk_terdampak: number
      pengungsi: number
      faskes_terdampak: number
      bencana_counts: Record<string, number>
      bencana_dominan: string
    }

    const isSingleProvSelected = selectedProvinces.length === 1 || selectedRegionPills.some(p => p.level === 'PROVINSI')
    const isSingleKabSelected = selectedRegionPills.some(p => p.level === 'KABUPATEN')

    let groupByLabel = 'PROVINSI'
    if (isSingleKabSelected) {
      groupByLabel = 'KECAMATAN'
    } else if (isSingleProvSelected) {
      groupByLabel = 'KABUPATEN / KOTA'
    }

    const regionMap: Record<string, RegionGroup> = {}

    filteredReports.forEach((r) => {
      let key = (r.provinsi || 'LAINNYA').toUpperCase()
      if (isSingleKabSelected) {
        key = (r.kecamatan || 'KECAMATAN LAINNYA').toUpperCase()
      } else if (isSingleProvSelected) {
        key = (r.kabupaten || 'KABUPATEN LAINNYA').toUpperCase()
      }

      if (!regionMap[key]) {
        regionMap[key] = {
          name: key,
          total_laporan: 0,
          korban_meninggal: 0,
          korban_luka: 0,
          korban_hilang: 0,
          penduduk_terdampak: 0,
          pengungsi: 0,
          faskes_terdampak: 0,
          bencana_counts: {},
          bencana_dominan: '-',
        }
      }

      const g = regionMap[key]
      g.total_laporan += 1
      g.korban_meninggal += r.korban_meninggal
      g.korban_luka += (r.korban_luka_berat + r.korban_luka_ringan)
      g.korban_hilang += r.korban_hilang
      g.penduduk_terdampak += r.penduduk_terdampak
      g.pengungsi += r.pengungsi
      g.faskes_terdampak += r.faskes_terdampak

      const j = r.jenis_bencana || 'Lainnya'
      g.bencana_counts[j] = (g.bencana_counts[j] || 0) + 1
    })

    Object.values(regionMap).forEach((g) => {
      const sortedBencana = Object.entries(g.bencana_counts).sort((a, b) => b[1] - a[1])
      if (sortedBencana.length > 0) {
        g.bencana_dominan = `${sortedBencana[0][0]} (${sortedBencana[0][1]})`
      }
    })

    const sortedRegions = Object.values(regionMap).sort((a, b) => b.total_laporan - a.total_laporan)
    const totalHilang = filteredReports.reduce((acc, r) => acc + r.korban_hilang, 0)

    const matrixRowsHtml = sortedRegions.map((g, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <strong style="color: #047D78; text-transform: uppercase;">ðŸ“ ${g.name}</strong>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: 900; color: #0f172a;">
          ${g.total_laporan} Kejadian
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: 700; color: #334155;">
          ${g.bencana_dominan}
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          ${g.korban_meninggal > 0 
            ? `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; display: inline-block;">MD: ${g.korban_meninggal} Jiwa</span>`
            : `<span style="color: #64748b; font-size: 9px;">0</span>`
          }
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <span style="color: #d97706; font-weight: 600; font-size: 9px;">Luka: ${g.korban_luka}</span> | 
          <span style="color: #4f46e5; font-weight: 600; font-size: 9px;">Hilang: ${g.korban_hilang}</span>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <strong>${(g.penduduk_terdampak + g.pengungsi).toLocaleString('id-ID')}</strong> Jiwa<br/>
          <small style="color: #64748b; font-size: 8.5px;">(Terdampak: ${g.penduduk_terdampak}, Pengungsi: ${g.pengungsi})</small>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: bold;">
          ${g.faskes_terdampak} Unit
        </td>
      </tr>
    `).join('')

    const summaryRowHtml = `
      <tr style="background: #047D78; color: #ffffff; font-weight: 900; font-size: 10px;">
        <td colspan="2" style="text-align: right; padding: 8px 10px; border: 1px solid #036662; text-transform: uppercase; letter-spacing: 0.5px;">
          TOTAL REKAPITULASI (${sortedRegions.length} ${groupByLabel})
        </td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${metrics.totalReports} Kejadian</td>
        <td style="padding: 8px; border: 1px solid #036662; text-align: center;">-</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${metrics.totalMeninggal > 0 ? `${metrics.totalMeninggal} Jiwa` : '0'}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">Luka: ${metrics.totalLuka} | Hilang: ${totalHilang}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${metrics.totalTerdampak.toLocaleString('id-ID')} Jiwa</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${metrics.totalFaskes} Unit</td>
      </tr>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Rekap Laporan Bencana Kesehatan - EOC Kemenkes RI</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 12mm 10mm;
            }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; background: #ffffff; }
            h2 { color: #047D78; margin: 0 0 4px 0; text-transform: uppercase; font-size: 16px; font-weight: 900; }
            p { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid #94a3b8; font-size: 10px; }
            th { background-color: #047D78; color: white; border: 1px solid #036662; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
            td { border: 1px solid #cbd5e1; padding: 7px 8px; vertical-align: middle; }
            tbody tr:nth-child(even) { background-color: #f8fafc; }
            .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 11.5px; }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
              tr { page-break-inside: avoid; break-inside: avoid; }
              thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #047D78; color: white; padding: 10px 16px; margin: -20px -20px 20px -20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 800; font-size: 13px;">Preview Rekap Laporan Bencana EOC Kemenkes RI</span>
              <span style="background: rgba(255,255,255,0.2); font-size: 10px; padding: 3px 9px; border-radius: 12px; font-weight: 600;">HTML View</span>
            </div>
            <button onclick="window.print()" style="background: #ffffff; color: #047D78; font-weight: bold; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ðŸ–¨ï¸ Cetak ke PDF / Print
            </button>
          </div>

          <h2>KEMENTERIAN KESEHATAN REPUBLIK INDONESIA</h2>
          <p>PUSAT KRISIS KESEHATAN â€” REKAPITULASI LAPORAN KEJADIAN BENCANA (BERDASARKAN ${groupByLabel})</p>
          <div class="meta-box">
            <strong>Total Data Terfilter:</strong> ${filteredReports.length} Laporan (${sortedRegions.length} ${groupByLabel}) | 
            <strong>Total Korban Meninggal:</strong> ${metrics.totalMeninggal} | 
            <strong>Total Pengungsi/Terdampak:</strong> ${metrics.totalTerdampak} | 
            <strong>Faskes Terdampak:</strong> ${metrics.totalFaskes} Unit<br/>
            <small style="color: #64748b;">Dicetak pada: ${new Date().toLocaleString('id-ID')} WIB</small>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">NO</th>
                <th>WILAYAH (${groupByLabel})</th>
                <th style="text-align: center;">TOTAL KEJADIAN</th>
                <th>BENCANA DOMINAN</th>
                <th style="text-align: center;">MENINGGAL (MD)</th>
                <th style="text-align: center;">LUKA & HILANG</th>
                <th style="text-align: center;">TERDAMPAK / PENGUNGSI</th>
                <th style="text-align: center;">FASKES TERDAMPAK</th>
              </tr>
            </thead>
            <tbody>
              ${matrixRowsHtml}
              ${summaryRowHtml}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // CREATE DASHBOARD REPORT (EXCLUSIVE HTML / PDF GENERATOR)
  const handleCreateDashboardHTML = () => {
    if (filteredReports.length === 0) {
      showToast('Tidak ada data terfilter untuk membuat laporan dashboard.')
      return
    }

    const totalReports = filteredReports.length
    let totalMeninggal = 0
    let totalLuka = 0
    let totalHilang = 0
    let totalTerdampak = 0
    let totalPengungsi = 0
    let totalFaskes = 0

    const jenisCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = { Diverifikasi: 0, Proses: 0, Ditolak: 0 }
    const provCounts: Record<string, number> = {}

    filteredReports.forEach((r) => {
      totalMeninggal += r.korban_meninggal
      totalLuka += r.korban_luka_berat + r.korban_luka_ringan
      totalHilang += r.korban_hilang
      totalTerdampak += r.penduduk_terdampak
      totalPengungsi += r.pengungsi
      totalFaskes += r.faskes_terdampak

      const j = r.jenis_bencana || 'Lainnya'
      jenisCounts[j] = (jenisCounts[j] || 0) + 1

      const st = r.status_verifikasi || 'Proses'
      statusCounts[st] = (statusCounts[st] || 0) + 1

      const p = r.provinsi || 'Lainnya'
      provCounts[p] = (provCounts[p] || 0) + 1
    })

    const sortedJenis = Object.entries(jenisCounts).sort((a, b) => b[1] - a[1])
    const maxJenisCount = Math.max(...Object.values(jenisCounts), 1)

    const sortedProvs = Object.entries(provCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const maxProvCount = Math.max(...Object.values(provCounts), 1)

    const filterWilayahText = selectedRegionPills.length > 0
      ? selectedRegionPills.map((p) => `${p.level}: ${p.name}`).join(', ')
      : (selectedProvinces.length > 0 ? selectedProvinces.join(', ') : 'Seluruh Wilayah (Nasional)')

    const filterBencanaText = selectedTypes.length > 0 ? selectedTypes.join(', ') : 'Semua Jenis Bencana'
    let timePresetText = 'Semua Periode'
    if (selectedDatePreset === '7days') timePresetText = '7 Hari Terakhir'
    if (selectedDatePreset === '30days') timePresetText = '30 Hari Terakhir'

    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}${basePath}/Logo-Kemenkes.png` : ''

    // REGIONAL AGGREGATION GROUPING (NASIONAL -> PROVINSI, SINGLE PROV -> KABUPATEN, SINGLE KAB -> KECAMATAN)
    type RegionGroup = {
      name: string
      total_laporan: number
      korban_meninggal: number
      korban_luka: number
      korban_hilang: number
      penduduk_terdampak: number
      pengungsi: number
      faskes_terdampak: number
      bencana_counts: Record<string, number>
      bencana_dominan: string
    }

    const isSingleProvSelected = selectedProvinces.length === 1 || selectedRegionPills.some(p => p.level === 'PROVINSI')
    const isSingleKabSelected = selectedRegionPills.some(p => p.level === 'KABUPATEN')

    let groupByLabel = 'PROVINSI'
    if (isSingleKabSelected) {
      groupByLabel = 'KECAMATAN'
    } else if (isSingleProvSelected) {
      groupByLabel = 'KABUPATEN / KOTA'
    }

    const regionMap: Record<string, RegionGroup> = {}

    filteredReports.forEach((r) => {
      let key = (r.provinsi || 'LAINNYA').toUpperCase()
      if (isSingleKabSelected) {
        key = (r.kecamatan || 'KECAMATAN LAINNYA').toUpperCase()
      } else if (isSingleProvSelected) {
        key = (r.kabupaten || 'KABUPATEN LAINNYA').toUpperCase()
      }

      if (!regionMap[key]) {
        regionMap[key] = {
          name: key,
          total_laporan: 0,
          korban_meninggal: 0,
          korban_luka: 0,
          korban_hilang: 0,
          penduduk_terdampak: 0,
          pengungsi: 0,
          faskes_terdampak: 0,
          bencana_counts: {},
          bencana_dominan: '-',
        }
      }

      const g = regionMap[key]
      g.total_laporan += 1
      g.korban_meninggal += r.korban_meninggal
      g.korban_luka += (r.korban_luka_berat + r.korban_luka_ringan)
      g.korban_hilang += r.korban_hilang
      g.penduduk_terdampak += r.penduduk_terdampak
      g.pengungsi += r.pengungsi
      g.faskes_terdampak += r.faskes_terdampak

      const j = r.jenis_bencana || 'Lainnya'
      g.bencana_counts[j] = (g.bencana_counts[j] || 0) + 1
    })

    Object.values(regionMap).forEach((g) => {
      const sortedBencana = Object.entries(g.bencana_counts).sort((a, b) => b[1] - a[1])
      if (sortedBencana.length > 0) {
        g.bencana_dominan = `${sortedBencana[0][0]} (${sortedBencana[0][1]})`
      }
    })

    const sortedRegions = Object.values(regionMap).sort((a, b) => b.total_laporan - a.total_laporan)

    const matrixRowsHtml = sortedRegions.map((g, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <strong style="color: #047D78; text-transform: uppercase;">ðŸ“ ${g.name}</strong>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: 900; color: #0f172a;">
          ${g.total_laporan} Kejadian
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: 700; color: #334155;">
          ${g.bencana_dominan}
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          ${g.korban_meninggal > 0 
            ? `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; display: inline-block;">MD: ${g.korban_meninggal} Jiwa</span>`
            : `<span style="color: #64748b; font-size: 9px;">0</span>`
          }
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <span style="color: #d97706; font-weight: 600; font-size: 9px;">Luka: ${g.korban_luka}</span> | 
          <span style="color: #4f46e5; font-weight: 600; font-size: 9px;">Hilang: ${g.korban_hilang}</span>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px;">
          <strong>${(g.penduduk_terdampak + g.pengungsi).toLocaleString('id-ID')}</strong> Jiwa<br/>
          <small style="color: #64748b; font-size: 8.5px;">(Terdampak: ${g.penduduk_terdampak}, Pengungsi: ${g.pengungsi})</small>
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10px; font-weight: bold;">
          ${g.faskes_terdampak} Unit
        </td>
      </tr>
    `).join('')

    const summaryRowHtml = `
      <tr style="background: #047D78; color: #ffffff; font-weight: 900; font-size: 10px;">
        <td colspan="2" style="text-align: right; padding: 8px 10px; border: 1px solid #036662; text-transform: uppercase; letter-spacing: 0.5px;">
          TOTAL REKAPITULASI (${sortedRegions.length} ${groupByLabel})
        </td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${totalReports} Kejadian</td>
        <td style="padding: 8px; border: 1px solid #036662; text-align: center;">-</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${totalMeninggal > 0 ? `${totalMeninggal} Jiwa` : '0'}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">Luka: ${totalLuka} | Hilang: ${totalHilang}</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${(totalTerdampak + totalPengungsi).toLocaleString('id-ID')} Jiwa</td>
        <td style="text-align: center; padding: 8px; border: 1px solid #036662;">${totalFaskes} Unit</td>
      </tr>
    `

    // RENDER PURE VECTOR SVG INDONESIA SPATIAL HOTSPOT MAP (HIGH-RESOLUTION EXECUTIVE DESIGN)
    const renderSvgIndonesiaMap = (provList: [string, number][], total: number) => {
      // Map provinsi ke count
      const provMap = new Map<string, number>()
      provList.forEach(([pName, cnt]) => {
        const cleanP = pName.toUpperCase().replace(/^(PROVINSI|PROV\.|PROV)\s+/gi, '').trim()
        provMap.set(cleanP, cnt)
      })

      const getProvColor = (name: string) => {
        const cnt = provMap.get(name) || 0
        if (cnt === 0) return '#e2e8f0'
        if (cnt <= 10) return '#eab308' // Kuning
        if (cnt <= 30) return '#f97316' // Oranye
        if (cnt <= 50) return '#ef4444' // Coral Red
        return '#b91c1c'                // Deep Crimson Red
      }

      // Island paths with realistic proportions
      const sumateraColor = getProvColor('SUMATERA UTARA') !== '#e2e8f0' ? getProvColor('SUMATERA UTARA') : getProvColor('SUMATERA BARAT') !== '#e2e8f0' ? getProvColor('SUMATERA BARAT') : getProvColor('ACEH')
      const jawaColor = getProvColor('JAWA TIMUR') !== '#e2e8f0' ? getProvColor('JAWA TIMUR') : getProvColor('JAWA BARAT') !== '#e2e8f0' ? getProvColor('JAWA BARAT') : getProvColor('JAWA TENGAH')
      const kalimantanColor = getProvColor('KALIMANTAN SELATAN') !== '#e2e8f0' ? getProvColor('KALIMANTAN SELATAN') : getProvColor('KALIMANTAN BARAT') !== '#e2e8f0' ? getProvColor('KALIMANTAN BARAT') : getProvColor('KALIMANTAN TIMUR')
      const sulawesiColor = getProvColor('SULAWESI SELATAN') !== '#e2e8f0' ? getProvColor('SULAWESI SELATAN') : getProvColor('SULAWESI TENGAH')
      const nusaTenggaraColor = getProvColor('NUSA TENGGARA BARAT') !== '#e2e8f0' ? getProvColor('NUSA TENGGARA BARAT') : getProvColor('NUSA TENGGARA TIMUR')
      const malukuColor = getProvColor('MALUKU') !== '#e2e8f0' ? getProvColor('MALUKU') : getProvColor('MALUKU UTARA')
      const papuaColor = getProvColor('PAPUA') !== '#e2e8f0' ? getProvColor('PAPUA') : getProvColor('PAPUA BARAT')

      const provCoords: Record<string, { x: number; y: number; label: string }> = {
        'JAWA TIMUR': { x: 220, y: 145, label: 'JATIM' },
        'JAWA BARAT': { x: 150, y: 142, label: 'JABAR' },
        'JAWA TENGAH': { x: 185, y: 144, label: 'JATENG' },
        'MALUKU': { x: 345, y: 95, label: 'MALUKU' },
        'KALIMANTAN SELATAN': { x: 200, y: 102, label: 'KALSEL' },
        'NUSA TENGGARA BARAT': { x: 270, y: 147, label: 'NTB' },
        'NUSA TENGGARA TIMUR': { x: 300, y: 148, label: 'NTT' },
        'SULAWESI SELATAN': { x: 275, y: 110, label: 'SULSEL' },
        'KALIMANTAN BARAT': { x: 165, y: 75, label: 'KALBAR' },
        'SULAWESI TENGAH': { x: 275, y: 85, label: 'SULTENG' },
        'SULAWESI UTARA': { x: 295, y: 60, label: 'SULUT' },
        'BANTEN': { x: 135, y: 140, label: 'BANTEN' },
        'KALIMANTAN TENGAH': { x: 185, y: 85, label: 'KALTENG' },
        'MALUKU UTARA': { x: 345, y: 65, label: 'MALUT' },
        'D.I. YOGYAKARTA': { x: 180, y: 146, label: 'DIY' },
        'ACEH': { x: 45, y: 40, label: 'ACEH' },
        'RIAU': { x: 90, y: 70, label: 'RIAU' },
        'SUMATERA BARAT': { x: 75, y: 75, label: 'SUMBAR' },
        'SUMATERA UTARA': { x: 60, y: 55, label: 'SUMUT' },
        'SUMATERA SELATAN': { x: 115, y: 105, label: 'SUMSEL' },
        'LAMPUNG': { x: 125, y: 125, label: 'LAMPUNG' },
        'KALIMANTAN TIMUR': { x: 220, y: 75, label: 'KALTIM' },
        'PAPUA': { x: 430, y: 90, label: 'PAPUA' },
      }

      const hotspotBadges: string[] = []
      provList.slice(0, 5).forEach(([provName, count], idx) => {
        const cleanProv = provName.toUpperCase().replace(/^(PROVINSI|PROV\.|PROV)\s+/gi, '').trim()
        const info = provCoords[cleanProv] || { x: 150 + idx * 45, y: 70 + (idx % 2) * 20, label: cleanProv.substring(0, 6) }
        
        let color = '#b91c1c'
        if (idx === 0) color = '#b91c1c'
        else if (idx <= 2) color = '#ef4444'
        else color = '#f97316'

        hotspotBadges.push(`
          <g transform="translate(${info.x}, ${info.y})">
            <circle cx="0" cy="0" r="7" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
            <circle cx="0" cy="0" r="10" fill="${color}" opacity="0.25" />
            <rect x="-24" y="-20" width="48" height="12" rx="4" fill="#0f172a" opacity="0.9" />
            <text x="0" y="-12" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle">
              ${info.label} (${count})
            </text>
          </g>
        `)
      })

      return `
        <svg viewBox="0 0 500 175" width="100%" height="155" style="background: #f0fdfa; border-radius: 8px; border: 1px solid #ccfbf1; font-family: sans-serif;">
          <!-- Grid lines -->
          <line x1="0" y1="45" x2="500" y2="45" stroke="#e6fffa" stroke-width="1" />
          <line x1="0" y1="90" x2="500" y2="90" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3" />
          <text x="6" y="86" font-size="6" fill="#94a3b8" font-weight="bold">KHATULISTIWA (0Â°)</text>

          <!-- REALISTIC ISLAND VECTOR PATHS -->
          <!-- SUMATERA -->
          <path d="M 32 38 L 48 28 L 65 35 L 85 55 L 110 82 L 132 110 L 125 125 L 110 120 L 90 95 L 68 70 L 48 55 L 35 44 Z" fill="${sumateraColor}" stroke="#ffffff" stroke-width="1.5" />
          <!-- JAWA & BALI -->
          <path d="M 128 138 L 155 138 L 185 140 L 225 142 L 248 145 L 246 150 L 220 148 L 180 146 L 150 144 L 128 142 Z" fill="${jawaColor}" stroke="#ffffff" stroke-width="1.5" />
          <path d="M 250 144 L 258 144 L 258 148 L 250 148 Z" fill="${getProvColor('BALI')}" stroke="#ffffff" stroke-width="1" />

          <!-- KALIMANTAN -->
          <path d="M 152 70 L 180 50 L 220 48 L 235 60 L 232 90 L 210 115 L 185 118 L 158 98 L 148 80 Z" fill="${kalimantanColor}" stroke="#ffffff" stroke-width="1.5" />

          <!-- SULAWESI (K-SHAPE) -->
          <path d="M 252 82 L 268 78 L 272 58 L 285 58 L 295 50 L 298 56 L 282 68 L 275 80 L 290 85 L 305 85 L 302 92 L 278 92 L 276 102 L 285 118 L 272 122 L 265 105 L 260 88 Z" fill="${sulawesiColor}" stroke="#ffffff" stroke-width="1.5" />

          <!-- NUSA TENGGARA CHAIN -->
          <path d="M 262 145 L 280 145 L 280 149 L 262 149 Z" fill="${nusaTenggaraColor}" stroke="#ffffff" stroke-width="1" />
          <path d="M 283 146 L 315 146 L 315 150 L 283 150 Z" fill="${getProvColor('NUSA TENGGARA TIMUR')}" stroke="#ffffff" stroke-width="1" />

          <!-- MALUKU CLUSTER -->
          <path d="M 335 60 L 350 60 L 348 78 L 335 78 Z" fill="${malukuColor}" stroke="#ffffff" stroke-width="1" />
          <path d="M 338 88 L 355 88 L 355 115 L 338 115 Z" fill="${malukuColor}" stroke="#ffffff" stroke-width="1" />

          <!-- PAPUA (BIRD'S HEAD & BODY) -->
          <path d="M 365 72 C 370 60 380 62 385 70 L 395 72 L 440 55 L 485 75 L 480 130 L 435 130 L 398 98 L 375 88 Z" fill="${papuaColor}" stroke="#ffffff" stroke-width="1.5" />

          <!-- HOTSPOT CALLOUT BADGES -->
          ${hotspotBadges.join('')}

          <!-- MAP CHOROPLETH LEGEND CARD -->
          <g transform="translate(10, 142)">
            <rect x="0" y="0" width="165" height="26" rx="5" fill="#ffffff" opacity="0.95" stroke="#cbd5e1" stroke-width="1" />
            <text x="6" y="9" font-size="6" font-weight="900" fill="#0f172a">SEBARAN INTENSITAS KEJADIAN BENCANA:</text>
            <circle cx="10" cy="18" r="3.5" fill="#eab308" />
            <text x="16" y="20" font-size="5.5" font-weight="800" fill="#334155">1-10</text>
            <circle cx="45" cy="18" r="3.5" fill="#f97316" />
            <text x="51" y="20" font-size="5.5" font-weight="800" fill="#334155">11-30</text>
            <circle cx="85" cy="18" r="3.5" fill="#ef4444" />
            <text x="91" y="20" font-size="5.5" font-weight="800" fill="#334155">31-50</text>
            <circle cx="125" cy="18" r="3.5" fill="#b91c1c" />
            <text x="131" y="20" font-size="5.5" font-weight="900" fill="#b91c1c">>50</text>
          </g>
        </svg>
      `
    }

    // RENDER PURE VECTOR SVG DONUT CHART (EXECUTIVE ENHANCED)
    const renderSvgDonutChart = (items: [string, number][], total: number) => {
      if (total === 0 || items.length === 0) {
        return `<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 40px 0;">Tidak Ada Data Kejadian</div>`
      }

      const colors = ['#047D78', '#0d9488', '#d97706', '#dc2626', '#4f46e5', '#2563eb', '#059669', '#9333ea']
      let accumulatedAngle = -Math.PI / 2
      const cx = 65
      const cy = 65
      const rOut = 58
      const rIn = 36

      const paths: string[] = []
      const legends: string[] = []

      items.slice(0, 5).forEach(([label, val], i) => {
        const pct = val / total
        const angle = pct * 2 * Math.PI
        const startAngle = accumulatedAngle
        const endAngle = accumulatedAngle + angle
        accumulatedAngle += angle

        const color = colors[i % colors.length]

        if (pct >= 0.999) {
          paths.push(`
            <circle cx="${cx}" cy="${cy}" r="${rOut}" fill="${color}" />
            <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="#ffffff" />
          `)
        } else {
          const x1 = cx + rOut * Math.cos(startAngle)
          const y1 = cy + rOut * Math.sin(startAngle)
          const x2 = cx + rOut * Math.cos(endAngle)
          const y2 = cy + rOut * Math.sin(endAngle)
          const x3 = cx + rIn * Math.cos(endAngle)
          const y3 = cy + rIn * Math.sin(endAngle)
          const x4 = cx + rIn * Math.cos(startAngle)
          const y4 = cy + rIn * Math.sin(startAngle)
          const largeArc = angle > Math.PI ? 1 : 0

          const d = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`
          paths.push(`<path d="${d}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`)
        }

        const pctText = Math.round(pct * 100)
        legends.push(`
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed #f1f5f9;">
            <span style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
              <span style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: ${color}; flex-shrink: 0;"></span>
              <span style="color: #1e293b; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;" title="${label}">${label}</span>
            </span>
            <span style="font-weight: 900; color: #047D78; margin-left: 8px; flex-shrink: 0; font-size: 13px;">
              ${val} <small style="color: #64748b; font-weight: bold;">(${pctText}%)</small>
            </span>
          </div>
        `)
      })

      return `
        <div style="display: flex; align-items: center; gap: 24px; padding: 10px 0;">
          <svg width="220" height="220" viewBox="0 0 130 130" style="flex-shrink: 0;">
            ${paths.join('')}
            <circle cx="${cx}" cy="${cy}" r="${rIn - 2}" fill="#ffffff" />
            <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="14" font-weight="900" fill="#047D78">${total}</text>
            <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="7" font-weight="800" fill="#64748b" letter-spacing="0.3">LAPORAN</text>
          </svg>
          <div style="flex: 1; min-width: 0;">
            ${legends.join('')}
          </div>
        </div>
      `
    }

    // RENDER PURE VECTOR SVG HORIZONTAL BAR CHART FOR TOP AFFECTED REGIONS
    const renderSvgTopRegionsChart = (regions: RegionGroup[], total: number) => {
      if (total === 0 || regions.length === 0) {
        return `<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 40px 0;">Tidak Ada Data Wilayah</div>`
      }

      const top5 = regions.slice(0, 5)
      const maxCount = top5[0]?.total_laporan || 1

      const bars = top5.map((g, idx) => {
        const pct = Math.round((g.total_laporan / total) * 100)
        const barWidth = Math.max(12, Math.round((g.total_laporan / maxCount) * 340))
        const y = 10 + idx * 36

        const colors = ['#047D78', '#0d9488', '#0284c7', '#d97706', '#dc2626']
        const color = colors[idx % colors.length]
        const cleanName = g.name.replace(/^(PROVINSI|KABUPATEN|KOTA)\s+/gi, '').trim()

        return `
          <g transform="translate(0, ${y})">
            <text x="150" y="16" font-size="13px" font-weight="800" fill="#1e293b" text-anchor="end">${cleanName.substring(0, 24)}</text>
            <rect x="165" y="2" width="340" height="18" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5" />
            <rect x="165" y="2" width="${barWidth}" height="18" rx="4" fill="${color}" />
            <text x="${175 + barWidth}" y="16" font-size="13px" font-weight="900" fill="#047D78">${g.total_laporan} <tspan font-size="11px" font-weight="bold" fill="#64748b">(${pct}%)</tspan></text>
          </g>
        `
      })

      return `
        <svg viewBox="0 0 600 200" width="100%" height="200" style="font-family: sans-serif;">
          ${bars.join('')}
        </svg>
      `
    }

    const chart1Html = renderSvgDonutChart(sortedJenis, totalReports)
    const bar1Html = renderSvgTopRegionsChart(sortedRegions, totalReports)

    // DYNAMIC COMPUTATIONS DIRECTLY FROM REAL FILTERED DATA
    const topRegionName = sortedRegions.length > 0 ? sortedRegions[0].name : 'NASIONAL'
    const topRegionCount = sortedRegions.length > 0 ? sortedRegions[0].total_laporan : 0
    const topRegionPct = totalReports > 0 ? Math.round((topRegionCount / totalReports) * 100) : 0

    const topDisasterName = sortedJenis.length > 0 ? sortedJenis[0][0] : 'TIDAK ADA'
    const topDisasterCount = sortedJenis.length > 0 ? sortedJenis[0][1] : 0
    const topDisasterPct = totalReports > 0 ? Math.round((topDisasterCount / totalReports) * 100) : 0

    const secondDisasterName = sortedJenis.length > 1 ? sortedJenis[1][0] : ''
const secondDisasterCount = sortedJenis.length > 1 ? sortedJenis[1][1] : 0
    const secondDisasterPct = totalReports > 0 && sortedJenis.length > 1 ? Math.round((secondDisasterCount / totalReports) * 100) : 0

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Pop-up terblokir oleh browser. Harap izinkan pop-up.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Dashboard Eksekutif EOC Kemenkes RI</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * { box-sizing: border-box; }
          
          /* Common/Screen Styles */
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            background: #fbffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.45;
          }
          
          /* Header bar styling */
          .top-bar {
            position: sticky;
            top: 0;
            z-index: 9999;
            background: #047D78;
            color: white;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .top-bar-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .top-bar-title {
            font-weight: 800;
            font-size: 15px;
          }
          .top-bar-badge {
            background: rgba(255,255,255,0.2);
            font-size: 10px;
            padding: 3px 9px;
            border-radius: 12px;
            font-weight: 600;
          }
          .print-action-btn {
            background: #ffffff;
            color: #047D78;
            font-weight: bold;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s;
          }
          .print-action-btn:hover {
            background: #e6f6f5;
            transform: translateY(-1px);
          }
          
          /* Side-by-side main container */
          .main-layout {
            display: flex;
            max-width: 1440px;
            margin: 0 auto;
            min-height: calc(100vh - 50px);
          }
          
          /* Left Sidebar Navigation */
          .sidebar-nav {
            width: 280px;
            background: #ffffff;
            border-right: 1px solid #d5eceb;
            padding: 24px 16px;
            position: sticky;
            top: 50px;
            height: calc(100vh - 50px);
            overflow-y: auto;
            flex-shrink: 0;
          }
          .sidebar-title {
            font-size: 12px;
            font-weight: 800;
            color: #4a7a7a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0;
            margin-bottom: 12px;
            padding-left: 8px;
          }
          .sidebar-menu {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .nav-btn {
            width: 100%;
            background: none;
            border: none;
            display: flex;
            align-items: start;
            gap: 8px;
            padding: 8px 12px;
            font-size: 13.5px;
            color: #2563a4;
            border-radius: 6px;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
            font-family: inherit;
          }
          .nav-btn:hover {
            background: #f5faf9;
            color: #0f8f96;
          }
          .nav-btn.active {
            background: #e8faf8;
            color: #0f8f96;
            font-weight: 700;
            border-left: 3px solid #0f8f96;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            padding-left: 9px;
          }
          .nav-idx {
            font-weight: 800;
            color: #0f8f96;
            flex-shrink: 0;
          }
          .nav-txt {
            line-height: 1.3;
          }
          .print-sidebar-btn {
            width: 100%;
            background: #0f8f96;
            color: white;
            font-weight: 700;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(15, 143, 150, 0.15);
          }
          .print-sidebar-btn:hover {
            background: #0d7a81;
            box-shadow: 0 6px 14px rgba(15, 143, 150, 0.25);
          }
          
          /* Right Content area */
          .content-area {
            flex: 1;
            padding: 40px 50px;
            background: #ffffff;
            overflow-y: auto;
          }
          
          .report-section {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px dashed #e2e8f0;
          }
          .report-section:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          
          /* Kop surat */
          .kop-surat {
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 3px double #047D78;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .kop-logo {
            height: 60px;
            width: auto;
            flex-shrink: 0;
          }
          .kop-text {
            flex: 1;
          }
          .kop-text h1 {
            font-size: 15px;
            font-weight: 900;
            color: #047D78;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kop-text h2 {
            font-size: 12px;
            font-weight: 800;
            color: #1e293b;
            margin: 3px 0 0 0;
            text-transform: uppercase;
          }
          .kop-text p {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .kop-badge {
            text-align: right;
            font-size: 10px;
            color: #64748b;
          }
          .kop-badge .status-tag {
            display: inline-block;
            background: #047D78;
            color: white;
            font-weight: 800;
            padding: 3px 9px;
            border-radius: 4px;
            font-size: 9px;
            margin-top: 4px;
            text-transform: uppercase;
          }
          
          /* Clean Official Header block */
          .document-title-block {
            margin-bottom: 25px;
            padding: 5px 0;
          }
          .doc-title {
            font-size: 16px;
            font-weight: 900;
            color: #047D78;
            text-transform: uppercase;
            margin: 0 0 8px 0;
            letter-spacing: 0.3px;
          }
          .doc-meta {
            font-size: 11.5px;
            color: #334155;
            margin: 0;
            line-height: 1.5;
          }
          
          /* KPI dashboard cards */
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .kpi-card {
            padding: 12px 8px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #cbd5e1;
          }
          .kpi-card .kpi-lbl {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .kpi-card .kpi-val {
            font-size: 18px;
            font-weight: 900;
            margin-top: 3px;
          }
          
          /* Visual charts */
          .charts-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 25px;
          }
          .chart-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          }
          .chart-card h3 {
            font-size: 12px;
            font-weight: 900;
            color: #047D78;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 6px;
          }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
            border: 1px solid #94a3b8;
          }
          th {
            background: #047D78;
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            border: 1px solid #036662;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            vertical-align: middle;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          /* Signatures */
          .footer-sig {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #cbd5e1;
            padding-top: 15px;
          }
          .sig-box {
            text-align: center;
            width: 220px;
          }
          .sig-space {
            height: 55px;
          }
          .sig-name {
            font-weight: 800;
            border-top: 1px solid #1e293b;
            padding-top: 4px;
            font-size: 12px;
            color: #0f172a;
          }
          
          /* Printing media styles (strict document pt design) */
          @media print {
            body {
              background: #ffffff;
              color: #000000;
              font-family: Arial, sans-serif;
              font-size: 11.5pt;
              line-height: 1.5;
            }
            .no-print {
              display: none !important;
            }
            .main-layout {
              display: block;
              min-height: auto;
            }
            .content-area {
              padding: 0;
              background: none;
              overflow: visible;
              width: 100% !important;
              margin: 0 !important;
            }
            .report-section {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            
            /* PT Scale for standard document look */
            .kop-text h1 { font-size: 14pt !important; }
            .kop-text h2 { font-size: 11pt !important; }
            .kop-text p { font-size: 9.5pt !important; }
            .kop-logo { height: 65px !important; }
            .kop-badge { font-size: 9.5pt !important; }
            
            .doc-title { font-size: 15pt !important; }
            .doc-meta { font-size: 11pt !important; }
            
            .kpi-card { padding: 8pt 6pt !important; border: 1px solid #94a3b8 !important; }
            .kpi-card .kpi-lbl { font-size: 8.5pt !important; }
            .kpi-card .kpi-val { font-size: 16pt !important; }
            
            .chart-card { border: 1px solid #94a3b8 !important; padding: 10pt !important; }
            .chart-card h3 { font-size: 11pt !important; }
            
            table { font-size: 10pt !important; border: 1px solid #475569 !important; }
            th { font-size: 9.5pt !important; padding: 6pt 7pt !important; border: 1px solid #475569 !important; }
            td { font-size: 9.5pt !important; padding: 6pt 7pt !important; border: 1px solid #cbd5e1 !important; }
            
            .sig-name { font-size: 11pt !important; }
            .sig-box { width: 180pt !important; }
            .sig-space { height: 50pt !important; }
            
            /* Page breaking and layout flow */
            .page-break {
              page-break-before: always !important;
              break-before: page !important;
              margin-top: 15mm !important;
            }
            .no-page-break-inside, tr, .kpi-row, .chart-card, .kop-surat, .footer-sig {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
            tbody {
              display: table-row-group !important;
            }
            
            /* Clean black & white and colored adjustments */
            tbody tr:nth-child(even) {
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
        <script>
          function scrollToSection(id) {
            const target = document.getElementById(id);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // Update active state in sidebar buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            const clickedBtn = document.getElementById('btn-' + id);
            if (clickedBtn) {
              clickedBtn.classList.add('active');
            }
          }

          // Scrollspy to highlight active sections as user scrolls
          window.addEventListener('DOMContentLoaded', () => {
            const sections = document.querySelectorAll('.report-section');
            const navButtons = document.querySelectorAll('.nav-btn');
            const contentArea = document.querySelector('.content-area') || window;
            
            function handleSpy() {
              let currentActive = '';
              const scrollPos = (contentArea === window) ? window.scrollY : contentArea.scrollTop;
              
              sections.forEach(sec => {
                const secTop = sec.offsetTop - 120;
                if (scrollPos >= secTop) {
                  currentActive = sec.id;
                }
              });
              
              if (currentActive) {
                navButtons.forEach(btn => {
                  btn.classList.remove('active');
                  if (btn.id === 'btn-' + currentActive) {
                    btn.classList.add('active');
                  }
                });
              }
            }
            
            if (contentArea !== window) {
              contentArea.addEventListener('scroll', handleSpy);
            } else {
              window.addEventListener('scroll', handleSpy);
            }
          });
        </script>
      </head>
      <body>
        <!-- Top bar (no-print) -->
        <div class="no-print top-bar">
          <div class="top-bar-title-group">
            <span class="top-bar-title">Preview Laporan Eksekutif EOC Kemenkes RI</span>
            <span class="top-bar-badge">HTML View & Navigation</span>
          </div>
          <button onclick="window.print()" class="print-action-btn">
            🖨️ Cetak Laporan / Simpan PDF
          </button>
        </div>

        <div class="main-layout">
          <!-- Left Sidebar Navigation (no-print) -->
          <aside class="no-print sidebar-nav">
            <p class="sidebar-title">Contents</p>
            <nav class="sidebar-menu">
              <button onclick="scrollToSection('sec-cover')" class="nav-btn active" id="btn-sec-cover">
                <span class="nav-idx">1.</span> <span class="nav-txt">Kop Surat & Identitas</span>
              </button>
              <button onclick="scrollToSection('sec-summary')" class="nav-btn" id="btn-sec-summary">
                <span class="nav-idx">2.</span> <span class="nav-txt">Ringkasan & KPI</span>
              </button>
              <button onclick="scrollToSection('sec-charts')" class="nav-btn" id="btn-sec-charts">
                <span class="nav-idx">3.</span> <span class="nav-txt">Grafik Visualisasi</span>
              </button>
              <button onclick="scrollToSection('sec-narrative')" class="nav-btn" id="btn-sec-narrative">
                <span class="nav-idx">4.</span> <span class="nav-txt">Ringkasan Eksekutif</span>
              </button>
              <button onclick="scrollToSection('sec-matrix')" class="nav-btn" id="btn-sec-matrix">
                <span class="nav-idx">5.</span> <span class="nav-txt">Matriks Rekapitulasi</span>
              </button>
              <button onclick="scrollToSection('sec-signature')" class="nav-btn" id="btn-sec-signature">
                <span class="nav-idx">6.</span> <span class="nav-txt">Lembar Pengesahan</span>
              </button>
            </nav>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #d5eceb; text-align: center;">
              <button onclick="window.print()" class="print-sidebar-btn">
                🖨️ Cetak Dokumen (A4)
              </button>
            </div>
          </aside>

          <!-- Right Content Area -->
          <main class="content-area">
            
            <!-- SECTION 1: COVER & KOP -->
            <section id="sec-cover" class="report-section">
              <!-- KOP SURAT KEMENKES -->
              <div class="kop-surat">
                <img src="${logoUrl}" alt="Logo Kemenkes" class="kop-logo" onerror="this.style.display='none'" />
                <div class="kop-text">
                  <h1>Kementerian Kesehatan Republik Indonesia</h1>
                  <p>Emergency Operations Center (EOC) | Jl. H.R. Rasuna Said Blok X-5 Kav. 4-9 Jakarta | Call Center: 119 / 0812-1212-3119</p>
                </div>
                <div class="kop-badge">
                  <span>TGL CETAK: ${new Date().toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </section>

            <!-- SECTION 2: SUMMARY & KPI -->
            <section id="sec-summary" class="report-section">
              <!-- KPI SUMMARY CARDS (5 COLUMNS GRID) -->
              <div class="kpi-row">
                <div class="kpi-card" style="background: #f0fdf4; border-color: #bbf7d0;">
                  <div class="kpi-lbl" style="color: #166534;">Total Laporan</div>
                  <div class="kpi-val" style="color: #047D78;">${totalReports}</div>
                </div>
                <div class="kpi-card" style="background: #fef2f2; border-color: #fecaca;">
                  <div class="kpi-lbl" style="color: #991b1b;">Korban Meninggal</div>
                  <div class="kpi-val" style="color: #dc2626;">${totalMeninggal} <span style="font-size: 8px;">Jiwa</span></div>
                </div>
                <div class="kpi-card" style="background: #fffbeb; border-color: #fef3c7;">
                  <div class="kpi-lbl" style="color: #92400e;">Luka & Hilang</div>
                  <div class="kpi-val" style="color: #d97706;">${totalLuka + totalHilang} <span style="font-size: 8px;">Jiwa</span></div>
                </div>
                <div class="kpi-card" style="background: #f0f9ff; border-color: #bae6fd;">
                  <div class="kpi-lbl" style="color: #075985;">Terdampak/Pengungsi</div>
                  <div class="kpi-val" style="color: #0284c7;">${totalTerdampak + totalPengungsi} <span style="font-size: 8px;">Jiwa</span></div>
                </div>
                <div class="kpi-card" style="background: #fdf4ff; border-color: #f5d0fe;">
                  <div class="kpi-lbl" style="color: #86198f;">Faskes Terdampak</div>
                  <div class="kpi-val" style="color: #a21caf;">${totalFaskes} <span style="font-size: 8px;">Unit</span></div>
                </div>
              </div>
            </section>

            <!-- SECTION 3: CHARTS -->
            <section id="sec-charts" class="report-section">
              <!-- 2-COLUMN DASHBOARD VISUAL CHARTS SECTION (DONUT CHART + TOP REGIONS BAR CHART) -->
              <div class="charts-grid">
                <div class="chart-card">
                  <h3>1. PROP. BENCANA TERBANYAK (TOP 5)</h3>
                  ${chart1Html}
                </div>
                <div class="chart-card">
                  <h3>2. TOP 5 WILAYAH KEJADIAN TERBANYAK</h3>
                  ${bar1Html}
                </div>
              </div>
            </section>

            <!-- SECTION 4: NARRATIVE INSIGHTS -->
            <section id="sec-narrative" class="report-section">
              <!-- NARRATIVE EXECUTIVE REPORT PARAGRAPHS (FORMAL DOCUMENT TEXT - 100% DYNAMIC) -->
              <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <h3 style="font-size: 13px; font-weight: 900; color: #047D78; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #047D78; padding-bottom: 5px;">
                  RINGKASAN EKSEKUTIF & REKOMENDASI TANGGAP KRISIS KESEHATAN
                </h3>
                
                <div style="font-size: 12px; line-height: 1.6; color: #1e293b; text-align: justify;">
                  <p style="margin: 0 0 8px 0;">
                    <b>1. Gambaran Umum & Dispersi Kejadian:</b> Berdasarkan hasil pemantauan terpadu Emergency Operations Center (EOC) Pusat Krisis Kesehatan Kementerian Kesehatan RI di cakupan wilayah <b>${filterWilayahText}</b> untuk periode pemantauan <b>${timePresetText}</b>, tercatat akumulasi sebanyak <b>${totalReports} total laporan</b> kejadian bencana. Jenis bencana yang paling dominan di daerah pemantauan adalah <b style="color: #047D78;">${topDisasterName}</b> dengan total <b>${topDisasterCount} kejadian (${topDisasterPct}%)</b> dari keseluruhan laporan yang terverifikasi di sistem EOC${secondDisasterName ? `, diikuti oleh <b>${secondDisasterName}</b> sebanyak <b>${secondDisasterCount} kejadian (${secondDisasterPct}%)` : ''}. Wilayah dengan frekuensi laporan tertinggi adalah <b style="color: #dc2626;">${topRegionName}</b> dengan <b>${topRegionCount} kejadian (${topRegionPct}%)</b>.
                  </p>
                  
                  <p style="margin: 0 0 8px 0;">
                    <b>2. Penilaian Dampak Kesehatan Populasi & Fasilitas:</b> Akumulasi dampak krisis kesehatan mencakup <b>${totalMeninggal} jiwa meninggal dunia</b>, <b>${totalLuka} jiwa korban luka-luka</b>, <b>${totalHilang} jiwa hilang</b>, serta <b>${(totalPengungsi + totalTerdampak).toLocaleString('id-ID')} jiwa warga terpaksa mengungsi / terdampak krisis</b>. Terdata pula sebanyak <b>${totalFaskes} unit fasilitas pelayanan kesehatan</b> (Puskesmas, Poskesdes, dan Rumah Sakit) yang mengalami keretakan fisik, terendam air, atau mengalami penurunan kapasitas operasional pelayanan kesehatan darurat.
                  </p>
                  
                  <p style="margin: 0;">
                    <b>3. Rekomendasi Operasional Tanggap Darurat EOC:</b>
                    <span style="display: block; margin-top: 4px; padding-left: 12px;">
                      a. <b>Penetapan Status & Posko:</b> Memperkuat siaga operasional Posko EOC Klaster Kesehatan Dinas Kesehatan Kab/Kota dan Tim Regional Pusat Krisis Kesehatan.<br/>
                      b. <b>Mobilisasi Tim Kesehatan:</b> Meniagakan Tim Rapid Health Assessment (RHA) dan Emergency Medical Team (EMT) untuk penanganan medis di lokasi terdampak utama.<br/>
                      c. <b>Dukungan Logistik & Obat-obatan:</b> Mengirimkan buffer stock logistik kesehatan (paket obat darurat, MP-ASI, Hygiene Kits, dan kaporit) sesuai estimasi kebutuhan riil.
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <!-- SECTION 5: MATRIX TABLE -->
            <section id="sec-matrix" class="report-section page-break">
              <div class="matrix-section" style="page-break-before: avoid; break-before: auto; margin-top: 0;">
                <h3 style="margin-top: 0; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; padding-bottom: 5px; border-bottom: 2px solid #047D78;">
                  Matriks Rekapitulasi Pemantauan Bencana Berdasarkan ${groupByLabel} (${totalReports} Total Laporan)
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 35px; text-align: center;">NO</th>
                      <th>WILAYAH (${groupByLabel})</th>
                      <th style="text-align: center;">TOTAL KEJADIAN</th>
                      <th>BENCANA DOMINAN</th>
                      <th style="text-align: center;">MENINGGAL (MD)</th>
                      <th style="text-align: center;">LUKA & HILANG</th>
                      <th style="text-align: center;">TERDAMPAK / PENGUNGSI</th>
                      <th style="text-align: center;">FASKES TERDAMPAK</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${matrixRowsHtml}
                    ${summaryRowHtml}
                  </tbody>
                </table>
              </div>
            </section>

            <!-- SECTION 6: SIGNATURES -->
            <section id="sec-signature" class="report-section no-page-break-inside">
              <!-- SIGNATURE & STAMP FOOTER -->
              <div class="footer-sig">
                <div style="font-size: 11px; color: #64748b; line-height: 1.4;">
                  <b>EOC Krisis Kesehatan Kemenkes RI</b><br/>
                  Dokumen ini dihasilkan otomatis berdasarkan hasil filter sistem EOC Kemenkes RI.<br/>
                  Waktu Generasi: ${new Date().toLocaleString('id-ID')} WIB
                </div>
                <div class="sig-box">
                  <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">Penanggung Jawab EOC,</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">Tim Komando EOC Kemenkes</div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()

    showToast('Berhasil men-generate Dashboard Report HTML! Silakan klik tombol print jika ingin cetak ke PDF.')
  }

  // DOWNLOAD SINGLE REPORT PDF
  const handleDownloadSinglePDF = (item: LaporanItem) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Formulir Laporan ${item.kode_laporan}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm 12mm 10mm;
            }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; line-height: 1.5; background: #fff; }
            .header { text-align: center; border-bottom: 3px double #047D78; padding-bottom: 10px; margin-bottom: 20px; }
            .header h3 { margin: 0; color: #047D78; font-size: 16px; }
            .header h4 { margin: 2px 0; color: #334155; font-size: 14px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 11px; }
            .section { margin-bottom: 15px; }
            .section-title { background: #047D78; color: white; padding: 6px 10px; font-weight: bold; font-size: 12px; margin-bottom: 8px; border-radius: 4px; }
            table.info { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; }
            table.info td { padding: 7px 10px; vertical-align: top; border: 1px solid #cbd5e1; }
            table.info td.lbl { font-weight: bold; color: #475569; width: 30%; background-color: #f8fafc; }
            .narasi { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 12px; }
            .footer-sig { margin-top: 40px; text-align: right; font-size: 12px; }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #047D78; color: white; padding: 10px 16px; margin: -20px -20px 20px -20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 800; font-size: 13px;">Preview Laporan ${item.kode_laporan}</span>
              <span style="background: rgba(255,255,255,0.2); font-size: 10px; padding: 3px 9px; border-radius: 12px; font-weight: 600;">HTML View</span>
            </div>
            <button onclick="window.print()" style="background: #ffffff; color: #047D78; font-weight: bold; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ðŸ–¨ï¸ Cetak ke PDF / Print
            </button>
          </div>

          <div class="header">
            <h3>KEMENTERIAN KESEHATAN REPUBLIK INDONESIA</h3>
            <h4>PUSAT KRISIS KESEHATAN â€” DOKUMEN LAPORAN BENCANA</h4>
            <span class="badge">${item.kode_laporan} â€” ${item.status_verifikasi}</span>
          </div>

          <div class="section">
            <div class="section-title">I. INFORMASI KEJADIAN & LOKASI HIERARKI</div>
            <table class="info">
              <tr><td class="lbl">Jenis Bencana:</td><td><strong>${item.jenis_bencana}</strong></td></tr>
              <tr><td class="lbl">Waktu Kejadian:</td><td>${item.tgl_kejadian_formatted} (${item.jam_kejadian})</td></tr>
              <tr><td class="lbl">Tingkat Bencana:</td><td>${item.tingkat_bencana}</td></tr>
              <tr><td class="lbl">Provinsi:</td><td>PROV. ${item.provinsi}</td></tr>
              <tr><td class="lbl">Kabupaten/Kota:</td><td>${item.kabupaten}</td></tr>
              <tr><td class="lbl">Kecamatan:</td><td>Kec. ${item.kecamatan}</td></tr>
              <tr><td class="lbl">Desa/Kelurahan:</td><td>${item.desa}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">II. DAMPAK KESEHATAN & FASILITAS</div>
            <table class="info">
              <tr><td class="lbl">Meninggal Dunia:</td><td>${item.korban_meninggal} Jiwa</td></tr>
              <tr><td class="lbl">Luka Berat:</td><td>${item.korban_luka_berat} Jiwa</td></tr>
              <tr><td class="lbl">Luka Ringan:</td><td>${item.korban_luka_ringan} Jiwa</td></tr>
              <tr><td class="lbl">Penduduk Terdampak:</td><td>${item.penduduk_terdampak} Jiwa</td></tr>
              <tr><td class="lbl">Pengungsi:</td><td>${item.pengungsi} Jiwa</td></tr>
              <tr><td class="lbl">Faskes Terdampak:</td><td>${item.faskes_terdampak} Unit</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">III. NARASI DAN REKOMENDASI PENANGANAN</div>
            <div class="narasi">${item.deskripsi}</div>
          </div>

          <div class="footer-sig">
            <p>Petugas Pelapor:<br/><strong>${item.petugas}</strong></p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-16">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-xl border border-teal-200 bg-white p-4 shadow-xl shadow-teal-700/10 animate-in slide-in-from-right duration-200">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-[#047D78]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 py-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Laporan Terfilter</p>
                <h3 className="mt-1 text-2xl font-extrabold text-[#047D78]">{metrics.totalReports} <span className="text-xs font-semibold text-slate-500">Laporan</span></h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-[#047D78] border border-teal-100">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-teal-600" />
              {activeFilterCount > 0 ? `${activeFilterCount} kriteria filter aktif` : 'Menampilkan seluruh database'}
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Korban Jiwa (MD / Luka)</p>
                <h3 className="mt-1 text-2xl font-extrabold text-rose-600">
                  {metrics.totalMeninggal} <span className="text-xs font-semibold text-slate-500">MD</span> / {metrics.totalLuka} <span className="text-xs font-semibold text-slate-500">Luka</span>
                </h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Terlibat dalam {metrics.totalReports} kejadian terfilter</p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Penduduk Terdampak</p>
                <h3 className="mt-1 text-2xl font-extrabold text-amber-600">{metrics.totalTerdampak.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Jiwa</span></h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Mencakup pengungsi & warga terpapar</p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Faskes Terdampak</p>
                <h3 className="mt-1 text-2xl font-extrabold text-cyan-700">{metrics.totalFaskes} <span className="text-xs font-semibold text-slate-500">Unit Faskes</span></h3>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Puskesmas, Pustu, Klinik, RSUD</p>
          </div>
        </div>

        {/* MAIN LAYOUT: MULTIPLE FILTER SIDEBAR + DATA MATRIX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ==================== LEFT MULTI FILTER SIDEBAR ==================== */}
          <aside className="lg:col-span-3 xl:col-span-3 2xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 sticky top-4">

            {/* Filter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#047D78]" />
                <h2 className="text-sm font-extrabold tracking-wide text-slate-800 uppercase">Filter Laporan</h2>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition"
                  title="Reset Semua Filter"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            {/* SECTION 1: SMART AUTOCOMPLETE REGION SEARCH (FULL: PROV, KAB, KEC, DESA) */}
            <div className="space-y-3 relative" ref={regionDropdownRef}>
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('smartRegion')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-purple-600" />
                  Cari Wilayah (Prov s.d. Desa)
                </span>
                {expandedSection.smartRegion ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.smartRegion && (
                <div className="pt-1 relative">
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={regionInputQuery}
                      onChange={(e) => {
                        setRegionInputQuery(e.target.value)
                        setShowRegionDropdown(true)
                      }}
                      onFocus={() => setShowRegionDropdown(true)}
                      placeholder="Cari Prov, Kab, Kec, Desa..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                    {regionInputQuery && (
                      <button
                        onClick={() => setRegionInputQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN (MATCHING EXACT USER SCREENSHOT DESIGN) */}
                  {showRegionDropdown && filteredRegionSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-slate-100">
                      {filteredRegionSuggestions.map((sug) => {
                        const isKec = sug.level === 'KECAMATAN'
                        const isDesa = sug.level === 'DESA'
                        const isProv = sug.level === 'PROVINSI'

                        return (
                          <div
                            key={sug.id}
                            onClick={() => handleSelectRegionSuggestion(sug)}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-purple-50/60 transition cursor-pointer group"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <MapPin className="h-4 w-4 text-slate-400 group-hover:text-purple-600 shrink-0 mt-0.5 transition" />
                              <p className="text-xs font-bold text-slate-800 group-hover:text-purple-900 leading-snug truncate">
                                {sug.fullName}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md text-[9px] font-extrabold px-2 py-0.5 border uppercase tracking-wider ${isKec
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : isDesa
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : isProv
                                    ? 'bg-teal-50 border-teal-200 text-[#047D78]'
                                    : 'bg-blue-50 border-blue-200 text-blue-700'
                                }`}
                            >
                              {sug.level}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Selected Smart Region Pills */}
                  {selectedRegionPills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedRegionPills.map((pill) => (
                        <span
                          key={pill.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-100 border border-purple-200 px-2 py-1 text-[11px] font-bold text-purple-900"
                        >
                          <MapPin className="h-3 w-3 text-purple-700" />
                          <span className="truncate max-w-[140px]">{pill.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRegionPill(pill.id)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 2: Multiple Provinsi (Full 38 Provinces from API) */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('provinsi')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  Provinsi ({selectedProvinces.length > 0 ? selectedProvinces.length : 'Semua'})
                </span>
                {expandedSection.provinsi ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.provinsi && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{provinceList.length} Provinsi</span>
                    <button
                      type="button"
                      onClick={handleSelectAllProvinces}
                      className="text-[#047D78] font-bold hover:underline"
                    >
                      {selectedProvinces.length === provinceList.length ? 'Batalkan Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={provinceSearch}
                      onChange={(e) => setProvinceSearch(e.target.value)}
                      placeholder="Cari provinsi..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:border-[#047D78] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar border border-slate-100 rounded-xl p-1.5 bg-slate-50/30">
                    {loadingProvinces ? (
                      <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#047D78]" />
                        <span>Memuat daftar provinsi...</span>
                      </div>
                    ) : (
                      filteredProvinceList.map((prov) => {
                        const isChecked = selectedProvinces.includes(prov.name)
                        return (
                          <label
                            key={prov.id || prov.name}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${isChecked
                              ? 'bg-teal-50 border border-teal-200 font-bold text-teal-900'
                              : 'hover:bg-slate-100/70 text-slate-600'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleProvinceToggle(prov.name)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78]"
                            />
                            <span className="truncate uppercase leading-tight text-[11px]">{prov.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 3: Multiple Jenis Bencana */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('jenisBencana')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jenis Bencana</span>
                {expandedSection.jenisBencana ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.jenisBencana && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar pt-1">
                  {Array.from(new Set([...ALL_JENIS_BENCANA, ...reports.map(r => r.jenis_bencana).filter(Boolean)])).sort().map((jenis) => {
                    const isChecked = selectedTypes.includes(jenis)
                    return (
                      <label
                        key={jenis}
                        className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${isChecked
                          ? 'bg-teal-50 border border-teal-200 font-bold text-teal-900'
                          : 'hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTypeToggle(jenis)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78]"
                        />
                        <span className="leading-tight flex-1">{jenis}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 4: Tanggal Kejadian */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('tanggal')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rentang Waktu</span>
                {expandedSection.tanggal ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.tanggal && (
                <div className="space-y-1.5 pt-1">
                  {[
                    { id: 'all', label: 'Semua Tanggal' },
                    { id: '7days', label: '7 Hari Terakhir' },
                    { id: '30days', label: '30 Hari Terakhir' },
                  ].map((preset) => (
                    <label
                      key={preset.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${selectedDatePreset === preset.id
                        ? 'bg-teal-700 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <input
                        type="radio"
                        name="datePreset"
                        checked={selectedDatePreset === preset.id}
                        onChange={() => {
                          setSelectedDatePreset(preset.id)
                          setCurrentPage(1)
                        }}
                        className="hidden"
                      />
                      <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span>{preset.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 5: Status Verifikasi */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('status')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status Verifikasi</span>
                {expandedSection.status ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.status && (
                <div className="space-y-1.5 pt-1">
                  {['Diverifikasi', 'Menunggu Verifikasi'].map((st) => {
                    const isChecked = selectedStatuses.includes(st)
                    return (
                      <label
                        key={st}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${isChecked
                          ? 'bg-teal-50 border border-teal-200 font-bold text-teal-900'
                          : 'hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleStatusToggle(st)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78]"
                        />
                        <span>{st}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* SECTION 6: Filter Spesifik */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer select-none py-1"
                onClick={() => toggleSection('dampak')}
              >
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dampak Spesifik</span>
                {expandedSection.dampak ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>

              {expandedSection.dampak && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterKorbanOnly}
                      onChange={(e) => {
                        setFilterKorbanOnly(e.target.checked)
                        setCurrentPage(1)
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78]"
                    />
                    <span>Ada Korban Jiwa / Luka</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterFaskesOnly}
                      onChange={(e) => {
                        setFilterFaskesOnly(e.target.checked)
                        setCurrentPage(1)
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78]"
                    />
                    <span>Ada Faskes Terdampak</span>
                  </label>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-extrabold text-xs uppercase tracking-wider transition text-center"
              >
                Clear All Filter
              </button>
            </div>
          </aside>

          {/* ==================== RIGHT MAIN DATA MATRIX ==================== */}
          <main className="lg:col-span-9 xl:col-span-9 2xl:col-span-10 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              {/* Header Title & Subtitle */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">DAFTAR LAPORAN KEJADIAN BENCANA</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Daftar rekapitulasi data laporan kejadian bencana kesehatan yang siap difilter dan diunduh.</p>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                    title="Unduh format Excel / CSV terfilter"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                    <span>Unduh Excel (.XLSX)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition shadow-sm"
                    title="Cetak atau unduh dokumen PDF ringkasan"
                  >
                    <FileText className="h-4 w-4 text-rose-700" />
                    <span>Unduh PDF (.PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateDashboardHTML}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-[#047D78] hover:bg-[#036662] px-3.5 py-2 text-xs font-bold text-white transition shadow-md cursor-pointer active:scale-95"
                    title="Generate & cetak laporan HTML/PDF lengkap Kop Kemenkes & 3 Chart"
                  >
                    <Sparkles className="h-4 w-4 text-teal-200" />
                    <span>Cetak Dashboard Report (HTML/PDF)</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE FILTER PILLS BAR */}
              {activeFilterCount > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mr-1">Filter Aktif:</span>

                  {selectedRegionPills.map((pill) => (
                    <span key={pill.id} className="inline-flex items-center gap-1 rounded-lg bg-purple-700 text-white px-2 py-0.5 text-xs font-semibold">
                      {pill.level}: {pill.name}
                      <button onClick={() => handleRemoveRegionPill(pill.id)} className="hover:text-rose-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {selectedProvinces.map((prov) => (
                    <span key={prov} className="inline-flex items-center gap-1 rounded-lg bg-teal-700 text-white px-2 py-0.5 text-xs font-semibold">
                      Prov: {prov}
                      <button onClick={() => handleProvinceToggle(prov)} className="hover:text-rose-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {selectedTypes.map((jenis) => (
                    <span key={jenis} className="inline-flex items-center gap-1 rounded-lg bg-[#047D78] text-white px-2 py-0.5 text-xs font-semibold">
                      Bencana: {jenis}
                      <button onClick={() => handleTypeToggle(jenis)} className="hover:text-rose-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {selectedStatuses.map((st) => (
                    <span key={st} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 text-white px-2 py-0.5 text-xs font-semibold">
                      Status: {st}
                      <button onClick={() => handleStatusToggle(st)} className="hover:text-rose-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-700 text-white px-2 py-0.5 text-xs font-semibold">
                      Cari: &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery('')} className="hover:text-rose-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="ml-auto text-[11px] font-extrabold text-rose-600 hover:underline"
                  >
                    Reset Semua
                  </button>
                </div>
              )}

              {/* Controls Row: Items Per Page & Live Search */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#047D78]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>Data per halaman</span>
                </div>

                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Pencarian lokasi s.d. Desa, kode, narasi..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#047D78] focus:outline-none focus:ring-1 focus:ring-[#047D78]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* DATA MATRIX TABLE WITH DEEP HIERARCHY */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#047D78] text-white uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-3 border-b border-[#036662] text-center w-10">NO</th>
                      <th className="py-3 px-3 border-b border-[#036662]">TGL KEJADIAN</th>
                      <th className="py-3 px-3 border-b border-[#036662]">TGL PERKEMBANGAN</th>
                      <th className="py-3 px-3 border-b border-[#036662]">LEVEL / LOKASI (PROV, KAB, KEC, DESA)</th>
                      <th className="py-3 px-3 border-b border-[#036662]">JENIS BENCANA</th>
                      <th className="py-3 px-3 border-b border-[#036662] text-center">KORBAN</th>
                      <th className="py-3 px-3 border-b border-[#036662] text-center">PENDUDUK TERDAMPAK</th>
                      <th className="py-3 px-3 border-b border-[#036662] text-center">FASKES TERDAMPAK</th>
                      <th className="py-3 px-3 border-b border-[#036662] text-center">DETAIL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {paginatedReports.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <Info className="mx-auto h-8 w-8 opacity-40 mb-2" />
                          <p className="text-sm font-semibold">Tidak ada laporan kejadian yang sesuai dengan kriteria filter lokasi/bencana.</p>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-[#047D78] hover:bg-teal-100 transition"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset Semua Filter
                          </button>
                        </td>
                      </tr>
                    ) : (
                      paginatedReports.map((item, idx) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1
                        return (
                          <tr key={item.id} className="hover:bg-teal-50/30 transition">
                            {/* NO */}
                            <td className="py-3 px-3 text-center font-bold text-slate-600">{globalIndex}</td>

                            {/* TGL KEJADIAN */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <p className="font-extrabold text-slate-800">{item.tgl_kejadian_formatted}</p>
                              <span className="text-[10px] text-slate-400 font-medium">{item.jam_kejadian}</span>
                            </td>

                            {/* TGL PERKEMBANGAN */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <p className="font-extrabold text-slate-800">{item.tgl_perkembangan_formatted}</p>
                              <span className="text-[10px] text-slate-400 font-medium">{item.jam_perkembangan}</span>
                            </td>

                            {/* LEVEL / LOKASI DEEP HIERARCHY */}
                            <td className="py-3 px-3">
                              <span className="inline-block text-[9px] font-bold text-rose-600 uppercase tracking-wider mb-0.5">
                                {item.tingkat_bencana}
                              </span>
                              <p className="font-extrabold text-slate-900 leading-snug">{item.kabupaten}</p>
                              <p className="text-[10px] text-slate-600 font-semibold">
                                Kec. {item.kecamatan}, <span className="text-teal-700 font-bold">{item.desa}</span>
                              </p>
                              <p className="text-[9px] text-slate-400 uppercase">Prov. {item.provinsi}</p>
                            </td>

                            {/* JENIS BENCANA */}
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                {item.jenis_bencana}
                              </span>
                            </td>

                            {/* KORBAN */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block font-extrabold px-2 py-0.5 rounded-lg text-xs ${item.korban_meninggal > 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'text-slate-700'
                                }`}>
                                {item.korban_meninggal + item.korban_luka_berat + item.korban_luka_ringan + item.korban_hilang}
                              </span>
                            </td>

                            {/* PENDUDUK TERDAMPAK */}
                            <td className="py-3 px-3 text-center whitespace-nowrap font-semibold text-slate-800">
                              {item.penduduk_terdampak + item.pengungsi > 0 ? (
                                item.penduduk_terdampak + item.pengungsi
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* FASKES TERDAMPAK */}
                            <td className="py-3 px-3 text-center whitespace-nowrap font-semibold">
                              {item.faskes_terdampak > 0 ? (
                                <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-xs font-bold text-cyan-800">
                                  {item.faskes_terdampak} Unit
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* DETAIL FORMULIR BUTTON */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-[#047D78] transition"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Pratinjau</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER & PAGINATION */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Menampilkan <strong className="text-slate-800">{filteredReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> sampai{' '}
                  <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredReports.length)}</strong> dari{' '}
                  <strong className="text-slate-800">{filteredReports.length}</strong> laporan terfilter
                </p>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Sebelumnya
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${currentPage === page
                        ? 'bg-[#047D78] text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* DETAIL MODAL PREVIEW WITH DEEP HIERARCHY */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-extrabold text-[#047D78] uppercase tracking-wider">
                  {detailItem.kode_laporan}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{detailItem.jenis_bencana}</h3>
                <p className="text-xs text-slate-600 font-semibold">
                  Lokasi: <span className="text-teal-700 font-bold">{detailItem.desa}</span>, Kec. {detailItem.kecamatan}, {detailItem.kabupaten}, Prov. {detailItem.provinsi}
                </p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Waktu Kejadian</p>
                <p className="font-extrabold text-slate-800 mt-0.5">{detailItem.tgl_kejadian_formatted} ({detailItem.jam_kejadian})</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status Verifikasi</p>
                <p className="font-extrabold text-emerald-700 mt-0.5">{detailItem.status_verifikasi}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Rincian Dampak Kesehatan & Korban</h4>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-rose-50 border border-rose-100 p-2 rounded-xl">
                  <p className="text-[10px] font-bold text-rose-600">Meninggal</p>
                  <p className="text-base font-black text-rose-700">{detailItem.korban_meninggal}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-600">Luka Berat</p>
                  <p className="text-base font-black text-amber-700">{detailItem.korban_luka_berat}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-600">Luka Ringan</p>
                  <p className="text-base font-black text-blue-700">{detailItem.korban_luka_ringan}</p>
                </div>
                <div className="bg-slate-100 border border-slate-200 p-2 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-600">Faskes Rusak</p>
                  <p className="text-base font-black text-slate-800">{detailItem.faskes_terdampak}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Narasi Perkembangan Kejadian</h4>
              <p className="text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                {detailItem.deskripsi}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Petugas: <strong>{detailItem.petugas}</strong></span>
              <button
                type="button"
                onClick={() => {
                  const target = detailItem
                  setDetailItem(null)
                  handleDownloadSinglePDF(target)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#047D78] hover:bg-[#036662] px-4 py-2 text-xs font-bold text-white transition"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak & Unduh Laporan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
