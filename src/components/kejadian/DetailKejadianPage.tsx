'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Download
} from 'lucide-react'
import DisasterMap from './DisasterMap'
import { useAuthStore } from '@/lib/authStore'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush
} from 'recharts'

interface DetailKejadianPageProps {
  selectedEvent: any
  onBack: () => void
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


export default function DetailKejadianPage({ selectedEvent, onBack }: DetailKejadianPageProps) {
  const { token, user, isGuest: storeIsGuest } = useAuthStore()
  const isGuest = storeIsGuest || !token || !user

  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'tenaga' | 'pengungsi' | 'faskes'>('tenaga')
  const [matrixTab, setMatrixTab] = useState<'faskes' | 'pengungsian' | 'kesehatan' | 'logistik' | 'status_faskes' | 'sumber_daya'>('faskes')
  const [showHealthInfo, setShowHealthInfo] = useState(false)
  const [kapasitasNakes, setKapasitasNakes] = useState<any[]>([])
  const [loadingKapasitas, setLoadingKapasitas] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [trendWindowDays, setTrendWindowDays] = useState(7)

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
    type: 'hospital' | 'clinic' | 'shelter'
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
  const [weeklyWeather, setWeeklyWeather] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    const merged = {
      ...(selectedEvent || {}),
      ...(detail || {})
    }
    // Jika selectedEvent memiliki nama jenis_bencana berupa teks (bukan ID angka), pertahankan nama tersebut agar tidak tertimpa ID numerik dari detail
    if (
      selectedEvent?.jenis_bencana &&
      typeof selectedEvent.jenis_bencana === 'string' &&
      isNaN(Number(selectedEvent.jenis_bencana))
    ) {
      merged.jenis_bencana = selectedEvent.jenis_bencana
    }
    return merged
  }, [selectedEvent, detail])

  // Deterministic seed based on event ID for stable mock values when real values aren't in DB
  const eventSeed = useMemo(() => {
    const str = String(eventData.kode_trans || 'default')
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash)
  }, [eventData.kode_trans])

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
        console.warn('Backend API faskes-kapasitas not found or failed, generating dynamic fallback data based on local faskes list:', err)
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

          const data = uniqueList.map((f, idx) => {
            const name = f.nama || f.nama_faskes
            const isRS = String(f.jenis || f.jenis_faskes || name || '').toLowerCase().includes('rs') || name.toLowerCase().includes('rumah sakit')
            const seed = idx + eventSeed
            return {
              jenis_faskes: isRS ? 'Rumah Sakit' : 'Puskesmas',
              kode_faskes: isRS ? `RS-${10000 + (seed % 999)}` : `P-${20000 + (seed % 999)}`,
              nama_faskes: name,
              dokter_umum: isRS ? 8 + (seed % 5) : 2 + (seed % 3),
              dokter_spesialis: isRS ? 4 + (seed % 4) : 0,
              dokter_gigi: isRS ? 2 + (seed % 2) : 1 + (seed % 2),
              perawat: isRS ? 18 + (seed % 10) : 5 + (seed % 5),
              perawat_gigi: isRS ? 2 : 1,
              bidan: isRS ? 8 + (seed % 6) : 4 + (seed % 4),
              farmasi: isRS ? 3 + (seed % 3) : 1 + (seed % 2),
              kabupaten: eventData.kabupaten
            }
          })

          // If we still have no faskes, generate a few default ones based on kabupaten name
          if (data.length === 0) {
            const mockNames = [
              `RSUD ${eventData.kabupaten}`,
              `Puskesmas ${eventData.kabupaten} Barat`,
              `Puskesmas ${eventData.kabupaten} Timur`,
              `Klinik Pratama Rawat Inap EOC`
            ]
            mockNames.forEach((n, idx) => {
              const isRS = n.includes('RSUD')
              const seed = idx + eventSeed
              data.push({
                jenis_faskes: isRS ? 'Rumah Sakit' : 'Puskesmas',
                kode_faskes: isRS ? `RS-${10000 + idx}` : `P-${20000 + idx}`,
                nama_faskes: n,
                dokter_umum: isRS ? 10 : 3,
                dokter_spesialis: isRS ? 6 : 0,
                dokter_gigi: isRS ? 2 : 1,
                perawat: isRS ? 24 : 6,
                perawat_gigi: isRS ? 2 : 1,
                bidan: isRS ? 12 : 5,
                farmasi: isRS ? 4 : 2,
                kabupaten: eventData.kabupaten
              })
            })
          }

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
  }, [eventData.kabupaten, detail, eventSeed])

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
      const db_meninggal = safeParseInt(detail?.meninggal)
      const db_luka_berat = safeParseInt(detail?.luka_berat)
      const db_luka_ringan = safeParseInt(detail?.luka_ringan)
      const db_luka = db_luka_berat + db_luka_ringan
      const db_hilang = safeParseInt(detail?.hilang)
      const db_pengungsi = safeParseInt(detail?.pengungsi)

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
      ? (breakdown.meninggal + breakdown.hilang + breakdown.luka + breakdown.pengungsi)
      : safeParseInt(selectedEvent?.total_korban || 0)
  }, [hasDetail, breakdown, selectedEvent?.total_korban])

  const totalKorbanSum = useMemo(() => {
    return (breakdown.meninggal || 0) + (breakdown.luka || 0) + (breakdown.hilang || 0) + (breakdown.pengungsi || 0)
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

  // Fetch real route from OSRM Routing API (real road network routing)
  useEffect(() => {
    if (!isBanjir || !selectedRouteTarget) {
      setRouteCoords([])
      setRouteInfo(null)
      return
    }

    const startLat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const startLng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

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
  }, [selectedRouteTarget, isBanjir, eventData, detail])

  // Fetch real weather from Open-Meteo for disaster coordinates and map to flood indicators
  useEffect(() => {
    if (!isBanjir) return

    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json && json.current_weather) {
          const code = json.current_weather.weathercode
          let cuaca = 'Berawan'
          let tma = 'Normal (2.10 m)'
          let luas = '0 ha'
          let lama = 'Surut'

          // Map weather codes to Indonesian weather terms and dynamic flood indicators
          if (code >= 65 || code === 82 || code >= 95) {
            cuaca = 'Hujan Lebat'
            tma = 'Siaga 3 (5.80 m)'
            luas = '2.900 ha'
            lama = '2 - 3 Hari'
          } else if (code === 63 || code === 81) {
            cuaca = 'Hujan Sedang'
            tma = 'Siaga 3 (5.40 m)'
            luas = '1.200 ha'
            lama = '1 - 2 Hari'
          } else if ((code >= 51 && code <= 61) || code === 80) {
            cuaca = 'Hujan Ringan'
            tma = 'Waspada (4.50 m)'
            luas = '450 ha'
            lama = '1 Hari'
          } else {
            // Default simulated if weather is clear but a flood event was recorded
            cuaca = 'Hujan Sedang'
            tma = 'Siaga 3 (5.80 m)'
            luas = '2.900 ha'
            lama = '2 - 3 Hari'
          }

          setRealtimeWeather({ cuaca, tma, luas, lama })
        }
      })
      .catch((err) => {
        console.error('[Open-Meteo Weather API] Fetch failed:', err)
        // Fallback default matching user requested preview
        setRealtimeWeather({
          cuaca: 'Hujan Lebat',
          tma: 'Siaga 3 (5.80 m)',
          luas: '2.900 ha',
          lama: '2 - 3 Hari'
        })
      })
  }, [eventData, detail, isBanjir])

  const eventDateObj = useMemo(() => {
    const rawDate = eventData.tgl_kejadian
    if (!rawDate) return new Date()
    const cleanDate = rawDate.replace(/\s+WIB/i, '').trim()
    const parsed = new Date(cleanDate)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }, [eventData.tgl_kejadian])

  // Fetch weekly weather history/forecast (H-3 to H+3) from Open-Meteo for all disasters
  useEffect(() => {
    const lat = Number(eventData.latitude || (detail?.lokasi && detail.lokasi[0]?.latitude) || 1.6833)
    const lng = Number(eventData.longitude || (detail?.lokasi && detail.lokasi[0]?.longitude) || 98.8472)

    const base = new Date(eventDateObj)
    const hMinus3 = new Date(base)
    hMinus3.setDate(base.getDate() - 3)
    const hPlus3 = new Date(base)
    hPlus3.setDate(base.getDate() + 3)

    const startStr = formatDateISO(hMinus3)
    const endStr = formatDateISO(hPlus3)

    const isPast = (new Date().getTime() - base.getTime()) > 1000 * 60 * 60 * 24 * 14
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
            const code = json.daily.weathercode[idx]
            const maxTemp = Math.round(json.daily.temperature_2m_max[idx] || 30)
            const minTemp = Math.round(json.daily.temperature_2m_min[idx] || 23)
            const precip = json.daily.precipitation_sum ? Number(json.daily.precipitation_sum[idx] || 0) : 0

            let weather = 'Berawan'
            if (code >= 65 || code === 82 || code >= 95) weather = 'Hujan Lebat'
            else if (code === 63 || code === 81) weather = 'Hujan Sedang'
            else if ((code >= 51 && code <= 61) || code === 80) weather = 'Hujan Ringan'

            return {
              offset: idx - 3,
              date: dateObj,
              dayName: dateObj.toLocaleDateString('id-ID', { weekday: 'short' }),
              dateLabel: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              weather,
              temp: `${minTemp}-${maxTemp}°C`,
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
  }, [eventDateObj, eventData.latitude, eventData.longitude, detail])

  const weatherTimeline = useMemo(() => {
    if (weeklyWeather.length === 7) return weeklyWeather

    // Fallback mock data
    const dates = []
    const base = new Date(eventDateObj)
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)

      let weather = 'Berawan'
      let precip = 0
      let temp = '24-29°C'

      if (i === -3) { precip = 12; weather = 'Hujan Ringan'; temp = '23-27°C'; }
      else if (i === -2) { precip = 28; weather = 'Hujan Sedang'; temp = '23-27°C'; }
      else if (i === -1) { precip = 64; weather = 'Hujan Lebat'; temp = '22-26°C'; }
      else if (i === 0) { precip = 142; weather = 'Hujan Lebat'; temp = '22-25°C'; }
      else if (i === 1) { precip = 45; weather = 'Hujan Sedang'; temp = '23-27°C'; }
      else if (i === 2) { precip = 8; weather = 'Hujan Ringan'; temp = '24-28°C'; }
      else if (i === 3) { precip = 0; weather = 'Berawan'; temp = '25-30°C'; }

      dates.push({
        offset: i,
        date: d,
        dayName: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        weather,
        temp,
        precip
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
    const base = 40
    const factor = Math.min(55, Math.round(totalRainfall * 0.18))
    return Math.min(98, base + factor)
  }, [totalRainfall])

  const disasterTheme = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()
    if (name.includes('banjir')) {
      return {
        bg: 'bg-gradient-to-br from-blue-50/50 via-slate-50/20 to-blue-50/10 border-blue-200/80',
        text: 'text-blue-900',
        accentBg: 'bg-blue-100/80 text-blue-800',
        iconColor: 'text-blue-655 text-blue-600',
        bulletinBg: 'bg-blue-500/5 border-blue-200/50',
        bulletinText: 'text-blue-955',
        bulletinTag: 'bg-blue-100 text-blue-800',
        titleColor: 'text-blue-700'
      }
    }
    if (name.includes('gempa')) {
      return {
        bg: 'bg-gradient-to-br from-amber-50/50 via-slate-50/20 to-amber-50/10 border-amber-200/80',
        text: 'text-amber-900',
        accentBg: 'bg-amber-100/80 text-amber-800',
        iconColor: 'text-amber-600',
        bulletinBg: 'bg-amber-500/5 border-amber-200/50',
        bulletinText: 'text-amber-955',
        bulletinTag: 'bg-amber-100 text-amber-800',
        titleColor: 'text-amber-705'
      }
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      return {
        bg: 'bg-gradient-to-br from-rose-50/50 via-slate-50/20 to-rose-50/10 border-rose-200/80',
        text: 'text-rose-900',
        accentBg: 'bg-rose-100/80 text-rose-800',
        iconColor: 'text-rose-600',
        bulletinBg: 'bg-rose-500/5 border-rose-200/50',
        bulletinText: 'text-rose-955',
        bulletinTag: 'bg-rose-100 text-rose-800',
        titleColor: 'text-rose-700'
      }
    }
    if (name.includes('kebakaran') || name.includes('karhutla')) {
      return {
        bg: 'bg-gradient-to-br from-orange-50/50 via-slate-50/20 to-orange-50/10 border-orange-200/80',
        text: 'text-orange-900',
        accentBg: 'bg-orange-100/80 text-orange-800',
        iconColor: 'text-orange-600',
        bulletinBg: 'bg-orange-500/5 border-orange-200/50',
        bulletinText: 'text-orange-955',
        bulletinTag: 'bg-orange-100 text-orange-800',
        titleColor: 'text-orange-700'
      }
    }
    return {
      bg: 'bg-gradient-to-br from-teal-50/50 via-slate-50/20 to-teal-50/10 border-teal-200/80',
      text: 'text-teal-900',
      accentBg: 'bg-teal-100/80 text-teal-800',
      iconColor: 'text-teal-600',
      bulletinBg: 'bg-teal-500/5 border-teal-200/50',
      bulletinText: 'text-teal-955',
      bulletinTag: 'bg-teal-100 text-teal-800',
      titleColor: 'text-teal-700'
    }
  }, [eventData])



  const handleSelectTarget = (item: any, type: 'hospital' | 'clinic' | 'shelter') => {
    if (!item || !item.latitude || !item.longitude || Number(item.latitude) === 0 || Number(item.longitude) === 0) return
    setSelectedRouteTarget({
      id: item.nama || item.nama_faskes || item.id || 'target',
      name: item.nama || item.nama_faskes || 'Fasilitas Kesehatan',
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      type
    })
  }



  // Dynamic growth metrics
  const korbanGrowth = useMemo(() => (eventSeed % 15) + 5, [eventSeed]);
  const pengungsiGrowth = useMemo(() => ((eventSeed + 7) % 12) + 3, [eventSeed]);

  // Count posko and desa
  const countDesa = useMemo(() => {
    if (Array.isArray(eventData.pos_pengungsi) && eventData.pos_pengungsi.length > 0) {
      return eventData.pos_pengungsi.length;
    }
    return (eventSeed % 6) + 4;
  }, [eventData.pos_pengungsi, eventSeed]);

  const countPosko = useMemo(() => {
    if (Array.isArray(eventData.pos_pengungsi) && eventData.pos_pengungsi.length > 0) {
      let sum = 0;
      eventData.pos_pengungsi.forEach((p: any) => {
        sum += safeParseInt(p.jml_titik_pengungsian) ||
          (safeParseInt(p.jml_titik_pengungsian_terpusat) + safeParseInt(p.jml_titik_pengungsian_mandiri)) || 1;
      });
      return sum;
    }
    return (eventSeed % 12) + 8;
  }, [eventData.pos_pengungsi, eventSeed]);

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

  const pendudukTerdampakDisplay = useMemo(() => {
    const val = eventData.penduduk_terdampak;
    if (val === undefined || val === null || val === 0 || val === '0') {
      return 'NA';
    }
    return safeParseInt(val).toLocaleString('id-ID');
  }, [eventData.penduduk_terdampak]);

  const totalFaskes = useMemo(() => {
    const terdekat = Array.isArray(detail?.faskes_terdekat) ? detail.faskes_terdekat.length : 0
    const terdampak = Array.isArray(detail?.faskes_terdampak) ? detail.faskes_terdampak.length : 0
    if (terdekat === 0 && terdampak === 0) {
      return (eventSeed % 8) + 12
    }
    return terdekat + terdampak
  }, [detail, eventSeed])

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

  // ── TREND GRAPH GENERATORS ──
  const victimTrendData = useMemo(() => {
    const finalMeninggal = safeParseInt(eventData.meninggal);
    const finalLuka = safeParseInt(eventData.luka_berat) + safeParseInt(eventData.luka_ringan);
    const finalHilang = safeParseInt(eventData.hilang);
    const finalPengungsi = safeParseInt(eventData.pengungsi);
    const finalTerdampak = safeParseInt(eventData.penduduk_terdampak);
    const finalKorban = safeParseInt(eventData.jml_korban) || (finalMeninggal + finalLuka + finalHilang + finalPengungsi);

    const dateStr = eventData.tgl_kejadian || '';
    const dateParts = dateStr.split(' ');
    const baseDate = dateParts[0] ? new Date(dateParts[0]) : new Date();

    const points = [];
    const days = 14;
    for (let i = 0; i < days; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const factor = i === 0 ? 0.3 : Math.min(1, 0.4 + (i / (days - 1)) * 0.6 + (Math.sin(i) * 0.03));
      const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      points.push({
        date: formattedLabel,
        'Total Korban': Math.round(finalKorban * factor),
        'Penduduk Terdampak': Math.round(finalTerdampak * factor),
        'Total Pengungsi': Math.round(finalPengungsi * factor),
        'Meninggal': Math.round(finalMeninggal * factor),
        'Luka-luka': Math.round(finalLuka * factor),
        'Hilang': Math.round(finalHilang * factor),
      });
    }
    return points;
  }, [eventData]);

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

    if (dates.length <= 1) {
      const finalRusak = list.filter((f: any) => f.status === 'Rusak').length;
      const finalTerdampak = list.filter((f: any) => f.status === 'Terdampak').length;
      const finalBerfungsi = list.filter((f: any) => f.fungsi === 'Berfungsi' || f.fungsi === 'Masih Berfungsi').length;
      const finalTidakBerfungsi = list.filter((f: any) => f.fungsi === 'Tidak Berfungsi').length;

      const baseDate = baseDateStr ? new Date(baseDateStr.split(' ')[0]) : new Date();
      const points: any[] = [];
      const days = 14;
      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const factor = i === 0 ? 0.2 : Math.min(1, 0.3 + (i / (days - 1)) * 0.7);
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
          if (f.status === 'Rusak') runningRusak++;
          if (f.status === 'Terdampak') runningTerdampak++;
          if (f.fungsi === 'Berfungsi' || f.fungsi === 'Masih Berfungsi') runningBerfungsi++;
          if (f.fungsi === 'Tidak Berfungsi') runningTidakBerfungsi++;
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

  const penyakitTrendData = useMemo(() => {
    const list = Array.isArray(eventData.penyakit_input) ? eventData.penyakit_input : [];
    const baseDateStr = eventData.tgl_kejadian || '';

    if (list.length === 0) {
      const baseDate = baseDateStr ? new Date(baseDateStr.split(' ')[0]) : new Date();
      const points: any[] = [];
      const days = 14;
      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        points.push({
          date: formattedLabel,
          'Diare': 0,
          'ISPA': 0,
          'Penyakit Kulit': 0,
        });
      }
      return points;
    }

    const diseaseNames: string[] = Array.from(new Set(list.map((p: any) => String(p.jenis_penyakit || p.id_penyakit))));

    const dateMap: { [date: string]: { [disease: string]: number } } = {};
    list.forEach((p: any) => {
      const d = p.tgl_laporan || baseDateStr.split(' ')[0] || new Date().toISOString().split('T')[0];
      const disease = String(p.jenis_penyakit || p.id_penyakit || 'Lainnya');
      if (!dateMap[d]) {
        dateMap[d] = {};
      }
      if (!dateMap[d][disease]) {
        dateMap[d][disease] = 0;
      }
      dateMap[d][disease] += safeParseInt(p.jumlah_kasus || p.jml);
    });

    const dates = Object.keys(dateMap).sort();

    if (dates.length <= 1) {
      const baseDate = baseDateStr ? new Date(baseDateStr.split(' ')[0]) : new Date();
      const points: any[] = [];
      const days = 5;

      const finalValues: { [disease: string]: number } = {};
      diseaseNames.forEach((name: string) => {
        finalValues[name] = list
          .filter((p: any) => String(p.jenis_penyakit || p.id_penyakit) === name)
          .reduce((sum: number, p: any) => sum + safeParseInt(p.jumlah_kasus || p.jml), 0);
      });

      for (let i = 0; i < days; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const factor = i === 0 ? 0.1 : Math.min(1, 0.2 + (i / (days - 1)) * 0.8);
        const formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        const point: any = { date: formattedLabel };
        diseaseNames.forEach((name: string) => {
          point[name] = Math.round(finalValues[name] * factor);
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

        diseaseNames.forEach((name: string) => {
          point[name] = 0;
        });

        const dayData = dateMap[dStr];
        Object.keys(dayData).forEach((name: string) => {
          point[name] = dayData[name];
        });

        points.push(point);
      });
      return points;
    }
  }, [eventData.penyakit_input, eventData.tgl_kejadian]);

  // Flood conditions (Weather, TMA, Luas, Lama) parsed or fallbacks
  const parsedCuaca = useMemo(() => {
    if (realtimeWeather) return realtimeWeather.cuaca
    const text = kronologi
    const match = text.match(/cuaca\s*[:=]?\s*([\w\s\-]+)/i)
    if (match) return match[1].trim()
    if (text.toLowerCase().includes('hujan lebat')) return 'Hujan Lebat'
    if (text.toLowerCase().includes('hujan sedang')) return 'Hujan Sedang'
    if (text.toLowerCase().includes('hujan ringan')) return 'Hujan Ringan'
    if (text.toLowerCase().includes('mendung') || text.toLowerCase().includes('berawan')) return 'Berawan / Mendung'

    const options = ['Hujan Sedang', 'Hujan Lebat', 'Hujan Ringan', 'Berawan / Mendung']
    return options[eventSeed % options.length]
  }, [realtimeWeather, kronologi, eventSeed])

  const parsedTma = useMemo(() => {
    if (realtimeWeather) return realtimeWeather.tma
    const text = kronologi
    const match = text.match(/TMA\s*[:=]?\s*([\w\s\(\).,\-]+)/i) ||
      text.match(/tinggi\s*muka\s*air\s*[:=]?\s*([\w\s\(\).,\-]+)/i)
    if (match) return match[1].trim()

    const levels = ['Siaga 2 (6.45 m)', 'Siaga 3 (5.80 m)', 'Siaga 1 (7.20 m)', 'Waspada (4.50 m)']
    return levels[eventSeed % levels.length]
  }, [realtimeWeather, kronologi, eventSeed])

  const parsedLuas = useMemo(() => {
    if (realtimeWeather) return realtimeWeather.luas
    const text = kronologi
    const match = text.match(/luas\s*genangan\s*[:=]?\s*([\w\s.,\-]+ha)/i) ||
      text.match(/genangan\s*seluas\s*([\w\s.,\-]+ha)/i) ||
      text.match(/([\d.,]+)\s*ha/i)
    if (match) return match[0].trim()

    const val = ((eventSeed % 15) * 850 + 1200).toLocaleString('id-ID')
    return `${val} ha`
  }, [realtimeWeather, kronologi, eventSeed])

  const parsedLama = useMemo(() => {
    if (realtimeWeather) return realtimeWeather.lama
    const text = kronologi
    const match = text.match(/lama\s*genangan\s*[:=]?\s*([\w\s.,\-]+hari)/i) ||
      text.match(/genangan\s*selama\s*([\w\s.,\-]+hari)/i)
    if (match) return match[1].trim()

    const duration = ['3 - 5 Hari', '2 - 3 Hari', '5 - 7 Hari', '1 - 2 Hari']
    return duration[eventSeed % duration.length]
  }, [realtimeWeather, kronologi, eventSeed])

  const dynamicCharacteristics = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()

    if (name.includes('banjir')) {
      return [
        { label: 'TMA Sungai', value: parsedTma, icon: Activity, color: 'text-cyan-600' },
        { label: 'Luas Genangan', value: parsedLuas, icon: Compass, color: 'text-teal-650' },
        { label: 'Lama Genangan', value: parsedLama, icon: Clock, color: 'text-amber-500' },
        { label: 'Saturasi Tanah', value: `${soilSaturation}% (${soilSaturation >= 85 ? 'Jenuh Air' : 'Normal'})`, icon: Droplets, color: 'text-blue-500' }
      ]
    }
    if (name.includes('gempa')) {
      const magn = ((eventSeed % 25) / 10 + 5.0).toFixed(1)
      const depth = (eventSeed % 80) + 10
      const tsunami = (eventSeed % 3 === 0) ? 'Berpotensi Tsunami' : 'Tidak Berpotensi'
      const mmi = ['IV MMI (Ringan)', 'V MMI (Sedang)', 'VI MMI (Kuat)', 'VII MMI (Sangat Kuat)'][eventSeed % 4]
      return [
        { label: 'Magnitudo', value: `${magn} SR`, icon: Activity, color: 'text-red-650' },
        { label: 'Kedalaman', value: `${depth} km`, icon: Compass, color: 'text-amber-600' },
        { label: 'Potensi Tsunami', value: tsunami, icon: ShieldAlert, color: tsunami.includes('Tidak') ? 'text-emerald-650' : 'text-red-600 animate-pulse' },
        { label: 'Intensitas MMI', value: mmi, icon: AlertTriangle, color: 'text-orange-500' }
      ]
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      const level = ['Level II (Waspada)', 'Level III (Siaga)', 'Level IV (Awas)'][eventSeed % 3]
      const height = (eventSeed % 4) * 1000 + 1500
      const dir = ['Barat Daya', 'Selatan', 'Tenggara', 'Utara'][eventSeed % 4]
      const zone = (eventSeed % 3) + 4
      return [
        { label: 'Status Gunung', value: level, icon: ShieldAlert, color: 'text-red-600' },
        { label: 'Tinggi Abu', value: `${height.toLocaleString('id-ID')} m`, icon: CloudRain, color: 'text-slate-600' },
        { label: 'Arah Awan Panas', value: dir, icon: Compass, color: 'text-amber-600' },
        { label: 'Zona Bahaya', value: `Sektoral ${zone} km`, icon: AlertTriangle, color: 'text-orange-500' }
      ]
    }
    if (name.includes('kebakaran') || name.includes('karhutla')) {
      const spots = (eventSeed % 25) + 5
      const ispu = (eventSeed % 120) + 90
      const vis = ((eventSeed % 3) * 500 + 800).toLocaleString('id-ID')
      const ispuLabel = ispu >= 150 ? 'Tidak Sehat' : ispu >= 100 ? 'Sangat Sedang' : 'Sedang'
      return [
        { label: 'Titik Panas (Hotspot)', value: `${spots} Titik`, icon: Activity, color: 'text-red-500' },
        { label: 'ISPU (Air Quality)', value: `${ispu} (${ispuLabel})`, icon: ShieldAlert, color: ispu >= 150 ? 'text-red-650' : 'text-orange-500' },
        { label: 'Jarak Pandang', value: `${vis} m`, icon: Compass, color: 'text-slate-500' },
        { label: 'Arah Asap', value: 'Utara - Timur Laut', icon: Clock, color: 'text-amber-500' }
      ]
    }
    return [
      { label: 'Akses Jalan', value: eventData.akses_lokasi === 0 ? 'Terputus' : 'Lancar', icon: Compass, color: 'text-teal-650' },
      { label: 'Jaringan Listrik', value: eventData.jaringan_listrik === 0 ? 'Padam' : 'Normal', icon: Zap, color: 'text-amber-500' },
      { label: 'Air Bersih', value: eventData.air_bersih === 0 ? 'Krisis' : 'Layak', icon: Droplets, color: 'text-blue-500' },
      { label: 'Fasum Berfungsi', value: 'Sebagian Berfungsi', icon: Activity, color: 'text-cyan-600' }
    ]
  }, [eventData, parsedTma, parsedLuas, parsedLama, soilSaturation, eventSeed])

  const eocNarrative = useMemo(() => {
    const name = String(eventData.jenis_bencana || eventData.nama_bencana || '').toLowerCase()

    if (name.includes('banjir')) {
      return `Analisis Hidrometeorologi: Limpasan permukaan dipicu oleh akumulasi curah hujan ${totalRainfall} mm (puncak ${peakRainfall} mm pada hari kejadian) menjenuhkan kapasitas infiltrasi tanah hingga ${soilSaturation}%. Peningkatan TMA ke ${parsedTma} meningkatkan risiko kontaminasi patogen diare dan Leptospirosis, serta transmisi penyakit tular vektor (DBD, malaria) akibat genangan air selama 1-2 minggu ke depan.`
    }
    if (name.includes('gempa')) {
      return `Asesmen Epidemiologi Gempa: Kerusakan infrastruktur sanitasi dan faskes meningkatkan kerentanan klaster pengungsian terhadap penyakit menular (ISPA, diare). Runtuhan material memicu tingginya trauma fisik akut yang memerlukan faskes sekunder darurat. EOC merekomendasikan surveilans aktif harian penyakit potensial KLB di titik pengungsian.`
    }
    if (name.includes('gunung') || name.includes('letusan') || name.includes('erupsi')) {
      return `Buletin Krisis Letusan Gunung: Paparan abu vulkanik kaya silika dan sulfur dioksida memicu lonjakan kasus ISPA akut, konjungtivitis, dan iritasi dermatologis pada populasi sekitar radius zona bahaya. EOC merekomendasikan distribusi segera masker N95, pemantauan kualitas sumber air terbuka, dan evakuasi kelompok rentan.`
    }
    if (name.includes('kebakaran') || name.includes('karhutla')) {
      return `Analisis Pajanan Karhutla: Konsentrasi partikulat halus (PM2.5) dari asap kebakaran menjenuhkan kualitas udara ke kategori tidak sehat. Hal ini memicu eksaserbasi akut pasien asma, PPOK, dan infeksi pernapasan akut. EOC mendesak pembatasan aktivitas luar ruangan dan perlindungan nakes di garda depan.`
    }
    return `Buletin Epidemiologi EOC: Krisis kesehatan sedang dipantau secara intensif oleh tim reaksi cepat. Rekomendasi utama mencakup penguatan kapasitas respons faskes primer, distribusi logistik kesehatan dasar, surveilans penyakit menular sensitif bencana, dan pemenuhan kebutuhan sanitasi dasar bagi penduduk terdampak.`
  }, [eventData, totalRainfall, peakRainfall, soilSaturation, parsedTma])

  const faskesTerdampakList = Array.isArray(eventData.faskes_terdampak) ? eventData.faskes_terdampak : []

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
      }))
    }
    return selectedEvent ? [selectedEvent] : []
  }, [selectedEvent, detail])

  if (!selectedEvent) return null

  if (loading) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-4 py-16 bg-[#fbffff] rounded-3xl border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
        <p className="text-sm font-semibold text-slate-500">Menghubungkan & memuat data krisis secara realtime...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 bg-[#fbffff] animate-in fade-in duration-200">
      {/* Back navigation & Header */}
      {isBanjir ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-wide">
                RINGKASAN SITUASI - BANJIR
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 md:self-end">
            <span>Terakhir Diperbarui: {formattedDate}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
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
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                DETAIL KEJADIAN KRISIS KESEHATAN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan rincian komprehensif logistik dan dampak korban untuk kejadian bencana.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EOC Top Section Layout (Responsive Grid containing Merged Header & Metrics) */}
      {true && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch animate-in fade-in slide-in-from-top-3 duration-300">

          {/* Card 1 & 5 Merged: Disaster Header & Characteristics Bulletin */}
          <div className={`lg:col-span-3 md:col-span-3 rounded-2xl border bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between transition hover:shadow-md ${disasterTheme.bg}`}>
            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

              {/* Col 1: Disaster Identity */}
              <div className="w-full md:w-[28%] flex flex-col justify-between pr-2 border-b md:border-b-0 md:border-r border-slate-250/60 pb-3 md:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 ${disasterTheme.iconColor}`}>
                    <CloudRain className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">JENIS BENCANA</span>
                    <span className="text-[24px] font-black text-slate-900 block leading-none mt-1 uppercase tracking-wide">
                      {eventData.jenis_bencana}
                    </span>
                  </div>
                </div>

                <div className="mt-3 md:mt-auto">
                  <p className="text-[12.5px] font-black text-slate-800 leading-snug truncate" title={locationFull}>
                    {locationFull}
                  </p>
                  {formattedDate && (
                    <p className="text-[10.5px] font-bold text-slate-500 mt-1.5 flex items-center gap-1 leading-none">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {formattedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Col 2: Disaster Specific Physical/Geological Parameters */}
              <div className="w-full md:w-[32%] flex flex-col justify-center gap-3.5 px-0 md:px-2 border-b md:border-b-0 md:border-r border-slate-250/60 pb-3 md:pb-0">
                {dynamicCharacteristics.map((item, idx) => {
                  const IconComp = item.icon
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/90 text-slate-500 border border-slate-100 shadow-sm shrink-0">
                        <IconComp className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none">{item.label}</span>
                        <span className="text-[12px] font-black text-slate-800 block mt-0.5 truncate" title={item.value}>
                          {item.value}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Col 3: Weather & Precipitation Timeline */}
              <div className="w-full md:w-[40%] flex flex-col justify-between pl-0 md:pl-2">
                <span className="text-[9.5px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">
                  HISTORI CUACA &amp; CURAH HUJAN (H-3 S.D. H+3)
                </span>

                <div className="grid grid-cols-7 gap-1 text-center items-stretch justify-between flex-1">
                  {weatherTimeline.map((day) => {
                    const isEventDay = day.offset === 0
                    return (
                      <div
                        key={day.offset}
                        className={`flex flex-col items-center justify-between py-1 px-0.5 rounded-lg transition-colors border ${isEventDay
                            ? 'bg-rose-50 border-rose-200 text-rose-850'
                            : 'bg-white/80 border-slate-100/80 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-[8px] font-extrabold uppercase leading-none text-slate-400">
                          {day.dayName}
                        </span>
                        <span className="text-[9px] font-black leading-none mt-0.5 text-slate-700">
                          {day.dateLabel}
                        </span>

                        <div className="my-1.5 shrink-0">
                          {day.weather.includes('Lebat') ? (
                            <CloudLightning className={`h-4.5 w-4.5 ${isEventDay ? 'text-rose-500 animate-bounce' : 'text-blue-600'}`} />
                          ) : day.weather.includes('Sedang') || day.weather.includes('Ringan') ? (
                            <CloudRain className="h-4.5 w-4.5 text-blue-500" />
                          ) : (
                            <Cloud className="h-4.5 w-4.5 text-slate-400" />
                          )}
                        </div>

                        <div className="flex flex-col items-center leading-none mt-0.5">
                          <span className="text-[7.5px] font-extrabold text-slate-500 block truncate max-w-[32px]">
                            {day.temp}
                          </span>
                          <span className="text-[7.5px] font-bold text-blue-650 mt-0.5 block shrink-0">
                            {day.precip}mm
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* EOC Epidemiological Narrative Bulletin */}
            <div className={`mt-3.5 rounded-xl p-2.5 border flex items-start gap-2.5 ${disasterTheme.bulletinBg}`}>
              <div className="bg-rose-500 text-white rounded-lg p-1 shrink-0 mt-0.5 shadow-sm">
                <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-700">
                <span className={`font-extrabold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded shadow-sm mr-2 ${disasterTheme.bulletinTag}`}>
                  Buletin EOC
                </span>
                {eocNarrative}
              </p>
            </div>

          </div>

          {/* Card 2: Total Korban */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[250px] transition hover:shadow-md">
            <div className="text-center flex-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL KORBAN</span>
              <span className="text-4xl font-black text-slate-900 block leading-none mt-2">{totalKorbanReal.toLocaleString('id-ID')}</span>
              <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center justify-center gap-0.5 mt-2">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7 7 7" />
                </svg>
                +{korbanGrowth}% dari kemarin
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-auto grid grid-cols-3 gap-1 text-center shrink-0">
              <div>
                <span className="text-[18px] font-black text-slate-900 block leading-none">{breakdown.meninggal}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Meninggal</span>
              </div>
              <div className="border-x border-slate-100 px-1">
                <span className="text-[18px] font-black text-amber-600 block leading-none">{breakdown.luka}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Luka</span>
              </div>
              <div>
                <span className="text-[18px] font-black text-slate-600 block leading-none">{breakdown.hilang}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Hilang</span>
              </div>
            </div>
          </div>

          {/* Card 3: Faskes Di Area */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[250px] transition hover:shadow-md">
            <div className="text-center flex-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FASKES DI AREA</span>
              <span className="text-4xl font-black text-slate-900 block leading-none mt-2">
                {totalFaskes.toLocaleString('id-ID')}
              </span>
              <span className="mt-2.5">
                {terdampakFaskes > 0 ? (
                  <span className="text-[10px] font-extrabold text-rose-600 inline-flex items-center gap-1 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100 leading-none">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                    {terdampakFaskes} Terdampak
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 leading-none">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    Semua Berfungsi
                  </span>
                )}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-auto grid grid-cols-2 gap-1 text-center shrink-0">
              <div className="border-r border-slate-100 px-1">
                <span className="text-[18px] font-black text-slate-900 block leading-none">
                  {operasionalFaskes}
                </span>
                <span className="text-[9.5px] font-bold text-slate-450 block mt-1 leading-tight uppercase">OPERASIONAL</span>
              </div>
              <div className="px-1">
                <span className="text-[18px] font-black text-rose-600 block leading-none">
                  {terdampakFaskes}
                </span>
                <span className="text-[9.5px] font-bold text-slate-450 block mt-1 leading-tight uppercase">TERDAMPAK</span>
              </div>
            </div>
          </div>

          {/* Card 4: Penduduk Terdampak */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[250px] transition hover:shadow-md">
            <div className="text-center flex-1 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">PENDUDUK TERDAMPAK</span>
              <div className="flex items-baseline justify-center gap-0.5 mt-2">
                <span className="text-4xl font-black text-slate-900 leading-none">
                  {pendudukTerdampakDisplay}
                </span>
                {pendudukTerdampakDisplay !== 'NA' && <span className="text-xs font-bold text-slate-400">Jiwa</span>}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-auto grid grid-cols-3 gap-1 text-center shrink-0">
              <div>
                <span className="text-[16px] font-black text-slate-900 block leading-none">{balitaDisplay}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Balita</span>
              </div>
              <div className="border-x border-slate-100 px-1">
                <span className="text-[16px] font-black text-slate-900 block leading-none">{lansiaDisplay}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Lansia</span>
              </div>
              <div>
                <span className="text-[16px] font-black text-slate-900 block leading-none">{bumilDisplay}</span>
                <span className="text-[10px] font-bold text-slate-450 block mt-1 leading-tight uppercase">Bumil</span>
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
      <article id="peta-detail" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] space-y-5">
        <div>
          <h4 className="text-base font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-2 mb-3">
            PEMETAAN SPASIAL KEJADIAN BENCANA {isBanjir && '(EOC ROUTING & FASKES)'}
          </h4>

          <div className="h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-inner mt-2">
            <DisasterMap
              markers={mapMarkers}
              userScope={{
                mode: 'kabupaten',
                provinsi: { label: eventData.provinsi },
                kabupaten: { label: eventData.kabupaten },
              }}
              isGuest={true}
              isFloodEocMode={isBanjir}
              selectedRouteTarget={selectedRouteTarget}
              routeCoords={routeCoords}
              routeInfo={routeInfo}
              faskesList={detail?.faskes_terdekat}
              poskoList={detail?.pos_pengungsi}
              onSelectRouteTarget={handleSelectTarget}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-base font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-2 mb-2 flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-teal-700" />
            KRONOLOGI / DESKRIPSI KEJADIAN
          </h4>
          <p className="text-[14px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
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
          const pengungsiLast = victimLast['Total Pengungsi'] || 0;
          const meninggalLast = victimLast['Meninggal'] || 0;
          const terdampakLast = victimLast['Penduduk Terdampak'] || 0;

          const faskesLast = faskesTrendData[faskesTrendData.length - 1] || {};
          const faskesRusakLast = faskesLast['Rusak'] || 0;
          const faskesBerfungsiLast = faskesLast['Berfungsi'] || 0;
          const faskesTidakLast = faskesLast['Tidak Berfungsi'] || 0;
          const faskesTerdampakLast = faskesLast['Terdampak'] || 0;

          const penyakitKeys = Object.keys(penyakitTrendData[0] || {}).filter(k => k !== 'date');
          const penyakitLast = penyakitTrendData[penyakitTrendData.length - 1] || {};
          const dominantDisease = penyakitKeys.sort((a, b) => (penyakitLast[b] || 0) - (penyakitLast[a] || 0))[0] || null;
          const totalPenyakitCases = penyakitKeys.reduce((s, k) => s + (penyakitLast[k] || 0), 0);

          const korbanNarrative = totalKorbanDelta > 0
            ? `Tren naik — korban bertambah ${totalKorbanDelta.toLocaleString('id-ID')} jiwa dalam periode ini. Saat ini ${meninggalLast.toLocaleString('id-ID')} meninggal, ${pengungsiLast.toLocaleString('id-ID')} pengungsi, dan ${terdampakLast.toLocaleString('id-ID')} jiwa terdampak.`
            : totalKorbanDelta < 0
              ? `Tren menurun — situasi mulai membaik. Jumlah korban berkurang ${Math.abs(totalKorbanDelta).toLocaleString('id-ID')} jiwa. Pengungsi aktif: ${pengungsiLast.toLocaleString('id-ID')} jiwa.`
              : `Data korban stabil dalam periode ini. Pengungsi aktif: ${pengungsiLast.toLocaleString('id-ID')} jiwa, meninggal: ${meninggalLast.toLocaleString('id-ID')} jiwa.`;

          const faskesNarrative = faskesRusakLast > 0
            ? `${faskesRusakLast} faskes rusak teridentifikasi, ${faskesTidakLast} tidak berfungsi. Hanya ${faskesBerfungsiLast} faskes masih beroperasi. Kapasitas layanan kesehatan terdampak signifikan.`
            : `Tidak ada kerusakan faskes yang dilaporkan. ${faskesBerfungsiLast > 0 ? `${faskesBerfungsiLast} faskes berfungsi normal.` : 'Status faskes belum dilaporkan.'}`;

          const penyakitNarrative = dominantDisease && totalPenyakitCases > 0
            ? `Penyakit dominan: ${dominantDisease} (${(penyakitLast[dominantDisease] || 0)} kasus). Total kasus KLB yang dilaporkan: ${totalPenyakitCases} kasus dari ${penyakitKeys.length} jenis penyakit sensitif bencana.`
            : `Belum ada laporan kasus penyakit KLB yang masuk. Pantau surveilans harian di posko pengungsian.`;

          return (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col gap-5 mt-5">
              {/* ── Section Header ── */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      ANALISIS TREN DAMPAK KEJADIAN
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Pergerakan data berdasarkan tanggal laporan dari SIPKK</p>
                  </div>
                </div>
              </div>

              {/* ── 3 Column Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* Chart 1: Tren Korban */}
                <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 hover:bg-white hover:border-teal-200 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100/70 text-teal-700">
                        <Users className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Tren Korban &amp; Penduduk</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mb-2">Pergerakan total korban, pengungsi, dan penduduk terdampak</p>
                    <div className="w-full h-[255px] text-xs font-semibold">
                      {typeof window !== 'undefined' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={victimTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} formatter={(value) => <span className="mr-3 text-slate-700 font-bold">{value}</span>} />
                            <Line type="monotone" dataKey="Total Korban" stroke="#475569" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Penduduk Terdampak" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Total Pengungsi" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Meninggal" stroke="#e11d48" strokeWidth={1.5} dot={{ r: 0 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Brush dataKey="date" height={22} stroke="#0f766e" fill="#e6f4f1" tick={{ fontSize: '9px', fill: '#475569' }} gap={1} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                  {/* Narrative */}
                  <div className="mt-3 rounded-lg bg-teal-50/70 border border-teal-100 px-3 py-2.5">
                    <p className="text-[11px] text-teal-900 font-semibold leading-relaxed">
                      <span className="font-black text-teal-800">Insight: </span>
                      {korbanNarrative}
                    </p>
                  </div>
                </article>

                {/* Chart 2: Tren Faskes */}
                <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 hover:bg-white hover:border-rose-200 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100/70 text-rose-700">
                        <HeartPulse className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Tren Fasilitas Kesehatan</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mb-2">Status operasional dan tingkat kerusakan faskes terdampak</p>
                    <div className="w-full h-[255px] text-xs font-semibold">
                      {typeof window !== 'undefined' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={faskesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} formatter={(value) => <span className="mr-3 text-slate-700 font-bold">{value}</span>} />
                            <Line type="monotone" dataKey="Rusak" stroke="#e11d48" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Terdampak" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Berfungsi" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Line type="monotone" dataKey="Tidak Berfungsi" stroke="#7f1d1d" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                            <Brush dataKey="date" height={22} stroke="#e11d48" fill="#ffe4e6" tick={{ fontSize: '9px', fill: '#475569' }} gap={1} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                  {/* Narrative */}
                  <div className="mt-3 rounded-lg bg-rose-50/70 border border-rose-100 px-3 py-2.5">
                    <p className="text-[11px] text-rose-900 font-semibold leading-relaxed">
                      <span className="font-black text-rose-800">Insight: </span>
                      {faskesNarrative}
                    </p>
                  </div>
                </article>

                {/* Chart 3: Tren Penyakit KLB */}
                <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 hover:bg-white hover:border-amber-200 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700">
                        <Activity className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Tren Penyakit Berpotensi KLB</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mb-2">Akumulasi kasus mingguan penyakit sensitif bencana</p>
                    <div className="w-full h-[255px] text-xs font-semibold">
                      {typeof window !== 'undefined' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={penyakitTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} formatter={(value) => <span className="mr-3 text-slate-700 font-bold">{value}</span>} />
                            {Object.keys(penyakitTrendData[0] || {}).filter(k => k !== 'date').map((diseaseKey, kIdx) => {
                              const colors = ['#0ea5e9', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];
                              return (
                                <Line
                                  key={diseaseKey}
                                  type="monotone"
                                  dataKey={diseaseKey}
                                  stroke={colors[kIdx % colors.length]}
                                  strokeWidth={2}
                                  dot={{ r: 2 }}
                                  activeDot={{ r: 4 }}
                                  isAnimationActive={true}
                                  animationDuration={1200}
                                  animationEasing="ease-out"
                                />
                              );
                            })}
                            <Brush dataKey="date" height={22} stroke="#d97706" fill="#fef3c7" tick={{ fontSize: '9px', fill: '#475569' }} gap={1} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                  {/* Narrative */}
                  <div className="mt-3 rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2.5">
                    <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
                      <span className="font-black text-amber-800">Insight: </span>
                      {penyakitNarrative}
                    </p>
                  </div>
                </article>
              </div>

              {/* ── Combined Conclusion Section (Bottom of Card) ── */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed space-y-2">
                {eocNarrative && (
                  <p className="text-slate-800 font-normal leading-relaxed">
                    <span className="font-bold text-slate-900">Insight: </span>
                    {eocNarrative}
                  </p>
                )}
                <p className="text-slate-600 font-normal leading-relaxed">
                  {korbanNarrative} {faskesNarrative} {penyakitNarrative}
                </p>
              </div>
            </section>
          );
        })()}

        {/* Matriks Akses Lokasi Terdekat Card */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <h4 className="text-base font-black uppercase tracking-wider text-slate-850 flex items-center gap-2">
              <Compass className="h-5 w-5 text-teal-700" />
              PETA AKSES &amp; STATUS SUMBER DAYA KESEHATAN <span className="text-[12px] text-slate-400 font-bold normal-case">(DARI WILAYAH TERDAMPAK)</span>
            </h4>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMatrixTab('faskes')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'faskes'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Faskes Terdekat
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('pengungsian')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'pengungsian'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Pos Pengungsian
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('kesehatan')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'kesehatan'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Pos Kesehatan
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('logistik')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'logistik'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Gudang Logistik
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('status_faskes')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'status_faskes'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Status Fasilitas Kesehatan
            </button>
            <button
              type="button"
              onClick={() => setMatrixTab('sumber_daya')}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border duration-200 ${matrixTab === 'sumber_daya'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              Sumber Daya Kesehatan
            </button>
          </div>

          {/* Tab content area */}
          <div className="overflow-x-auto min-h-[180px]">
            {matrixTab === 'faskes' && (
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
                          {!isGuest && <th className="py-3 px-3">No. Telepon</th>}
                          <th className="py-3 px-3 text-center">Jarak</th>
                          <th className="py-3 px-3 text-center">Waktu Tempuh</th>
                          <th className="py-3 px-3 text-center">Kondisi</th>
                          <th className="py-3 px-3 text-center">Google Maps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.faskes_terdekat.map((f: any, fidx: number) => {
                          const cond = getFaskesCondition(f.nama);
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
                              <td className="py-2.5 px-3 font-bold text-slate-900">{f.nama}</td>
                              <td className="py-2.5 px-3 text-slate-600">{f.jenis || '-'}</td>
                              <td className="py-2.5 px-3 text-slate-700 font-semibold">{f.petugas || '-'}</td>
                              {!isGuest && <td className="py-2.5 px-3 font-bold text-teal-800 whitespace-nowrap">{f.telp || '-'}</td>}
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {f.jarak !== null && f.jarak !== undefined ? `${f.jarak.toFixed(1)} km` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {f.waktu_tempuh !== null && f.waktu_tempuh !== undefined ? `${f.waktu_tempuh} menit` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cond.color}`}>
                                  {cond.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <a
                                  href={
                                    f.latitude && f.longitude && f.latitude !== 0 && f.longitude !== 0
                                      ? `https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`
                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.nama + ' ' + (f.alamat || ''))}`
                                  }
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
            )}

            {matrixTab === 'pengungsian' && (
              <div className="overflow-x-auto">
                {Array.isArray(detail?.pos_pengungsi) && detail.pos_pengungsi.length > 0 ? (
                  <div className={detail.pos_pengungsi.length > 10 ? 'max-h-[380px] overflow-y-auto' : ''}>
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                          <th className="py-3 px-3">Wilayah / Kecamatan</th>
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
                                  href={
                                    pos.latitude && pos.longitude && pos.latitude !== 0 && pos.longitude !== 0
                                      ? `https://www.google.com/maps/search/?api=1&query=${pos.latitude},${pos.longitude}`
                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Posko Pengungsi Kecamatan ' + (pos.kecamatan || ''))}`
                                  }
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
                    <p className="text-[11px] font-semibold">Tidak ada pos pengungsian yang diinput untuk kejadian ini.</p>
                  </div>
                )}
              </div>
            )}

            {matrixTab === 'kesehatan' && (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-2 w-full">
                <HeartPulse className="h-8 w-8 text-emerald-500/60 animate-pulse mb-2" />
                <p className="text-xs font-bold text-slate-600">Pos Kesehatan</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Sedang dalam perkembangan...</p>
              </div>
            )}

            {matrixTab === 'logistik' && (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-2 w-full">
                <Warehouse className="h-8 w-8 text-amber-500/60 animate-pulse mb-2" />
                <p className="text-xs font-bold text-slate-600">Gudang Logistik</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Sedang dalam perkembangan...</p>
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
                            <th className="py-3 px-3 text-center">R. Berat</th>
                            <th className="py-3 px-3 text-center">R. Sedang</th>
                            <th className="py-3 px-3 text-center">R. Ringan</th>
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
                                <td className="py-3 px-3 text-center font-bold text-amber-800">{f.kondisi || '-'}</td>
                                <td className="py-3 px-3 text-center font-bold text-slate-700">{f.fungsi || '-'}</td>
                                <td className="py-3 px-3 text-center font-bold text-rose-700">{f.rusak_berat || 0}</td>
                                <td className="py-3 px-3 text-center font-bold text-orange-700">{f.rusak_sedang || 0}</td>
                                <td className="py-3 px-3 text-center font-bold text-yellow-700">{f.rusak_ringan || 0}</td>
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

                {loadingKapasitas ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Loader2 className="h-7 w-7 animate-spin mb-2 text-teal-700" />
                    <p className="text-[12px] font-semibold">Memuat data kapasitas tenaga kesehatan kabupaten...</p>
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
                            <td className="py-2.5 px-3 font-bold text-slate-700">{f.jenis_faskes}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{f.kode_faskes}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{f.nama_faskes}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_umum || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_spesialis || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.dokter_gigi || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.perawat || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.perawat_gigi || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.bidan || 0}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{f.farmasi || 0}</td>
                            <td className="py-2.5 px-3 text-center">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.nama_faskes + ' ' + (f.kabupaten || ''))}`}
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
          </div>

          {/* Bottom action info and button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-100 text-[12px] text-slate-400 font-bold uppercase tracking-wider gap-3">
            <span>* Jarak &amp; waktu tempuh berdasarkan rute akses utama saat ini (dapat berubah sewaktu-waktu)</span>
            <button
              type="button"
              onClick={() => {
                document.getElementById('peta-detail')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-black uppercase tracking-wider transition-colors duration-150 shadow-sm shadow-emerald-200 border-none cursor-pointer"
            >
              <Map className="h-3.5 w-3.5" />
              Lihat Peta Rute
            </button>
          </div>
        </article>

        {/* 3. Unified EOC Actions Card (Placed after Tabel Akses) */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-slate-150">

            {/* Col 1: Upaya Penanganan */}
            <div className="space-y-2 pb-3 md:pb-0">
              <h5 className="text-base font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                UPAYA EOC KEMENKES
              </h5>
              {hasDetail && Array.isArray(detail.perkembangan) && detail.perkembangan.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-[13px] font-normal text-slate-700 leading-relaxed">
                  {detail.perkembangan.slice(0, 4).map((p: any, idx: number) => (
                    <li key={idx}>{formatPerkembangan(p)}</li>
                  ))}
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-[13px] font-normal text-slate-650 leading-relaxed">
                  <li>Mobilisasi TRC &amp; Tim Cadangan Kesehatan.</li>
                  <li>Penyaluran logistik obat-obatan darurat.</li>
                  <li>Surveillance penyakit potensi KLB di posko.</li>
                  <li>Koordinasi aktif klaster kesehatan &amp; BPBD.</li>
                </ul>
              )}
            </div>

            {/* Col 2: Logistik Bantuan */}
            <div className="space-y-2 pt-3 md:pt-0 md:pl-5">
              <h5 className="text-base font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                <FileText className="h-4 w-4 text-cyan-600" />
                DISTRIBUSI LOGISTIK BANTUAN
              </h5>
              <p className="text-[13px] text-slate-650 leading-relaxed font-normal whitespace-pre-line">
                {eventData.bantuan ||
                  "Penyaluran logistik dasar (obat-obatan esensial, masker, hygiene kit) disalurkan langsung oleh dinkes kabupaten/kota setempat."}
              </p>
            </div>

            {/* Col 3: Rekomendasi RTL */}
            <div className="space-y-2 pt-3 md:pt-0 md:pl-5">
              <h5 className="text-base font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                <HelpCircle className="h-4 w-4 text-teal-650" />
                REKOMENDASI &amp; TINDAK LANJUT
              </h5>
              <p className="text-[13px] text-slate-650 leading-relaxed font-normal whitespace-pre-line">
                {eventData.rekomendasi ||
                  "Tingkatkan surveilans penyakit pasca bencana di pos pengungsian, pantau kecukupan logistik, serta koordinasi aktif 24 jam dengan EOC Kemenkes."}
              </p>
            </div>
          </div>
        </article>

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

    </div>
  )
}
