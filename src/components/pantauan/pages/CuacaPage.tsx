'use client'

import { Cloud, Thermometer, Droplets, Wind, Eye, MapPin, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import OlMap from 'ol/Map'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Mock cuaca kota besar ─────────────────────────────────────────────────────

const KOTA_CUACA = [
  { kota: 'Jakarta', suhu: 32, kelembaban: 78, angin: 12, cuaca: '⛅ Berawan', curah: 'Rendah' },
  { kota: 'Surabaya', suhu: 34, kelembaban: 72, angin: 15, cuaca: '☀️ Cerah', curah: 'Nihil' },
  { kota: 'Medan', suhu: 30, kelembaban: 85, angin: 8, cuaca: '🌧️ Hujan', curah: 'Sedang' },
  { kota: 'Makassar', suhu: 31, kelembaban: 76, angin: 18, cuaca: '⛅ Berawan', curah: 'Rendah' },
  { kota: 'Denpasar', suhu: 29, kelembaban: 80, angin: 14, cuaca: '🌤️ Cerah Berawan', curah: 'Rendah' },
  { kota: 'Manado', suhu: 28, kelembaban: 88, angin: 10, cuaca: '🌧️ Hujan Lebat', curah: 'Tinggi' },
  { kota: 'Palembang', suhu: 33, kelembaban: 82, angin: 9, cuaca: '🌦️ Gerimis', curah: 'Rendah' },
  { kota: 'Pontianak', suhu: 31, kelembaban: 90, angin: 7, cuaca: '🌧️ Hujan', curah: 'Sedang' },
]

// OWM tile — requires API key; fallback to OSM if key not set
const OWM_KEY = process.env.NEXT_PUBLIC_OWM_API_KEY || ''

export default function CuacaPage() {
  const handleMapReady = useCallback((map: OlMap) => {
    if (OWM_KEY) {
      const precipLayer = new TileLayer({
        source: new XYZ({
          url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
          attributions: '© OpenWeatherMap',
        }),
        opacity: 0.6,
        zIndex: 10,
      })
      map.addLayer(precipLayer)
    }
  }, [])

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Thermometer}
        iconBg="bg-red-100 text-red-600"
        label="Suhu Tertinggi"
        value="34°C"
        sub="Surabaya — Hari Ini"
        trend="up"
        trendLabel="+2° dari normal"
      />
      <PantauanStatWidget
        icon={Cloud}
        iconBg="bg-blue-100 text-blue-600"
        label="Kota Hujan"
        value={3}
        sub="Dari 8 Kota Pantau"
      />
      <PantauanStatWidget
        icon={Droplets}
        iconBg="bg-cyan-100 text-cyan-600"
        label="Kelembaban Rata-rata"
        value="81%"
        sub="Suhu Nyaman: < 70%"
      />
      <PantauanStatWidget
        icon={Wind}
        iconBg="bg-teal-100 text-teal-700"
        label="Angin Maks"
        value="18 kt"
        sub="Makassar — Kencang"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Sumber"
        value="BMKG / OWM"
        sub={new Date().toLocaleDateString('id-ID')}
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-600">
          PETA CUACA INDONESIA
          {!OWM_KEY && <span className="ml-2 text-amber-600">(Layer cuaca: tambahkan NEXT_PUBLIC_OWM_API_KEY)</span>}
        </p>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Data prakiraan cuaca bersumber dari BMKG & OpenWeatherMap.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
          <Cloud className="h-4 w-4 text-blue-500" />
          Cuaca Kota Besar
        </p>
      </div>
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {KOTA_CUACA.map((k) => {
          const hujanColor =
            k.curah === 'Tinggi' ? 'text-red-600' : k.curah === 'Sedang' ? 'text-orange-600' : 'text-slate-400'
          return (
            <div key={k.kota} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{k.kota}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{k.cuaca}</p>
                </div>
                <span className="text-lg font-bold text-slate-700">{k.suhu}°</span>
              </div>
              <div className="mt-1.5 flex gap-3 text-[11px] text-slate-500">
                <span>💧 {k.kelembaban}%</span>
                <span>💨 {k.angin} km/h</span>
                <span className={`font-semibold ${hujanColor}`}>☔ Curah: {k.curah}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Cuaca"
      description="Pemantauan kondisi cuaca dan prakiraan di seluruh Indonesia dari BMKG dan OpenWeatherMap"
      sourceLabel="BMKG"
      sourceUrl="https://www.bmkg.go.id/cuaca/"
      icon={Cloud}
      iconBg="bg-blue-100 text-blue-600"
      lastUpdated={new Date().toLocaleString('id-ID')}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
