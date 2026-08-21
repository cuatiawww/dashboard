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

function getLargestPolygonInteriorPoint(feature: any) {
  const geom = feature?.getGeometry?.()
  if (!geom) return null
  const type = geom.getType?.()
  if (type === 'MultiPolygon') {
    const polygons = geom.getPolygons()
    if (!polygons || polygons.length === 0) return null
    let maxArea = -1
    let largest = polygons[0]
    for (let i = 0; i < polygons.length; i++) {
      const a = polygons[i].getArea()
      if (a > maxArea) {
        maxArea = a
        largest = polygons[i]
      }
    }
    return largest.getInteriorPoint()
  } else if (type === 'Polygon') {
    return geom.getInteriorPoint()
  }
  return geom
}

export interface TvNttMapEngineRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void
  resetView: () => void
  focusKabupaten: (kabName: string | null) => void
}

interface SeismicPoint {
  id?: string
  lat: number
  lng: number
  magnitude: number
  depth?: number
  place?: string
  time?: string
  isMainshock?: boolean
}

interface FaskesItem {
  id?: string
  nama?: string
  nama_faskes?: string
  jenis?: string
  jenis_faskes?: string
  kabupaten?: string
  latitude?: number
  longitude?: number
  rusak_berat?: number
  rusak_sedang?: number
  rusak_ringan?: number
}

interface PoskoItem {
  id?: string
  nama?: string
  kecamatan?: string
  kabupaten?: string
  pengungsi?: number
  latitude?: number
  longitude?: number
}

interface TvNttMapEngineProps {
  seismicPoints: SeismicPoint[]
  faskesList?: FaskesItem[]
  poskoList?: PoskoItem[]
  layers: TvLayerState
  onSelectSeismic?: (point: SeismicPoint) => void
  onSelectFaskes?: (faskes: FaskesItem) => void
}

const NTT_CENTER: [number, number] = [121.8, -8.55] // Flores Sea & Islands
const NTT_DEFAULT_ZOOM = 8.8

const BASEMAP_SOURCES: Record<string, any> = {
  osm: new OSM(),
  dark: new XYZ({
    url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attributions: '© CARTO',
  }),
  satellite: new XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  }),
}

const KABUPATEN_COORDS: Record<string, { center: [number, number]; zoom: number }> = {
  'FLORES TIMUR': { center: [122.98, -8.33], zoom: 9.8 },
  'SIKKA': { center: [122.21, -8.62], zoom: 9.8 },
  'ENDE': { center: [121.65, -8.84], zoom: 9.8 },
  'NAGEKEO': { center: [121.28, -8.70], zoom: 9.8 },
  'NGADA': { center: [120.97, -8.78], zoom: 9.8 },
  'MANGGARAI': { center: [120.46, -8.62], zoom: 9.8 },
  'MANGGARAI TIMUR': { center: [120.57, -8.65], zoom: 9.8 },
  'MANGGARAI BARAT': { center: [119.98, -8.56], zoom: 9.8 },
  'LEMBATA': { center: [123.54, -8.37], zoom: 9.8 },
  'ALOR': { center: [124.57, -8.29], zoom: 9.8 },
}

const TvNttMapEngine = forwardRef<TvNttMapEngineRef, TvNttMapEngineProps>(function TvNttMapEngine(
  { seismicPoints, faskesList = [], poskoList = [], layers, onSelectSeismic, onSelectFaskes },
  ref
) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const baseMapLayerRef = useRef<TileLayer<any> | null>(null)
  const bnpbAdminRef = useRef<TileLayer<any> | null>(null)
  const bnpbHillshadeRef = useRef<TileLayer<any> | null>(null)
  const bnpbGempaRef = useRef<TileLayer<any> | null>(null)
  const kabupatenLayerRef = useRef<VectorLayer<any> | null>(null)
  const seismicLayerRef = useRef<VectorLayer<any> | null>(null)
  const faskesLayerRef = useRef<VectorLayer<any> | null>(null)
  const poskoLayerRef = useRef<VectorLayer<any> | null>(null)
  const windLayerRef = useRef<any>(null)
  const pulseOverlaysRef = useRef<Overlay[]>([])

  // Expose controls to parent
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom: number = 10.5) => {
      const map = mapInstanceRef.current
      if (!map) return
      map.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom,
        duration: 1500,
      })
    },
    resetView: () => {
      const map = mapInstanceRef.current
      if (!map) return
      map.getView().animate({
        center: fromLonLat(NTT_CENTER),
        zoom: NTT_DEFAULT_ZOOM,
        duration: 1500,
      })
    },
    focusKabupaten: (kabName: string | null) => {
      const map = mapInstanceRef.current
      if (!map) return
      if (!kabName) {
        map.getView().animate({
          center: fromLonLat(NTT_CENTER),
          zoom: NTT_DEFAULT_ZOOM,
          duration: 1500,
        })
        return
      }
      const clean = kabName.toUpperCase().replace(/^(KABUPATEN|KAB|KOTA)\s*/i, '').trim()
      const target = KABUPATEN_COORDS[clean]
      if (target) {
        map.getView().animate({
          center: fromLonLat(target.center),
          zoom: target.zoom,
          duration: 1500,
        })
      }
    },
  }))

  const createPulseOverlay = useCallback((lng: number, lat: number) => {
    const map = mapInstanceRef.current
    if (!map) return

    const pulseEl = document.createElement('div')
    pulseEl.className = 'ews-pulse-overlay pointer-events-none'
    pulseEl.innerHTML = `
      <div class="relative flex h-20 w-20 items-center justify-center">
        <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 bg-opacity-70"></div>
        <div class="relative inline-flex rounded-full h-4 w-4 bg-red-600 shadow-lg"></div>
      </div>
    `

    const overlay = new Overlay({
      element: pulseEl,
      positioning: 'center-center',
      stopEvent: false,
      position: fromLonLat([lng, lat]),
    })

    map.addOverlay(overlay)
    pulseOverlaysRef.current.push(overlay)
  }, [])

  // ── Initialize Map ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const baseMapLayer = new TileLayer({
      source: BASEMAP_SOURCES[layers.baseMap] || BASEMAP_SOURCES.dark,
      zIndex: 1,
    })
    baseMapLayerRef.current = baseMapLayer

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

    const bnpbGempa = new TileLayer({
      source: new TileArcGISRest({
        url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi/ImageServer',
      }),
      visible: layers.bnpbGempa,
      opacity: 0.6,
      zIndex: 4,
    })
    bnpbGempaRef.current = bnpbGempa

    const kabupatenLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showChoropleth,
      zIndex: 10,
    })
    kabupatenLayerRef.current = kabupatenLayer

    const faskesLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showFaskes,
      zIndex: 20,
    })
    faskesLayerRef.current = faskesLayer

    const poskoLayer = new VectorLayer({
      source: new VectorSource(),
      visible: layers.showPosko,
      zIndex: 22,
    })
    poskoLayerRef.current = poskoLayer

    const seismicLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 30,
    })
    seismicLayerRef.current = seismicLayer

    const map = new OlMap({
      target: mapRef.current,
      layers: [
        baseMapLayer,
        bnpbAdmin,
        bnpbHillshade,
        bnpbGempa,
        kabupatenLayer,
        faskesLayer,
        poskoLayer,
        seismicLayer,
      ],
      view: new View({
        center: fromLonLat(NTT_CENTER),
        zoom: NTT_DEFAULT_ZOOM,
        minZoom: 6,
        maxZoom: 17,
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    })

    mapInstanceRef.current = map

    // Load GeoJSON for NTT / Kabupaten
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const loadGeoJson = async () => {
      try {
        const geoUrl = `${basePath}/geojson/indonesia-kabupaten.geojson`
        const res = await fetch(geoUrl)
        if (res.ok) {
          const json = await res.json()
          const features = new GeoJSON().readFeatures(json, {
            dataProjection: 'EPSG:4326',
            featureProjection: map.getView().getProjection(),
          })

          // Filter for NTT Kabupaten features
          const nttFeatures = features.filter((f: any) => {
            const p = String(f.get('provinsi') || f.get('PROVINSI') || f.get('WADMPR') || '').toUpperCase()
            return p.includes('NUSA TENGGARA TIMUR') || p.includes('NTT')
          })

          const targetFeatures = nttFeatures.length > 0 ? nttFeatures : features
          kabupatenLayer.getSource()?.addFeatures(targetFeatures)

          // Style each NTT kabupaten cleanly with single centroid label
          kabupatenLayer.setStyle((feature: any) => {
            const rawName = String(feature.get('kabupaten') || feature.get('KABUPATEN') || feature.get('NAMOBJ') || feature.get('WADMKK') || '')
            const formattedName = rawName.replace(/^(KABUPATEN|KAB|KOTA)\s+/i, '').trim()
            const isRedZone = ['FLORES TIMUR', 'SIKKA', 'MANGGARAI TIMUR', 'MANGGARAI', 'ENDE', 'NAGEKEO', 'NGADA'].some(k => formattedName.toUpperCase().includes(k))

            const polyStyle = new Style({
              fill: new Fill({ color: isRedZone ? 'rgba(239, 68, 68, 0.16)' : 'rgba(245, 158, 11, 0.08)' }),
              stroke: new Stroke({ color: isRedZone ? '#ef4444' : '#f59e0b', width: isRedZone ? 2.4 : 1.4 }),
            })

            const textStyle = new Style({
              geometry: (f: any) => getLargestPolygonInteriorPoint(f),
              text: new OlText({
                text: formattedName,
                font: 'bold 11px Inter, sans-serif',
                fill: new Fill({ color: '#ffffff' }),
                stroke: new Stroke({ color: '#0f172a', width: 4 }),
                overflow: false,
              }),
            })

            return [polyStyle, textStyle]
          })
        }
      } catch (err) {
        console.warn('GeoJSON NTT load error:', err)
      }
    }
    loadGeoJson()

    // Setup Windy Layer
    try {
      fetch(`${basePath}/api/windy-proxy`)
        .then(r => r.json())
        .then(windData => {
          if (windData && Array.isArray(windData) && windData.length >= 2 && mapRef.current) {
            const wl = new (WindLayer as any)(windData, {
              windOptions: {
                colorScale: [
                  'rgb(36,104,180)',
                  'rgb(60,157,194)',
                  'rgb(128,205,193)',
                  'rgb(151,218,168)',
                  'rgb(252,217,125)',
                  'rgb(255,182,100)',
                  'rgb(252,150,75)',
                  'rgb(250,112,52)',
                  'rgb(245,64,32)',
                  'rgb(237,45,28)',
                ],
                velocityScale: 1 / 25,
                paths: 2400,
                maxAge: 80,
                lineWidth: 1.6,
              },
              fieldOptions: { wrapX: true },
              zIndex: 15,
            })
            wl.setMap(map)
            windLayerRef.current = wl
            if (!layers.showWindy) wl.setVisible(false)
          }
        })
        .catch(() => {})
    } catch {}

    return () => {
      if (windLayerRef.current) {
        destroyWindLayerSafely(windLayerRef.current)
        windLayerRef.current = null
      }
      pulseOverlaysRef.current.forEach(ov => map.removeOverlay(ov))
      pulseOverlaysRef.current = []
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [])

  // ── Sync Basemap Layer ──
  useEffect(() => {
    if (baseMapLayerRef.current) {
      baseMapLayerRef.current.setSource(BASEMAP_SOURCES[layers.baseMap] || BASEMAP_SOURCES.dark)
    }
  }, [layers.baseMap])

  // ── Sync BNPB Layers ──
  useEffect(() => {
    if (bnpbAdminRef.current) bnpbAdminRef.current.setVisible(layers.bnpbAdmin)
    if (bnpbHillshadeRef.current) bnpbHillshadeRef.current.setVisible(layers.bnpbHillshade)
    if (bnpbGempaRef.current) bnpbGempaRef.current.setVisible(layers.bnpbGempa)
  }, [layers.bnpbAdmin, layers.bnpbHillshade, layers.bnpbGempa])

  // ── Sync Windy Layer ──
  useEffect(() => {
    if (windLayerRef.current) {
      windLayerRef.current.setVisible(layers.showWindy)
      try {
        if (layers.showWindy && typeof windLayerRef.current.start === 'function') {
          windLayerRef.current.start()
        } else if (!layers.showWindy && typeof windLayerRef.current.stop === 'function') {
          windLayerRef.current.stop()
        }
      } catch {}
    }
  }, [layers.showWindy])

  // ── Sync Faskes & Posko Layers ──
  useEffect(() => {
    if (faskesLayerRef.current) faskesLayerRef.current.setVisible(layers.showFaskes)
    if (poskoLayerRef.current) poskoLayerRef.current.setVisible(layers.showPosko)
    if (kabupatenLayerRef.current) kabupatenLayerRef.current.setVisible(layers.showChoropleth)
  }, [layers.showFaskes, layers.showPosko, layers.showChoropleth])

  // ── Render Seismic Points (Mainshock & Aftershocks) ──
  useEffect(() => {
    const layer = seismicLayerRef.current
    const map = mapInstanceRef.current
    if (!layer || !map) return

    const source = layer.getSource()
    if (!source) return
    source.clear()

    pulseOverlaysRef.current.forEach(ov => map.removeOverlay(ov))
    pulseOverlaysRef.current = []

    if (!Array.isArray(seismicPoints) || seismicPoints.length === 0) return

    let mainIdx = 0
    let maxMag = -1
    seismicPoints.forEach((p, i) => {
      if (p.isMainshock || p.magnitude > maxMag) {
        maxMag = p.magnitude
        mainIdx = i
      }
    })

    seismicPoints.forEach((p, idx) => {
      const isMain = idx === mainIdx
      const mag = p.magnitude || 4.5

      // Isoseismal impact rings for Mainshock
      if (isMain) {
        const radiusKm = 65
        const shockCircle = new Feature({
          geometry: new CircleGeom(fromLonLat([p.lng, p.lat]), radiusKm * 1000),
        })
        shockCircle.setStyle(new Style({
          fill: new Fill({ color: 'rgba(239, 68, 68, 0.08)' }),
          stroke: new Stroke({ color: 'rgba(239, 68, 68, 0.85)', width: 2.2, lineDash: [6, 6] }),
        }))
        source.addFeature(shockCircle)

        // Inner High Intensity MMI VII-VIII
        const innerCircle = new Feature({
          geometry: new CircleGeom(fromLonLat([p.lng, p.lat]), 25 * 1000),
        })
        innerCircle.setStyle(new Style({
          fill: new Fill({ color: 'rgba(220, 38, 38, 0.16)' }),
          stroke: new Stroke({ color: '#dc2626', width: 1.8 }),
        }))
        source.addFeature(innerCircle)

        createPulseOverlay(p.lng, p.lat)
      }

      // Feature marker
      const feat = new Feature({
        geometry: new Point(fromLonLat([p.lng, p.lat])),
        seismicData: p,
      })

      if (isMain) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 46 54" fill="none">
          <circle cx="23" cy="20" r="19" fill="rgba(220, 38, 38, 0.3)" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3 3"/>
          <path d="M23 4C14.16 4 7 11.16 7 20C7 31 23 50 23 50S39 31 39 20C39 11.16 31.84 4 23 4Z" fill="#dc2626" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="23" cy="20" r="11" fill="#ffffff"/>
          <text x="23" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" font-weight="900" fill="#991b1b">M ${mag.toFixed(1)}</text>
        </svg>`
        feat.setStyle(new Style({
          image: new Icon({
            src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
            scale: 1.0,
            anchor: [0.5, 0.92],
          }),
          zIndex: 100,
        }))
      } else {
        // Aftershocks clean magnitude nodes
        let nodeSvg = ''
        if (mag >= 6.0) {
          nodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#b91c1c" stroke="#ffffff" stroke-width="2.5"/><text x="12" y="15.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8.5" font-weight="900" fill="#ffffff">${mag.toFixed(1)}</text></svg>`
        } else if (mag >= 5.0) {
          nodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#ea580c" stroke="#ffffff" stroke-width="2"/><text x="10" y="13" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7.5" font-weight="900" fill="#ffffff">${mag.toFixed(1)}</text></svg>`
        } else if (mag >= 4.0) {
          nodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.8"/></svg>`
        } else {
          nodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4" fill="#fbbf24" stroke="#ffffff" stroke-width="1.2"/></svg>`
        }

        feat.setStyle(new Style({
          image: new Icon({
            src: 'data:image/svg+xml;utf8,' + encodeURIComponent(nodeSvg),
            scale: 1.0,
            anchor: [0.5, 0.5],
          }),
          zIndex: Math.round(mag * 10),
        }))
      }

      source.addFeature(feat)
    })
  }, [seismicPoints, createPulseOverlay])

  // ── Render Faskes & Posko Features ──
  useEffect(() => {
    const fLayer = faskesLayerRef.current
    const pLayer = poskoLayerRef.current
    if (!fLayer || !pLayer) return

    const fSource = fLayer.getSource()
    const pSource = pLayer.getSource()
    if (fSource) fSource.clear()
    if (pSource) pSource.clear()

    // Faskes markers
    if (fSource && Array.isArray(faskesList)) {
      faskesList.forEach((f) => {
        const lat = Number(f.latitude || 0)
        const lng = Number(f.longitude || 0)
        if (lat !== 0 && lng !== 0) {
          const isRs = String(f.jenis || f.jenis_faskes || f.nama || '').toLowerCase().includes('rs')
          const isRusak = (f.rusak_berat || 0) > 0 || (f.rusak_sedang || 0) > 0
          const color = isRusak ? '#dc2626' : (isRs ? '#2563eb' : '#059669')

          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="${color}" stroke="#ffffff" stroke-width="1.8"/><circle cx="12" cy="10" r="4.5" fill="#ffffff"/><path d="M12 7.5v5M9.5 10h5" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`
          const feat = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            faskesData: f,
          })
          feat.setStyle(new Style({
            image: new Icon({
              src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
              scale: 0.9,
              anchor: [0.5, 1],
            }),
          }))
          fSource.addFeature(feat)
        }
      })
    }

    // Posko markers
    if (pSource && Array.isArray(poskoList)) {
      poskoList.forEach((p) => {
        const lat = Number(p.latitude || 0)
        const lng = Number(p.longitude || 0)
        if (lat !== 0 && lng !== 0) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#7c3aed" stroke="#ffffff" stroke-width="1.8"/><circle cx="12" cy="10" r="4.5" fill="#ffffff"/><path d="M12 7l3.5 3v3.5H8.5V10l3.5-3z" fill="#7c3aed"/></svg>`
          const feat = new Feature({
            geometry: new Point(fromLonLat([lng, lat])),
            poskoData: p,
          })
          feat.setStyle(new Style({
            image: new Icon({
              src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
              scale: 0.85,
              anchor: [0.5, 1],
            }),
          }))
          pSource.addFeature(feat)
        }
      })
    }
  }, [faskesList, poskoList])

  return (
    <div className="relative h-full w-full bg-slate-950">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
})

export default TvNttMapEngine
