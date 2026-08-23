'use client'

import React, { useState, useMemo } from 'react'
import {
  Activity,
  ShieldAlert,
  Waves,
  Compass,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Flame,
  Clock,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react'

export interface KabupatenDetailItem {
  nama: string
  meninggal?: number
  luka_berat?: number
  luka_ringan?: number
  total_luka?: number
  pengungsi?: number
  terdampak?: number
  titik_posko?: number
  lat?: number
  lng?: number
}

interface SummaryData {
  total_bencana: number
  total_krisis: number
  total_meninggal: number
  total_luka: number
  total_hilang: number
  total_pengungsi: number
  total_terdampak: number
}

interface TvAnalyticsDeckProps {
  jenisBencanaList?: any[]
  wilayahList?: any[]
  kabupatenDetailList?: KabupatenDetailItem[]
  markers?: any[]
  recentMarkers?: any[]
  penyakitList?: any[]
  summary?: SummaryData
  bmkgData?: any
  earthquakePoints?: any[]
  isNttScope?: boolean
  isKpiCollapsed?: boolean
  onSelectProvince?: (prov: string) => void
  onSelectLocation?: (lng: number, lat: number, zoom?: number) => void
}

export default function TvAnalyticsDeck({
  summary = {
    total_bencana: 0,
    total_krisis: 0,
    total_meninggal: 0,
    total_luka: 0,
    total_hilang: 0,
    total_pengungsi: 0,
    total_terdampak: 0,
  },
  bmkgData,
  earthquakePoints = [],
  isNttScope = true,
  isKpiCollapsed = false,
  onSelectLocation,
}: TvAnalyticsDeckProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0)

  // 1. Disaster Identity & Mainshock Data
  const autogempa = bmkgData?.autogempa || bmkgData?.gempa || null

  const magnitudoStr = autogempa?.Magnitude
    ? `${autogempa.Magnitude} SR`
    : isNttScope
    ? '7.7 SR'
    : '5.0+ SR'

  const kedalamanStr = autogempa?.Kedalaman
    ? autogempa.Kedalaman
    : isNttScope
    ? '15 km'
    : '-'

  const statusTsunamiStr = autogempa?.Potensi
    ? autogempa.Potensi
    : isNttScope
    ? 'Berpotensi Tsunami (Status Siaga & Waspada)'
    : '-'

  const mmiStr = autogempa?.Dirasakan
    ? autogempa.Dirasakan
    : isNttScope
    ? 'VII - VIII MMI (Mbay-Nagekeo, Flores Timur)'
    : '-'

  const lokasiStr = isNttScope
    ? 'Kec. Mbay, Larantuka, Tanjung Bunga, Ende, Sikka'
    : autogempa?.Wilayah || 'Wilayah Terdampak Bencana'

  const waktuGempaStr = autogempa?.Tanggal && autogempa?.Jam
    ? `${autogempa.Tanggal}, ${autogempa.Jam} (M ${autogempa.Magnitude || '7.7'})`
    : '15 Agu 2026, 09:18:22 WITA (M 7.7)'

  const tglLaporanStr = '23 Agustus 2026, 12:19 WIB'

  // 2. 7-Day Seismic Activity & Aftershock Trend
  const seismicTimeline = useMemo(() => {
    return [
      { day: 'SAB', date: '15 Agu', mag: 'M 7.7', label: 'VII - VIII MMI', isMain: true, lat: -8.34, lng: 122.98 },
      { day: 'MIN', date: '16 Agu', mag: 'M 5.5', label: 'Susulan', isMain: false, lat: -8.41, lng: 122.85 },
      { day: 'SEN', date: '17 Agu', mag: 'M 5.5', label: 'Susulan', isMain: false, lat: -8.29, lng: 123.12 },
      { day: 'SEL', date: '18 Agu', mag: 'M 4.9', label: 'Susulan', isMain: false, lat: -8.45, lng: 122.76 },
      { day: 'RAB', date: '19 Agu', mag: 'M 5.8', label: 'Susulan', isMain: false, lat: -8.36, lng: 123.05 },
      { day: 'KAM', date: '20 Agu', mag: 'M 5.7', label: 'Susulan', isMain: false, lat: -8.38, lng: 122.92 },
      { day: 'JUM', date: '21 Agu', mag: 'M 4.9', label: 'Susulan', isMain: false, lat: -8.42, lng: 122.88 },
    ]
  }, [])

  // 3. EOC Chronological Bulletin Narrative
  const kronologisText =
    'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka, Jeneponto, Bantaeng dan Status Waspada: Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu, dan Kota-palopo.'

  return (
    <div
      className={`fixed right-2 sm:right-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-80 sm:w-96 xl:w-[440px] 2xl:w-[480px] max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[192px] sm:top-[198px] 2xl:top-[206px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs shrink-0">
                <Activity className="h-3.5 w-3.5 text-[#047D78]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  KARAKTERISTIK BENCANA & KRONOLOGIS
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold truncate">
                  EOC Kemenkes RI • Info Geospasial BMKG TEWS
                </p>
              </div>
            </div>
          )}

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer"
            title={isCollapsed ? 'Buka Panel Karakteristik' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronLeft className="h-3.5 w-3.5 text-[#047D78]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#047D78]" />}
          </button>
        </div>

        {/* ── Collapsed view icon bar ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-3 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Karakteristik Bencana"
            >
              <Activity className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-xs"
              title="Kronologis Kejadian"
            >
              <ShieldAlert className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar bg-slate-50/40">
            {/* ── Section 1: Disaster Identity & Location ── */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs shrink-0">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block leading-none">
                    JENIS BENCANA
                  </span>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    GEMPA BUMI
                  </h4>
                  <p className="text-xs font-black text-slate-800 leading-snug mt-1 truncate" title={lokasiStr}>
                    {lokasiStr}
                  </p>
                </div>
              </div>

              {/* Badges strip */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-black">
                  <span>Waktu Gempa (BMKG):</span>
                  <span className="font-mono">{waktuGempaStr}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                  <span>Tgl Laporan:</span>
                  <span>{tglLaporanStr}</span>
                </div>
              </div>
            </div>

            {/* ── Section 2: Physical / Geological Parameter Grid ── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase block leading-tight">
                    MAGNITUDO GEMPA (BMKG)
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                    {magnitudoStr}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase block leading-tight">
                    KEDALAMAN GEMPA
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                    {kedalamanStr}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                  <Waves className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase block leading-tight">
                    STATUS EPISENTRUM
                  </span>
                  <span className="text-[11px] font-black text-slate-900 block truncate" title={statusTsunamiStr}>
                    {statusTsunamiStr}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase block leading-tight">
                    INTENSITAS MMI (BMKG)
                  </span>
                  <span className="text-[11px] font-black text-slate-900 block truncate" title={mmiStr}>
                    {mmiStr}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Section 3: 7-Day Seismic Activity & Aftershock Trend ── */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider block">
                  TREN AKTIVITAS SEISMIK & GEMPA SUSULAN BMKG
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {seismicTimeline.map((item, idx) => {
                  const isSelected = selectedDayIndex === idx
                  const isMain = item.isMain

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDayIndex(idx)
                        if (onSelectLocation && item.lat && item.lng) {
                          onSelectLocation(item.lng, item.lat, 9.5)
                        }
                      }}
                      className={`flex flex-col items-center justify-between py-1.5 px-0.5 rounded-xl transition-all border text-center cursor-pointer ${
                        isMain
                          ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-1 ring-rose-300'
                          : isSelected
                          ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-300'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block leading-none">
                        {item.day}
                      </span>
                      <span className="text-[9px] font-black text-slate-900 block leading-tight mt-0.5">
                        {item.date}
                      </span>

                      <div className="my-1.5 flex items-center justify-center">
                        <Activity
                          className={`h-4 w-4 ${
                            isMain
                              ? 'text-rose-600 animate-bounce'
                              : 'text-amber-600'
                          }`}
                        />
                      </div>

                      <span className={`text-[9.5px] font-black block leading-none ${isMain ? 'text-rose-800 font-extrabold' : 'text-slate-900'}`}>
                        {item.mag}
                      </span>
                      <span className={`text-[7.5px] font-bold block leading-tight mt-0.5 truncate w-full ${isMain ? 'text-rose-700' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Section 4: Kronologis Kejadian Narrative Banner ── */}
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs flex items-start gap-2.5">
              <div className="bg-rose-600 text-white rounded-lg p-1.5 shrink-0 mt-0.5 shadow-xs">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-semibold text-slate-800 leading-relaxed">
                <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide mr-1.5 shadow-xs">
                  KRONOLOGIS
                </span>
                {kronologisText}
              </div>
            </div>

            {/* ── Bottom Attribution ── */}
            <div className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <p className="text-[9px] text-slate-500 font-bold">
                Sumber: Pusat Krisis Kesehatan Kemenkes RI & BMKG TEWS
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
