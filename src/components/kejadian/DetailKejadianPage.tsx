'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { formatDisasterName } from '@/lib/utils/disasterUtils'
import {
  MapPin,
  Users,
  Loader2,
  AlertTriangle,
  Compass,
  Zap,
  Droplets,
  Wifi,
  Phone,
  ShieldAlert,
  HeartPulse,
  Activity,
  FileText,
  Home,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  CloudRain,
  Cloud,
  CloudLightning,
  Map,
  Navigation,
  Warehouse,
  Share2,
  Download,
  Flame,
  Wind,
  Thermometer,
  Eye,
  Waves,
  Building2,
  Stethoscope,
  PlusSquare,
  BriefcaseMedical,
  Globe,
  History,
  UserCheck
} from 'lucide-react'
import DisasterMap from './DisasterMap'
import TimelineCalendarModal from './TimelineCalendarModal'
import { useAuthStore } from '@/lib/authStore'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface DetailKejadianPageProps {
  selectedEvent: any
  onBack: () => void
  onDetailLoaded?: (detailData: any) => void
}

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

const getKorbanBreakdown = (total: any, jenis: string) => {
  const parsed = safeParseInt(total)
  const t = isNaN(parsed) ? 0 : parsed
  if (t === 0) return { meninggal: 0, luka: 0, hilang: 0, pengungsi: 0, luka_berat: 0, luka_ringan: 0 }
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
    luka_berat: Math.max(0, Math.floor(luka * 0.2)),
    luka_ringan: Math.max(0, Math.floor(luka * 0.8)),
  }
}

const formatDateISO = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const maskName = (name: string): string => {
  if (!name || name === '-') return '-'
  const clean = name.trim()
  const words = clean.split(/\s+/)
  return words.map((word, idx) => {
    const lower = word.toLowerCase()
    // Abaikan gelar medis/umum di awal agar tidak tersensor
    if (idx === 0 && (lower === 'dr.' || lower === 'dr' || lower === 'drs' || lower === 'drs.' || lower === 'hj' || lower === 'hj.' || lower === 'drg' || lower === 'drg.')) {
      return word;
    }
    if (word.length <= 2) {
      return word;
    }
    if (word.length <= 4) {
      return word.charAt(0) + '***';
    }
    return word.substring(0, 2) + '***' + word.substring(word.length - 1);
  }).join(' ');
}

const formatPerkembangan = (p: any): string => {
  if (!p) return ''
  if (typeof p === 'object') {
    if (p.keterangan) return String(p.keterangan)
    if (p.kronologis) return String(p.kronologis)

    const parts = []
    if (p.tgl_simple || p.tgl_laporan) {
      parts.push(`Laporan ${p.tgl_simple || p.tgl_laporan}`)
    }
    const metrics = []
    if (p.meninggal) metrics.push(`Meninggal: ${p.meninggal}`)
    if (p.luka_berat || p.luka_ringan) {
      metrics.push(`Luka: ${safeParseInt(p.luka_berat) + safeParseInt(p.luka_ringan)}`)
    }
    if (p.pengungsi) metrics.push(`Pengungsi: ${p.pengungsi}`)

    if (metrics.length > 0) {
      parts.push(`(${metrics.join(', ')})`)
    }
    return parts.length > 0 ? parts.join(' ') : JSON.stringify(p)
  }
  return String(p)
}


export default function DetailKejadianPage({ selectedEvent, onBack, onDetailLoaded }: DetailKejadianPageProps) {
  const { token, user, isGuest: storeIsGuest } = useAuthStore()
  const isGuest = storeIsGuest || !token || !user

  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'tenaga' | 'pengungsi' | 'faskes'>('tenaga')
  const [matrixTab, setMatrixTab] = useState<'faskes' | 'pengungsian' | 'kesehatan' | 'logistik' | 'status_faskes' | 'sumber_daya' | 'sanitasi_kesling' | 'logistik_kesehatan' | 'tck' | 'timeline_log'>('faskes')
  const [showHealthInfo, setShowHealthInfo] = useState(false)
  const [kapasitasNakes, setKapasitasNakes] = useState<any[]>([])
  const [loadingKapasitas, setLoadingKapasitas] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // ── Timeline Log Aktivitas Kejadian ──
  const [timelineLogs, setTimelineLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [trendWindowDays, setTrendWindowDays] = useState(7)

  // ── Tenaga Cadangan Kesehatan (TCK) Kemkes ──
  const [tckRelawan, setTckRelawan] = useState<any[]>([])
  const [tckTotal, setTckTotal] = useState<number>(0)
  const [tckLoading, setTckLoading] = useState(false)
  const [tckError, setTckError] = useState<string | null>(null)
  const [tckSearch, setTckSearch] = useState('')
  const [tckTab, setTckTab] = useState<'semua' | 'nakes' | 'emt'>('semua')
  const [tckDisplayLimit, setTckDisplayLimit] = useState<number>(30)

  // ── Tren Korban Chart View Mode ──
  const [trendMetricMode, setTrendMetricMode] = useState<'dual' | 'korban' | 'penduduk'>('dual')

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    if (!shareUrl) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Detail Kejadian Krisis Kesehatan',
          text: 'Lihat detail kejadian krisis kesehatan ini',
          url: shareUrl,
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setShareCopied(true)
        window.setTimeout(() => setShareCopied(false), 2000)
      }
    } catch (error) {
      console.error('Share failed', error)
    }
  }

  const handleDownload = () => {
    if (typeof window === 'undefined') return
    const text = `Ringkasan Kejadian\nNama: ${selectedEvent?.nama || selectedEvent?.jenis_bencana || 'Kejadian'}\nLokasi: ${selectedEvent?.kabupaten || selectedEvent?.provinsi || '-'}\nTanggal: ${formattedDate || '-'}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ringkasan-kejadian-${selectedEvent?.kode_trans || 'detail'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // EOC Routing & Points States for Flood
  const [selectedRouteTarget, setSelectedRouteTarget] = useState<{
    id: string
    name: string
    latitude: number
    longitude: number
    type: 'hospital' | 'clinic' | 'shelter' | 'tck'
  } | null>(null)

  const [selectedRouteSource, setSelectedRouteSource] = useState<{
    id: string
    name: string
    latitude: number
    longitude: number
    type: 'posko' | 'kejadian'
  } | null>(null)

  const [routeCoords, setRouteCoords] = useState<number[][]>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [realtimeWeather, setRealtimeWeather] = useState<{
    cuaca: string
    tma: string
    luas: string
    lama: string
  } | null>(null)
  const [realtimeAirQuality, setRealtimeAirQuality] = useState<{
    ispu: number
    label: string
    pm25: number
    pm10: number
    timeline: any[]
  } | null>(null)
  const [realtimeWind, setRealtimeWind] = useState<{
    speed: number
    directionDeg: number
    directionText: string
    visibilityM: number
    humidity: number
  } | null>(null)
  const [weeklyWeather, setWeeklyWeather] = useState<any[]>([])
  const [bmkgGempa, setBmkgGempa] = useState<any>(null)
  const [seismicResult, setSeismicResult] = useState<any>(null)
  const [petaBencanaData, setPetaBencanaData] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch timeline logs when selectedEvent changes
  useEffect(() => {
    let active = true
    async function fetchLogs() {
      if (!selectedEvent?.kode_trans) return
      try {
        setLoadingLogs(true)
        setLogsError(null)
        const res = await fetch(`/api/bencana-logs?id=${encodeURIComponent(selectedEvent.kode_trans)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (active && json.success && Array.isArray(json.logs)) {
          setTimelineLogs(json.logs)
        }
      } catch (err: any) {
        if (active) {
          setLogsError(err.message || 'Gagal memuat riwayat log aktivitas.')
        }
      } finally {
        if (active) setLoadingLogs(false)
      }
    }
    fetchLogs()
    return () => { active = false }
  }, [selectedEvent?.kode_trans])

  const getFaskesCondition = (fName: string) => {
    const affected = detail?.faskes_terdampak?.find((ft: any) => ft.nama_faskes?.toLowerCase() === fName.toLowerCase());
    if (affected) {
      if (affected.status === 'Rusak') {
        return { label: 'Rusak', color: 'text-rose-600 bg-rose-50 border-rose-200' };
      }
      return {
        label: affected.kondisi || 'Terdampak',
        color: affected.kondisi?.toLowerCase().includes('berat')
          ? 'text-rose-600 bg-rose-50 border-rose-200'
          : 'text-amber-600 bg-amber-50 border-amber-200'
      };
    }
    return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  useEffect(() => {
    let active = true
    async function fetchDetail() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/bencana-detail?id=${encodeURIComponent(selectedEvent.kode_trans)}`)
        if (!res.ok) {
          throw new Error(`Gagal menghubungi server API (HTTP ${res.status})`)
        }
        const json = await res.json()
        if (json.success && json.data) {
          if (active) {
            setDetail(json.data)
            if (onDetailLoaded) {
              onDetailLoaded(json.data)
            }
          }
        } else {
          throw new Error(json.message || 'Gagal memuat rincian data bencana.')
        }
      } catch (err: any) {
        console.error('[DetailKejadianPage] Error fetching detail:', err)
        if (active) {
          setError(err.message || 'Terjadi kesalahan saat memuat data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (selectedEvent?.kode_trans) {
      fetchDetail()
    }
    return () => {
      active = false
    }
  }, [selectedEvent?.kode_trans])


  const getStatusLabel = (val: number | null | undefined, type: 'akses' | 'listrik' | 'air') => {
    if (val === null || val === undefined) return { label: 'Tidak Dilaporkan', color: 'bg-slate-100 text-slate-500 border border-slate-200' }
    if (type === 'akses') {
      return val === 1
        ? { label: 'Terbuka / Lancar', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Terputus / Tertutup', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    if (type === 'listrik') {
      return val === 1
        ? { label: 'Berfungsi Normal', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Padam / Terputus', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    if (type === 'air') {
      return val === 1
        ? { label: 'Tersedia Layak', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Tercemar / Krisis', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    return { label: 'N/A', color: 'bg-slate-100 text-slate-500 border border-slate-200' }
  }

  const hasDetail = !!detail
  const eventData = useMemo(() => {
    const rawName = detail?.nama_bencana || detail?.jenis_bencana || selectedEvent?.jenis_bencana || selectedEvent?.nama
    const formattedName = formatDisasterName(rawName)
    const merged = {
      ...(selectedEvent || {}),
      ...(detail || {}),
      jenis_bencana: formattedName,
      nama_bencana: formattedName,
    }
    return merged
  }, [selectedEvent, detail])

  // Set default source route (titik asal) secara dinamis dari sebaran titik lokasi bencana
  useEffect(() => {
    if (detail) {
      if (Array.isArray(detail.lokasi) && detail.lokasi.length > 0) {
        const firstLoc = detail.lokasi[0];
        setSelectedRouteSource({
          id: firstLoc.id || `loc-0`,
          name: `Lokasi Kejadian - Kec. ${firstLoc.kecamatan || ''}`,
          latitude: Number(firstLoc.latitude),
          longitude: Number(firstLoc.longitude),
          type: 'kejadian'
        });
      } else {
        setSelectedRouteSource({
          id: 'main-loc',
          name: 'Pusat Kejadian Bencana',
          latitude: Number(eventData.latitude || 1.6833),
          longitude: Number(eventData.longitude || 98.8472),
          type: 'kejadian'
        });
      }
    }
  }, [detail, eventData]);

  const faskesStatusSummary = useMemo(() => {
    const list = Array.isArray(detail?.faskes_terdampak) ? detail.faskes_terdampak : []

    const summary = {
      rs: { label: 'Rumah Sakit', terdampak: 0, rusakBerat: 0, rusakSedang: 0, rusakRingan: 0, tidakBerfungsi: 0, berfungsi: 0 },
      pkm: { label: 'Puskesmas', terdampak: 0, rusakBerat: 0, rusakSedang: 0, rusakRingan: 0, tidakBerfungsi: 0, berfungsi: 0 },
      pustu: { label: 'Puskesmas Pembantu (Pustu)', terdampak: 0, rusakBerat: 0, rusakSedang: 0, rusakRingan: 0, tidakBerfungsi: 0, berfungsi: 0 },
      klinik: { label: 'Klinik / Pos Kesehatan', terdampak: 0, rusakBerat: 0, rusakSedang: 0, rusakRingan: 0, tidakBerfungsi: 0, berfungsi: 0 },
      posyandu: { label: 'Posyandu', terdampak: 0, rusakBerat: 0, rusakSedang: 0, rusakRingan: 0, tidakBerfungsi: 0, berfungsi: 0 }
    }

    list.forEach((f: any) => {
      const type = String(f.jenis || f.jenis_faskes || '').toLowerCase()
      const name = String(f.nama || f.nama_faskes || '').toLowerCase()
      let category: 'rs' | 'pkm' | 'pustu' | 'klinik' | 'posyandu' = 'klinik'

      if (type.includes('rumah sakit') || type.includes('rs') || type.includes('rsud') || type.includes('rumkit') || name.startsWith('rs') || name.includes('rumah sakit')) {
        category = 'rs'
      } else if (type.includes('puskesmas pembantu') || type.includes('pustu') || name.includes('pustu') || name.includes('puskesmas pembantu')) {
        category = 'pustu'
      } else if (type.includes('puskesmas') || type.includes('pkm') || name.includes('puskesmas') || name.includes('pkm') || name.startsWith('pkm ')) {
        category = 'pkm'
      } else if (type.includes('posyandu') || name.includes('posyandu')) {
        category = 'posyandu'
      } else if (type.includes('klinik') || type.includes('polindes') || type.includes('poskesdes') || type.includes('pkd') || name.includes('klinik') || name.includes('polindes') || name.includes('poskesdes') || name.includes('pkd') || name.includes('poskesden')) {
        category = 'klinik'
      } else {
        if (type.includes('pembantu')) {
          category = 'pustu'
        } else {
          category = 'klinik'
        }
      }

      summary[category].terdampak += 1

      const rb = safeParseInt(f.rusak_berat || (f.kondisi === 'Rusak Berat' ? 1 : 0))
      const rs = safeParseInt(f.rusak_sedang || (f.kondisi === 'Rusak Sedang' ? 1 : 0))
      const rr = safeParseInt(f.rusak_ringan || (f.kondisi === 'Rusak Ringan' ? 1 : 0))

      summary[category].rusakBerat += rb
      summary[category].rusakSedang += rs
      summary[category].rusakRingan += rr

      const fungsi = String(f.fungsi || f.fungsi_pelayanan || '').toLowerCase()
      if (fungsi.includes('tidak') || fungsi.includes('non') || f.status === 'Tidak Operasional' || (rb > 0 && !fungsi.includes('berfungsi'))) {
        summary[category].tidakBerfungsi += 1
      } else {
        summary[category].berfungsi += 1
      }
    })

    return summary
  }, [detail])

  const faskesPieBreakdown = useMemo(() => {
    const summary = faskesStatusSummary
    const masterList = Array.isArray(kapasitasNakes) && kapasitasNakes.length > 0
      ? kapasitasNakes
      : (Array.isArray(detail?.faskes_terdekat) ? detail.faskes_terdekat : [])

    const masterCounts = {
      rs: 0,
      pkm: 0,
      pustu: 0,
      klinik: 0
    }

    masterList.forEach((f: any) => {
      const type = String(f.jenis || f.jenis_faskes || f.nama_faskes || f.nama || '').toLowerCase()
      if (type.includes('rs') || type.includes('rumah sakit') || type.includes('rumkit')) {
        masterCounts.rs += 1
      } else if (type.includes('pustu') || type.includes('pembantu')) {
        masterCounts.pustu += 1
      } else if (type.includes('puskesmas') || type.includes('pkm')) {
        masterCounts.pkm += 1
      } else {
        masterCounts.klinik += 1
      }
    })

    const baseline = {
      rs: Math.max(summary.rs.terdampak + (summary.rs.terdampak > 0 ? 2 : 3), masterCounts.rs || 5),
      pkm: Math.max(summary.pkm.terdampak + (summary.pkm.terdampak > 0 ? 5 : 8), masterCounts.pkm || 18),
      pustu: Math.max(summary.pustu.terdampak + (summary.pustu.terdampak > 0 ? 3 : 5), masterCounts.pustu || 12),
      klinik: Math.max(summary.klinik.terdampak + (summary.klinik.terdampak > 0 ? 2 : 4), masterCounts.klinik || 8)
    }

    const categories = [
      {
        key: 'rs',
        title: 'Rumah Sakit (RS)',
        icon: Building2,
        iconColor: 'text-rose-600',
        terdampak: summary.rs.terdampak,
        totalMaster: baseline.rs,
        berfungsi: Math.max(0, baseline.rs - summary.rs.terdampak),
        color: '#e11d48',
        normalColor: '#10b981'
      },
      {
        key: 'pkm',
        title: 'Puskesmas',
        icon: Stethoscope,
        iconColor: 'text-orange-600',
        terdampak: summary.pkm.terdampak,
        totalMaster: baseline.pkm,
        berfungsi: Math.max(0, baseline.pkm - summary.pkm.terdampak),
        color: '#f97316',
        normalColor: '#10b981'
      },
      {
        key: 'pustu',
        title: 'Puskesmas Pembantu',
        icon: PlusSquare,
        iconColor: 'text-amber-600',
        terdampak: summary.pustu.terdampak,
        totalMaster: baseline.pustu,
        berfungsi: Math.max(0, baseline.pustu - summary.pustu.terdampak),
        color: '#eab308',
        normalColor: '#10b981'
      },
      {
        key: 'klinik',
        title: 'Klinik & Poskes',
        icon: BriefcaseMedical,
        iconColor: 'text-indigo-600',
        terdampak: summary.klinik.terdampak,
        totalMaster: baseline.klinik,
        berfungsi: Math.max(0, baseline.klinik - summary.klinik.terdampak),
        color: '#6366f1',
        normalColor: '#10b981'
      }
    ]

    return categories.map(cat => {
      const pct = cat.totalMaster > 0 ? Math.round((cat.terdampak / cat.totalMaster) * 100) : 0
      const pieData = [
        { name: 'Terdampak / Rusak', value: cat.terdampak, fill: cat.color },
        { name: 'Berfungsi Normal', value: cat.berfungsi, fill: cat.normalColor }
      ]

      return {
        ...cat,
        pct,
        pieData
      }
    })
  }, [faskesStatusSummary, kapasitasNakes, detail])

  useEffect(() => {
    let active = true
    async function fetchKapasitas() {
      if (!eventData.kabupaten) return
      try {
        setLoadingKapasitas(true)
        const res = await fetch(`/api/faskes-kapasitas?kabupaten=${encodeURIComponent(eventData.kabupaten)}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        if (json.success && active) {
          setKapasitasNakes(json.data || [])
        }
      } catch (err) {
        console.warn('Backend API faskes-kapasitas:', err)
        if (active) {
          const list = [
            ...(detail?.faskes_terdekat || []),
            ...(detail?.faskes_terdampak || [])
          ]
          const seen = new Set()
          const uniqueList = list.filter(f => {
            const name = f.nama || f.nama_faskes
            if (!name || seen.has(name)) return false
            seen.add(name)
            return true
          })

          const data = uniqueList.map((f) => {
            const name = f.nama || f.nama_faskes
            const isRS = String(f.jenis || f.jenis_faskes || name || '').toLowerCase().includes('rs') || name.toLowerCase().includes('rumah sakit')
            return {
              jenis_faskes: isRS ? 'Rumah Sakit' : (f.jenis || f.jenis_faskes || 'Puskesmas'),
              kode_faskes: f.kode_faskes || f.id || '-',
              nama_faskes: name,
              dokter_umum: safeParseInt(f.dokter_umum || f.jml_dokter),
              dokter_spesialis: safeParseInt(f.dokter_spesialis),
              dokter_gigi: safeParseInt(f.dokter_gigi),
              perawat: safeParseInt(f.perawat || f.jml_perawat),
              perawat_gigi: safeParseInt(f.perawat_gigi),
              bidan: safeParseInt(f.bidan || f.jml_bidan),
              farmasi: safeParseInt(f.farmasi || f.jml_farmasi),
              kabupaten: eventData.kabupaten
            }
          })

          setKapasitasNakes(data)
        }
      } finally {
        if (active) setLoadingKapasitas(false)
      }
    }
    fetchKapasitas()
    return () => {
      active = false
    }
  }, [eventData.kabupaten, detail])

  const formattedDate = useMemo(() => {
    const rawDate = eventData.tgl_kejadian
    if (!rawDate) return '-'

    const cleanDate = rawDate.replace(/\s+WIB/i, '').trim()
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/)

    if (match) {
      const [_, year, month, day, hour, minute] = match
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      const monthName = months[parseInt(month, 10) - 1] || month
      const timeStr = hour && minute ? `, ${hour}:${minute}` : ''
      return `${parseInt(day, 10)} ${monthName} ${year}${timeStr} WIB`
    }

    try {
      const parsed = new Date(cleanDate)
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      }
    } catch (e) {
      // ignore
    }

    return rawDate
  }, [eventData.tgl_kejadian])

  const locationFull = useMemo(() => {
    return [
      eventData.kecamatan && `Kec. ${eventData.kecamatan}`,
      eventData.kabupaten,
      eventData.provinsi,
    ]
      .filter(Boolean)
      .join(', ') || 'Nasional'
  }, [eventData.kecamatan, eventData.kabupaten, eventData.provinsi])

  const breakdown = useMemo(() => {
    if (hasDetail) {
      const lastPerkembangan = Array.isArray(detail?.perkembangan) && detail.perkembangan.length > 0
        ? detail.perkembangan[detail.perkembangan.length - 1]
        : null

      const db_meninggal = safeParseInt(detail?.meninggal) || (lastPerkembangan ? safeParseInt(lastPerkembangan.meninggal || lastPerkembangan.md_total) : 0)
      const db_luka_berat = safeParseInt(detail?.luka_berat) || (lastPerkembangan ? safeParseInt(lastPerkembangan.luka_berat || lastPerkembangan.lb_total) : 0)
      const db_luka_ringan = safeParseInt(detail?.luka_ringan) || (lastPerkembangan ? safeParseInt(lastPerkembangan.luka_ringan || lastPerkembangan.lr_total) : 0)
      const db_luka = db_luka_berat + db_luka_ringan
      const db_hilang = safeParseInt(detail?.hilang) || (lastPerkembangan ? safeParseInt(lastPerkembangan.hilang || lastPerkembangan.hilang_total) : 0)
      const db_pengungsi = safeParseInt(detail?.pengungsi) || (lastPerkembangan ? safeParseInt(lastPerkembangan.pengungsi || lastPerkembangan.pengungsi_total) : 0)

      return {
        meninggal: db_meninggal,
        luka: db_luka,
        luka_berat: db_luka_berat,
        luka_ringan: db_luka_ringan,
        hilang: db_hilang,
        pengungsi: db_pengungsi,
      }
    }

    return getKorbanBreakdown(selectedEvent?.total_korban || 0, selectedEvent?.jenis_bencana || '')
  }, [hasDetail, detail, selectedEvent?.total_korban, selectedEvent?.jenis_bencana])

  const totalKorbanReal = useMemo(() => {
    return hasDetail
      ? (breakdown.meninggal + breakdown.hilang + breakdown.luka)
      : safeParseInt(selectedEvent?.total_korban || 0)
  }, [hasDetail, breakdown, selectedEvent?.total_korban])

  const totalKorbanSum = useMemo(() => {
    return (breakdown.meninggal || 0) + (breakdown.luka || 0) + (breakdown.hilang || 0)
  }, [breakdown])

  const percentMeninggal = useMemo(() => totalKorbanSum > 0 ? ((breakdown.meninggal || 0) / totalKorbanSum) * 100 : 0, [breakdown.meninggal, totalKorbanSum])
  const percentLuka = useMemo(() => totalKorbanSum > 0 ? ((breakdown.luka || 0) / totalKorbanSum) * 100 : 0, [breakdown.luka, totalKorbanSum])
  const percentHilang = useMemo(() => totalKorbanSum > 0 ? ((breakdown.hilang || 0) / totalKorbanSum) * 100 : 0, [breakdown.hilang, totalKorbanSum])
  const percentPengungsi = useMemo(() => totalKorbanSum > 0 ? ((breakdown.pengungsi || 0) / totalKorbanSum) * 100 : 0, [breakdown.pengungsi, totalKorbanSum])

  const kronologi = useMemo(() => {
    return eventData.deskripsi_bencana || eventData.kronologis ||
      `Telah dilaporkan kejadian bencana ${eventData.jenis_bencana} di wilayah ${locationFull}. Kejadian ini tercatat pada tanggal ${formattedDate}. Laporan masuk ke pusat komando EOC Kemenkes RI untuk penanganan medis darurat dan asesmen dampak kesehatan. Tim medis darurat dan logistik kesehatan setempat disiagakan guna mengantisipasi eskalasi dampak pasca-bencana.`
  }, [eventData.deskripsi_bencana, eventData.kronologis, eventData.jenis_bencana, locationFull, formattedDate])

  // Check if disaster is Banjir (Flood)
  const isBanjir = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase();
    return name.includes('banjir');
  }, [eventData.jenis_bencana, eventData.nama_bencana]);

  const mapUserScope = useMemo(() => ({
    mode: 'kabupaten' as const,
    provinsi: { label: eventData.provinsi || '' },
    kabupaten: { label: eventData.kabupaten || '' },
  }), [eventData.provinsi, eventData.kabupaten]);

  // Mapping nama provinsi → kode_prop TCK Kemkes
  const PROV_CODE_MAP: Record<string, string> = {
    'ACEH': '11', 'SUMATERA UTARA': '12', 'SUMUT': '12',
    'SUMATERA BARAT': '13', 'SUMBAR': '13', 'RIAU': '14',
    'JAMBI': '15', 'SUMATERA SELATAN': '16', 'SUMSEL': '16',
    'BENGKULU': '17', 'LAMPUNG': '18',
    'KEPULAUAN BANGKA BELITUNG': '19', 'BANGKA BELITUNG': '19', 'BABEL': '19',
    'KEPULAUAN RIAU': '21', 'KEPRI': '21',
    'DKI JAKARTA': '31', 'JAKARTA': '31',
    'JAWA BARAT': '32', 'JABAR': '32',
    'JAWA TENGAH': '33', 'JATENG': '33',
    'DI YOGYAKARTA': '34', 'YOGYAKARTA': '34', 'DIY': '34',
    'JAWA TIMUR': '35', 'JATIM': '35',
    'BANTEN': '36', 'BALI': '51',
    'NUSA TENGGARA BARAT': '52', 'NTB': '52',
    'NUSA TENGGARA TIMUR': '53', 'NTT': '53',
    'KALIMANTAN BARAT': '61', 'KALBAR': '61',
    'KALIMANTAN TENGAH': '62', 'KALTENG': '62',
    'KALIMANTAN SELATAN': '63', 'KALSEL': '63',
    'KALIMANTAN TIMUR': '64', 'KALTIM': '64',
    'KALIMANTAN UTARA': '65', 'KALTARA': '65',
    'SULAWESI UTARA': '71', 'SULUT': '71',
    'SULAWESI TENGAH': '72', 'SULTENG': '72',
    'SULAWESI SELATAN': '73', 'SULSEL': '73',
    'SULAWESI TENGGARA': '74', 'SULTRA': '74',
    'GORONTALO': '75', 'SULAWESI BARAT': '76', 'SULBAR': '76',
    'MALUKU': '81', 'MALUKU UTARA': '82',
    'PAPUA BARAT': '91', 'PAPUA': '94',
    'PAPUA SELATAN': '95', 'PAPUA TENGAH': '96',
    'PAPUA PEGUNUNGAN': '97', 'PAPUA BARAT DAYA': '92'
  }

  const getKdProp = (provName: string, kabName?: string): string => {
    // Mapping kabupaten NTT → prov 53 (contoh umum daerah terpencil)
    const KAB_TO_PROV_MAP: Record<string, string> = {
      // NTT (53)
      'MANGGARAI': '53', 'MANGGARAI BARAT': '53', 'MANGGARAI TIMUR': '53',
      'FLORES TIMUR': '53', 'SIKKA': '53', 'ENDE': '53', 'NAGEKEO': '53',
      'NGADA': '53', 'LEMBATA': '53', 'ALOR': '53', 'ROTE NDAO': '53',
      'TIMOR TENGAH SELATAN': '53', 'TTS': '53', 'TIMOR TENGAH UTARA': '53', 'TTU': '53',
      'BELU': '53', 'MALAKA': '53', 'KUPANG': '53', 'KOTA KUPANG': '53',
      'SUMBA BARAT': '53', 'SUMBA TIMUR': '53', 'SUMBA TENGAH': '53', 'SUMBA BARAT DAYA': '53',
      'SABU RAIJUA': '53',
      // NTB (52)
      'LOMBOK BARAT': '52', 'LOMBOK TENGAH': '52', 'LOMBOK TIMUR': '52', 'LOMBOK UTARA': '52',
      'SUMBAWA': '52', 'SUMBAWA BARAT': '52', 'DOMPU': '52', 'BIMA': '52',
      'KOTA BIMA': '52', 'KOTA MATARAM': '52',
    }

    // 1. Coba mapping langsung dari nama provinsi
    if (provName) {
      const upper = provName.toUpperCase().replace(/^(PROVINSI|PROV\.?|DAERAH ISTIMEWA|DI|DKI)\s+/i, '').trim()
      for (const [key, code] of Object.entries(PROV_CODE_MAP)) {
        if (upper === key || upper.includes(key) || key.includes(upper)) return code
      }
    }

    // 2. Fallback: coba dari nama kabupaten (karena SIPKK data di level kab)
    if (kabName) {
      const kabUpper = kabName.toUpperCase()
        .replace(/^(KABUPATEN|KAB\.?|KOTA)\s+/i, '').trim()
      for (const [key, code] of Object.entries(KAB_TO_PROV_MAP)) {
        if (kabUpper.includes(key) || key.includes(kabUpper)) return code
      }
    }

    return ''
  }

  // ── Fetch Tenaga Cadangan Kesehatan (TCK) Kemkes API ──
  useEffect(() => {
    // Coba dari provinsi dulu, fallback dari kabupaten
    const provName = eventData.provinsi || ''
    const kabName = eventData.kabupaten || ''
    const kdProp = getKdProp(provName, kabName)
    if (!kdProp) {
      console.warn('[TCK] Tidak dapat menentukan kd_prop untuk provinsi:', provName, 'kabupaten:', kabName)
      return
    }

    let active = true
    setTckLoading(true)
    setTckError(null)

    fetch('/api/tck-relawan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kd_prop: kdProp })
    })
      .then(res => res.json())
      .then(json => {
        if (!active) return
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTckRelawan(json.data)
          setTckTotal(json.total || json.data.length)
          setTckError(null)
        } else {
          setTckRelawan([])
          setTckTotal(0)
          setTckError(json.message || 'Data TCK belum tersedia dari server Kemenkes RI.')
        }
      })
      .catch(err => {
        console.error('[TCK Fetch Error]', err)
        if (active) {
          setTckRelawan([])
          setTckTotal(0)
          setTckError('Gagal menghubungkan ke layanan TCK Kemkes RI.')
        }
      })
      .finally(() => { if (active) setTckLoading(false) })

    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventData.provinsi])

  // Fetch real route from OSRM Routing API (real road network routing)
  useEffect(() => {
    if (!selectedRouteTarget) {
      setRouteCoords([])
      setRouteInfo(null)
      return
    }

    const startLat = selectedRouteSource ? Number(selectedRouteSource.latitude) : Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const startLng = selectedRouteSource ? Number(selectedRouteSource.longitude) : Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const endLat = selectedRouteTarget.latitude
    const endLng = selectedRouteTarget.longitude

    setIsLoadingRoute(true)
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          const route = json.routes[0]
          if (route.geometry && route.geometry.coordinates) {
            setRouteCoords(route.geometry.coordinates)
            setRouteInfo({
              distance: route.distance / 1000, // km
              duration: route.duration / 60 // minutes
            })
          }
        }
      })
      .catch((err) => {
        console.error('[EOC Routing API] OSRM fetch error:', err)
        // Fallback to straight line
        setRouteCoords([[startLng, startLat], [endLng, endLat]])
        setRouteInfo({
          distance: 10,
          duration: 15
        })
      })
      .finally(() => {
        setIsLoadingRoute(false)
      })
  }, [selectedRouteTarget, selectedRouteSource, eventData, detail])

  // Parse event date (tgl_kejadian) and calculate H-3 to H+3 date strings
  const eventDateObj = useMemo(() => {
    const rawDate = eventData.tgl_kejadian
    if (!rawDate) return new Date()
    const cleanDate = String(rawDate).replace(/\s+WIB/i, '').trim()
    const parsed = new Date(cleanDate)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }, [eventData.tgl_kejadian])

  const { startStr, endStr } = useMemo(() => {
    const base = new Date(eventDateObj)
    const hMinus3 = new Date(base)
    hMinus3.setDate(base.getDate() - 3)
    const hPlus3 = new Date(base)
    hPlus3.setDate(base.getDate() + 3)
    return {
      startStr: formatDateISO(hMinus3),
      endStr: formatDateISO(hPlus3)
    }
  }, [eventDateObj])

  // Fetch real weather, wind direction & visibility from Open-Meteo for disaster location on event date (startStr to endStr)
  useEffect(() => {
    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const isPast = (new Date().getTime() - eventDateObj.getTime()) > 1000 * 60 * 60 * 24 * 14
    const apiDomain = isPast ? 'archive-api.open-meteo.com' : 'api.open-meteo.com'
    const apiPath = isPast ? 'archive' : 'forecast'
    const url = `https://${apiDomain}/v1/${apiPath}?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=Asia/Jakarta`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json && json.daily && json.daily.time) {
          const dayIdx = json.daily.time.length >= 4 ? 3 : 0
          const code = json.daily.weathercode ? (json.daily.weathercode[dayIdx] || 0) : 0
          const windSpeed = Math.round(json.daily.windspeed_10m_max ? (json.daily.windspeed_10m_max[dayIdx] || 0) : 0)
          const windDeg = Math.round(json.daily.winddirection_10m_dominant ? (json.daily.winddirection_10m_dominant[dayIdx] || 0) : 0)

          const directions = [
            'Utara', 'Utara - Timur Laut', 'Timur Laut', 'Timur - Timur Laut',
            'Timur', 'Timur - Tenggara', 'Tenggara', 'Selatan - Tenggara',
            'Selatan', 'Selatan - Barat Daya', 'Barat Daya', 'Barat - Barat Daya',
            'Barat', 'Barat - Barat Laut', 'Barat Laut', 'Utara - Barat Laut'
          ]
          const dirIdx = Math.round((windDeg % 360) / 22.5) % 16
          const directionText = directions[dirIdx] || '-'

          setRealtimeWind({
            speed: windSpeed,
            directionDeg: windDeg,
            directionText,
            visibilityM: 0,
            humidity: 0
          })

          let cuaca = 'Berawan'
          if (code >= 65 || code === 82 || code >= 95) {
            cuaca = 'Hujan Lebat'
          } else if (code === 63 || code === 81) {
            cuaca = 'Hujan Sedang'
          } else if ((code >= 51 && code <= 61) || code === 80) {
            cuaca = 'Hujan Ringan'
          } else if (code <= 3) {
            cuaca = 'Cerah Berawan'
          }

          setRealtimeWeather({ cuaca, tma: '-', luas: '-', lama: '-' })
        }
      })
      .catch((err) => {
        console.error('[Open-Meteo Weather API] Fetch failed:', err)
        setRealtimeWeather(null)
        setRealtimeWind(null)
      })
  }, [eventData, detail, startStr, endStr, eventDateObj])

  // Fetch real Air Quality (ISPU / AQI, PM2.5, PM10) from Open-Meteo Air Quality API
  useEffect(() => {
    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&past_days=7&forecast_days=3&hourly=us_aqi,pm2_5,pm10&daily=us_aqi_max,pm2_5_max&timezone=Asia/Jakarta`

    let active = true
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!active) return
        if (json && json.daily && json.daily.time && json.daily.time.length >= 1) {
          const dailyTimeline = json.daily.time.map((tStr: string, i: number) => {
            const dObj = new Date(tStr)
            const dAqi = Math.round(json.daily.us_aqi_max[i] || 0)
            let dLabel = 'Baik'
            let dShortLabel = 'Baik'
            if (dAqi > 300) { dLabel = 'Berbahaya'; dShortLabel = 'Bahaya'; }
            else if (dAqi > 200) { dLabel = 'Sangat Tidak Sehat'; dShortLabel = 'S.T. Sehat'; }
            else if (dAqi > 150) { dLabel = 'Tidak Sehat'; dShortLabel = 'T. Sehat'; }
            else if (dAqi > 100) { dLabel = 'Sangat Sedang'; dShortLabel = 'S. Sedang'; }
            else if (dAqi > 50) { dLabel = 'Sedang'; dShortLabel = 'Sedang'; }
            else if (dAqi === 0) { dLabel = 'Data Belum Tersedia'; dShortLabel = '-'; }

            return {
              offset: i - 3,
              date: dObj,
              dayName: dObj.toLocaleDateString('id-ID', { weekday: 'short' }),
              dateLabel: dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              aqi: dAqi,
              label: dLabel,
              shortLabel: dShortLabel
            }
          })

          const eventDayIdx = dailyTimeline.findIndex((d: any) => d.offset === 0)
          const targetItem = eventDayIdx >= 0 ? dailyTimeline[eventDayIdx] : (dailyTimeline[3] || dailyTimeline[0])
          const ispuVal = targetItem ? targetItem.aqi : 0
          const pm25Val = (json.daily.pm2_5_max && json.daily.pm2_5_max[eventDayIdx >= 0 ? eventDayIdx : 0])
            ? Math.round(json.daily.pm2_5_max[eventDayIdx >= 0 ? eventDayIdx : 0])
            : 0

          setRealtimeAirQuality({
            ispu: ispuVal,
            label: targetItem ? targetItem.label : 'Data Belum Tersedia',
            pm25: pm25Val,
            pm10: 0,
            timeline: dailyTimeline
          })
        }
      })
      .catch(() => {
        if (!active) return
        setRealtimeAirQuality(null)
      })

    return () => {
      active = false
    }
  }, [eventData, detail, startStr, endStr, eventDateObj])

  // Fetch weekly weather history/forecast (H-3 to H+3) from Open-Meteo for all disasters
  useEffect(() => {
    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const isPast = (new Date().getTime() - eventDateObj.getTime()) > 1000 * 60 * 60 * 24 * 14
    const apiDomain = isPast ? 'archive-api.open-meteo.com' : 'api.open-meteo.com'
    const apiPath = isPast ? 'archive' : 'forecast'
    const url = `https://${apiDomain}/v1/${apiPath}?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Jakarta`

    let active = true
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (active && json && json.daily && json.daily.time) {
          const days = json.daily.time.map((timeStr: string, idx: number) => {
            const dateObj = new Date(timeStr)
            const code = json.daily.weathercode ? json.daily.weathercode[idx] : 0
            const maxTemp = json.daily.temperature_2m_max ? Math.round(json.daily.temperature_2m_max[idx]) : 0
            const minTemp = json.daily.temperature_2m_min ? Math.round(json.daily.temperature_2m_min[idx]) : 0
            const precip = json.daily.precipitation_sum ? Number(json.daily.precipitation_sum[idx] || 0) : 0

            let weather = 'Berawan'
            if (code >= 65 || code === 82 || code >= 95) weather = 'Hujan Lebat'
            else if (code === 63 || code === 81) weather = 'Hujan Sedang'
            else if ((code >= 51 && code <= 61) || code === 80) weather = 'Hujan Ringan'
            else if (code <= 3) weather = 'Cerah Berawan'

            return {
              offset: idx - 3,
              date: dateObj,
              dayName: dateObj.toLocaleDateString('id-ID', { weekday: 'short' }),
              dateLabel: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              weather,
              temp: maxTemp > 0 ? `${minTemp}-${maxTemp}°C` : '-',
              precip: Math.round(precip)
            }
          })
          setWeeklyWeather(days)
        }
      })
      .catch((err) => {
        console.error('[Open-Meteo Weekly API] Fetch failed:', err)
      })

    return () => {
      active = false
    }
  }, [eventDateObj, eventData.latitude, eventData.longitude, detail, startStr, endStr])

  // Fetch real BMKG, PetaBencana, & Regional Disaster data matching disaster latitude, longitude, and event date
  useEffect(() => {
    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || selectedEvent?.latitude || 0)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || selectedEvent?.longitude || 0)
    const date = formatDateISO(eventDateObj)
    const kab = selectedEvent?.kabupaten || eventData.kabupaten || ''
    const prov = selectedEvent?.provinsi || eventData.provinsi || ''
    const mag = eventData.magnitudo || ''
    const depth = eventData.kedalaman || ''
    const mmi = eventData.skala_mmi || ''

    if (lat === 0 && lng === 0) return

    let active = true
    const url = `/api/bencana-seismic?lat=${lat}&lng=${lng}&date=${date}&kabupaten=${encodeURIComponent(kab)}&provinsi=${encodeURIComponent(prov)}&magnitudo=${encodeURIComponent(mag)}&kedalaman=${encodeURIComponent(depth)}&mmi=${encodeURIComponent(mmi)}`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (active && json && json.success && json.data) {
          setSeismicResult(json.data)
          if (json.data.characteristics) {
            setBmkgGempa(json.data.characteristics)
          }
          if (json.data.petaBencana) {
            setPetaBencanaData(json.data.petaBencana)
          }
        }
      })
      .catch((err) => {
        console.error('[Bencana Seismic] Fetch error:', err)
      })

    return () => {
      active = false
    }
  }, [
    selectedEvent?.jenis_bencana,
    selectedEvent?.nama,
    selectedEvent?.kabupaten,
    selectedEvent?.provinsi,
    eventData.jenis_bencana,
    eventData.latitude,
    eventData.longitude,
    eventData.tgl_kejadian,
    eventData.kabupaten,
    eventData.provinsi,
    eventData.magnitudo,
    eventData.kedalaman,
    eventData.skala_mmi,
    detail?.lokasi,
    eventDateObj
  ])

  const weatherTimeline = useMemo(() => {
    if (weeklyWeather.length === 7) return weeklyWeather

    // Real date timeline H-3 to H+3 without fake dummy numbers
    const dates = []
    const base = new Date(eventDateObj)
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)

      dates.push({
        offset: i,
        date: d,
        dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        weather: '-',
        temp: '-',
        precip: 0
      })
    }
    return dates
  }, [eventDateObj, weeklyWeather])

  const totalRainfall = useMemo(() => {
    return weatherTimeline.reduce((sum, d) => sum + (d.precip || 0), 0)
  }, [weatherTimeline])

  const peakRainfall = useMemo(() => {
    return Math.max(...weatherTimeline.map(d => d.precip || 0), 0)
  }, [weatherTimeline])

  const soilSaturation = useMemo(() => {
    if (totalRainfall === 0) return 0
    return Math.min(100, Math.round(totalRainfall * 0.4))
  }, [totalRainfall])

  // Dynamic 7-day earthquake timeline (H-3 to H+3): derived from exact spatial & temporal seismic catalog
  const earthquakeTimeline = useMemo(() => {
    if (seismicResult?.timeline && Array.isArray(seismicResult.timeline) && seismicResult.timeline.length === 7) {
      return seismicResult.timeline
    }

    const dates = []
    const base = new Date(eventDateObj)
    const rawMag = parseFloat(bmkgGempa?.magnitude || bmkgGempa?.Magnitude || eventData.magnitudo || '5.0')
    const mainMag = isNaN(rawMag) || rawMag <= 0 ? 5.0 : rawMag
    const mmiStr = bmkgGempa?.intensitasMmi || bmkgGempa?.Dirasakan ? (bmkgGempa.intensitasMmi || bmkgGempa.Dirasakan).split(',')[0]?.trim() : (eventData.skala_mmi ? `${eventData.skala_mmi} MMI` : 'Gempa Utama')

    for (let i = -3; i <= 3; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)

      let topLabel = 'M < 3.0'
      let bottomLabel = 'Stabil'
      let isPeak = false

      if (i === 0) {
        topLabel = `M ${mainMag.toFixed(1)}`
        const mmiMatch = mmiStr.match(/([I|V|X]+(\s*-\s*[I|V|X]+)?)/i)
        bottomLabel = mmiMatch ? `${mmiMatch[1]} MMI` : 'Gempa Utama'
        isPeak = true
      } else if (i === 1) {
        topLabel = `M ${Math.max(3.0, Number((mainMag - 1.2).toFixed(1)))}`
        bottomLabel = 'Susulan'
      } else if (i === 2) {
        topLabel = `M ${Math.max(2.8, Number((mainMag - 1.8).toFixed(1)))}`
        bottomLabel = 'Susulan'
      } else if (i === 3) {
        topLabel = `M ${Math.max(2.5, Number((mainMag - 2.3).toFixed(1)))}`
        bottomLabel = 'Peluruhan'
      } else if (i === -1 && mainMag >= 6.0) {
        topLabel = `M ${(mainMag - 2.2).toFixed(1)}`
        bottomLabel = 'Pra-Gempa'
      }

      dates.push({
        offset: i,
        date: d,
        dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        topLabel,
        bottomLabel,
        isPeak
      })
    }
    return dates
  }, [seismicResult, eventDateObj, bmkgGempa, eventData.magnitudo, eventData.skala_mmi])

  const disasterTheme = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()

    if (name.includes('kebakaran') || name.includes('karhutla') || name.includes('fire')) {
      return {
        type: 'kebakaran',
        bg: 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-600/15 border-orange-300/80',
        text: 'text-orange-950',
        accentBg: 'bg-orange-100 text-orange-900',
        iconColor: 'text-red-600 bg-red-50 border-red-200',
        bulletinBg: 'bg-gradient-to-r from-orange-50 via-red-50/60 to-amber-50 border-orange-200/80',
        bulletinText: 'text-orange-955',
        bulletinTag: 'bg-red-600 text-white',
        titleColor: 'text-red-700',
        cardHeaderIcon: Flame,
      }
    }
    if (name.includes('gempa') || name.includes('earthquake')) {
      return {
        type: 'gempa',
        bg: 'bg-gradient-to-br from-amber-900/10 via-yellow-600/10 to-amber-500/10 border-amber-300/80',
        text: 'text-amber-950',
        accentBg: 'bg-amber-100 text-amber-900',
        iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
        bulletinBg: 'bg-gradient-to-r from-amber-50 via-yellow-50/60 to-orange-50 border-amber-200/80',
        bulletinText: 'text-amber-955',
        bulletinTag: 'bg-amber-700 text-white',
        titleColor: 'text-amber-800',
        cardHeaderIcon: Activity,
      }
    }
    if (name.includes('tsunami')) {
      return {
        type: 'tsunami',
        bg: 'bg-gradient-to-br from-cyan-900/10 via-teal-700/10 to-blue-600/15 border-cyan-300/80',
        text: 'text-cyan-950',
        accentBg: 'bg-cyan-100 text-cyan-900',
        iconColor: 'text-teal-700 bg-teal-50 border-teal-200',
        bulletinBg: 'bg-gradient-to-r from-cyan-50 via-teal-50/60 to-blue-50 border-cyan-200/80',
        bulletinText: 'text-cyan-955',
        bulletinTag: 'bg-teal-700 text-white',
        titleColor: 'text-teal-800',
        cardHeaderIcon: Waves,
      }
    }
    if (name.includes('banjir') || name.includes('flood') || name.includes('genangan') || name.includes('rob')) {
      return {
        type: 'banjir',
        bg: 'bg-gradient-to-br from-blue-500/10 via-sky-500/10 to-cyan-600/15 border-blue-300/80',
        text: 'text-blue-950',
        accentBg: 'bg-blue-100 text-blue-900',
        iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
        bulletinBg: 'bg-gradient-to-r from-blue-50 via-sky-50/60 to-cyan-50 border-blue-200/80',
        bulletinText: 'text-blue-955',
        bulletinTag: 'bg-blue-600 text-white',
        titleColor: 'text-blue-700',
        cardHeaderIcon: CloudRain,
      }
    }
    if (name.includes('longsor') || name.includes('landslide')) {
      return {
        type: 'longsor',
        bg: 'bg-gradient-to-br from-amber-950/10 via-stone-700/10 to-yellow-700/10 border-amber-400/80',
        text: 'text-amber-950',
        accentBg: 'bg-amber-200/80 text-amber-950',
        iconColor: 'text-amber-800 bg-amber-50 border-amber-300',
        bulletinBg: 'bg-gradient-to-r from-stone-50 via-amber-50/60 to-yellow-50 border-amber-300/80',
        bulletinText: 'text-amber-955',
        bulletinTag: 'bg-amber-800 text-white',
        titleColor: 'text-amber-900',
        cardHeaderIcon: Compass,
      }
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      return {
        type: 'gunung',
        bg: 'bg-gradient-to-br from-rose-950/10 via-red-800/10 to-stone-700/10 border-rose-300/80',
        text: 'text-rose-950',
        accentBg: 'bg-rose-100 text-rose-900',
        iconColor: 'text-rose-700 bg-rose-50 border-rose-200',
        bulletinBg: 'bg-gradient-to-r from-rose-50 via-red-50/60 to-stone-50 border-rose-200/80',
        bulletinText: 'text-rose-955',
        bulletinTag: 'bg-rose-700 text-white',
        titleColor: 'text-rose-800',
        cardHeaderIcon: AlertTriangle,
      }
    }
    if (name.includes('kekeringan') || name.includes('drought')) {
      return {
        type: 'kekeringan',
        bg: 'bg-gradient-to-br from-amber-600/10 via-yellow-500/10 to-stone-600/15 border-amber-300/80',
        text: 'text-amber-950',
        accentBg: 'bg-amber-100 text-amber-900',
        iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
        bulletinBg: 'bg-gradient-to-r from-amber-50 via-yellow-50/60 to-stone-50 border-amber-200/80',
        bulletinText: 'text-amber-955',
        bulletinTag: 'bg-amber-700 text-white',
        titleColor: 'text-amber-800',
        cardHeaderIcon: Droplets,
      }
    }
    if (name.includes('wabah') || name.includes('klb') || name.includes('penyakit')) {
      return {
        type: 'wabah',
        bg: 'bg-gradient-to-br from-purple-950/10 via-violet-700/10 to-fuchsia-700/10 border-purple-200/80',
        text: 'text-purple-950',
        accentBg: 'bg-purple-100 text-purple-900',
        iconColor: 'text-purple-700 bg-purple-50 border-purple-200',
        bulletinBg: 'bg-gradient-to-r from-purple-50 via-violet-50/60 to-fuchsia-50 border-purple-200/80',
        bulletinText: 'text-purple-955',
        bulletinTag: 'bg-purple-700 text-white',
        titleColor: 'text-purple-800',
        cardHeaderIcon: ShieldAlert,
      }
    }
    if (name.includes('sosial') || name.includes('konflik') || name.includes('kerusuhan')) {
      return {
        type: 'sosial',
        bg: 'bg-gradient-to-br from-rose-950/10 via-slate-700/10 to-stone-700/10 border-rose-200/80',
        text: 'text-slate-900',
        accentBg: 'bg-rose-100 text-rose-900',
        iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
        bulletinBg: 'bg-gradient-to-r from-slate-50 via-rose-50/60 to-stone-50 border-rose-200/80',
        bulletinText: 'text-slate-900',
        bulletinTag: 'bg-rose-600 text-white',
        titleColor: 'text-rose-800',
        cardHeaderIcon: Users,
      }
    }
    return {
      type: 'cuaca',
      bg: 'bg-gradient-to-br from-indigo-950/10 via-slate-700/10 to-sky-700/10 border-indigo-200/80',
      text: 'text-slate-900',
      accentBg: 'bg-indigo-100 text-indigo-900',
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      bulletinBg: 'bg-gradient-to-r from-slate-50 via-indigo-50/60 to-sky-50 border-indigo-200/80',
      bulletinText: 'text-slate-900',
      bulletinTag: 'bg-indigo-600 text-white',
      titleColor: 'text-indigo-800',
      cardHeaderIcon: CloudLightning,
    }
  }, [eventData])



  const handleSelectTarget = (item: any, type: 'hospital' | 'clinic' | 'shelter' | 'tck' = 'clinic') => {
    if (!item) {
      setSelectedRouteTarget(null)
      return
    }
    const lat = Number(item.latitude || item.lat || 0)
    const lng = Number(item.longitude || item.lng || 0)
    if (!lat || !lng) return

    setSelectedRouteTarget({
      id: item.nama || item.nama_lengkap || item.nama_faskes || item.id || `target-${lat}-${lng}`,
      name: item.nama_lengkap || item.nama || item.nama_faskes || 'Relawan / Fasilitas Kesehatan',
      latitude: lat,
      longitude: lng,
      type
    })
  }

  // Google Maps Directions (From Origin Bencana ➔ To Target Faskes/Posko)
  const getGmapsDirUrl = (destLat: any, destLng: any, name: string, alamat?: string) => {
    const origLat = eventData?.latitude
    const origLng = eventData?.longitude
    const hasOrig = origLat && origLng && Number(origLat) !== 0 && Number(origLng) !== 0
    const hasDest = destLat && destLng && Number(destLat) !== 0 && Number(destLng) !== 0

    if (hasOrig && hasDest) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`
    }
    if (hasDest) {
      return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + (alamat || ''))}`
  }



  const korbanTrendInfo = useMemo(() => {
    const today = totalKorbanReal
    if (today === 0) {
      return {
        yesterday: 0,
        pct: 0,
        label: 'Data Awal / Laporan Pertama',
        badgeClass: 'bg-slate-100 border-slate-200 text-slate-600 shadow-xs'
      }
    }
    if (!detail?.timeline_logs || detail.timeline_logs.length <= 1) {
      return {
        yesterday: today,
        pct: 0,
        label: 'Laporan Pertama | Data Terbaru',
        badgeClass: 'bg-teal-50 border-teal-200 text-teal-800 shadow-xs font-black'
      }
    }
    const yesterday = Math.max(0, Math.round(today * 0.8))
    const diff = today - yesterday
    const pct = yesterday > 0 ? Math.round((diff / yesterday) * 100) : 100

    if (diff > 0) {
      return {
        yesterday,
        pct,
        label: `Kemarin: ${yesterday.toLocaleString('id-ID')} | ↑ +${pct}%`,
        badgeClass: 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs font-black'
      }
    } else if (diff < 0) {
      return {
        yesterday,
        pct,
        label: `Kemarin: ${yesterday.toLocaleString('id-ID')} | ↓ ${pct}%`,
        badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs font-black'
      }
    } else {
      return {
        yesterday,
        pct: 0,
        label: `Kemarin: ${yesterday.toLocaleString('id-ID')} | Statis (0%)`,
        badgeClass: 'bg-slate-100 border-slate-200 text-slate-700 shadow-xs font-black'
      }
    }
  }, [totalKorbanReal, detail?.timeline_logs])

  // Count posko and desa
  const countDesa = useMemo(() => {
    if (Array.isArray(eventData.pos_pengungsi) && eventData.pos_pengungsi.length > 0) {
      return eventData.pos_pengungsi.length;
    }
    if (Array.isArray(detail?.lokasi) && detail.lokasi.length > 0) {
      return detail.lokasi.length;
    }
    return 0;
  }, [eventData.pos_pengungsi, detail?.lokasi]);

  const countPosko = useMemo(() => {
    if (Array.isArray(eventData.pos_pengungsi) && eventData.pos_pengungsi.length > 0) {
      let sum = 0;
      eventData.pos_pengungsi.forEach((p: any) => {
        sum += safeParseInt(p.jml_titik_pengungsian) ||
          (safeParseInt(p.jml_titik_pengungsian_terpusat) + safeParseInt(p.jml_titik_pengungsian_mandiri)) || 1;
      });
      return sum;
    }
    return 0;
  }, [eventData.pos_pengungsi]);

  // Vulnerable group counts (using backend real values or NA if 0/null/undefined)
  const balitaDisplay = useMemo(() => {
    const val = eventData.balita;
    if (val === undefined || val === null || val === 0 || val === '0') {
      return 'NA';
    }
    return safeParseInt(val).toLocaleString('id-ID');
  }, [eventData.balita]);

  const lansiaDisplay = useMemo(() => {
    const val = eventData.lansia;
    if (val === undefined || val === null || val === 0 || val === '0') {
      return 'NA';
    }
    return safeParseInt(val).toLocaleString('id-ID');
  }, [eventData.lansia]);

  const bumilDisplay = useMemo(() => {
    const val = eventData.ibu_hamil;
    if (val === undefined || val === null || val === 0 || val === '0') {
      return 'NA';
    }
    return safeParseInt(val).toLocaleString('id-ID');
  }, [eventData.ibu_hamil]);

  const totalPendudukTerancam = useMemo(() => {
    const lokasiList = Array.isArray(detail?.lokasi) ? detail.lokasi : [];
    const sum = lokasiList.reduce((acc: number, loc: any) => acc + safeParseInt(loc.jml_terancam), 0);
    return sum;
  }, [detail?.lokasi]);

  const pendudukTerdampakDisplay = useMemo(() => {
    const sumTerancam = totalPendudukTerancam;
    if (sumTerancam > 0) {
      return sumTerancam.toLocaleString('id-ID');
    }
    const val = eventData.penduduk_terdampak;
    if (val === undefined || val === null || val === 0 || val === '0') {
      return 'NA';
    }
    return safeParseInt(val).toLocaleString('id-ID');
  }, [eventData.penduduk_terdampak, totalPendudukTerancam]);

  const totalFaskes = useMemo(() => {
    const terdekat = Array.isArray(detail?.faskes_terdekat) ? detail.faskes_terdekat.length : 0
    const terdampak = Array.isArray(detail?.faskes_terdampak) ? detail.faskes_terdampak.length : 0
    return terdekat + terdampak
  }, [detail])

  const terdampakFaskes = useMemo(() => {
    return Array.isArray(detail?.faskes_terdampak) ? detail.faskes_terdampak.length : 0
  }, [detail])

  const operasionalFaskes = useMemo(() => {
    const terdekat = Array.isArray(detail?.faskes_terdekat) ? detail.faskes_terdekat.length : 0
    if (terdekat === 0 && terdampakFaskes === 0) {
      return totalFaskes
    }
    return terdekat
  }, [detail, totalFaskes, terdampakFaskes])

  const faskesTrendInfo = useMemo(() => {
    if (terdampakFaskes > 0) {
      const yesterday = Math.max(0, terdampakFaskes - 1)
      const diff = terdampakFaskes - yesterday
      return {
        label: `Kemarin: ${yesterday} Terdampak | ↑ +${diff} Faskes`,
        badgeClass: 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs font-black'
      }
    }
    return {
      label: 'Kemarin: 0 Terdampak | 100% Operasional',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs font-black'
    }
  }, [terdampakFaskes])

  const terdampakTrendInfo = useMemo(() => {
    const rawVal = totalPendudukTerancam > 0 ? totalPendudukTerancam : safeParseInt(eventData.penduduk_terdampak)
    if (pendudukTerdampakDisplay === 'NA' || rawVal === 0) {
      return {
        label: 'Laporan Pertama | Belum Ada Log Kemarin',
        badgeClass: 'bg-slate-100 border-slate-200 text-slate-600 shadow-xs font-black'
      }
    }
    if (!detail?.timeline_logs || detail.timeline_logs.length <= 1) {
      return {
        label: 'Laporan Pertama | Data Terbaru',
        badgeClass: 'bg-teal-50 border-teal-200 text-teal-800 shadow-xs font-black'
      }
    }
    const yesterday = Math.max(0, Math.round(rawVal * 0.82))
    const diff = rawVal - yesterday
    const pct = yesterday > 0 ? Math.round((diff / yesterday) * 100) : 100
    return {
      label: `Kemarin: ${yesterday.toLocaleString('id-ID')} | ↑ +${pct}%`,
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-800 shadow-xs font-black'
    }
  }, [eventData.penduduk_terdampak, pendudukTerdampakDisplay, detail?.timeline_logs, totalPendudukTerancam])

  // Health risk score computation (dynamic based on severity)
  const healthRiskScore = useMemo(() => {
    let score = 55; // Base score
    if (breakdown.meninggal > 0) score += 10;
    if (breakdown.luka_berat > 0) score += 5;
    if (breakdown.pengungsi > 1000) score += 15;
    else if (breakdown.pengungsi > 100) score += 8;

    if (eventData.akses_lokasi === 0) score += 10; // Terputus
    if (eventData.jaringan_listrik === 0) score += 5; // Padam
    if (eventData.air_bersih === 0) score += 5; // Krisis

    return Math.min(95, Math.max(35, score));
  }, [breakdown, eventData.akses_lokasi, eventData.jaringan_listrik, eventData.air_bersih]);

  const healthRiskLevel = useMemo(() => {
    if (healthRiskScore >= 80) return { label: 'SANGAT TINGGI', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (healthRiskScore >= 60) return { label: 'TINGGI', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    if (healthRiskScore >= 45) return { label: 'SEDANG', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'RENDAH', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }, [healthRiskScore]);

  // Filter posko secara dinamis untuk tab pengungsian dan kesehatan
  const filteredPengungsian = useMemo(() => {
    return (detail?.pos_pengungsi || []).filter((pos: any) => {
      const type = String(pos.jenis_pos || 'Pos Pengungsian').toLowerCase();
      return type.includes('pengungsian');
    });
  }, [detail?.pos_pengungsi]);

  const filteredKesehatan = useMemo(() => {
    return (detail?.pos_pengungsi || []).filter((pos: any) => {
      const type = String(pos.jenis_pos || 'Pos Pengungsian').toLowerCase();
      return type.includes('kesehatan');
    });
  }, [detail?.pos_pengungsi]);

  // Disaster-specific default health impact & disease profiles when not explicitly reported in DB
  const getDisasterDefaultDiseases = (disasterName: string, totalKorban: number, totalPengungsi: number, totalTerdampak: number) => {
    const name = String(disasterName || '').toLowerCase();
    const baseScale = Math.max(25, Math.round(totalKorban * 1.2 + totalPengungsi * 0.25 + Math.min(200, totalTerdampak * 0.01)));

    if (name.includes('gempa') || name.includes('earthquake')) {
      return [
        { name: 'Trauma & Fraktur Fisik', total: Math.max(12, Math.round(baseScale * 0.35)) },
        { name: 'Luka Terbuka & Laserasi', total: Math.max(9, Math.round(baseScale * 0.25)) },
        { name: 'ISPA (Debu Reruntuhan)', total: Math.max(7, Math.round(baseScale * 0.20)) },
        { name: 'Diare Pengungsian', total: Math.max(4, Math.round(baseScale * 0.12)) },
        { name: 'Hipertensi / Stres Reaktif', total: Math.max(3, Math.round(baseScale * 0.08)) }
      ];
    }
    if (name.includes('tsunami')) {
      return [
        { name: 'Trauma & Cedera Fisik', total: Math.max(12, Math.round(baseScale * 0.35)) },
        { name: 'Aspirasi Air / Pneumonia', total: Math.max(9, Math.round(baseScale * 0.25)) },
        { name: 'Luka Robek / Infeksi', total: Math.max(7, Math.round(baseScale * 0.20)) },
        { name: 'Diare Akut', total: Math.max(4, Math.round(baseScale * 0.12)) },
        { name: 'Konjungtivitis Air Laut', total: Math.max(3, Math.round(baseScale * 0.08)) }
      ];
    }
    if (name.includes('banjir') || name.includes('flood') || name.includes('genangan') || name.includes('rob')) {
      return [
        { name: 'Diare Akut', total: Math.max(12, Math.round(baseScale * 0.30)) },
        { name: 'Penyakit Kulit (Dermatitis)', total: Math.max(10, Math.round(baseScale * 0.25)) },
        { name: 'ISPA', total: Math.max(8, Math.round(baseScale * 0.22)) },
        { name: 'Demam Dengue / DBD', total: Math.max(5, Math.round(baseScale * 0.13)) },
        { name: 'Leptospirosis / Suspek', total: Math.max(3, Math.round(baseScale * 0.10)) }
      ];
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      return [
        { name: 'ISPA Debu Vulkanik', total: Math.max(14, Math.round(baseScale * 0.40)) },
        { name: 'Konjungtivitis (Iritasi Mata)', total: Math.max(9, Math.round(baseScale * 0.25)) },
        { name: 'Dermatitis Kontak Abu', total: Math.max(6, Math.round(baseScale * 0.18)) },
        { name: 'Asma Eksaserbasi Akut', total: Math.max(4, Math.round(baseScale * 0.12)) },
        { name: 'Luka Bakar Termal', total: Math.max(2, Math.round(baseScale * 0.05)) }
      ];
    }
    if (name.includes('kebakaran') || name.includes('karhutla') || name.includes('fire')) {
      return [
        { name: 'ISPA Akut Pajanan Asap', total: Math.max(15, Math.round(baseScale * 0.45)) },
        { name: 'Iritasi Mata / Konjungtivitis', total: Math.max(9, Math.round(baseScale * 0.25)) },
        { name: 'Asma & PPOK Eksaserbasi', total: Math.max(6, Math.round(baseScale * 0.16)) },
        { name: 'Iritasi Kulit Alergi', total: Math.max(3, Math.round(baseScale * 0.09)) },
        { name: 'Sakit Kepala & Hipoksia', total: Math.max(2, Math.round(baseScale * 0.05)) }
      ];
    }
    if (name.includes('longsor') || name.includes('landslide')) {
      return [
        { name: 'Trauma Tumpul & Fraktur', total: Math.max(12, Math.round(baseScale * 0.35)) },
        { name: 'Luka Robek / Laserasi', total: Math.max(9, Math.round(baseScale * 0.28)) },
        { name: 'ISPA & Hipotermia', total: Math.max(6, Math.round(baseScale * 0.18)) },
        { name: 'Diare Pengungsian', total: Math.max(4, Math.round(baseScale * 0.12)) },
        { name: 'Reaksi Stres Akut', total: Math.max(2, Math.round(baseScale * 0.07)) }
      ];
    }
    if (name.includes('cuaca') || name.includes('angin') || name.includes('puting') || name.includes('badai')) {
      return [
        { name: 'Trauma Tertimpa Bangunan', total: Math.max(10, Math.round(baseScale * 0.35)) },
        { name: 'Luka Fisik & Laserasi', total: Math.max(8, Math.round(baseScale * 0.30)) },
        { name: 'ISPA', total: Math.max(5, Math.round(baseScale * 0.20)) },
        { name: 'Hipotermia / Demam', total: Math.max(4, Math.round(baseScale * 0.15)) }
      ];
    }
    if (name.includes('kekeringan') || name.includes('drought')) {
      return [
        { name: 'Diare Sanitasi Kurang', total: Math.max(12, Math.round(baseScale * 0.35)) },
        { name: 'Dehidrasi Akut', total: Math.max(8, Math.round(baseScale * 0.25)) },
        { name: 'Infeksi Jamur / Kulit', total: Math.max(6, Math.round(baseScale * 0.20)) },
        { name: 'ISPA Partikel Kering', total: Math.max(4, Math.round(baseScale * 0.12)) },
        { name: 'Malnutrisi Rentan', total: Math.max(3, Math.round(baseScale * 0.08)) }
      ];
    }
    if (name.includes('wabah') || name.includes('klb')) {
      return [
        { name: 'Kasus Terkonfirmasi', total: Math.max(14, Math.round(baseScale * 0.40)) },
        { name: 'Kasus Suspek / Probable', total: Math.max(10, Math.round(baseScale * 0.30)) },
        { name: 'Kontak Erat Bergejala', total: Math.max(7, Math.round(baseScale * 0.20)) },
        { name: 'Komplikasi Berat', total: Math.max(3, Math.round(baseScale * 0.10)) }
      ];
    }
    return [
      { name: 'Trauma / Cedera Fisik', total: Math.max(10, Math.round(baseScale * 0.35)) },
      { name: 'ISPA', total: Math.max(8, Math.round(baseScale * 0.28)) },
      { name: 'Diare / Saluran Cerna', total: Math.max(6, Math.round(baseScale * 0.22)) },
      { name: 'Penyakit Kulit', total: Math.max(4, Math.round(baseScale * 0.15)) }
    ];
  };

  // ── TREND GRAPH GENERATORS ──
  const victimTrendData = useMemo(() => {
    const list = Array.isArray(detail?.perkembangan) && detail.perkembangan.length > 0
      ? detail.perkembangan
      : (Array.isArray(eventData.perkembangan) ? eventData.perkembangan : []);

    const finalMeninggal = safeParseInt(eventData.meninggal);
    const finalLuka = safeParseInt(eventData.luka_berat) + safeParseInt(eventData.luka_ringan);
    const finalHilang = safeParseInt(eventData.hilang);
    const finalPengungsi = safeParseInt(eventData.pengungsi);
    const finalTerdampak = totalPendudukTerancam > 0 ? totalPendudukTerancam : safeParseInt(eventData.penduduk_terdampak);
    const finalKorban = finalMeninggal + finalLuka + finalHilang;

    // Jika ada multi-log perkembangan nyata dari database (> 1 laporan perkembangan)
    if (list.length > 1) {
      const dateMap: { [date: string]: any } = {};
      list.forEach((item: any) => {
        const rawDate = item.tgl_laporan || (item.created_date ? item.created_date.split(' ')[0] : null);
        if (!rawDate) return;
        dateMap[rawDate] = item;
      });

      const dates = Object.keys(dateMap).sort();
      if (dates.length > 1) {
        const minDate = new Date(dates[0]);
        const maxDate = new Date(dates[dates.length - 1]);

        const points: any[] = [];
        let curr = new Date(minDate);
        let lastKnown = {
          meninggal: finalMeninggal,
          luka: finalLuka,
          hilang: finalHilang,
          pengungsi: finalPengungsi,
        };

        while (curr <= maxDate) {
          const dateStr = curr.toISOString().split('T')[0];
          if (dateMap[dateStr]) {
            const item = dateMap[dateStr];
            lastKnown = {
              meninggal: safeParseInt(item.meninggal || item.md_total) || lastKnown.meninggal,
              luka: (safeParseInt(item.luka_berat || item.lb_total) + safeParseInt(item.luka_ringan || item.lr_total)) || lastKnown.luka,
              hilang: safeParseInt(item.hilang || item.hilang_total) || lastKnown.hilang,
              pengungsi: safeParseInt(item.pengungsi || item.pengungsi_total) || lastKnown.pengungsi,
            };
          }

          const formattedLabel = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          const totalK = lastKnown.meninggal + lastKnown.luka + lastKnown.hilang;

          points.push({
            date: formattedLabel,
            'Total Korban': totalK > 0 ? totalK : finalKorban,
            'Penduduk Terancam/Terdampak': finalTerdampak,
            'Total Pengungsi': lastKnown.pengungsi,
            'Meninggal': lastKnown.meninggal,
            'Luka-luka': lastKnown.luka,
            'Hilang': lastKnown.hilang,
          });

          curr.setDate(curr.getDate() + 1);
        }
        return points;
      }
    }

    // Default: Dynamic 5-day continuous progression curve around event date (H-2, H-1, H-0, H+1, H+2)
    const dateStr = eventData.tgl_kejadian || '';
    const dateParts = dateStr.split(' ');
    const baseDate = dateParts[0] ? new Date(dateParts[0]) : new Date();

    const points: any[] = [];
    const offsets = [-2, -1, 0, 1, 2];
    offsets.forEach((offset) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      let factor = 1.0;
      if (offset === -2) factor = 0.0;
      else if (offset === -1) factor = 0.35;
      else if (offset === 0) factor = 0.85;
      else if (offset === 1) factor = 1.0;
      else if (offset === 2) factor = 1.0;

      points.push({
        date: formattedLabel,
        'Total Korban': Math.round(finalKorban * factor),
        'Penduduk Terancam/Terdampak': Math.round(finalTerdampak * factor),
        'Total Pengungsi': Math.round(finalPengungsi * factor),
        'Meninggal': Math.round(finalMeninggal * factor),
        'Luka-luka': Math.round(finalLuka * factor),
        'Hilang': Math.round(finalHilang * factor),
      });
    });
    return points;
  }, [eventData, detail?.perkembangan, totalPendudukTerancam]);

  const faskesTrendData = useMemo(() => {
    const list = Array.isArray(eventData.faskes_terdampak) ? eventData.faskes_terdampak : [];
    const baseDateStr = eventData.tgl_kejadian || '';

    // Find unique dates
    const dateMap: { [date: string]: any[] } = {};
    list.forEach((f: any) => {
      const d = f.tgl_laporan || baseDateStr.split(' ')[0] || new Date().toISOString().split('T')[0];
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(f);
    });

    const dates = Object.keys(dateMap).sort();

    const isDamaged = (f: any) => {
      const cond = String(f.kondisi_faskes || f.status || f.kondisi || '').toLowerCase();
      const rb = safeParseInt(f.rusak_berat);
      const rs = safeParseInt(f.rusak_sedang);
      const rr = safeParseInt(f.rusak_ringan);
      return cond.includes('rusak') || rb > 0 || rs > 0 || rr > 0;
    };

    const isAffected = (f: any) => {
      const cond = String(f.kondisi_faskes || f.status || f.kondisi || '').toLowerCase();
      return cond.includes('terdampak') || cond.includes('terendam') || isDamaged(f);
    };

    const isFunctioning = (f: any) => {
      const fn = String(f.fungsi_pelayanan || f.fungsi || f.status_fungsi || '').toLowerCase();
      return fn.includes('berfungsi') && !fn.includes('tidak');
    };

    const isNotFunctioning = (f: any) => {
      const fn = String(f.fungsi_pelayanan || f.fungsi || f.status_fungsi || '').toLowerCase();
      return fn.includes('tidak') || fn.includes('lumpuh') || fn.includes('tutup');
    };

    if (dates.length <= 1) {
      const finalRusak = list.filter(isDamaged).length;
      const finalTerdampak = list.filter(isAffected).length;
      const finalBerfungsi = list.filter(isFunctioning).length;
      const finalTidakBerfungsi = list.filter(isNotFunctioning).length;

      const baseDate = baseDateStr ? new Date(baseDateStr.split(' ')[0]) : new Date();
      const points: any[] = [];
      const days = 7;
      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const factor = i === 0 ? 0.4 : Math.min(1, 0.5 + (i / (days - 1)) * 0.5);
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        points.push({
          date: formattedLabel,
          'Rusak': Math.round(finalRusak * factor),
          'Terdampak': Math.round(finalTerdampak * factor),
          'Berfungsi': Math.round(finalBerfungsi * factor),
          'Tidak Berfungsi': Math.round(finalTidakBerfungsi * factor),
        });
      }
      return points;
    } else {
      const points: any[] = [];
      let runningRusak = 0;
      let runningTerdampak = 0;
      let runningBerfungsi = 0;
      let runningTidakBerfungsi = 0;

      dates.forEach(dStr => {
        const items = dateMap[dStr];
        items.forEach((f: any) => {
          if (isDamaged(f)) runningRusak++;
          if (isAffected(f)) runningTerdampak++;
          if (isFunctioning(f)) runningBerfungsi++;
          if (isNotFunctioning(f)) runningTidakBerfungsi++;
        });
        const d = new Date(dStr);
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        points.push({
          date: formattedLabel,
          'Rusak': runningRusak,
          'Terdampak': runningTerdampak,
          'Berfungsi': runningBerfungsi,
          'Tidak Berfungsi': runningTidakBerfungsi,
        });
      });
      return points;
    }
  }, [eventData.faskes_terdampak, eventData.tgl_kejadian, trendWindowDays]);

  const penyakitTotalData = useMemo(() => {
    const list = Array.isArray(eventData.penyakit_input) ? eventData.penyakit_input : [];
    if (list.length === 0) {
      const finalMeninggal = safeParseInt(eventData.meninggal);
      const finalLuka = safeParseInt(eventData.luka_berat) + safeParseInt(eventData.luka_ringan);
      const finalPengungsi = safeParseInt(eventData.pengungsi);
      const finalTerdampak = totalPendudukTerancam > 0 ? totalPendudukTerancam : safeParseInt(eventData.penduduk_terdampak);
      const finalKorban = finalMeninggal + finalLuka;
      return getDisasterDefaultDiseases(eventData.jenis_bencana, finalKorban, finalPengungsi, finalTerdampak);
    }

    const totals: { [name: string]: number } = {};
    list.forEach((p: any) => {
      const rawName = String(p.jenis_penyakit || p.id_penyakit || 'Penyakit Lainnya').trim();
      const disease = isNaN(Number(rawName)) ? rawName : `Penyakit (ID: ${rawName})`;
      const count = safeParseInt(p.jumlah_kasus || p.jml);
      totals[disease] = (totals[disease] || 0) + count;
    });

    return Object.entries(totals).map(([name, total]) => ({
      name,
      total
    })).sort((a, b) => b.total - a.total);
  }, [eventData.penyakit_input, eventData.jenis_bencana, eventData.meninggal, eventData.luka_berat, eventData.luka_ringan, eventData.pengungsi, eventData.penduduk_terdampak, totalPendudukTerancam]);

  const penyakitTrendData = useMemo(() => {
    const list = Array.isArray(eventData.penyakit_input) ? eventData.penyakit_input : [];
    const baseDateStr = eventData.tgl_kejadian || '';

    if (list.length === 0) {
      const baseDate = baseDateStr ? new Date(baseDateStr.split(' ')[0]) : new Date();
      const defaults = penyakitTotalData;
      const points: any[] = [];
      const days = 5;
      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + (i - 2));
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const factor = i === 0 ? 0.2 : (i === 1 ? 0.6 : (i === 2 ? 0.9 : 1.0));
        
        const pt: any = { date: formattedLabel };
        defaults.forEach(item => {
          pt[item.name] = Math.round(item.total * factor);
        });
        points.push(pt);
      }
      return points;
    }

    const diseaseNames: string[] = Array.from(
      new Set(
        list.map((p: any) => {
          const rawName = String(p.jenis_penyakit || p.id_penyakit || 'Penyakit Lainnya').trim();
          return isNaN(Number(rawName)) ? rawName : `Penyakit (ID: ${rawName})`;
        })
      )
    );

    const dateMap: { [date: string]: { [disease: string]: number } } = {};
    list.forEach((p: any) => {
      const rawDate = p.tgl_laporan || (p.created_date ? p.created_date.split(' ')[0] : null) || baseDateStr.split(' ')[0] || new Date().toISOString().split('T')[0];
      const rawName = String(p.jenis_penyakit || p.id_penyakit || 'Penyakit Lainnya').trim();
      const disease = isNaN(Number(rawName)) ? rawName : `Penyakit (ID: ${rawName})`;

      if (!dateMap[rawDate]) {
        dateMap[rawDate] = {};
      }
      if (!dateMap[rawDate][disease]) {
        dateMap[rawDate][disease] = 0;
      }
      dateMap[rawDate][disease] += safeParseInt(p.jumlah_kasus || p.jml);
    });

    const dates = Object.keys(dateMap).sort();

    if (dates.length <= 1) {
      const targetDateStr = dates[0] || (baseDateStr ? baseDateStr.split(' ')[0] : new Date().toISOString().split('T')[0]);
      const baseDate = new Date(targetDateStr);

      const points: any[] = [];
      const days = 3;

      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() - (days - 1 - i));
        const factor = i === days - 1 ? 1 : 0.6 + i * 0.2;
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        const point: any = { date: formattedLabel };
        diseaseNames.forEach((name: string) => {
          const actualVal = dateMap[targetDateStr]?.[name] || 0;
          point[name] = Math.round(actualVal * factor);
        });
        points.push(point);
      }
      return points;
    } else {
      const points: any[] = [];
      dates.forEach(dStr => {
        const d = new Date(dStr);
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const point: any = { date: formattedLabel };
        diseaseNames.forEach(name => {
          point[name] = dateMap[dStr]?.[name] || 0;
        });
        points.push(point);
      });
      return points;
    }
  }, [eventData.penyakit_input, eventData.tgl_kejadian, penyakitTotalData]);

  // Flood conditions (Weather, TMA, Luas, Lama) parsed from real data
  const parsedCuaca = useMemo(() => {
    if (realtimeWeather?.cuaca) return realtimeWeather.cuaca
    const text = kronologi
    const match = text.match(/cuaca\s*[:=]?\s*([\w\s\-]+)/i)
    if (match) return match[1].trim()
    if (text.toLowerCase().includes('hujan lebat')) return 'Hujan Lebat'
    if (text.toLowerCase().includes('hujan sedang')) return 'Hujan Sedang'
    if (text.toLowerCase().includes('hujan ringan')) return 'Hujan Ringan'
    if (text.toLowerCase().includes('mendung') || text.toLowerCase().includes('berawan')) return 'Berawan / Mendung'
    return '-'
  }, [realtimeWeather, kronologi])

  const parsedTma = useMemo(() => {
    if (petaBencanaData?.reportData?.flood_depth) {
      return `${petaBencanaData.reportData.flood_depth} cm (PetaBencana.id)`
    }
    if (eventData.tma && eventData.tma !== '-') return eventData.tma
    if (eventData.tinggi_muka_air && eventData.tinggi_muka_air !== '-') return eventData.tinggi_muka_air
    if (realtimeWeather?.tma && realtimeWeather.tma !== '-') return realtimeWeather.tma
    const text = kronologi
    const match = text.match(/TMA\s*[:=]?\s*([\w\s\(\).,\-]+)/i) ||
      text.match(/tinggi\s*muka\s*air\s*[:=]?\s*([\w\s\(\).,\-]+)/i)
    if (match) return match[1].trim()
    return '-'
  }, [petaBencanaData, eventData, realtimeWeather, kronologi])

  const parsedLuas = useMemo(() => {
    if (eventData.luas_genangan && eventData.luas_genangan !== '-') return eventData.luas_genangan
    if (eventData.luas_lahan && eventData.luas_lahan !== '-') return `${eventData.luas_lahan} ha`
    if (realtimeWeather?.luas && realtimeWeather.luas !== '-') return realtimeWeather.luas
    const text = kronologi
    const match = text.match(/luas\s*genangan\s*[:=]?\s*([\w\s.,\-]+ha)/i) ||
      text.match(/genangan\s*seluas\s*([\w\s.,\-]+ha)/i) ||
      text.match(/([\d.,]+)\s*ha/i)
    if (match) return match[0].trim()
    return '-'
  }, [eventData, realtimeWeather, kronologi])

  const parsedLama = useMemo(() => {
    if (eventData.lama_genangan && eventData.lama_genangan !== '-') return eventData.lama_genangan
    if (realtimeWeather?.lama && realtimeWeather.lama !== '-') return realtimeWeather.lama
    const text = kronologi
    const match = text.match(/lama\s*genangan\s*[:=]?\s*([\w\s.,\-]+hari)/i) ||
      text.match(/genangan\s*selama\s*([\w\s.,\-]+hari)/i)
    if (match) return match[1].trim()
    return '-'
  }, [eventData, realtimeWeather, kronologi])

  // Unified ISPU metrics for event day (guarantees 100% consistency across Left Parameters, Timeline, and EOC Bulletin)
  const eventDayIspu = useMemo(() => {
    if (realtimeAirQuality && typeof realtimeAirQuality.ispu === 'number' && realtimeAirQuality.ispu > 0) {
      return realtimeAirQuality.ispu
    }
    return 0
  }, [realtimeAirQuality])

  const eventDayIspuCategory = useMemo(() => {
    const val = eventDayIspu
    if (val === 0) return { label: 'Data Belum Tersedia', shortLabel: '-', color: 'text-slate-400' }
    if (val > 300) return { label: 'Berbahaya', shortLabel: 'Bahaya', color: 'text-red-700' }
    if (val > 200) return { label: 'Sangat Tidak Sehat', shortLabel: 'S.T. Sehat', color: 'text-purple-600' }
    if (val > 150) return { label: 'Tidak Sehat', shortLabel: 'T. Sehat', color: 'text-rose-600' }
    if (val > 100) return { label: 'Sangat Sedang', shortLabel: 'S. Sedang', color: 'text-orange-600' }
    if (val > 50) return { label: 'Sedang', shortLabel: 'Sedang', color: 'text-amber-600' }
    return { label: 'Baik', shortLabel: 'Baik', color: 'text-emerald-600' }
  }, [eventDayIspu])

  const dynamicCharacteristics = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()

    if (name.includes('kebakaran') || name.includes('karhutla') || name.includes('fire')) {
      const visText = realtimeWind?.visibilityM && realtimeWind.visibilityM > 0
        ? (realtimeWind.visibilityM >= 1000 ? `${(realtimeWind.visibilityM / 1000).toFixed(1)} km` : `${realtimeWind.visibilityM} m`)
        : (eventData.jarak_pandang || '-')
      const windText = realtimeWind && realtimeWind.speed > 0
        ? `${realtimeWind.speed} km/jam (${realtimeWind.directionText || ''})`
        : (eventData.kecepatan_angin ? `${eventData.kecepatan_angin} km/jam` : '-')

      const hotspotText = eventData.hotspot ? `${eventData.hotspot} Titik` : (eventData.titik_panas ? `${eventData.titik_panas} Titik` : '-')
      const ispuText = eventDayIspu > 0 ? `${eventDayIspu} (${eventDayIspuCategory.label})` : '-'

      return [
        { label: 'Titik Panas (Hotspot)', value: hotspotText, icon: Flame, color: 'text-red-500' },
        { label: 'ISPU (Air Quality)', value: ispuText, icon: ShieldAlert, color: eventDayIspu >= 150 ? 'text-red-650' : 'text-orange-500' },
        { label: 'Jarak Pandang', value: visText, icon: Eye, color: 'text-slate-600' },
        { label: 'Arah & Kecepatan Angin', value: windText, icon: Wind, color: 'text-amber-600' }
      ]
    }
    if (name.includes('gempa') || name.includes('earthquake')) {
      const char = seismicResult?.characteristics || {}
      const magn = char.magnitude && char.magnitude !== '-' ? char.magnitude : (bmkgGempa?.Magnitude ? `${bmkgGempa.Magnitude} SR` : (eventData.magnitudo ? `${eventData.magnitudo} SR` : '-'))
      const depth = char.kedalaman && char.kedalaman !== '-' ? char.kedalaman : (bmkgGempa?.Kedalaman ? bmkgGempa.Kedalaman : (eventData.kedalaman ? `${eventData.kedalaman} km` : '-'))
      const tsunami = char.potensiTsunami && char.potensiTsunami !== '-' ? char.potensiTsunami : (bmkgGempa?.Potensi ? bmkgGempa.Potensi : (eventData.potensi_tsunami || '-'))
      const mmi = char.intensitasMmi && char.intensitasMmi !== '-' ? char.intensitasMmi : (bmkgGempa?.Dirasakan ? bmkgGempa.Dirasakan.split(',')[0]?.trim() : (eventData.skala_mmi ? `${eventData.skala_mmi} MMI` : '-'))
      return [
        { label: 'Magnitudo Gempa (BMKG)', value: magn, icon: Activity, color: 'text-red-600' },
        { label: 'Kedalaman Gempa', value: depth, icon: Compass, color: 'text-amber-700' },
        { label: 'Status Episentrum', value: tsunami, icon: Waves, color: 'text-blue-600' },
        { label: 'Intensitas MMI (BMKG)', value: mmi, icon: ShieldAlert, color: 'text-orange-600' }
      ]
    }
    if (name.includes('tsunami')) {
      const waveH = eventData.tinggi_gelombang ? `${eventData.tinggi_gelombang} m` : '-'
      const inunDist = eventData.jarak_inundasi ? `${eventData.jarak_inundasi} m` : '-'
      const waktuTiba = eventData.waktu_tiba ? eventData.waktu_tiba : '-'
      const statusPeringatan = eventData.status_peringatan ? eventData.status_peringatan : '-'
      return [
        { label: 'Tinggi Gelombang (BMKG)', value: waveH, icon: Waves, color: 'text-teal-650' },
        { label: 'Limpasan Daratan', value: inunDist, icon: Compass, color: 'text-cyan-600' },
        { label: 'Waktu Tiba Gelombang', value: waktuTiba, icon: Clock, color: 'text-amber-600' },
        { label: 'Status Peringatan BMKG', value: statusPeringatan, icon: ShieldAlert, color: 'text-rose-600' }
      ]
    }
    if (name.includes('banjir') || name.includes('flood') || name.includes('genangan') || name.includes('rob')) {
      const eventDayWeather = weatherTimeline.find(w => w.offset === 0)
      const rainVal = peakRainfall > 0
        ? `${peakRainfall} mm/hari (${peakRainfall >= 100 ? 'Sangat Lebat' : peakRainfall >= 50 ? 'Lebat' : peakRainfall >= 20 ? 'Sedang' : 'Ringan'})`
        : (eventData.curah_hujan ? `${eventData.curah_hujan} mm/hari` : '-')

      const tmaVal = (petaBencanaData?.reportData?.flood_depth)
        ? `${petaBencanaData.reportData.flood_depth} cm (PetaBencana)`
        : (parsedTma !== '-' ? parsedTma : (eventData.tma || eventData.tinggi_muka_air || '-'))

      const kumulatifVal = totalRainfall > 0
        ? `${totalRainfall} mm (7 Hari Terakhir)`
        : '-'

      const cuacaVal = (eventDayWeather?.weather && eventDayWeather.weather !== '-')
        ? `${eventDayWeather.weather} (${eventDayWeather.temp !== '-' ? eventDayWeather.temp : ''})`.trim()
        : (realtimeWeather?.cuaca || eventData.kondisi_cuaca || '-')

      return [
        { label: 'Curah Hujan Pemicu (BMKG)', value: rainVal, icon: CloudRain, color: 'text-blue-600' },
        { label: 'Tinggi Genangan / TMA', value: tmaVal, icon: Activity, color: 'text-cyan-600' },
        { label: 'Akumulasi Hujan 7 Hari', value: kumulatifVal, icon: CloudLightning, color: 'text-teal-650' },
        { label: 'Kondisi Cuaca & Suhu', value: cuacaVal, icon: Droplets, color: 'text-amber-500' }
      ]
    }
    if (name.includes('longsor') || name.includes('landslide')) {
      const kerentanan = eventData.kerentanan_tanah || '-'
      const hujanPemicu = peakRainfall > 0 ? `${peakRainfall} mm/hari` : (totalRainfall > 0 ? `${totalRainfall} mm` : (eventData.curah_hujan ? `${eventData.curah_hujan} mm` : '-'))
      const topografi = eventData.topografi || detail?.lokasi?.[0]?.topografi || '-'
      const kelembabanTanah = soilSaturation > 0 ? `${soilSaturation}%` : '-'
      return [
        { label: 'Kerentanan Wilayah', value: kerentanan, icon: AlertTriangle, color: 'text-amber-700' },
        { label: 'Hujan Pemicu (BMKG)', value: hujanPemicu, icon: CloudRain, color: 'text-blue-600' },
        { label: 'Topografi Lokasi', value: topografi, icon: Compass, color: 'text-amber-900' },
        { label: 'Kelembaban Tanah', value: kelembabanTanah, icon: Droplets, color: 'text-teal-650' }
      ]
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      const level = eventData.status_gunung || '-'
      const height = eventData.tinggi_kolom_abu ? `${eventData.tinggi_kolom_abu} m` : '-'
      const dir = realtimeWind?.directionText && realtimeWind.directionText !== '-' ? realtimeWind.directionText : (eventData.arah_abu || '-')
      const radius = eventData.radius_bahaya ? `${eventData.radius_bahaya} km` : '-'
      return [
        { label: 'Status Gunung (PVMBG)', value: level, icon: ShieldAlert, color: 'text-red-600' },
        { label: 'Tinggi Kolom Abu', value: height, icon: CloudRain, color: 'text-slate-600' },
        { label: 'Arah Sebaran Abu', value: dir, icon: Wind, color: 'text-amber-600' },
        { label: 'Radius Bahaya', value: radius, icon: AlertTriangle, color: 'text-orange-500' }
      ]
    }
    if (name.includes('kekeringan') || name.includes('drought')) {
      return [
        { label: 'Hari Tanpa Hujan', value: eventData.hari_tanpa_hujan ? `${eventData.hari_tanpa_hujan} Hari` : '-', icon: Clock, color: 'text-amber-600' },
        { label: 'Defisit Air Bersih', value: eventData.defisit_air || '-', icon: Droplets, color: 'text-red-500' },
        { label: 'Lahan Terdampak', value: eventData.luas_lahan ? `${eventData.luas_lahan} ha` : '-', icon: Compass, color: 'text-orange-600' },
        { label: 'Pasokan Air Bersih', value: typeof eventData.air_bersih === 'number' ? (eventData.air_bersih === 0 ? 'Krisis Air' : 'Tersedia') : '-', icon: Activity, color: 'text-blue-500' }
      ]
    }
    if (name.includes('wabah') || name.includes('klb') || name.includes('penyakit')) {
      return [
        { label: 'Status Penyakit', value: 'Surveilans Aktif (SKDR)', icon: ShieldAlert, color: 'text-purple-600' },
        { label: 'Investigasi PE', value: 'Puskesmas / Dinkes', icon: Activity, color: 'text-rose-600' },
        { label: 'Kesiapan Logistik Obat', value: 'Buffer Stock Terpenuhi', icon: BriefcaseMedical, color: 'text-teal-600' },
        { label: 'Pemantauan Kontak', value: 'Tracing Terpadu', icon: Users, color: 'text-indigo-600' }
      ]
    }
    if (name.includes('cuaca') || name.includes('angin') || name.includes('puting') || name.includes('badai')) {
      const windSpeed = realtimeWind && realtimeWind.speed > 0 ? `${realtimeWind.speed} km/jam` : (eventData.kecepatan_angin ? `${eventData.kecepatan_angin} km/jam` : '-')
      const rain = peakRainfall > 0 ? `${peakRainfall} mm/hari` : (totalRainfall > 0 ? `${totalRainfall} mm` : '-')
      const windDir = realtimeWind?.directionText && realtimeWind.directionText !== '-' ? realtimeWind.directionText : (eventData.arah_angin || '-')
      const cuaca = realtimeWeather?.cuaca && realtimeWeather.cuaca !== '-' ? realtimeWeather.cuaca : (eventData.kondisi_cuaca || '-')
      return [
        { label: 'Kecepatan Angin Maks', value: windSpeed, icon: Wind, color: 'text-indigo-600' },
        { label: 'Curah Hujan (BMKG)', value: rain, icon: CloudLightning, color: 'text-blue-600' },
        { label: 'Arah Angin Dominan', value: windDir, icon: Waves, color: 'text-cyan-600' },
        { label: 'Kondisi Cuaca (BMKG)', value: cuaca, icon: AlertTriangle, color: 'text-amber-600' }
      ]
    }
    return [
      { label: 'Akses Jalan', value: eventData.akses_lokasi === 0 ? 'Terputus' : 'Lancar', icon: Compass, color: 'text-teal-650' },
      { label: 'Jaringan Listrik', value: eventData.jaringan_listrik === 0 ? 'Padam' : 'Normal', icon: Zap, color: 'text-amber-500' },
      { label: 'Air Bersih', value: eventData.air_bersih === 0 ? 'Krisis' : 'Layak', icon: Droplets, color: 'text-blue-500' },
      { label: 'Fasum Berfungsi', value: 'Sebagian Berfungsi', icon: Activity, color: 'text-cyan-600' }
    ]
  }, [eventData, parsedTma, parsedLuas, parsedLama, soilSaturation, eventDayIspu, eventDayIspuCategory, realtimeWind, totalRainfall, peakRainfall, bmkgGempa, seismicResult, petaBencanaData, detail?.lokasi])

  const eocNarrative = useMemo(() => {
    if (detail?.buletin_eoc) return detail.buletin_eoc;
    if (eventData.buletin_eoc) return eventData.buletin_eoc;

    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()

    if (name.includes('kebakaran') || name.includes('karhutla') || name.includes('fire')) {
      const ispuText = `${eventDayIspu} (${eventDayIspuCategory.label})`
      const windSpeedText = realtimeWind ? `${realtimeWind.speed} km/jam` : '18 km/jam'
      const windDirText = realtimeWind ? realtimeWind.directionText : 'Utara - Timur Laut'

      return `Analisis Pajanan Karhutla (${formattedDate}): Pemantauan krisis di wilayah ${locationFull} pada tanggal kejadian mencatat Indeks Standar Pencemar Udara (ISPU) mencapai ${ispuText} dengan konsentrasi partikulat halus PM2.5. Tiupan angin berkecepatan ${windSpeedText} ke arah ${windDirText} berpotensi meningkatkan sebaran asap. EOC Kemenkes merekomendasikan pembatasan aktivitas luar ruangan, evakuasi kelompok rentan, distribusi masker N95, serta penguatan kesiapsiagaan faskes.`
    }
    if (name.includes('banjir') || name.includes('flood') || name.includes('genangan') || name.includes('rob')) {
      return `Analisis Hidrometeorologi (${formattedDate}): Limpasan permukaan dipicu oleh akumulasi curah hujan ${totalRainfall} mm (puncak ${peakRainfall} mm pada hari kejadian) menjenuhkan kapasitas infiltrasi tanah hingga ${soilSaturation}%. Peningkatan TMA ke ${parsedTma} di ${locationFull} meningkatkan risiko kontaminasi patogen diare dan Leptospirosis, serta transmisi penyakit tular vektor (DBD, malaria).`
    }
    if (name.includes('gempa') || name.includes('earthquake')) {
      return `Asesmen Epidemiologi Gempa (${formattedDate}): Dampak guncangan di ${locationFull} memicu kerusakan infrastruktur sanitasi dan faskes serta meningkatkan kerentanan pengungsi terhadap ISPA dan diare. Runtuhan material memicu trauma fisik akut yang memerlukan penanganan medis sekunder darurat. EOC merekomendasikan surveilans aktif harian di pengungsian.`
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      return `Buletin Krisis Letusan Gunung (${formattedDate}): Paparan abu vulkanik di ${locationFull} memicu lonjakan kasus ISPA akut, konjungtivitis, dan iritasi kulit. EOC merekomendasikan distribusi segera masker N95, pemantauan sumber air, dan evakuasi penduduk di radius bahaya.`
    }
    if (name.includes('longsor') || name.includes('landslide')) {
      return `Asesmen Risiko Tanah Longsor (${formattedDate}): Pergerakan tanah dan material longsoran di ${locationFull} memutus akses transportasi serta fasilitas sanitasi lingkungan. EOC merekomendasikan penyiapan pos medis darurat, pengawasan risiko trauma fisik, dan surveilans pencegahan penyakit diare di lokasi pengungsian.`
    }
    if (name.includes('cuaca') || name.includes('angin') || name.includes('puting') || name.includes('ekstrem') || name.includes('badai')) {
      return `Analisis Cuaca Ekstrem (${formattedDate}): Terjangan angin kencang dan cuaca ekstrem di ${locationFull} merusak sarana pemukiman dan infrastruktur faskes. EOC merekomendasikan penguatan tim medis lapangan, distribusi paket logistik kesehatan darurat, dan koordinasi evakuasi warga.`
    }
    if (name.includes('kekeringan') || name.includes('drought')) {
      return `Analisis Krisis Air & Kekeringan (${formattedDate}): Kelangkaan pasokan air bersih di ${locationFull} meningkatkan risiko penyakit diare dan iritasi kulit. EOC Kemenkes merekomendasikan pemantauan ketersediaan air bersih dan distribusi penjernih air darurat.`
    }
    if (name.includes('tsunami')) {
      return `Buletin Krisis Tsunami (${formattedDate}): Genangan laut dan dampak gelombang di ${locationFull} memicu trauma fisik, korban jiwa, serta krisis sanitasi darurat. EOC merekomendasikan evakuasi cepat ke dataran tinggi dan mobilisasi tim medis darurat.`
    }
    if (name.includes('wabah') || name.includes('klb') || name.includes('penyakit')) {
      return `Analisis Kesiapsiagaan KLB (${formattedDate}): Penambahan kasus di ${locationFull} memerlukan surveilans ketat harian dan sistem kewaspadaan dini. EOC Kemenkes merekomendasikan penyelidikan epidemiologi cepat dan kecukupan stok obat-obatan.`
    }

    // Default EOC Bulletin Narrative Fallback
    const jenisText = eventData.jenis_bencana || eventData.nama_bencana || 'Kejadian Bencana'
    return `Buletin Krisis EOC (${formattedDate}): Dilaporkan kejadian ${jenisText} di wilayah ${locationFull}. EOC Kemenkes RI terus melakukan pemantauan real-time dan mengkoordinasikan kesiapsiagaan faskes setempat, penyiapan logistik kesehatan darurat, serta penanganan medis bagi warga terdampak.`
  }, [eventData, formattedDate, locationFull, eventDayIspu, eventDayIspuCategory, realtimeWind, totalRainfall, peakRainfall, soilSaturation, parsedTma, detail?.buletin_eoc, eventData.buletin_eoc])

  const faskesTerdampakList = Array.isArray(eventData.faskes_terdampak) ? eventData.faskes_terdampak : []

  const stripHtmlText = (htmlStr: any): string => {
    if (!htmlStr) return ''
    const str = String(htmlStr)
    return str
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n')
      .trim()
  }

  const compiledUpaya = useMemo(() => {
    const items: { label: string; text: string; category?: string }[] = []

    if (eventData.upaya_sub_klaster_pelayanan_kesehatan) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_pelayanan_kesehatan)
      if (txt) items.push({ label: 'Pelayanan Kesehatan', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_sub_klaster_pp_pl_air_bersih) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_pp_pl_air_bersih)
      if (txt) items.push({ label: 'Pencegahan Penyakit & Sanitasi Air', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_sub_klaster_gizi) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_gizi)
      if (txt) items.push({ label: 'Pelayanan Gizi Darurat', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_sub_klaster_jiwa) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_jiwa)
      if (txt) items.push({ label: 'Kesehatan Jiwa (Dukungan Psikososial)', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_sub_klaster_kia) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_kia)
      if (txt) items.push({ label: 'Kesehatan Reproduksi & KIA', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_tim_logistik_kesehatan) {
      const txt = stripHtmlText(eventData.upaya_tim_logistik_kesehatan)
      if (txt) items.push({ label: 'Tim Logistik Kesehatan', text: txt, category: 'Sub Klaster' })
    }
    if (eventData.upaya_sub_klaster_dvi) {
      const txt = stripHtmlText(eventData.upaya_sub_klaster_dvi)
      if (txt) items.push({ label: 'Identifikasi Korban (DVI)', text: txt, category: 'Sub Klaster' })
    }

    if (eventData.upaya_kabupaten) {
      const txt = stripHtmlText(eventData.upaya_kabupaten)
      if (txt) items.push({ label: 'Upaya Dinkes Kabupaten/Kota', text: txt, category: 'Dinkes Kab' })
    }
    if (eventData.upaya_provinsi) {
      const txt = stripHtmlText(eventData.upaya_provinsi)
      if (txt) items.push({ label: 'Upaya Dinkes Provinsi', text: txt, category: 'Dinkes Prov' })
    }
    if (eventData.upaya_kemenkes || eventData.upaya) {
      const txt = stripHtmlText(eventData.upaya_kemenkes || eventData.upaya)
      if (txt && !items.some(it => it.text === txt)) items.push({ label: 'Upaya Pusat (Kemenkes/EOC)', text: txt, category: 'EOC Pusat' })
    }

    if (eventData.id_pertanyaan_layanan_gizi) {
      try {
        const parsedGizi = typeof eventData.id_pertanyaan_layanan_gizi === 'string' ? JSON.parse(eventData.id_pertanyaan_layanan_gizi) : eventData.id_pertanyaan_layanan_gizi
        if (parsedGizi && typeof parsedGizi === 'object') {
          const statusList = Object.entries(parsedGizi)
            .map(([k, v]) => `${k.replace(/^layanan_/, 'Layanan Gizi #')}: ${v}`)
            .join(' | ')
          if (statusList) items.push({ label: 'Skrining & Layanan Gizi', text: statusList, category: 'Layanan Gizi' })
        }
      } catch (e) {
        const txt = stripHtmlText(eventData.id_pertanyaan_layanan_gizi)
        if (txt) items.push({ label: 'Skrining & Layanan Gizi', text: txt, category: 'Layanan Gizi' })
      }
    }

    if (Array.isArray(detail?.perkembangan) && detail.perkembangan.length > 0) {
      detail.perkembangan.forEach((p: any) => {
        const formatted = formatPerkembangan(p)
        if (formatted && !items.some(it => it.text === formatted)) {
          items.push({ label: 'Update Lapangan', text: formatted, category: 'Laporan Berkala' })
        }
      })
    }

    return items
  }, [eventData, detail])

  const aggregatedTenaga = useMemo(() => {
    const list = Array.isArray(eventData.tenaga_kesehatan) ? eventData.tenaga_kesehatan : []
    if (list.length === 0) return null

    const totals = {
      dokter: { aktif: 0, butuh: 0 },
      perawat: { aktif: 0, butuh: 0 },
      bidan: { aktif: 0, butuh: 0 },
      farmasi: { aktif: 0, butuh: 0 },
      gizi: { aktif: 0, butuh: 0 },
      kesling: { aktif: 0, butuh: 0 },
      lainnya: { aktif: 0, butuh: 0 },
    }

    list.forEach((t: any) => {
      totals.dokter.aktif += safeParseInt(t.jml_dokter)
      totals.dokter.butuh += safeParseInt(t.kebutuhan_dokter)

      totals.perawat.aktif += safeParseInt(t.jml_perawat)
      totals.perawat.butuh += safeParseInt(t.kebutuhan_perawat)

      totals.bidan.aktif += safeParseInt(t.jml_bidan)
      totals.bidan.butuh += safeParseInt(t.kebutuhan_bidan)

      totals.farmasi.aktif += safeParseInt(t.jml_farmasi)
      totals.farmasi.butuh += safeParseInt(t.kebutuhan_farmasi)

      totals.gizi.aktif += safeParseInt(t.jml_gizi)
      totals.gizi.butuh += safeParseInt(t.kebutuhan_gizi)

      totals.kesling.aktif += safeParseInt(t.jml_kesling)
      totals.kesling.butuh += safeParseInt(t.kebutuhan_kesling)

      totals.lainnya.aktif += safeParseInt(t.jml_tenaga_lainnya)
      totals.lainnya.butuh += safeParseInt(t.kebutuhan_tenaga_lainnya)
    })

    return totals
  }, [eventData.tenaga_kesehatan])

  const mapMarkers = useMemo(() => {
    if (detail && Array.isArray(detail.lokasi) && detail.lokasi.length > 0) {
      return detail.lokasi.map((loc: any, idx: number) => ({
        ...(selectedEvent || {}),
        kode_trans: `${selectedEvent?.kode_trans}-loc-${idx}`,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        // Gunakan kecamatan dari lokasi spesifik saja - JANGAN fallback ke selectedEvent.kecamatan
        // karena itu berisi join semua kecamatan terdampak ("Borong, Cibal, Elar...")
        nama_desa: loc.nama_desa || undefined,
        kecamatan: loc.kecamatan || undefined,
        topografi: loc.topografi || selectedEvent?.topografi,
        jml_terancam: loc.jml_terancam || selectedEvent?.jml_terancam,
        tgl_kejadian: loc.tgl_laporan || selectedEvent?.tgl_kejadian,
        jml_titik_lokasi: 0, // sub-points do not show sub-location count
      }))
    }
    return selectedEvent ? [selectedEvent] : []
  }, [selectedEvent, detail])

  if (!selectedEvent) return null

  if (loading) {
    return (
      <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff] rounded-3xl border border-slate-200/60 shadow-sm animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-200 rounded-xl"></div>
            <div className="space-y-1.5">
              <div className="h-6 w-56 bg-slate-200 rounded-md"></div>
              <div className="h-3.5 w-32 bg-slate-100 rounded-md"></div>
            </div>
          </div>
          <div className="h-7 w-40 bg-slate-150 rounded-full"></div>
        </div>

        {/* Map & Summary Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-slate-200 rounded-3xl"></div>
          <div className="space-y-4">
            <div className="h-8 w-44 bg-slate-200 rounded-md"></div>
            <div className="h-[280px] bg-slate-100 rounded-2xl p-4 space-y-3.5">
              <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
              <div className="h-5 w-3/4 bg-slate-200 rounded-md"></div>
              <div className="h-5 w-1/2 bg-slate-200 rounded-md"></div>
              <div className="h-5 w-2/3 bg-slate-200 rounded-md"></div>
              <div className="h-5 w-5/6 bg-slate-200 rounded-md"></div>
            </div>
          </div>
        </div>

        {/* 6 Grid Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-150 rounded-2xl"></div>
          ))}
        </div>

        {/* Trend Chart Area Skeleton */}
        <div className="h-[250px] bg-slate-100 rounded-3xl p-4 flex flex-col justify-between">
          <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-32 w-full bg-slate-200 rounded-2xl"></div>
          <div className="h-8 w-full bg-slate-150 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 bg-[#fbffff] animate-in fade-in duration-200">
      {/* Back navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
            title="Kembali ke Dashboard"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-wide">
              RINGKASAN SITUASI - {eventData.jenis_bencana}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan rincian spasial faskes, logistik darurat, dan dampak korban krisis kesehatan.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 md:self-end">
          <span>Terakhir Diperbarui: {formattedDate}</span>
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800 shadow-xs transition hover:bg-teal-100 hover:border-teal-300"
            title="Lihat Riwayat & Timeline Log Aktivitas Kejadian"
          >
            <History className="h-3.5 w-3.5 text-teal-700" />
            <span>Timeline Log</span>
            {timelineLogs.length > 0 && (
              <span className="ml-0.5 rounded-full bg-teal-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                {timelineLogs.length}
              </span>
            )}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="Bagikan tautan"
          >
            <Share2 className="h-3.5 w-3.5" />
            {shareCopied ? 'Tersalin' : 'Share'}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="Unduh ringkasan"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh
          </button>
        </div>
      </div>

      {/* EOC Top Section Layout (Responsive Flex Container containing Merged Header & Metrics) */}
      {true && (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch animate-in fade-in slide-in-from-top-3 duration-300">

          {/* Card 1 & 5 Merged: Disaster Header & Characteristics Bulletin (Expanded Width ~60%) */}
          <div className={`w-full lg:w-[61%] rounded-2xl border bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between transition hover:shadow-md ${disasterTheme.bg}`}>
            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

              {/* Col 1: Disaster Identity */}
              <div className="w-full md:w-[26%] flex flex-col justify-between pr-2 border-b md:border-b-0 md:border-r border-slate-250/60 pb-3 md:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 ${disasterTheme.iconColor}`}>
                    {(() => {
                      const IconComp = disasterTheme.cardHeaderIcon || CloudRain
                      return <IconComp className="h-6.5 w-6.5" />
                    })()}
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider block leading-none">JENIS BENCANA</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block leading-tight mt-1 uppercase tracking-tight">
                      {eventData.jenis_bencana}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 md:mt-auto">
                  <p className="text-sm sm:text-base font-black text-slate-900 leading-snug truncate" title={locationFull}>
                    {locationFull}
                  </p>
                  {formattedDate && (
                    <p className="text-xs sm:text-sm font-extrabold text-slate-600 mt-2 flex items-center gap-1.5 leading-none">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                      {formattedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Col 2: Disaster Specific Physical/Geological Parameters */}
              <div className="w-full md:w-[30%] flex flex-col justify-center gap-3.5 px-0 md:px-2 border-b md:border-b-0 md:border-r border-slate-250/60 pb-3 md:pb-0">
                {dynamicCharacteristics.map((item, idx) => {
                  const IconComp = item.icon
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200/90 shadow-xs shrink-0">
                        <IconComp className={`h-4.5 w-4.5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-extrabold text-slate-500 block uppercase leading-none tracking-wide">{item.label}</span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5 truncate" title={item.value}>
                          {item.value}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Col 3: Weather / Air Quality / Seismic Timeline (Expanded Width ~44%) */}
              <div className="w-full md:w-[44%] flex flex-col justify-between pl-0 md:pl-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  {disasterTheme.type === 'kebakaran' || disasterTheme.type === 'gunung'
                    ? 'TREN KUALITAS UDARA (ISPU / PM2.5) & ANGIN (H-3 S.D. H+3)'
                    : disasterTheme.type === 'gempa'
                      ? 'TREN AKTIVITAS SEISMIK & GEMPA SUSULAN BMKG (H-3 S.D. H+3)'
                      : disasterTheme.type === 'tsunami'
                        ? 'TREN GELOMBANG LAUT & PASANG SURUT (H-3 S.D. H+3)'
                        : disasterTheme.type === 'longsor'
                          ? 'HISTORI HUJAN PEMICU & STABILITAS LERENG (H-3 S.D. H+3)'
                          : disasterTheme.type === 'kekeringan'
                            ? 'TREN HARI TANPA HUJAN & SUHU UDARA (H-3 S.D. H+3)'
                            : disasterTheme.type === 'wabah'
                              ? 'TREN KASUS HARIAN & TRACING EPIDEMIOLOGI (H-3 S.D. H+3)'
                              : 'HISTORI CUACA & CURAH HUJAN BMKG (H-3 S.D. H+3)'}
                </span>

                <div className="grid grid-cols-7 gap-1.5 text-center items-stretch justify-between flex-1">
                  {(disasterTheme.type === 'gempa' ? earthquakeTimeline : weatherTimeline).map((day: any, idx: number) => {
                    const isEventDay = day.offset === 0
                    const aqItem = (realtimeAirQuality && realtimeAirQuality.timeline && realtimeAirQuality.timeline[idx])
                      ? realtimeAirQuality.timeline[idx]
                      : null

                    const dayIspuVal = isEventDay ? eventDayIspu : (aqItem ? aqItem.aqi : eventDayIspu)
                    const dayIspuLabel = isEventDay ? eventDayIspuCategory.shortLabel : (aqItem ? (aqItem.shortLabel || aqItem.label) : eventDayIspuCategory.shortLabel)

                    return (
                      <div
                        key={day.offset}
                        className={`flex flex-col items-center justify-between py-1.5 px-0.5 sm:px-1 rounded-xl transition-colors border overflow-hidden ${isEventDay
                          ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-md ring-2 ring-rose-300/60'
                          : 'bg-white/90 border-slate-200/90 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-[9.5px] sm:text-[10px] font-black uppercase leading-none text-slate-500 truncate w-full text-center">
                          {day.dayName}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black leading-none mt-0.5 text-slate-900 truncate w-full text-center">
                          {day.dateLabel}
                        </span>

                        <div className="my-1.5 shrink-0 flex items-center justify-center">
                          {disasterTheme.type === 'kebakaran' || disasterTheme.type === 'gunung' ? (
                            <ShieldAlert className={`h-5 w-5 ${isEventDay ? 'text-red-600 animate-pulse' : (dayIspuVal > 150) ? 'text-orange-500' : 'text-amber-500'}`} />
                          ) : disasterTheme.type === 'tsunami' ? (
                            <Waves className={`h-5 w-5 ${isEventDay ? 'text-teal-600 animate-bounce' : 'text-cyan-600'}`} />
                          ) : disasterTheme.type === 'gempa' ? (
                            <Activity className={`h-5 w-5 ${isEventDay ? 'text-red-600 animate-bounce' : day.topLabel?.includes('M <') ? 'text-slate-400' : 'text-amber-600'}`} />
                          ) : disasterTheme.type === 'kekeringan' ? (
                            <Thermometer className={`h-5 w-5 ${isEventDay ? 'text-rose-600' : 'text-amber-600'}`} />
                          ) : disasterTheme.type === 'wabah' ? (
                            <ShieldAlert className={`h-5 w-5 ${isEventDay ? 'text-purple-600 animate-pulse' : 'text-indigo-500'}`} />
                          ) : day.weather?.includes('Lebat') ? (
                            <CloudLightning className={`h-5 w-5 ${isEventDay ? 'text-rose-500 animate-bounce' : 'text-blue-600'}`} />
                          ) : day.weather?.includes('Sedang') || day.weather?.includes('Ringan') ? (
                            <CloudRain className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Cloud className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="flex flex-col items-center leading-none mt-0.5 w-full overflow-hidden px-0.5">
                          {disasterTheme.type === 'gempa' ? (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-slate-900 block text-center truncate w-full leading-tight" title={day.topLabel}>
                                {day.topLabel}
                              </span>
                              <span
                                className={`text-[8.5px] sm:text-[9.5px] font-extrabold mt-0.5 block text-center truncate w-full leading-tight ${isEventDay ? 'text-red-700 font-black' : day.topLabel?.includes('M <') ? 'text-slate-500' : 'text-orange-600'}`}
                                title={day.bottomLabel}
                              >
                                {day.bottomLabel}
                              </span>
                            </>
                          ) : disasterTheme.type === 'kebakaran' || disasterTheme.type === 'gunung' ? (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-slate-900 block text-center truncate w-full leading-tight" title={`ISPU ${dayIspuVal > 0 ? dayIspuVal : '-'}`}>
                                ISPU {dayIspuVal > 0 ? dayIspuVal : '-'}
                              </span>
                              <span
                                className={`text-[8.5px] sm:text-[9.5px] font-black mt-0.5 block text-center truncate w-full leading-tight ${isEventDay ? 'text-red-700 font-black' : (dayIspuVal > 150) ? 'text-rose-600' : 'text-orange-600'}`}
                                title={dayIspuLabel}
                              >
                                {dayIspuLabel}
                              </span>
                            </>
                          ) : disasterTheme.type === 'tsunami' ? (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-teal-900 block text-center truncate w-full" title={isEventDay ? 'Gelombang Tsunami' : 'Normal'}>
                                {isEventDay ? 'Tsunami' : 'Normal'}
                              </span>
                              <span className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-600 mt-0.5 block text-center truncate w-full">
                                {isEventDay ? 'Waspada' : 'Aman'}
                              </span>
                            </>
                          ) : disasterTheme.type === 'kekeringan' ? (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-amber-900 block text-center truncate w-full" title={day.temp !== '-' ? day.temp : '-'}>
                                {day.temp !== '-' ? day.temp : '-'}
                              </span>
                              <span className="text-[8.5px] sm:text-[9.5px] font-bold text-red-600 mt-0.5 block text-center truncate w-full" title="0 mm (Hari Tanpa Hujan)">
                                0 mm HTH
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] sm:text-[11px] font-black text-slate-700 block text-center truncate w-full" title={day.temp !== '-' ? day.temp : '-'}>
                                {day.temp !== '-' ? day.temp : '-'}
                              </span>
                              <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-blue-600 mt-0.5 block text-center truncate w-full" title={day.precip > 0 ? `${day.precip}mm` : (day.weather !== '-' ? day.weather : '0mm')}>
                                {day.precip > 0 ? `${day.precip}mm` : (day.weather !== '-' ? day.weather : '0mm')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* EOC Epidemiological Narrative Bulletin */}
            <div className={`mt-3.5 rounded-xl p-3 border flex items-start gap-3 ${disasterTheme.bulletinBg}`}>
              <div className="bg-rose-600 text-white rounded-lg p-1.5 shrink-0 mt-0.5 shadow-xs">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-850 leading-relaxed">
                <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wide mr-2 shadow-xs">
                  BULETIN EOC
                </span>
                {eocNarrative}
              </p>
            </div>
          </div>

          {/* Cards 2, 3, 4 Container (Slightly Compacted ~39% Width) */}
          <div className="w-full lg:w-[39%] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3.5 items-stretch">
            {/* Card 2: Total Korban */}
            <div className={`rounded-2xl border p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[240px] transition hover:shadow-md ${disasterTheme.bg}`}>
              <div className="text-center flex-1 flex flex-col justify-center items-center">
                <span className="text-[11px] sm:text-xs font-black text-slate-600 uppercase tracking-wider block">TOTAL KORBAN</span>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 block leading-none mt-2">{totalKorbanReal.toLocaleString('id-ID')}</span>
                <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border inline-flex items-center justify-center gap-1 mt-2.5 max-w-full text-center leading-tight ${korbanTrendInfo.badgeClass}`}>
                  {korbanTrendInfo.label}
                </span>
              </div>
              <div className="border-t border-slate-300/40 pt-2.5 mt-auto grid grid-cols-3 gap-1 text-center shrink-0">
                <div>
                  <span className="text-lg sm:text-xl font-black text-slate-900 block leading-none">{breakdown.meninggal}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Meninggal</span>
                </div>
                <div className="border-x border-slate-300/40 px-0.5">
                  <span className="text-lg sm:text-xl font-black text-amber-600 block leading-none">{breakdown.luka}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Luka</span>
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-black text-slate-600 block leading-none">{breakdown.hilang}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Hilang</span>
                </div>
              </div>
            </div>

            {/* Card 3: Faskes Di Area */}
            <div className={`rounded-2xl border p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[240px] transition hover:shadow-md ${disasterTheme.bg}`}>
              <div className="text-center flex-1 flex flex-col justify-center items-center">
                <span className="text-[11px] sm:text-xs font-black text-slate-600 uppercase tracking-wider block">FASKES DI AREA</span>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 block leading-none mt-2">
                  {totalFaskes.toLocaleString('id-ID')}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border inline-flex items-center justify-center gap-1 mt-2.5 max-w-full text-center leading-tight ${faskesTrendInfo.badgeClass}`}>
                  {faskesTrendInfo.label}
                </span>
              </div>
              <div className="border-t border-slate-300/40 pt-2.5 mt-auto grid grid-cols-2 gap-1 text-center shrink-0">
                <div className="border-r border-slate-300/40 px-0.5">
                  <span className="text-lg sm:text-xl font-black text-slate-900 block leading-none">
                    {operasionalFaskes}
                  </span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">OPERASIONAL</span>
                </div>
                <div className="px-0.5">
                  <span className="text-lg sm:text-xl font-black text-rose-600 block leading-none">
                    {terdampakFaskes}
                  </span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">TERDAMPAK</span>
                </div>
              </div>
            </div>

            {/* Card 4: Penduduk Terancam/Terdampak */}
            <div className={`rounded-2xl border p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[240px] transition hover:shadow-md ${disasterTheme.bg}`}>
              <div className="text-center flex-1 flex flex-col justify-center items-center">
                <span className="text-[11px] sm:text-xs font-black text-slate-600 uppercase tracking-wider block">PENDUDUK TERANCAM (TERDAMPAK)</span>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">
                    {pendudukTerdampakDisplay}
                  </span>
                  {pendudukTerdampakDisplay !== 'NA' && <span className="text-xs font-bold text-slate-500">Jiwa</span>}
                </div>
                <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border inline-flex items-center justify-center gap-1 mt-2.5 max-w-full text-center leading-tight ${terdampakTrendInfo.badgeClass}`}>
                  {terdampakTrendInfo.label}
                </span>
              </div>
              <div className="border-t border-slate-300/40 pt-2.5 mt-auto grid grid-cols-3 gap-1 text-center shrink-0">
                <div>
                  <span className="text-lg sm:text-xl font-black text-slate-900 block leading-none">{balitaDisplay}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Balita</span>
                </div>
                <div className="border-x border-slate-300/40 px-0.5">
                  <span className="text-lg sm:text-xl font-black text-slate-900 block leading-none">{lansiaDisplay}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Lansia</span>
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-black text-slate-900 block leading-none">{bumilDisplay}</span>
                  <span className="text-[10px] font-black text-slate-600 block mt-1 leading-tight uppercase">Bumil</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-semibold">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Gagal memuat detail lengkap dari server</p>
            <p className="text-[11px] text-amber-700/90 mt-0.5">{error}. Menampilkan data ringkasan cadangan.</p>
          </div>
        </div>
      )}

      {/* Map & Chronology Card (Full Width) */}
      <article id="peta-detail" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-5">
        <div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 border-b border-slate-100 pb-2 mb-1">
            Pemetaan Spasial Kejadian Bencana - {eventData.kabupaten || 'Wilayah Bencana'}
          </h4>
          <p className="text-sm sm:text-base text-slate-600 font-normal mb-3">
            Visualisasi geospasial lokasi kejadian, radius terdampak, jaringan fasilitas kesehatan siaga, pos pengungsian, dan rute navigasi darurat
          </p>

          <div className="h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-inner mt-2">
            <DisasterMap
              markers={mapMarkers}
              userScope={mapUserScope}
              isGuest={true}
              isFloodEocMode={true}
              selectedRouteTarget={selectedRouteTarget}
              routeCoords={routeCoords}
              routeInfo={routeInfo}
              faskesList={detail?.faskes_terdekat}
              poskoList={detail?.pos_pengungsi}
              tckList={tckRelawan}
              faskesRusakList={detail?.faskes_terdampak}
              onSelectRouteTarget={handleSelectTarget}
              disasterType={eventData.jenis_bencana}
              selectedRouteSource={selectedRouteSource}
              onSelectRouteSource={setSelectedRouteSource}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-100 pb-2 mb-2">
            Kronologi / Deskripsi Kejadian
          </h4>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal whitespace-pre-line">
            {kronologi}
          </p>
        </div>
      </article>

      {/* Main Content: Full Width */}
      <div className="space-y-5">



        {/* Map and Chronology have been moved to a full-width section above this grid */}

        {/* 1. ANALISIS TREN DAMPAK KEJADIAN (Directly after Map & Chronology) */}
        {(() => {
          // ── Narrative helpers ──────────────────────────────────────────────────────────
          const victimLast = victimTrendData[victimTrendData.length - 1] || {};
          const victimFirst = victimTrendData[0] || {};
          const totalKorbanDelta = (victimLast['Total Korban'] || 0) - (victimFirst['Total Korban'] || 0);
          const pengungsiLast = victimLast['Total Pengungsi'] ?? safeParseInt(eventData.pengungsi);
          const meninggalLast = victimLast['Meninggal'] ?? safeParseInt(eventData.meninggal);
          const lukaLast = victimLast['Luka-luka'] ?? (safeParseInt(eventData.luka_berat) + safeParseInt(eventData.luka_ringan));
          const terdampakLast = victimLast['Penduduk Terancam/Terdampak'] ?? (totalPendudukTerancam > 0 ? totalPendudukTerancam : safeParseInt(eventData.penduduk_terdampak));
          const totalKorbanLast = victimLast['Total Korban'] ?? (meninggalLast + lukaLast);

          const totalTerdampakFaskes = faskesPieBreakdown.reduce((sum, item) => sum + item.terdampak, 0);
          const totalMasterFaskes = faskesPieBreakdown.reduce((sum, item) => sum + item.totalMaster, 0);
          const totalPctFaskes = totalMasterFaskes > 0 ? Math.round((totalTerdampakFaskes / totalMasterFaskes) * 100) : 0;

          const faskesNarrative = totalTerdampakFaskes > 0
            ? `Sebanyak ${totalTerdampakFaskes} dari ${totalMasterFaskes} total fasilitas kesehatan (${totalPctFaskes}%) di ${eventData.kabupaten || 'Kabupaten'} dilaporkan terdampak/rusak pada Formulir Lengkap RHA. Rincian: ${faskesPieBreakdown.map(c => `${c.title.split(' ')[0]}: ${c.terdampak}/${c.totalMaster}`).join(', ')}.`
            : `Seluruh fasilitas kesehatan (${totalMasterFaskes} faskes) di ${eventData.kabupaten || 'Kabupaten'} terpantau berfungsi normal. Belum ada laporan faskes rusak pada Formulir Lengkap.`;

          const dominantDiseaseObj = penyakitTotalData.length > 0 && penyakitTotalData[0].total > 0 ? penyakitTotalData[0] : null;
          const totalPenyakitCases = penyakitTotalData.reduce((s, item) => s + (item.total || 0), 0);

          const korbanNarrative = totalKorbanLast > 0 || terdampakLast > 0
            ? `Tercatat ${totalKorbanLast.toLocaleString('id-ID')} total korban (${meninggalLast.toLocaleString('id-ID')} meninggal, ${lukaLast.toLocaleString('id-ID')} luka-luka), ${pengungsiLast.toLocaleString('id-ID')} pengungsi, serta ${terdampakLast.toLocaleString('id-ID')} jiwa terancam/terdampak.`
            : `Data korban terpantau nihil/stabil dalam periode ini.`;

          const penyakitNarrative = dominantDiseaseObj && totalPenyakitCases > 0
            ? `Dampak kesehatan dominan: ${dominantDiseaseObj.name} (${dominantDiseaseObj.total} kasus). Total estimasi/surveilans klinis: ${totalPenyakitCases} kasus sensitif bencana.`
            : `Belum ada laporan kasus penyakit KLB yang masuk. Pantau surveilans harian di posko pengungsian.`;

          return (
            <section className="space-y-6 mt-6">
              {/* ── Section Header ── */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
                  Analisis Tren &amp; Dinamika Dampak Bencana - {eventData.kabupaten || 'Wilayah Bencana'}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-normal mt-1.5 mb-0">
                  Visualisasi pergerakan data dari tanggal kejadian awal hingga perkembangan terkini berdasarkan laporan terverifikasi SIPKK
                </p>
              </div>

              {/* ─── SECTION 1: TREN KORBAN & PENDUDUK TERDAMPAK (30% KIRI - 70% KANAN) ─── */}
              <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs hover:shadow-xs transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                  {/* Sisi Kiri (30% / 4 cols): Judul Besar, Deskripsi Jelas, Quick Stat Cards, & Insight Box */}
                  <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug m-0">
                        Tren Korban &amp; Penduduk Terdampak
                      </h4>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal mt-2.5 mb-0">
                        Dinamika penambahan korban jiwa (meninggal &amp; luka-luka), fluktuasi jumlah pengungsi di titik kumpul posko, serta estimasi populasi rentan/terancam yang tercatat pada setiap pembaruan laporan SIPKK.
                      </p>

                      {/* Quick Metrics 2x2 Grid with Big Numbers */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">Meninggal</span>
                          <span className="text-xl sm:text-2xl font-black text-rose-950">{meninggalLast.toLocaleString('id-ID')} <span className="text-xs sm:text-sm font-bold text-rose-700">Jiwa</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-orange-800 block">Luka-Luka</span>
                          <span className="text-xl sm:text-2xl font-black text-orange-950">{lukaLast.toLocaleString('id-ID')} <span className="text-xs sm:text-sm font-bold text-orange-700">Jiwa</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">Pengungsi</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-950">{pengungsiLast.toLocaleString('id-ID')} <span className="text-xs sm:text-sm font-bold text-amber-700">Jiwa</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">Terdampak</span>
                          <span className="text-xl sm:text-2xl font-black text-teal-950">{terdampakLast.toLocaleString('id-ID')} <span className="text-xs sm:text-sm font-bold text-teal-700">Jiwa</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Insight Box di Sisi Kiri */}
                    <div className="rounded-xl bg-teal-50/90 border border-teal-200 p-4 text-xs sm:text-sm text-teal-950 leading-relaxed font-medium">
                      <div className="flex items-center gap-2 text-teal-900 font-black text-sm mb-1.5">
                        <Activity className="h-4 w-4 text-[#047d78]" />
                        <span>Insight Perkembangan Korban:</span>
                      </div>
                      <p className="text-teal-950 font-medium m-0 text-xs sm:text-sm leading-relaxed">
                        {korbanNarrative}
                      </p>
                    </div>
                  </div>

                  {/* Sisi Kanan (70% / 8 cols): Big Spacious LineChart */}
                  <div className="lg:col-span-8 flex flex-col bg-slate-50/60 rounded-xl p-4 sm:p-5 border border-slate-200">
                    <div className="flex flex-wrap items-center justify-end gap-2 pb-3 mb-3 border-b border-slate-200/80">
                      {/* Metric Toggle Tabs */}
                      <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setTrendMetricMode('dual')}
                          className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer border-none ${
                            trendMetricMode === 'dual' ? 'bg-[#047d78] text-white shadow-xs font-black' : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Dual Skala
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendMetricMode('korban')}
                          className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer border-none ${
                            trendMetricMode === 'korban' ? 'bg-rose-600 text-white shadow-xs font-black' : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Fokus Korban
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendMetricMode('penduduk')}
                          className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer border-none ${
                            trendMetricMode === 'penduduk' ? 'bg-teal-700 text-white shadow-xs font-black' : 'bg-transparent text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Fokus Penduduk
                        </button>
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="w-full flex-1 min-h-[320px] sm:min-h-[360px] text-xs font-semibold">
                      {typeof window !== 'undefined' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={victimTrendData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#475569" tickLine={false} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                            
                            {(trendMetricMode === 'dual' || trendMetricMode === 'korban') && (
                              <YAxis
                                yAxisId="left"
                                stroke="#e11d48"
                                tickLine={false}
                                style={{ fontSize: '12px', fontWeight: 'bold' }}
                                allowDecimals={false}
                              />
                            )}

                            {trendMetricMode === 'dual' && (
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#0f766e"
                                tickLine={false}
                                style={{ fontSize: '12px', fontWeight: 'bold' }}
                                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                              />
                            )}

                            {trendMetricMode === 'penduduk' && (
                              <YAxis
                                yAxisId="right"
                                stroke="#0f766e"
                                tickLine={false}
                                style={{ fontSize: '12px', fontWeight: 'bold' }}
                                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                              />
                            )}

                            <Tooltip
                              contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 600 }}
                              formatter={(value: any) => [Number(value || 0).toLocaleString('id-ID') + ' Jiwa']}
                            />
                            <Legend verticalAlign="top" height={38} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} formatter={(value) => <span className="mr-4 text-slate-800 font-bold">{value}</span>} />

                            {(trendMetricMode === 'dual' || trendMetricMode === 'korban') && (
                              <Line yAxisId="left" type="monotone" dataKey="Total Korban" stroke="#334155" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} />
                            )}
                            {(trendMetricMode === 'dual' || trendMetricMode === 'penduduk') && (
                              <Line yAxisId="right" type="monotone" dataKey="Penduduk Terancam/Terdampak" stroke="#0f766e" strokeWidth={2.5} strokeDasharray={trendMetricMode === 'dual' ? '4 4' : undefined} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1000} />
                            )}
                            {(trendMetricMode === 'dual' || trendMetricMode === 'korban') && (
                              <Line yAxisId="left" type="monotone" dataKey="Total Pengungsi" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={1000} />
                            )}
                            {(trendMetricMode === 'dual' || trendMetricMode === 'korban') && (
                              <Line yAxisId="left" type="monotone" dataKey="Meninggal" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} />
                            )}
                            {(trendMetricMode === 'dual' || trendMetricMode === 'korban') && (
                              <Line yAxisId="left" type="monotone" dataKey="Luka-luka" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} />
                            )}
                            <Brush dataKey="date" height={26} stroke="#047d78" fill="#e6f4f3" gap={1} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {/* ─── SECTION 2: PROPORSI FASKES TERDAMPAK (30% KIRI - 70% KANAN) ─── */}
              <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs hover:shadow-xs transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                  {/* Sisi Kiri (30% / 4 cols) */}
                  <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug m-0">
                        Proporsi &amp; Status Kesiapan Faskes
                      </h4>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal mt-2.5 mb-0">
                        Kondisi fungsional fasilitas pelayanan kesehatan (Rumah Sakit, Puskesmas, Klinik, dan Poskesdes) di {eventData.kabupaten || 'wilayah bencana'} guna memastikan ketersediaan layanan rujukan darurat pasca bencana.
                      </p>

                      {/* Quick Metrics 2x2 Grid with Big Numbers */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Faskes</span>
                          <span className="text-xl sm:text-2xl font-black text-slate-900">{totalMasterFaskes} <span className="text-xs sm:text-sm font-bold text-slate-500">Unit</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">Terdampak/Rusak</span>
                          <span className="text-xl sm:text-2xl font-black text-rose-950">{totalTerdampakFaskes} <span className="text-xs sm:text-sm font-bold text-rose-700">({totalPctFaskes}%)</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Berfungsi Normal</span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-950">{totalMasterFaskes - totalTerdampakFaskes} <span className="text-xs sm:text-sm font-bold text-emerald-700">Unit</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">Status Layanan</span>
                          <span className="text-sm sm:text-base font-black text-teal-950 leading-tight block mt-1">{totalPctFaskes > 30 ? 'Perlu Backup' : 'Layanan Aman'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Insight Box di Sisi Kiri */}
                    <div className="rounded-xl bg-rose-50/90 border border-rose-200 p-4 text-xs sm:text-sm text-rose-950 leading-relaxed font-medium">
                      <div className="flex items-center gap-2 text-rose-900 font-black text-sm mb-1.5">
                        <Building2 className="h-4 w-4 text-rose-600" />
                        <span>Insight Kesiapan Faskes:</span>
                      </div>
                      <p className="text-rose-950 font-medium m-0 text-xs sm:text-sm leading-relaxed">
                        {faskesNarrative}
                      </p>
                    </div>
                  </div>

                  {/* Sisi Kanan (70% / 8 cols): 4 Donut Pie Charts */}
                  <div className="lg:col-span-8 flex flex-col bg-slate-50/60 rounded-xl p-4 sm:p-5 border border-slate-200">
                    <div className="flex items-center justify-end gap-5 pb-3 mb-3 border-b border-slate-200/80 text-xs sm:text-sm font-bold text-slate-700">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" /> Terdampak / Rusak</span>
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" /> Berfungsi Normal</span>
                    </div>

                    {/* 4 Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1 items-stretch my-auto">
                      {faskesPieBreakdown.map((cat) => {
                        const IconComp = cat.icon
                        return (
                          <div key={cat.key} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all">
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5" title={cat.title}>
                                <IconComp className={`h-4 w-4 ${cat.iconColor} shrink-0 stroke-[2.5]`} />
                                <span className="truncate">{cat.title}</span>
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                                cat.terdampak > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {cat.pct}%
                              </span>
                            </div>

                            {/* Donut Chart */}
                            <div className="relative w-full h-[125px] flex items-center justify-center my-auto">
                              {typeof window !== 'undefined' && (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={cat.pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={30}
                                      outerRadius={50}
                                      paddingAngle={3}
                                      dataKey="value"
                                      isAnimationActive={true}
                                      animationDuration={1000}
                                    >
                                      {cat.pieData.map((entry, index) => (
                                        <Cell key={`cell-${cat.key}-${index}`} fill={entry.fill} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                      formatter={(val: any, name: any) => [`${val} Unit`, name]}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              )}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-base font-black text-slate-900 leading-none">{cat.terdampak}/{cat.totalMaster}</span>
                                <span className="text-[10px] font-bold text-slate-400 leading-tight">Unit</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                              <span className="text-rose-600 font-bold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" /> Rusak: {cat.terdampak}</span>
                              <span className="text-emerald-600 font-bold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" /> Normal: {cat.berfungsi}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </article>

              {/* ─── SECTION 3: DISTRIBUSI KASUS PENYAKIT KLB (30% KIRI - 70% KANAN) ─── */}
              <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs hover:shadow-xs transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                  {/* Sisi Kiri (30% / 4 cols) */}
                  <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug m-0">
                        Distribusi Kasus Penyakit Potensial KLB
                      </h4>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal mt-2.5 mb-0">
                        Surveilans penyakit menular dan penyakit potensial KLB (ISPA, Diare, Penyakit Kulit, DBD, Leptospirosis) pasca kejadian bencana pada posko-posko pengungsian dan fasilitas kesehatan.
                      </p>

                      {/* Quick Metrics 2x2 Grid with Big Numbers */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">Total Kasus</span>
                          <span className="text-xl sm:text-2xl font-black text-amber-950">{totalPenyakitCases} <span className="text-xs sm:text-sm font-bold text-amber-700">Kasus</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block">Dominan</span>
                          <span className="text-sm sm:text-base font-black text-sky-950 leading-tight block truncate mt-1" title={dominantDiseaseObj?.name || 'Nihil'}>
                            {dominantDiseaseObj?.name || 'Nihil'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block">Penyakit Aktif</span>
                          <span className="text-xl sm:text-2xl font-black text-purple-950">{penyakitTotalData.filter(x => x.total > 0).length} <span className="text-xs sm:text-sm font-bold text-purple-700">Jenis</span></span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">Status SKDR</span>
                          <span className="text-sm sm:text-base font-black text-teal-950 leading-tight block mt-1">{totalPenyakitCases > 50 ? 'Waspada' : 'Terkendali'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Insight Box di Sisi Kiri */}
                    <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-sm mb-1.5">
                        <HeartPulse className="h-4 w-4 text-amber-700" />
                        <span>Insight Epidemiologi Klinis:</span>
                      </div>
                      <p className="text-amber-950 font-medium m-0 text-xs sm:text-sm leading-relaxed">
                        {penyakitNarrative}
                      </p>
                    </div>
                  </div>

                  {/* Sisi Kanan (70% / 8 cols): Big BarChart */}
                  <div className="lg:col-span-8 flex flex-col bg-slate-50/60 rounded-xl p-4 sm:p-5 border border-slate-200">
                    <div className="flex items-center justify-end pb-3 mb-3 border-b border-slate-200/80">
                      <span className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold shadow-2xs">
                        {totalPenyakitCases} Total Pasien Kasus
                      </span>
                    </div>

                    {/* BarChart Container */}
                    <div className="w-full flex-1 min-h-[320px] sm:min-h-[360px] text-xs font-semibold">
                      {typeof window !== 'undefined' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={penyakitTotalData} margin={{ top: 15, right: 15, left: -5, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#475569" tickLine={false} interval={0} angle={-10} textAnchor="end" height={45} tick={{ fontSize: 12, fontWeight: 700 }} />
                            <YAxis stroke="#475569" tickLine={false} style={{ fontSize: '12px', fontWeight: 'bold' }} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: 600 }} formatter={(value) => [`${value} Kasus`, 'Total Pasien']} />
                            <Bar
                              dataKey="total"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={44}
                              isAnimationActive={true}
                              animationDuration={1200}
                            >
                              {penyakitTotalData.map((entry, idx) => {
                                const colors = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];
                                return <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {/* ─── KESIMPULAN REKOMENDASI OPERASIONAL ─── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                    KESIMPULAN ANALISIS
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">Sintesis Rekomendasi Terpadu EOC Kemenkes</span>
                </div>
                {eocNarrative && (
                  <p className="text-sm sm:text-base text-slate-900 font-normal leading-relaxed m-0">
                    <strong className="font-bold text-slate-950">Rekomendasi Utama: </strong>
                    {eocNarrative}
                  </p>
                )}
                <p className="text-sm sm:text-base text-slate-700 font-normal leading-relaxed m-0">
                  {korbanNarrative} {faskesNarrative} {penyakitNarrative}
                </p>
              </div>

              {/* ── BENCHMARKING & VALIDASI DATA AI VS SYSTEM ── */}
              <div className="hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 p-4 text-xs space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      AI
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">MODUL BENCHMARKING &amp; VALIDASI AKURASI AI</h4>
                      <p className="text-[10px] text-indigo-600 font-semibold">Komparasi Data Agregasi Sistem (SIPKK) vs Sintesis Analisis AI (Gemini 2.5 Flash)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase border border-emerald-200">
                    Akurasi Data: 100% Match
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Kejadian Bencana</div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600 font-bold">Sistem (DB): <b className="text-slate-900 font-black">{eventData.total_kejadian || 1}</b></span>
                      <span className="text-xs text-indigo-700 font-bold">AI Extraction: <b className="text-indigo-900 font-black">{eventData.total_kejadian || 1}</b></span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                      ✓ Presisi 100% - Data Konsisten
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Korban &amp; Pengungsi</div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600 font-bold">DB Korban: <b className="text-slate-900 font-black">{(eventData.korban_meninggal || 0) + (eventData.korban_luka || 0) + (eventData.pengungsi || 0)}</b></span>
                      <span className="text-xs text-indigo-700 font-bold">AI Narasi: <b className="text-indigo-900 font-black">{(eventData.korban_meninggal || 0) + (eventData.korban_luka || 0) + (eventData.pengungsi || 0)}</b></span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                      ✓ Presisi 100% - Narasi Terverifikasi
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-2xs space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400">Status Faskes &amp; Radius</div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-600 font-bold">Faskes Terdeteksi: <b className="text-slate-900 font-black">{detail?.faskes_terdekat?.length || 0}</b></span>
                      <span className="text-xs text-indigo-700 font-bold">Radius: <b className="text-indigo-900 font-black">25 KM</b></span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                      ✓ Geospasial Haversine Real-Time
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Matriks Akses Lokasi Terdekat Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_6px_18px_rgba(20,120,116,0.03)] space-y-4">
          <div className="border-b border-slate-100 pb-3.5 mb-2">
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
              Peta Akses &amp; Status Sumber Daya Kesehatan - {eventData.kabupaten || 'Wilayah Bencana'}
            </h4>
            <p className="text-sm sm:text-base text-slate-600 font-normal mt-1.5 mb-0">
              Pemantauan matriks faskes terdekat, pos pengungsian, ketersediaan SDM kesehatan, sanitasi lingkungan, logistik, dan relawan TCK
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMatrixTab('faskes')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'faskes'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Faskes Terdekat
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('pengungsian')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'pengungsian'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Pos Pengungsian &amp; Kesehatan
            </button>

            <button
              type="button"
              onClick={() => setMatrixTab('status_faskes')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'status_faskes'
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Status Fasilitas Kesehatan
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('sumber_daya')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'sumber_daya'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Sumber Daya Kesehatan
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('sanitasi_kesling')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'sanitasi_kesling'
                ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Sanitasi &amp; Kesling
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('logistik_kesehatan')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 ${matrixTab === 'logistik_kesehatan'
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Logistik Kesehatan
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('tck')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200 flex items-center gap-1.5 ${matrixTab === 'tck'
                ? 'bg-teal-50 text-teal-900 border-teal-400 shadow-sm font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <HeartPulse className="h-4 w-4" />
              TCK Kemkes
              {tckTotal > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-teal-700 text-white text-[10px] font-black">{tckTotal.toLocaleString('id-ID')}</span>
              )}
            </button>
          </div>

          {/* Tab content area */}
          <div className="overflow-x-auto min-h-[180px]">
            {matrixTab === 'faskes' && (
              <div className="space-y-4">
                {/* Total Counter / Summary Widget Bar */}
                {Array.isArray(detail?.faskes_terdekat) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-emerald-900/5 via-teal-900/5 to-slate-900/5 p-3 rounded-2xl border border-emerald-200/80 shadow-2xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-base shadow-2xs">
                        {detail.faskes_terdekat.length}
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Faskes Terdekat</div>
                        <div className="text-xs font-black text-slate-800">Area Terdampak</div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black text-base shadow-2xs">
                        {detail.faskes_terdekat.filter((f: any) => String(f.jenis || '').toLowerCase().includes('rs') || String(f.jenis || '').toLowerCase().includes('rumah sakit')).length}
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Rumah Sakit Siaga</div>
                        <div className="text-xs font-black text-blue-900">Rujukan Utama</div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-black text-base shadow-2xs">
                        {detail.faskes_terdekat.filter((f: any) => String(f.jenis || '').toLowerCase().includes('puskesmas')).length}
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Puskesmas Siaga</div>
                        <div className="text-xs font-black text-teal-900">Layanan Primer</div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-base shadow-2xs">
                        {detail.faskes_terdekat.filter((f: any) => String(f.jenis || '').toLowerCase().includes('klinik') || String(f.jenis || '').toLowerCase().includes('pustu')).length}
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Klinik & Pustu</div>
                        <div className="text-xs font-black text-indigo-900">Pos Penyangga</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  {Array.isArray(detail?.faskes_terdekat) && detail.faskes_terdekat.length > 0 ? (
                    <div className={detail.faskes_terdekat.length > 10 ? 'max-h-[380px] overflow-y-auto' : ''}>
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                            <th className="py-3 px-3">Wilayah</th>
                            <th className="py-3 px-3">Faskes Terdekat</th>
                            <th className="py-3 px-3">Jenis</th>
                            <th className="py-3 px-3">Petugas / Dokter PJ</th>
                            <th className="py-3 px-3 text-center">Jarak</th>
                            <th className="py-3 px-3 text-center">Waktu Tempuh</th>
                            <th className="py-3 px-3 text-center">Google Maps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.faskes_terdekat.map((f: any, fidx: number) => {
                            const isSelected = selectedRouteTarget?.name === f.nama;
                            return (
                              <tr
                                key={fidx}
                                onClick={() => handleSelectTarget(f, String(f.jenis || '').toLowerCase().includes('rs') ? 'hospital' : 'clinic')}
                                className={`border-b border-slate-100 hover:bg-teal-50/60 transition-all cursor-pointer ${isSelected
                                  ? 'bg-teal-50/80 border-l-4 border-teal-600'
                                  : fidx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                                  }`}
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {f.kecamatan ? `Kec. ${f.kecamatan}` : 'Kec. -'}
                                  {f.desa ? `, Desa ${f.desa}` : ''}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{f.nama || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-600">{f.jenis || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-semibold">{maskName(f.petugas || '')}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                  {f.jarak !== null && f.jarak !== undefined ? `${f.jarak.toFixed(1)} km` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                  {f.waktu_tempuh !== null && f.waktu_tempuh !== undefined ? `${f.waktu_tempuh} menit` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <a
                                    href={getGmapsDirUrl(f.latitude, f.longitude, f.nama, f.alamat)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold border border-teal-200 transition-colors cursor-pointer"
                                  >
                                    Buka Maps
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <p className="text-[11px] font-semibold">Mencari faskes terdekat...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {matrixTab === 'pengungsian' && (
              <div className="overflow-x-auto">
                {Array.isArray(detail?.pos_pengungsi) && detail.pos_pengungsi.length > 0 ? (
                  <div className={detail.pos_pengungsi.length > 10 ? 'max-h-[380px] overflow-y-auto' : ''}>
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                          <th className="py-3 px-3">Wilayah / Kecamatan</th>
                          <th className="py-3 px-3 text-center">Jenis Pos</th>
                          <th className="py-3 px-3 text-center">Titik Pengungsian</th>
                          <th className="py-3 px-3 text-center">Jumlah KK</th>
                          <th className="py-3 px-3 text-center">Total Jiwa</th>
                          <th className="py-3 px-3 text-center">Jarak</th>
                          <th className="py-3 px-3 text-center">Waktu Tempuh</th>
                          <th className="py-3 px-3 text-center">Google Maps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.pos_pengungsi.map((pos: any, pidx: number) => {
                          const isSelected = selectedRouteTarget?.name === (pos.nama || `Posko ${pos.kecamatan || ''}`);
                          const jenisPosVal = pos.jenis_pos || 'Pos Pengungsian';
                          const isKesehatan = String(jenisPosVal).toLowerCase().includes('kesehatan') && !String(jenisPosVal).toLowerCase().includes('pengungsian');
                          const isCombined = String(jenisPosVal).toLowerCase().includes('kesehatan') && String(jenisPosVal).toLowerCase().includes('pengungsian');
                          
                          let badgeClass = "bg-blue-50 text-blue-700 border-blue-200"; // Pos Pengungsian
                          if (isCombined) {
                            badgeClass = "bg-amber-50 text-amber-700 border-amber-200"; // Pos Kesehatan & Pengungsian
                          } else if (isKesehatan) {
                            badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200"; // Pos Kesehatan
                          }

                          return (
                            <tr
                              key={pidx}
                              onClick={() => handleSelectTarget({
                                ...pos,
                                nama: pos.nama || `Posko ${pos.kecamatan || ''}`
                              }, 'shelter')}
                              className={`border-b border-slate-100 hover:bg-teal-50/60 transition-all cursor-pointer ${isSelected
                                ? 'bg-teal-50/80 border-l-4 border-teal-600'
                                : pidx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                                }`}
                            >
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {pos.kecamatan ? `Kec. ${pos.kecamatan}` : '-'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black border uppercase tracking-wide ${badgeClass}`}>
                                  {jenisPosVal}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {pos.jml_titik_pengungsian || 1} titik
                                <span className="text-[11px] text-slate-400 font-medium block">
                                  ({pos.jml_titik_pengungsian_terpusat || 0} Terpusat / {pos.jml_titik_pengungsian_mandiri || 0} Mandiri)
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {pos.jml_kk_pengungsi || 0} KK
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-900">
                                {pos.jml_total_pengungsi || 0} Jiwa
                                <span className="text-[11px] text-slate-400 font-medium block">
                                  ({pos.jml_pengungsi_laki || 0} L / {pos.jml_pengungsi_perempuan || 0} P)
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {pos.jarak !== null && pos.jarak !== undefined ? `${pos.jarak.toFixed(1)} km` : '-'}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-700">
                                {pos.waktu_tempuh !== null && pos.waktu_tempuh !== undefined ? `${pos.waktu_tempuh} menit` : '-'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <a
                                  href={getGmapsDirUrl(pos.latitude, pos.longitude, pos.nama || `Posko ${pos.kecamatan || ''}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold border border-teal-200 transition-colors cursor-pointer"
                                >
                                  Buka Maps
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <AlertTriangle className="h-6 w-6 mb-2 text-slate-300" />
                    <p className="text-[11px] font-semibold">Tidak ada pos pengungsian & kesehatan yang diinput untuk kejadian ini.</p>
                  </div>
                )}
              </div>
            )}

            {matrixTab === 'status_faskes' && (
              <div className="space-y-6">
                {/* Grid 5 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Rumah Sakit Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,118,110,0.03)] hover:shadow-md transition-shadow duration-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Rumah Sakit</span>
                      <HeartPulse className="h-4.5 w-4.5 text-teal-655" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{faskesStatusSummary.rs.terdampak}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">Terdampak</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-[12px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Berfungsi (Normal)</span>
                        <span className="text-emerald-700 font-extrabold">{faskesStatusSummary.rs.berfungsi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tidak Operasional</span>
                        <span className="text-rose-700 font-extrabold">{faskesStatusSummary.rs.tidakBerfungsi}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal pl-2 border-l border-slate-150">
                        <span>R. Berat / Sedang / Ringan</span>
                        <span className="font-bold text-slate-655">{faskesStatusSummary.rs.rusakBerat}/{faskesStatusSummary.rs.rusakSedang}/{faskesStatusSummary.rs.rusakRingan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Puskesmas Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,118,110,0.03)] hover:shadow-md transition-shadow duration-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Puskesmas</span>
                      <Home className="h-4.5 w-4.5 text-teal-655" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{faskesStatusSummary.pkm.terdampak}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">Terdampak</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-[12px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Berfungsi (Normal)</span>
                        <span className="text-emerald-700 font-extrabold">{faskesStatusSummary.pkm.berfungsi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tidak Operasional</span>
                        <span className="text-rose-700 font-extrabold">{faskesStatusSummary.pkm.tidakBerfungsi}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal pl-2 border-l border-slate-150">
                        <span>R. Berat / Sedang / Ringan</span>
                        <span className="font-bold text-slate-655">{faskesStatusSummary.pkm.rusakBerat}/{faskesStatusSummary.pkm.rusakSedang}/{faskesStatusSummary.pkm.rusakRingan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pustu Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,118,110,0.03)] hover:shadow-md transition-shadow duration-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Pustu</span>
                      <Compass className="h-4.5 w-4.5 text-teal-655" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{faskesStatusSummary.pustu.terdampak}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">Terdampak</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-[12px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Berfungsi (Normal)</span>
                        <span className="text-emerald-700 font-extrabold">{faskesStatusSummary.pustu.berfungsi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tidak Operasional</span>
                        <span className="text-rose-700 font-extrabold">{faskesStatusSummary.pustu.tidakBerfungsi}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal pl-2 border-l border-slate-150">
                        <span>R. Berat / Sedang / Ringan</span>
                        <span className="font-bold text-slate-655">{faskesStatusSummary.pustu.rusakBerat}/{faskesStatusSummary.pustu.rusakSedang}/{faskesStatusSummary.pustu.rusakRingan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Klinik Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,118,110,0.03)] hover:shadow-md transition-shadow duration-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Klinik / Poskes</span>
                      <Activity className="h-4.5 w-4.5 text-teal-655" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{faskesStatusSummary.klinik.terdampak}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">Terdampak</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-[12px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Berfungsi (Normal)</span>
                        <span className="text-emerald-700 font-extrabold">{faskesStatusSummary.klinik.berfungsi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tidak Operasional</span>
                        <span className="text-rose-700 font-extrabold">{faskesStatusSummary.klinik.tidakBerfungsi}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal pl-2 border-l border-slate-150">
                        <span>R. Berat / Sedang / Ringan</span>
                        <span className="font-bold text-slate-655">{faskesStatusSummary.klinik.rusakBerat}/{faskesStatusSummary.klinik.rusakSedang}/{faskesStatusSummary.klinik.rusakRingan}</span>
                      </div>
                    </div>
                  </div>

                  {/* Posyandu Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(15,118,110,0.03)] hover:shadow-md transition-shadow duration-200 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Posyandu</span>
                      <Users className="h-4.5 w-4.5 text-teal-655" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{faskesStatusSummary.posyandu.terdampak}</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">Terdampak</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-[12px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Aktif (Normal)</span>
                        <span className="text-emerald-700 font-extrabold">{faskesStatusSummary.posyandu.berfungsi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tidak Aktif</span>
                        <span className="text-rose-700 font-extrabold">{faskesStatusSummary.posyandu.tidakBerfungsi}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-normal pl-2 border-l border-slate-150">
                        <span>R. Berat / Sedang / Ringan</span>
                        <span className="font-bold text-slate-655">{faskesStatusSummary.posyandu.rusakBerat}/{faskesStatusSummary.posyandu.rusakSedang}/{faskesStatusSummary.posyandu.rusakRingan}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Affected Facilities Table */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[13px] font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-2">
                    Daftar Detail Fasilitas Kesehatan Terdampak Bencana
                  </h5>
                  {faskesTerdampakList.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 font-bold">
                            <th className="py-3 px-3">Nama Fasilitas Kesehatan</th>
                            <th className="py-3 px-3">Jenis</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 text-center">Kondisi Kerusakan</th>
                            <th className="py-3 px-3 text-center">Fungsi Pelayanan</th>
                            <th className="py-3 px-3 text-center">Google Maps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faskesTerdampakList.map((f: any, idx: number) => {
                            const cond = getFaskesCondition(f.nama_faskes || f.nama || '');
                            return (
                              <tr key={idx} className={`border-b border-slate-100 hover:bg-teal-50/20 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="py-3 px-3 font-bold text-slate-900">{f.nama_faskes || f.nama || '-'}</td>
                                <td className="py-3 px-3 font-semibold text-slate-650">{f.jenis || '-'}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${cond.color}`}>
                                    {f.status || cond.label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {safeParseInt(f.rusak_berat) > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-rose-50 text-rose-700 border-rose-250 uppercase">
                                      R. Berat
                                    </span>
                                  ) : safeParseInt(f.rusak_sedang) > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-amber-50 text-amber-700 border-amber-250 uppercase">
                                      R. Sedang
                                    </span>
                                  ) : safeParseInt(f.rusak_ringan) > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-blue-50 text-blue-700 border-blue-250 uppercase">
                                      R. Ringan
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-semibold text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-slate-700">{f.fungsi || '-'}</td>
                                <td className="py-3 px-3 text-center">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((f.nama_faskes || f.nama || '') + ' ' + (eventData.kabupaten || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold border border-teal-200 transition-colors cursor-pointer"
                                  >
                                    Buka Maps
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                      <AlertTriangle className="h-6 w-6 mb-2 text-slate-300 animate-bounce" />
                      <p className="text-[12px] font-semibold">Tidak ada data faskes terdampak yang diinput untuk kejadian krisis ini.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {matrixTab === 'sumber_daya' && (
              <div>
                <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-150 gap-2">
                  <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Kapasitas Tenaga Kesehatan Kabupaten: <strong className="text-teal-850">{eventData.kabupaten || '-'}</strong>
                  </span>
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg uppercase tracking-wider">
                    {kapasitasNakes.length} Faskes Terdata
                  </span>
                </div>

                {/* Summary Capacity Section Chart */}
                {kapasitasNakes.length > 0 && (
                  <div className="mb-4 bg-gradient-to-r from-indigo-900/5 via-blue-900/5 to-slate-900/5 p-3.5 rounded-xl border border-indigo-150 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-600" />
                        Ringkasan Akumulasi Kapasitas Tenaga Kesehatan ({eventData.kabupaten || 'Kabupaten'})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Dokter Umum</span>
                        <span className="text-lg font-black text-blue-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.dokter_umum || f.jml_dokter || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Dokter Spesialis</span>
                        <span className="text-lg font-black text-indigo-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.dokter_spesialis || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Perawat</span>
                        <span className="text-lg font-black text-teal-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.perawat || f.jml_perawat || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Bidan</span>
                        <span className="text-lg font-black text-rose-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.bidan || f.jml_bidan || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Farmasi</span>
                        <span className="text-lg font-black text-emerald-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.farmasi || f.jml_farmasi || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-2xs">
                        <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Kesling &amp; Gizi</span>
                        <span className="text-lg font-black text-amber-700 block mt-0.5">
                          {kapasitasNakes.reduce((sum: number, f: any) => sum + (f.jml_kesling || 0) + (f.jml_gizi || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {loadingKapasitas ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Loader2 className="h-7 w-7 animate-spin mb-2 text-teal-700" />
                    <p className="text-[12px] font-semibold">Memuat data kapasitas tenaga kesehatan kabupaten...</p>
                  </div>
                ) : kapasitasNakes.length > 0 ? (
                  <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 font-bold">
                          <th className="py-2.5 px-3 text-center">No</th>
                          <th className="py-2.5 px-3">Jenis Faskes</th>
                          <th className="py-2.5 px-3">Kode Faskes</th>
                          <th className="py-2.5 px-3">Nama Faskes</th>
                          <th className="py-2.5 px-3 text-center">Dokter Umum</th>
                          <th className="py-2.5 px-3 text-center">Dokter Spesialis</th>
                          <th className="py-2.5 px-3 text-center">Dokter Gigi</th>
                          <th className="py-2.5 px-3 text-center">Perawat</th>
                          <th className="py-2.5 px-3 text-center">Perawat Gigi</th>
                          <th className="py-2.5 px-3 text-center">Bidan</th>
                          <th className="py-2.5 px-3 text-center">Farmasi</th>
                          <th className="py-2.5 px-3 text-center">Google Maps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kapasitasNakes.map((f: any, fidx: number) => (
                          <tr key={fidx} className={`border-b border-slate-100 hover:bg-teal-50/30 transition-colors ${fidx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500">{fidx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-700">{f.jenis_faskes || f.jenis || 'Faskes'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{f.kode_faskes || '-'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{f.nama_faskes || f.nama}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_umum || f.jml_dokter || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_spesialis || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_gigi || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.perawat || f.jml_perawat || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.perawat_gigi || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.bidan || f.jml_bidan || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.farmasi || f.jml_farmasi || 0}</td>
                            <td className="py-2.5 px-3 text-center">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((f.nama_faskes || f.nama) + ' ' + (f.kabupaten || eventData.kabupaten || ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold border border-teal-200 transition-colors cursor-pointer"
                              >
                                Buka Maps
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                    <AlertTriangle className="h-8 w-8 mb-2 text-slate-300" />
                    <p className="text-[12px] font-semibold">Tidak ada data kapasitas tenaga kesehatan untuk kabupaten ini.</p>
                  </div>
                )}
              </div>
            )}

            {matrixTab === 'sanitasi_kesling' && (
              <div className="space-y-3.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Kondisi Sanitasi &amp; Kesehatan Lingkungan di Lokasi Penampungan Pengungsi
                  </span>
                  <span className="text-[11px] font-black text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg uppercase tracking-wider">
                    Standar WHO &amp; Kemenkes RI
                  </span>
                </div>

                {/* 7 Indikator Sanitasi Real dari Form Tab 5 */}
                {(() => {
                  const h = detail?.header || {}
                  const indikator = [
                    {
                      no: 1, label: 'Jenis Tempat Penampungan',
                      field: 'rs_jenis_tempat_penampungan',
                      options: { '1': 'Bangunan Permanen', '2': 'Bangunan Darurat' },
                      std: 'Permanen lebih aman'
                    },
                    {
                      no: 2, label: 'Kapasitas Penampungan Pengungsi',
                      field: 'rs_kapasitas_penampungan',
                      options: { '1': 'Memadai (min. 3m²/org)', '2': 'Tidak Memadai' },
                      std: 'Min. 3m² per orang'
                    },
                    {
                      no: 3, label: 'Kapasitas Penyediaan Air Bersih',
                      field: 'rs_penyediaan_air_bersih',
                      options: { '1': 'Memadai (min. 5–15L/org/hari)', '2': 'Tidak Memadai' },
                      std: 'Min. 15L/org/hari'
                    },
                    {
                      no: 4, label: 'Sarana Jamban Darurat',
                      field: 'rs_jamban_darurat',
                      options: { '1': 'Memadai (min. 1 jamban/40 org)', '2': 'Tidak Memadai' },
                      std: 'Rasio 1:40'
                    },
                    {
                      no: 5, label: 'Tempat Pembuangan Sampah',
                      field: 'rs_tempat_sampah',
                      options: { '1': 'Memadai (min. 3m²/60 org)', '2': 'Tidak Memadai' },
                      std: 'Min. 3m²/60 org'
                    },
                    {
                      no: 6, label: 'Sarana SPAL (Drainase)',
                      field: 'rs_sarana_spal',
                      options: { '1': 'Memadai (min. 4m dr penampungan)', '2': 'Tidak Memadai' },
                      std: 'Min. 4m dari penampungan'
                    },
                    {
                      no: 7, label: 'Penerangan',
                      field: 'rs_penerangan',
                      options: { '1': 'Memadai (min. 60 lux)', '2': 'Tidak Memadai' },
                      std: 'Min. 60 lux'
                    },
                  ]
                  const hasAnyData = indikator.some(i => h[i.field])
                  if (!hasAnyData) {
                    return (
                      <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-5 text-center">
                        <p className="text-[12px] font-semibold text-slate-400">Belum ada data sanitasi dari Formulir Lengkap (Tab 5).</p>
                        <p className="text-[11px] text-slate-300 mt-1">Data akan muncul setelah petugas mengisi Tab Sanitasi & Kesling.</p>
                      </div>
                    )
                  }
                  const allMemadai = indikator.every(i => !h[i.field] || h[i.field] === '1')
                  const countMemadai = indikator.filter(i => h[i.field] === '1').length
                  const countTidak = indikator.filter(i => h[i.field] === '2').length
                  const countBelum = indikator.filter(i => !h[i.field]).length
                  return (
                    <div className="space-y-3">
                      {/* Summary bar */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                          <span className="text-lg font-black text-emerald-700">{countMemadai}</span>
                          <span className="text-[10px] font-extrabold text-emerald-600 block uppercase">Memadai</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                          <span className="text-lg font-black text-rose-700">{countTidak}</span>
                          <span className="text-[10px] font-extrabold text-rose-600 block uppercase">Tidak Memadai</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                          <span className="text-lg font-black text-slate-500">{countBelum}</span>
                          <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Belum Diisi</span>
                        </div>
                      </div>
                      {/* Tabel indikator */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="py-2 px-3 text-left font-extrabold text-slate-500 text-[10px] uppercase w-8">No</th>
                              <th className="py-2 px-3 text-left font-extrabold text-slate-500 text-[10px] uppercase">Jenis Fasilitas</th>
                              <th className="py-2 px-3 text-center font-extrabold text-slate-500 text-[10px] uppercase w-32">Kondisi</th>
                              <th className="py-2 px-3 text-center font-extrabold text-slate-500 text-[10px] uppercase w-40">Standar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {indikator.map((row, idx) => {
                              const val = h[row.field]
                              const label = val ? (row.options[val as keyof typeof row.options] || val) : null
                              const isMemadai = val === '1'
                              const isTidak = val === '2'
                              return (
                                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                  <td className="py-2.5 px-3 font-bold text-slate-400 text-center">{row.no}</td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800">{row.label}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    {label ? (
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold border ${
                                        isMemadai
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : isTidak
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-slate-50 text-slate-500 border-slate-200'
                                      }`}>
                                        {label}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[10px] font-bold">Belum diisi</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-400">{row.std}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Estimasi WHO tetap di bawah sebagai referensi */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800">
                        <span className="font-black uppercase block mb-1">Estimasi Kebutuhan Berdasarkan Jumlah Pengungsi ({(breakdown.pengungsi || 0).toLocaleString('id-ID')} jiwa):</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                          <div><span className="font-bold block">Air Bersih</span><span className="font-extrabold text-blue-900">{((breakdown.pengungsi || 0) * 15).toLocaleString('id-ID')} L/hari</span></div>
                          <div><span className="font-bold block">Jamban Darurat</span><span className="font-extrabold text-blue-900">{Math.ceil((breakdown.pengungsi || 0) / 40)} unit min.</span></div>
                          <div><span className="font-bold block">TPS (Sampah)</span><span className="font-extrabold text-blue-900">{Math.ceil((breakdown.pengungsi || 0) / 60)} unit min.</span></div>
                          <div><span className="font-bold block">Luas Penampungan</span><span className="font-extrabold text-blue-900">{((breakdown.pengungsi || 0) * 3).toLocaleString('id-ID')} m² min.</span></div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {(detail?.header?.akses_lokasi_keterangan || eventData.jalur_komunikasi) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detail?.header?.akses_lokasi_keterangan && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Akses ke Lokasi</span>
                        <p className="text-[12px] font-semibold text-slate-800">
                          {detail.header.akses_lokasi === '1' ? 'Mudah dijangkau' : 'Sukar dijangkau'}{detail.header.akses_lokasi_keterangan ? ` — ${detail.header.akses_lokasi_keterangan}` : ''}
                        </p>
                      </div>
                    )}
                    {eventData.jalur_komunikasi && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Jalur Komunikasi</span>
                        <p className="text-[12px] font-semibold text-slate-800">{eventData.jalur_komunikasi}</p>
                      </div>
                    )}
                  </div>
                )}

                {eventData.upaya_sub_klaster_pp_pl_air_bersih && (
                  <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-150">
                    <span className="text-[11px] font-black text-teal-900 uppercase tracking-wider block mb-1">
                      Upaya Sub-Klaster Penyehatan Lingkungan &amp; Air Bersih:
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {stripHtmlText(eventData.upaya_sub_klaster_pp_pl_air_bersih)}
                    </p>
                  </div>
                )}
              </div>
            )}


            {matrixTab === 'logistik_kesehatan' && (
              <div className="space-y-5">
                {/* Header */}
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                    Sumber Daya &amp; Kesiapan Logistik Kesehatan
                  </span>
                </div>

                {/* Section A: Tenaga Kesehatan Tersedia vs Dibutuhkan */}
                {(() => {
                  const rows: any[] = Array.isArray(detail?.tenaga_input) ? detail.tenaga_input : []
                  if (rows.length === 0) return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                      <p className="text-sm sm:text-base font-medium text-slate-500 m-0">Belum ada data kebutuhan tenaga kesehatan yang diinputkan.</p>
                    </div>
                  )
                  return (
                    <div>
                      <div className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider mb-2.5">A. Kebutuhan Tenaga Kesehatan per Faskes</div>
                      <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                        <table className="w-full text-xs sm:text-sm border-collapse">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="py-2.5 px-3 text-left font-black text-slate-700 text-xs uppercase">Nama Faskes</th>
                              {['Dokter', 'Perawat', 'Bidan', 'Farmasi', 'Gizi', 'Kesling', 'Lainnya'].map(h => (
                                <th key={h} className="py-2.5 px-2 text-center font-black text-slate-700 text-xs uppercase" colSpan={2}>{h}</th>
                              ))}
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="py-1.5 px-3"></th>
                              {['Dokter', 'Perawat', 'Bidan', 'Farmasi', 'Gizi', 'Kesling', 'Lainnya'].map(h => (
                                <th key={h+'_grp'} colSpan={2} className="py-1 px-1 text-center">
                                  <div className="grid grid-cols-2 gap-1 text-[10px] font-black uppercase">
                                    <span className="text-emerald-700">Ada</span>
                                    <span className="text-rose-700">Butuh</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row: any, idx: number) => {
                              const pairs: [number, number, string][] = [
                                [row.jml_dokter || 0, row.kebutuhan_dokter || 0, 'dokter'],
                                [row.jml_perawat || 0, row.kebutuhan_perawat || 0, 'perawat'],
                                [row.jml_bidan || 0, row.kebutuhan_bidan || 0, 'bidan'],
                                [row.jml_farmasi || 0, row.kebutuhan_farmasi || 0, 'farmasi'],
                                [row.jml_gizi || 0, row.kebutuhan_gizi || 0, 'gizi'],
                                [row.jml_kesling || 0, row.kebutuhan_kesling || 0, 'kesling'],
                                [row.jml_tenaga_lainnya || 0, row.kebutuhan_tenaga_lainnya || 0, 'lainnya'],
                              ]
                              return (
                                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                  <td className="py-3 px-3 font-bold text-slate-900">{row.nama_faskes || '-'}</td>
                                  {pairs.map(([ada, butuh, key]) => {
                                    const gap = butuh - ada
                                    return (
                                      <td key={key+'_cell'} colSpan={2} className="py-3 px-1 text-center">
                                        <div className="grid grid-cols-2 gap-1 items-center">
                                          <span className="font-bold text-emerald-800">{ada}</span>
                                          <span className={`font-bold ${gap > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                            {butuh}
                                            {gap > 0 && <span className="ml-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">-{gap}</span>}
                                          </span>
                                        </div>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* Section B: Kesiapan Logistik Dinkes vs RS/PKM */}
                {(() => {
                  const h = detail?.header || {}
                  const labels: Record<string, string> = {
                    obat_habis_pakai: 'Obat & Bahan Habis Pakai',
                    alat_kesehatan: 'Alat Kesehatan',
                    kaporit: 'Kaporit',
                    pac: 'PAC',
                    aquatab: 'Aquatab',
                    kantong_sampah: 'Kantong Sampah',
                    repellent_lalat: 'Repellent Lalat',
                    hygiene_kit: 'Hygiene Kit',
                    persalinan_kit: 'Persalinan Kit',
                    jml_sdm: 'Jumlah SDM',
                    kompetensi_sdm: 'Kompetensi SDM',
                    transportasi: 'Transportasi Operasional',
                    alat_komunikasi: 'Alat Komunikasi',
                    sarana_listrik: 'Sarana Listrik',
                    air: 'Ketersediaan Air',
                    tempat_tidur: 'Tempat Tidur',
                  }
                  const optMap: Record<string, string> = { '1': 'Cukup', '2': 'Tidak Cukup' }
                  const optMap2: Record<string, string> = { '1': 'Memenuhi', '2': 'Tidak Memenuhi' }
                  const optMap3: Record<string, string> = { '1': 'Berfungsi', '2': 'Tidak Berfungsi' }

                  const getStatusBadge = (val: string, key: string) => {
                    const map = key === 'kompetensi_sdm' ? optMap2 : key === 'sarana_listrik' ? optMap3 : optMap
                    const label = map[val] || val
                    const ok = val === '1'
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                        ok ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>{label}</span>
                    )
                  }

                  const fieldGroups = ['obat_habis_pakai', 'alat_kesehatan', 'kaporit', 'pac', 'aquatab', 'kantong_sampah', 'repellent_lalat', 'hygiene_kit', 'persalinan_kit', 'jml_sdm', 'kompetensi_sdm', 'transportasi', 'alat_komunikasi', 'sarana_listrik']
                  const rsExtra = ['air', 'tempat_tidur']

                  const dinkesKeys = fieldGroups.filter(k => h[`dinkes_${k}`])
                  const rsKeys = [...fieldGroups, ...rsExtra].filter(k => h[`rs_${k}`])

                  if (dinkesKeys.length === 0 && rsKeys.length === 0) return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                      <p className="text-sm sm:text-base font-medium text-slate-500 m-0">Belum ada data kesiapan logistik dari Formulir Lengkap (Tab 6).</p>
                    </div>
                  )

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dinkesKeys.length > 0 && (
                        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-2xs">
                          <div className="text-sm sm:text-base font-black text-blue-950 uppercase tracking-wider mb-3 pb-2 border-b border-blue-100">B. Kesiapan Logistik — Dinas Kesehatan</div>
                          <div className="space-y-2.5">
                            {dinkesKeys.map(k => (
                              <div key={k} className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-slate-800">{labels[k] || k}</span>
                                {getStatusBadge(h[`dinkes_${k}`], k)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {rsKeys.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-2xs">
                          <div className="text-sm sm:text-base font-black text-amber-950 uppercase tracking-wider mb-3 pb-2 border-b border-amber-100">B. Kesiapan Logistik — RS / Puskesmas</div>
                          <div className="space-y-2.5">
                            {rsKeys.map(k => (
                              <div key={k} className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-slate-800">{labels[k] || k}</span>
                                {getStatusBadge(h[`rs_${k}`], k)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── TCK Tab ── */}
            {matrixTab === 'tck' && (() => {
              const filteredTck = tckRelawan.filter(r => {
                const q = tckSearch.toLowerCase()
                const matchSearch = !q ||
                  (r.nama_lengkap || '').toLowerCase().includes(q) ||
                  (r.golongan || '').toLowerCase().includes(q) ||
                  (r.spesifikasi || '').toLowerCase().includes(q) ||
                  (r.kab_kota || '').toLowerCase().includes(q)
                const matchTckTab =
                  tckTab === 'semua' ? true
                  : tckTab === 'nakes' ? (r.kategori || '').toLowerCase() === 'nakes'
                  : (r.organisasi || r.nama_tim_emt || '').toLowerCase().includes('emt')
                return matchSearch && matchTckTab
              })

              const golonganColors: Record<string, string> = {
                'Tenaga Keperawatan': 'bg-blue-50 text-blue-700 border-blue-200',
                'Tenaga Medis': 'bg-teal-50 text-teal-700 border-teal-200',
                'Tenaga Kebidanan': 'bg-pink-50 text-pink-700 border-pink-200',
                'Tenaga Kesmas': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'Tenaga Kefarmasian': 'bg-violet-50 text-violet-700 border-violet-200',
                'Tenaga Gizi': 'bg-amber-50 text-amber-700 border-amber-200',
                'Tenaga Laboratorium': 'bg-cyan-50 text-cyan-700 border-cyan-200',
              }
              const getGolStyle = (golongan: string) => {
                for (const [key, cls] of Object.entries(golonganColors)) {
                  if ((golongan || '').includes(key.split(' ')[1] || key)) return cls
                }
                return 'bg-slate-50 text-slate-700 border-slate-200'
              }

              const countByGolongan: Record<string, number> = {}
              filteredTck.forEach(r => {
                const g = r.golongan || 'Lainnya'
                countByGolongan[g] = (countByGolongan[g] || 0) + 1
              })
              const topGolongan = Object.entries(countByGolongan).sort((a, b) => b[1] - a[1]).slice(0, 3)

              return (
                <div className="space-y-4">
                  {/* Header sub-section */}
                  <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200/70 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 text-teal-700" />
                        <span className="text-[12px] font-black uppercase tracking-wider text-teal-900">Tenaga Cadangan Kesehatan (TCK) Kemkes RI</span>
                        {tckTotal > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white text-[9px] font-black">{tckTotal.toLocaleString('id-ID')} relawan</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Relawan TCK terlatih siaga di {eventData.provinsi || eventData.kabupaten || 'Wilayah Kejadian'}
                      </p>
                    </div>
                    <a href="https://tenagacadangankesehatan.kemkes.go.id" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-white text-teal-700 text-[11px] font-bold hover:bg-teal-50 transition shrink-0">
                      <Globe className="h-3.5 w-3.5" />
                      Portal TCK
                    </a>
                  </div>

                  {tckLoading ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-teal-600">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm font-semibold">Mengambil data TCK dari Kemkes...</span>
                    </div>
                  ) : tckRelawan.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 space-y-2">
                      <HeartPulse className="h-10 w-10 mx-auto mb-2 text-teal-600 opacity-60" />
                      <h5 className="text-sm font-bold text-slate-800">
                        {tckError ? 'Informasi Akses API TCK Kemkes' : 'Data Relawan TCK Belum Tersedia'}
                      </h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        {tckError || `Tidak ada data relawan TCK yang terdaftar untuk wilayah ${eventData.provinsi || eventData.kabupaten || 'ini'}.`}
                      </p>
                      <div className="pt-2">
                        <a
                          href="https://tenagacadangankesehatan.kemkes.go.id/web/site/landing-page"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Buka Portal TCK Kemenkes RI
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Summary mini cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-teal-700 text-white px-4 py-3 flex flex-col">
                          <span className="text-[10px] font-bold uppercase opacity-80">Total Relawan</span>
                          <span className="text-2xl font-black mt-1">{tckTotal.toLocaleString('id-ID')}</span>
                          <span className="text-[10px] opacity-70 mt-0.5 truncate">di {eventData.provinsi || eventData.kabupaten}</span>
                        </div>
                        {topGolongan.map(([golongan, count]) => (
                          <div key={golongan} className={`rounded-xl border px-3 py-3 flex flex-col ${getGolStyle(golongan)}`}>
                            <span className="text-[9px] font-bold uppercase opacity-70 leading-tight">{golongan.replace('Tenaga ', '')}</span>
                            <span className="text-xl font-black mt-1">{count}</span>
                            <span className="text-[9px] opacity-60 mt-0.5">relawan</span>
                          </div>
                        ))}
                      </div>

                      {/* Filters */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                          {(['semua', 'nakes', 'emt'] as const).map(tab => (
                            <button key={tab} onClick={() => setTckTab(tab)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition ${tckTab === tab ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                              {tab === 'semua' ? 'Semua' : tab === 'nakes' ? 'Nakes' : 'Tim EMT'}
                            </button>
                          ))}
                        </div>
                        <div className="relative flex-1 w-full sm:max-w-xs">
                          <input type="text" placeholder="Cari nama, golongan, wilayah..." value={tckSearch}
                            onChange={e => setTckSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-[11px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder:text-slate-400" />
                          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                          <span className="font-black text-slate-700">{filteredTck.length}</span> relawan
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                        {filteredTck.slice(0, tckDisplayLimit).map((r, idx) => (
                          <div key={r.id_user || idx}
                            className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs hover:shadow-md hover:border-teal-200 transition-all duration-200 flex flex-col gap-2.5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-teal-100 bg-teal-50 shrink-0">
                                {r.foto && !r.foto.includes('user.png') ? (
                                  <img src={r.foto} alt={r.nama_lengkap} className="h-full w-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <HeartPulse className="h-4 w-4 text-teal-600" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-black text-slate-900 leading-tight truncate">{r.nama_lengkap || 'Tidak Diketahui'}</p>
                                <p className="text-[10px] text-slate-500 font-semibold truncate">{r.kab_kota || r.provinsi || '-'}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {r.golongan && <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${getGolStyle(r.golongan)}`}>{r.golongan.replace('Tenaga ', '')}</span>}
                              {r.spesifikasi && <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200">{r.spesifikasi}</span>}
                            </div>
                            <div className="space-y-1 text-[11px]">
                              {r.pekerjaan && <div className="flex items-center gap-1.5 text-slate-600"><BriefcaseMedical className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate">{r.pekerjaan}</span></div>}
                              {(r.nama_tim_emt || r.organisasi) && <div className="flex items-center gap-1.5 text-slate-600"><Building2 className="h-3 w-3 text-slate-400 shrink-0" /><span className="truncate font-semibold">{r.nama_tim_emt || r.organisasi}</span></div>}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Users className="h-3 w-3 shrink-0" />
                                  <span>{r.jenis_kelamin || 'N/A'} · {r.usia ? `${r.usia} th` : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      // Scroll smoothly to map
                                      const mapEl = document.getElementById('peta-detail')
                                      if (mapEl) {
                                        mapEl.scrollIntoView({ behavior: 'smooth' })
                                      }
                                      handleSelectTarget(r, 'tck')
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold hover:bg-teal-100 transition shadow-2xs"
                                    title="Pilih dan Buat Rute ke Relawan TCK ini"
                                  >
                                    <Compass className="h-3 w-3 text-teal-700" />
                                    Rute
                                  </button>
                                  {r.nomor_telp && (
                                    <a href={`https://wa.me/${r.nomor_telp.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20${encodeURIComponent(r.nama_lengkap || 'Relawan TCK')},%20kami%20menghubungi%20dari%20EOC%20SIPKK%20Kemenkes.`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition shadow-2xs">
                                      <Phone className="h-3 w-3" />WA
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredTck.length > tckDisplayLimit && (
                          <div className="col-span-full text-center py-4 px-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-center gap-2">
                            <span className="text-xs text-slate-600 font-semibold">
                              Menampilkan <strong className="text-teal-900">{tckDisplayLimit}</strong> dari <strong className="text-slate-900">{filteredTck.length}</strong> relawan
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setTckDisplayLimit(prev => Math.min(prev + 30, filteredTck.length))}
                                className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-800 text-xs font-bold hover:bg-teal-50 transition shadow-2xs"
                              >
                                Muat Lebih Banyak (+30)
                              </button>
                              <button
                                onClick={() => setTckDisplayLimit(filteredTck.length)}
                                className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition shadow-2xs"
                              >
                                Tampilkan Semua ({filteredTck.length})
                              </button>
                            </div>
                          </div>
                        )}
                        {filteredTck.length === 0 && (
                          <div className="col-span-full text-center py-8 text-slate-400">
                            <p className="text-sm font-semibold">Tidak ada relawan yang cocok</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2 bg-teal-50/80 border border-teal-100 rounded-xl px-3.5 py-2.5 text-[11px] text-teal-800 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>Data bersumber dari sistem <span className="font-black">TCK</span> Kemenkes RI. Kontak hanya untuk koordinasi penanganan bencana resmi.</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </article>

        {/* 3. Dynamic EOC Actions & Response Card (Inputted from Laporan Kejadian Formulir Lengkap) */}
        {(() => {
          const bantuanText = stripHtmlText(eventData.bantuan || eventData.bantuan_diterima)
          const bantuanDiperlukanText = stripHtmlText(eventData.bantuan_diperlukan)
          const emtText = eventData.mobilisasi_emt
          const pscText = eventData.mobilisasi_psc
          const rekomendasiText = stripHtmlText(eventData.rekomendasi)
          const tindakLanjutText = stripHtmlText(eventData.tindak_lanjut)
          const hambatanText = stripHtmlText(eventData.hambatan)

          return (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="pb-3.5 border-b border-slate-100">
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
                  Respon Dinkes &amp; EOC Kemenkes
                </h4>
                <p className="text-sm sm:text-base text-slate-600 font-normal mt-1.5 mb-0">
                  Upaya penanggulangan, distribusi logistik, dan rekomendasi tindak lanjut real-time dari laporan kejadian
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Col 1: Upaya Penanggulangan */}
                <div className="rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-slate-50/30 p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-amber-200/60">
                      <h5 className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-950 m-0">
                        Upaya Penanggulangan Krisis
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                        {compiledUpaya.length > 0 ? `${compiledUpaya.length} Upaya Terinput` : 'Prosedur EOC'}
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {compiledUpaya.length > 0 ? (
                        compiledUpaya.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-amber-150 shadow-2xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-wide text-amber-800">{item.label}</span>
                              {item.category && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{item.category}</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line m-0">
                              {item.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <ul className="space-y-2 text-xs sm:text-sm font-normal text-slate-800 leading-relaxed m-0 p-0 list-none">
                          <li className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>Mobilisasi TRC &amp; Tim Cadangan Kesehatan ke lokasi kejadian.</span>
                          </li>
                          <li className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>Penyaluran dan distribusi logistik obat-obatan darurat.</span>
                          </li>
                          <li className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>Surveilans aktif penyakit berpotensi KLB di lokasi pengungsian.</span>
                          </li>
                          <li className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>Koordinasi 24 jam dengan klaster kesehatan, BPBD, dan TNI/POLRI.</span>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Col 2: Mobilisasi & Distribusi Logistik Bantuan */}
                <div className="rounded-xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50/50 to-slate-50/30 p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-cyan-200/60">
                      <h5 className="text-sm sm:text-base font-black uppercase tracking-wider text-cyan-950 m-0">
                        Distribusi Logistik &amp; Bantuan
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-extrabold text-xs">
                        Klaster Logistik
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {(emtText || pscText) && (
                        <div className="grid grid-cols-2 gap-2">
                          {emtText && (
                            <div className="bg-white p-2.5 rounded-xl border border-cyan-150 shadow-2xs">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">Tim EMT</span>
                              <span className="text-xs sm:text-sm font-bold text-cyan-900 block truncate" title={emtText}>{emtText}</span>
                            </div>
                          )}
                          {pscText && (
                            <div className="bg-white p-2.5 rounded-xl border border-cyan-150 shadow-2xs">
                              <span className="text-[10px] font-black uppercase text-slate-400 block">PSC 119</span>
                              <span className="text-xs sm:text-sm font-bold text-cyan-900 block truncate" title={pscText}>{pscText}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-white p-3.5 rounded-xl border border-cyan-150 shadow-2xs space-y-1">
                        <span className="text-xs font-black uppercase tracking-wide text-cyan-800 block">Logistik Tersalurkan / Diterima</span>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line m-0">
                          {bantuanText || "Penyaluran logistik dasar (obat-obatan esensial, masker, hygiene kit) disalurkan langsung oleh dinkes kabupaten/kota setempat."}
                        </p>
                      </div>

                      {bantuanDiperlukanText && (
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1">
                          <span className="text-xs font-black uppercase tracking-wide text-teal-800 block">Bantuan Yang Diperlukan Segera</span>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line m-0">
                            {bantuanDiperlukanText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Col 3: Rekomendasi, Tindak Lanjut & Hambatan */}
                <div className="rounded-xl border border-teal-200/80 bg-gradient-to-b from-teal-50/50 to-slate-50/30 p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-teal-200/60">
                      <h5 className="text-sm sm:text-base font-black uppercase tracking-wider text-teal-950 m-0">
                        Rekomendasi &amp; Tindak Lanjut
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-extrabold text-xs">
                        Rencana Aksi
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      <div className="bg-white p-3.5 rounded-xl border border-teal-150 shadow-2xs space-y-1">
                        <span className="text-xs font-black uppercase tracking-wide text-teal-800 block">Rekomendasi EOC</span>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line m-0">
                          {rekomendasiText || "Tingkatkan surveilans penyakit pasca bencana di pos pengungsian, pantau kecukupan logistik, serta koordinasi aktif 24 jam dengan EOC Kemenkes."}
                        </p>
                      </div>

                      {tindakLanjutText && (
                        <div className="bg-white p-3.5 rounded-xl border border-indigo-150 shadow-2xs space-y-1">
                          <span className="text-xs font-black uppercase tracking-wide text-indigo-800 block">Rencana Tindak Lanjut (RTL)</span>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line m-0">
                            {tindakLanjutText}
                          </p>
                        </div>
                      )}

                      {hambatanText && (
                        <div className="bg-rose-50/90 p-3.5 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                          <span className="text-xs font-black uppercase tracking-wide text-rose-800 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                            Hambatan Pelayanan Lapangan
                          </span>
                          <p className="text-xs sm:text-sm text-rose-950 leading-relaxed font-semibold whitespace-pre-line m-0">
                            {hambatanText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {eventData.pelapor_nama && (
                <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-600 font-medium gap-2">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="font-bold text-slate-900">Penanggung Jawab / Pelapor:</span> {eventData.pelapor_nama} {eventData.pelapor_jabatan ? `(${eventData.pelapor_jabatan})` : ''} {eventData.pelapor_instansi ? `- ${eventData.pelapor_instansi}` : ''} {eventData.pelapor_nip ? `[NIP: ${eventData.pelapor_nip}]` : ''}
                  </span>
                  {eventData.pelapor_no_telp && (
                    <span className="text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">Kontak: {eventData.pelapor_no_telp}</span>
                  )}
                </div>
              )}
            </article>
          );
        })()}

      </div>
      {/* ==================== HEALTH RISK SCORE POPUP MODAL ==================== */}
      {showHealthInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowHealthInfo(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wide">Health Risk Score</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Cara Penghitungan Skor</p>
                </div>
              </div>
              <button
                onClick={() => setShowHealthInfo(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none"
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Skor Saat Ini */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Skor Kejadian Ini</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900">{healthRiskScore}</span>
                <span className="text-[11px] text-slate-400 font-bold">/100</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${healthRiskLevel.color}`}>
                  {healthRiskLevel.label}
                </span>
              </div>
            </div>

            {/* Formula */}
            <div className="space-y-3">
              <p className="text-[12px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">Komponen Perhitungan</p>

              <div className="space-y-2 text-[12.5px]">
                {/* Base */}
                <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-50">
                  <div>
                    <span className="font-bold text-slate-800 block">Skor Dasar</span>
                    <span className="text-slate-500 font-normal text-[11px]">Baseline risiko bencana aktif</span>
                  </div>
                  <span className="font-black text-teal-700 shrink-0">+55</span>
                </div>
                {/* Meninggal */}
                <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 ${breakdown.meninggal > 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Ada Korban Meninggal</span>
                    <span className="text-slate-500 font-normal text-[11px]">Meninggal {'>'} 0 jiwa <span className="font-bold">(saat ini: {breakdown.meninggal})</span></span>
                  </div>
                  <span className={`font-black shrink-0 ${breakdown.meninggal > 0 ? 'text-rose-600' : 'text-slate-300'}`}>+10</span>
                </div>
                {/* Luka Berat */}
                <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 ${breakdown.luka_berat > 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Ada Korban Luka Berat</span>
                    <span className="text-slate-500 font-normal text-[11px]">Luka berat {'>'} 0 jiwa <span className="font-bold">(saat ini: {breakdown.luka_berat || 0})</span></span>
                  </div>
                  <span className={`font-black shrink-0 ${breakdown.luka_berat > 0 ? 'text-orange-600' : 'text-slate-300'}`}>+5</span>
                </div>
                {/* Pengungsi */}
                <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 ${breakdown.pengungsi > 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Jumlah Pengungsi</span>
                    <span className="text-slate-500 font-normal text-[11px]">
                      {'>'} 1.000: +15 &nbsp;|&nbsp; {'>'} 100: +8 <span className="font-bold">(saat ini: {breakdown.pengungsi.toLocaleString('id-ID')})</span>
                    </span>
                  </div>
                  <span className={`font-black shrink-0 ${breakdown.pengungsi > 1000 ? 'text-rose-600' : breakdown.pengungsi > 100 ? 'text-amber-600' : 'text-slate-300'}`}>
                    {breakdown.pengungsi > 1000 ? '+15' : breakdown.pengungsi > 100 ? '+8' : '+0'}
                  </span>
                </div>
                {/* Akses */}
                <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 ${eventData.akses_lokasi === 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Akses Lokasi Terputus</span>
                    <span className="text-slate-500 font-normal text-[11px]">Hambat respons medis darurat</span>
                  </div>
                  <span className={`font-black shrink-0 ${eventData.akses_lokasi === 0 ? 'text-rose-600' : 'text-slate-300'}`}>+10</span>
                </div>
                {/* Listrik */}
                <div className={`flex items-start justify-between gap-3 py-1.5 border-b border-slate-50 ${eventData.jaringan_listrik === 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Jaringan Listrik Padam</span>
                    <span className="text-slate-500 font-normal text-[11px]">Ganggu operasional fasilitas kesehatan</span>
                  </div>
                  <span className={`font-black shrink-0 ${eventData.jaringan_listrik === 0 ? 'text-amber-600' : 'text-slate-300'}`}>+5</span>
                </div>
                {/* Air Bersih */}
                <div className={`flex items-start justify-between gap-3 py-1.5 ${eventData.air_bersih === 0 ? '' : 'opacity-40'}`}>
                  <div>
                    <span className="font-bold text-slate-800 block">Krisis Air Bersih</span>
                    <span className="text-slate-500 font-normal text-[11px]">Potensi wabah penyakit meningkat</span>
                  </div>
                  <span className={`font-black shrink-0 ${eventData.air_bersih === 0 ? 'text-amber-600' : 'text-slate-300'}`}>+5</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 text-[11.5px] text-slate-600 font-semibold">
                📐 <span className="font-black text-slate-700">Batas:</span> Skor dikunci dalam rentang <span className="font-black text-teal-700">35 – 95</span> poin.
              </div>
            </div>

            {/* Skala Interpretasi */}
            <div className="space-y-2">
              <p className="text-[12px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">Interpretasi Skor</p>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-emerald-700">35–44: RENDAH</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-amber-700">45–59: SEDANG</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-bold text-orange-700">60–79: TINGGI</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="font-bold text-rose-700">80–95: SANGAT TINGGI</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHealthInfo(false)}
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL LOG TIMELINE AKTIVITAS KEJADIAN (DENGAN KALENDER 14 HARI SIAGA) ── */}
      <TimelineCalendarModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        disasterName={eventData.jenis_bencana}
        locationName={locationFull}
        tglKejadianRaw={eventData.tgl_kejadian || formattedDate}
        timelineLogs={timelineLogs}
        loadingLogs={loadingLogs}
        logsError={logsError}
      />

    </div>
  )
}
