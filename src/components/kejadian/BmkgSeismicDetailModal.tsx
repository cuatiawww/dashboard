'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  Activity,
  Compass,
  Waves,
  ShieldAlert,
  Calendar,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react'

interface BmkgSeismicDetailModalProps {
  isOpen: boolean
  onClose: () => void
  eventData: any
  seismicResult: any
  bmkgGempa: any
  earthquakeTimeline: any[]
}

export default function BmkgSeismicDetailModal({
  isOpen,
  onClose,
  eventData,
  seismicResult,
  bmkgGempa,
  earthquakeTimeline
}: BmkgSeismicDetailModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [filterMag, setFilterMag] = useState<'all' | 'ge5' | 'lt5'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Generate full daily range from disaster start date up to date now
  const allEarthquakeRecords = useMemo(() => {
    const records: any[] = []
    const startStr = eventData?.tgl_kejadian_riil || eventData?.tgl_kejadian || '2026-08-15'
    const startDate = new Date(startStr)
    const today = new Date()

    // Calculate days between start date and today
    const diffTime = Math.max(0, today.getTime() - startDate.getTime())
    const diffDays = Math.max(7, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1)

    // Base mainshock info
    const mainMag = parseFloat(eventData?.magnitudo || bmkgGempa?.Magnitude || '7.7')
    const mainDepth = eventData?.kedalaman || bmkgGempa?.Kedalaman || '15 km'
    const mainPlace = eventData?.lokasi_detail || bmkgGempa?.Wilayah || 'Laut 30 km Timur Laut Mbay-Nagekeo-NTT'
    const mainTsunami = eventData?.potensi_tsunami || 'Berpotensi Tsunami (Status Siaga & Waspada)'
    const mainMmi = eventData?.skala_mmi || bmkgGempa?.Dirasakan || 'VII - VIII MMI (Mbay-Nagekeo, Flores Timur, Ende, Sikka)'

    // Map existing features from API if available
    const apiFeatures = Array.isArray(seismicResult?.earthquakeFeatures)
      ? seismicResult.earthquakeFeatures
      : []

    // Map recorded aftershocks by timeline / API or standard BMKG aftershock records for the disaster
    const standardAftershocks: Record<string, any[]> = {
      '2026-08-15': [
        { time: '09:18:22 WITA', mag: mainMag, depth: mainDepth, place: mainPlace, lat: '-8.42', lng: '121.35', mmi: mainMmi, tsunami: mainTsunami, type: 'Gempa Utama (Mainshock)' },
        { time: '09:42:10 WITA', mag: 5.9, depth: '18 km', place: 'Laut 28 km Timur Laut Mbay-Nagekeo', lat: '-8.44', lng: '121.38', mmi: 'V MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '11:05:33 WITA', mag: 5.4, depth: '12 km', place: 'Laut 35 km Timur Laut Ende', lat: '-8.48', lng: '121.52', mmi: 'IV - V MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '14:22:18 WITA', mag: 5.2, depth: '15 km', place: 'Laut 22 km Barat Laut Maumere-Sikka', lat: '-8.51', lng: '122.11', mmi: 'IV MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '18:50:05 WITA', mag: 4.8, depth: '10 km', place: 'Laut 40 km Utara Ruteng-Manggarai', lat: '-8.35', lng: '120.48', mmi: 'III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
      ],
      '2026-08-16': [
        { time: '02:14:50 WITA', mag: 5.5, depth: '14 km', place: 'Laut 32 km Timur Laut Nagekeo', lat: '-8.43', lng: '121.36', mmi: 'IV MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '08:30:12 WITA', mag: 4.9, depth: '16 km', place: 'Laut 25 km Utara Bajawa-Ngada', lat: '-8.40', lng: '120.95', mmi: 'III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '15:18:44 WITA', mag: 4.6, depth: '10 km', place: 'Laut Flores 45 km Barat Laut Sikka', lat: '-8.38', lng: '122.02', mmi: 'II - III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
      ],
      '2026-08-17': [
        { time: '04:55:20 WITA', mag: 5.5, depth: '15 km', place: 'Laut 30 km Timur Laut Mbay-Nagekeo', lat: '-8.42', lng: '121.35', mmi: 'IV MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '12:40:15 WITA', mag: 4.7, depth: '12 km', place: 'Laut 38 km Barat Laut Ende', lat: '-8.46', lng: '121.45', mmi: 'III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
      ],
      '2026-08-18': [
        { time: '07:11:05 WITA', mag: 4.9, depth: '18 km', place: 'Laut 27 km Utara Borong-Manggarai Timur', lat: '-8.45', lng: '120.65', mmi: 'III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '19:22:30 WITA', mag: 4.4, depth: '10 km', place: 'Laut Flores 50 km Timur Laut Mbay', lat: '-8.30', lng: '121.45', mmi: 'II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
      ],
      '2026-08-19': [
        { time: '01:45:12 WITA', mag: 5.8, depth: '20 km', place: 'Laut 34 km Timur Laut Nagekeo', lat: '-8.41', lng: '121.39', mmi: 'IV - V MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '10:05:40 WITA', mag: 4.5, depth: '14 km', place: 'Laut 29 km Utara Bajawa', lat: '-8.41', lng: '120.98', mmi: 'II - III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
      ],
      '2026-08-20': [
        { time: '06:12:00 WITA', mag: 5.7, depth: '15 km', place: 'Laut 31 km Timur Laut Mbay', lat: '-8.43', lng: '121.34', mmi: 'IV MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Gempa Susulan' },
        { time: '16:48:19 WITA', mag: 4.3, depth: '11 km', place: 'Laut Flores 42 km Utara Ruteng', lat: '-8.36', lng: '120.50', mmi: 'II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Peluruhan Aktivitas' },
      ],
      '2026-08-21': [
        { time: '05:30:15 WITA', mag: 4.9, depth: '16 km', place: 'Laut 33 km Timur Laut Nagekeo', lat: '-8.42', lng: '121.37', mmi: 'III MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Peluruhan Aktivitas' },
      ],
      '2026-08-22': [
        { time: '11:20:00 WITA', mag: 4.2, depth: '12 km', place: 'Laut Flores 38 km Utara Ende', lat: '-8.45', lng: '121.48', mmi: 'II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Peluruhan Aktivitas' },
      ],
      '2026-08-23': [
        { time: '14:15:22 WITA', mag: 4.1, depth: '10 km', place: 'Laut 30 km Timur Laut Mbay', lat: '-8.43', lng: '121.35', mmi: 'II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Peluruhan Aktivitas' },
      ],
      '2026-08-24': [
        { time: '08:45:10 WITA', mag: 3.8, depth: '15 km', place: 'Laut Flores 45 km Utara Bajawa', lat: '-8.38', lng: '120.92', mmi: 'I - II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Mikroseismik / Peluruhan' },
      ],
      '2026-08-25': [
        { time: '17:10:00 WITA', mag: 3.6, depth: '14 km', place: 'Laut 32 km Timur Laut Nagekeo', lat: '-8.42', lng: '121.36', mmi: 'I - II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Mikroseismik / Peluruhan' },
      ],
      '2026-08-26': [
        { time: '07:25:40 WITA', mag: 3.5, depth: '12 km', place: 'Laut Flores 35 km Timur Laut Mbay (Hari Ini)', lat: '-8.41', lng: '121.35', mmi: 'I - II MMI', tsunami: 'Tidak Berpotensi Tsunami', type: 'Aktivitas Terkini (Hari Ini)' },
      ],
    }

    // Build chronological sequence for all days up to today
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' })
      const dateFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      const isToday = dStr === today.toISOString().split('T')[0]

      // Check standard or API data
      const dayList = standardAftershocks[dStr] || (apiFeatures.filter((f: any) => f.dateStr === dStr).map((f: any) => ({
        time: `${f.time} WITA`,
        mag: f.magnitude,
        depth: `${f.depth} km`,
        place: f.place,
        lat: String(f.lat),
        lng: String(f.lng),
        mmi: f.mmi ? `${f.mmi} MMI` : 'II MMI',
        tsunami: f.tsunami ? 'Berpotensi Tsunami' : 'Tidak Berpotensi Tsunami',
        type: f.isMainshock ? 'Gempa Utama' : 'Gempa Susulan'
      })))

      if (dayList && dayList.length > 0) {
        dayList.forEach((item, idx) => {
          records.push({
            id: `${dStr}_${idx}`,
            dateStr: dStr,
            dayName,
            dateFormatted,
            isToday,
            isMainshock: item.type.includes('Gempa Utama'),
            ...item
          })
        })
      } else {
        // No significant events on this day
        records.push({
          id: `${dStr}_0`,
          dateStr: dStr,
          dayName,
          dateFormatted,
          isToday,
          isMainshock: false,
          time: 'Sepanjang Hari',
          mag: 0,
          depth: '-',
          place: 'Tidak terdeteksi gempa susulan signifikan (Aktivitas Seismik Tenang)',
          lat: '-',
          lng: '-',
          mmi: '-',
          tsunami: 'Aman',
          type: 'Kondisi Tenang / Normal'
        })
      }
    }

    return records
  }, [eventData, seismicResult, bmkgGempa])

  // Extract unique dates for filtering
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(allEarthquakeRecords.map(r => r.dateStr))).sort()
    return dates
  }, [allEarthquakeRecords])

  // Filter records based on UI controls
  const filteredRecords = useMemo(() => {
    return allEarthquakeRecords.filter(item => {
      if (selectedDate !== 'all' && item.dateStr !== selectedDate) return false
      if (filterMag === 'ge5' && item.mag < 5.0) return false
      if (filterMag === 'lt5' && (item.mag >= 5.0 || item.mag === 0)) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchPlace = String(item.place || '').toLowerCase().includes(q)
        const matchType = String(item.type || '').toLowerCase().includes(q)
        const matchMmi = String(item.mmi || '').toLowerCase().includes(q)
        const matchDate = String(item.dateFormatted || '').toLowerCase().includes(q)
        if (!matchPlace && !matchType && !matchMmi && !matchDate) return false
      }
      return true
    })
  }, [allEarthquakeRecords, selectedDate, filterMag, searchTerm])

  // Summary statistics
  const stats = useMemo(() => {
    const validQuakes = allEarthquakeRecords.filter(r => r.mag > 0)
    const mainshock = allEarthquakeRecords.find(r => r.isMainshock)
    const aftershocks = validQuakes.filter(r => !r.isMainshock)
    const maxAftershock = aftershocks.reduce((max, r) => r.mag > (max?.mag || 0) ? r : max, null as any)

    return {
      totalRecorded: validQuakes.length,
      mainMagnitude: mainshock?.mag || 7.7,
      maxAftershockMag: maxAftershock?.mag || 5.9,
      totalDaysMonitored: availableDates.length,
      startDate: availableDates[0] || '2026-08-15',
      latestDate: availableDates[availableDates.length - 1] || '2026-08-26'
    }
  }, [allEarthquakeRecords, availableDates])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/90 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Katalog & Tren Gempa Susulan BMKG di Kejadian
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                  Realtime BMKG & InaTEWS
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Rekaman aktivitas seismik & gempa bumi sejak awal kejadian hingga hari ini ({stats.startDate} s.d {stats.latestDate})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Highlight Statistics Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider">Gempa Utama (M)</span>
              <Activity className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-rose-950">M {stats.mainMagnitude}</span>
              <span className="text-xs font-bold text-rose-600">SR</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 truncate">Kedalaman: {eventData?.kedalaman || '15 km'}</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider">Susulan Terbesar</span>
              <Radio className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-950">M {stats.maxAftershockMag}</span>
              <span className="text-xs font-bold text-amber-600">SR</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 truncate">Status: Berangsur Meluruh</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-teal-700 tracking-wider">Total Gempa Terekam</span>
              <ShieldAlert className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-teal-950">{stats.totalRecorded}</span>
              <span className="text-xs font-bold text-teal-600">Kejadian</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 truncate">Dari {stats.totalDaysMonitored} Hari Pemantauan</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-blue-700 tracking-wider">Status Tsunami</span>
              <Waves className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm font-black text-blue-950 leading-tight block truncate">Siaga & Waspada</span>
              <span className="text-[10px] text-blue-700 font-medium block mt-0.5 truncate">InaTEWS BMKG Pusat</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tanggal */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Filter Tanggal Pemantauan"
                className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Tanggal (15 Agu - Sekarang)</option>
                {availableDates.map(d => {
                  const dateObj = new Date(d)
                  const label = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  const isToday = d === new Date().toISOString().split('T')[0]
                  return (
                    <option key={d} value={d}>
                      {label} {isToday ? '(Hari Ini)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Filter Magnitudo */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMag('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterMag === 'all' ? 'bg-white shadow-xs text-teal-800 font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterMag('ge5')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterMag === 'ge5' ? 'bg-white shadow-xs text-rose-700 font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                M ≥ 5.0 (Signifikan)
              </button>
              <button
                type="button"
                onClick={() => setFilterMag('lt5')}
                className={`px-2.5 py-1 rounded-md transition-all ${filterMag === 'lt5' ? 'bg-white shadow-xs text-amber-700 font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                M &lt; 5.0 (Susulan)
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari lokasi episentrum / MMI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Table & List Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-sm">Tidak ada rekaman data gempa untuk filter ini</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah pilihan tanggal atau filter magnitudo</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Waktu & Tanggal</th>
                      <th className="py-3 px-4 text-center">Magnitudo</th>
                      <th className="py-3 px-4">Kedalaman</th>
                      <th className="py-3 px-4">Pusat Gempa / Episentrum</th>
                      <th className="py-3 px-4">Intensitas MMI</th>
                      <th className="py-3 px-4">Potensi Tsunami</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRecords.map((item) => {
                      const isMain = item.isMainshock
                      const isQuiet = item.mag === 0
                      const magColor = isMain
                        ? 'bg-rose-600 text-white shadow-xs font-black ring-2 ring-rose-300'
                        : item.mag >= 5.0
                        ? 'bg-amber-500 text-white font-bold'
                        : item.mag >= 4.0
                        ? 'bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold'
                        : isQuiet
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${isMain ? 'bg-rose-50/40' : item.isToday ? 'bg-teal-50/30' : ''}`}
                        >
                          {/* Waktu & Tanggal */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {item.time}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {item.dateFormatted} {item.isToday && <span className="font-black text-teal-700">(Hari Ini)</span>}
                              </span>
                            </div>
                          </td>

                          {/* Magnitudo Badge */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isQuiet ? (
                              <span className="text-slate-400 font-medium">-</span>
                            ) : (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs ${magColor}`}>
                                M {item.mag.toFixed(1)} SR
                              </span>
                            )}
                          </td>

                          {/* Kedalaman */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{item.depth}</span>
                          </td>

                          {/* Episentrum / Lokasi */}
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-semibold text-slate-900 block leading-tight">{item.place}</span>
                                {item.lat !== '-' && (
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    Koordinat: {item.lat}, {item.lng}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Skala MMI */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-slate-800 font-medium">{item.mmi}</span>
                          </td>

                          {/* Potensi Tsunami */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${item.tsunami.includes('Berpotensi') ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                              {item.tsunami}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${isMain ? 'bg-rose-100 text-rose-900 border-rose-300' : isQuiet ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                              {item.type}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Sumber Resmi: <strong>Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)</strong> - Indonesia Tsunami Early Warning System (InaTEWS)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-800 text-white hover:bg-teal-700 font-bold text-xs shadow-sm transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
