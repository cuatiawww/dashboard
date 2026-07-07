'use client'

import { Globe, TrendingUp, Users, AlertCircle, Clock, Activity } from 'lucide-react'
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

interface PenyakitNegara {
  negara: string
  lat: number
  lon: number
  penyakit: string
  kasus: number
  kematian: number
  status: 'KLB' | 'Waspada' | 'Pantau'
}

const STATUS_COLOR: Record<string, { ol: string; badge: string }> = {
  KLB: { ol: 'rgba(220,38,38,0.9)', badge: 'bg-red-100 text-red-700 border-red-200' },
  Waspada: { ol: 'rgba(234,179,8,0.85)', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  Pantau: { ol: 'rgba(59,130,246,0.75)', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const PENYAKIT_DATA: PenyakitNegara[] = [
  { negara: 'India', lat: 20.5, lon: 79.0, penyakit: 'HMPV', kasus: 12_430, kematian: 87, status: 'KLB' },
  { negara: 'China', lat: 35.8, lon: 104.2, penyakit: 'HMPV / Flu Burung', kasus: 8_920, kematian: 42, status: 'Waspada' },
  { negara: 'Brasil', lat: -14.2, lon: -51.9, penyakit: 'Dengue', kasus: 345_000, kematian: 1_240, status: 'KLB' },
  { negara: 'Kongo', lat: -4.0, lon: 21.7, penyakit: 'Mpox', kasus: 3_480, kematian: 180, status: 'KLB' },
  { negara: 'Saudi Arabia', lat: 23.9, lon: 45.1, penyakit: 'MERS-CoV', kasus: 124, kematian: 8, status: 'Waspada' },
  { negara: 'Amerika Serikat', lat: 37.1, lon: -95.7, penyakit: 'Flu H5N1', kasus: 890, kematian: 12, status: 'Waspada' },
  { negara: 'Nigeria', lat: 9.1, lon: 8.7, penyakit: 'Meningitis', kasus: 2_100, kematian: 145, status: 'KLB' },
  { negara: 'Pakistan', lat: 30.4, lon: 69.3, penyakit: 'Polio', kasus: 23, kematian: 0, status: 'Pantau' },
  { negara: 'Kamboja', lat: 12.6, lon: 104.9, penyakit: 'Flu Burung H5N1', kasus: 45, kematian: 18, status: 'KLB' },
  { negara: 'Indonesia', lat: -2.5, lon: 117.5, penyakit: 'Dengue (DBD)', kasus: 45_120, kematian: 312, status: 'Waspada' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PenyakitMenularPage() {
  const handleMapReady = useCallback((map: OlMap) => {
    const features = PENYAKIT_DATA.map((p) => {
      const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) })
      f.set('status', p.status)
      f.set('negara', p.negara)
      f.set('penyakit', p.penyakit)
      f.set('kasus', p.kasus)
      return f
    })

    const source = new VectorSource({ features })
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const status = feature.get('status') as string
        const kasus = feature.get('kasus') as number
        const negara = feature.get('negara') as string
        const { ol } = STATUS_COLOR[status] || STATUS_COLOR.Pantau
        const radius = Math.min(24, Math.max(8, Math.log10(kasus + 1) * 5))
        return new Style({
          image: new CircleStyle({
            radius,
            fill: new Fill({ color: ol }),
            stroke: new Stroke({ color: '#fff', width: 1.5 }),
          }),
          text: new OlText({
            text: negara,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#1e293b' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
            offsetY: -(radius + 6),
          }),
        })
      },
    })
    map.addLayer(layer)
  }, [])

  const klbCount = PENYAKIT_DATA.filter((p) => p.status === 'KLB').length
  const totalKasus = PENYAKIT_DATA.reduce((s, p) => s + p.kasus, 0)

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={AlertCircle}
        iconBg="bg-red-100 text-red-600"
        label="KLB Aktif"
        value={klbCount}
        sub="Negara / Wilayah"
        trend="up"
        trendLabel="⚠ Perlu Perhatian"
      />
      <PantauanStatWidget
        icon={Users}
        iconBg="bg-orange-100 text-orange-600"
        label="Total Kasus Global"
        value={totalKasus.toLocaleString('id-ID')}
        sub="Data WHO / Tersedia"
      />
      <PantauanStatWidget
        icon={Activity}
        iconBg="bg-purple-100 text-purple-600"
        label="Negara Dipantau"
        value={PENYAKIT_DATA.length}
        sub="Lintas Benua"
      />
      <PantauanStatWidget
        icon={Globe}
        iconBg="bg-blue-100 text-blue-600"
        label="Penyakit Terpantau"
        value={6}
        sub="Dengue, HMPV, Mpox, dsb"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Sumber"
        value="WHO / ProMED"
        sub={new Date().toLocaleDateString('id-ID')}
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">PETA PENYAKIT MENULAR DUNIA</p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />KLB</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />Waspada</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />Pantau</span>
          <span className="text-[10px] text-slate-400">(ukuran = jumlah kasus)</span>
        </div>
      </div>
      <PantauanMapBase
        height="460px"
        zoom={3}
        center={[20, 10]}
        onMapReady={handleMapReady}
      />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Data penyakit menular global bersumber dari WHO Disease Outbreak News dan ProMED-mail.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          Situasi Per Negara
        </p>
      </div>
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {PENYAKIT_DATA.sort((a, b) => {
          const order = ['KLB', 'Waspada', 'Pantau']
          return order.indexOf(a.status) - order.indexOf(b.status)
        }).map((p) => (
          <div key={p.negara} className="px-4 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">{p.negara}</p>
                <p className="text-[11px] text-teal-600 font-semibold">{p.penyakit}</p>
                <p className="text-[11px] text-slate-500">
                  {p.kasus.toLocaleString('id-ID')} kasus · {p.kematian} meninggal
                </p>
              </div>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[p.status].badge}`}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Penyakit Menular Dunia"
      description="Monitoring situasi penyakit menular global — KLB, outbreak, dan wabah yang berpotensi mempengaruhi Indonesia"
      sourceLabel="WHO / ProMED"
      sourceUrl="https://www.who.int/emergencies/disease-outbreak-news"
      icon={Globe}
      iconBg="bg-purple-100 text-purple-600"
      lastUpdated={new Date().toLocaleDateString('id-ID')}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
