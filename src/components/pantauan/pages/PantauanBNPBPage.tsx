'use client'

import { useRef, useState, useCallback } from 'react'
import { Shield, MapPin, AlertTriangle, Users, BarChart2, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'
import OlMap from 'ol/Map'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Fill, Stroke, Style, Text as OlText } from 'ol/style'

const PantauanMapBase = dynamic(() => import('../PantauanMapBase'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────────

interface BencanaItem {
  nama_prov: string
  kode_prov: string
  jumlah: number
  korban: number
}

interface BnpbStats {
  totalKejadian: number
  totalKorban: number
  totalProvinsi: number
  totalKrisis: number
  lastUpdated: string
}

// ── Mock data (akan diganti API BNPB bila tersedia / tidak CORS) ───────────────

const MOCK_PROVINSI_DATA: BencanaItem[] = [
  { nama_prov: 'Jawa Barat', kode_prov: '32', jumlah: 142, korban: 1230 },
  { nama_prov: 'Jawa Tengah', kode_prov: '33', jumlah: 98, korban: 870 },
  { nama_prov: 'Sumatera Barat', kode_prov: '13', jumlah: 87, korban: 560 },
  { nama_prov: 'Jawa Timur', kode_prov: '35', jumlah: 76, korban: 490 },
  { nama_prov: 'Sulawesi Selatan', kode_prov: '73', jumlah: 65, korban: 380 },
  { nama_prov: 'Aceh', kode_prov: '11', jumlah: 54, korban: 320 },
  { nama_prov: 'Kalimantan Barat', kode_prov: '61', jumlah: 48, korban: 200 },
  { nama_prov: 'Sulawesi Tenggara', kode_prov: '74', jumlah: 42, korban: 180 },
  { nama_prov: 'NTT', kode_prov: '53', jumlah: 39, korban: 310 },
  { nama_prov: 'Papua', kode_prov: '91', jumlah: 31, korban: 120 },
]

const MOCK_STATS: BnpbStats = {
  totalKejadian: 1247,
  totalKorban: 8542,
  totalProvinsi: 34,
  totalKrisis: 23,
  lastUpdated: new Date().toLocaleString('id-ID'),
}

function getKejadianColor(jumlah: number): string {
  if (jumlah > 100) return 'rgba(220,38,38,0.7)'
  if (jumlah >= 60) return 'rgba(234,179,8,0.7)'
  return 'rgba(22,163,74,0.7)'
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PantauanBNPBPage() {
  const [stats] = useState<BnpbStats>(MOCK_STATS)
  const [provinsiData] = useState<BencanaItem[]>(MOCK_PROVINSI_DATA)
  const mapRef = useRef<OlMap | null>(null)

  const handleMapReady = useCallback((map: OlMap) => {
    mapRef.current = map

    fetch('/geojson/indonesia-provinces.geojson')
      .catch(() => null)
      .then((res) => {
        if (!res || !res.ok) return null
        return res.json()
      })
      .then((geoData) => {
        if (!geoData) return

        const source = new VectorSource({
          features: new GeoJSON().readFeatures(geoData, {
            featureProjection: 'EPSG:3857',
          }),
        })

        const vector = new VectorLayer({
          source,
          style: (feature) => {
            const provName = (feature.get('Propinsi') || feature.get('name') || '').toUpperCase()
            const match = provinsiData.find((p) =>
              provName.includes(p.nama_prov.toUpperCase().split(' ')[0])
            )
            const jumlah = match?.jumlah || 5
            return new Style({
              fill: new Fill({ color: getKejadianColor(jumlah) }),
              stroke: new Stroke({ color: '#fff', width: 0.8 }),
              text: new OlText({
                text: match ? `${match.jumlah}` : '',
                font: 'bold 11px sans-serif',
                fill: new Fill({ color: '#fff' }),
              }),
            })
          },
        })
        map.addLayer(vector)
      })
  }, [provinsiData])

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={AlertTriangle}
        iconBg="bg-red-100 text-red-600"
        label="Total Kejadian"
        value={stats.totalKejadian}
        sub="Seluruh Indonesia"
        trend="up"
        trendLabel="+12% bulan ini"
      />
      <PantauanStatWidget
        icon={Users}
        iconBg="bg-orange-100 text-orange-600"
        label="Total Terdampak"
        value={stats.totalKorban}
        sub="Korban & Pengungsi"
      />
      <PantauanStatWidget
        icon={MapPin}
        iconBg="bg-blue-100 text-blue-600"
        label="Provinsi Terdampak"
        value={stats.totalProvinsi}
        sub="Dari 38 Provinsi"
      />
      <PantauanStatWidget
        icon={Shield}
        iconBg="bg-teal-100 text-teal-700"
        label="Status Krisis"
        value={stats.totalKrisis}
        sub="Kejadian Krisis Aktif"
        trend="up"
        trendLabel="▲ Meningkat"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Diperbarui"
        value="Real-time"
        sub="Sumber: GIS BNPB"
      />
    </>
  )

  const mapContent = (
    <div>
      <div className="border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-600">PETA SEBARAN PANTAUAN BENCANA BNPB</p>
      </div>
      <PantauanMapBase height="460px" onMapReady={handleMapReady} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-green-600/80 border border-white" />
          Kejadian ≤ 60
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-yellow-500/80 border border-white" />
          Kejadian 60–100
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-red-600/80 border border-white" />
          Kejadian &gt; 100
        </div>
        <p className="ml-auto text-[11px] text-slate-400">*) Data Terintegrasi dengan INARISK BNPB</p>
      </div>
    </div>
  )

  const sideContent = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-teal-600" />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Provinsi Dengan Kejadian Tertinggi
          </p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {provinsiData.slice(0, 8).map((prov, i) => {
          const max = provinsiData[0].jumlah
          const pct = Math.round((prov.jumlah / max) * 100)
          const color =
            prov.jumlah > 100 ? 'bg-red-500' : prov.jumlah >= 60 ? 'bg-yellow-500' : 'bg-green-500'
          return (
            <div key={prov.kode_prov} className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">
                  {i + 1}. {prov.nama_prov}
                </span>
                <span className="text-xs font-bold text-slate-800">{prov.jumlah}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">*) Data bersumber dari http://gis.bnpb.go.id/</p>
      </div>
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Pantauan BNPB"
      description="Peta sebaran dan statistik kejadian bencana di seluruh Indonesia berdasarkan data BNPB"
      sourceLabel="GIS BNPB"
      sourceUrl="https://gis.bnpb.go.id"
      icon={Shield}
      iconBg="bg-red-100 text-red-600"
      lastUpdated={stats.lastUpdated}
      statWidgets={statWidgets}
      mapContent={mapContent}
      sideContent={sideContent}
    />
  )
}
