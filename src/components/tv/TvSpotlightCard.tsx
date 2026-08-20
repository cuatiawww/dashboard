'use client'

import React from 'react'
import {
  Flame,
  MapPin,
  X,
} from 'lucide-react'

interface SpotlightItem {
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

interface TvSpotlightCardProps {
  event: SpotlightItem | null
  onClose: () => void
}

export default function TvSpotlightCard({
  event,
  onClose,
}: TvSpotlightCardProps) {
  if (!event) return null

  const locationStr = [event.nama_desa, event.kecamatan, event.kabupaten, event.provinsi]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-30 max-w-sm sm:max-w-md 2xl:max-w-lg w-[calc(100vw-32px)] sm:w-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-teal-400 shadow-[0_12px_36px_rgba(4,125,120,0.18)] text-slate-800">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs shrink-0">
            <Flame className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                FOKUS BENCANA
              </span>
              <span className="text-[9.5px] font-mono font-bold text-slate-500">
                {event.tgl_kejadian}
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug truncate">
              {event.jenis_bencana}
            </h3>

            <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-[#047D78] shrink-0" />
              <span className="truncate">{locationStr || 'Lokasi teridentifikasi'}</span>
            </p>
          </div>
        </div>

        {/* ── Impact Grid ── */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-200">
          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[9px] text-slate-500 block font-bold">Total Korban</span>
            <span className="font-mono text-sm sm:text-base font-black text-red-600">
              {event.total_korban || 0} Jiwa
            </span>
          </div>

          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[9px] text-slate-500 block font-bold">Koordinat</span>
            <span className="font-mono text-[10px] sm:text-[11px] font-black text-[#047D78] block truncate">
              {event.lat.toFixed(3)}, {event.lng.toFixed(3)}
            </span>
          </div>

          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[9px] text-slate-500 block font-bold">Status Respon</span>
            <span className="text-[10px] sm:text-[11px] font-black text-emerald-700 block truncate">
              Kluster Siaga
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
