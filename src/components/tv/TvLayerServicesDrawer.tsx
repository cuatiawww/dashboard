'use client'

import React from 'react'
import {
  Layers,
  X,
  Globe,
  Flame,
  Wind,
  Hospital,
  Check,
} from 'lucide-react'

export interface TvLayerState {
  baseMap: 'osm' | 'terrain' | 'satellite' | 'light' | 'dark'
  bnpbBanjir: boolean
  bnpbGempa: boolean
  bnpbLongsor: boolean
  bnpbKarhutla: boolean
  bnpbHillshade: boolean
  bnpbKepadatan: boolean
  bnpbAdmin: boolean
  showWindy: boolean
  showFaskes: boolean
  showPosko: boolean
  showTck: boolean
  showChoropleth: boolean
  showMarkers: boolean
}

interface TvLayerServicesDrawerProps {
  isOpen: boolean
  onClose: () => void
  layers: TvLayerState
  onUpdateLayer: (key: keyof TvLayerState, value: any) => void
  onResetLayers: () => void
}

export default function TvLayerServicesDrawer({
  isOpen,
  onClose,
  layers,
  onUpdateLayer,
  onResetLayers,
}: TvLayerServicesDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed right-2 sm:right-3 top-[56px] sm:top-[60px] 2xl:top-[64px] bottom-12 z-50 w-72 sm:w-80 xl:w-88 max-w-[calc(100vw-20px)] flex flex-col bg-white/95 backdrop-blur-2xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_15px_45px_rgba(4,125,120,0.18)] overflow-hidden text-slate-800 animate-in slide-in-from-right-4 duration-300">
      {/* ── Header Layer Services ── */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-r from-[#047D78] to-[#00B0AA] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          <h3 className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white">
            Layer Services
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-black/15 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Drawer Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4.5 text-xs no-scrollbar bg-slate-50/40">
        {/* 1. Basemap Selector */}
        <div>
          <h4 className="font-extrabold text-orange-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-orange-600" />
            Peta Dasar (Basemap)
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'osm', label: 'OpenStreetMap (Road)' },
              { id: 'terrain', label: 'Topografi / Terrain' },
              { id: 'satellite', label: 'Citra Satelit' },
              { id: 'light', label: 'Positron Light' },
            ].map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => onUpdateLayer('baseMap', bm.id)}
                className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  layers.baseMap === bm.id
                    ? 'bg-orange-50 border-orange-400 text-orange-800 font-extrabold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{bm.label}</span>
                {layers.baseMap === bm.id && <Check className="h-3.5 w-3.5 text-orange-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Hazard Overlays (BNPB) */}
        <div>
          <h4 className="font-extrabold text-orange-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-600" />
            Lapisan Bahaya Kebencanaan (BNPB)
          </h4>
          <div className="space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            {[
              { key: 'bnpbBanjir', label: 'Bahaya Banjir' },
              { key: 'bnpbGempa', label: 'Bahaya Gempa Bumi' },
              { key: 'bnpbLongsor', label: 'Bahaya Tanah Longsor' },
              { key: 'bnpbKarhutla', label: 'Bahaya Kebakaran Hutan & Lahan' },
              { key: 'bnpbHillshade', label: 'Indo Hillshade (Ketinggian)' },
              { key: 'bnpbKepadatan', label: 'Kepadatan Penduduk 2020' },
              { key: 'bnpbAdmin', label: 'Batas Administrasi Wilayah (BNPB)' },
            ].map((item) => {
              const isChecked = Boolean(layers[item.key as keyof TvLayerState])
              return (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-orange-50/50 cursor-pointer transition-colors"
                >
                  <span className="text-slate-700 font-semibold">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onUpdateLayer(item.key as keyof TvLayerState, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </label>
              )
            })}
          </div>
        </div>

        {/* 3. Weather & Dynamic Layers */}
        <div>
          <h4 className="font-extrabold text-[#047D78] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-[#047D78]" />
            Dinamika Cuaca & Kejadian
          </h4>
          <div className="space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-teal-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Animasi Angin / GFS Streamlines</span>
              <input
                type="checkbox"
                checked={layers.showWindy}
                onChange={(e) => onUpdateLayer('showWindy', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-teal-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Choropleth Sebaran Provinsi</span>
              <input
                type="checkbox"
                checked={layers.showChoropleth}
                onChange={(e) => onUpdateLayer('showChoropleth', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-teal-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Pin Titik Lokasi Bencana</span>
              <input
                type="checkbox"
                checked={layers.showMarkers}
                onChange={(e) => onUpdateLayer('showMarkers', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#047D78] focus:ring-[#047D78] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* 4. Health & EOC Resources */}
        <div>
          <h4 className="font-extrabold text-emerald-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
            <Hospital className="h-3.5 w-3.5 text-emerald-600" />
            Fasilitas & Respon EOC Kemenkes
          </h4>
          <div className="space-y-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Rumah Sakit & Faskes Rujukan</span>
              <input
                type="checkbox"
                checked={layers.showFaskes}
                onChange={(e) => onUpdateLayer('showFaskes', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Posko Medis & Pengungsian</span>
              <input
                type="checkbox"
                checked={layers.showPosko}
                onChange={(e) => onUpdateLayer('showPosko', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/50 cursor-pointer transition-colors">
              <span className="text-slate-700 font-semibold">Tim Tenaga Cadangan Kesehatan (TCK)</span>
              <input
                type="checkbox"
                checked={layers.showTck}
                onChange={(e) => onUpdateLayer('showTck', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Drawer Footer ── */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onResetLayers}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 cursor-pointer"
        >
          Reset Default
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs transition-all shadow-md shadow-orange-600/20 cursor-pointer"
        >
          Terapkan Pengaturan
        </button>
      </div>
    </div>
  )
}
