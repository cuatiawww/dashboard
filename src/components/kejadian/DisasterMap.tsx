'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Settings, X, MapPin, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'

// OpenLayers core
import OlMap from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import 'ol/ol.css'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface MarkerData {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  total_korban: number
}

interface DisasterMapProps {
  markers: MarkerData[]
  userScope?: any
  onSelectProvince?: (prov: string) => void
  isGuest?: boolean
}

interface MarkerPopupState {
  data: MarkerData
  x: number   // pixel x di dalam container peta
  y: number   // pixel y di dalam container peta
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Normalisasi nama wilayah → key perbandingan (strip prefix, uppercase, tanpa spasi/simbol) */
const cleanKey = (name?: string | null) => {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^(KAB\.|KABUPATEN|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI)\s+/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

/** Ambil nama provinsi dari properties feature OL (berbagai kemungkinan key) */
const getFeatureName = (feature: any, level: 'provinsi' | 'kabupaten') => {
  if (!feature) return ''
  const props = feature.getProperties() || {}
  const keys = level === 'provinsi'
    ? ['provinsi', 'PROVINSI', 'Propinsi', 'nama_prov', 'nama', 'prov_single', 'prov_multi']
    : ['nama_kab', 'NAMA_KAB', 'kabupaten', 'KABUPATEN', 'kab_single', 'kab_multi', 'nama']
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null) return String(props[key]).trim()
  }
  return ''
}

/** Warna choropleth berdasarkan jumlah kejadian */
const choroplethColor = (count: number) => {
  if (count === 0) return 'rgba(241, 245, 249, 0.15)'
  if (count <= 2) return '#facc15'
  if (count <= 5) return '#f97316'
  return '#dc2626'
}

/** Style choropleth OL */
const choroplethStyle = (count: number) =>
  new Style({
    fill: new Fill({ color: choroplethColor(count) }),
    stroke: new Stroke({
      color: count === 0 ? 'rgba(148, 163, 184, 0.4)' : '#ffffff',
      width: count === 0 ? 0.8 : 1.2,
    }),
  })

/** Warna pin marker berdasarkan total korban */
const pinColor = (totalKorban: number) => {
  if (totalKorban === 0) return '#94a3b8'
  if (totalKorban <= 5) return '#facc15'
  if (totalKorban <= 20) return '#f97316'
  return '#dc2626'
}

/** Style OL untuk marker pin */
const markerStyle = (totalKorban: number) =>
  new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: pinColor(totalKorban) }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })

// Cache GeoJSON agar tidak fetch ulang setiap render
const geojsonCache: Record<string, any> = {}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function DisasterMap({ markers, userScope, onSelectProvince, isGuest: propIsGuest }: DisasterMapProps) {
  const { token, user, isGuest: storeIsGuest } = useAuthStore()
  const isGuest = propIsGuest || storeIsGuest || !token || !user

  // ── Map refs ──
  const mapRef             = useRef<HTMLDivElement | null>(null)
  const mapContainerRef    = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef     = useRef<OlMap | null>(null)
  const provinceLayerRef   = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const kabupatenLayerRef  = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const markerLayerRef     = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const lastFetchedProvinceRef = useRef<string | null>(null)

  // Stable callback refs (avoid stale closures inside OL event handlers)
  const onSelectProvinceRef = useRef(onSelectProvince)
  const userScopeRef        = useRef(userScope)
  const markersRef          = useRef(markers)

  // ── UI state ──
  const [isLoading, setIsLoading]         = useState(false)
  const [showSettings, setShowSettings]   = useState(false)
  const [showMarkers, setShowMarkers]     = useState(true)  // toggle pin visibility
  const [markerPopup, setMarkerPopup]     = useState<MarkerPopupState | null>(null)

  // Polygon popup state (existing click-on-province/kabupaten popup)
  const [activePopup, setActivePopup] = useState<{
    type: 'provinsi' | 'kabupaten'
    name: string
    stats: {
      totalEvents: number
      totalKorban: number
      breakdown: { name: string; count: number; totalKorban: number }[]
      eventsList?: MarkerData[]
    }
  } | null>(null)

  // ── Sync refs ──
  useEffect(() => {
    onSelectProvinceRef.current = onSelectProvince
    userScopeRef.current        = userScope
    markersRef.current          = markers
  }, [onSelectProvince, userScope, markers])

  // Dismiss popup on scope changes
  useEffect(() => {
    setActivePopup(null)
    setMarkerPopup(null)
  }, [userScope])

  // ─────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────

  const { provinceCounts, kabupatenCounts } = useMemo(() => {
    const provinceCounts  = new Map<string, number>()
    const kabupatenCounts = new Map<string, number>()
    markers.forEach((m) => {
      if (m.provinsi)  provinceCounts.set(cleanKey(m.provinsi),   (provinceCounts.get(cleanKey(m.provinsi))   || 0) + 1)
      if (m.kabupaten) kabupatenCounts.set(cleanKey(m.kabupaten), (kabupatenCounts.get(cleanKey(m.kabupaten)) || 0) + 1)
    })
    return { provinceCounts, kabupatenCounts }
  }, [markers])

  // ─────────────────────────────────────────────
  // Initialize Map (once)
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return

    // Province choropleth layer
    const provinceLayer  = new VectorLayer({ source: new VectorSource() })
    provinceLayerRef.current = provinceLayer

    // Kabupaten choropleth layer
    const kabupatenLayer = new VectorLayer({ source: new VectorSource() })
    kabupatenLayerRef.current = kabupatenLayer

    // Marker pin layer
    const markerLayer = new VectorLayer({ source: new VectorSource(), zIndex: 10 })
    markerLayerRef.current = markerLayer

    const map = new OlMap({
      target: mapRef.current,
      layers: [provinceLayer, kabupatenLayer, markerLayer],
      controls: defaultControls({ attribution: false }),
      view: new View({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        minZoom: 4,
        maxZoom: 15,
      }),
    })

    // ── Click handler ──
    map.on('singleclick', (evt) => {
      // Check marker pin first (highest priority)
      const markerFeature = map.forEachFeatureAtPixel(
        evt.pixel,
        (f) => f,
        { layerFilter: (l) => l === markerLayerRef.current }
      )

      if (markerFeature) {
        const data = markerFeature.get('markerData') as MarkerData

        // Calculate pixel position relative to map container
        const container = mapContainerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const mapRect = mapRef.current!.getBoundingClientRect()
          const x = evt.pixel[0] + (mapRect.left - rect.left)
          const y = evt.pixel[1] + (mapRect.top - rect.top)
          setMarkerPopup({ data, x, y })
        }

        setActivePopup(null)
        return
      }

      // Check polygon features
      const polyFeature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)

      if (!polyFeature) {
        setActivePopup(null)
        setMarkerPopup(null)
        return
      }

      setMarkerPopup(null)

      const currentScope = userScopeRef.current
      const isProvMode   = currentScope?.mode === 'provinsi'
      const isKabMode    = currentScope?.mode === 'kabupaten'

      if (!isProvMode && !isKabMode) {
        // National mode → clicked province
        const provName = getFeatureName(polyFeature, 'provinsi')
        if (!provName) return

        const provCleaned  = cleanKey(provName)
        const provMarkers  = markersRef.current.filter((m) => cleanKey(m.provinsi) === provCleaned)

        // Group by kabupaten
        const kabMap = new Map<string, { count: number; totalKorban: number }>()
        provMarkers.forEach((m) => {
          const kab      = m.kabupaten || 'LAINNYA'
          const existing = kabMap.get(kab) || { count: 0, totalKorban: 0 }
          existing.count++
          existing.totalKorban += m.total_korban || 0
          kabMap.set(kab, existing)
        })

        const breakdown  = Array.from(kabMap.entries())
          .map(([name, s]) => ({ name, count: s.count, totalKorban: s.totalKorban }))
          .sort((a, b) => b.count - a.count)

        setActivePopup({
          type: 'provinsi',
          name: provName,
          stats: {
            totalEvents: provMarkers.length,
            totalKorban: provMarkers.reduce((s, m) => s + (m.total_korban || 0), 0),
            breakdown,
          },
        })
      } else {
        // Province/kabupaten mode → clicked kabupaten
        const kabName = getFeatureName(polyFeature, 'kabupaten')
        if (!kabName) return

        const kabCleaned = cleanKey(kabName)
        const kabMarkers = markersRef.current.filter((m) => cleanKey(m.kabupaten) === kabCleaned)

        setActivePopup({
          type: 'kabupaten',
          name: kabName,
          stats: {
            totalEvents: kabMarkers.length,
            totalKorban: kabMarkers.reduce((s, m) => s + (m.total_korban || 0), 0),
            breakdown: [],
            eventsList: kabMarkers,
          },
        })
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [])

  // ─────────────────────────────────────────────
  // Load Province GeoJSON (once)
  // ─────────────────────────────────────────────

  useEffect(() => {
    const map          = mapInstanceRef.current
    const provinceLayer = provinceLayerRef.current
    if (!map || !provinceLayer) return

    const source = provinceLayer.getSource()!
    if (source.getFeatures().length > 0) return  // already loaded

    const cacheKey = 'level_provinsi'
    const load = (geojson: any) => {
      const features = new GeoJSON().readFeatures(geojson, {
        dataProjection: 'EPSG:4326',
        featureProjection: map.getView().getProjection(),
      })
      source.addFeatures(features)
    }

    if (geojsonCache[cacheKey]) {
      load(geojsonCache[cacheKey])
    } else {
      setIsLoading(true)
      fetch('/api/wilayah-geojson?level=provinsi')
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data.geojson) {
            geojsonCache[cacheKey] = data.geojson
            load(data.geojson)
          }
        })
        .catch((e) => console.error('GeoJSON provinsi gagal:', e))
        .finally(() => setIsLoading(false))
    }
  }, [])

  // ─────────────────────────────────────────────
  // Load/Clear Kabupaten GeoJSON based on scope
  // ─────────────────────────────────────────────

  useEffect(() => {
    const map           = mapInstanceRef.current
    const kabupatenLayer = kabupatenLayerRef.current
    if (!map || !kabupatenLayer) return

    const kabSource    = kabupatenLayer.getSource()!
    const isProvMode   = userScope?.mode === 'provinsi'
    const isKabMode    = userScope?.mode === 'kabupaten'
    const provinceName = userScope?.provinsi?.label || ''
    const kabupatenName = userScope?.kabupaten?.label || ''

    if ((isProvMode || isKabMode) && provinceName) {
      const focusMap = (features: any[]) => {
        if (isKabMode && kabupatenName) {
          const target = features.find((f) => cleanKey(f.get('nama_kab') || f.get('kabupaten')) === cleanKey(kabupatenName))
          if (target) {
            map.getView().fit(target.getGeometry().getExtent(), { padding: [100, 100, 100, 100], duration: 500 })
            return
          }
        }
        const extent = kabSource.getExtent()
        if (extent && features.length > 0) {
          map.getView().fit(extent, { padding: [40, 40, 40, 40], duration: 500 })
        }
      }

      if (lastFetchedProvinceRef.current !== provinceName) {
        lastFetchedProvinceRef.current = provinceName
        const cacheKey = `level_kabupaten_${provinceName}`
        const load = (geojson: any) => {
          kabSource.clear()
          const features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: map.getView().getProjection(),
          })
          kabSource.addFeatures(features)
          focusMap(features)
        }

        if (geojsonCache[cacheKey]) {
          load(geojsonCache[cacheKey])
        } else {
          setIsLoading(true)
          fetch(`/api/wilayah-geojson?level=kabupaten&province=${encodeURIComponent(provinceName)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data?.success && data.geojson) {
                geojsonCache[cacheKey] = data.geojson
                load(data.geojson)
              }
            })
            .catch((e) => console.error('GeoJSON kabupaten gagal:', e))
            .finally(() => setIsLoading(false))
        }
      } else {
        focusMap(kabSource.getFeatures())
      }
    } else {
      lastFetchedProvinceRef.current = null
      kabSource.clear()
      map.getView().animate({ center: fromLonLat([118, -2.5]), zoom: 4.8, duration: 500 })
    }
  }, [userScope])

  // ─────────────────────────────────────────────
  // Re-style choropleth layers when data changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    const provinceLayer  = provinceLayerRef.current
    const kabupatenLayer = kabupatenLayerRef.current
    if (!provinceLayer || !kabupatenLayer) return

    const isProvMode       = userScope?.mode === 'provinsi'
    const isKabMode        = userScope?.mode === 'kabupaten'
    const targetProvKey    = cleanKey(userScope?.provinsi?.label || '')
    const targetKabKey     = cleanKey(userScope?.kabupaten?.label || '')

    provinceLayer.setStyle((feature: any) => {
      const provKey = cleanKey(feature.get('provinsi'))
      if (isProvMode || isKabMode) {
        // Selected province → transparent (kabupaten layer shows through)
        if (provKey === targetProvKey) {
          return new Style({ fill: new Fill({ color: 'rgba(0,0,0,0)' }), stroke: new Stroke({ color: 'rgba(0,0,0,0)', width: 0 }) })
        }
        // Other provinces → muted gray
        return new Style({
          fill: new Fill({ color: 'rgba(226, 232, 240, 0.5)' }),
          stroke: new Stroke({ color: 'rgba(203, 213, 225, 0.4)', width: 1 }),
        })
      }
      // National choropleth
      return choroplethStyle(provinceCounts.get(provKey) || 0)
    })

    kabupatenLayer.setStyle((feature: any) => {
      const kabKey = cleanKey(feature.get('nama_kab') || feature.get('kabupaten'))
      const count  = kabupatenCounts.get(kabKey) || 0
      if (isKabMode && kabKey !== targetKabKey) {
        return new Style({
          fill: new Fill({ color: 'rgba(226, 232, 240, 0.5)' }),
          stroke: new Stroke({ color: 'rgba(203, 213, 225, 0.4)', width: 0.8 }),
        })
      }
      return choroplethStyle(count)
    })

    provinceLayer.changed()
    kabupatenLayer.changed()
  }, [userScope, provinceCounts, kabupatenCounts])

  // ─────────────────────────────────────────────
  // Sync marker features when markers/visibility changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    const markerLayer = markerLayerRef.current
    if (!markerLayer) return

    const map = mapInstanceRef.current
    const source = markerLayer.getSource()!
    source.clear()

    if (!showMarkers) {
      markerLayer.setVisible(false)
      return
    }

    markerLayer.setVisible(true)

    const features = markers
      .filter((m) => m.lat && m.lng && m.lat !== 0 && m.lng !== 0)
      .map((m) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([m.lng, m.lat])),
          markerData: m,
        })
        feature.setStyle(markerStyle(m.total_korban))
        return feature
      })

    source.addFeatures(features)
  }, [markers, showMarkers])

  // ─────────────────────────────────────────────
  // Legend / UI data
  // ─────────────────────────────────────────────

  const markerTitle  = userScope?.mode === 'provinsi' || userScope?.mode === 'kabupaten'
    ? 'SEBARAN KEJADIAN PER KABUPATEN/KOTA'
    : 'SEBARAN KEJADIAN PER PROVINSI'

  const choroplethLegend = [
    { label: '0 kejadian', color: 'rgba(241, 245, 249, 0.8)' },
    { label: '1 – 2 kejadian', color: '#facc15' },
    { label: '3 – 5 kejadian', color: '#f97316' },
    { label: '> 5 kejadian', color: '#dc2626' },
  ]

  const pinLegend = [
    { label: '0 korban', color: '#94a3b8' },
    { label: '1 – 5 korban', color: '#facc15' },
    { label: '6 – 20 korban', color: '#f97316' },
    { label: '> 20 korban', color: '#dc2626' },
  ]

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div
      ref={mapContainerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#f1fcfc]"
    >
      {/* ── OL Map canvas ── */}
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] border border-teal-100">
            <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            <span className="text-xs font-bold text-slate-700 tracking-wider uppercase">Memuat Peta Spasial...</span>
          </div>
        </div>
      )}

      {/* ── Settings button ── */}
      <button
        onClick={() => { setShowSettings(true); setMarkerPopup(null) }}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-md text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all"
        title="Pengaturan Peta"
      >
        <Settings className="h-4 w-4" />
      </button>

      {/* ── Settings panel (slide from right) ── */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-20 bg-black/10"
            onClick={() => setShowSettings(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 z-30 h-full w-72 bg-white/98 backdrop-blur-md border-l border-slate-200 shadow-[−8px_0_40px_rgba(0,0,0,0.08)] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-teal-700" />
                <span className="text-sm font-bold text-slate-800">Pengaturan Peta</span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* ── Tampilan section ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Tampilan
                </p>

                {/* Toggle marker pins */}
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-teal-50/50 hover:border-teal-100 transition-all">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Tampilkan Pin Marker</p>
                      <p className="text-[10px] text-slate-400">Titik lokasi kejadian bencana</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMarkers((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${showMarkers ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${showMarkers ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </button>
                </label>
              </div>

              {/* ── Placeholder sections for future features ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Layer Data
                </p>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center">
                  <p className="text-[11px] text-slate-400 italic">Fitur layer data akan hadir di sini</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                  Filter & Analisis
                </p>
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center">
                  <p className="text-[11px] text-slate-400 italic">Filter dan analisis spasial akan hadir di sini</p>
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] text-slate-400 text-center">
                SIPKK · Sistem Informasi PKK
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Marker Pin Popup ── */}
      {markerPopup && (
        <div
          className="absolute z-10 w-[280px] rounded-2xl border border-[#cbe3e2] bg-white/98 backdrop-blur-md shadow-[0_12px_40px_rgba(15,118,110,0.18)] transition-all duration-200"
          style={{
            left: Math.min(markerPopup.x + 10, (mapContainerRef.current?.offsetWidth || 800) - 295),
            top:  Math.max(markerPopup.y - 10, 8),
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 p-3 pb-2.5">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-teal-700">
                <MapPin className="h-2.5 w-2.5" />
                Lokasi Kejadian
              </span>
              <h4 className="mt-1 text-[13px] font-extrabold uppercase text-[#1a3535] leading-tight">
                {markerPopup.data.jenis_bencana || 'Kejadian Bencana'}
              </h4>
            </div>
            <button
              onClick={() => setMarkerPopup(null)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info rows */}
          <div className="p-3 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-16 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Tanggal</span>
              <span className="font-semibold text-slate-800">{markerPopup.data.tgl_kejadian || '—'}</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-16 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Lokasi</span>
              <span className="font-semibold text-slate-800 leading-snug">
                {[markerPopup.data.kecamatan && `Kec. ${markerPopup.data.kecamatan}`, markerPopup.data.kabupaten].filter(Boolean).join(', ') || markerPopup.data.provinsi || '—'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-16 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase">Korban</span>
              <span
                className="font-extrabold"
                style={{ color: pinColor(markerPopup.data.total_korban) }}
              >
                {markerPopup.data.total_korban > 0 ? `${markerPopup.data.total_korban.toLocaleString('id-ID')} orang` : 'Tidak ada korban'}
              </span>
            </div>
          </div>

          {/* Footer — Detail button */}
          {!isGuest && (
            <div className="border-t border-slate-100 p-2.5">
              <button
                onClick={() => {
                  // Buka modal detail (bisa dikembangkan lebih lanjut)
                  alert(`Detail kejadian: ${markerPopup.data.kode_trans}`)
                  // TODO: buka modal / drawer detail dengan kode_trans
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                LIHAT DETAIL
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Polygon Popup (existing: province / kabupaten click) ── */}
      {activePopup && (
        <div className="absolute right-5 top-14 z-10 w-[320px] max-h-[420px] flex flex-col rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] transition-all duration-300">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-3">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-teal-700">
                Detail {activePopup.type}
              </span>
              <h4 className="mt-1 text-sm font-extrabold uppercase tracking-wider text-[#1a3535] truncate">
                {activePopup.name}
              </h4>
            </div>
            <button
              onClick={() => setActivePopup(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isGuest ? (
            /* Guest restricted view */
            <div className="flex flex-col items-center py-5 text-center flex-1 justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mb-3 border border-red-100">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Data Terkunci</h5>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
                Statistik kejadian dan detail korban wilayah ini tidak dapat diakses publik.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                <a href="/login" className="flex w-full items-center justify-center rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white transition hover:bg-teal-800">
                  MASUK / LOGIN
                </a>
                <a href="/register" className="flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-50">
                  REGISTRASI MASYARAKAT
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Stats badges */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-teal-50/70 p-2 border border-teal-100/50">
                  <p className="text-[9px] font-bold text-teal-700/80 uppercase">Kejadian</p>
                  <p className="text-lg font-extrabold text-teal-700">{activePopup.stats.totalEvents}</p>
                </div>
                <div className="rounded-xl bg-red-50/70 p-2 border border-red-100/50">
                  <p className="text-[9px] font-bold text-red-700/80 uppercase">Total Korban</p>
                  <p className="text-lg font-extrabold text-red-600">{activePopup.stats.totalKorban.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Breakdown / events list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[200px]">
                {activePopup.type === 'provinsi' ? (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Sebaran per Kab/Kota:</p>
                    {activePopup.stats.breakdown.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada kejadian bencana.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activePopup.stats.breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center rounded-lg bg-slate-50/50 p-2 text-xs border border-slate-100">
                            <span className="font-semibold text-slate-700 truncate max-w-[180px]">{item.name}</span>
                            <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {item.count} kejadian
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Daftar Kejadian:</p>
                    {!activePopup.stats.eventsList?.length ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada kejadian bencana.</p>
                    ) : (
                      <div className="space-y-2">
                        {activePopup.stats.eventsList.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-teal-800">{item.jenis_bencana}</span>
                              <span className="text-[10px] text-slate-400">{item.tgl_kejadian}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {item.kecamatan && <span>Kec. {item.kecamatan}</span>}
                              {item.nama_desa && <span>, Desa {item.nama_desa}</span>}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-slate-200/60 pt-1.5">
                              <span className="text-[10px] text-slate-400">Korban:</span>
                              <span className="font-bold text-red-600">{item.total_korban} orang</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer action */}
              {activePopup.type === 'provinsi' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onSelectProvinceRef.current?.(activePopup.name)
                      setActivePopup(null)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    LIHAT DETAIL PROVINSI
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Legend (bottom-left) ── */}
      <div className="absolute bottom-5 left-5 max-w-[260px] rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,118,110,0.12)]">
        {/* Choropleth legend */}
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{markerTitle}</p>
        <div className="space-y-1.5 mb-3">
          {choroplethLegend.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-200 shadow-sm" style={{ background: b.color }} />
              <span className="text-[11px] font-medium text-slate-700">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Pin legend */}
        {showMarkers && (
          <>
            <div className="border-t border-slate-100 pt-2.5 mb-2">
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Pin Korban</span>
              </p>
              <div className="space-y-1.5">
                {pinLegend.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm" style={{ background: b.color }} />
                    <span className="text-[11px] font-medium text-slate-700">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
