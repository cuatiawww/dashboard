'use client'

import React, { useState } from 'react'
import {
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Stethoscope,
  HeartPulse,
  Radio,
} from 'lucide-react'

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
  markers?: any[]
  bmkgData?: any
  peringatanDiniList?: any[]
  faskesList?: FaskesItem[]
  activeSpotlightId?: string | null
  isKpiCollapsed?: boolean
  onSelectEvent?: (item: any) => void
  onSelectGempa?: (gempa: any) => void
  onSelectFaskes?: (faskes: FaskesItem) => void
}

export default function TvLiveFeedDeck({
  faskesList = [],
  isKpiCollapsed = false,
  onSelectFaskes,
}: TvLiveFeedDeckProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter faskes by search query
  const filteredFaskes = (faskesList || []).filter((f) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      String(f.nama_rs || '').toLowerCase().includes(q) ||
      String(f.kabupaten || '').toLowerCase().includes(q)
    )
  })

  return (
    <div
      className={`fixed left-2 sm:left-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-76 sm:w-84 xl:w-90 2xl:w-96 max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[192px] sm:top-[198px] 2xl:top-[206px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs">
                <Building2 className="h-3.5 w-3.5 text-[#047D78]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  SITUASI FASKES SIAGA
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold truncate">
                  {filteredFaskes.length} RSUD Rujukan NTT Siaga Aktif
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
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-xs"
              title="Situasi Faskes"
            >
              <Building2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Kapasitas Pasien"
            >
              <HeartPulse className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {/* ── Search Bar ── */}
            <div className="p-2 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama rumah sakit, kabupaten..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#047D78] focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* ── Faskes Stream List ── */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/40">
              {filteredFaskes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                  Tidak ada data faskes yang cocok dengan pencarian.
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
                        Fokus Peta &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
