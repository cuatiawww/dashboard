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

interface TvLiveFeedDeckProps {
  markers: MarkerItem[]
  bmkgData: {
    autogempa?: BmkgGempa
    gempaterkini?: BmkgGempa[]
  } | null
  peringatanDiniList?: any[]
  activeSpotlightId?: string | null
  onSelectEvent: (item: MarkerItem) => void
  onSelectGempa: (gempa: BmkgGempa) => void
}

export default function TvLiveFeedDeck({
  markers,
  bmkgData,
  peringatanDiniList = [],
  activeSpotlightId,
  onSelectEvent,
  onSelectGempa,
}: TvLiveFeedDeckProps) {
  const [activeTab, setActiveTab] = useState<'bencana' | 'gempa' | 'peringatan'>('bencana')
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
      className={`fixed left-3 top-48 bottom-14 z-30 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-12' : 'w-80 sm:w-96'
      }`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-2xl shadow-[0_10px_30px_rgba(4,125,120,0.12)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs">
                <Radio className="h-4 w-4 animate-pulse text-[#047D78]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  PANTAUAN BENCANA & BMKG
                </h3>
                <p className="text-[10px] text-slate-500 font-bold truncate">
                  {filteredMarkers.length} Kejadian Terpantau
                </p>
              </div>
            </div>
          )}

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer"
            title={isCollapsed ? 'Buka Panel' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 text-[#047D78]" /> : <ChevronLeft className="h-4 w-4 text-[#047D78]" />}
          </button>
        </div>

        {/* ── Collapsed view icon bar ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-4 py-4 bg-slate-50/50">
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
            <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-100/70 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('bencana')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'bencana'
                    ? 'bg-[#047D78] text-white shadow-sm shadow-teal-800/20'
                    : 'bg-white text-slate-600 hover:text-[#047D78] border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Flame className="h-3 w-3" />
                <span>Bencana</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gempa')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'gempa'
                    ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                    : 'bg-white text-slate-600 hover:text-orange-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>BMKG ({gempas.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('peringatan')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'peringatan'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                    : 'bg-white text-slate-600 hover:text-sky-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Peringatan</span>
              </button>
            </div>

            {/* ── Search Bar (only for Bencana tab) ── */}
            {activeTab === 'bencana' && (
              <div className="p-2 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari provinsi, kabupaten, jenis bencana..."
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
                                  {item.total_korban} Korban
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium">Nihil Korban Jiwa</span>
                              )}
                            </div>

                            <span className="text-[9px] text-[#047D78] font-bold group-hover:underline flex items-center gap-0.5">
                              Sorot Peta
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </>
              )}

              {/* TAB 2: BMKG GEMPA STREAM */}
              {activeTab === 'gempa' && (
                <div className="space-y-2.5">
                  {/* Latest AutoGempa Spotlight */}
                  {autoGempa && (
                    <div
                      onClick={() => onSelectGempa(autoGempa)}
                      className="relative p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 shadow-md shadow-amber-600/10 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400">
                          <Activity className="h-3 w-3 animate-pulse text-amber-700" />
                          GEMPA TERKINI (BMKG)
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">
                          {autoGempa.Tanggal} • {autoGempa.Jam}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 my-2">
                        <div
                          className={`flex flex-col items-center justify-center h-12 w-14 rounded-xl border font-mono font-black shadow-xs ${getMagnitudeColor(
                            autoGempa.Magnitude
                          )}`}
                        >
                          <span className="text-base leading-none">{autoGempa.Magnitude}</span>
                          <span className="text-[8px] uppercase tracking-wider font-bold">MAG</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                            {autoGempa.Wilayah}
                          </h4>
                          <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
                            Kedalaman: <span className="text-amber-800 font-bold">{autoGempa.Kedalaman}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-amber-200 flex items-center justify-between text-[10px]">
                        <span className="text-amber-900 font-bold truncate max-w-[200px]">
                          {autoGempa.Potensi}
                        </span>
                        <span className="text-[9px] text-[#047D78] font-black flex items-center gap-0.5">
                          Lihat Episentrum <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* List of Recent Earthquakes M>=5.0 */}
                  {gempas.map((gempa, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectGempa(gempa)}
                      className="p-2.5 rounded-xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer group flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      <div
                        className={`flex flex-col items-center justify-center h-10 w-11 rounded-lg border font-mono font-bold shrink-0 shadow-2xs ${getMagnitudeColor(
                          gempa.Magnitude
                        )}`}
                      >
                        <span className="text-sm leading-none">{gempa.Magnitude}</span>
                        <span className="text-[7px] uppercase font-bold">SR</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-800 truncate">
                          {gempa.Wilayah}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium">
                          <span>{gempa.Tanggal}</span>
                          <span>•</span>
                          <span>Kedalaman {gempa.Kedalaman}</span>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#047D78] shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: PERINGATAN DINI CUACA */}
              {activeTab === 'peringatan' && (
                <div className="space-y-2">
                  {peringatanDiniList.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                      <CloudRain className="h-8 w-8 text-[#047D78] mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-bold text-slate-800">Status Cuaca Terkendali</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        Tidak ada peringatan cuaca ekstrem aktif level merah saat ini.
                      </p>
                    </div>
                  ) : (
                    peringatanDiniList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            {item.title || item.wilayah || 'Peringatan Dini'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            WASPADA
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium line-clamp-2">
                          {item.description || item.narasi || 'Potensi hujan lebat disertai kilat dan angin kencang.'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
