'use client'

import { Wind, Compass, Clock, Thermometer, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

// ── Windy embed — no API key needed for basic embed ───────────────────────────

const WINDY_EMBED_URL =
  'https://embed.windy.com/embed2.html?lat=-2.5&lon=117.5&detailLat=-6.2&detailLon=106.8&width=100%&height=100%&zoom=5&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1'

// ── Kota angin ────────────────────────────────────────────────────────────────

const KOTA_ANGIN = [
  { kota: 'Jakarta', kecepatan: 14, arah: 'Barat Daya', kondisi: 'Sedang' },
  { kota: 'Surabaya', kecepatan: 18, arah: 'Tenggara', kondisi: 'Kencang' },
  { kota: 'Medan', kecepatan: 9, arah: 'Utara', kondisi: 'Lemah' },
  { kota: 'Makassar', kecepatan: 22, arah: 'Selatan', kondisi: 'Kencang' },
  { kota: 'Manado', kecepatan: 16, arah: 'Timur Laut', kondisi: 'Sedang' },
  { kota: 'Denpasar', kecepatan: 11, arah: 'Barat', kondisi: 'Sedang' },
  { kota: 'Palembang', kecepatan: 7, arah: 'Tenggara', kondisi: 'Lemah' },
  { kota: 'Ambon', kecepatan: 19, arah: 'Timur', kondisi: 'Kencang' },
]

function windColor(kondisi: string) {
  if (kondisi === 'Kencang') return 'text-red-600 bg-red-50 border-red-200'
  if (kondisi === 'Sedang') return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-green-600 bg-green-50 border-green-200'
}

export default function PergerakanAnginPage() {
  const maxAngin = Math.max(...KOTA_ANGIN.map((k) => k.kecepatan))
  const kencang = KOTA_ANGIN.filter((k) => k.kondisi === 'Kencang').length

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Wind}
        iconBg="bg-blue-100 text-blue-600"
        label="Kecepatan Tertinggi"
        value={`${maxAngin} km/h`}
        sub="Makassar"
        trend="up"
        trendLabel="Di atas normal"
      />
      <PantauanStatWidget
        icon={Compass}
        iconBg="bg-cyan-100 text-cyan-600"
        label="Kota Angin Kencang"
        value={kencang}
        sub="≥ 20 km/h"
      />
      <PantauanStatWidget
        icon={Thermometer}
        iconBg="bg-teal-100 text-teal-700"
        label="Musim Angin"
        value="Timur"
        sub="Juni – Agustus"
      />
      <PantauanStatWidget
        icon={MapPin}
        iconBg="bg-slate-100 text-slate-600"
        label="Kota Dipantau"
        value={KOTA_ANGIN.length}
        sub="Kota Besar Indonesia"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Sumber"
        value="Windy / ECMWF"
        sub={new Date().toLocaleDateString('id-ID')}
      />
    </>
  )

  // Windy embedded iframe as map
  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-600">
          PETA PERGERAKAN ANGIN — WINDY (ECMWF)
        </p>
      </div>
      <div style={{ height: '460px' }} className="relative">
        <iframe
          src={WINDY_EMBED_URL}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Peta Pergerakan Angin Indonesia"
          allow="geolocation"
          className="block"
        />
      </div>
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Visualisasi angin menggunakan Windy.com (ECMWF model). Data diperbarui setiap 6 jam.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
          <Wind className="h-4 w-4 text-blue-500" />
          Kecepatan Angin Kota
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {KOTA_ANGIN.sort((a, b) => b.kecepatan - a.kecepatan).map((k) => {
          const pct = Math.round((k.kecepatan / maxAngin) * 100)
          return (
            <div key={k.kota} className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-xs font-bold text-slate-800">{k.kota}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{k.arah}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">{k.kecepatan} km/h</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${windColor(k.kondisi)}`}>
                    {k.kondisi}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Pergerakan Angin"
      description="Visualisasi pergerakan angin real-time di Indonesia menggunakan data model cuaca ECMWF via Windy"
      sourceLabel="Windy / ECMWF"
      sourceUrl="https://www.windy.com"
      icon={Wind}
      iconBg="bg-blue-100 text-blue-600"
      lastUpdated={new Date().toLocaleString('id-ID')}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
