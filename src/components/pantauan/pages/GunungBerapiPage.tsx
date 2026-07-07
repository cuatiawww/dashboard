'use client'

import { useCallback, useState } from 'react'
import { Mountain, AlertTriangle, Eye, Clock, Info } from 'lucide-react'
import dynamic from 'next/dynamic'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, Circle as CircleStyle, Text as OlText } from 'ol/style'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OlMap from 'ol/Map'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Types & Data ──────────────────────────────────────────────────────────────

type Level = 'Normal' | 'Waspada' | 'Siaga' | 'Awas'

interface GunungData {
  nama: string
  provinsi: string
  lat: number
  lon: number
  ketinggian: number
  level: Level
  statusNote: string
  lastUpdate: string
}

const LEVEL_CONFIG: Record<Level, { color: string; olColor: string; badge: string }> = {
  Normal: {
    color: 'bg-green-100 text-green-700 border-green-200',
    olColor: 'rgba(22,163,74,0.85)',
    badge: 'NORMAL',
  },
  Waspada: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    olColor: 'rgba(234,179,8,0.9)',
    badge: 'WASPADA',
  },
  Siaga: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    olColor: 'rgba(234,88,12,0.9)',
    badge: 'SIAGA',
  },
  Awas: {
    color: 'bg-red-100 text-red-700 border-red-200',
    olColor: 'rgba(220,38,38,0.95)',
    badge: 'AWAS',
  },
}

const GUNUNG_LIST: GunungData[] = [
  { nama: 'Merapi', provinsi: 'Jawa Tengah / DIY', lat: -7.542, lon: 110.442, ketinggian: 2930, level: 'Siaga', statusNote: 'Aktivitas guguran lava meningkat, radius bahaya 7 km', lastUpdate: '2026-07-06' },
  { nama: 'Semeru', provinsi: 'Jawa Timur', lat: -8.108, lon: 112.922, ketinggian: 3676, level: 'Siaga', statusNote: 'Erupsi eksplosif periodik, awan panas guguran aktif', lastUpdate: '2026-07-06' },
  { nama: 'Sinabung', provinsi: 'Sumatera Utara', lat: 3.170, lon: 98.392, ketinggian: 2460, level: 'Waspada', statusNote: 'Aktivitas solfatara stabil, pemukiman jarak 3 km aman', lastUpdate: '2026-07-05' },
  { nama: 'Agung', provinsi: 'Bali', lat: -8.342, lon: 115.508, ketinggian: 3031, level: 'Waspada', statusNote: 'Kegempaan vulkanik rendah, tidak ada erupsi aktif', lastUpdate: '2026-07-05' },
  { nama: 'Krakatau', provinsi: 'Banten / Lampung', lat: -6.102, lon: 105.423, ketinggian: 813, level: 'Waspada', statusNote: 'Letusan freatik kecil, zona bahaya radius 2 km', lastUpdate: '2026-07-04' },
  { nama: 'Soputan', provinsi: 'Sulawesi Utara', lat: 1.112, lon: 124.725, ketinggian: 1784, level: 'Normal', statusNote: 'Aktivitas rendah, gempa vulkanik jarang', lastUpdate: '2026-07-03' },
  { nama: 'Dukono', provinsi: 'Maluku Utara', lat: 1.693, lon: 127.894, ketinggian: 1335, level: 'Siaga', statusNote: 'Erupsi menerus dengan kolom abu tinggi 1-2 km', lastUpdate: '2026-07-06' },
  { nama: 'Ruang', provinsi: 'Sulawesi Utara', lat: 2.303, lon: 125.368, ketinggian: 725, level: 'Awas', statusNote: 'Erupsi besar, evakuasi radius 7 km diaktifkan', lastUpdate: '2026-07-06' },
  { nama: 'Karangetang', provinsi: 'Sulawesi Utara', lat: 2.781, lon: 125.407, ketinggian: 1784, level: 'Siaga', statusNote: 'Leleran lava aktif ke sektor tenggara-selatan', lastUpdate: '2026-07-06' },
  { nama: 'Kerinci', provinsi: 'Jambi', lat: -1.697, lon: 101.264, ketinggian: 3805, level: 'Waspada', statusNote: 'Asap solfatara tipis, tidak ada erupsi eksplosif', lastUpdate: '2026-07-04' },
  { nama: 'Raung', provinsi: 'Jawa Timur', lat: -8.125, lon: 114.042, ketinggian: 3332, level: 'Normal', statusNote: 'Aktivitas rendah, tidak ada kejadian signifikan', lastUpdate: '2026-07-02' },
  { nama: 'Ili Lewotolok', provinsi: 'NTT', lat: -8.274, lon: 123.506, ketinggian: 1423, level: 'Siaga', statusNote: 'Erupsi strombolian, lontaran lava pijar 500 m', lastUpdate: '2026-07-06' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function GunungBerapiPage() {
  const [selectedGunung, setSelectedGunung] = useState<GunungData | null>(null)

  const handleMapReady = useCallback((map: OlMap) => {
    const features = GUNUNG_LIST.map((g) => {
      const f = new Feature({ geometry: new Point(fromLonLat([g.lon, g.lat])) })
      f.set('level', g.level)
      f.set('nama', g.nama)
      return f
    })

    const source = new VectorSource({ features })
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const level = feature.get('level') as Level
        const { olColor } = LEVEL_CONFIG[level]
        const nama = feature.get('nama') as string
        return new Style({
          image: new CircleStyle({
            radius: level === 'Awas' ? 10 : level === 'Siaga' ? 8 : 6,
            fill: new Fill({ color: olColor }),
            stroke: new Stroke({ color: '#fff', width: 1.5 }),
          }),
          text: new OlText({
            text: nama,
            font: 'bold 10px sans-serif',
            fill: new Fill({ color: '#1e293b' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
            offsetY: -14,
          }),
        })
      },
    })
    map.addLayer(layer)
  }, [])

  const awasCount = GUNUNG_LIST.filter((g) => g.level === 'Awas').length
  const siagaCount = GUNUNG_LIST.filter((g) => g.level === 'Siaga').length
  const waspadaCount = GUNUNG_LIST.filter((g) => g.level === 'Waspada').length

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Mountain}
        iconBg="bg-slate-100 text-slate-700"
        label="Gunung Dipantau"
        value={GUNUNG_LIST.length}
        sub="Gunung Api Aktif"
      />
      <PantauanStatWidget
        icon={AlertTriangle}
        iconBg="bg-red-100 text-red-600"
        label="Level AWAS"
        value={awasCount}
        sub="Evakuasi Aktif"
        trend={awasCount > 0 ? 'up' : 'neutral'}
        trendLabel={awasCount > 0 ? '⚠ Darurat' : ''}
      />
      <PantauanStatWidget
        icon={AlertTriangle}
        iconBg="bg-orange-100 text-orange-600"
        label="Level SIAGA"
        value={siagaCount}
        sub="Peningkatan Aktivitas"
      />
      <PantauanStatWidget
        icon={Eye}
        iconBg="bg-yellow-100 text-yellow-600"
        label="Level WASPADA"
        value={waspadaCount}
        sub="Pemantauan Intensif"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-teal-100 text-teal-700"
        label="Sumber Data"
        value="PVMBG"
        sub="MAGMA Indonesia"
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">PETA STATUS GUNUNG BERAPI AKTIF INDONESIA</p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {(['Normal', 'Waspada', 'Siaga', 'Awas'] as Level[]).map((l) => (
            <span key={l} className="flex items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white inline-block"
                style={{ background: LEVEL_CONFIG[l].olColor }}
              />
              {l}
            </span>
          ))}
        </div>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Status gunung berapi bersumber dari PVMBG / MAGMA Indonesia (magma.esdm.go.id)</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="space-y-3">
      {/* Level Legend */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-teal-600" />
          Keterangan Level
        </p>
        {([
          { level: 'Awas' as Level, desc: 'Erupsi besar, evakuasi wajib' },
          { level: 'Siaga' as Level, desc: 'Menuju erupsi, aktivitas tinggi' },
          { level: 'Waspada' as Level, desc: 'Meningkat, pemantauan intensif' },
          { level: 'Normal' as Level, desc: 'Aktivitas rendah, stabil' },
        ]).map(({ level, desc }) => (
          <div key={level} className="flex items-center gap-2">
            <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${LEVEL_CONFIG[level].color}`}>
              {level.toUpperCase()}
            </span>
            <span className="text-[11px] text-slate-500">{desc}</span>
          </div>
        ))}
      </div>

      {/* Daftar Gunung */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Daftar Gunung Aktif</p>
        </div>
        <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
          {GUNUNG_LIST.sort((a, b) => {
            const order: Level[] = ['Awas', 'Siaga', 'Waspada', 'Normal']
            return order.indexOf(a.level) - order.indexOf(b.level)
          }).map((g) => (
            <button
              key={g.nama}
              onClick={() => setSelectedGunung(g === selectedGunung ? null : g)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{g.nama}</p>
                  <p className="text-[11px] text-slate-500">{g.provinsi} · {g.ketinggian.toLocaleString()} mdpl</p>
                </div>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_CONFIG[g.level].color}`}>
                  {g.level.toUpperCase()}
                </span>
              </div>
              {selectedGunung?.nama === g.nama && (
                <p className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-200">
                  {g.statusNote}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Gunung Berapi"
      description="Status dan aktivitas gunung berapi aktif di Indonesia berdasarkan data PVMBG / MAGMA Indonesia"
      sourceLabel="MAGMA Indonesia"
      sourceUrl="https://magma.esdm.go.id"
      icon={Mountain}
      iconBg="bg-orange-100 text-orange-600"
      lastUpdated={new Date().toLocaleDateString('id-ID')}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
