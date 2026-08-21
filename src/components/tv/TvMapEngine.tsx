'use client'

import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import TileArcGISRest from 'ol/source/TileArcGISRest'
import GeoJSON from 'ol/format/GeoJSON'
import { Fill, Stroke, Style, Circle as CircleStyle, Icon, Text as OlText } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Overlay from 'ol/Overlay'
import { defaults as defaultControls } from 'ol/control'
import { WindLayer } from 'ol-wind'
import 'ol/ol.css'
import { TvLayerState } from './TvLayerServicesDrawer'

function destroyWindLayerSafely(wl: any) {
  if (!wl) return
  try { wl.setVisible?.(false) } catch {}
  const obj = wl as unknown as Record<string, unknown>
  const tryCall = (k: string, arg?: unknown) => {
    const fn = obj[k]
    if (typeof fn === 'function') {
      try { (fn as (a?: unknown) => void)(arg) } catch {}
    }
  }
  tryCall('stop')
  tryCall('destroy')
  tryCall('dispose')
  tryCall('remove')
  tryCall('setMap', null)
  tryCall('setTarget', null)
}

export interface TvMapEngineRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  resetView: () => void
  focusProvince: (provName: string | null) => void
}

interface MarkerData {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  kategori_bencana?: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  total_korban?: number
  icon_file?: string
  is_krisis?: number
}

interface BmkgGempa {
  Wilayah: string
  Magnitude: string
  Kedalaman: string
  Coordinates: string
  Potensi: string
  Tanggal: string
  Jam: string
}

interface WilayahItem {
  provinsi: string
  count: number
  total_korban?: number
}

interface TvMapEngineProps {
  markers: MarkerData[]
  wilayahList?: WilayahItem[]
  bmkgGempas?: BmkgGempa[]
  layers: TvLayerState
  initialCenter?: [number, number]
  initialZoom?: number
  onSelectMarker: (marker: MarkerData) => void
}

// ─────────────────────────────────────────────
// Helpers & Styling Identical to EOC Dashboard
// ─────────────────────────────────────────────

const cleanKey = (name?: string | null) => {
  if (!name) return ''
  let cleaned = name
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/^(KABUPATEN|KAB|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI|DKI)\s*/gi, '')
    .trim()

  if (cleaned.includes('JAKARTA')) return 'JAKARTA'
  if (cleaned.includes('YOGYAKARTA')) return 'YOGYAKARTA'
  if (cleaned.includes('BANGKA')) return 'BANGKABELITUNG'
  if (cleaned.includes('KEPULAUAN RIAU') || cleaned === 'KEPRI') return 'KEPULAUANRIAU'
  if (cleaned === 'NTB' || cleaned.includes('NUSA TENGGARA BARAT') || cleaned.includes('NUSATENGGARA BARAT')) return 'NUSATENGGARABARAT'
  if (cleaned === 'NTT' || cleaned.includes('NUSA TENGGARA TIMUR') || cleaned.includes('NUSATENGGARA TIMUR')) return 'NUSATENGGARATIMUR'
  if (cleaned.includes('BANTEN')) return 'BANTEN'
  if (cleaned.includes('IRIAN JAYA BARAT') || cleaned.includes('PAPUA BARAT')) return 'PAPUABARAT'
  if (cleaned.includes('IRIAN JAYA') || cleaned.includes('PAPUA')) return 'PAPUA'

  return cleaned.replace(/[^A-Z0-9]/g, '')
}

const getFeatureName = (feature: any) => {
  if (!feature) return ''
  const props = feature.getProperties() || {}
  const keys = ['provinsi', 'PROVINSI', 'nama_prov', 'prov_single', 'prov_multi', 'WADMPR', 'NAME_1', 'NAMOBJ', 'Propinsi', 'propinsi', 'PROPINSI']
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null && String(props[key]).trim() !== '') {
      return String(props[key]).trim()
    }
  }
  return ''
}

const choroplethColor = (count: number, opacity: number = 0.88) => {
  if (count === 0) return `rgba(241, 245, 249, ${opacity * 0.6})`
  if (count <= 10) return `rgba(234, 179, 8, ${opacity})`        // Kuning (1 - 10)
  if (count <= 30) return `rgba(249, 115, 22, ${opacity})`       // Oranye (11 - 30)
  if (count <= 50) return `rgba(239, 68, 68, ${opacity})`        // Coral Red (31 - 50)
  return `rgba(185, 28, 28, ${opacity})`                         // Deep Crimson Red (> 50)
}

const choroplethStyle = (count: number, labelText?: string) => {
  const baseColor = choroplethColor(count, 0.88)
  return new Style({
    fill: new Fill({ color: baseColor }),
    stroke: new Stroke({
      color: count === 0 ? 'rgba(148, 163, 184, 0.6)' : '#ffffff',
      width: count === 0 ? 0.8 : 1.5,
    }),
    text: count > 0 ? new OlText({
      text: labelText || String(count),
      font: 'bold 12px Inter, sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: 'rgba(15, 23, 42, 0.8)', width: 2.5 }),
      textAlign: 'center',
      textBaseline: 'middle',
    }) : undefined,
  })
}

const pinColor = (totalKorban: number = 0) => {
  if (totalKorban === 0) return '#047D78'
  if (totalKorban <= 5) return '#facc15'
  if (totalKorban <= 20) return '#f97316'
  return '#dc2626'
}

const getMarkerStyle = (iconFile?: string, totalKorban: number = 0) => {
  if (iconFile) {
    const backendUrl = process.env.NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL || ''
    const src = iconFile.startsWith('http')
      ? iconFile
      : `${backendUrl}/app_asset/icon/data_bencana/${iconFile}`
    return new Style({
      image: new Icon({
        src: src,
        scale: 0.8,
      }),
    })
  }
  return new Style({
    image: new CircleStyle({
      radius: 7.5,
      fill: new Fill({ color: pinColor(totalKorban) }),
      stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
    }),
  })
}

const BASEMAP_SOURCES = {
  osm: new OSM(),
  satellite: new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: '© Esri World Imagery',
  }),
  terrain: new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attributions: '© Esri Topo',
  }),
  light: new XYZ({
    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    attributions: '© CartoDB Positron',
  }),
  dark: new XYZ({
    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    attributions: '© CartoDB Dark',
  }),
}

const TvMapEngine = forwardRef<TvMapEngineRef, TvMapEngineProps>(function TvMapEngine(
  { markers, wilayahList = [], bmkgGempas = [], layers, initialCenter, initialZoom, onSelectMarker },
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const onSelectMarkerRef = useRef(onSelectMarker)

  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker
  }, [onSelectMarker])

  // Layer Refs
  const baseMapLayerRef = useRef<TileLayer<any> | null>(null)
  const bnpbAdminRef = useRef<TileLayer<any> | null>(null)
  const bnpbHillshadeRef = useRef<TileLayer<any> | null>(null)
  const bnpbKepadatanRef = useRef<TileLayer<any> | null>(null)
  const bnpbBanjirRef = useRef<TileLayer<any> | null>(null)
  const bnpbGempaRef = useRef<TileLayer<any> | null>(null)
  const bnpbLongsorRef = useRef<TileLayer<any> | null>(null)
  const bnpbKarhutlaRef = useRef<TileLayer<any> | null>(null)
  const provinceLayerRef = useRef<VectorLayer<any> | null>(null)
  const markerLayerRef = useRef<VectorLayer<any> | null>(null)
  const gempaLayerRef = useRef<VectorLayer<any> | null>(null)
  const windLayerRef = useRef<any>(null)
  const pulseOverlaysRef = useRef<Overlay[]>([])

  // Expose flyTo, resetView & focusProvince methods to parent
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom: number = 8.5) => {
      const map = mapInstanceRef.current
      if (!map) return
      const view = map.getView()
      view.animate({
        center: fromLonLat([lng, lat]),
        zoom: zoom,
        duration: 1500,
      })
    },
    resetView: () => {
      const map = mapInstanceRef.current
      if (!map) return
      const view = map.getView()
      view.animate({
        center: fromLonLat(initialCenter || [118.0149, -2.5489]),
        zoom: initialZoom || 5.1,
        duration: 1500,
      })
    },
    focusProvince: (provName: string | null) => {
      const map = mapInstanceRef.current
      if (!map) return
      if (!provName) {
        map.getView().animate({
          center: fromLonLat([118.0149, -2.5489]),
          zoom: 5.1,
          duration: 1800,
        })
        return
      }

      const pKey = cleanKey(provName)
      const features = provinceLayerRef.current?.getSource()?.getFeatures() || []
      const targetFeature = features.find((f: any) => cleanKey(getFeatureName(f)) === pKey)
      if (targetFeature) {
        const geom = targetFeature.getGeometry()
        if (geom) {
          map.getView().fit(geom.getExtent(), {
            padding: [140, 360, 80, 360],
            duration: 1800,
            maxZoom: 8.5,
          })
          return
        }
      }

      // Fallback: search markers in that province
      const provMarker = markers.find((m) => cleanKey(m.provinsi) === pKey && m.lat && m.lng)
      if (provMarker) {
        map.getView().animate({
          center: fromLonLat([provMarker.lng, provMarker.lat]),
          zoom: 7.5,
          duration: 1800,
        })
      }
    },
  }))

  // ── Sync Province Choropleth Styles ──
  const updateProvinceStyles = useCallback(() => {
    const layer = provinceLayerRef.current
    if (!layer) return

    const provCountMap = new Map<string, number>()
    if (Array.isArray(wilayahList) && wilayahList.length > 0) {
      wilayahList.forEach((w) => {
        const k = cleanKey(w.provinsi)
        if (k) provCountMap.set(k, Number(w.count) || 0)
      })
    } else if (Array.isArray(markers)) {
      markers.forEach((m) => {
        const k = cleanKey(m.provinsi)
        if (k) provCountMap.set(k, (provCountMap.get(k) || 0) + 1)
      })
    }

    layer.setStyle((feature: any) => {
      const provName = getFeatureName(feature)
      const provKey = cleanKey(provName)
      const count = provCountMap.get(provKey) || 0
      return choroplethStyle(count, count > 0 ? String(count) : undefined)
    })
    layer.changed()
  }, [wilayahList, markers])

  // ── Initialize OpenLayers Map ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // 1. Basemap Layer
    const baseMapLayer = new TileLayer({
      source: BASEMAP_SOURCES[layers.baseMap] || BASEMAP_SOURCES.osm,
      zIndex: 1,
    })
    baseMapLayerRef.current = baseMapLayer

    // 2. BNPB InaRISK Layers
    const bnpbAdmin = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/batas_administrasi/MapServer',
      }),
      visible: layers.bnpbAdmin,
      zIndex: 2,
    })
    bnpbAdminRef.current = bnpbAdmin

    const bnpbHillshade = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/Basemap/Indo_Hillshade/MapServer',
      }),
      visible: layers.bnpbHillshade,
      opacity: 0.5,
      zIndex: 3,
    })
    bnpbHillshadeRef.current = bnpbHillshade

    const bnpbKepadatan = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/Basemap/Kepadatan_penduduk_2020/MapServer',
      }),
      visible: layers.bnpbKepadatan,
      opacity: 0.5,
      zIndex: 4,
    })
    bnpbKepadatanRef.current = bnpbKepadatan

    const bnpbBanjir = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir/ImageServer',
      }),
      visible: layers.bnpbBanjir,
      opacity: 0.6,
      zIndex: 5,
    })
    bnpbBanjirRef.current = bnpbBanjir

    const bnpbGempa = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi/ImageServer',
      }),
      visible: layers.bnpbGempa,
      opacity: 0.6,
      zIndex: 6,
    })
    bnpbGempaRef.current = bnpbGempa

    const bnpbLongsor = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanah_longsor/ImageServer',
      }),
      visible: layers.bnpbLongsor,
      opacity: 0.6,
      zIndex: 7,
    })
    bnpbLongsorRef.current = bnpbLongsor

    const bnpbKarhutla = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_kebakaran_hutan_dan_lahan/ImageServer',
      }),
      visible: layers.bnpbKarhutla,
      opacity: 0.6,
      zIndex: 8,
    })
    bnpbKarhutlaRef.current = bnpbKarhutla

    // 3. Province Choropleth Layer
    const provinceLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showChoropleth,
      zIndex: 10,
    })
    provinceLayerRef.current = provinceLayer

    // 4. Disaster Marker Pins Layer
    const markerLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showMarkers,
      zIndex: 20,
    })
    markerLayerRef.current = markerLayer

    // 5. BMKG Earthquake Layer
    const gempaLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 25,
    })
    gempaLayerRef.current = gempaLayer

    // Create Map
    const map = new OlMap({
      target: mapRef.current,
      layers: [
        baseMapLayer,
        bnpbAdmin,
        bnpbHillshade,
        bnpbKepadatan,
        bnpbBanjir,
        bnpbGempa,
        bnpbLongsor,
        bnpbKarhutla,
        provinceLayer,
        markerLayer,
        gempaLayer,
      ],
      view: new View({
        center: fromLonLat(initialCenter || [118.0149, -2.5489]), // Indonesia Center or Scoped Location
        zoom: initialZoom || 5.1,
        minZoom: 4,
        maxZoom: 18,
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    })

    mapInstanceRef.current = map

    // Load GeoJSON boundaries (prioritize available static indonesia-provinces.geojson)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const loadGeoJsonFeatures = (geoData: any) => {
      if (!geoData || !provinceLayerRef.current) return
      try {
        const format = new GeoJSON()
        const rawFeatures = geoData.features ? geoData : geoData.geojson || geoData
        const features = format.readFeatures(rawFeatures, {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326',
        })
        const source = provinceLayerRef.current.getSource()
        source?.clear()
        source?.addFeatures(features)
        updateProvinceStyles()
      } catch (err) {
        console.error('[TV Map] Error parsing GeoJSON features:', err)
      }
    }

    // 1. Try local available static GeoJSON
    fetch(`${basePath}/indonesia-provinces.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error('Static GeoJSON not found, fallback to API')
        return res.json()
      })
      .then((data) => {
        loadGeoJsonFeatures(data)
      })
      .catch(() => {
        // 2. Fallback to API route
        fetch(`${basePath}/api/wilayah-geojson?level=provinsi`)
          .then((res) => res.json())
          .then((data) => {
            loadGeoJsonFeatures(data?.geojson || data)
          })
          .catch((e) => console.error('[TV Map] GeoJSON load error:', e))
      })

    // Handle Map Click
    map.on('click', (evt) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const markerData = feature.get('markerData')
        if (markerData) {
          onSelectMarkerRef.current?.(markerData)
        }
      })
    })

    // 6. Setup Windy Layer via npm ol-wind (async fetch GFS data)
    async function initWindy() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
        const res = await fetch(`${basePath}/api/gfs`)
        if (!res.ok) return
        const windData = await res.json()
        const baseVelocity = 0.01
        const windLayer = new WindLayer(windData as any, {
          windOptions: {
            velocityScale: baseVelocity,
            paths: 1200,
            colorScale: [
              'rgb(15,60,140)',
              'rgb(30,100,155)',
              'rgb(70,150,145)',
              'rgb(85,160,115)',
              'rgb(130,180,110)',
              'rgb(175,200,140)',
              'rgb(215,195,60)',
              'rgb(205,160,45)',
              'rgb(210,125,35)',
              'rgb(200,95,20)',
              'rgb(195,70,15)',
              'rgb(185,35,10)',
              'rgb(170,18,8)',
              'rgb(155,8,12)',
              'rgb(115,0,18)',
            ],
            lineWidth: 2,
            generateParticleOption: true,
          },
          fieldOptions: { wrapX: true },
        } as any)

        const isVisible = layers.showWindy
        ;(windLayer as any).setVisible?.(isVisible)
        try {
          if (isVisible && typeof (windLayer as any).start === 'function') {
            ;(windLayer as any).start()
          }
        } catch {}

        map.addLayer(windLayer as any)
        windLayerRef.current = windLayer as any
      } catch (err) {
        console.warn('[TvMapEngine] Windy Layer load error (optional):', err)
      }
    }
    void initWindy()

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      pulseOverlaysRef.current.forEach((ov) => map.removeOverlay(ov))
      pulseOverlaysRef.current = []

      if (windLayerRef.current) {
        destroyWindLayerSafely(windLayerRef.current)
        windLayerRef.current = null
      }
    }
  }, [])

  // ── Sync Windy Layer state ──
  useEffect(() => {
    const wl = windLayerRef.current
    if (wl) {
      wl.setVisible(layers.showWindy)
      try {
        if (layers.showWindy) {
          if (typeof wl.start === 'function') {
            wl.start()
          }
        } else {
          if (typeof wl.stop === 'function') {
            wl.stop()
          }
        }
      } catch (e) {}
      try {
        mapInstanceRef.current?.renderSync?.()
      } catch {}
    }
  }, [layers.showWindy])

  // ── Sync Basemap ──
  useEffect(() => {
    if (baseMapLayerRef.current) {
      baseMapLayerRef.current.setSource(BASEMAP_SOURCES[layers.baseMap] || BASEMAP_SOURCES.osm)
    }
  }, [layers.baseMap])

  // ── Sync BNPB Layers ──
  useEffect(() => {
    bnpbAdminRef.current?.setVisible(layers.bnpbAdmin)
    bnpbHillshadeRef.current?.setVisible(layers.bnpbHillshade)
    bnpbKepadatanRef.current?.setVisible(layers.bnpbKepadatan)
    bnpbBanjirRef.current?.setVisible(layers.bnpbBanjir)
    bnpbGempaRef.current?.setVisible(layers.bnpbGempa)
    bnpbLongsorRef.current?.setVisible(layers.bnpbLongsor)
    bnpbKarhutlaRef.current?.setVisible(layers.bnpbKarhutla)
    provinceLayerRef.current?.setVisible(layers.showChoropleth)
    markerLayerRef.current?.setVisible(layers.showMarkers)
  }, [layers])

  // ── Re-apply Choropleth when wilayahList or markers change ──
  useEffect(() => {
    updateProvinceStyles()
  }, [updateProvinceStyles])

  // ── Sync Disaster Markers (Using EOC API marker styles & icon_file) ──
  useEffect(() => {
    const layer = markerLayerRef.current
    if (!layer) return
    const source = layer.getSource()
    if (!source) return

    source.clear()

    const features: Feature[] = []
    markers.forEach((m) => {
      if (!m.lat || !m.lng || isNaN(m.lat) || isNaN(m.lng)) return

      const feat = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
        markerData: m,
      })

      feat.setStyle(getMarkerStyle(m.icon_file, m.total_korban || 0))
      features.push(feat)
    })

    source.addFeatures(features)
  }, [markers])

  // ── Sync BMKG Earthquakes with Pulse Rings ──
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old overlays
    pulseOverlaysRef.current.forEach((o) => map.removeOverlay(o))
    pulseOverlaysRef.current = []

    const gempaLayer = gempaLayerRef.current
    const source = gempaLayer?.getSource()
    source?.clear()

    bmkgGempas.slice(0, 5).forEach((gempa) => {
      if (!gempa.Coordinates) return
      const [latStr, lngStr] = gempa.Coordinates.split(',')
      const lat = parseFloat(latStr)
      const lng = parseFloat(lngStr)
      if (isNaN(lat) || isNaN(lng)) return

      const mag = parseFloat(gempa.Magnitude) || 5.0

      // Create DOM Pulse element
      const pulseEl = document.createElement('div')
      pulseEl.className = 'pointer-events-none'
      pulseEl.innerHTML = `
        <div class="relative flex h-16 w-16 items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60"></div>
          <div class="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-orange-600 border border-white text-white font-mono font-black text-[9px] shadow-lg">
            ${mag.toFixed(1)}
          </div>
        </div>
      `

      const overlay = new Overlay({
        element: pulseEl,
        position: fromLonLat([lng, lat]),
        positioning: 'center-center',
        stopEvent: false,
      })

      map.addOverlay(overlay)
      pulseOverlaysRef.current.push(overlay)
    })
  }, [bmkgGempas])

  return (
    <div className="absolute inset-0 w-full h-full bg-[#a5def3] overflow-hidden">
      <div ref={mapRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
})

export default TvMapEngine
