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

interface MarkerData {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  lat: number
  lng: number
  nama_desa?: string
  kecamatan?: string
  total_korban: number
}

interface DisasterMapProps {
  markers: MarkerData[]
}

export default function DisasterMap({ markers }: DisasterMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const popupOverlayRef = useRef<Overlay | null>(null)
  const markerOverlaysRef = useRef<Overlay[]>([])

  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null)

  const closePopup = () => {
    setSelectedMarker(null)
    popupOverlayRef.current?.setPosition(undefined)
  }

  // Create custom color for pins based on disaster type
  const getDisasterColor = (jenis: string) => {
    let color = '#ef4444' // Default red
    const j = jenis.toLowerCase()
    if (j.includes('banjir')) color = '#3b82f6' // Blue
    else if (j.includes('longsor')) color = '#b45309' // Brown
    else if (j.includes('gempa')) color = '#f59e0b' // Yellow
    else if (j.includes('angin') || j.includes('beliung') || j.includes('topan')) color = '#10b981' // Green
    else if (j.includes('kebakaran')) color = '#f97316' // Orange
    return color
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
      style: new Style({
        fill: new Fill({
          color: 'rgba(20, 184, 166, 0.08)', // Soft teal fill
        }),
        stroke: new Stroke({
          color: '#ffffff', // White border
          width: 1.2,
        }),
      }),
    })

    const popupOverlay = new Overlay({
      element: popupRef.current || undefined,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
      positioning: 'bottom-center',
      offset: [0, -15],
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
        maxZoom: 9,
      }),
    })

    // Fit view when GeoJSON is loaded
    provinceSource.once('change', () => {
      if (provinceSource.getState() !== 'ready') return
      const extent = provinceSource.getExtent()
      if (!extent) return
      map.getView().fit(extent, {
        padding: [20, 20, 20, 20],
        duration: 250,
        maxZoom: 5.5,
      })
    })

    // Close popup on map click
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

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old markers
    markerOverlaysRef.current.forEach((overlay) => map.removeOverlay(overlay))
    markerOverlaysRef.current = []
    closePopup()

    // Add new markers
    markers.forEach((marker) => {
      const lat = Number(marker.lat)
      const lng = Number(marker.lng)

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

      const color = getDisasterColor(marker.jenis_bencana)

      // Create pulsing marker DOM element
      const el = document.createElement('div')
      el.className = 'custom-disaster-pin'
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div class="disaster-marker-pulse" style="background: ${color}4d;"></div>
        <div class="disaster-marker-core" style="background: ${color}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15)"></div>
      `

      // Add click handler to marker overlay element
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedMarker(marker)

        popupOverlayRef.current?.setPosition(fromLonLat([lng, lat]))

        map.getView().animate({
          center: fromLonLat([lng, lat]),
          duration: 300,
          zoom: 7,
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
  }, [markers])

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 bg-[#daf3f4]">
      {/* Map Target */}
      <div ref={mapRef} className="h-full w-full min-h-[480px]" />

      {/* Popup Overlay Container */}
      <div
        ref={popupRef}
        className="ol-popup relative bg-white/95 backdrop-blur-sm border border-[#c8e6e5] rounded-xl shadow-lg p-3 min-w-[220px] max-w-[260px] z-50 pointer-events-auto"
      >
        {selectedMarker && (
          <div className="text-slate-800 font-sans pr-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {selectedMarker.jenis_bencana}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                {selectedMarker.tgl_kejadian}
              </span>
            </div>
            <div className="h-px bg-slate-100 my-1.5" />
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {selectedMarker.nama_desa || 'Titik Bencana'}, {selectedMarker.kecamatan || '-'}
            </h4>
            <div className="mt-1.5 space-y-0.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Kode Trans:</span>
                <span className="font-semibold text-slate-700">{selectedMarker.kode_trans}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Dampak Korban:</span>
                <span className="font-bold text-red-650">{selectedMarker.total_korban} jiwa</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closePopup()
              }}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-650 font-extrabold text-sm px-1 leading-none"
            >
              &times;
            </button>
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
