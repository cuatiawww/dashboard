'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Flame,
  Waves,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  Activity,
  Hospital,
  Users,
  ShieldAlert,
  Tent,
  Clock,
  Compass,
  ArrowRight,
} from 'lucide-react'
import type { MarkerData, EarthquakePoint } from './TvMapEngine'

interface TvDisasterFeedDeckProps {
  markers?: MarkerData[]
  kabupatenDetailList?: any[]
  wilayahList?: any[]
  earthquakePoints?: EarthquakePoint[]
  summary?: any
  isNttScope?: boolean
  isKpiCollapsed?: boolean
  onSelectDisaster?: (item: any) => void
  onSelectLocation?: (lng: number, lat: number, zoom?: number) => void
  onSelectProvince?: (provName: string) => void
}

export default function TvDisasterFeedDeck({
  markers = [],
  kabupatenDetailList = [],
  wilayahList = [],
  earthquakePoints = [],
  summary,
  isNttScope = true,
  isKpiCollapsed = false,
  onSelectDisaster,
  onSelectLocation,
  onSelectProvince,
}: TvDisasterFeedDeckProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'gempa' | 'korban' | 'pengungsi'>('all')

  // Disaster items list builder
  const disasterItems = useMemo(() => {
    if (isNttScope) {
      // In NTT Mode: Build list of 8 disaster-affected kabupatens and seismic points
      const items: any[] = []

      // Add Mainshock Epicenter if available
      const mainshock = earthquakePoints.find((eq) => eq.isMainshock) || earthquakePoints[0]
      if (mainshock) {
        items.push({
          id: 'epicenter-mainshock',
          nama: 'Episentrum Gempa Utama M 7.7',
          jenis: 'Gempa Bumi Utama (M 7.7)',
          kabupaten: 'Mbay - Nagekeo & Laut Flores',
          provinsi: 'NUSA TENGGARA TIMUR',
          status: 'Episentrum Utama',
          statusColor: 'rose',
          lat: mainshock.lat || -8.34,
          lng: mainshock.lng || 122.98,
          kedalaman: '15 km',
          magnitudo: '7.7 SR',
          intensitas: 'VII - VIII MMI',
          waktu: '15 Agu 2026, 09:18:22 WITA',
          isMainshock: true,
          meninggal: summary?.total_meninggal || 24,
          luka: summary?.total_luka || 480,
          pengungsi: summary?.total_pengungsi || 12500,
          type: 'earthquake',
        })
      }

      // Add 8 Kabupaten data from markers / kabupatenDetailList
      if (markers && markers.length > 0) {
        markers.forEach((m) => {
          const detail = kabupatenDetailList.find(
            (k) => (k.nama || '').toLowerCase() === (m.kabupaten || m.nama || '').toLowerCase()
          )

          const kabName = (m.kabupaten || m.nama || '').replace(/^kab\.\s+/i, '').trim()
          
          items.push({
            id: m.id || `kab-${kabName}`,
            nama: `Kabupaten ${kabName}`,
            jenis: 'Gempa Bumi & Kerusakan Wilayah',
            kabupaten: kabName,
            provinsi: 'NUSA TENGGARA TIMUR',
            status: 'Tanggap Darurat',
            statusColor: (m.meninggal || detail?.meninggal || 0) > 0 ? 'rose' : 'amber',
            lat: m.lat,
            lng: m.lng,
            meninggal: m.meninggal || detail?.meninggal || 0,
            luka: m.luka || m.luka_berat || detail?.total_luka || 0,
            luka_berat: m.luka_berat || detail?.luka_berat || 0,
            luka_ringan: m.luka_ringan || detail?.luka_ringan || 0,
            pengungsi: m.pengungsi || detail?.pengungsi || 0,
            terdampak: m.terdampak || detail?.terdampak || 0,
            faskes_terdampak: (m as any).faskes_terdampak || 0,
            titik_posko: detail?.titik_posko || (m as any).titik_posko || 0,
            waktu: m.tgl_kejadian || '15 Agu 2026',
            type: 'disaster',
          })
        })
      } else {
        // Fallback standard 8 kabupaten for NTT
        const ntt8 = [
          { name: 'Flores Timur', lat: -8.3421, lng: 122.9814, m: 12, l: 145, p: 4200 },
          { name: 'Sikka', lat: -8.6214, lng: 122.2155, m: 6, l: 110, p: 3100 },
          { name: 'Ende', lat: -8.8415, lng: 121.6582, m: 4, l: 85, p: 2400 },
          { name: 'Nagekeo', lat: -8.6752, lng: 121.2891, m: 2, l: 60, p: 1200 },
          { name: 'Ngada', lat: -8.7891, lng: 120.9664, m: 0, l: 40, p: 850 },
          { name: 'Manggarai Timur', lat: -8.8033, lng: 120.5982, m: 0, l: 25, p: 450 },
          { name: 'Manggarai', lat: -8.6148, lng: 120.4632, m: 0, l: 15, p: 200 },
          { name: 'Manggarai Barat', lat: -8.5142, lng: 119.8924, m: 0, l: 10, p: 100 },
        ]
        ntt8.forEach((k) => {
          items.push({
            id: `fallback-${k.name}`,
            nama: `Kabupaten ${k.name}`,
            jenis: 'Gempa Bumi & Dampak Kesehatan',
            kabupaten: k.name,
            provinsi: 'NUSA TENGGARA TIMUR',
            status: k.m > 0 ? 'Tanggap Darurat' : 'Siaga Darurat',
            statusColor: k.m > 0 ? 'rose' : 'amber',
            lat: k.lat,
            lng: k.lng,
            meninggal: k.m,
            luka: k.l,
            pengungsi: k.p,
            waktu: '15 Agu 2026',
            type: 'disaster',
          })
        })
      }

      return items
    } else {
      // National Mode: Use raw markers
      return (markers || []).map((m, idx) => ({
        id: m.id || `disaster-${idx}`,
        nama: m.nama || `${m.jenis_bencana || 'Bencana'} ${m.kabupaten || m.provinsi || ''}`,
        jenis: m.jenis_bencana || 'Bencana Alam',
        kabupaten: m.kabupaten || '',
        provinsi: m.provinsi || '',
        status: (m.meninggal || 0) > 0 ? 'Tanggap Darurat' : 'Siaga',
        statusColor: (m.meninggal || 0) > 0 ? 'rose' : 'amber',
        lat: m.lat,
        lng: m.lng,
        meninggal: m.meninggal || 0,
        luka: m.luka || m.luka_berat || 0,
        pengungsi: m.pengungsi || 0,
        terdampak: m.terdampak || 0,
        waktu: m.tgl_kejadian || 'Terkini',
        type: 'disaster',
      }))
    }
  }, [isNttScope, markers, kabupatenDetailList, earthquakePoints, summary])

  // Filtered disaster items
  const filteredDisasters = useMemo(() => {
    return disasterItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.kabupaten && item.kabupaten.toLowerCase().includes(q)) ||
        (item.provinsi && item.provinsi.toLowerCase().includes(q)) ||
        (item.jenis && item.jenis.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (selectedFilter === 'gempa') {
        return (item.jenis || '').toLowerCase().includes('gempa') || item.isMainshock
      }
      if (selectedFilter === 'korban') {
        return (item.meninggal || 0) > 0 || (item.luka || 0) > 0
      }
      if (selectedFilter === 'pengungsi') {
        return (item.pengungsi || 0) > 0
      }

      return true
    })
  }, [disasterItems, searchQuery, selectedFilter])

  return (
    <div
      className={`fixed left-2 sm:left-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-80 sm:w-88 xl:w-96 2xl:w-[420px] max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[192px] sm:top-[198px] 2xl:top-[206px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        
        {/* ── Deck Header ── */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-gradient-to-r from-teal-50/80 via-white to-amber-50/40 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-teal-100 text-[#047D78] border border-teal-200 shadow-xs shrink-0">
                <AlertTriangle className="h-4 w-4 text-[#047D78]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-[13px] font-black tracking-wider text-[#047D78] uppercase truncate">
                    {isNttScope ? 'BENCANA WILAYAH PROV. NTT' : 'KEJADIAN BENCANA DAERAH'}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-[#047D78] text-white shrink-0">
                    {filteredDisasters.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold truncate">
                  {isNttScope ? '8 Kabupaten Terdampak Gempa & Susulan' : 'Pemantauan Spasial Kejadian Aktif'}
                </p>
              </div>
            </div>
          )}

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer shrink-0"
            title={isCollapsed ? 'Buka Panel Bencana' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 text-[#047D78]" /> : <ChevronLeft className="h-4 w-4 text-[#047D78]" />}
          </button>
        </div>

        {/* ── Collapsed Vertical Icon Rail ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-3 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Kejadian Bencana Wilayah"
            >
              <AlertTriangle className="h-4 w-4 text-[#047D78]" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all shadow-xs"
              title="Korban & Faskes"
            >
              <Activity className="h-4 w-4 text-rose-600" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all shadow-xs"
              title="Posko & Pengungsian"
            >
              <Tent className="h-4 w-4 text-purple-600" />
            </button>
          </div>
        ) : (
          <>
            {/* ── Search & Filter Bar ── */}
            <div className="p-2 sm:p-2.5 border-b border-slate-100 bg-white space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kabupaten, daerah, kejadian..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#047D78] focus:bg-white transition-all font-semibold"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedFilter === 'all'
                      ? 'bg-[#047D78] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({disasterItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('gempa')}
                  className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedFilter === 'gempa'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Gempa Bumi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('korban')}
                  className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedFilter === 'korban'
                      ? 'bg-rose-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Korban Jiwa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('pengungsi')}
                  className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedFilter === 'pengungsi'
                      ? 'bg-purple-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pengungsi
                </button>
              </div>
            </div>

            {/* ── Disaster Stream List ── */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2.5 no-scrollbar bg-slate-50/50">
              {filteredDisasters.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                  Tidak ada data bencana wilayah yang cocok.
                </div>
              ) : (
                filteredDisasters.map((item, idx) => {
                  const isMain = item.isMainshock
                  
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        onSelectDisaster?.(item)
                        if (item.lng && item.lat) {
                          onSelectLocation?.(Number(item.lng), Number(item.lat), 11)
                        }
                      }}
                      className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md ${
                        isMain
                          ? 'bg-gradient-to-br from-rose-50/90 via-white to-orange-50/60 border-rose-300 hover:border-rose-400 ring-1 ring-rose-200'
                          : 'bg-white hover:bg-teal-50/40 border-slate-200 hover:border-[#047D78]'
                      }`}
                    >
                      {/* Top Row: Title, Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-xl border shrink-0 ${
                            isMain
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : item.meninggal > 0
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-teal-50 text-[#047D78] border-teal-200'
                          }`}>
                            {isMain ? <Zap className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 group-hover:text-[#047D78] truncate leading-tight">
                              {item.nama}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 font-semibold">
                              <MapPin className="h-3 w-3 text-[#047D78] shrink-0" />
                              <span className="truncate">{item.kabupaten ? `${item.kabupaten}, ${item.provinsi}` : item.provinsi}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${
                          item.statusColor === 'rose'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Mainshock Metrics Detail */}
                      {isMain && (
                        <div className="mt-2 p-2 rounded-xl bg-white/80 border border-rose-100 flex items-center justify-between text-[10px] font-bold">
                          <span className="text-rose-700">Magnitudo: <strong>{item.magnitudo}</strong></span>
                          <span className="text-slate-600">Kedalaman: <strong>{item.kedalaman}</strong></span>
                          <span className="text-slate-600">Intensitas: <strong>{item.intensitas}</strong></span>
                        </div>
                      )}

                      {/* Impact Metrics Grid (4 compact chips) */}
                      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-100">
                          <div className="text-[9px] font-bold text-rose-600 uppercase">Meninggal</div>
                          <div className="text-xs sm:text-sm font-black text-rose-700">{item.meninggal || 0}</div>
                        </div>
                        <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100">
                          <div className="text-[9px] font-bold text-amber-700 uppercase">Luka-luka</div>
                          <div className="text-xs sm:text-sm font-black text-amber-800">{item.luka || 0}</div>
                        </div>
                        <div className="p-1.5 rounded-xl bg-purple-50 border border-purple-100">
                          <div className="text-[9px] font-bold text-purple-700 uppercase">Pengungsi</div>
                          <div className="text-xs sm:text-sm font-black text-purple-800">
                            {Number(item.pengungsi || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>

                      {/* Footer Info & Action */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.waktu}</span>
                        </span>

                        <span className="text-[#047D78] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Fokus Spasial & Rute</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* ── Footer ── */}
            <div className="p-2 border-t border-slate-200 bg-slate-50/80 text-center">
              <p className="text-[9px] text-slate-500 font-bold">
                EOC SIPKK Kemenkes RI • Posko Penanganan Darurat Bencana
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
