'use client'

import { useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import Overlay from 'ol/Overlay'
import 'ol/ol.css'

interface NearestFaskes {
  nama: string
  jenis: string
  jarak_meter: number
}

interface MarkerData {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  lat: number
  lng: number
  nama_desa?: string
  kecamatan?: string
  total_korban: number
  nearest_faskes?: NearestFaskes | null
}

interface FaskesData {
  id: number
  nama: string
  jenis: string // 'Rumah Sakit' | 'Puskesmas' | 'Klinik'
  lat: number
  lng: number
  alamat?: string
}

interface DisasterMapProps {
  markers: MarkerData[]
  faskes?: FaskesData[]
  userScope?: any
}

export default function DisasterMap({ markers, faskes = [], userScope }: DisasterMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const popupOverlayRef = useRef<Overlay | null>(null)
  const markerOverlaysRef = useRef<Overlay[]>([])
  const faskesOverlaysRef = useRef<Overlay[]>([])
  const provinceLayerRef = useRef<any>(null)

  const [selectedFeature, setSelectedFeature] = useState<{
    type: 'incident' | 'faskes'
    data: any
  } | null>(null)

  const closePopup = () => {
    setSelectedFeature(null)
    popupOverlayRef.current?.setPosition(undefined)
  }

  // Proximity colors for incident markers
  const getProximityColor = (marker: MarkerData) => {
    const dist = marker.nearest_faskes?.jarak_meter
    if (dist === undefined || dist === null) return '#ef4444' // Default red if no faskes is near
    if (dist < 5000) return '#10b981' // Green: < 5km
    if (dist <= 15000) return '#f59e0b' // Yellow/Amber: 5 - 15km
    return '#ef4444' // Red: > 15km
  }

  // Proximity labels
  const getProximityLabel = (dist?: number | null) => {
    if (dist === undefined || dist === null) return 'Terisolasi'
    if (dist < 5000) return 'Sangat Dekat (< 5 km)'
    if (dist <= 15000) return 'Respon Sedang (5-15 km)'
    return 'Respon Lambat (> 15 km)'
  }

  const getProximityBadgeClass = (dist?: number | null) => {
    if (dist === undefined || dist === null) return 'bg-red-50 text-red-700 border-red-200'
    if (dist < 5000) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (dist <= 15000) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  // Faskes specific icons and colors
  const getFaskesStyle = (jenis: string) => {
    const type = jenis.toLowerCase()
    if (type.includes('sakit')) {
      return { bg: '#0d9488', icon: '/rumah sakit.svg' }
    } else if (type.includes('puskesmas')) {
      return { bg: '#0f766e', icon: '/puskesmas.svg' }
    }
    return { bg: '#0284c7', icon: '/faskes.svg' } // Klinik / other
  }

  // Initialize Map
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

    const map = new Map({
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

    // Setup map click listener to dismiss popup
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

  // Dynamic styling of province layer based on selected region/scope
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
        color: 'rgba(20, 184, 166, 0.04)', // Very soft teal fill
      }),
      stroke: new Stroke({
        color: '#cbd5e1', // Soft slate border
        width: 1,
      }),
    })

    const inactiveStyle = new Style({
      fill: new Fill({
        color: 'rgba(226, 232, 240, 0.65)', // Grey/slate fill for inactive provinces
      }),
      stroke: new Stroke({
        color: 'rgba(203, 213, 225, 0.4)', // Very soft slate border
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
            color: 'rgba(20, 184, 166, 0.08)', // Selected province soft highlight
          }),
          stroke: new Stroke({
            color: '#0d9488', // Selected province border teal-600
            width: 1.5,
          }),
        })
      }

      return inactiveStyle
    })
  }, [userScope])

  // Update Markers, Faskes, and Fit View
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // 1. Clear old overlays
    markerOverlaysRef.current.forEach((overlay) => map.removeOverlay(overlay))
    markerOverlaysRef.current = []

    faskesOverlaysRef.current.forEach((overlay) => map.removeOverlay(overlay))
    faskesOverlaysRef.current = []

    closePopup()

    const coordinatesToFit: number[][] = []

    // 2. Add Incident Markers
    markers.forEach((marker) => {
      const lat = Number(marker.lat)
      const lng = Number(marker.lng)

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

      coordinatesToFit.push([lng, lat])
      const color = getProximityColor(marker)

      const el = document.createElement('div')
      el.className = 'custom-disaster-pin'
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div class="disaster-marker-pulse" style="background: ${color}4d;"></div>
        <div class="disaster-marker-core" style="background: ${color}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2)"></div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedFeature({ type: 'incident', data: marker })
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

    // 3. Add Faskes Markers
    faskes.forEach((fk) => {
      const lat = Number(fk.lat)
      const lng = Number(fk.lng)

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

      coordinatesToFit.push([lng, lat])
      const { bg, icon } = getFaskesStyle(fk.jenis)

      const el = document.createElement('div')
      el.className = 'custom-faskes-pin'
      el.style.cssText = `
        background: ${bg};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.18);
        transition: transform 0.15s ease-out;
      `
      el.innerHTML = `
        <img src="${icon}" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" alt="${fk.jenis}" />
      `

      // Hover enlargement
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedFeature({ type: 'faskes', data: fk })
        popupOverlayRef.current?.setPosition(fromLonLat([lng, lat]))
        map.getView().animate({
          center: fromLonLat([lng, lat]),
          duration: 300,
          zoom: Math.max(map.getView().getZoom() || 6, 11),
        })
      })

      const faskesOverlay = new Overlay({
        element: el,
        position: fromLonLat([lng, lat]),
        positioning: 'center-center',
        stopEvent: true,
      })

      map.addOverlay(faskesOverlay)
      faskesOverlaysRef.current.push(faskesOverlay)
    })

    // 4. Dynamic Zoning (Fit view to coordinates extent)
    if (coordinatesToFit.length > 0) {
      // Find min/max bounds
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

      // If single coordinate, center with offset padding
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
      // Fallback to center of Indonesia
      map.getView().animate({
        center: fromLonLat([118, -2.5]),
        zoom: 4.8,
        duration: 400,
      })
    }
  }, [markers, faskes, userScope])

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#f1fcfc]">
      {/* Map Target */}
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      {/* Modern Proximity & Facilities Legend */}
      <div className="absolute bottom-5 left-5 max-w-[280px] rounded-2xl border border-[#cbe3e2] bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,118,110,0.12)]">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">KERENTANAN AKSES KESEHATAN</p>
        
        {/* Proximity levels */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] bg-[#10b981]" />
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-slate-800">Sangat Dekat (&lt; 5 km)</p>
              <p className="text-[10px] text-slate-400">Respons medis darurat &lt; 15 menit</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="flex h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] bg-[#f59e0b]" />
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-slate-800">Sedang (5 – 15 km)</p>
              <p className="text-[10px] text-slate-400">Respons medis darurat 15 – 30 menit</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="flex h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] bg-[#ef4444]" />
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-slate-800">Jauh (&gt; 15 km / Terisolasi)</p>
              <p className="text-[10px] text-slate-400">Memerlukan tenda medis darurat</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 my-2.5" />

        {/* Faskes markers */}
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">FASILITAS KESEHATAN</p>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d9488]" style={{ border: '1px solid white' }}>
              <img src="/rumah sakit.svg" className="h-2.5 w-2.5 invert brightness-0" alt="" />
            </span>
            <span>Rumah Sakit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f766e]" style={{ border: '1px solid white' }}>
              <img src="/puskesmas.svg" className="h-2.5 w-2.5 invert brightness-0" alt="" />
            </span>
            <span>Puskesmas</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0284c7]" style={{ border: '1px solid white' }}>
              <img src="/faskes.svg" className="h-2.5 w-2.5 invert brightness-0" alt="" />
            </span>
            <span>Klinik / Sarana Kesehatan</span>
          </div>
        </div>
      </div>

      {/* Dynamic Popup Overlay Container */}
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

            {selectedFeature.type === 'incident' ? (
              // Incident View
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    {selectedFeature.data.jenis_bencana}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {selectedFeature.data.tgl_kejadian}
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                  Desa {selectedFeature.data.nama_desa || 'N/A'}, Kec. {selectedFeature.data.kecamatan || 'N/A'}
                </h4>
                <div className="mt-2.5 space-y-1.5 text-[11px] font-semibold">
                  <div className="flex justify-between text-slate-500">
                    <span>Kode Trans:</span>
                    <span className="text-slate-800">{selectedFeature.data.kode_trans}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Dampak Korban:</span>
                    <span className="text-red-600 font-bold">{selectedFeature.data.total_korban} jiwa</span>
                  </div>
                  
                  <div className="h-px bg-slate-100 my-2" />

                  {/* Proximity / Nearest Faskes Info */}
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Layanan Medis Terdekat</p>
                    {selectedFeature.data.nearest_faskes ? (
                      <>
                        <div className="flex justify-between text-slate-750">
                          <span className="truncate max-w-[130px] font-bold text-slate-800">{selectedFeature.data.nearest_faskes.nama}</span>
                          <span className="text-teal-700 font-extrabold">{(selectedFeature.data.nearest_faskes.jarak_meter / 1000).toFixed(1)} km</span>
                        </div>
                        <span className={`inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${getProximityBadgeClass(selectedFeature.data.nearest_faskes.jarak_meter)}`}>
                          {getProximityLabel(selectedFeature.data.nearest_faskes.jarak_meter)}
                        </span>
                      </>
                    ) : (
                      <span className="inline-block text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border bg-red-50 text-red-750 border-red-200">
                        {getProximityLabel(null)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Faskes View
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    {selectedFeature.data.jenis}
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {selectedFeature.data.nama}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 font-medium">
                  {selectedFeature.data.alamat || 'Alamat tidak terdaftar.'}
                </p>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>LAT: {selectedFeature.data.lat.toFixed(5)}</span>
                  <span>LNG: {selectedFeature.data.lng.toFixed(5)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-disaster-pin {
          background: transparent;
          border: none;
          position: relative;
          width: 28px;
          height: 28px;
        }
        .disaster-marker-core {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 3;
          height: 12px;
          width: 12px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
        }
        .disaster-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          height: 12px;
          width: 12px;
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
            transform: translate(-50%, -50%) scale(3.5);
            opacity: 0;
          }
        }
        .ol-popup {
          position: absolute;
          background-color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
          content: " ";
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
