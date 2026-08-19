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
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-35 max-w-xl w-[calc(100vw-32px)] pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative p-4 rounded-2xl bg-white/95 backdrop-blur-2xl border border-teal-400 shadow-[0_15px_45px_rgba(4,125,120,0.18)] text-slate-800">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs shrink-0">
            <Flame className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                FOKUS BENCANA
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {event.tgl_kejadian}
              </span>
            </div>

            <h3 className="text-sm font-black text-slate-900 leading-snug">
              {event.jenis_bencana}
            </h3>

            <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-[#047D78] shrink-0" />
              <span className="truncate">{locationStr || 'Lokasi teridentifikasi'}</span>
            </p>
          </div>
        </div>

        {/* ── Impact Grid ── */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-bold">Total Korban</span>
            <span className="font-mono text-base font-black text-red-600">
              {event.total_korban || 0} Jiwa
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-bold">Koordinat</span>
            <span className="font-mono text-[11px] font-black text-[#047D78] block truncate">
              {event.lat.toFixed(3)}, {event.lng.toFixed(3)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-bold">Status Respon</span>
            <span className="text-[11px] font-black text-emerald-700 block">
              Kluster EOC Siaga
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
