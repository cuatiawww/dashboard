'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/authStore'
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
  isGuest?: boolean
}

const cleanKey = (name?: string | null) => {
  if (!name) return ''
  return name
    .toUpperCase()
    .replace(/^(KAB\.|KABUPATEN|KOTA|PROVINSI|PROV|PRO|DAERAH ISTIMEWA|DI)\s+/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

const geojsonCache: Record<string, any> = {}

const getFeatureName = (feature: any, level: 'provinsi' | 'kabupaten') => {
  if (!feature) return ''
  const props = feature.getProperties() || {}

  if (level === 'provinsi') {
    const keys = ['provinsi', 'PROVINSI', 'Propinsi', 'nama_prov', 'nama', 'prov_single', 'prov_multi']
    for (const key of keys) {
      if (props[key] !== undefined && props[key] !== null) {
        return String(props[key]).trim()
      }
    }
  } else {
    const keys = ['nama_kab', 'NAMA_KAB', 'kabupaten', 'KABUPATEN', 'kab_single', 'kab_multi', 'nama']
    for (const key of keys) {
      if (props[key] !== undefined && props[key] !== null) {
        return String(props[key]).trim()
      }
    }
  }
  return ''
}

export default function DisasterMap({ markers, userScope, onSelectProvince, isGuest: propIsGuest }: DisasterMapProps) {
  const { token, user, isGuest: storeIsGuest } = useAuthStore()
  const isGuest = propIsGuest || storeIsGuest || !token || !user

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const provinceLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const kabupatenLayerRef = useRef<VectorLayer<VectorSource<any>> | null>(null)
  const lastFetchedProvinceRef = useRef<string | null>(null)

  const onSelectProvinceRef = useRef(onSelectProvince)
  const userScopeRef = useRef(userScope)
  const markersRef = useRef(markers)

  const [isLoading, setIsLoading] = useState(false)
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

  useEffect(() => {
    onSelectProvinceRef.current = onSelectProvince
    userScopeRef.current = userScope
    markersRef.current = markers
  }, [onSelectProvince, userScope, markers])

  // Dismiss popup on scope changes
  useEffect(() => {
    setActivePopup(null)
  }, [userScope])

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

    map.on('singleclick', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)

      if (feature) {
        console.log('[DisasterMap] Clicked feature properties:', feature.getProperties())
      }

      if (!feature) {
        setActivePopup(null)
        return
      }

      const currentScope = userScopeRef.current
      const isProvMode = currentScope?.mode === 'provinsi'
      const isKabMode = currentScope?.mode === 'kabupaten'

      if (!isProvMode && !isKabMode) {
        // National Mode -> Clicked a Province
        const provName = getFeatureName(feature, 'provinsi')
        if (!provName) return

        const provCleaned = cleanKey(provName)
        const provMarkers = markersRef.current.filter((m) => cleanKey(m.provinsi) === provCleaned)

        // Group by kabupaten/city
        const kabMap = new Map<string, { count: number; totalKorban: number }>()
        provMarkers.forEach((m) => {
          const kab = m.kabupaten || 'LAINNYA'
          const existing = kabMap.get(kab) || { count: 0, totalKorban: 0 }
          existing.count++
          existing.totalKorban += m.total_korban || 0
          kabMap.set(kab, existing)
        })

        const breakdown = Array.from(kabMap.entries())
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            totalKorban: stats.totalKorban,
          }))
          .sort((a, b) => b.count - a.count)

        const totalKorban = provMarkers.reduce((sum, m) => sum + (m.total_korban || 0), 0)

        setActivePopup({
          type: 'provinsi',
          name: provName,
          stats: {
            totalEvents: provMarkers.length,
            totalKorban,
            breakdown,
          },
        })
      } else {
        // Province/Kabupaten Mode -> Clicked a Kabupaten
        const kabName = getFeatureName(feature, 'kabupaten')
        if (!kabName) return

        const kabCleaned = cleanKey(kabName)
        const kabMarkers = markersRef.current.filter((m) => cleanKey(m.kabupaten) === kabCleaned)

        const totalKorban = kabMarkers.reduce((sum, m) => sum + (m.total_korban || 0), 0)

        setActivePopup({
          type: 'kabupaten',
          name: kabName,
          stats: {
            totalEvents: kabMarkers.length,
            totalKorban,
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

  // Load Province Boundaries (once on mount)
  useEffect(() => {
    const map = mapInstanceRef.current
    const provinceLayer = provinceLayerRef.current
    if (!map || !provinceLayer) return

    const source = provinceLayer.getSource()
    if (!source) return

    if (source.getFeatures().length === 0) {
      const cacheKey = 'level_provinsi'
      if (geojsonCache[cacheKey]) {
        const format = new GeoJSON()
        const features = format.readFeatures(geojsonCache[cacheKey], {
          dataProjection: 'EPSG:4326',
          featureProjection: map.getView().getProjection(),
        })
        source.addFeatures(features)
      } else {
        setIsLoading(true)
        fetch('/api/wilayah-geojson?level=provinsi')
          .then((res) => res.json())
          .then((data) => {
            if (data && data.success && data.geojson) {
              geojsonCache[cacheKey] = data.geojson
              const format = new GeoJSON()
              const features = format.readFeatures(data.geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: map.getView().getProjection(),
              })
              source.addFeatures(features)
            }
          })
          .catch((err) => console.error('Gagal memuat GeoJSON provinsi:', err))
          .finally(() => setIsLoading(false))
      }
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
        const cacheKey = `level_kabupaten_${provinceName}`
        if (geojsonCache[cacheKey]) {
          kabSource.clear()
          const format = new GeoJSON()
          const features = format.readFeatures(geojsonCache[cacheKey], {
            dataProjection: 'EPSG:4326',
            featureProjection: map.getView().getProjection(),
          })
          kabSource.addFeatures(features)
          performZoomAndFocus(features)
        } else {
          setIsLoading(true)
          fetch(`/api/wilayah-geojson?level=kabupaten&province=${encodeURIComponent(provinceName)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data && data.success && data.geojson) {
                geojsonCache[cacheKey] = data.geojson
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
            .finally(() => setIsLoading(false))
        }
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

      {/* Loading Spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px] transition-all duration-300">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-md px-6 py-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] border border-teal-100">
            <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            <span className="text-xs font-bold text-slate-700 tracking-wider uppercase">Memuat Peta Spasial...</span>
          </div>
        </div>
      )}

      {/* Modern Detail Popup */}
      {activePopup && (
        <div className="absolute right-5 top-5 z-10 w-[320px] max-h-[430px] flex flex-col rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] transition-all duration-300">
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
              <span className="sr-only">Tutup</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isGuest ? (
            /* Restricted UI for Guest Users */
            <div className="flex flex-col items-center py-5 text-center flex-1 justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 mb-3 border border-red-100">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Data Terkunci</h5>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed px-2">
                Statistik kejadian krisis dan detail korban wilayah ini tidak dapat diakses publik. Silakan masuk atau daftar terlebih dahulu.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                <a
                  href="/login"
                  className="flex w-full items-center justify-center rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
                >
                  MASUK / LOGIN
                </a>
                <a
                  href="/register"
                  className="flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white py-2.5 text-xs font-bold text-teal-800 shadow-sm transition hover:bg-teal-50"
                >
                  REGISTRASI MASYARAKAT
                </a>
              </div>
            </div>
          ) : (
            /* Allowed UI for Authenticated Users */
            <>
              {/* Quick stats badges */}
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

              {/* Scrollable breakdown or events list */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[220px]">
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
                    {(!activePopup.stats.eventsList || activePopup.stats.eventsList.length === 0) ? (
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
                              <span className="text-[10px] text-slate-400">Korban Jiwa/Luka:</span>
                              <span className="font-bold text-red-600">{item.total_korban} orang</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer actions */}
              {activePopup.type === 'provinsi' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (onSelectProvinceRef.current) {
                        onSelectProvinceRef.current(activePopup.name)
                      }
                      setActivePopup(null)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    <span>LIHAT DETAIL PROVINSI</span>
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

      {/* Legend */}
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
