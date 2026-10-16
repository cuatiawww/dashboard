'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Overlay from 'ol/Overlay'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import { fromLonLat, transformExtent } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import 'ol/ol.css'
import { Layers, X } from 'lucide-react'
import {
  fmtNum,
  toNum,
  normName,
  provGeoKey,
  ispuColor,
  aqiColor,
  HOTSPOT_CONF_COLORS,
  normalizeHotspot,
  buildKabCoordIndex,
  lookupKabCoord,
  matchStationCoord,
  ISPU_LEGEND_DEFAULT,
  US_AQI_LEGEND_DEFAULT,
  SOURCE_CREDITS,
  dataDukungUpdated,
  fmtUpdated,
} from './karhutlaUtils'

interface KarhutlaDataMapProps {
  karhutla: any // { all, hotspot, hotspotRingkasan, udara }
}

const INDONESIA_EXTENT_LONLAT: [number, number, number, number] = [94.5, -11.5, 141.5, 6.5]

type MetricKey = 'penduduk' | 'ispa' | 'penyakit' | 'hotspot' | 'ispu' | 'sdmk' | 'upaya' | 'logistik'

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'penduduk', label: 'Penduduk terdampak', unit: 'jiwa' },
  { key: 'ispa', label: 'Kasus ISPA', unit: 'kasus' },
  { key: 'penyakit', label: 'Kasus penyakit lainnya', unit: 'kasus' },
  { key: 'hotspot', label: 'Titik panas (FIRMS)', unit: 'titik' },
  { key: 'ispu', label: 'ISPU maksimum', unit: 'ISPU' },
  { key: 'sdmk', label: 'SDMK digerakkan', unit: 'orang' },
  { key: 'upaya', label: 'Jumlah upaya kesehatan', unit: 'upaya' },
  { key: 'logistik', label: 'Baris distribusi logistik', unit: 'baris' },
]

const RAMP = ['#FFF7EC', '#FEE8C8', '#FDD49E', '#FDBB84', '#FC8D59', '#EF6548', '#D7301F', '#990000']

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export default function KarhutlaDataMap({ karhutla }: KarhutlaDataMapProps) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const popupEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const overlayRef = useRef<Overlay | null>(null)
  const layersRef = useRef<Record<string, VectorLayer<any>>>({})
  const [geo, setGeo] = useState<any>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [metric, setMetric] = useState<MetricKey>('penduduk')
  const [popupHtml, setPopupHtml] = useState<string>('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [visible, setVisible] = useState<Record<string, boolean>>({
    provinsi: true,
    kabupaten: true,
    hotspot: true,
    ispu: true,
    udara: false,
  })

  const all = useMemo(() => karhutla?.all || {}, [karhutla])
  const legendIspu = all.ispu?.legenda?.length ? all.ispu.legenda : ISPU_LEGEND_DEFAULT
  const legendAqi = karhutla?.udara?.legenda_us_aqi?.length ? karhutla.udara.legenda_us_aqi : US_AQI_LEGEND_DEFAULT

  // ---------- Muat batas provinsi ----------
  useEffect(() => {
    let active = true
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/indonesia-provinces.geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => active && setGeo(j))
      .catch((e) => active && setGeoError(String(e?.message || e)))
    return () => {
      active = false
    }
  }, [])

  // ---------- Agregasi per provinsi (semua tipe data API) ----------
  const provStats = useMemo(() => {
    const m: Record<string, any> = {}
    const get = (prov: any) => {
      const k = provGeoKey(prov)
      if (!k) return null
      if (!m[k]) m[k] = { names: new Set<string>(), penduduk: 0, kabTerdampak: 0, ispa: 0, ispaBalita: 0, penyakit: 0, penyakitDetail: {} as Record<string, number>, hotspot: 0, hotspotTinggi: 0, ispu: null as number | null, ispuKat: '', ispuStasiun: 0, sdmk: 0, sdmkJenis: [] as string[], upaya: 0, logistik: 0, logItems: {} as Record<string, number>, meninggal: 0, rawatInap: 0 }
      m[k].names.add(String(prov))
      return m[k]
    }
    ;(all.penduduk_terdampak?.by_provinsi || []).forEach((r: any) => {
      const o = get(r.provinsi); if (!o) return
      o.penduduk += toNum(r.penduduk_terdampak); o.kabTerdampak += toNum(r.kabupaten_terdampak)
      o.meninggal += toNum(r.meninggal); o.rawatInap += toNum(r.luka_berat_rawat_inap)
    })
    ;(all.ispa?.data || []).forEach((r: any) => {
      const o = get(r.provinsi); if (!o) return
      o.ispa += toNum(r.total_kasus); o.ispaBalita += toNum(r.kategori_umur?.le_5_tahun)
    })
    ;(all.penyakit_lainnya?.by_provinsi || []).forEach((r: any) => {
      const o = get(r.provinsi); if (!o) return
      o.penyakit += toNum(r.total)
      Object.entries(r.penyakit || {}).forEach(([k, v]) => { o.penyakitDetail[k] = (o.penyakitDetail[k] || 0) + toNum(v) })
    })
    ;(all.ispu?.by_provinsi || []).forEach((r: any) => {
      const o = get(r.provinsi); if (!o) return
      if (r.ispu_maks !== null && r.ispu_maks !== undefined && (o.ispu === null || r.ispu_maks > o.ispu)) { o.ispu = toNum(r.ispu_maks); o.ispuKat = r.kategori_maks || '' }
      o.ispuStasiun += toNum(r.jumlah_stasiun)
    })
    ;(all.sdmk?.data || []).forEach((r: any) => {
      const o = get(r.provinsi); if (!o) return
      o.sdmk += toNum(r.jumlah); o.sdmkJenis = Array.from(new Set([...o.sdmkJenis, ...(r.jenis_tenaga || [])]))
    })
    ;(all.upaya?.data || []).forEach((r: any) => {
      if (normName(r.wilayah) === 'NASIONAL') return
      const o = get(r.wilayah); if (!o) return
      o.upaya += 1
    })
    ;[all.logistik?.dinkes?.data, all.logistik?.puskris?.data].forEach((arr: any) => {
      ;(arr || []).forEach((r: any) => {
        const o = get(r.provinsi); if (!o) return
        o.logistik += 1
        const key = `${r.jenis_logistik} (${r.satuan || '-'})`
        o.logItems[key] = (o.logItems[key] || 0) + toNum(r.jumlah)
      })
    })
    const hsProv = karhutla?.hotspotRingkasan?.by_provinsi
    if (Array.isArray(hsProv) && hsProv.length) {
      hsProv.forEach((r: any) => { const o = get(r.provinsi); if (!o) return; o.hotspot += toNum(r.jumlah); o.hotspotTinggi += toNum(r.tinggi) })
    } else {
      ;(karhutla?.hotspot?.data || []).forEach((h: any) => {
        const n = normalizeHotspot(h); if (!n.provinsi) return
        const o = get(n.provinsi); if (!o) return
        o.hotspot += 1; if (n.confidence === 'tinggi') o.hotspotTinggi += 1
      })
    }
    return m
  }, [all, karhutla?.hotspot, karhutla?.hotspotRingkasan])

  const metricValue = (o: any, k: MetricKey): number | null => {
    if (!o) return null
    const v = k === 'penduduk' ? o.penduduk : k === 'ispa' ? o.ispa : k === 'penyakit' ? o.penyakit : k === 'hotspot' ? o.hotspot : k === 'ispu' ? o.ispu : k === 'sdmk' ? o.sdmk : k === 'upaya' ? o.upaya : o.logistik
    return v === null || v === undefined || v === 0 ? (k === 'ispu' && v === 0 ? 0 : null) : v
  }

  const metricMax = useMemo(() => {
    let mx = 0
    Object.values(provStats).forEach((o: any) => { const v = metricValue(o, metric); if (v && v > mx) mx = v })
    return mx
  }, [provStats, metric])

  const rampColor = (v: number | null) => {
    if (v === null || !metricMax) return 'rgba(148,163,184,0.08)'
    if (metric === 'ispu') return ispuColor(v, legendIspu) + 'B3'
    const t = Math.sqrt(v / metricMax)
    return RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(t * (RAMP.length - 1))))] + 'CC'
  }

  // ---------- Koordinat kab/kota (dari data kualitas_udara_model / LOKASI_PANTAU) ----------
  const udaraRows = useMemo(() => (Array.isArray(karhutla?.udara?.data) ? karhutla.udara.data : []), [karhutla?.udara])
  const kabIdx = useMemo(() => buildKabCoordIndex(udaraRows), [udaraRows])

  // Centroid provinsi dari geojson (pusat bbox poligon terbesar)
  const provCentroid = useMemo(() => {
    const c: Record<string, [number, number]> = {}
    if (!geo?.features) return c
    geo.features.forEach((f: any) => {
      const name = normName(f.properties?.Propinsi || f.properties?.PROVINSI || f.properties?.name)
      const g = f.geometry
      if (!g) return
      const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : []
      let best: any = null; let bestArea = -1
      polys.forEach((p: any) => {
        const ring = p[0] || []
        let minX = 999, minY = 999, maxX = -999, maxY = -999
        ring.forEach(([x, y]: [number, number]) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y })
        const a = (maxX - minX) * (maxY - minY)
        if (a > bestArea) { bestArea = a; best = [(minX + maxX) / 2, (minY + maxY) / 2] }
      })
      if (best) c[name] = best
    })
    return c
  }, [geo])

  // ---------- Inisialisasi peta ----------
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const overlay = new Overlay({ element: popupEl.current as HTMLElement, autoPan: { animation: { duration: 200 } }, positioning: 'bottom-center', offset: [0, -10] })
    overlayRef.current = overlay
    const mk = (z: number) => new VectorLayer({ source: new VectorSource(), zIndex: z })
    layersRef.current = { provinsi: mk(5), kabupaten: mk(10), ispu: mk(20), udara: mk(15), hotspot: mk(25) }
    const map = new OlMap({
      target: mapEl.current,
      controls: defaultControls({ attribution: true, rotate: false }),
      layers: [new TileLayer({ source: new OSM(), zIndex: 0 }), ...Object.values(layersRef.current)],
      overlays: [overlay],
      view: new View({ center: fromLonLat([118, -2.5]), zoom: 4.6, minZoom: 3.5, maxZoom: 14 }),
    })
    map.getView().fit(transformExtent(INDONESIA_EXTENT_LONLAT, 'EPSG:4326', 'EPSG:3857'), { padding: [20, 20, 20, 20] })
    map.on('singleclick', (evt) => {
      const f: any = map.forEachFeatureAtPixel(evt.pixel, (ft) => ft, { hitTolerance: 4 })
      const html = f?.get('popup')
      if (html) {
        setPopupHtml(html)
        overlay.setPosition(evt.coordinate)
      } else {
        overlay.setPosition(undefined)
      }
    })
    map.on('pointermove', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel, { hitTolerance: 4 })
      ;(map.getTargetElement() as HTMLElement).style.cursor = hit ? 'pointer' : ''
    })
    mapRef.current = map
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [])

  // ---------- Layer choropleth provinsi ----------
  useEffect(() => {
    const layer = layersRef.current.provinsi
    if (!layer || !geo) return
    const src = layer.getSource()
    src.clear()
    const feats = new GeoJSON().readFeatures(geo, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })
    const mDef = METRICS.find((x) => x.key === metric)!
    feats.forEach((f: any) => {
      const key = normName(f.get('Propinsi') || f.get('PROVINSI') || f.get('name'))
      const o = provStats[key]
      const v = metricValue(o, metric)
      f.setStyle(new Style({ fill: new Fill({ color: rampColor(v) }), stroke: new Stroke({ color: o ? '#7C2D12' : '#94A3B8', width: o ? 1.2 : 0.5 }) }))
      if (o) {
        const name = Array.from(o.names).join(' / ')
        const pen = Object.entries(o.penyakitDetail).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${esc(k)}: ${fmtNum(v)}`).join('<br/>')
        const log = Object.entries(o.logItems).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${esc(k)}: ${fmtNum(v)}`).join('<br/>')
        f.set('popup', `<div class="kh-pop-title">${esc(name)}</div>
          <div class="kh-pop-sub">Indikator peta: ${esc(mDef.label)} = <b>${v === null ? '-' : fmtNum(v)}</b> ${esc(mDef.unit)}</div>
          <table class="kh-pop-tbl">
          <tr><td>Penduduk terdampak</td><td>${fmtNum(o.penduduk)} (${fmtNum(o.kabTerdampak)} kab/kota)</td></tr>
          <tr><td>Meninggal / rawat inap</td><td>${fmtNum(o.meninggal)} / ${fmtNum(o.rawatInap)}</td></tr>
          <tr><td>Kasus ISPA (balita)</td><td>${o.ispa ? `${fmtNum(o.ispa)} (${fmtNum(o.ispaBalita)})` : 'tidak ada data'}</td></tr>
          <tr><td>Penyakit lainnya</td><td>${o.penyakit ? fmtNum(o.penyakit) : 'tidak ada data'}</td></tr>
          <tr><td>ISPU maks (stasiun)</td><td>${o.ispu !== null ? `${fmtNum(o.ispu)} ${esc(o.ispuKat)}` : '-'} (${fmtNum(o.ispuStasiun)})</td></tr>
          <tr><td>Titik panas (tinggi)</td><td>${fmtNum(o.hotspot)} (${fmtNum(o.hotspotTinggi)})</td></tr>
          <tr><td>SDMK digerakkan</td><td>${fmtNum(o.sdmk)}</td></tr>
          <tr><td>Upaya kesehatan</td><td>${fmtNum(o.upaya)}</td></tr>
          </table>
          ${pen ? `<div class="kh-pop-sec">Penyakit lainnya teratas</div><div class="kh-pop-list">${pen}</div>` : ''}
          ${log ? `<div class="kh-pop-sec">Logistik tersalur</div><div class="kh-pop-list">${log}</div>` : ''}`)
      } else {
        f.set('popup', null)
      }
    })
    src.addFeatures(feats)
  }, [geo, provStats, metric, metricMax])

  // ---------- Layer penduduk terdampak per kab/kota (bubble) ----------
  const kabStats = useMemo(() => {
    const rows = Array.isArray(all.penduduk_terdampak?.data) ? all.penduduk_terdampak.data : []
    let located = 0
    const pts = rows.map((r: any) => {
      const c = lookupKabCoord(kabIdx, r.kabupaten, r.provinsi)
      if (c) located++
      return { ...r, coord: c }
    })
    return { pts, located, total: rows.length }
  }, [all.penduduk_terdampak, kabIdx])

  useEffect(() => {
    const layer = layersRef.current.kabupaten
    if (!layer) return
    const src = layer.getSource(); src.clear()
    const max = Math.max(1, ...kabStats.pts.map((p: any) => toNum(p.penduduk_terdampak)))
    kabStats.pts.forEach((p: any) => {
      if (!p.coord) return
      const v = toNum(p.penduduk_terdampak)
      const f = new Feature({ geometry: new Point(fromLonLat([p.coord.lng, p.coord.lat])) })
      const r = 4 + Math.sqrt(v / max) * 18
      f.setStyle(new Style({ image: new CircleStyle({ radius: r, fill: new Fill({ color: 'rgba(124,58,237,0.35)' }), stroke: new Stroke({ color: '#6D28D9', width: 1.2 }) }) }))
      const k = p.korban || {}
      f.set('popup', `<div class="kh-pop-title">${esc(p.kabupaten)}</div><div class="kh-pop-sub">${esc(p.provinsi)}</div>
        <table class="kh-pop-tbl"><tr><td>Penduduk terdampak</td><td><b>${fmtNum(v)}</b> jiwa</td></tr>
        <tr><td>Meninggal</td><td>${fmtNum(k.meninggal)}</td></tr><tr><td>Rawat inap</td><td>${fmtNum(k.luka_berat_rawat_inap)}</td></tr>
        <tr><td>Rawat jalan</td><td>${fmtNum(k.luka_ringan_rawat_jalan)}</td></tr><tr><td>Pengungsi</td><td>${fmtNum(k.pengungsi)}</td></tr></table>
        <div class="kh-pop-note">Titik = koordinat ibu kota kab/kota (LOKASI_PANTAU)</div>`)
      src.addFeature(f)
    })
  }, [kabStats])

  // ---------- Layer stasiun ISPU ----------
  const ispuStats = useMemo(() => {
    const rows = Array.isArray(all.ispu?.data) ? all.ispu.data : []
    const perProvCount: Record<string, number> = {}
    let approx = 0
    const pts = rows.map((r: any) => {
      let c: any = matchStationCoord(kabIdx, r.stasiun, r.provinsi)
      let isApprox = false
      if (!c) {
        const cc = provCentroid[provGeoKey(r.provinsi)]
        if (cc) {
          const pk = provGeoKey(r.provinsi)
          const i = (perProvCount[pk] = (perProvCount[pk] || 0) + 1)
          const ang = (i * 137.5 * Math.PI) / 180
          const rad = 0.25 * Math.sqrt(i)
          c = { lng: cc[0] + rad * Math.cos(ang), lat: cc[1] + rad * Math.sin(ang) }
          isApprox = true
          approx++
        }
      }
      return { ...r, coord: c, isApprox }
    })
    return { pts, approx }
  }, [all.ispu, kabIdx, provCentroid])

  useEffect(() => {
    const layer = layersRef.current.ispu
    if (!layer) return
    const src = layer.getSource(); src.clear()
    ispuStats.pts.forEach((p: any) => {
      if (!p.coord) return
      const f = new Feature({ geometry: new Point(fromLonLat([p.coord.lng, p.coord.lat])) })
      const col = p.data_tersedia ? p.warna_hex || ispuColor(p.nilai_ispu, legendIspu) : '#94A3B8'
      f.setStyle(new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: col }), stroke: new Stroke({ color: p.isApprox ? '#F8FAFC' : '#0F172A', width: 2, lineDash: p.isApprox ? [3, 2] : undefined }) }) }))
      f.set('popup', `<div class="kh-pop-title">Stasiun ISPU: ${esc(p.stasiun)}</div><div class="kh-pop-sub">${esc(p.provinsi)}</div>
        <table class="kh-pop-tbl"><tr><td>Nilai ISPU</td><td><b>${p.data_tersedia ? fmtNum(p.nilai_ispu) : 'tidak ada data'}</b></td></tr>
        <tr><td>Kategori</td><td>${esc(p.kategori || '-')}</td></tr><tr><td>Parameter kritis</td><td>${esc(p.parameter_kritis || '-')}</td></tr></table>
        <div class="kh-pop-note">${esc(all.ispu?.update_text || '')}${p.isApprox ? '<br/>Lokasi perkiraan (koordinat stasiun tidak tersedia; ditempatkan di sekitar pusat provinsi)' : '<br/>Lokasi = kab/kota sesuai nama stasiun'}</div>`)
      src.addFeature(f)
    })
  }, [ispuStats, legendIspu])

  // ---------- Layer kualitas udara model ----------
  useEffect(() => {
    const layer = layersRef.current.udara
    if (!layer) return
    const src = layer.getSource(); src.clear()
    udaraRows.forEach((r: any) => {
      const lat = Number(r.latitude), lng = Number(r.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const f = new Feature({ geometry: new Point(fromLonLat([lng, lat])) })
      const col = r.warna_aqi_hex || aqiColor(r.us_aqi, legendAqi)
      f.setStyle(new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: col }), stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }) }) }))
      f.set('popup', `<div class="kh-pop-title">${esc(r.nama_lokasi)} (${esc(r.kabupaten)})</div><div class="kh-pop-sub">${esc(r.provinsi)} - model Open-Meteo/CAMS</div>
        <table class="kh-pop-tbl"><tr><td>US AQI</td><td><b>${fmtNum(r.us_aqi)}</b> ${esc(r.kategori_aqi || '')}</td></tr>
        <tr><td>PM2.5 / PM10</td><td>${fmtNum(r.pm2_5, 1)} / ${fmtNum(r.pm10, 1)} ug/m3</td></tr>
        <tr><td>ISPU PM2.5 (estimasi)</td><td>${fmtNum(r.ispu_pm25_estimasi)} ${esc(r.kategori_ispu_estimasi || '')}</td></tr>
        <tr><td>Suhu / RH</td><td>${fmtNum(r.suhu_c, 1)} C / ${fmtNum(r.kelembapan_pct)}%</td></tr>
        <tr><td>Angin</td><td>${fmtNum(r.angin_kmh, 1)} km/j (${fmtNum(r.arah_angin_deg)} deg)</td></tr>
        <tr><td>Hari tanpa hujan</td><td>${fmtNum(r.hari_tanpa_hujan)}</td></tr></table>
        <div class="kh-pop-note">Data ${esc(r.waktu_data_wib || '')} WIB. Nilai model (~40 km), bukan pengukuran stasiun.</div>`)
      src.addFeature(f)
    })
  }, [udaraRows, legendAqi])

  // ---------- Layer titik panas ----------
  const hotspotPts = useMemo(() => {
    const arr = Array.isArray(karhutla?.hotspot?.data) ? karhutla.hotspot.data : []
    return arr.map(normalizeHotspot).filter((h: any) => Number.isFinite(h.lat) && Number.isFinite(h.lng))
  }, [karhutla?.hotspot])

  useEffect(() => {
    const layer = layersRef.current.hotspot
    if (!layer) return
    const src = layer.getSource(); src.clear()
    const styles: Record<string, Style> = {}
    Object.entries(HOTSPOT_CONF_COLORS).forEach(([k, c]) => {
      styles[k] = new Style({ image: new CircleStyle({ radius: 3.5, fill: new Fill({ color: c }), stroke: new Stroke({ color: 'rgba(0,0,0,0.55)', width: 0.6 }) }) })
    })
    const feats = hotspotPts.map((h: any) => {
      const f = new Feature({ geometry: new Point(fromLonLat([h.lng, h.lat])) })
      f.setStyle(styles[h.confidence] || styles.sedang)
      f.set('popup', `<div class="kh-pop-title">Titik panas (${esc(h.confidence)})</div><div class="kh-pop-sub">${esc(h.provinsi || 'provinsi tidak diketahui')}</div>
        <table class="kh-pop-tbl"><tr><td>Waktu deteksi</td><td>${esc(h.tanggal)} ${esc(h.jam)}</td></tr><tr><td>FRP</td><td>${fmtNum(h.frp, 1)} MW</td></tr>
        <tr><td>Satelit / sumber</td><td>${esc(h.satelit)}${h.sumber && h.sumber !== h.satelit ? ` / ${esc(h.sumber)}` : ''}</td></tr>
        <tr><td>Koordinat</td><td>${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</td></tr></table>
        <div class="kh-pop-note">Satu titik = satu deteksi piksel panas satelit, bukan satu kejadian kebakaran.</div>`)
      return f
    })
    src.addFeatures(feats)
  }, [hotspotPts])

  // ---------- Visibilitas layer ----------
  useEffect(() => {
    Object.entries(layersRef.current).forEach(([k, l]) => l.setVisible(!!visible[k]))
  }, [visible])

  const zoomTo = (k: string) => {
    const map = mapRef.current
    const src = layersRef.current[k]?.getSource()
    if (!map || !src || src.getFeatures().length === 0) return
    const ext = src.getExtent()
    map.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 9, duration: 300 })
  }

  const layerDefs = [
    { key: 'provinsi', label: 'Choropleth provinsi', count: Object.keys(provStats).length, note: geoError ? `Batas provinsi gagal dimuat (${geoError})` : '' },
    { key: 'kabupaten', label: 'Penduduk terdampak per kab/kota', count: kabStats.located, note: kabStats.total && kabStats.located < kabStats.total ? `${kabStats.located}/${kabStats.total} kab/kota berkoordinat${udaraRows.length ? '' : ' (butuh API kualitas_udara_model/LOKASI_PANTAU)'}` : '' },
    { key: 'hotspot', label: 'Titik panas NASA FIRMS', count: hotspotPts.length, note: karhutla?.hotspot?.pagination?.has_more ? `ditampilkan ${fmtNum(hotspotPts.length)} dari ${fmtNum(karhutla.hotspot.pagination.total)}` : '' },
    { key: 'ispu', label: 'Stasiun ISPU KLHK', count: ispuStats.pts.filter((p: any) => p.coord).length, note: ispuStats.approx ? `${ispuStats.approx} stasiun lokasi perkiraan` : '' },
    { key: 'udara', label: 'Kualitas udara model (US AQI)', count: udaraRows.length, note: udaraRows.length ? '' : 'Belum tersedia dari API (tipe kualitas_udara_model)' },
  ]

  const mDef = METRICS.find((x) => x.key === metric)!

  return (
    <div className="relative h-full w-full">
      <style>{`
        .kh-pop{background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 25px rgba(15,23,42,.18);padding:10px 12px;min-width:220px;max-width:320px;font-size:11px;color:#0f172a}
        .kh-pop-title{font-weight:900;font-size:12.5px;line-height:1.2}
        .kh-pop-sub{color:#64748b;font-weight:600;margin:2px 0 6px}
        .kh-pop-tbl{width:100%;border-collapse:collapse}
        .kh-pop-tbl td{padding:2px 0;vertical-align:top;border-bottom:1px dashed #f1f5f9}
        .kh-pop-tbl td:first-child{color:#475569;padding-right:8px}
        .kh-pop-tbl td:last-child{text-align:right;font-weight:700}
        .kh-pop-sec{margin-top:6px;font-weight:800;color:#7c2d12}
        .kh-pop-list{color:#334155}
        .kh-pop-note{margin-top:6px;color:#64748b;font-size:10px;font-style:italic}
      `}</style>
      <div ref={mapEl} className="absolute inset-0" />
      <div ref={popupEl} className={popupHtml ? 'kh-pop' : 'hidden'}>
        <button type="button" className="float-right text-slate-400 hover:text-slate-700" onClick={() => { overlayRef.current?.setPosition(undefined); setPopupHtml('') }} aria-label="Tutup">
          <X className="h-3.5 w-3.5" />
        </button>
        <div dangerouslySetInnerHTML={{ __html: popupHtml }} />
      </div>

      {/* Panel layer & legenda */}
      <div className="absolute top-3 right-3 z-10 w-[290px] max-w-[85%]">
        <button type="button" onClick={() => setPanelOpen(!panelOpen)} className="ml-auto flex items-center gap-1.5 rounded-xl bg-white/95 border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-md">
          <Layers className="h-3.5 w-3.5 text-orange-700" /> Layer &amp; Legenda
        </button>
        {panelOpen && (
          <div className="mt-2 rounded-2xl bg-white/95 border border-slate-200 p-3 shadow-lg space-y-3 max-h-[480px] overflow-y-auto text-[11px]">
            <div className="space-y-1.5">
              {layerDefs.map((l) => (
                <div key={l.key}>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="flex items-center gap-2 font-bold text-slate-800">
                      <input type="checkbox" checked={!!visible[l.key]} onChange={(e) => setVisible((v) => ({ ...v, [l.key]: e.target.checked }))} />
                      {l.label}
                    </span>
                    <button type="button" onClick={() => zoomTo(l.key)} className="text-[10px] font-black text-teal-700 hover:underline">{fmtNum(l.count)}</button>
                  </label>
                  {l.note && <div className="pl-5 text-[10px] text-amber-700">{l.note}</div>}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-2">
              <div className="font-black text-slate-700 mb-1">Indikator choropleth provinsi</div>
              <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold">
                {METRICS.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}
              </select>
              {metric === 'ispu' ? (
                <div className="mt-1.5 space-y-0.5">
                  {legendIspu.map((l: any) => (<div key={l.kategori} className="flex items-center gap-2"><span className="h-3 w-5 rounded" style={{ background: l.hex }} />{l.kategori} ({l.min}{l.max ? `-${l.max}` : '+'})</div>))}
                </div>
              ) : (
                <div className="mt-1.5">
                  <div className="h-2.5 rounded" style={{ background: `linear-gradient(to right, ${RAMP.join(',')})` }} />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>rendah</span><span>{fmtNum(metricMax)} {mDef.unit}</span></div>
                </div>
              )}
            </div>

            {visible.kabupaten && (
              <div className="border-t border-slate-100 pt-2 flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-violet-700 bg-violet-500/40" /> Penduduk terdampak (ukuran = jumlah jiwa)</div>
            )}
            {visible.hotspot && (
              <div className="border-t border-slate-100 pt-2">
                <div className="font-black text-slate-700 mb-1">Titik panas (confidence)</div>
                <div className="flex gap-3">{Object.entries(HOTSPOT_CONF_COLORS).map(([k, c]) => (<span key={k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>))}</div>
              </div>
            )}
            {visible.ispu && (
              <div className="border-t border-slate-100 pt-2">
                <div className="font-black text-slate-700 mb-1">Stasiun ISPU</div>
                <div className="grid grid-cols-2 gap-0.5">
                  {legendIspu.map((l: any) => (<span key={l.kategori} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-slate-900" style={{ background: l.hex }} />{l.kategori}</span>))}
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Tidak ada data</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400 bg-slate-200" />Lokasi perkiraan</span>
                </div>
              </div>
            )}
            {visible.udara && (
              <div className="border-t border-slate-100 pt-2">
                <div className="font-black text-slate-700 mb-1">US AQI (model)</div>
                <div className="grid grid-cols-1 gap-0.5">{legendAqi.map((l: any) => (<span key={l.kategori} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.hex }} />{l.kategori}</span>))}</div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 leading-snug space-y-0.5">
              <div><b>Sumber:</b> {SOURCE_CREDITS.sheet}; {SOURCE_CREDITS.firms}; {SOURCE_CREDITS.openmeteo}; {SOURCE_CREDITS.batas}; peta dasar OpenStreetMap.</div>
              <div><b>Pembaruan:</b> sheet {fmtUpdated(all.updated_at)}; ISPU {all.ispu?.update_text || '-'}; FIRMS {dataDukungUpdated(karhutla?.hotspot)}; model udara {dataDukungUpdated(karhutla?.udara)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
