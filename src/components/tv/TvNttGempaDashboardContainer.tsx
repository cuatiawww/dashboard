'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Flame,
  HeartPulse,
  HelpCircle,
  Hospital,
  Layers,
  Loader2,
  Maximize,
  Minimize,
  Radio,
  RefreshCw,
  ShieldAlert,
  Skull,
  Stethoscope,
  Users,
  Volume2,
  VolumeX,
  Waves,
  Zap,
  MapPin,
} from 'lucide-react'
import TvLayerServicesDrawer, { TvLayerState } from './TvLayerServicesDrawer'
import type { TvNttMapEngineRef } from './TvNttMapEngine'

const TvNttMapEngine = dynamic(() => import('./TvNttMapEngine'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-4">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-400" />
        <p className="text-sm font-black tracking-widest text-teal-300 uppercase">
          Memuat Video Wall Command Center EOC Gempa NTT...
        </p>
      </div>
    </div>
  ),
})

const DEFAULT_LAYERS: TvLayerState = {
  baseMap: 'dark',
  bnpbBanjir: false,
  bnpbGempa: true,
  bnpbLongsor: false,
  bnpbKarhutla: false,
  bnpbHillshade: true,
  bnpbKepadatan: false,
  bnpbAdmin: true,
  showWindy: true,
  showFaskes: true,
  showPosko: true,
  showTck: true,
  showChoropleth: true,
  showMarkers: true,
}

const REFRESH_INTERVAL_SECONDS = 60
const KAB_TOUR_INTERVAL_SECONDS = 20

// 8 Kabupaten Utama Terdampak di Daratan Flores & Kepulauan NTT
const NTT_KABUPATEN_DATA = [
  {
    nama: 'Sikka',
    ibukota: 'Maumere',
    zona: 'Zona Merah',
    zonaBg: 'bg-red-500/20 text-red-400 border-red-500/40',
    meninggal: 38,
    luka: 480,
    pengungsi: 14820,
    faskes_rusak: 8,
    rs_utama: 'RSUD dr. TC Hillers Maumere',
    lat: -8.62,
    lng: 122.21,
  },
  {
    nama: 'Flores Timur',
    ibukota: 'Larantuka',
    zona: 'Zona Merah',
    zonaBg: 'bg-red-500/20 text-red-400 border-red-500/40',
    meninggal: 3,
    luka: 41,
    pengungsi: 1450,
    faskes_rusak: 0,
    rs_utama: 'RSUD dr. Hendrikus Fernandez Larantuka',
    lat: -8.33,
    lng: 122.98,
  },
  {
    nama: 'Manggarai Timur',
    ibukota: 'Borong',
    zona: 'Zona Merah',
    zonaBg: 'bg-red-500/20 text-red-400 border-red-500/40',
    meninggal: 12,
    luka: 128,
    pengungsi: 8450,
    faskes_rusak: 2,
    rs_utama: 'RSUD Borong',
    lat: -8.65,
    lng: 120.57,
  },
  {
    nama: 'Manggarai',
    ibukota: 'Ruteng',
    zona: 'Zona Oranye',
    zonaBg: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    meninggal: 14,
    luka: 168,
    pengungsi: 10083,
    faskes_rusak: 2,
    rs_utama: 'RSUD dr. Ben Mboi Ruteng',
    lat: -8.62,
    lng: 120.46,
  },
  {
    nama: 'Ende',
    ibukota: 'Ende',
    zona: 'Zona Kuning',
    zonaBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    meninggal: 6,
    luka: 110,
    pengungsi: 1820,
    faskes_rusak: 0,
    rs_utama: 'RSUD Ende',
    lat: -8.84,
    lng: 121.65,
  },
  {
    nama: 'Nagekeo',
    ibukota: 'Mbay',
    zona: 'Zona Oranye',
    zonaBg: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    meninggal: 5,
    luka: 76,
    pengungsi: 6221,
    faskes_rusak: 1,
    rs_utama: 'RSD Aeramo Nagekeo',
    lat: -8.70,
    lng: 121.28,
  },
  {
    nama: 'Ngada',
    ibukota: 'Bajawa',
    zona: 'Zona Kuning',
    zonaBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    meninggal: 0,
    luka: 24,
    pengungsi: 842,
    faskes_rusak: 1,
    rs_utama: 'RSUD Bajawa',
    lat: -8.78,
    lng: 120.97,
  },
  {
    nama: 'Manggarai Barat',
    ibukota: 'Labuan Bajo',
    zona: 'Zona Siaga',
    zonaBg: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    meninggal: 0,
    luka: 12,
    pengungsi: 0,
    faskes_rusak: 0,
    rs_utama: 'RSUD Komodo Labuan Bajo',
    lat: -8.56,
    lng: 119.98,
  },
]

export default function TvNttGempaDashboardContainer() {
  const mapEngineRef = useRef<TvNttMapEngineRef | null>(null)

  // UI States
  const [isLoading, setIsLoading] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [layers, setLayers] = useState<TvLayerState>(DEFAULT_LAYERS)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS)
  const [autoTour, setAutoTour] = useState(false)
  const [currentTourKab, setCurrentTourKab] = useState<string | null>(null)
  const [activeLeftTab, setActiveLeftTab] = useState<'gempa' | 'faskes' | 'posko'>('gempa')
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const tourIndexRef = useRef(0)

  // Realtime Clock (WITA Time)
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // WITA is UTC+8
      const utc = now.getTime() + now.getTimezoneOffset() * 60000
      const witaDate = new Date(utc + 3600000 * 8)

      const h = String(witaDate.getHours()).padStart(2, '0')
      const m = String(witaDate.getMinutes()).padStart(2, '0')
      const s = String(witaDate.getSeconds()).padStart(2, '0')
      setTimeStr(`${h}:${m}:${s} WITA`)

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      setDateStr(`${days[witaDate.getDay()]}, ${witaDate.getDate()} ${months[witaDate.getMonth()]} ${witaDate.getFullYear()}`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  // Audio Siren
  const playSiren = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(780, ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.8)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch {}
  }, [soundEnabled])

  // Data States
  const [seismicCatalog, setSeismicCatalog] = useState<any[]>([])
  const [faskesList, setFaskesList] = useState<any[]>([])
  const [poskoList, setPoskoList] = useState<any[]>([])
  const [nakesSummary, setNakesSummary] = useState({
    dokter_umum: 142,
    dokter_spesialis: 48,
    perawat: 580,
    bidan: 420,
    farmasi: 65,
  })

  // Fetch Live Real Data for NTT Gempa
  const fetchNttData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 1. Fetch USGS / Real Seismic Catalog
      const usgsRes = await fetch('/api/usgs-gempa?latitude=-8.34&longitude=122.98&maxradiuskm=250').catch(() => null)
      if (usgsRes && usgsRes.ok) {
        const ujson = await usgsRes.json()
        if (Array.isArray(ujson?.earthquakes) && ujson.earthquakes.length > 0) {
          setSeismicCatalog(ujson.earthquakes)
        } else {
          // Fallback realistic catalog
          setSeismicCatalog([
            { id: 'eq-main', lat: -8.3421, lng: 122.9814, magnitude: 7.4, depth: 10, place: 'Laut Flores - NTT (Utara Flores Timur)', time: '15 Agu 2026 09:18:22 WITA', isMainshock: true },
            { id: 'eq-s1', lat: -8.2910, lng: 122.8540, magnitude: 5.8, depth: 12, place: '72 km Timur Laut Maumere', time: '15 Agu 2026 10:45:10 WITA' },
            { id: 'eq-s2', lat: -8.4120, lng: 122.7210, magnitude: 5.5, depth: 15, place: '45 km Barat Laut Larantuka', time: '15 Agu 2026 13:12:00 WITA' },
            { id: 'eq-s3', lat: -8.2150, lng: 123.1120, magnitude: 5.1, depth: 10, place: '80 km Utara Adonara', time: '16 Agu 2026 02:22:45 WITA' },
            { id: 'eq-s4', lat: -8.5100, lng: 121.9800, magnitude: 4.9, depth: 18, place: 'Teluk Maumere - Sikka', time: '16 Agu 2026 08:04:12 WITA' },
            { id: 'eq-s5', lat: -8.3800, lng: 122.4500, magnitude: 4.7, depth: 14, place: 'Laut Flores Bagian Tengah', time: '17 Agu 2026 14:50:33 WITA' },
            { id: 'eq-s6', lat: -8.6200, lng: 121.1500, magnitude: 4.6, depth: 10, place: 'Pesisir Utara Nagekeo', time: '18 Agu 2026 19:10:05 WITA' },
            { id: 'eq-s7', lat: -8.4400, lng: 120.8200, magnitude: 4.5, depth: 16, place: 'Laut Flores Utara Ruteng', time: '19 Agu 2026 11:25:40 WITA' },
          ])
        }
      }

      // 2. Fetch Faskes NTT
      const faskesRes = await fetch('/api/faskes-kapasitas?kabupaten=FLORES%20TIMUR').catch(() => null)
      if (faskesRes && faskesRes.ok) {
        const fjson = await faskesRes.json()
        if (Array.isArray(fjson?.data)) {
          setFaskesList(fjson.data)
        }
      }

      // 3. Realistic Posko List
      setPoskoList([
        { id: 'p-1', nama: 'Posko Induk Lapangan Larantuka', kecamatan: 'Larantuka', kabupaten: 'Flores Timur', pengungsi: 1450, latitude: -8.34, longitude: 122.98 },
        { id: 'p-2', nama: 'Posko Medis Darurat Gelora Samador', kecamatan: 'Alok', kabupaten: 'Sikka', pengungsi: 5200, latitude: -8.62, longitude: 122.21 },
        { id: 'p-3', nama: 'Posko Pengungsian Stadion Borong', kecamatan: 'Borong', kabupaten: 'Manggarai Timur', pengungsi: 3400, latitude: -8.65, longitude: 120.57 },
        { id: 'p-4', nama: 'Posko Tanggap Darurat Ruteng', kecamatan: 'Langke Rembong', kabupaten: 'Manggarai', pengungsi: 4100, latitude: -8.62, longitude: 120.46 },
        { id: 'p-5', nama: 'Posko Evakuasi Mbay', kecamatan: 'Aesesa', kabupaten: 'Nagekeo', pengungsi: 2100, latitude: -8.70, longitude: 121.28 },
      ])
    } catch (e) {
      console.warn('Error fetching NTT TV data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNttData()
  }, [fetchNttData])

  // Refresh Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchNttData()
          return REFRESH_INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchNttData])

  // Auto Tour Across NTT Regencies
  useEffect(() => {
    if (!autoTour) return

    const interval = setInterval(() => {
      const idx = tourIndexRef.current % (NTT_KABUPATEN_DATA.length + 1)
      tourIndexRef.current += 1

      if (idx === 0) {
        setCurrentTourKab(null)
        mapEngineRef.current?.resetView()
      } else {
        const kab = NTT_KABUPATEN_DATA[idx - 1]
        setCurrentTourKab(kab.nama)
        mapEngineRef.current?.focusKabupaten(kab.nama)
      }
    }, KAB_TOUR_INTERVAL_SECONDS * 1000)

    return () => clearInterval(interval)
  }, [autoTour])

  // Select Seismic Point
  const handleSelectSeismic = (eq: any) => {
    if (eq.lat && eq.lng) {
      mapEngineRef.current?.flyTo(eq.lng, eq.lat, 11)
      playSiren()
    }
  }

  // Select Kabupaten
  const handleSelectKab = (kab: any) => {
    setCurrentTourKab(kab.nama)
    mapEngineRef.current?.focusKabupaten(kab.nama)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-roboto select-none">
      {/* ── 1. FULLSCREEN OPENLAYERS NTT MAP ENGINE ── */}
      <TvNttMapEngine
        ref={mapEngineRef}
        seismicPoints={seismicCatalog}
        faskesList={faskesList}
        poskoList={poskoList}
        layers={layers}
        onSelectSeismic={handleSelectSeismic}
      />

      {/* ── 2. TOP FLOATING COMMAND HUD ── */}
      <header className="fixed top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-40 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Identity & Back */}
        <div className="flex items-center gap-2.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-2xl">
          <Link
            href="/dashboard-eoc/gempa-ntt"
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 transition-all hover:scale-105"
            title="Kembali ke Dashboard Gempa NTT"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="h-6 w-px bg-slate-700/80 mx-0.5" />

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/90 shadow-md border border-red-400">
              <Zap className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40">
                  LIVE SITREP EOC
                </span>
                <span className="text-[11px] font-black text-amber-400">
                  TANGGAP DARURAT
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-black text-white tracking-tight uppercase leading-none mt-1">
                GEMPA BUMI M 7.4 LAUT FLORES — PROV. NUSA TENGGARA TIMUR
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Controls & Time */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-2xl">
          {/* Clock */}
          <div className="text-right pr-2 border-r border-slate-700/80 hidden sm:block">
            <div className="text-xs sm:text-sm font-black text-teal-400 font-mono tracking-wider">
              {timeStr}
            </div>
            <div className="text-[10px] text-slate-400 font-bold">
              {dateStr}
            </div>
          </div>

          {/* Auto Tour Toggle */}
          <button
            type="button"
            onClick={() => setAutoTour(!autoTour)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              autoTour
                ? 'bg-teal-600/30 text-teal-300 border-teal-500/60 animate-pulse shadow-md'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Auto-Tour Fokus per Kabupaten NTT secara bergantian"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Tour Wilayah: {autoTour ? (currentTourKab || 'Semua NTT') : 'OFF'}</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) playSiren()
            }}
            className={`p-2 rounded-xl transition-all border ${
              soundEnabled
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/60'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Alarm Suara EWS"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Layers Drawer Toggle */}
          <button
            type="button"
            onClick={() => setLayersOpen(!layersOpen)}
            className={`p-2 rounded-xl transition-all border ${
              layersOpen
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Pengaturan Layer & Layanan Peta"
          >
            <Layers className="h-4 w-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:text-white"
            title="Toggle Layar Penuh (Fullscreen)"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          {/* Refresh Progress Button */}
          <button
            type="button"
            onClick={fetchNttData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            title="Perbarui Data Realtime"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-mono text-[11px]">{refreshCountdown}s</span>
          </button>
        </div>
      </header>

      {/* ── 3. TOP 5 FLOATING KPI CARDS ── */}
      <div className="fixed top-16 left-2 right-2 sm:top-18 sm:left-3 sm:right-3 z-30 pointer-events-none">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-7xl mx-auto">
          {/* KPI 1: Korban Jiwa */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-red-500/40 shadow-xl flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
              <Skull className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                Total Korban Jiwa
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-red-400 leading-none">1.051</span>
                <span className="text-[10px] font-bold text-slate-400">Jiwa</span>
              </div>
              <span className="text-[9.5px] font-extrabold text-red-300 block truncate mt-0.5">
                78 MD • 970 Luka • 3 Hilang
              </span>
            </div>
          </div>

          {/* KPI 2: Pengungsi */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-sky-500/40 shadow-xl flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                Pengungsi &amp; Posko
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-sky-400 leading-none">43.686</span>
                <span className="text-[10px] font-bold text-slate-400">Jiwa</span>
              </div>
              <span className="text-[9.5px] font-bold text-sky-300 block truncate mt-0.5">
                400 Titik Posko Terdata
              </span>
            </div>
          </div>

          {/* KPI 3: Faskes Siaga */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/40 shadow-xl flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Hospital className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                Kesiapan Faskes
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-indigo-400 leading-none">14</span>
                <span className="text-[10px] font-bold text-slate-400">Rusak</span>
              </div>
              <span className="text-[9.5px] font-bold text-emerald-400 block truncate mt-0.5">
                8 RS Rujukan Operasional
              </span>
            </div>
          </div>

          {/* KPI 4: Kelompok Rentan */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-amber-500/40 shadow-xl flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                Kelompok Rentan
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-amber-400 leading-none">21.980</span>
                <span className="text-[10px] font-bold text-slate-400">Jiwa</span>
              </div>
              <span className="text-[9.5px] font-bold text-amber-300 block truncate mt-0.5">
                10.8k Balita • 8.9k Lansia • 2.1k Bumil
              </span>
            </div>
          </div>

          {/* KPI 5: Relawan TCK */}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-xl flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                Relawan TCK Medis
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">142</span>
                <span className="text-[10px] font-bold text-slate-400">Nakes Siaga</span>
              </div>
              <span className="text-[9.5px] font-bold text-emerald-300 block truncate mt-0.5">
                Dokter, EMT &amp; Tim Medis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. LEFT FLOATING THREAT & SEISMIC DECK ── */}
      <aside
        className={`fixed top-38 sm:top-40 left-2 sm:left-3 bottom-12 z-30 flex flex-col transition-all duration-300 pointer-events-auto ${
          isLeftCollapsed ? 'w-12' : 'w-80 sm:w-96'
        }`}
      >
        <div className="relative h-full flex flex-col bg-slate-900/92 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/60">
            {!isLeftCollapsed && (
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Live Feed Seismik &amp; Faskes NTT
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 ml-auto"
            >
              {isLeftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {!isLeftCollapsed && (
            <>
              {/* Tab Selector */}
              <div className="grid grid-cols-3 p-1.5 gap-1 bg-slate-950/40 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('gempa')}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                    activeLeftTab === 'gempa'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Seismik ({seismicCatalog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('faskes')}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                    activeLeftTab === 'faskes'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Faskes Siaga
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLeftTab('posko')}
                  className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                    activeLeftTab === 'posko'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Posko ({poskoList.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                {activeLeftTab === 'gempa' && (
                  <div className="space-y-2">
                    {seismicCatalog.map((eq, i) => {
                      const isMain = eq.isMainshock || i === 0
                      const mag = eq.magnitude || 4.5
                      return (
                        <div
                          key={eq.id || i}
                          onClick={() => handleSelectSeismic(eq)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] ${
                            isMain
                              ? 'bg-red-950/50 border-red-500/60 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-black ${
                                isMain
                                  ? 'bg-red-600 text-white'
                                  : mag >= 5.0
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-amber-500/80 text-slate-900'
                              }`}
                            >
                              M {mag.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kedalaman: {eq.depth || 10} km
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-100 mt-1.5 line-clamp-1">
                            {eq.place || 'Laut Flores - NTT'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span>{eq.time || '15 Agu 2026'}</span>
                            <span className="text-teal-400 font-bold hover:underline">Fokus Peta ↗</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeLeftTab === 'faskes' && (
                  <div className="space-y-2">
                    {NTT_KABUPATEN_DATA.map((k, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-500 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-300">
                            {k.rs_utama}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Siaga 24 Jam
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Wilayah: Kab. {k.nama} • IGD &amp; Tim Bedah Trauma Siaga
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeLeftTab === 'posko' && (
                  <div className="space-y-2">
                    {poskoList.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (p.latitude && p.longitude) mapEngineRef.current?.flyTo(p.longitude, p.latitude, 12)
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-sky-300">
                            {p.nama}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            {p.pengungsi?.toLocaleString('id-ID')} Jiwa
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Kec. {p.kecamatan}, Kab. {p.kabupaten}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── 5. RIGHT FLOATING ANALYTICS & KABUPATEN MATRIX DECK ── */}
      <aside
        className={`fixed top-38 sm:top-40 right-2 sm:right-3 bottom-12 z-30 flex flex-col transition-all duration-300 pointer-events-auto ${
          isRightCollapsed ? 'w-12' : 'w-80 sm:w-96'
        }`}
      >
        <div className="relative h-full flex flex-col bg-slate-900/92 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/60">
            <button
              type="button"
              onClick={() => setIsRightCollapsed(!isRightCollapsed)}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 mr-auto"
            >
              {isRightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {!isRightCollapsed && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Matriks 8 Kabupaten NTT
                </span>
              </div>
            )}
          </div>

          {!isRightCollapsed && (
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar">
              {/* Kabupaten Impact Cards List */}
              <div className="space-y-2">
                {NTT_KABUPATEN_DATA.map((kab, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectKab(kab)}
                    className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-teal-500 transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-teal-400 group-hover:animate-bounce" />
                        <span className="text-xs font-black text-white">
                          Kab. {kab.nama}
                        </span>
                      </div>
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${kab.zonaBg}`}>
                        {kab.zona}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2 text-center bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Meninggal</span>
                        <span className="text-xs font-black text-red-400">{kab.meninggal}</span>
                      </div>
                      <div className="border-x border-slate-800 px-1">
                        <span className="text-[9px] text-slate-400 block uppercase">Luka-Luka</span>
                        <span className="text-xs font-black text-amber-400">{kab.luka}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Pengungsi</span>
                        <span className="text-xs font-black text-sky-400">{kab.pengungsi.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Nakes Capacity Summary */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/30">
                <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Stethoscope className="h-3.5 w-3.5 text-indigo-400" />
                  Kapasitas Nakes Siaga Se-Daratan Flores
                </span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block uppercase">Dokter Spesialis</span>
                    <span className="text-sm font-black text-indigo-400">48 Orang</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block uppercase">Dokter Umum</span>
                    <span className="text-sm font-black text-blue-400">142 Orang</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block uppercase">Perawat &amp; EMT</span>
                    <span className="text-sm font-black text-emerald-400">580 Orang</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-400 block uppercase">Bidan Gawat Darurat</span>
                    <span className="text-sm font-black text-amber-400">420 Orang</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── 6. LAYER SERVICES DRAWER ── */}
      <TvLayerServicesDrawer
        isOpen={layersOpen}
        onClose={() => setLayersOpen(false)}
        layers={layers}
        onUpdateLayer={(key, val) => setLayers((prev) => ({ ...prev, [key]: val }))}
        onResetLayers={() => setLayers(DEFAULT_LAYERS)}
      />

      {/* ── 7. BOTTOM RUNNING TICKER ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 flex items-center px-3 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-700 bg-red-600 text-white px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm">
          <Radio className="h-3 w-3 animate-pulse" />
          ALERT EOC
        </div>

        <div className="flex-1 overflow-hidden whitespace-nowrap ml-3">
          <div className="inline-block animate-marquee text-xs font-bold text-slate-200 tracking-wide">
            <span className="text-amber-400 font-black">[PUSAT KRISIS KESEHATAN KEMENKES RI]</span> Status Tanggap Darurat Bencana Gempa Bumi Tektonik M 7.4 Laut Flores • Pos Komando Klaster Kesehatan Dinkes Prov. NTT Aktif Penuh 24 Jam • Rujukan Pasien Triase Merah diprioritaskan ke RSUD dr. TC Hillers Maumere &amp; RSUD dr. Ben Mboi Ruteng • Buffer Stock Logistik Medis &amp; Obat Gawat Darurat telah didistribusikan ke Posko Lapangan • Hotline Emergency Call Center EOC Kemenkes: 119 ext. 8 / (021) 5210411.
          </div>
        </div>
      </footer>
    </div>
  )
}
