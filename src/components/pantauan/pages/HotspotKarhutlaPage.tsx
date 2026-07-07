'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flame, MapPin, Cloud, Thermometer, Clock, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OlMap from 'ol/Map'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────────

interface HotspotItem {
  latitude: number
  longitude: number
  brightness: number
  confidence: string
  acq_date: string
  acq_time: string
  satellite: string
}

// ── Mock data (NASA FIRMS butuh API key) ──────────────────────────────────────

const MOCK_HOTSPOTS: HotspotItem[] = [
  // Kalimantan
  { latitude: -0.5, longitude: 111.5, brightness: 340, confidence: 'high', acq_date: '2026-07-06', acq_time: '0300', satellite: 'AQUA' },
  { latitude: -1.2, longitude: 113.2, brightness: 325, confidence: 'high', acq_date: '2026-07-06', acq_time: '0310', satellite: 'TERRA' },
  { latitude: -0.8, longitude: 112.0, brightness: 310, confidence: 'nominal', acq_date: '2026-07-06', acq_time: '0355', satellite: 'AQUA' },
  { latitude: -2.1, longitude: 114.5, brightness: 290, confidence: 'nominal', acq_date: '2026-07-06', acq_time: '0420', satellite: 'TERRA' },
  { latitude: 0.3, longitude: 109.5, brightness: 360, confidence: 'high', acq_date: '2026-07-06', acq_time: '0510', satellite: 'AQUA' },
  // Sumatera
  { latitude: 1.5, longitude: 101.2, brightness: 345, confidence: 'high', acq_date: '2026-07-06', acq_time: '0330', satellite: 'TERRA' },
  { latitude: -0.5, longitude: 103.8, brightness: 330, confidence: 'high', acq_date: '2026-07-06', acq_time: '0345', satellite: 'AQUA' },
  { latitude: -2.5, longitude: 104.5, brightness: 315, confidence: 'nominal', acq_date: '2026-07-06', acq_time: '0400', satellite: 'TERRA' },
  { latitude: 2.1, longitude: 99.8, brightness: 350, confidence: 'high', acq_date: '2026-07-06', acq_time: '0315', satellite: 'AQUA' },
  // Papua
  { latitude: -5.2, longitude: 140.5, brightness: 295, confidence: 'nominal', acq_date: '2026-07-06', acq_time: '0440', satellite: 'TERRA' },
  { latitude: -4.8, longitude: 136.2, brightness: 280, confidence: 'low', acq_date: '2026-07-06', acq_time: '0455', satellite: 'AQUA' },
  // Sulawesi
  { latitude: -1.5, longitude: 120.3, brightness: 305, confidence: 'nominal', acq_date: '2026-07-05', acq_time: '0310', satellite: 'AQUA' },
]

const PULAU_STATS = [
  { pulau: 'Kalimantan', count: 5, color: 'bg-red-500' },
  { pulau: 'Sumatera', count: 4, color: 'bg-orange-500' },
  { pulau: 'Papua', count: 2, color: 'bg-yellow-500' },
  { pulau: 'Sulawesi', count: 1, color: 'bg-amber-500' },
  { pulau: 'Jawa & Bali', count: 0, color: 'bg-green-500' },
]

function hotspotColor(brightness: number, confidence: string): string {
  if (confidence === 'high' && brightness > 330) return 'rgba(220,38,38,0.9)'
  if (brightness > 310) return 'rgba(234,88,12,0.85)'
  if (brightness > 290) return 'rgba(234,179,8,0.8)'
  return 'rgba(251,191,36,0.7)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HotspotKarhutlaPage() {
  const [hotspots] = useState<HotspotItem[]>(MOCK_HOTSPOTS)
  const [loading] = useState(false)

  const handleMapReady = useCallback(
    (map: OlMap) => {
      const features = hotspots.map((h) => {
        const f = new Feature({ geometry: new Point(fromLonLat([h.longitude, h.latitude])) })
        f.set('brightness', h.brightness)
        f.set('confidence', h.confidence)
        return f
      })

      const source = new VectorSource({ features })
      const layer = new VectorLayer({
        source,
        style: (feature) => {
          const bright = feature.get('brightness') as number
          const conf = feature.get('confidence') as string
          return new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: hotspotColor(bright, conf) }),
              stroke: new Stroke({ color: '#fff', width: 1 }),
            }),
          })
        },
      })
      map.addLayer(layer)
    },
    [hotspots]
  )

  const highConf = hotspots.filter((h) => h.confidence === 'high').length

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Flame}
        iconBg="bg-red-100 text-red-600"
        label="Total Hotspot"
        value={hotspots.length}
        sub="Terdeteksi Hari Ini"
        trend="up"
        trendLabel="+3 dari kemarin"
      />
      <PantauanStatWidget
        icon={Thermometer}
        iconBg="bg-orange-100 text-orange-600"
        label="Confidence Tinggi"
        value={highConf}
        sub="Titik Panas Terverifikasi"
      />
      <PantauanStatWidget
        icon={Cloud}
        iconBg="bg-amber-100 text-amber-600"
        label="Provinsi Terdampak"
        value={7}
        sub="Kalimantan + Sumatera"
      />
      <PantauanStatWidget
        icon={MapPin}
        iconBg="bg-teal-100 text-teal-700"
        label="Sumber Data"
        value="NASA FIRMS"
        sub="MODIS / VIIRS"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Data Terakhir"
        value="Real-time"
        sub={new Date().toLocaleDateString('id-ID')}
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">PETA TITIK PANAS (HOTSPOT) KARHUTLA</p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />Rendah</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />Sedang</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" />Tinggi</span>
        </div>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Data titik panas satelit MODIS/VIIRS — NASA FIRMS. API Key diperlukan untuk data real-time.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="space-y-4">
      {/* Ranking per pulau */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            Hotspot per Pulau
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {PULAU_STATS.map((p) => (
            <div key={p.pulau} className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
                <span className="text-xs font-semibold text-slate-700">{p.pulau}</span>
              </div>
              <span className="text-xs font-bold text-slate-800">{p.count} titik</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daftar hotspot terbaru */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Deteksi Terbaru</p>
        </div>
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {hotspots.slice(0, 8).map((h, i) => {
            const badge =
              h.confidence === 'high'
                ? 'bg-red-100 text-red-700 border-red-200'
                : h.confidence === 'nominal'
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
            return (
              <div key={i} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {h.latitude.toFixed(2)}, {h.longitude.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Bright: {h.brightness}K · {h.satellite} · {h.acq_date}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold capitalize ${badge}`}>
                    {h.confidence}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Hotspot Karhutla"
      description="Pemantauan titik panas kebakaran hutan dan lahan (Karhutla) dari satelit NASA FIRMS"
      sourceLabel="NASA FIRMS"
      sourceUrl="https://firms.modaps.eosdis.nasa.gov"
      icon={Flame}
      iconBg="bg-red-100 text-red-600"
      lastUpdated={new Date().toLocaleDateString('id-ID')}
      loading={loading}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
