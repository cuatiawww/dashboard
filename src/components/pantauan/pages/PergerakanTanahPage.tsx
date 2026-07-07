'use client'

import { Layers, MapPin, AlertTriangle, Mountain, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, Circle as CircleStyle, Text as OlText } from 'ol/style'
import OlMap from 'ol/Map'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Types & Data ──────────────────────────────────────────────────────────────

type Zonasi = 'Sangat Tinggi' | 'Tinggi' | 'Menengah' | 'Rendah'

interface ZonasiItem {
  provinsi: string
  lat: number
  lon: number
  zonasi: Zonasi
  luas_ha: number
  kab_berisiko: number
}

const ZONASI_COLOR: Record<Zonasi, { ol: string; badge: string }> = {
  'Sangat Tinggi': { ol: 'rgba(220,38,38,0.85)', badge: 'bg-red-100 text-red-700 border-red-200' },
  'Tinggi': { ol: 'rgba(234,88,12,0.85)', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Menengah': { ol: 'rgba(234,179,8,0.85)', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'Rendah': { ol: 'rgba(22,163,74,0.75)', badge: 'bg-green-100 text-green-700 border-green-200' },
}

const ZONASI_DATA: ZonasiItem[] = [
  { provinsi: 'Jawa Barat', lat: -6.9, lon: 107.6, zonasi: 'Sangat Tinggi', luas_ha: 285_400, kab_berisiko: 18 },
  { provinsi: 'Jawa Tengah', lat: -7.2, lon: 110.2, zonasi: 'Sangat Tinggi', luas_ha: 198_200, kab_berisiko: 14 },
  { provinsi: 'Sumatera Barat', lat: -0.7, lon: 100.4, zonasi: 'Tinggi', luas_ha: 156_800, kab_berisiko: 12 },
  { provinsi: 'Jawa Timur', lat: -7.5, lon: 112.2, zonasi: 'Tinggi', luas_ha: 143_600, kab_berisiko: 11 },
  { provinsi: 'Sulawesi Selatan', lat: -4.0, lon: 120.0, zonasi: 'Tinggi', luas_ha: 98_400, kab_berisiko: 9 },
  { provinsi: 'Aceh', lat: 4.5, lon: 96.5, zonasi: 'Tinggi', luas_ha: 87_200, kab_berisiko: 8 },
  { provinsi: 'Sulawesi Tenggara', lat: -3.9, lon: 122.5, zonasi: 'Menengah', luas_ha: 64_100, kab_berisiko: 6 },
  { provinsi: 'NTT', lat: -9.0, lon: 122.5, zonasi: 'Menengah', luas_ha: 54_300, kab_berisiko: 7 },
  { provinsi: 'Kalimantan Selatan', lat: -3.0, lon: 115.5, zonasi: 'Rendah', luas_ha: 32_000, kab_berisiko: 3 },
  { provinsi: 'Papua', lat: -5.0, lon: 141.0, zonasi: 'Rendah', luas_ha: 28_500, kab_berisiko: 2 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PergerakanTanahPage() {
  const handleMapReady = useCallback((map: OlMap) => {
    const features = ZONASI_DATA.map((z) => {
      const f = new Feature({ geometry: new Point(fromLonLat([z.lon, z.lat])) })
      f.set('zonasi', z.zonasi)
      f.set('provinsi', z.provinsi)
      return f
    })

    const source = new VectorSource({ features })
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const zonasi = feature.get('zonasi') as Zonasi
        const provinsi = feature.get('provinsi') as string
        const { ol } = ZONASI_COLOR[zonasi]
        return new Style({
          image: new CircleStyle({
            radius: zonasi === 'Sangat Tinggi' ? 14 : zonasi === 'Tinggi' ? 11 : 8,
            fill: new Fill({ color: ol }),
            stroke: new Stroke({ color: '#fff', width: 1.5 }),
          }),
          text: new OlText({
            text: provinsi.split(' ')[0],
            font: 'bold 9px sans-serif',
            fill: new Fill({ color: '#fff' }),
            offsetY: 1,
          }),
        })
      },
    })
    map.addLayer(layer)
  }, [])

  const sangatTinggi = ZONASI_DATA.filter((z) => z.zonasi === 'Sangat Tinggi').length
  const tinggi = ZONASI_DATA.filter((z) => z.zonasi === 'Tinggi').length
  const totalLuas = ZONASI_DATA.reduce((s, z) => s + z.luas_ha, 0)

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={AlertTriangle}
        iconBg="bg-red-100 text-red-600"
        label="Zona Sangat Tinggi"
        value={sangatTinggi}
        sub="Provinsi"
        trend="up"
      />
      <PantauanStatWidget
        icon={Mountain}
        iconBg="bg-orange-100 text-orange-600"
        label="Zona Tinggi"
        value={tinggi}
        sub="Provinsi"
      />
      <PantauanStatWidget
        icon={Layers}
        iconBg="bg-yellow-100 text-yellow-600"
        label="Luas Terdampak"
        value={`${(totalLuas / 1000).toFixed(0)}K ha`}
        sub="Total Area Berisiko"
      />
      <PantauanStatWidget
        icon={MapPin}
        iconBg="bg-teal-100 text-teal-700"
        label="Provinsi Dipantau"
        value={ZONASI_DATA.length}
        sub="Indonesia"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Sumber"
        value="PVMBG"
        sub="ESDM Indonesia"
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">PETA ZONASI GERAKAN TANAH</p>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
          {(['Sangat Tinggi', 'Tinggi', 'Menengah', 'Rendah'] as Zonasi[]).map((z) => (
            <span key={z} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full border border-white inline-block" style={{ background: ZONASI_COLOR[z].ol }} />
              {z}
            </span>
          ))}
        </div>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Data zonasi gerakan tanah bersumber dari PVMBG/ESDM Indonesia.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
          <Layers className="h-4 w-4 text-orange-500" />
          Zonasi per Provinsi
        </p>
      </div>
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {ZONASI_DATA.sort((a, b) => {
          const order: Zonasi[] = ['Sangat Tinggi', 'Tinggi', 'Menengah', 'Rendah']
          return order.indexOf(a.zonasi) - order.indexOf(b.zonasi)
        }).map((z) => (
          <div key={z.provinsi} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800">{z.provinsi}</p>
                <p className="text-[11px] text-slate-500">
                  {z.luas_ha.toLocaleString('id-ID')} ha · {z.kab_berisiko} kab. berisiko
                </p>
              </div>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${ZONASI_COLOR[z.zonasi].badge}`}>
                {z.zonasi}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Pergerakan Tanah"
      description="Peta zonasi risiko gerakan tanah (longsor) di Indonesia berdasarkan data PVMBG/ESDM"
      sourceLabel="PVMBG / ESDM"
      sourceUrl="https://pvmbg.brin.go.id"
      icon={Layers}
      iconBg="bg-amber-100 text-amber-700"
      lastUpdated={new Date().toLocaleDateString('id-ID')}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
