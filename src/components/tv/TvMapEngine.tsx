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
import LineString from 'ol/geom/LineString'
import CircleGeom from 'ol/geom/Circle'
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

export interface MarkerData {
  id?: string
  kode_trans?: string
  tgl_kejadian?: string
  jenis_bencana?: string
  kategori_bencana?: string
  nama?: string
  lat: number
  lng: number
  provinsi?: string
  kabupaten?: string
  nama_desa?: string
  kecamatan?: string
  total_korban?: number
  meninggal?: number
  luka?: number
  luka_berat?: number
  luka_ringan?: number
  pengungsi?: number
  terdampak?: number
  titik_posko?: number
  icon_file?: string
  is_krisis?: number
}

export interface FaskesItem {
  id?: string
  nama_rs?: string
  nama_faskes?: string
  nama?: string
  kabupaten: string
  kecamatan?: string
  lat: number
  lng: number
  triase_merah?: number
  triase_kuning?: number
  triase_hijau?: number
  triase_hitam?: number
  total?: number
  total_pasien?: number
  status?: string
  igd?: string
}

export interface PoskoItem {
  id?: string
  nama?: string
  nama_pos?: string
  kabupaten: string
  kecamatan?: string
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  pengungsi?: number
  jiwa?: number
  kapasitas?: number
  pj_kontak?: string
}

export interface EarthquakePoint {
  lat: number
  lng: number
  magnitude: number
  depth: number
  place: string
  time?: string
  dateStr?: string
  dateLabel?: string
  distKm?: number
  isMainshock?: boolean
  mmi?: string | number
}

interface WilayahItem {
  provinsi: string
  count: number
  total_korban?: number
}

interface TvMapEngineProps {
  markers: MarkerData[]
  faskesList?: FaskesItem[]
  poskoList?: PoskoItem[]
  earthquakePoints?: EarthquakePoint[]
  routeCoords?: number[][]
  wilayahList?: WilayahItem[]
  bmkgGempas?: any[]
  layers: TvLayerState
  initialCenter?: [number, number]
  initialZoom?: number
  onSelectMarker: (marker: any, type?: 'disaster' | 'faskes' | 'posko' | 'earthquake') => void
}

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
  if (cleaned === 'NTB' || cleaned.includes('NUSA TENGGARA BARAT')) return 'NUSATENGGARABARAT'
  if (cleaned === 'NTT' || cleaned.includes('NUSA TENGGARA TIMUR')) return 'NUSATENGGARATIMUR'

  return cleaned.replace(/[^A-Z0-9]/g, '')
}

const getFeatureName = (feature: any) => {
  if (!feature) return ''
  const props = feature.getProperties() || {}
  const keys = ['nama_kab', 'NAMA_KAB', 'kabupaten', 'KABUPATEN', 'provinsi', 'PROVINSI', 'nama_prov', 'WADMPR', 'NAME_1', 'NAMOBJ', 'Propinsi', 'nama']
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null && String(props[key]).trim() !== '') {
      return String(props[key]).trim()
    }
  }
  return ''
}

const choroplethColor = (count: number, opacity: number = 0.82) => {
  if (count === 0) return `rgba(241, 245, 249, ${opacity * 0.5})`
  if (count <= 25) return `rgba(234, 179, 8, ${opacity})`        // Kuning (1 - 25)
  if (count <= 75) return `rgba(249, 115, 22, ${opacity})`       // Oranye (26 - 75)
  if (count <= 200) return `rgba(239, 68, 68, ${opacity})`       // Coral Red (76 - 200)
  return `rgba(185, 28, 28, ${opacity})`                         // Deep Crimson Red (> 200)
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
  {
    markers,
    faskesList = [],
    poskoList = [],
    earthquakePoints = [],
    routeCoords = [],
    wilayahList = [],
    bmkgGempas = [],
    layers,
    initialCenter,
    initialZoom,
    onSelectMarker,
  },
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
  const shakingZoneLayerRef = useRef<VectorLayer<any> | null>(null)
  const markerLayerRef = useRef<VectorLayer<any> | null>(null)
  const faskesLayerRef = useRef<VectorLayer<any> | null>(null)
  const poskoLayerRef = useRef<VectorLayer<any> | null>(null)
  const earthquakeLayerRef = useRef<VectorLayer<any> | null>(null)
  const routeLayerRef = useRef<VectorLayer<any> | null>(null)
  const windLayerRef = useRef<any>(null)

  // Expose flyTo, resetView & focusProvince methods to parent
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom: number = 9) => {
      const map = mapInstanceRef.current
      if (!map) return
      map.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: zoom,
        duration: 1200,
      })
    },
    resetView: () => {
      const map = mapInstanceRef.current
      if (!map) return
      map.getView().animate({
        center: fromLonLat(initialCenter || [118.0149, -2.5489]),
        zoom: initialZoom || 5.1,
        duration: 1200,
      })
    },
    focusProvince: (provName: string | null) => {
      const map = mapInstanceRef.current
      if (!map) return
      if (!provName) {
        map.getView().animate({
          center: fromLonLat([118.0149, -2.5489]),
          zoom: 5.1,
          duration: 1500,
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
            duration: 1500,
            maxZoom: 8.5,
          })
          return
        }
      }

      const provMarker = markers.find((m) => cleanKey(m.provinsi) === pKey && m.lat && m.lng)
      if (provMarker) {
        map.getView().animate({
          center: fromLonLat([provMarker.lng, provMarker.lat]),
          zoom: 7.5,
          duration: 1500,
        })
      }
    },
  }))

  // ── Sync Province / Kabupaten Choropleth Styles ──
  const updateProvinceStyles = useCallback(() => {
    const layer = provinceLayerRef.current
    if (!layer) return

    const provCountMap = new Map<string, number>()
    if (Array.isArray(wilayahList) && wilayahList.length > 0) {
      wilayahList.forEach((w) => {
        const k = cleanKey(w.provinsi)
        if (k) provCountMap.set(k, Number(w.count) || Number(w.total_korban) || 0)
      })
    } else if (Array.isArray(markers)) {
      markers.forEach((m) => {
        const k = cleanKey(m.kabupaten || m.provinsi)
        if (k) provCountMap.set(k, (provCountMap.get(k) || 0) + (m.total_korban || 1))
      })
    }

    layer.setStyle((feature: any) => {
      const name = getFeatureName(feature)
      const key = cleanKey(name)
      const count = provCountMap.get(key) || 0
      const baseColor = choroplethColor(count, 0.75)

      return new Style({
        fill: new Fill({ color: baseColor }),
        stroke: new Stroke({
          color: count > 0 ? '#047D78' : 'rgba(148, 163, 184, 0.4)',
          width: count > 0 ? 1.8 : 0.8,
        }),
        text: count > 0 ? new OlText({
          text: `${name}\n(${count})`,
          font: 'bold 11px Roboto, sans-serif',
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: 'rgba(15, 23, 42, 0.85)', width: 3 }),
          textAlign: 'center',
          textBaseline: 'middle',
          offsetY: 0,
        }) : undefined,
      })
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

    // 3. Province / Kabupaten Boundary Layer
    const provinceLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showChoropleth,
      zIndex: 10,
    })
    provinceLayerRef.current = provinceLayer

    // 4. Isoseismal Shaking Rings Layer (Laut Flores M 7.4)
    const shakingZoneLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 12,
    })
    shakingZoneLayerRef.current = shakingZoneLayer

    // 5. Tactical Routing Line Layer
    const routeLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 15,
    })
    routeLayerRef.current = routeLayer

    // 6. Earthquake / Aftershock Bubble Layer
    const earthquakeLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 18,
    })
    earthquakeLayerRef.current = earthquakeLayer

    // 7. Disaster Marker Pins Layer
    const markerLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showMarkers,
      zIndex: 22,
    })
    markerLayerRef.current = markerLayer

    // 8. Faskes Markers Layer
    const faskesLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showFaskes,
      zIndex: 24,
    })
    faskesLayerRef.current = faskesLayer

    // 9. Posko Markers Layer
    const poskoLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showPosko,
      zIndex: 26,
    })
    poskoLayerRef.current = poskoLayer

    // Create OpenLayers Map Instance
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
        shakingZoneLayer,
        routeLayer,
        earthquakeLayer,
        markerLayer,
        faskesLayer,
        poskoLayer,
      ],
      view: new View({
        center: fromLonLat(initialCenter || [121.8, -8.55]),
        zoom: initialZoom || 8.5,
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

    // Load GeoJSON Boundaries (prioritize NTT kabupaten, fallback to Indonesia)
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
        console.error('[TV Map] Error parsing GeoJSON:', err)
      }
    }

    fetch(`${basePath}/data/geojson/ntt-kabupaten.geojson`)
      .then((res) => {
        if (!res.ok) throw new Error('NTT GeoJSON not found')
        return res.json()
      })
      .then(loadGeoJsonFeatures)
      .catch(() => {
        fetch(`${basePath}/indonesia-provinces.geojson`)
          .then((r) => r.json())
          .then(loadGeoJsonFeatures)
          .catch((e) => console.warn('[TV Map] Boundary fallback:', e))
      })

    // Map Click Interaction: Select feature and trigger bottom card
    map.on('click', (evt) => {
      let found = false
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (found) return

        const markerData = feature.get('markerData')
        const itemType = feature.get('itemType') || 'disaster'

        if (markerData) {
          found = true
          onSelectMarkerRef.current?.(markerData, itemType)
        }
      })
    })

    // Setup Windy Layer (GFS)
    async function initWindy() {
      try {
        const res = await fetch(`${basePath}/api/gfs`)
        if (!res.ok) return
        const windData = await res.json()
        const windLayer = new WindLayer(windData as any, {
          windOptions: {
            velocityScale: 0.012,
            paths: 1400,
            colorScale: [
              'rgb(15,60,140)',
              'rgb(70,150,145)',
              'rgb(85,160,115)',
              'rgb(215,195,60)',
              'rgb(210,125,35)',
              'rgb(185,35,10)',
              'rgb(155,8,12)',
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
        console.warn('[TvMapEngine] Windy load error:', err)
      }
    }
    void initWindy()

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      if (windLayerRef.current) {
        destroyWindLayerSafely(windLayerRef.current)
        windLayerRef.current = null
      }
    }
  }, [])

  // ── Sync Basemap & BNPB Layers ──
  useEffect(() => {
    if (baseMapLayerRef.current) {
      baseMapLayerRef.current.setSource(BASEMAP_SOURCES[layers.baseMap] || BASEMAP_SOURCES.osm)
    }
  }, [layers.baseMap])

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
    faskesLayerRef.current?.setVisible(layers.showFaskes)
    poskoLayerRef.current?.setVisible(layers.showPosko)
  }, [layers])

  // ── Sync Windy Layer ──
  useEffect(() => {
    const wl = windLayerRef.current
    if (wl) {
      wl.setVisible(layers.showWindy)
      try {
        if (layers.showWindy) {
          if (typeof wl.start === 'function') wl.start()
        } else {
          if (typeof wl.stop === 'function') wl.stop()
        }
      } catch {}
      try { mapInstanceRef.current?.renderSync?.() } catch {}
    }
  }, [layers.showWindy])

  // ── Re-apply Choropleth ──
  useEffect(() => {
    updateProvinceStyles()
  }, [updateProvinceStyles])

  // ── 1. Disaster Markers (All 8 affected kabupaten in NTT) ──
  useEffect(() => {
    const layer = markerLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    const features: Feature[] = []
    markers.forEach((m) => {
      if (!m.lat || !m.lng || isNaN(m.lat) || isNaN(m.lng)) return

      const feat = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
        markerData: { ...m, type: 'disaster' },
        itemType: 'disaster',
      })

      const totalK = m.total_korban || (m.meninggal || 0) + (m.luka || 0) || 0
      const pinFill = totalK > 50 ? '#dc2626' : totalK > 10 ? '#ea580c' : '#047D78'

      feat.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({ color: pinFill }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
          text: new OlText({
            text: m.kabupaten || m.nama || 'Bencana',
            font: 'bold 11px Roboto, sans-serif',
            fill: new Fill({ color: '#0f172a' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
            offsetY: -16,
          }),
        })
      )
      features.push(feat)
    })

    source.addFeatures(features)
  }, [markers])

  // ── 2. Isoseismal Shaking Rings & Pulse on M 7.4 Epicenter ──
  useEffect(() => {
    const layer = shakingZoneLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    // Epicenter of Laut Flores Gempa (lat: -8.3421, lng: 122.9814)
    const epicCenter = fromLonLat([122.9814, -8.3421])

    // Outer Shaking Zone Circle (~65 km)
    const outerCircle = new Feature({
      geometry: new CircleGeom(epicCenter, 65000),
    })
    outerCircle.setStyle(
      new Style({
        fill: new Fill({ color: 'rgba(220, 38, 38, 0.06)' }),
        stroke: new Stroke({
          color: 'rgba(220, 38, 38, 0.75)',
          width: 2,
          lineDash: [6, 6],
        }),
      })
    )

    // Inner Severe Zone Circle (~28 km)
    const innerCircle = new Feature({
      geometry: new CircleGeom(epicCenter, 28000),
    })
    innerCircle.setStyle(
      new Style({
        fill: new Fill({ color: 'rgba(220, 38, 38, 0.12)' }),
        stroke: new Stroke({
          color: '#dc2626',
          width: 2,
        }),
      })
    )

    // Epicenter Marker Point
    const epicPoint = new Feature({
      geometry: new Point(epicCenter),
      markerData: {
        type: 'earthquake',
        nama: 'Episentrum Gempa Utama M 7.7 Laut Flores - Mbay-Nagekeo',
        magnitude: 7.7,
        depth: 15,
        place: 'Laut Flores - 30 km Timur Laut Mbay-Nagekeo',
        time: '09:18 WIB (15 Ags 2026)',
        mmi: 'VII-VIII MMI',
        lat: -8.3421,
        lng: 122.9814,
      },
      itemType: 'earthquake',
    })
    epicPoint.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 11,
          fill: new Fill({ color: '#dc2626' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
        text: new OlText({
          text: '★ EPISENTRUM M 7.7',
          font: 'bold 12px Roboto, sans-serif',
          fill: new Fill({ color: '#991b1b' }),
          stroke: new Stroke({ color: '#ffffff', width: 3.5 }),
          offsetY: -18,
        }),
      })
    )

    source.addFeatures([outerCircle, innerCircle, epicPoint])
  }, [])

  // ── 3. Earthquake Aftershocks Bubble Dots ──
  useEffect(() => {
    const layer = earthquakeLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    const features: Feature[] = []
    earthquakePoints.forEach((eq, idx) => {
      if (eq.isMainshock) return // handled by shakingZoneLayer
      const pt = fromLonLat([eq.lng, eq.lat])
      const feat = new Feature({
        geometry: new Point(pt),
        markerData: { ...eq, type: 'earthquake' },
        itemType: 'earthquake',
      })

      const mag = Number(eq.magnitude || 4.5)
      const radius = Math.max(6, (mag - 3) * 3)

      feat.setStyle(
        new Style({
          image: new CircleStyle({
            radius: radius,
            fill: new Fill({ color: mag >= 5.5 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)' }),
            stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
          }),
          text: new OlText({
            text: `M ${mag.toFixed(1)}`,
            font: 'bold 9.5px Roboto, sans-serif',
            fill: new Fill({ color: '#7c2d12' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            offsetY: -12,
          }),
        })
      )
      features.push(feat)
    })

    source.addFeatures(features)
  }, [earthquakePoints])

  // ── 4. Faskes Markers (RSUD & Puskesmas NTT with Triage) ──
  useEffect(() => {
    const layer = faskesLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    const features: Feature[] = []
    faskesList.forEach((f) => {
      if (!f.lat || !f.lng) return

      const feat = new Feature({
        geometry: new Point(fromLonLat([f.lng, f.lat])),
        markerData: { ...f, type: 'faskes' },
        itemType: 'faskes',
      })

      const hasMerah = Number(f.triase_merah || 0) > 0
      const pFill = hasMerah ? '#e11d48' : '#059669'

      feat.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: pFill }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new OlText({
            text: `🏥 ${f.nama_rs || f.nama || 'RSUD'}`,
            font: 'bold 10.5px Roboto, sans-serif',
            fill: new Fill({ color: '#065f46' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
            offsetY: 14,
          }),
        })
      )
      features.push(feat)
    })

    source.addFeatures(features)
  }, [faskesList])

  // ── 5. Posko Markers ──
  useEffect(() => {
    const layer = poskoLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    const features: Feature[] = []
    poskoList.forEach((p) => {
      const lat = p.latitude || p.lat
      const lng = p.longitude || p.lng
      if (!lat || !lng) return

      const feat = new Feature({
        geometry: new Point(fromLonLat([lng, lat])),
        markerData: { ...p, type: 'posko', lat, lng },
        itemType: 'posko',
      })

      feat.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: '#0284c7' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
          text: new OlText({
            text: `⛺ ${p.nama_pos || p.nama || 'Posko'}`,
            font: 'bold 10px Roboto, sans-serif',
            fill: new Fill({ color: '#0369a1' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            offsetY: 13,
          }),
        })
      )
      features.push(feat)
    })

    source.addFeatures(features)
  }, [poskoList])

  // ── 6. Tactical Route Polyline ──
  useEffect(() => {
    const layer = routeLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()

    if (!Array.isArray(routeCoords) || routeCoords.length < 2) return

    const transformedCoords = routeCoords.map((c) => fromLonLat([c[0], c[1]]))
    const routeLine = new Feature({
      geometry: new LineString(transformedCoords),
    })

    // Glowing cyan/emerald tactical route stroke
    routeLine.setStyle(
      new Style({
        stroke: new Stroke({
          color: '#10b981',
          width: 4.5,
        }),
      })
    )

    source.addFeature(routeLine)
  }, [routeCoords])

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#fbffff]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
})

export default TvMapEngine
