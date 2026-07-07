'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity, AlertCircle, Clock, MapPin, Waves, Loader2
} from 'lucide-react'
import dynamic from 'next/dynamic'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, Circle as CircleStyle, Text as OlText } from 'ol/style'
import OlMap from 'ol/Map'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────────

interface GempaItem {
  DateTime: string
  Coordinates: string
  Lintang: string
  Bujur: string
  Magnitude: string
  Kedalaman: string
  Wilayah: string
  Potensi?: string
  Shakemap?: string
}

interface BmkgResponse {
  Infogempa?: {
    gempa?: GempaItem
  }
  gempa?: GempaItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function magnitudeColor(mag: number): string {
  if (mag >= 7) return 'rgba(220,38,38,0.85)'
  if (mag >= 5.5) return 'rgba(234,88,12,0.85)'
  if (mag >= 4) return 'rgba(234,179,8,0.85)'
  return 'rgba(22,163,74,0.7)'
}

function magnitudeRadius(mag: number): number {
  return Math.max(6, mag * 5)
}

function parseLonLat(lintang: string, bujur: string): [number, number] | null {
  const lat = parseFloat(lintang.replace(',', '.').replace('LS', '-').replace('LU', ''))
  const lon = parseFloat(bujur.replace(',', '.').replace('BT', ''))
  if (isNaN(lat) || isNaN(lon)) return null
  return [lon, lintang.includes('LS') ? -Math.abs(lat) : Math.abs(lat)]
}

// ── Mock fallback data ────────────────────────────────────────────────────────

const MOCK_GEMPA: GempaItem[] = [
  { DateTime: '2026/07/06 14:32:00', Coordinates: '-8.23,115.56', Lintang: '8.23 LS', Bujur: '115.56 BT', Magnitude: '4.5', Kedalaman: '10 Km', Wilayah: 'Karangasem Bali', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/06 11:15:00', Coordinates: '-2.45,140.12', Lintang: '2.45 LS', Bujur: '140.12 BT', Magnitude: '5.2', Kedalaman: '32 Km', Wilayah: 'Jayapura Papua', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/06 08:02:00', Coordinates: '3.56,96.78', Lintang: '3.56 LU', Bujur: '96.78 BT', Magnitude: '5.7', Kedalaman: '15 Km', Wilayah: 'Aceh Selatan', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/05 23:44:00', Coordinates: '-7.12,108.90', Lintang: '7.12 LS', Bujur: '108.90 BT', Magnitude: '3.8', Kedalaman: '8 Km', Wilayah: 'Garut Jawa Barat', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/05 19:55:00', Coordinates: '-1.23,120.45', Lintang: '1.23 LS', Bujur: '120.45 BT', Magnitude: '6.1', Kedalaman: '45 Km', Wilayah: 'Sulteng Palu', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/05 14:30:00', Coordinates: '-8.50,122.00', Lintang: '8.50 LS', Bujur: '122.00 BT', Magnitude: '4.9', Kedalaman: '20 Km', Wilayah: 'Flores NTT', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/05 11:10:00', Coordinates: '-0.90,133.50', Lintang: '0.90 LS', Bujur: '133.50 BT', Magnitude: '5.5', Kedalaman: '28 Km', Wilayah: 'Manokwari Papua Barat', Potensi: 'Tidak berpotensi Tsunami' },
  { DateTime: '2026/07/05 07:22:00', Coordinates: '-6.45,107.20', Lintang: '6.45 LS', Bujur: '107.20 BT', Magnitude: '3.5', Kedalaman: '5 Km', Wilayah: 'Bandung Jawa Barat' },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function GempaBumiPage() {
  const [gempaList, setGempaList] = useState<GempaItem[]>(MOCK_GEMPA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchGempa = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // BMKG public API — may have CORS; fallback to mock if fails
      const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error('Gagal memuat data BMKG')
      const json: BmkgResponse = await res.json()
      const list = json.gempa || []
      if (list.length > 0) {
        setGempaList(list.slice(0, 15))
        setLastUpdated(new Date().toLocaleString('id-ID'))
      }
    } catch {
      setError('Tidak dapat memuat data BMKG secara langsung. Menampilkan data contoh.')
      setLastUpdated(new Date().toLocaleString('id-ID') + ' (Contoh)')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGempa()
  }, [fetchGempa])

  const handleMapReady = useCallback(
    (map: OlMap) => {
      const features = gempaList
        .map((g) => {
          const coord = parseLonLat(g.Lintang, g.Bujur)
          if (!coord) return null
          const mag = parseFloat(g.Magnitude) || 0
          const f = new Feature({ geometry: new Point(fromLonLat(coord)) })
          f.set('mag', mag)
          f.set('wilayah', g.Wilayah)
          f.set('datetime', g.DateTime)
          return f
        })
        .filter(Boolean) as Feature[]

      const source = new VectorSource({ features })
      const layer = new VectorLayer({
        source,
        style: (feature) => {
          const mag = feature.get('mag') as number
          return new Style({
            image: new CircleStyle({
              radius: magnitudeRadius(mag),
              fill: new Fill({ color: magnitudeColor(mag) }),
              stroke: new Stroke({ color: '#fff', width: 1.5 }),
            }),
            text: new OlText({
              text: mag >= 5 ? `M${mag}` : '',
              font: 'bold 10px sans-serif',
              fill: new Fill({ color: '#fff' }),
              offsetY: 1,
            }),
          })
        },
      })
      map.addLayer(layer)
    },
    [gempaList]
  )

  const maxMag = gempaList.length
    ? Math.max(...gempaList.map((g) => parseFloat(g.Magnitude) || 0))
    : 0
  const besar = gempaList.filter((g) => parseFloat(g.Magnitude) >= 5).length

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Activity}
        iconBg="bg-red-100 text-red-600"
        label="Gempa Terbaru"
        value={gempaList.length}
        sub="Data BMKG"
      />
      <PantauanStatWidget
        icon={AlertCircle}
        iconBg="bg-orange-100 text-orange-600"
        label="Magnitudo Tertinggi"
        value={`M ${maxMag.toFixed(1)}`}
        sub="24 Jam Terakhir"
        trend={maxMag >= 6 ? 'up' : 'neutral'}
        trendLabel={maxMag >= 6 ? '⚠ Signifikan' : ''}
      />
      <PantauanStatWidget
        icon={Waves}
        iconBg="bg-blue-100 text-blue-600"
        label="Gempa ≥ M5.0"
        value={besar}
        sub="Perlu Diwaspadai"
      />
      <PantauanStatWidget
        icon={MapPin}
        iconBg="bg-teal-100 text-teal-700"
        label="Sumber Data"
        value="BMKG"
        sub="data.bmkg.go.id"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Diperbarui"
        value="Otomatis"
        sub={lastUpdated || '—'}
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">PETA SEBARAN GEMPA BUMI — BMKG</p>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />M &lt; 4</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />M 4–5.5</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />M 5.5–7</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" />M ≥ 7</span>
        </div>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">*) Ukuran lingkaran = besarnya magnitudo. Data bersumber dari BMKG.</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-500" />
          Gempa Terkini
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
          {gempaList.slice(0, 12).map((g, i) => {
            const mag = parseFloat(g.Magnitude) || 0
            const badgeColor =
              mag >= 6
                ? 'bg-red-100 text-red-700 border-red-200'
                : mag >= 5
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-green-100 text-green-700 border-green-200'
            return (
              <div key={i} className="px-4 py-3 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{g.Wilayah}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {g.Kedalaman} • {g.DateTime?.split(' ')[0]}
                    </p>
                    {g.Potensi && (
                      <p className="text-[10px] text-slate-400 mt-0.5 italic">{g.Potensi}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold ${badgeColor}`}>
                    M{mag.toFixed(1)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100">
        <a
          href="https://www.bmkg.go.id/gempabumi/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-teal-600 hover:underline"
        >
          → Lihat semua di BMKG
        </a>
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Gempa Bumi"
      description="Monitoring gempa bumi real-time dari BMKG — peta persebaran, magnitudo, dan kedalaman"
      sourceLabel="BMKG"
      sourceUrl="https://www.bmkg.go.id"
      icon={Activity}
      iconBg="bg-orange-100 text-orange-600"
      lastUpdated={lastUpdated}
      onRefresh={fetchGempa}
      loading={loading}
      error={error}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
