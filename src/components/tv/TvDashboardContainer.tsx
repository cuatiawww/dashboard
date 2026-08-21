'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import TvTopHud from './TvTopHud'
import TvKpiCards from './TvKpiCards'
import TvLiveFeedDeck from './TvLiveFeedDeck'
import TvAnalyticsDeck from './TvAnalyticsDeck'
import TvLayerServicesDrawer, { TvLayerState } from './TvLayerServicesDrawer'
import TvBottomTicker from './TvBottomTicker'
import TvSpotlightCard, { SpotlightItem, RouteInfo } from './TvSpotlightCard'
import type { TvMapEngineRef, MarkerData, FaskesItem, PoskoItem, EarthquakePoint } from './TvMapEngine'
import gempaNttData from '../../../public/data/gempa-ntt/gempa_ntt_data.json'

// Dynamically import TvMapEngine to prevent SSR issues
const TvMapEngine = dynamic(() => import('./TvMapEngine'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#fbffff]">
      <div className="text-center space-y-4">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#047D78]" />
        <p className="text-sm font-black tracking-widest text-[#047D78] uppercase">
          Memuat Sistem Video Wall Command Center EOC...
        </p>
      </div>
    </div>
  ),
})

const DEFAULT_LAYERS: TvLayerState = {
  baseMap: 'osm',
  bnpbBanjir: false,
  bnpbGempa: false,
  bnpbLongsor: false,
  bnpbKarhutla: false,
  bnpbHillshade: false,
  bnpbKepadatan: false,
  bnpbAdmin: false,
  showWindy: true,
  showFaskes: true,
  showPosko: true,
  showTck: false,
  showChoropleth: true,
  showMarkers: true,
}

const REFRESH_INTERVAL_SECONDS = 60
const PROVINCE_CYCLE_SECONDS = 30

const formatYmd = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface TvDashboardContainerProps {
  scopeProvinsi?: string
  scopeEventId?: string
}

export default function TvDashboardContainer({ scopeProvinsi, scopeEventId }: TvDashboardContainerProps = {}) {
  const mapEngineRef = useRef<TvMapEngineRef | null>(null)

  const isNttScope = useMemo(() => {
    if (!scopeProvinsi) return false
    const clean = scopeProvinsi.toUpperCase()
    return clean.includes('NUSA TENGGARA TIMUR') || clean.includes('NTT') || clean.includes('FLORES')
  }, [scopeProvinsi])

  const initialCenter: [number, number] | undefined = isNttScope ? [121.8, -8.55] : undefined
  const initialZoom: number | undefined = isNttScope ? 8.5 : undefined

  // ── States ──
  const [isLoading, setIsLoading] = useState(true)
  const [layersOpen, setLayersOpen] = useState(false)
  const [layers, setLayers] = useState<TvLayerState>(DEFAULT_LAYERS)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS)
  const [autoProvinceTour, setAutoProvinceTour] = useState(!isNttScope)
  const [currentTourProvince, setCurrentTourProvince] = useState<string | null>(isNttScope ? 'NUSA TENGGARA TIMUR' : null)
  const [isKpiCollapsed, setIsKpiCollapsed] = useState(false)
  const tourIndexRef = useRef(0)

  // Data States
  const [summary, setSummary] = useState({
    total_bencana: 0,
    total_krisis: 0,
    total_meninggal: 0,
    total_luka: 0,
    total_hilang: 0,
    total_pengungsi: 0,
    total_terdampak: 0,
  })
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [jenisBencanaList, setJenisBencanaList] = useState<any[]>([])
  const [wilayahList, setWilayahList] = useState<any[]>([])
  const [penyakitList, setPenyakitList] = useState<any[]>([])
  const [faskesList, setFaskesList] = useState<FaskesItem[]>([])
  const [poskoList, setPoskoList] = useState<PoskoItem[]>([])
  const [earthquakePoints, setEarthquakePoints] = useState<EarthquakePoint[]>([])
  const [kabupatenDetailList, setKabupatenDetailList] = useState<any[]>([])
  const [bmkgData, setBmkgData] = useState<{ autogempa?: any; gempaterkini?: any[] } | null>(null)
  const [peringatanDiniList, setPeringatanDiniList] = useState<any[]>([])

  // Active Spotlight & Tactical Routing State
  const [spotlightItem, setSpotlightItem] = useState<SpotlightItem | null>(null)
  const [routeCoords, setRouteCoords] = useState<number[][]>([])
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  // ── Tactical Route Generator (OSRM Routing API) ──
  const handleStartRoute = async (target: SpotlightItem) => {
    if (!target.lat || !target.lng) return

    // Origin: Episentrum Utama Laut Flores atau RS Rujukan terdekat
    const startLat = -8.3421
    const startLng = 122.9814
    const endLat = target.lat
    const endLng = target.lng

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const json = await res.json()

      if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
        const route = json.routes[0]
        setRouteCoords(route.geometry.coordinates)
        setRouteInfo({
          distance: route.distance / 1000, // km
          duration: route.duration / 60,   // minutes
          targetName: target.nama_rs || target.nama_pos || target.nama || 'Tujuan Rute',
          targetType: target.type || 'faskes',
        })
      } else {
        // Fallback straight line
        setRouteCoords([[startLng, startLat], [endLng, endLat]])
        const dLat = (endLat - startLat) * 111
        const dLng = (endLng - startLng) * 111 * Math.cos((startLat * Math.PI) / 180)
        const dist = Math.sqrt(dLat * dLat + dLng * dLng)
        setRouteInfo({
          distance: dist,
          duration: (dist / 40) * 60,
          targetName: target.nama_rs || target.nama_pos || target.nama || 'Tujuan Rute',
          targetType: target.type || 'faskes',
        })
      }

      // Fly to target
      mapEngineRef.current?.flyTo(endLng, endLat, 10.5)
    } catch (e) {
      console.warn('[TV Route] Fallback straight line route:', e)
      setRouteCoords([[startLng, startLat], [endLng, endLat]])
      setRouteInfo({
        distance: 65,
        duration: 90,
        targetName: target.nama_rs || target.nama_pos || target.nama || 'Tujuan Rute',
        targetType: target.type || 'faskes',
      })
    }
  }

  const handleClearRoute = () => {
    setRouteCoords([])
    setRouteInfo(null)
  }

  // ── Data Fetching ──
  const fetchData = useCallback(async () => {
    try {
      const now = new Date()
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const startDate = formatYmd(past30Days)
      const endDate = formatYmd(now)

      if (isNttScope) {
        // 1. Fetch direct from official Collector API (/dashboard-eoc/api/ntt-data & /api/ntt-data)
        let nttData: any = null
        try {
          const nttRes = await fetch('/dashboard-eoc/api/ntt-data?tanggal=2026-08-20', { cache: 'no-store' })
          if (nttRes.ok) {
            const nttJson = await nttRes.json()
            if (nttJson.success) {
              nttData = nttJson.tables || nttJson.data
            }
          }
        } catch {
          try {
            const nttRes2 = await fetch('/api/ntt-data?tanggal=2026-08-20', { cache: 'no-store' })
            if (nttRes2.ok) {
              const nttJson2 = await nttRes2.json()
              if (nttJson2.success) {
                nttData = nttJson2.tables || nttJson2.data
              }
            }
          } catch (err2) {
            console.warn('[TV NTT] Failed to fetch /api/ntt-data:', err2)
          }
        }

        // Fallback to local dataset
        if (!nttData) {
          try {
            const nttResScraped = await fetch('/api/gempa-ntt-scraped', { cache: 'no-store' })
            if (nttResScraped.ok) {
              const nttJsonScraped = await nttResScraped.json()
              if (nttJsonScraped.success && nttJsonScraped.data) {
                nttData = nttJsonScraped.data
              }
            }
          } catch {
            nttData = gempaNttData
          }
        }

        const situasiList = Array.isArray(nttData?.situasi_kesehatan) ? nttData.situasi_kesehatan : (gempaNttData as any).situasi_kesehatan || []
        let sumMeninggal = 0
        let sumLuka = 0
        let sumPengungsi = 0
        let sumTerdampak = 0

        const dynamicWilayahList: any[] = []

        if (situasiList.length > 0) {
          situasiList.forEach((s: any) => {
            const m = Number(s.meninggal || 0)
            const lb = Number(s.luka_berat || 0)
            const lr = Number(s.luka_ringan || 0)
            const lk = lb + lr
            const p = Number(s.pengungsi || 0)
            const ter = Number(s.populasi_terdampak || 0)

            sumMeninggal += m
            sumLuka += lk
            sumPengungsi += p
            sumTerdampak += ter

            dynamicWilayahList.push({
              provinsi: s.kabupaten,
              count: lk || p || 1,
              total_korban: lk + m,
              meninggal: m,
              luka: lk,
              pengungsi: p,
              terdampak: ter,
            })
          })
        } else {
          sumMeninggal = 78
          sumLuka = 970
          sumPengungsi = 43686
          sumTerdampak = 1917732
          dynamicWilayahList.push(
            { provinsi: 'Manggarai Timur', count: 643, total_korban: 669 },
            { provinsi: 'Manggarai', count: 136, total_korban: 163 },
            { provinsi: 'Ende', count: 72, total_korban: 74 },
            { provinsi: 'Sikka', count: 55, total_korban: 61 },
            { provinsi: 'Ngada', count: 36, total_korban: 38 },
            { provinsi: 'Nagekeo', count: 22, total_korban: 35 },
            { provinsi: 'Manggarai Barat', count: 6, total_korban: 8 },
            { provinsi: 'Flores Timur', count: 44, total_korban: 44 }
          )
        }

        // ── 2. SEBARAN TITIK KEJADIAN BENCANA 8 KABUPATEN TERDAMPAK NTT ──
        const ntt8KabMarkers: MarkerData[] = [
          {
            id: 'evt-ntt-manggarai-timur',
            kode_trans: 'EVT-NTT-MATIM-01',
            nama: 'Dampak Gempa - Manggarai Timur',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Manggarai Timur',
            kecamatan: 'Borong, Lamba Leda, Kota Komba',
            lat: -8.8033,
            lng: 120.5982,
            total_korban: 669,
            meninggal: 26,
            luka: 643,
            luka_berat: 239,
            luka_ringan: 404,
            pengungsi: 19330,
            terdampak: 313876,
            titik_posko: 246,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-manggarai',
            kode_trans: 'EVT-NTT-MGR-02',
            nama: 'Dampak Gempa - Manggarai',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Manggarai',
            kecamatan: 'Ruteng, Reok, Cibal',
            lat: -8.6148,
            lng: 120.4632,
            total_korban: 163,
            meninggal: 27,
            luka: 136,
            luka_berat: 32,
            luka_ringan: 104,
            pengungsi: 10083,
            terdampak: 340153,
            titik_posko: 14,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-ende',
            kode_trans: 'EVT-NTT-ENDE-03',
            nama: 'Dampak Gempa - Ende',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Ende',
            kecamatan: 'Ende, Ndona, Nangapanda',
            lat: -8.8415,
            lng: 121.6582,
            total_korban: 74,
            meninggal: 2,
            luka: 72,
            luka_berat: 5,
            luka_ringan: 67,
            pengungsi: 3144,
            terdampak: 284165,
            titik_posko: 25,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-sikka',
            kode_trans: 'EVT-NTT-SIK-04',
            nama: 'Dampak Gempa - Sikka',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Sikka',
            kecamatan: 'Maumere, Alok, Nita',
            lat: -8.6214,
            lng: 122.2155,
            total_korban: 61,
            meninggal: 6,
            luka: 55,
            luka_berat: 23,
            luka_ringan: 32,
            pengungsi: 1972,
            terdampak: 350715,
            titik_posko: 9,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-ngada',
            kode_trans: 'EVT-NTT-NGD-05',
            nama: 'Dampak Gempa - Ngada',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Ngada',
            kecamatan: 'Bajawa, Golewa, Aimere',
            lat: -8.7891,
            lng: 120.9664,
            total_korban: 38,
            meninggal: 2,
            luka: 36,
            luka_berat: 17,
            luka_ringan: 19,
            pengungsi: 1333,
            terdampak: 176462,
            titik_posko: 27,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-nagekeo',
            kode_trans: 'EVT-NTT-NGK-06',
            nama: 'Dampak Gempa - Nagekeo',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Nagekeo',
            kecamatan: 'Aesesa, Mauponggo, Boawae',
            lat: -8.6752,
            lng: 121.2891,
            total_korban: 35,
            meninggal: 13,
            luka: 22,
            luka_berat: 13,
            luka_ringan: 9,
            pengungsi: 6221,
            terdampak: 170669,
            titik_posko: 70,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-manggarai-barat',
            kode_trans: 'EVT-NTT-MGB-07',
            nama: 'Dampak Gempa - Manggarai Barat',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Manggarai Barat',
            kecamatan: 'Komodo, Lembor, Kuwus',
            lat: -8.5142,
            lng: 119.8924,
            total_korban: 8,
            meninggal: 2,
            luka: 6,
            luka_berat: 2,
            luka_ringan: 4,
            pengungsi: 1603,
            terdampak: 281692,
            titik_posko: 9,
            tgl_kejadian: '2026-08-15 09:18 WIB',
          },
          {
            id: 'evt-ntt-flores-timur',
            kode_trans: 'EVT-NTT-FLOTIM-08',
            nama: 'Episentrum Utama Laut Flores - Flores Timur',
            jenis_bencana: 'Gempa Bumi',
            provinsi: 'NUSA TENGGARA TIMUR',
            kabupaten: 'Flores Timur',
            kecamatan: 'Larantuka, Tanjung Bunga, Ile Mandiri, Adonara',
            lat: -8.3421,
            lng: 122.9814,
            total_korban: 44,
            meninggal: 0,
            luka: 44,
            luka_berat: 14,
            luka_ringan: 30,
            pengungsi: 0,
            terdampak: 250000,
            titik_posko: 0,
            tgl_kejadian: '2026-08-15 09:18 WIB (M 7.4)',
          },
        ]

        setSummary({
          total_bencana: 8,
          total_krisis: 1,
          total_meninggal: sumMeninggal,
          total_luka: sumLuka,
          total_hilang: 3,
          total_pengungsi: sumPengungsi,
          total_terdampak: sumTerdampak,
        })

        setMarkers(ntt8KabMarkers)
        setWilayahList(dynamicWilayahList)
        setJenisBencanaList([
          { jenis_bencana: 'Gempa Bumi', count: 8, total_korban: sumMeninggal + sumLuka }
        ])

        // ── 3. FASKES SIAGA NTT ──
        const defaultFaskesNtt: FaskesItem[] = [
          { nama_rs: 'RSUD Borong', kabupaten: 'Manggarai Timur', triase_merah: 12, triase_kuning: 17, triase_hijau: 8, triase_hitam: 1, total: 38, lat: -8.8033, lng: 120.5982, status: 'Operasional Penuh', igd: 'Trauma Center' },
          { nama_rs: 'RSUD dr. TC Hillers Maumere', kabupaten: 'Sikka', triase_merah: 1, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total: 4, lat: -8.6214, lng: 122.2155, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD Ruteng', kabupaten: 'Manggarai', triase_merah: 2, triase_kuning: 8, triase_hijau: 1, triase_hitam: 0, total: 11, lat: -8.6148, lng: 120.4632, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD Ende', kabupaten: 'Ende', triase_merah: 1, triase_kuning: 7, triase_hijau: 0, triase_hitam: 0, total: 8, lat: -8.8415, lng: 121.6582, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD Aeramo', kabupaten: 'Nagekeo', triase_merah: 3, triase_kuning: 2, triase_hijau: 0, triase_hitam: 0, total: 5, lat: -8.6752, lng: 121.2891, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD Bajawa', kabupaten: 'Ngada', triase_merah: 0, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total: 3, lat: -8.7891, lng: 120.9664, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD Komodo', kabupaten: 'Manggarai Barat', triase_merah: 0, triase_kuning: 9, triase_hijau: 0, triase_hitam: 0, total: 9, lat: -8.5142, lng: 119.8924, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
          { nama_rs: 'RSUD dr. Hendrikus Fernandez', kabupaten: 'Flores Timur', triase_merah: 0, triase_kuning: 4, triase_hijau: 2, triase_hitam: 0, total: 6, lat: -8.3411, lng: 122.9814, status: 'Siaga 24 Jam', igd: 'Buka Normal' },
        ]

        const rawPasienRs = Array.isArray(nttData?.pasien_rs) ? nttData.pasien_rs : []
        const parsedFaskes: FaskesItem[] = rawPasienRs.length > 0
          ? rawPasienRs.map((r: any) => {
              const def = defaultFaskesNtt.find(
                (d) =>
                  d.kabupaten.toLowerCase() === (r.kabupaten || '').toLowerCase() ||
                  (d.nama_rs || '').toLowerCase().includes((r.nama_rs || '').toLowerCase())
              )
              return {
                nama_rs: r.nama_rs || def?.nama_rs || 'RSUD Rujukan',
                kabupaten: r.kabupaten || def?.kabupaten || 'NTT',
                triase_merah: r.triase_merah !== undefined ? Number(r.triase_merah) : (def?.triase_merah || 0),
                triase_kuning: r.triase_kuning !== undefined ? Number(r.triase_kuning) : (def?.triase_kuning || 0),
                triase_hijau: r.triase_hijau !== undefined ? Number(r.triase_hijau) : (def?.triase_hijau || 0),
                triase_hitam: r.triase_hitam !== undefined ? Number(r.triase_hitam) : (def?.triase_hitam || 0),
                total: r.total !== undefined ? Number(r.total) : (Number(r.triase_merah || 0) + Number(r.triase_kuning || 0) + Number(r.triase_hijau || 0)),
                lat: def?.lat || -8.6,
                lng: def?.lng || 121.5,
                status: def?.status || 'Siaga 24 Jam',
                igd: def?.igd || 'Buka Normal',
              }
            })
          : defaultFaskesNtt

        setFaskesList(parsedFaskes)

        // ── 4. KABUPATEN DETAIL DATA ──
        const defaultKabDetail = [
          { nama: 'Manggarai Timur', meninggal: 26, luka_berat: 239, luka_ringan: 404, total_luka: 643, pengungsi: 19330, terdampak: 313876, titik_posko: 246, lat: -8.8033, lng: 120.5982 },
          { nama: 'Manggarai', meninggal: 27, luka_berat: 32, luka_ringan: 104, total_luka: 136, pengungsi: 10083, terdampak: 340153, titik_posko: 14, lat: -8.6148, lng: 120.4632 },
          { nama: 'Ende', meninggal: 2, luka_berat: 5, luka_ringan: 67, total_luka: 72, pengungsi: 3144, terdampak: 284165, titik_posko: 25, lat: -8.8415, lng: 121.6582 },
          { nama: 'Sikka', meninggal: 6, luka_berat: 23, luka_ringan: 32, total_luka: 55, pengungsi: 1972, terdampak: 350715, titik_posko: 9, lat: -8.6214, lng: 122.2155 },
          { nama: 'Ngada', meninggal: 2, luka_berat: 17, luka_ringan: 19, total_luka: 36, pengungsi: 1333, terdampak: 176462, titik_posko: 27, lat: -8.7891, lng: 120.9664 },
          { nama: 'Nagekeo', meninggal: 13, luka_berat: 13, luka_ringan: 9, total_luka: 22, pengungsi: 6221, terdampak: 170669, titik_posko: 70, lat: -8.6752, lng: 121.2891 },
          { nama: 'Manggarai Barat', meninggal: 2, luka_berat: 2, luka_ringan: 4, total_luka: 6, pengungsi: 1603, terdampak: 281692, titik_posko: 9, lat: -8.5142, lng: 119.8924 },
          { nama: 'Flores Timur', meninggal: 0, luka_berat: 0, luka_ringan: 0, total_luka: 44, pengungsi: 0, terdampak: 0, titik_posko: 0, lat: -8.3421, lng: 122.9814 },
        ]

        const parsedKabDetail = situasiList.length > 0
          ? situasiList.map((s: any) => {
              const def = defaultKabDetail.find((d) => d.nama.toLowerCase() === (s.kabupaten || '').toLowerCase())
              const lb = Number(s.luka_berat || 0)
              const lr = Number(s.luka_ringan || 0)
              return {
                nama: s.kabupaten,
                meninggal: Number(s.meninggal || 0),
                luka_berat: lb,
                luka_ringan: lr,
                total_luka: lb + lr || def?.total_luka || 0,
                pengungsi: Number(s.pengungsi || 0),
                terdampak: Number(s.populasi_terdampak || 0),
                titik_posko: Number(s.titik_pengungsian || 0),
                lat: def?.lat || -8.6,
                lng: def?.lng || 121.5,
              }
            })
          : defaultKabDetail

        setKabupatenDetailList(parsedKabDetail)

        const totalTriaseMerah = parsedFaskes.reduce((s: number, r: any) => s + (r.triase_merah || 0), 0)
        const totalTriaseKuning = parsedFaskes.reduce((s: number, r: any) => s + (r.triase_kuning || 0), 0)
        const totalTriaseHijau = parsedFaskes.reduce((s: number, r: any) => s + (r.triase_hijau || 0), 0)

        setPenyakitList([
          { nama_penyakit: 'Triase Merah (Gawat Darurat)', count: totalTriaseMerah || 24 },
          { nama_penyakit: 'Triase Kuning (Rawat Intensif)', count: totalTriaseKuning || 82 },
          { nama_penyakit: 'Triase Hijau (Rawat Jalan)', count: totalTriaseHijau || 156 },
          { nama_penyakit: 'ISPA & Debu Reruntuhan', count: 145 },
          { nama_penyakit: 'Trauma Fisik & Luka Robek', count: 98 },
        ])

        // ── 5. SEISMIC AFTERSHOCKS POINTS ──
        let eqPoints: EarthquakePoint[] = []
        try {
          const seismicRes = await fetch('/api/bencana-seismic?lat=-8.3421&lng=122.9814&date=2026-08-15&kabupaten=FLORES%20TIMUR&provinsi=NUSA%20TENGGARA%20TIMUR&magnitudo=7.4&kedalaman=12&mmi=VII-VIII')
          if (seismicRes.ok) {
            const seismicJson = await seismicRes.json()
            if (seismicJson.success && Array.isArray(seismicJson.data?.earthquakeFeatures)) {
              eqPoints = seismicJson.data.earthquakeFeatures
            }
          }
        } catch (e) {
          console.warn('[TV NTT] Failed to fetch /api/bencana-seismic:', e)
        }

        if (eqPoints.length === 0) {
          eqPoints = [
            { lat: -8.3421, lng: 122.9814, magnitude: 7.4, depth: 12, place: 'Laut Flores - 112 km Barat Laut Larantuka', time: '09:18 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 0, isMainshock: true, mmi: 'VII-VIII' },
            { lat: -8.412, lng: 122.891, magnitude: 5.6, depth: 10, place: 'Laut Flores - 95 km Barat Laut Larantuka', time: '09:42 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 18, isMainshock: false },
            { lat: -8.489, lng: 122.754, magnitude: 5.2, depth: 15, place: 'Laut Flores - 80 km Barat Laut Maumere', time: '10:15 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 34, isMainshock: false },
            { lat: -8.312, lng: 122.612, magnitude: 4.8, depth: 10, place: 'Laut Flores - 72 km Utara Maumere', time: '11:04 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 42, isMainshock: false },
            { lat: -8.541, lng: 120.781, magnitude: 5.4, depth: 14, place: 'Laut Flores - 45 km Utara Borong', time: '12:30 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 78, isMainshock: false },
            { lat: -8.589, lng: 120.412, magnitude: 4.9, depth: 16, place: 'Laut Flores - 38 km Utara Ruteng', time: '14:22 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 92, isMainshock: false },
            { lat: -8.621, lng: 121.312, magnitude: 4.7, depth: 10, place: 'Laut Flores - 28 km Utara Mbay', time: '16:05 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 65, isMainshock: false },
            { lat: -8.712, lng: 120.912, magnitude: 4.5, depth: 12, place: 'Laut Flores - 32 km Utara Bajawa', time: '18:40 WIB', dateStr: '2026-08-15', dateLabel: '15 Ags', distKm: 85, isMainshock: false },
          ]
        }
        setEarthquakePoints(eqPoints)

        // ── 6. POSKO PENGUNGSIAN REPRESENTATIF NTT ──
        const defaultPoskoNtt: PoskoItem[] = [
          { id: 'p-1', nama: 'Posko Pengungsian Utama Aula Setda Manggarai Timur', nama_pos: 'Posko Utama Aula Setda', kabupaten: 'Manggarai Timur', kecamatan: 'Borong', latitude: -8.8062, longitude: 120.6012, lat: -8.8062, lng: 120.6012, pengungsi: 4500, jiwa: 4500, kapasitas: 5000, pj_kontak: 'BPBD Manggarai Timur' },
          { id: 'p-2', nama: 'Posko Lapangan Stadion Golodukal Ruteng', nama_pos: 'Posko Lapangan Stadion Golodukal', kabupaten: 'Manggarai', kecamatan: 'Langke Rembong', latitude: -8.6189, longitude: 120.4688, lat: -8.6189, lng: 120.4688, pengungsi: 3200, jiwa: 3200, kapasitas: 4000, pj_kontak: 'Dinas Sosial Manggarai' },
          { id: 'p-3', nama: 'Posko Pengungsian Gedung Pemuda Maumere', nama_pos: 'Posko Gedung Pemuda', kabupaten: 'Sikka', kecamatan: 'Alok', latitude: -8.6231, longitude: 122.2189, lat: -8.6231, lng: 122.2189, pengungsi: 1200, jiwa: 1200, kapasitas: 2000, pj_kontak: 'BPBD Sikka' },
          { id: 'p-4', nama: 'Posko Lapangan Marilonga Ende', nama_pos: 'Posko Lapangan Marilonga', kabupaten: 'Ende', kecamatan: 'Ende Tengah', latitude: -8.8432, longitude: 121.6591, lat: -8.8432, lng: 121.6591, pengungsi: 1800, jiwa: 1800, kapasitas: 2500, pj_kontak: 'Dinkes Ende' },
          { id: 'p-5', nama: 'Posko Pengungsian Lapangan Berdikari Mbay', nama_pos: 'Posko Lapangan Berdikari', kabupaten: 'Nagekeo', kecamatan: 'Aesesa', latitude: -8.6791, longitude: 121.2912, lat: -8.6791, lng: 121.2912, pengungsi: 2800, jiwa: 2800, kapasitas: 3500, pj_kontak: 'BPBD Nagekeo' },
          { id: 'p-6', nama: 'Posko Pengungsian Lapangan Kartini Bajawa', nama_pos: 'Posko Lapangan Kartini', kabupaten: 'Ngada', kecamatan: 'Bajawa', latitude: -8.7912, longitude: 120.9689, lat: -8.7912, lng: 120.9689, pengungsi: 950, jiwa: 950, kapasitas: 1500, pj_kontak: 'Tagana Ngada' },
          { id: 'p-7', nama: 'Posko Pengungsian Aula Paroki Larantuka', nama_pos: 'Posko Aula Paroki Larantuka', kabupaten: 'Flores Timur', kecamatan: 'Larantuka', latitude: -8.3445, longitude: 122.9867, lat: -8.3445, lng: 122.9867, pengungsi: 1450, jiwa: 1450, kapasitas: 2000, pj_kontak: 'BPBD Flores Timur' },
        ]
        setPoskoList(defaultPoskoNtt)

        // Default initial spotlight (Manggarai Timur / Pusat Dampak)
        setSpotlightItem(ntt8KabMarkers[0])
      } else {
        // Mode Nasional: 30-day recent disaster feed
        const [dashRes, bmkgRes, alertsRes] = await Promise.allSettled([
          fetch(`/api/dashboard-utama?startDate=${startDate}&endDate=${endDate}`, { cache: 'no-store' }),
          fetch('/api/bmkg-autogempa', { cache: 'no-store' }),
          fetch('/api/bmkg-peringatan-dini', { cache: 'no-store' }),
        ])

        if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
          const json = await dashRes.value.json()
          if (json.success && json.data) {
            const d = json.data
            setSummary({
              total_bencana: d.summary?.total_bencana || 0,
              total_krisis: d.summary?.total_krisis || 0,
              total_meninggal: d.summary?.total_meninggal || 0,
              total_luka: d.summary?.total_luka || 0,
              total_hilang: d.summary?.total_hilang || 0,
              total_pengungsi: d.summary?.total_pengungsi || 0,
              total_terdampak: d.summary?.total_terdampak || 0,
            })
            setMarkers(d.markers || [])
            setJenisBencanaList(d.jenis_bencana || [])
            setWilayahList(d.wilayah || [])
            setPenyakitList(d.penyakit || [])
          }
        }

        if (bmkgRes.status === 'fulfilled' && bmkgRes.value.ok) {
          const json = await bmkgRes.value.json()
          if (json.success && json.data) {
            setBmkgData(json.data)
          }
        }

        if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
          const json = await alertsRes.value.json()
          if (json.success && Array.isArray(json.data)) {
            setPeringatanDiniList(json.data)
          }
        }
      }
    } catch (err) {
      console.error('[TV Dashboard Container] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isNttScope])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto Refresh Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchData()
          return REFRESH_INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchData])

  // Auto Province Tour (National Mode Only)
  useEffect(() => {
    if (!autoProvinceTour || wilayahList.length === 0 || isNttScope) return
    const interval = setInterval(() => {
      tourIndexRef.current = (tourIndexRef.current + 1) % wilayahList.length
      const prov = wilayahList[tourIndexRef.current]
      if (prov && prov.provinsi) {
        setCurrentTourProvince(prov.provinsi)
        mapEngineRef.current?.focusProvince(prov.provinsi)
      }
    }, PROVINCE_CYCLE_SECONDS * 1000)
    return () => clearInterval(interval)
  }, [autoProvinceTour, wilayahList, isNttScope])

  // ── Interactivity Handlers ──
  const handleSelectFeature = (item: any, type: string = 'disaster') => {
    setSpotlightItem({ ...item, type: (type as any) || item.type || 'disaster' })
    if (item.lat && item.lng) {
      mapEngineRef.current?.flyTo(Number(item.lng), Number(item.lat), 10.5)
    }
  }

  const handleSelectProvince = (provName: string) => {
    setCurrentTourProvince(provName)
    mapEngineRef.current?.focusProvince(provName)
  }

  const handleSelectLocation = (lng: number, lat: number, zoom: number = 10.5) => {
    mapEngineRef.current?.flyTo(lng, lat, zoom)
  }

  // ── Sound Alarm Generator ──
  const playAlertSound = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }, [soundEnabled])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbffff] text-slate-800 font-roboto select-none">
      {/* ── 1. FULL-BLEED BACKGROUND MAP ENGINE (Single Unified OpenLayers Engine) ── */}
      <TvMapEngine
        ref={mapEngineRef}
        markers={markers}
        faskesList={faskesList}
        poskoList={poskoList}
        earthquakePoints={earthquakePoints}
        routeCoords={routeCoords}
        wilayahList={wilayahList}
        bmkgGempas={bmkgData?.gempaterkini || []}
        layers={layers}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        onSelectMarker={handleSelectFeature}
      />

      {/* ── 2. TOP FLOATING HUD & CONTROLS ── */}
      <TvTopHud
        onToggleLayers={() => setLayersOpen(!layersOpen)}
        isLayersOpen={layersOpen}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled(!soundEnabled)
          if (!soundEnabled) playAlertSound()
        }}
        refreshCountdown={refreshCountdown}
        refreshInterval={REFRESH_INTERVAL_SECONDS}
        onManualRefresh={() => {
          setIsLoading(true)
          fetchData()
          setRefreshCountdown(REFRESH_INTERVAL_SECONDS)
        }}
        isLoading={isLoading}
        activeSpotlightName={
          spotlightItem ? [spotlightItem.kabupaten, spotlightItem.provinsi].filter(Boolean).join(', ') : null
        }
        currentTourProvince={currentTourProvince}
        autoProvinceTour={autoProvinceTour}
        onToggleProvinceTour={() => setAutoProvinceTour(!autoProvinceTour)}
      />

      {/* ── 3. TOP FLOATING KPI STAT CARDS ── */}
      <TvKpiCards
        summary={summary}
        isLoading={isLoading}
        isCollapsed={isKpiCollapsed}
        onToggleCollapse={() => setIsKpiCollapsed(!isKpiCollapsed)}
      />

      {/* ── 4. LEFT FLOATING SITUASI FASKES DECK ── */}
      <TvLiveFeedDeck
        faskesList={faskesList}
        isKpiCollapsed={isKpiCollapsed}
        onSelectFaskes={(f) => handleSelectFeature(f, 'faskes')}
      />

      {/* ── 5. RIGHT FLOATING ANALYTICS & HOTSPOT DECK ── */}
      <TvAnalyticsDeck
        jenisBencanaList={jenisBencanaList}
        wilayahList={wilayahList}
        kabupatenDetailList={kabupatenDetailList}
        markers={markers}
        recentMarkers={markers}
        penyakitList={penyakitList}
        summary={summary}
        isKpiCollapsed={isKpiCollapsed}
        onSelectProvince={handleSelectProvince}
        onSelectLocation={handleSelectLocation}
      />

      {/* ── 6. LAYER SERVICES DRAWER ── */}
      <TvLayerServicesDrawer
        isOpen={layersOpen}
        onClose={() => setLayersOpen(false)}
        layers={layers}
        onUpdateLayer={(key, val) => setLayers((prev) => ({ ...prev, [key]: val }))}
        onResetLayers={() => setLayers(DEFAULT_LAYERS)}
      />

      {/* ── 7. BOTTOM CENTER FLOATING SPOTLIGHT & TACTICAL ROUTE BANNER ── */}
      <TvSpotlightCard
        item={spotlightItem}
        routeInfo={routeInfo}
        onClose={() => {
          setSpotlightItem(null)
          mapEngineRef.current?.resetView()
        }}
        onStartRoute={handleStartRoute}
        onClearRoute={handleClearRoute}
      />

      {/* ── 8. BOTTOM LIVE RUNNING TICKER ── */}
      <TvBottomTicker
        markers={markers}
        bmkgLatest={bmkgData?.autogempa}
        summaryTotal={summary.total_bencana}
      />
    </div>
  )
}
