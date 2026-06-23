'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import Overlay from 'ol/Overlay'
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
}

type AggregateMarker = {
  key: string
  label: string
  subLabel: string
  lat: number
  lng: number
  totalKejadian: number
  totalKorban: number
  jenisDominan: string
  tanggalTerbaru: string
  kodeTransaksi: string[]
}

type AggregateMarkerInternal = AggregateMarker & {
  jenisCounter: Map<string, number>
}

type LegendBucket = {
  min: number
  max: number
  color: string
}

const INCIDENT_COLORS = ['#facc15', '#f97316', '#dc2626']

export default function DisasterMap({ markers, userScope }: DisasterMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<OlMap | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const popupOverlayRef = useRef<Overlay | null>(null)
  const markerOverlaysRef = useRef<Overlay[]>([])
  const provinceLayerRef = useRef<VectorLayer<VectorSource> | null>(null)

  const [selectedFeature, setSelectedFeature] = useState<AggregateMarker | null>(null)

  const closePopup = () => {
    setSelectedFeature(null)
    popupOverlayRef.current?.setPosition(undefined)
  }

  const aggregateMarkers = useMemo<AggregateMarker[]>(() => {
    const groups = new Map<string, AggregateMarkerInternal>()
    const mode = userScope?.mode ?? 'all'

    const getGroupInfo = (marker: MarkerData) => {
      if (mode === 'kabupaten') {
        const label = marker.kecamatan?.trim() || marker.nama_desa?.trim() || 'Wilayah Tidak Diketahui'
        return {
          key: `kecamatan:${label}`,
          label,
          subLabel: marker.nama_desa?.trim() ? `Desa ${marker.nama_desa.trim()}` : 'Agregasi kecamatan',
        }
      }

      if (mode === 'provinsi') {
        const label = marker.kabupaten?.trim() || marker.kecamatan?.trim() || 'Kabupaten/Kota Tidak Diketahui'
        return {
          key: `kabupaten:${label}`,
          label,
          subLabel: marker.provinsi?.trim() || userScope?.provinsi?.label || 'Provinsi',
        }
      }

      const label = marker.provinsi?.trim() || 'Provinsi Tidak Diketahui'
      return {
        key: `provinsi:${label}`,
        label,
        subLabel: 'Agregasi provinsi',
      }
    }

    markers.forEach((marker) => {
      const lat = Number(marker.lat)
      const lng = Number(marker.lng)
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

      const group = getGroupInfo(marker)
      const existing = groups.get(group.key)
      const jenisBencana = marker.jenis_bencana || 'Tidak diketahui'

      if (!existing) {
        groups.set(group.key, {
          key: group.key,
          label: group.label,
          subLabel: group.subLabel,
          lat,
          lng,
          totalKejadian: 1,
          totalKorban: Number(marker.total_korban || 0),
          jenisDominan: jenisBencana,
          tanggalTerbaru: marker.tgl_kejadian || '-',
          kodeTransaksi: marker.kode_trans ? [marker.kode_trans] : [],
          jenisCounter: new Map([[jenisBencana, 1]]),
        })
        return
      }

      existing.lat = ((existing.lat * existing.totalKejadian) + lat) / (existing.totalKejadian + 1)
      existing.lng = ((existing.lng * existing.totalKejadian) + lng) / (existing.totalKejadian + 1)
      existing.totalKejadian += 1
      existing.totalKorban += Number(marker.total_korban || 0)
      if (marker.kode_trans) {
        existing.kodeTransaksi.push(marker.kode_trans)
      }
      if (marker.tgl_kejadian && marker.tgl_kejadian > existing.tanggalTerbaru) {
        existing.tanggalTerbaru = marker.tgl_kejadian
      }

      const nextCount = (existing.jenisCounter.get(jenisBencana) || 0) + 1
      existing.jenisCounter.set(jenisBencana, nextCount)
      const dominantEntry = [...existing.jenisCounter.entries()].sort((a, b) => b[1] - a[1])[0]
      existing.jenisDominan = dominantEntry?.[0] || jenisBencana
    })

    return [...groups.values()]
      .map(({ jenisCounter: _jenisCounter, ...item }) => item)
      .sort((a, b) => b.totalKejadian - a.totalKejadian)
  }, [markers, userScope])

  const legendBuckets = useMemo<LegendBucket[]>(() => {
    const counts = aggregateMarkers
      .map((item) => item.totalKejadian)
      .filter((value) => value > 0)

    if (counts.length === 0) {
      return []
    }

    const maxCount = Math.max(...counts)
    const minCount = Math.min(...counts)
    const lowMax = Math.max(minCount, Math.ceil(maxCount / 3))
    const mediumMax = Math.max(lowMax + 1, Math.ceil((maxCount * 2) / 3))

    return [
      { min: mediumMax + 1, max: maxCount, color: INCIDENT_COLORS[2] },
      { min: lowMax + 1, max: Math.min(mediumMax, maxCount), color: INCIDENT_COLORS[1] },
      { min: minCount, max: Math.min(lowMax, maxCount), color: INCIDENT_COLORS[0] },
    ].filter((bucket) => bucket.min <= bucket.max)
  }, [aggregateMarkers])

  const getIncidentColor = (totalKejadian: number) => {
    const bucket = legendBuckets.find((item) => totalKejadian >= item.min && totalKejadian <= item.max)
    return bucket?.color || INCIDENT_COLORS[0]
  }

  const getMarkerTitle = () => {
    if (userScope?.mode === 'kabupaten') return 'SEBARAN KEJADIAN PER KECAMATAN'
    if (userScope?.mode === 'provinsi') return 'SEBARAN KEJADIAN PER KABUPATEN/KOTA'
    return 'SEBARAN KEJADIAN PER PROVINSI'
  }

  useEffect(() => {
    if (!mapRef.current) return

    const provinceSource = new VectorSource({
      url: '/indonesia-provinces.geojson',
      format: new GeoJSON(),
    })

    const provinceLayer = new VectorLayer({
      source: provinceSource,
    })
    provinceLayerRef.current = provinceLayer

    const popupOverlay = new Overlay({
      element: popupRef.current || undefined,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
      positioning: 'bottom-center',
      offset: [0, -20],
    })
    popupOverlayRef.current = popupOverlay

    const map = new OlMap({
      target: mapRef.current,
      layers: [provinceLayer],
      overlays: [popupOverlay],
      controls: defaultControls({ attribution: false }),
      view: new View({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        minZoom: 4,
        maxZoom: 15,
      }),
    })

    map.on('click', () => {
      closePopup()
    })

    mapInstanceRef.current = map

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
      popupOverlayRef.current = null
    }
  }, [])

  useEffect(() => {
    const provinceLayer = provinceLayerRef.current
    if (!provinceLayer) return

    const cleanName = (name?: string | null) => {
      if (!name) return ''
      return name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^(PROVINSI|PROV|PRO|DAERAHISTIMEWA|DI)/i, '')
    }

    const selectedProv = userScope?.provinsi?.label
    const cleanSelected = cleanName(selectedProv)

    const normalStyle = new Style({
      fill: new Fill({
        color: 'rgba(20, 184, 166, 0.04)',
      }),
      stroke: new Stroke({
        color: '#cbd5e1',
        width: 1,
      }),
    })

    const inactiveStyle = new Style({
      fill: new Fill({
        color: 'rgba(226, 232, 240, 0.65)',
      }),
      stroke: new Stroke({
        color: 'rgba(203, 213, 225, 0.4)',
        width: 0.8,
      }),
    })

    provinceLayer.setStyle((feature: any) => {
      if (!userScope || userScope.mode === 'all') {
        return normalStyle
      }

      const featProv = feature.get('Propinsi')
      const cleanFeat = cleanName(featProv)

      if (cleanFeat && cleanFeat === cleanSelected) {
        return new Style({
          fill: new Fill({
            color: 'rgba(20, 184, 166, 0.08)',
          }),
          stroke: new Stroke({
            color: '#0d9488',
            width: 1.5,
          }),
        })
      }

      return inactiveStyle
    })
  }, [userScope])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markerOverlaysRef.current.forEach((overlay) => map.removeOverlay(overlay))
    markerOverlaysRef.current = []

    closePopup()

    const coordinatesToFit: number[][] = []

    aggregateMarkers.forEach((marker) => {
      const lat = Number(marker.lat)
      const lng = Number(marker.lng)

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

      coordinatesToFit.push([lng, lat])
      const color = getIncidentColor(marker.totalKejadian)
      const markerSize = marker.totalKejadian >= 10 ? 40 : marker.totalKejadian >= 5 ? 34 : 28

      const el = document.createElement('div')
      el.className = 'custom-disaster-pin'
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div class="disaster-marker-pulse" style="background: ${color}4d; width: ${markerSize}px; height: ${markerSize}px;"></div>
        <div class="disaster-marker-core disaster-marker-badge" style="background: ${color}; width: ${markerSize}px; height: ${markerSize}px; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2)">
          <span>${marker.totalKejadian}</span>
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedFeature(marker)
        popupOverlayRef.current?.setPosition(fromLonLat([lng, lat]))
        map.getView().animate({
          center: fromLonLat([lng, lat]),
          duration: 300,
          zoom: Math.max(map.getView().getZoom() || 6, 8.5),
        })
      })

      const markerOverlay = new Overlay({
        element: el,
        position: fromLonLat([lng, lat]),
        positioning: 'center-center',
        stopEvent: true,
      })

      map.addOverlay(markerOverlay)
      markerOverlaysRef.current.push(markerOverlay)
    })

    if (coordinatesToFit.length > 0) {
      let minLng = coordinatesToFit[0][0]
      let maxLng = coordinatesToFit[0][0]
      let minLat = coordinatesToFit[0][1]
      let maxLat = coordinatesToFit[0][1]

      coordinatesToFit.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      })

      if (minLng === maxLng && minLat === maxLat) {
        map.getView().animate({
          center: fromLonLat([minLng, minLat]),
          zoom: userScope?.mode === 'kabupaten' ? 10 : 7,
          duration: 400,
        })
      } else {
        const bottomLeft = fromLonLat([minLng, minLat])
        const topRight = fromLonLat([maxLng, maxLat])
        const extent = [bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]]

        map.getView().fit(extent, {
          padding: [60, 60, 60, 60],
          duration: 450,
          maxZoom: userScope?.mode === 'kabupaten' ? 12 : 9.5,
        })
      }
    } else {
      map.getView().animate({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        duration: 400,
      })
    }
  }, [aggregateMarkers, legendBuckets, userScope])

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#f1fcfc]">
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      <div className="absolute bottom-5 left-5 max-w-[280px] rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,118,110,0.12)]">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">{getMarkerTitle()}</p>
        <div className="space-y-2">
          {legendBuckets.length > 0 ? (
            legendBuckets.map((bucket) => (
              <div key={`${bucket.min}-${bucket.max}`} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                  style={{ background: bucket.color }}
                />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-slate-800">
                    {bucket.min === bucket.max ? `${bucket.min} kejadian` : `${bucket.min} - ${bucket.max} kejadian`}
                  </p>
                  <p className="text-[10px] text-slate-400">Warna marker menunjukkan total kejadian pada wilayah tersebut.</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-500">Belum ada data kejadian untuk divisualisasikan.</p>
          )}
        </div>
      </div>

      <div
        ref={popupRef}
        className="ol-popup relative bg-white/95 backdrop-blur-sm border border-[#bce2df] rounded-2xl shadow-[0_10px_35px_rgba(15,118,110,0.18)] p-4 min-w-[250px] max-w-[280px] z-50 pointer-events-auto"
      >
        {selectedFeature && (
          <div className="text-slate-800 font-sans pr-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                closePopup()
              }}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 font-extrabold text-lg px-1.5 leading-none transition-colors"
            >
              &times;
            </button>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                  {selectedFeature.jenisDominan}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {selectedFeature.tanggalTerbaru || '-'}
                </span>
              </div>
              <div className="h-px bg-slate-100 my-2" />
              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{selectedFeature.label}</h4>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{selectedFeature.subLabel}</p>
              <div className="mt-2.5 space-y-1.5 text-[11px] font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Total Kejadian:</span>
                  <span className="text-slate-900">{selectedFeature.totalKejadian}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Korban:</span>
                  <span className="font-bold text-red-600">{selectedFeature.totalKorban} jiwa</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Ringkasan Marker</p>
                  <p className="text-[11px] text-slate-600">
                    Marker ini mewakili {selectedFeature.totalKejadian} laporan kejadian pada wilayah {selectedFeature.label}.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Contoh kode laporan: {selectedFeature.kodeTransaksi.slice(0, 3).join(', ') || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-disaster-pin {
          background: transparent;
          border: none;
          position: relative;
          width: 44px;
          height: 44px;
        }
        .disaster-marker-core {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 3;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
        }
        .disaster-marker-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .disaster-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          animation: disaster-marker-pulse 2s ease-out infinite;
        }
        @keyframes disaster-marker-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.4);
            opacity: 0;
          }
        }
        .ol-popup {
          position: absolute;
          background-color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #c8e6e5;
          bottom: 12px;
          left: -50%;
          min-width: 220px;
          transform: translate(-50%, 0);
        }
        .ol-popup:after, .ol-popup:before {
          top: 100%;
          border: solid transparent;
          content: ' ';
          height: 0;
          width: 0;
          position: absolute;
          pointer-events: none;
        }
        .ol-popup:after {
          border-top-color: white;
          border-width: 10px;
          left: 50%;
          margin-left: -10px;
        }
        .ol-popup:before {
          border-top-color: #c8e6e5;
          border-width: 11px;
          left: 50%;
          margin-left: -11px;
        }
      `}</style>
    </div>
  )
}
