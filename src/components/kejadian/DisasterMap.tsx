'use client'

import { useEffect, useMemo, useRef } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import 'ol/ol.css'

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
}

const cleanKey = (name?: string | null) => {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^(KAB\.|KABUPATEN|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI)\s+/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

export default function DisasterMap({ markers, userScope, onSelectProvince }: DisasterMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const provinceLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const lastFetchedProvinceRef = useRef<string | null>(null)

  const onSelectProvinceRef = useRef(onSelectProvince)
  const userScopeRef = useRef(userScope)

  useEffect(() => {
    onSelectProvinceRef.current = onSelectProvince
    userScopeRef.current = userScope
  }, [onSelectProvince, userScope])

  const { provinceCounts, kabupatenCounts } = useMemo(() => {
    const provinceCounts = new Map<string, number>()
    const kabupatenCounts = new Map<string, number>()

    markers.forEach((marker) => {
      if (marker.provinsi) {
        const provKey = cleanKey(marker.provinsi)
        provinceCounts.set(provKey, (provinceCounts.get(provKey) || 0) + 1)
      }
      if (marker.kabupaten) {
        const kabKey = cleanKey(marker.kabupaten)
        kabupatenCounts.set(kabKey, (kabupatenCounts.get(kabKey) || 0) + 1)
      }
    })

    return { provinceCounts, kabupatenCounts }
  }, [markers])

  const getChoroplethColor = (count: number) => {
    if (count === 0) return 'rgba(241, 245, 249, 0.15)'
    if (count <= 2) return '#facc15'
    if (count <= 5) return '#f97316'
    return '#dc2626'
  }

  const getChoroplethStyle = (count: number) => {
    const fillColor = getChoroplethColor(count)
    const strokeColor = count === 0 ? 'rgba(148, 163, 184, 0.4)' : '#ffffff'
    const strokeWidth = count === 0 ? 0.8 : 1.2

    return new Style({
      fill: new Fill({
        color: fillColor,
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth,
      }),
    })
  }

  const getMarkerTitle = () => {
    if (userScope?.mode === 'provinsi' || userScope?.mode === 'kabupaten') return 'SEBARAN KEJADIAN PER KABUPATEN/KOTA'
    return 'SEBARAN KEJADIAN PER PROVINSI'
  }

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return

    const provinceSource = new VectorSource()
    const provinceLayer = new VectorLayer({
      source: provinceSource,
    })
    provinceLayerRef.current = provinceLayer

    const kabupatenSource = new VectorSource()
    const kabupatenLayer = new VectorLayer({
      source: kabupatenSource,
    })
    kabupatenLayerRef.current = kabupatenLayer

    const map = new OlMap({
      target: mapRef.current,
      layers: [provinceLayer, kabupatenLayer],
      controls: defaultControls({ attribution: false }),
      view: new View({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        minZoom: 4,
        maxZoom: 15,
      }),
    })

    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)
      if (feature) {
        const provName = feature.get('provinsi')
        if (provName && onSelectProvinceRef.current && (!userScopeRef.current || userScopeRef.current.mode !== 'provinsi')) {
          onSelectProvinceRef.current(provName)
        }
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [])

  // Load Province Boundaries (once on mount)
  useEffect(() => {
    const map = mapInstanceRef.current
    const provinceLayer = provinceLayerRef.current
    if (!map || !provinceLayer) return

    const source = provinceLayer.getSource()
    if (!source) return

    if (source.getFeatures().length === 0) {
      fetch('/api/wilayah-geojson?level=provinsi')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.geojson) {
            const format = new GeoJSON()
            const features = format.readFeatures(data.geojson, {
              dataProjection: 'EPSG:4326',
              featureProjection: map.getView().getProjection(),
            })
            source.addFeatures(features)
          }
        })
        .catch((err) => console.error('Gagal memuat GeoJSON provinsi:', err))
    }
  }, [])

  // Load/Clear Kabupaten Boundaries based on scope
  useEffect(() => {
    const map = mapInstanceRef.current
    const kabupatenLayer = kabupatenLayerRef.current
    if (!map || !kabupatenLayer) return

    const kabSource = kabupatenLayer.getSource()
    if (!kabSource) return

    const isProvMode = userScope?.mode === 'provinsi'
    const isKabMode = userScope?.mode === 'kabupaten'
    const provinceName = userScope?.provinsi?.label || ''
    const kabupatenName = userScope?.kabupaten?.label || ''

    if ((isProvMode || isKabMode) && provinceName) {
      const performZoomAndFocus = (features: any[]) => {
        if (isKabMode && kabupatenName) {
          const targetKabCleaned = cleanKey(kabupatenName)
          const matchedFeature = features.find((f) => {
            const name = f.get('nama_kab') || f.get('kabupaten')
            return cleanKey(name) === targetKabCleaned
          })

          if (matchedFeature) {
            const geometry = matchedFeature.getGeometry()
            if (geometry) {
              map.getView().fit(geometry.getExtent(), {
                padding: [100, 100, 100, 100],
                duration: 500,
              })
            }
          } else {
            const extent = kabSource.getExtent()
            if (extent && features.length > 0) {
              map.getView().fit(extent, {
                padding: [40, 40, 40, 40],
                duration: 500,
              })
            }
          }
        } else {
          const extent = kabSource.getExtent()
          if (extent && features.length > 0) {
            map.getView().fit(extent, {
              padding: [40, 40, 40, 40],
              duration: 500,
            })
          }
        }
      }

      if (lastFetchedProvinceRef.current !== provinceName) {
        lastFetchedProvinceRef.current = provinceName
        fetch(`/api/wilayah-geojson?level=kabupaten&province=${encodeURIComponent(provinceName)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.success && data.geojson) {
              kabSource.clear()
              const format = new GeoJSON()
              const features = format.readFeatures(data.geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: map.getView().getProjection(),
              })
              kabSource.addFeatures(features)
              performZoomAndFocus(features)
            }
          })
          .catch((err) => console.error('Gagal memuat GeoJSON kabupaten:', err))
      } else {
        performZoomAndFocus(kabSource.getFeatures())
      }
    } else {
      lastFetchedProvinceRef.current = null
      kabSource.clear()
      map.getView().animate({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        duration: 500,
      })
    }
  }, [userScope])

  // Style Layers dynamically based on data/scope changes
  useEffect(() => {
    const provinceLayer = provinceLayerRef.current
    const kabupatenLayer = kabupatenLayerRef.current
    if (!provinceLayer || !kabupatenLayer) return

    const selectedProvName = userScope?.provinsi?.label || ''
    const selectedKabName = userScope?.kabupaten?.label || ''
    const isProvMode = userScope?.mode === 'provinsi'
    const isKabMode = userScope?.mode === 'kabupaten'
    const targetProvCleaned = cleanKey(selectedProvName)
    const targetKabCleaned = cleanKey(selectedKabName)

    provinceLayer.setStyle((feature: any) => {
      const provName = feature.get('provinsi')
      const provCleaned = cleanKey(provName)

      if (isProvMode || isKabMode) {
        if (provCleaned === targetProvCleaned) {
          // Transparent for selected province to let kabupaten layer shine through
          return new Style({
            fill: new Fill({
              color: 'rgba(0, 0, 0, 0)',
            }),
            stroke: new Stroke({
              color: 'rgba(0, 0, 0, 0)',
              width: 0,
            }),
          })
        } else {
          // Gray for all other provinces
          return new Style({
            fill: new Fill({
              color: 'rgba(226, 232, 240, 0.5)',
            }),
            stroke: new Stroke({
              color: 'rgba(203, 213, 225, 0.4)',
              width: 1,
            }),
          })
        }
      } else {
        // National mode choropleth
        const count = provinceCounts.get(provCleaned) || 0
        return getChoroplethStyle(count)
      }
    })

    kabupatenLayer.setStyle((feature: any) => {
      const kabName = feature.get('nama_kab') || feature.get('kabupaten')
      const kabCleaned = cleanKey(kabName)
      const count = kabupatenCounts.get(kabCleaned) || 0

      if (isKabMode) {
        if (kabCleaned === targetKabCleaned) {
          return getChoroplethStyle(count)
        } else {
          // Gray out other kabupaten in the same province
          return new Style({
            fill: new Fill({
              color: 'rgba(226, 232, 240, 0.5)',
            }),
            stroke: new Stroke({
              color: 'rgba(203, 213, 225, 0.4)',
              width: 0.8,
            }),
          })
        }
      } else {
        // Provinsi mode
        return getChoroplethStyle(count)
      }
    })

    // Force style application
    provinceLayer.changed()
    kabupatenLayer.changed()
  }, [userScope, provinceCounts, kabupatenCounts])

  const legendBuckets = [
    { label: '0 kejadian', color: 'rgba(241, 245, 249, 0.15)' },
    { label: '1 - 2 kejadian', color: '#facc15' },
    { label: '3 - 5 kejadian', color: '#f97316' },
    { label: '> 5 kejadian', color: '#dc2626' },
  ]

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#f1fcfc]">
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      <div className="absolute bottom-5 left-5 max-w-[280px] rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,118,110,0.12)]">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">{getMarkerTitle()}</p>
        <div className="space-y-2">
          {legendBuckets.map((bucket, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 rounded-full border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                style={{ background: bucket.color }}
              />
              <div className="text-[11px] leading-tight">
                <p className="font-bold text-slate-800">{bucket.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
