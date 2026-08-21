'use client'

import React, { useState } from 'react'
import {
  Flame,
  Activity,
  AlertTriangle,
  MapPin,
  Radio,
  ChevronLeft,
  ChevronRight,
  Search,
  Waves,
  CloudRain,
  ShieldAlert,
  Skull,
  Building2,
  HeartPulse,
  BedDouble,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react'

interface MarkerItem {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  total_korban?: number
  kategori_bencana?: string
}

interface BmkgGempa {
  Tanggal: string
  Jam: string
  DateTime?: string
  Coordinates: string
  Lintang: string
  Bujur: string
  Magnitude: string
  Kedalaman: string
  Wilayah: string
  Potensi: string
  Dirasakan?: string
  Shakemap?: string
}

export interface FaskesItem {
  nama_rs: string
  kabupaten: string
  triase_merah?: number
  triase_kuning?: number
  triase_hijau?: number
  triase_hitam?: number
  total?: number
  lat?: number
  lng?: number
  status?: string
  igd?: string
}

interface TvLiveFeedDeckProps {
  markers: MarkerItem[]
  bmkgData: {
    autogempa?: BmkgGempa
    gempaterkini?: BmkgGempa[]
  } | null
  peringatanDiniList?: any[]
  faskesList?: FaskesItem[]
  activeSpotlightId?: string | null
  isKpiCollapsed?: boolean
  onSelectEvent: (item: MarkerItem) => void
  onSelectGempa: (gempa: BmkgGempa) => void
  onSelectFaskes?: (faskes: FaskesItem) => void
}

export default function TvLiveFeedDeck({
  markers,
  bmkgData,
  peringatanDiniList = [],
  faskesList = [],
  activeSpotlightId,
  isKpiCollapsed = false,
  onSelectEvent,
  onSelectGempa,
  onSelectFaskes,
}: TvLiveFeedDeckProps) {
  const [activeTab, setActiveTab] = useState<'bencana' | 'faskes' | 'gempa' | 'peringatan'>('bencana')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter markers by search query
  const filteredMarkers = markers
    .filter((m) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        String(m.jenis_bencana || '').toLowerCase().includes(q) ||
        String(m.provinsi || '').toLowerCase().includes(q) ||
        String(m.kabupaten || '').toLowerCase().includes(q) ||
        String(m.nama_desa || '').toLowerCase().includes(q)
      )
    })
    .slice(0, 40)

  // Filter faskes by search query
  const filteredFaskes = (faskesList || []).filter((f) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      String(f.nama_rs || '').toLowerCase().includes(q) ||
      String(f.kabupaten || '').toLowerCase().includes(q)
    )
  })

  const gempas = bmkgData?.gempaterkini || []
  const autoGempa = bmkgData?.autogempa

  const getMagnitudeColor = (magStr: string) => {
    const mag = parseFloat(magStr) || 0
    if (mag >= 7.0) return 'bg-red-600 text-white border-red-500'
    if (mag >= 6.0) return 'bg-orange-600 text-white border-orange-500'
    if (mag >= 5.0) return 'bg-amber-500 text-white border-amber-400'
    return 'bg-teal-600 text-white border-teal-500'
  }

  const getDisasterIcon = (jenis: any = '') => {
    const j = String(jenis || '').toLowerCase()
    if (j.includes('banjir') || j.includes('genangan')) return CloudRain
    if (j.includes('gempa')) return Activity
    if (j.includes('longsor')) return ShieldAlert
    if (j.includes('tsunami') || j.includes('gelombang')) return Waves
    return Flame
  }

  return (
    <div
      className={`fixed left-2 sm:left-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-72 sm:w-80 xl:w-88 2xl:w-96 max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[192px] sm:top-[198px] 2xl:top-[206px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs">
                <Radio className="h-3.5 w-3.5 animate-pulse text-[#047D78]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  {activeTab === 'faskes' ? 'SITUASI FASKES SIAGA' : 'PANTAUAN KEJADIAN LIVE'}
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold truncate">
                  {activeTab === 'faskes'
                    ? `${filteredFaskes.length} RS Siaga Aktif`
                    : `${filteredMarkers.length} Kejadian Terpantau`}
                </p>
              </div>
            </div>
          )}

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer"
            title={isCollapsed ? 'Buka Panel' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-[#047D78]" /> : <ChevronLeft className="h-3.5 w-3.5 text-[#047D78]" />}
          </button>
        </div>

        {/* ── Collapsed view icon bar ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-3 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                setActiveTab('bencana')
                setIsCollapsed(false)
              }}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Kejadian Bencana"
            >
              <Flame className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('faskes')
                setIsCollapsed(false)
              }}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-xs"
              title="Situasi Faskes"
            >
              <Building2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('gempa')
                setIsCollapsed(false)
              }}
              className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 transition-all shadow-xs"
              title="Gempa BMKG"
            >
              <Activity className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('peringatan')
                setIsCollapsed(false)
              }}
              className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all shadow-xs"
              title="Peringatan Dini"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {/* ── Tabs Navigator ── */}
            <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100/70 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('bencana')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'bencana'
                    ? 'bg-[#047D78] text-white shadow-sm shadow-teal-800/20'
                    : 'bg-white text-slate-600 hover:text-[#047D78] border border-slate-200/80 hover:bg-slate-50'
                }`}
                title="Kejadian Bencana"
              >
                <Flame className="h-3 w-3 shrink-0" />
                <span className="truncate">Kejadian</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('faskes')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'faskes'
                    ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-800/20'
                    : 'bg-white text-slate-600 hover:text-emerald-800 border border-slate-200/80 hover:bg-slate-50'
                }`}
                title="Fasilitas Kesehatan Siaga"
              >
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">Faskes ({faskesList.length || 8})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gempa')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'gempa'
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                    : 'bg-white text-slate-600 hover:text-orange-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
                title="Gempa Bumi BMKG"
              >
                <Activity className="h-3 w-3 shrink-0" />
                <span className="truncate">BMKG ({gempas.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('peringatan')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'peringatan'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                    : 'bg-white text-slate-600 hover:text-sky-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
                title="Peringatan Dini"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">EWS</span>
              </button>
            </div>

            {/* ── Search Bar (for Bencana & Faskes tab) ── */}
            {(activeTab === 'bencana' || activeTab === 'faskes') && (
              <div className="p-2 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === 'faskes'
                        ? 'Cari nama rumah sakit, kabupaten...'
                        : 'Cari provinsi, kabupaten, jenis bencana...'
                    }
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#047D78] focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            {/* ── Tab Content Stream ── */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/40">
              {/* TAB 1: BENCANA STREAM */}
              {activeTab === 'bencana' && (
                <>
                  {filteredMarkers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      Tidak ada kejadian yang cocok dengan pencarian.
                    </div>
                  ) : (
                    filteredMarkers.map((item, idx) => {
                      const IconComp = getDisasterIcon(item.jenis_bencana)
                      const isSpotlight = item.kode_trans === activeSpotlightId

                      return (
                        <div
                          key={item.kode_trans || idx}
                          onClick={() => onSelectEvent(item)}
                          className={`group relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                            isSpotlight
                              ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-700/10 ring-2 ring-teal-400'
                              : 'bg-white hover:bg-teal-50/40 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`p-1.5 rounded-xl border ${
                                  isSpotlight
                                    ? 'bg-[#047D78] border-[#047D78] text-white'
                                    : 'bg-teal-50 border-teal-200 text-[#047D78] group-hover:bg-[#047D78] group-hover:text-white'
                                }`}
                              >
                                <IconComp className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#047D78] truncate">
                                  {item.jenis_bencana || 'Kejadian Bencana'}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 font-medium">
                                  <MapPin className="h-2.5 w-2.5 text-[#047D78] shrink-0" />
                                  <span className="truncate">
                                    {[item.nama_desa, item.kecamatan, item.kabupaten, item.provinsi]
                                      .filter(Boolean)
                                      .join(', ') || 'Lokasi terdata'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[9px] font-mono text-slate-500 font-bold whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.tgl_kejadian ? item.tgl_kejadian.split(' ')[0] : 'Hari ini'}
                            </span>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              {(item.total_korban ?? 0) > 0 ? (
                                <span className="flex items-center gap-1 font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  <Skull className="h-2.5 w-2.5" />
                                  <span>{item.total_korban} Korban</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium">Dalam penanganan</span>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Fokus Peta &rarr;
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </>
              )}

              {/* TAB 2: SITUASI FASKES SIAGA */}
              {activeTab === 'faskes' && (
                <>
                  {filteredFaskes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      Tidak ada data faskes yang cocok.
                    </div>
                  ) : (
                    filteredFaskes.map((faskes, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectFaskes && onSelectFaskes(faskes)}
                        className="group relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/40 hover:border-emerald-300 transition-all duration-200 cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                                {faskes.nama_rs}
                              </h4>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 font-medium">
                                <MapPin className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{faskes.kabupaten}</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {faskes.status || 'Siaga 24 Jam'}
                          </span>
                        </div>

                        {/* Triase Metrics Pills */}
                        <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-4 gap-1 text-center">
                          <div className="p-1 rounded-lg bg-rose-50 border border-rose-200">
                            <span className="text-[8px] font-bold text-rose-700 block">Merah</span>
                            <span className="text-[11px] font-mono font-black text-rose-800">
                              {faskes.triase_merah || 0}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="text-[8px] font-bold text-amber-700 block">Kuning</span>
                            <span className="text-[11px] font-mono font-black text-amber-800">
                              {faskes.triase_kuning || 0}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="text-[8px] font-bold text-emerald-700 block">Hijau</span>
                            <span className="text-[11px] font-mono font-black text-emerald-800">
                              {faskes.triase_hijau || 0}
                            </span>
                          </div>
                          <div className="p-1 rounded-lg bg-slate-100 border border-slate-200">
                            <span className="text-[8px] font-bold text-slate-700 block">Hitam</span>
                            <span className="text-[11px] font-mono font-black text-slate-800">
                              {faskes.triase_hitam || 0}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[9.5px]">
                          <span className="text-slate-600 font-bold">
                            Total Pasien:{' '}
                            <strong className="text-slate-900 font-mono text-[10.5px]">
                              {faskes.total || 0}
                            </strong>
                          </span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Lihat Lokasi &rarr;
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: GEMPA BMKG STREAM */}
              {activeTab === 'gempa' && (
                <>
                  {autoGempa && (
                    <div
                      onClick={() => onSelectGempa(autoGempa)}
                      className="p-2.5 rounded-xl border border-red-300 bg-red-50/70 hover:bg-red-100/70 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wider animate-pulse">
                          GEMPA TERBARU
                        </span>
                        <span className="text-[9px] font-mono text-red-800 font-bold">
                          {autoGempa.Jam} {autoGempa.Tanggal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-red-600 text-white border border-red-500 shadow-xs">
                          M {autoGempa.Magnitude}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {autoGempa.Wilayah}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 flex items-center justify-between">
                        <span>Kedalaman: {autoGempa.Kedalaman}</span>
                        <span className="font-bold text-red-700">{autoGempa.Potensi}</span>
                      </div>
                    </div>
                  )}

                  {gempas.length === 0 && !autoGempa ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      Tidak ada data gempa BMKG terkini.
                    </div>
                  ) : (
                    gempas.map((gempa, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectGempa(gempa)}
                        className="group p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50/50 hover:border-orange-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black border shadow-xs ${getMagnitudeColor(
                                gempa.Magnitude
                              )}`}
                            >
                              M {gempa.Magnitude}
                            </span>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-orange-800 truncate">
                              {gempa.Wilayah}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100">
                          <span>{gempa.Kedalaman}</span>
                          <span className="font-mono text-slate-600 font-bold">
                            {gempa.Jam} WIB
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 4: PERINGATAN DINI STREAM */}
              {activeTab === 'peringatan' && (
                <>
                  {peringatanDiniList.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                      Tidak ada peringatan dini aktif saat ini.
                    </div>
                  ) : (
                    peringatanDiniList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/60 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-600 text-white">
                            {item.kategori || 'PERINGATAN'}
                          </span>
                          <span className="text-[9px] font-mono text-sky-900 font-bold">
                            {item.waktu || 'Terkini'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{item.judul || item.wilayah}</h4>
                        <p className="text-[10px] text-slate-600 leading-snug line-clamp-3">
                          {item.deskripsi || item.pesan}
                        </p>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
