'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type FeatureItem = {
  type?: string
  desc?: string
  iconUrl?: string
  iconSize?: [number, number] | number[]
  coordinates?: Array<number | string>
  angle?: number | string | null
  nama_psc?: string
  jenis_ambulance?: string
  nomor_kendaraan?: string
  petugas_ambulance?: string
  telp_petugas?: string
}

type CollectDataResponse = {
  features_ambulan?: FeatureItem[]
  features_tiket?: FeatureItem[]
  items_ambulan?: Array<{ label?: string | null; value?: string }>
}

type AmbulanceMarker = {
  id: string
  lat: number
  lng: number
  label: string
  desc?: string
  iconUrl?: string
  iconSize?: [number, number]
  angle?: number | null
  status?: string
  namaPsc?: string
  jenisAmbulance?: string
  nomorKendaraan?: string
  petugasAmbulance?: string
  telpPetugas?: string
}

type TicketMarker = {
  id: string
  lat: number
  lng: number
  label: string
}

type IndonesiaMapPlaceholderProps = {
  tileUrl?: string
  attribution?: string
  jakartaOnly?: boolean
  kodeProvinsi?: string
  showTickets?: boolean
  showLegend?: boolean
  showBottomPanel?: boolean
}

const DEFAULT_INDONESIA_CENTER: [number, number] = [-2.5, 118]
const DEFAULT_JAKARTA_CENTER: [number, number] = [-6.2, 106.85]
const DKI_JAKARTA_BOUNDS = {
  minLat: -6.38,
  maxLat: -5.95,
  minLng: 106.65,
  maxLng: 107.02,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createFallbackAmbulanceIcon = () =>
  L.divIcon({
    className: 'ambulance-marker-wrapper',
    html: `
      <div class="ambulance-marker-pulse"></div>
      <div class="ambulance-marker-core"></div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  })

const createTicketPulseIcon = () =>
  L.divIcon({
    className: 'ticket-marker-wrapper',
    html: `
      <div class="ticket-marker-pulse ticket-marker-pulse-delay"></div>
      <div class="ticket-marker-pulse"></div>
      <div class="ticket-marker-core"></div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -20],
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount()
  let size = 'small'

  if (count >= 10) {
    size = 'large'
  } else if (count >= 5) {
    size = 'medium'
  }

  return L.divIcon({
    html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(44, 44, true),
  })
}

function FitBounds({ locations }: { locations: Array<AmbulanceMarker | TicketMarker> }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((point) => [point.lat, point.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    }
  }, [locations, map])

  return null
}

const toNumber = (value?: number | string | null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const normalizeCoords = (pair?: Array<number | string>) => {
  if (!pair || pair.length !== 2) return null

  const first = toNumber(pair[0])
  const second = toNumber(pair[1])

  if (first == null || second == null) return null

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { lat: first, lng: second }
  }

  if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    return { lat: second, lng: first }
  }

  return null
}

const stripHtml = (value?: string) => {
  if (!value) return ''
  return value.replace(/<[^>]*>/g, '').trim()
}

type PopupField = {
  label: string
  value: string
}

type PopupContent = {
  title: string
  fields: PopupField[]
  highlight?: string
  narrative?: string
}

const cleanText = (value?: string) => {
  const cleaned = stripHtml(value).replace(/\s+/g, ' ').trim()
  return cleaned && cleaned !== '-' ? cleaned : ''
}

const parseLegacyAmbulanceFields = (text?: string): PopupField[] => {
  const source = cleanText(text)
  if (!source) return []

  const segments = source
    .split('|')
    .map((segment) => cleanText(segment))
    .filter(Boolean)

  if (segments.length === 0) return []

  const fields: PopupField[] = []

  segments.forEach((segment, index) => {
    if (/^petugas\s*:/i.test(segment)) {
      fields.push({
        label: 'Petugas',
        value: cleanText(segment.replace(/^petugas\s*:/i, '')),
      })
      return
    }

    if (/^(telp|telepon)\s*:/i.test(segment)) {
      fields.push({
        label: 'Telp',
        value: cleanText(segment.replace(/^(telp|telepon)\s*:/i, '')),
      })
      return
    }

    if (/^psc\b/i.test(segment)) {
      fields.push({
        label: 'Nama PSC',
        value: segment,
      })
      return
    }

    if (/^ambulans?\b/i.test(segment)) {
      fields.push({
        label: 'Jenis',
        value: segment,
      })
      return
    }

    if (index === 0) {
      fields.push({
        label: 'Plat Ambulans',
        value: segment,
      })
      return
    }

    fields.push({
      label: `Detail ${fields.length + 1}`,
      value: segment,
    })
  })

  return fields.filter((field) => Boolean(field.value))
}

const buildPopupContent = (marker: AmbulanceMarker): PopupContent => {
  const directFields: PopupField[] = [
    { label: 'Plat Ambulans', value: cleanText(marker.nomorKendaraan) },
    { label: 'Nama PSC', value: cleanText(marker.namaPsc) },
    { label: 'Jenis', value: cleanText(marker.jenisAmbulance) },
    { label: 'Petugas', value: cleanText(marker.petugasAmbulance) },
    { label: 'Telp', value: cleanText(marker.telpPetugas) },
  ].filter((field) => Boolean(field.value))

  const fields =
    directFields.length > 0 ? directFields : parseLegacyAmbulanceFields(marker.desc || marker.label)

  return {
    title: 'Detail Ambulan',
    fields,
    highlight: cleanText(marker.namaPsc) || undefined,
    narrative: fields.length === 0 ? cleanText(marker.desc || marker.label) : undefined,
  }
}

export default function IndonesiaMapPlaceholder({
  tileUrl,
  attribution,
  jakartaOnly = false,
  kodeProvinsi = '',
  showTickets = true,
  showLegend = true,
  showBottomPanel = true,
}: IndonesiaMapPlaceholderProps) {
  const [isClient, setIsClient] = useState(false)
  const [canRenderMap, setCanRenderMap] = useState(false)
  const [ambulanceMarkers, setAmbulanceMarkers] = useState<AmbulanceMarker[]>([])
  const [ticketMarkers, setTicketMarkers] = useState<TicketMarker[]>([])
  const [pk3dUnits, setPk3dUnits] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missingCoords, setMissingCoords] = useState(0)
  const [isPk3dOpen, setIsPk3dOpen] = useState(true)
  const iconCacheRef = useRef<Map<string, L.Icon | L.DivIcon>>(new Map())

  useEffect(() => {
    setIsClient(true)
    setCanRenderMap(true)

    return () => setCanRenderMap(false)
  }, [])

  useEffect(() => {
    if (!isClient) return

    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const dataRes = await fetch('/api/psc119/dashboard/sebaran-peta-ambulan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kode_provinsi: kodeProvinsi || '' }),
          cache: 'no-store',
        })

        if (!dataRes.ok) {
          throw new Error(
            `Gagal ambil data: ${dataRes.status}`,
          )
        }

        const data: CollectDataResponse = await dataRes.json()

        if (!active) return
        const nextAmbulances: AmbulanceMarker[] = []
        const nextTickets: TicketMarker[] = []
        let noCoordCount = 0

        ;(data.features_ambulan || []).forEach((item, index) => {
          const coords = normalizeCoords(item.coordinates)
          if (!coords) {
            noCoordCount += 1
            return
          }

          if (
            jakartaOnly &&
            (coords.lat < DKI_JAKARTA_BOUNDS.minLat ||
              coords.lat > DKI_JAKARTA_BOUNDS.maxLat ||
              coords.lng < DKI_JAKARTA_BOUNDS.minLng ||
              coords.lng > DKI_JAKARTA_BOUNDS.maxLng)
          ) {
            return
          }

          const rawLabel = stripHtml(item.desc) || `Ambulan ${index + 1}`
          const rawSize = Array.isArray(item.iconSize) ? item.iconSize : undefined
          const iconSize: [number, number] | undefined = rawSize
            ? [Number(rawSize[0]), Number(rawSize[1])]
            : undefined

          nextAmbulances.push({
            id: item.type || `ambulance-${index}`,
            lat: coords.lat,
            lng: coords.lng,
            label: rawLabel,
            desc: rawLabel,
            iconUrl: item.iconUrl,
            iconSize,
            angle: toNumber(item.angle),
            namaPsc: cleanText(item.nama_psc),
            jenisAmbulance: cleanText(item.jenis_ambulance),
            nomorKendaraan: cleanText(item.nomor_kendaraan),
            petugasAmbulance: cleanText(item.petugas_ambulance),
            telpPetugas: cleanText(item.telp_petugas),
          })
        })

        ;(data.features_tiket || []).forEach((item, index) => {
          const coords = normalizeCoords(item.coordinates)
          if (!coords) {
            noCoordCount += 1
            return
          }

          if (
            jakartaOnly &&
            (coords.lat < DKI_JAKARTA_BOUNDS.minLat ||
              coords.lat > DKI_JAKARTA_BOUNDS.maxLat ||
              coords.lng < DKI_JAKARTA_BOUNDS.minLng ||
              coords.lng > DKI_JAKARTA_BOUNDS.maxLng)
          ) {
            return
          }

          nextTickets.push({
            id: item.type || `ticket-${index}`,
            lat: coords.lat,
            lng: coords.lng,
            label: stripHtml(item.desc) || `Tiket ${index + 1}`,
          })
        })

        const nextPk3dUnits = (data.items_ambulan || [])
          .map((item) => item.label?.trim())
          .filter((label): label is string => Boolean(label && label.toUpperCase().includes('PK3D')))

        setAmbulanceMarkers(nextAmbulances)
        setTicketMarkers(nextTickets)
        setPk3dUnits(nextPk3dUnits)
        setMissingCoords(noCoordCount)
      } catch (err) {
        if (!active) return
        setError((err as Error)?.message || 'Gagal mengambil data')
        setAmbulanceMarkers([])
        setTicketMarkers([])
        setPk3dUnits([])
        setMissingCoords(0)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [isClient, jakartaOnly, kodeProvinsi])

  const getAmbulanceIcon = (marker: AmbulanceMarker) => {
    const size: [number, number] =
      marker.iconSize &&
      Number.isFinite(marker.iconSize[0]) &&
      Number.isFinite(marker.iconSize[1])
        ? [marker.iconSize[0], marker.iconSize[1]]
        : [24, 24]

    if (!marker.iconUrl) {
      const fallbackKey = 'ambulance-fallback'
      const existing = iconCacheRef.current.get(fallbackKey)
      if (existing) return existing

      const icon = createFallbackAmbulanceIcon()
      iconCacheRef.current.set(fallbackKey, icon)
      return icon
    }

    const key = `${marker.iconUrl}|${size[0]}|${size[1]}`
    const cached = iconCacheRef.current.get(key)
    if (cached) return cached

    const icon = L.icon({
      iconUrl: marker.iconUrl,
      iconSize: size,
      iconAnchor: [Math.round(size[0] / 2), Math.round(size[1])],
      popupAnchor: [0, -Math.round(size[1] / 2)],
      className: 'ambulance-custom-icon',
    })

    iconCacheRef.current.set(key, icon)
    return icon
  }

  if (!isClient || !canRenderMap) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border-2 border-gray-200 bg-gray-100 shadow-lg">
        <span className="text-gray-500">Memuat peta Indonesia...</span>
      </div>
    )
  }

  const visibleTicketMarkers = showTickets ? ticketMarkers : []
  const allLocations = [...ambulanceMarkers, ...visibleTicketMarkers]
  const noMapData = ambulanceMarkers.length === 0 && visibleTicketMarkers.length === 0
  const defaultCenter = jakartaOnly ? DEFAULT_JAKARTA_CENTER : DEFAULT_INDONESIA_CENTER
  const defaultZoom = jakartaOnly ? 11 : 5
  const mapKey = [
    jakartaOnly ? 'jakarta' : 'indonesia',
    kodeProvinsi || 'nasional',
    tileUrl || 'osm',
  ].join('|')

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-lg">
      <MapContainer
        key={mapKey}
        className="h-[420px] w-full"
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        keyboard
        zoomControl={false}
      >
        <TileLayer
          attribution={attribution ?? '&copy; OpenStreetMap contributors'}
          url={tileUrl ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
        />

        <FitBounds locations={allLocations} />

        {visibleTicketMarkers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={createTicketPulseIcon()} zIndexOffset={50}>
            <Popup className="ambulance-status-popup ticket-status-popup" autoPan>
              <div className="ambulance-status-card">
                <div className="ambulance-status-title ambulance-status-title-ticket">
                  {marker.label}
                </div>
                <div className="ambulance-status-divider" />
                <div className="ambulance-status-note">
                  Titik kejadian atau tiket aktif yang sedang terdeteksi pada peta.
                </div>
                <div className="ambulance-status-highlight ambulance-status-highlight-ticket">
                  Tiket Aktif
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MarkerClusterGroup iconCreateFunction={createClusterCustomIcon} maxClusterRadius={70}>
          {ambulanceMarkers.map((marker) => {
            const popupContent = buildPopupContent(marker)

            return (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={getAmbulanceIcon(marker)}>
              <Popup className="ambulance-status-popup" autoPan>
                <div className="ambulance-status-card">
                  <div className="ambulance-status-title">
                    {popupContent.title}
                    {marker.status ? ` - ${marker.status}` : ''}
                  </div>
                  <div className="ambulance-status-divider" />

                  {popupContent.fields.length > 0 ? (
                    <div className="ambulance-status-fields">
                      {popupContent.fields.map((field) => (
                        <div key={`${marker.id}-${field.label}`} className="ambulance-status-field">
                          <span className="ambulance-status-field-label">{field.label}</span>
                          <span className="ambulance-status-field-value">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {popupContent.narrative ? (
                    <div className="ambulance-status-note">{popupContent.narrative}</div>
                  ) : null}

                  {popupContent.highlight ? (
                    <div className="ambulance-status-highlight">{popupContent.highlight}</div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {showLegend && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-700">Keterangan</p>
          {showTickets && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span>Titik tiket aktif</span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white">
              <span className="block h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Unit ambulan</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-white">
              5
            </span>
            <span>Cluster (klik untuk zoom)</span>
          </div>
        </div>
      )}

      {(loading || error || missingCoords > 0 || noMapData) && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-[320px] rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs text-amber-700 shadow-md">
          {loading && <p>Sedang memuat data tracking PSC 119 dari API...</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && noMapData && <p>Belum ada koordinat unit atau tiket di API.</p>}
          {!loading && missingCoords > 0 && (
            <p>{missingCoords} data dari API tidak memiliki koordinat, jadi tidak ditampilkan.</p>
          )}
        </div>
      )}

      {showBottomPanel && (
        <div className="border-t border-red-700 bg-red-600 text-white">
          <button
            type="button"
            onClick={() => setIsPk3dOpen((value) => !value)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-2xl font-black tracking-wide">UNIT PK3D</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/40 bg-white/10 text-xl font-bold">
              {isPk3dOpen ? '-' : '+'}
            </span>
          </button>

          {isPk3dOpen && (
            <div className="border-t border-white/15 bg-red-50 px-5 py-4 text-sm text-slate-700">
              {pk3dUnits.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {pk3dUnits.map((unit) => (
                    <div key={unit} className="rounded-lg border border-red-100 bg-white px-3 py-2 font-semibold">
                      {unit}
                    </div>
                  ))}
                </div>
              ) : (
                <p>Belum ada unit PK3D yang muncul pada payload `items_ambulan` saat ini.</p>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .ambulance-marker-wrapper {
          background: transparent;
          border: 0;
        }

        .ambulance-marker-core {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 3;
          display: flex;
          height: 18px;
          width: 18px;
          transform: translate(-50%, -50%);
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          border-radius: 9999px;
          background: #ef4444;
          box-shadow: 0 10px 24px rgba(239, 68, 68, 0.35);
        }

        .ambulance-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          height: 12px;
          width: 12px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: rgba(239, 68, 68, 0.3);
          animation: ambulance-pulse 2s ease-out infinite;
        }

        @keyframes ambulance-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.85;
          }

          100% {
            transform: translate(-50%, -50%) scale(3.4);
            opacity: 0;
          }
        }

        .ticket-marker-wrapper {
          background: transparent;
          border: 0;
        }

        .ticket-marker-core {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 3;
          height: 14px;
          width: 14px;
          transform: translate(-50%, -50%);
          border: 3px solid rgba(255, 255, 255, 0.95);
          border-radius: 9999px;
          background: #ef4444;
          box-shadow: 0 8px 18px rgba(239, 68, 68, 0.45);
        }

        .ticket-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          height: 14px;
          width: 14px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          border: 3px solid rgba(239, 68, 68, 0.45);
          animation: ticket-pulse 2.5s ease-out infinite;
        }

        .ticket-marker-pulse-delay {
          animation-delay: 1.1s;
        }

        @keyframes ticket-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.9;
          }

          100% {
            transform: translate(-50%, -50%) scale(4.5);
            opacity: 0;
          }
        }

        .custom-cluster-icon {
          background: transparent;
          border: none;
        }

        .cluster-marker {
          background-color: rgba(245, 158, 11, 0.75);
          border: 3px solid white;
          border-radius: 9999px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .cluster-marker::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          border: 3px solid rgba(245, 158, 11, 0.45);
          transform: translate(-50%, -50%);
          animation: cluster-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .cluster-marker span {
          position: relative;
          z-index: 2;
          font-size: 12px;
        }

        @keyframes cluster-pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.9;
          }

          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }

        .cluster-small {
          height: 36px;
          width: 36px;
        }

        .cluster-medium {
          height: 44px;
          width: 44px;
        }

        .cluster-large {
          height: 54px;
          width: 54px;
        }

        .ambulance-status-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
        }

        .ambulance-status-popup .leaflet-popup-content {
          margin: 0;
          min-width: 0;
        }

        .ambulance-status-card {
          min-width: 230px;
          max-width: 290px;
          padding: 16px 18px 14px;
        }

        .ambulance-status-title {
          color: #0f8784;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.4;
        }

        .ambulance-status-title-ticket {
          color: #1f2937;
        }

        .ambulance-status-divider {
          margin: 10px 0 12px;
          height: 1px;
          width: 100%;
          background: #dbe4ea;
        }

        .ambulance-status-fields {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .ambulance-status-field {
          display: grid;
          grid-template-columns: minmax(72px, 92px) 1fr;
          gap: 10px;
          align-items: start;
        }

        .ambulance-status-field-label {
          color: #5b6472;
          font-size: 12px;
          font-weight: 700;
        }

        .ambulance-status-field-value {
          color: #3b4450;
          font-size: 12px;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
        }

        .ambulance-status-highlight {
          margin-top: 14px;
          display: inline-flex;
          min-height: 34px;
          width: 100%;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(135deg, #0f8784 0%, #18b5b0 100%);
          padding: 8px 12px;
          color: white;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .ambulance-status-highlight-ticket {
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
        }

        .ambulance-status-note {
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.5;
        }

        .ambulance-status-subtitle {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .ambulance-status-popup .leaflet-popup-content-wrapper {
            border-radius: 16px;
          }

          .ambulance-status-card {
            min-width: 210px;
            max-width: 250px;
            padding: 12px 16px;
          }

          .ambulance-status-title {
            font-size: 14px;
          }

          .ambulance-status-field {
            grid-template-columns: minmax(64px, 82px) 1fr;
          }
        }
      `}</style>
    </div>
  )
}


