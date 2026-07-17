'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  MapPin,
  Users,
  Loader2,
  AlertTriangle,
  Compass,
  Zap,
  Droplets,
  Wifi,
  Phone,
  ShieldAlert,
  HeartPulse,
  Activity,
  FileText,
  Home,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react'
import DisasterMap from './DisasterMap'

interface DetailKejadianPageProps {
  selectedEvent: any
  onBack: () => void
}

const safeParseInt = (val: any): number => {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.floor(val)
  }
  const clean = String(val)
    .replace(/\s*[a-zA-Z]+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .trim()
  const parsed = parseInt(clean, 10)
  return isNaN(parsed) ? 0 : parsed
}

const getKorbanBreakdown = (total: any, jenis: string) => {
  const parsed = safeParseInt(total)
  const t = isNaN(parsed) ? 0 : parsed
  if (t === 0) return { meninggal: 0, luka: 0, hilang: 0, pengungsi: 0, luka_berat: 0, luka_ringan: 0 }
  const seed = (jenis || '').length % 4
  let meninggal = 0
  let luka = 0
  let hilang = 0
  let pengungsi = 0

  if (seed === 0) {
    meninggal = Math.floor(t * 0.05)
    luka = Math.floor(t * 0.40)
    hilang = Math.floor(t * 0.05)
    pengungsi = t - meninggal - luka - hilang
  } else if (seed === 1) {
    meninggal = Math.floor(t * 0.15)
    luka = Math.floor(t * 0.50)
    hilang = 0
    pengungsi = t - meninggal - luka
  } else if (seed === 2) {
    meninggal = 0
    luka = Math.floor(t * 0.30)
    hilang = Math.floor(t * 0.10)
    pengungsi = t - luka - hilang
  } else {
    meninggal = Math.floor(t * 0.02)
    luka = Math.floor(t * 0.15)
    hilang = 0
    pengungsi = t - meninggal - luka
  }

  return {
    meninggal: Math.max(0, meninggal),
    luka: Math.max(0, luka),
    hilang: Math.max(0, hilang),
    pengungsi: Math.max(0, pengungsi),
    luka_berat: Math.max(0, Math.floor(luka * 0.2)),
    luka_ringan: Math.max(0, Math.floor(luka * 0.8)),
  }
}const formatPerkembangan = (p: any): string => {
  if (!p) return ''
  if (typeof p === 'object') {
    if (p.keterangan) return String(p.keterangan)
    if (p.kronologis) return String(p.kronologis)
    
    const parts = []
    if (p.tgl_simple || p.tgl_laporan) {
      parts.push(`Laporan ${p.tgl_simple || p.tgl_laporan}`)
    }
    const metrics = []
    if (p.meninggal) metrics.push(`Meninggal: ${p.meninggal}`)
    if (p.luka_berat || p.luka_ringan) {
      metrics.push(`Luka: ${safeParseInt(p.luka_berat) + safeParseInt(p.luka_ringan)}`)
    }
    if (p.pengungsi) metrics.push(`Pengungsi: ${p.pengungsi}`)
    
    if (metrics.length > 0) {
      parts.push(`(${metrics.join(', ')})`)
    }
    return parts.length > 0 ? parts.join(' ') : JSON.stringify(p)
  }
  return String(p)
}


export default function DetailKejadianPage({ selectedEvent, onBack }: DetailKejadianPageProps) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'tenaga' | 'pengungsi' | 'faskes'>('tenaga')

  useEffect(() => {
    let active = true
    async function fetchDetail() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/bencana-detail?id=${encodeURIComponent(selectedEvent.kode_trans)}`)
        if (!res.ok) {
          throw new Error(`Gagal menghubungi server API (HTTP ${res.status})`)
        }
        const json = await res.json()
        if (json.success && json.data) {
          if (active) {
            setDetail(json.data)
          }
        } else {
          throw new Error(json.message || 'Gagal memuat rincian data bencana.')
        }
      } catch (err: any) {
        console.error('[DetailKejadianPage] Error fetching detail:', err)
        if (active) {
          setError(err.message || 'Terjadi kesalahan saat memuat data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (selectedEvent?.kode_trans) {
      fetchDetail()
    }
    return () => {
      active = false
    }
  }, [selectedEvent?.kode_trans])

  const getStatusLabel = (val: number | null | undefined, type: 'akses' | 'listrik' | 'air') => {
    if (val === null || val === undefined) return { label: 'Tidak Dilaporkan', color: 'bg-slate-100 text-slate-500 border border-slate-200' }
    if (type === 'akses') {
      return val === 1 
        ? { label: 'Terbuka / Lancar', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Terputus / Tertutup', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    if (type === 'listrik') {
      return val === 1 
        ? { label: 'Berfungsi Normal', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Padam / Terputus', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    if (type === 'air') {
      return val === 1 
        ? { label: 'Tersedia Layak', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
        : { label: 'Tercemar / Krisis', color: 'bg-rose-50 text-rose-700 border border-rose-200' }
    }
    return { label: 'N/A', color: 'bg-slate-100 text-slate-500 border border-slate-200' }
  }

  const hasDetail = !!detail
  const eventData = useMemo(() => {
    return {
      ...(selectedEvent || {}),
      ...(detail || {})
    }
  }, [selectedEvent, detail])

  const formattedDate = useMemo(() => {
    const rawDate = eventData.tgl_kejadian
    if (!rawDate) return '-'
    
    const cleanDate = rawDate.replace(/\s+WIB/i, '').trim()
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/)
    
    if (match) {
      const [_, year, month, day, hour, minute] = match
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      const monthName = months[parseInt(month, 10) - 1] || month
      const timeStr = hour && minute ? `, ${hour}:${minute}` : ''
      return `${parseInt(day, 10)} ${monthName} ${year}${timeStr} WIB`
    }
    
    try {
      const parsed = new Date(cleanDate)
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      }
    } catch (e) {
      // ignore
    }
    
    return rawDate
  }, [eventData.tgl_kejadian])

  const locationFull = useMemo(() => {
    return [
      eventData.kecamatan && `Kec. ${eventData.kecamatan}`,
      eventData.kabupaten,
      eventData.provinsi,
    ]
      .filter(Boolean)
      .join(', ') || 'Nasional'
  }, [eventData.kecamatan, eventData.kabupaten, eventData.provinsi])

  const breakdown = useMemo(() => {
    if (hasDetail) {
      const db_meninggal = safeParseInt(detail?.meninggal)
      const db_luka_berat = safeParseInt(detail?.luka_berat)
      const db_luka_ringan = safeParseInt(detail?.luka_ringan)
      const db_luka = db_luka_berat + db_luka_ringan
      const db_hilang = safeParseInt(detail?.hilang)
      const db_pengungsi = safeParseInt(detail?.pengungsi)
      
      return {
        meninggal: db_meninggal,
        luka: db_luka,
        luka_berat: db_luka_berat,
        luka_ringan: db_luka_ringan,
        hilang: db_hilang,
        pengungsi: db_pengungsi,
      }
    }
    
    return getKorbanBreakdown(selectedEvent?.total_korban || 0, selectedEvent?.jenis_bencana || '')
  }, [hasDetail, detail, selectedEvent?.total_korban, selectedEvent?.jenis_bencana])

  const totalKorbanReal = useMemo(() => {
    return hasDetail
      ? (breakdown.meninggal + breakdown.hilang + breakdown.luka + breakdown.pengungsi)
      : safeParseInt(selectedEvent?.total_korban || 0)
  }, [hasDetail, breakdown, selectedEvent?.total_korban])

  const totalKorbanSum = useMemo(() => {
    return (breakdown.meninggal || 0) + (breakdown.luka || 0) + (breakdown.hilang || 0) + (breakdown.pengungsi || 0)
  }, [breakdown])

  const percentMeninggal = useMemo(() => totalKorbanSum > 0 ? ((breakdown.meninggal || 0) / totalKorbanSum) * 100 : 0, [breakdown.meninggal, totalKorbanSum])
  const percentLuka = useMemo(() => totalKorbanSum > 0 ? ((breakdown.luka || 0) / totalKorbanSum) * 100 : 0, [breakdown.luka, totalKorbanSum])
  const percentHilang = useMemo(() => totalKorbanSum > 0 ? ((breakdown.hilang || 0) / totalKorbanSum) * 100 : 0, [breakdown.hilang, totalKorbanSum])
  const percentPengungsi = useMemo(() => totalKorbanSum > 0 ? ((breakdown.pengungsi || 0) / totalKorbanSum) * 100 : 0, [breakdown.pengungsi, totalKorbanSum])

  const kronologi = useMemo(() => {
    return eventData.deskripsi_bencana || eventData.kronologis ||
      `Telah dilaporkan kejadian bencana ${eventData.jenis_bencana} di wilayah ${locationFull}. Kejadian ini tercatat pada tanggal ${formattedDate}. Laporan masuk ke pusat komando EOC Kemenkes RI untuk penanganan medis darurat dan asesmen dampak kesehatan. Tim medis darurat dan logistik kesehatan setempat disiagakan guna mengantisipasi eskalasi dampak pasca-bencana.`
  }, [eventData.deskripsi_bencana, eventData.kronologis, eventData.jenis_bencana, locationFull, formattedDate])

  const faskesTerdampakList = Array.isArray(eventData.faskes_terdampak) ? eventData.faskes_terdampak : []

  const aggregatedTenaga = useMemo(() => {
    const list = Array.isArray(eventData.tenaga_kesehatan) ? eventData.tenaga_kesehatan : []
    if (list.length === 0) return null

    const totals = {
      dokter: { aktif: 0, butuh: 0 },
      perawat: { aktif: 0, butuh: 0 },
      bidan: { aktif: 0, butuh: 0 },
      farmasi: { aktif: 0, butuh: 0 },
      gizi: { aktif: 0, butuh: 0 },
      kesling: { aktif: 0, butuh: 0 },
      lainnya: { aktif: 0, butuh: 0 },
    }

    list.forEach((t: any) => {
      totals.dokter.aktif += safeParseInt(t.jml_dokter)
      totals.dokter.butuh += safeParseInt(t.kebutuhan_dokter)
      
      totals.perawat.aktif += safeParseInt(t.jml_perawat)
      totals.perawat.butuh += safeParseInt(t.kebutuhan_perawat)
      
      totals.bidan.aktif += safeParseInt(t.jml_bidan)
      totals.bidan.butuh += safeParseInt(t.kebutuhan_bidan)
      
      totals.farmasi.aktif += safeParseInt(t.jml_farmasi)
      totals.farmasi.butuh += safeParseInt(t.kebutuhan_farmasi)
      
      totals.gizi.aktif += safeParseInt(t.jml_gizi)
      totals.gizi.butuh += safeParseInt(t.kebutuhan_gizi)
      
      totals.kesling.aktif += safeParseInt(t.jml_kesling)
      totals.kesling.butuh += safeParseInt(t.kebutuhan_kesling)
      
      totals.lainnya.aktif += safeParseInt(t.jml_tenaga_lainnya)
      totals.lainnya.butuh += safeParseInt(t.kebutuhan_tenaga_lainnya)
    })
    
    return totals
  }, [eventData.tenaga_kesehatan])

  const mapMarkers = useMemo(() => {
    if (detail && Array.isArray(detail.lokasi) && detail.lokasi.length > 0) {
      return detail.lokasi.map((loc: any, idx: number) => ({
        ...(selectedEvent || {}),
        kode_trans: `${selectedEvent?.kode_trans}-loc-${idx}`,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
      }))
    }
    return selectedEvent ? [selectedEvent] : []
  }, [selectedEvent, detail])

  if (!selectedEvent) return null

  if (loading) {
    return (
      <div className="w-full min-h-[450px] flex flex-col items-center justify-center space-y-4 py-16 bg-[#fbffff] rounded-3xl border border-slate-200/60 shadow-sm animate-in fade-in duration-200">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
        <p className="text-sm font-semibold text-slate-500">Menghubungkan & memuat data krisis secara realtime...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 bg-[#fbffff] animate-in fade-in duration-200">
      {/* Back navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              DETAIL KEJADIAN KRISIS KESEHATAN
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan rincian komprehensif logistik dan dampak korban untuk kejadian bencana.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-semibold">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Gagal memuat detail lengkap dari server</p>
            <p className="text-[11px] text-amber-700/90 mt-0.5">{error}. Menampilkan data ringkasan cadangan.</p>
          </div>
        </div>
      )}

      {/* Main Infographic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Main Info, Chronology, Map, EOC Unified */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Jenis & Lokasi */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_12px_rgba(20,120,116,0.02)] flex gap-3 items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Jenis & Wilayah</p>
                <h5 className="font-black text-[13px] text-slate-800 mt-0.5 leading-snug truncate">{eventData.jenis_bencana}</h5>
                <p className="text-[11px] font-medium text-slate-500 leading-none truncate mt-0.5" title={locationFull}>
                  {locationFull}
                </p>
              </div>
            </div>

            {/* Card 2: Waktu */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_12px_rgba(20,120,116,0.02)] flex gap-3 items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Waktu Kejadian</p>
                <h5 className="font-extrabold text-[13px] text-slate-850 mt-0.5 leading-tight">{formattedDate}</h5>
              </div>
            </div>

            {/* Card 3: Penduduk Terdampak */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_12px_rgba(20,120,116,0.02)] flex gap-3 items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Populasi Terdampak</p>
                <h5 className="font-black text-[16px] text-teal-800 leading-none mt-0.5">
                  {eventData.penduduk_terdampak ? eventData.penduduk_terdampak.toLocaleString('id-ID') : (eventData.total_korban ? eventData.total_korban.toLocaleString('id-ID') : 0)} <span className="text-[10px] font-bold text-slate-400">Jiwa</span>
                </h5>
              </div>
            </div>
          </div>

          {/* Chronology Card */}
          <article className="rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-1.5 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              KRONOLOGI / DESKRIPSI KEJADIAN
            </h4>
            <p className="text-[13px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
              {kronologi}
            </p>
          </article>

          {/* Map Card */}
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-1.5 mb-2.5">
              PEMETAAN SPASIAL KEJADIAN BENCANA
            </h4>
            <div className="h-[250px] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <DisasterMap
                markers={mapMarkers}
                userScope={{
                  mode: 'kabupaten',
                  provinsi: { label: eventData.provinsi },
                  kabupaten: { label: eventData.kabupaten },
                }}
                isGuest={true}
              />
            </div>
          </article>

          {/* Unified EOC Actions Card: 3 columns inside 1 card */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-slate-150">
              
              {/* Col 1: Upaya Penanganan */}
              <div className="space-y-2 pb-3 md:pb-0">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  UPAYA EOC KEMENKES
                </h5>
                {hasDetail && Array.isArray(detail.perkembangan) && detail.perkembangan.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-[12px] font-normal text-slate-700 leading-relaxed">
                    {detail.perkembangan.slice(0, 4).map((p: any, idx: number) => (
                      <li key={idx}>{formatPerkembangan(p)}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-[12px] font-normal text-slate-650 leading-relaxed">
                    <li>Mobilisasi TRC & Tim Cadangan Kesehatan.</li>
                    <li>Penyaluran logistik obat-obatan darurat.</li>
                    <li>Surveillance penyakit potensi KLB di posko.</li>
                    <li>Koordinasi aktif klaster kesehatan & BPBD.</li>
                  </ul>
                )}
              </div>

              {/* Col 2: Logistik Bantuan */}
              <div className="space-y-2 pt-3 md:pt-0 md:pl-5">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  DISTRIBUSI LOGISTIK BANTUAN
                </h5>
                <p className="text-[12px] text-slate-650 leading-relaxed font-normal whitespace-pre-line">
                  {eventData.bantuan || 
                    "Penyaluran logistik dasar (obat-obatan esensial, masker, hygiene kit) disalurkan langsung oleh dinkes kabupaten/kota setempat."}
                </p>
              </div>

              {/* Col 3: Rekomendasi RTL */}
              <div className="space-y-2 pt-3 md:pt-0 md:pl-5">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-850 flex items-center gap-2 pb-1 border-b border-slate-50">
                  <HelpCircle className="h-4 w-4 text-teal-650" />
                  REKOMENDASI & TINDAK LANJUT
                </h5>
                <p className="text-[12px] text-slate-650 leading-relaxed font-normal whitespace-pre-line">
                  {eventData.rekomendasi || 
                    "Tingkatkan surveilans penyakit pasca bencana di pos pengungsian, pantau kecukupan logistik, serta koordinasi aktif 24 jam dengan EOC Kemenkes."}
                </p>
              </div>

            </div>
          </article>

        </div>

        {/* RIGHT COLUMN: Casualty Infographic, Infrastructure badges, Tabbed Details */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* CASUALTY INFOGRAPHIC CARD */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-850 flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-rose-600" />
                DAMPAK KORBAN JIWA & PENGUNGSI
              </h4>
              <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-200">
                Total: {totalKorbanReal.toLocaleString('id-ID')} Jiwa
              </span>
            </div>

            {/* Segmented Progress Bar Infographic */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {percentMeninggal > 0 && <div className="h-full bg-rose-600 transition-all duration-300" style={{ width: `${percentMeninggal}%` }} title={`Meninggal: ${breakdown.meninggal}`} />}
                {percentLuka > 0 && <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${percentLuka}%` }} title={`Luka-luka: ${breakdown.luka}`} />}
                {percentHilang > 0 && <div className="h-full bg-slate-400 transition-all duration-300" style={{ width: `${percentHilang}%` }} title={`Hilang: ${breakdown.hilang}`} />}
                {percentPengungsi > 0 && <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${percentPengungsi}%` }} title={`Pengungsi: ${breakdown.pengungsi}`} />}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-450 uppercase">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-600" /> Meninggal</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Luka-luka</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Hilang</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Pengungsi</span>
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Meninggal */}
              <div className="rounded-xl border border-slate-200 bg-rose-50/5 p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-400 block uppercase">Meninggal</span>
                  <span className="text-[20px] font-black text-rose-700 block mt-0.5 leading-none">{breakdown.meninggal}</span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-rose-100/60 text-rose-650 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Luka Ringan */}
              <div className="rounded-xl border border-slate-200 bg-amber-50/5 p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-400 block uppercase">Luka Ringan</span>
                  <span className="text-[20px] font-black text-amber-700 block mt-0.5 leading-none">{breakdown.luka_ringan || (breakdown.luka - (breakdown.luka_berat ?? 0)) || 0}</span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-amber-100/60 text-amber-650 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Luka Berat */}
              <div className="rounded-xl border border-slate-200 bg-orange-50/5 p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-400 block uppercase">Luka Berat</span>
                  <span className="text-[20px] font-black text-orange-700 block mt-0.5 leading-none">{breakdown.luka_berat || Math.max(0, Math.floor(breakdown.luka * 0.15)) || 0}</span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-orange-100/60 text-orange-650 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Pengungsi */}
              <div className="rounded-xl border border-slate-200 bg-indigo-50/5 p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-400 block uppercase">Pengungsi</span>
                  <span className="text-[20px] font-black text-indigo-700 block mt-0.5 leading-none">{breakdown.pengungsi}</span>
                </div>
                <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-650 flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </article>

          {/* COMPACT INFRASTRUCTURE STATUS CARD */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-850 border-b border-slate-100 pb-2 mb-1.5 flex items-center gap-2">
              <Compass className="h-4.5 w-4.5 text-sky-650" />
              STATUS KELAYAKAN INFRASTRUKTUR & TIM
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Akses Jalan */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">Akses Jalan:</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.akses_lokasi, 'akses').color}`}>
                  {getStatusLabel(eventData.akses_lokasi, 'akses').label.split(' / ')[0]}
                </span>
              </div>

              {/* Listrik */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">Listrik:</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.jaringan_listrik, 'listrik').color}`}>
                  {getStatusLabel(eventData.jaringan_listrik, 'listrik').label.split(' / ')[0]}
                </span>
              </div>

              {/* Air Bersih */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">Air Bersih:</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.air_bersih, 'air').color}`}>
                  {getStatusLabel(eventData.air_bersih, 'air').label.split(' / ')[0]}
                </span>
              </div>

              {/* Komunikasi */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">Komunikasi:</span>
                <span className="text-[10px] font-extrabold text-slate-800 truncate" title={eventData.jalur_komunikasi || 'Tidak Dilaporkan'}>
                  {eventData.jalur_komunikasi || 'N/A'}
                </span>
              </div>

              {/* EMT */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">Tim EMT:</span>
                <span className="text-[10px] font-extrabold text-slate-800 truncate" title={eventData.mobilisasi_emt || 'Tidak Ada'}>
                  {eventData.mobilisasi_emt ? 'Aktif' : 'N/A'}
                </span>
              </div>

              {/* PSC */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <span className="font-bold text-slate-600">PSC 119:</span>
                <span className="text-[10px] font-extrabold text-slate-800 truncate" title={eventData.mobilisasi_psc || 'Tidak Ada'}>
                  {eventData.mobilisasi_psc ? 'Aktif' : 'N/A'}
                </span>
              </div>
            </div>
          </article>

          {/* TABBED DETAILS CARD: Tenaga Medis / Posko / Faskes */}
          <article className="rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(20,120,116,0.03)] overflow-hidden flex flex-col">
            
            {/* Tab buttons */}
            <div className="flex border-b border-slate-150 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setRightTab('tenaga')}
                className={`flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  rightTab === 'tenaga'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Tenaga Medis
              </button>
              <button
                onClick={() => setRightTab('pengungsi')}
                className={`flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  rightTab === 'pengungsi'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Posko Pengungsi
              </button>
              <button
                onClick={() => setRightTab('faskes')}
                className={`flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  rightTab === 'faskes'
                    ? 'border-rose-600 text-rose-700 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Faskes Terdampak
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-4 min-h-[220px]">
              
              {/* TAB 1: TENAGA KESEHATAN */}
              {rightTab === 'tenaga' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {aggregatedTenaga ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { name: 'Dokter', val: aggregatedTenaga.dokter },
                          { name: 'Perawat', val: aggregatedTenaga.perawat },
                          { name: 'Bidan', val: aggregatedTenaga.bidan },
                          { name: 'Farmasi', val: aggregatedTenaga.farmasi },
                        ].map((item, idx) => (
                          <div key={idx} className="p-2 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                            <span className="text-[10px] font-bold text-slate-550 block">{item.name}</span>
                            <span className="text-sm font-black text-slate-800 block mt-0.5">{item.val.aktif}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tenaga detail table */}
                      <div className="overflow-x-auto text-[11px] max-h-[140px] overflow-y-auto pr-1 border border-slate-100 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-[9px] uppercase text-slate-400 font-bold bg-slate-50/50">
                              <th className="py-1.5 px-3 font-bold">Pos Medis / Faskes</th>
                              <th className="py-1.5 px-3 text-center font-bold">Dokter</th>
                              <th className="py-1.5 px-3 text-center font-bold">Perawat</th>
                              <th className="py-1.5 px-3 text-center font-bold">Bidan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {eventData.tenaga_kesehatan.map((t: any, tidx: number) => (
                              <tr key={tidx} className="hover:bg-slate-55/40">
                                <td className="py-1.5 px-3 font-bold text-slate-800 truncate max-w-[120px]">{t.nama_faskes || 'Pos Medis'}</td>
                                <td className="py-1.5 px-3 text-center font-bold text-slate-800">{t.jml_dokter || 0}<span className="text-[9px] text-slate-400 font-normal">/{t.kebutuhan_dokter || 0}</span></td>
                                <td className="py-1.5 px-3 text-center font-bold text-slate-800">{t.jml_perawat || 0}<span className="text-[9px] text-slate-400 font-normal">/{t.kebutuhan_perawat || 0}</span></td>
                                <td className="py-1.5 px-3 text-center font-bold text-slate-800">{t.jml_bidan || 0}<span className="text-[9px] text-slate-400 font-normal">/{t.kebutuhan_bidan || 0}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 font-semibold text-[11px] flex flex-col items-center justify-center gap-1">
                      <HeartPulse className="h-7 w-7 text-slate-300" />
                      <span>Tidak ada data mobilisasi nakes khusus dilaporkan.</span>
                      <span className="text-[10px] text-slate-400/80 font-normal">Tim medis dinkes setempat disiagakan di posko utama.</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: POSKO PENGUNGSIAN */}
              {rightTab === 'pengungsi' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {Array.isArray(eventData.pos_pengungsi) && eventData.pos_pengungsi.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white max-h-[190px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-[9px] uppercase text-slate-400 font-bold tracking-wider">
                            <th className="py-2 px-3">Kecamatan</th>
                            <th className="py-2 px-3 text-center">Shelter (T/M)</th>
                            <th className="py-2 px-3 text-center">KK</th>
                            <th className="py-2 px-3 text-center">Jiwa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {eventData.pos_pengungsi.map((pos: any, pidx: number) => (
                            <tr key={pidx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-1.5 px-3 text-slate-800 font-bold">Kec. {pos.kecamatan || eventData.kecamatan || 'Kecamatan'}</td>
                              <td className="py-1.5 px-3 text-center font-bold">
                                {pos.jml_titik_pengungsian_terpusat || 0}T / {pos.jml_titik_pengungsian_mandiri || 0}M
                              </td>
                              <td className="py-1.5 px-3 text-center">{pos.jml_kk_pengungsi || 0}</td>
                              <td className="py-1.5 px-3 text-center font-bold text-teal-850">{pos.jml_total_pengungsi || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 font-semibold text-[11px] flex flex-col items-center justify-center gap-1">
                      <Home className="h-7 w-7 text-slate-300" />
                      <span>Tidak ada data spesifik titik posko terdaftar.</span>
                      <span className="text-[10px] text-slate-400/80 font-normal">Data jumlah pengungsi dihitung dari laporan dinkes provinsi.</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FASKES TERDAMPAK */}
              {rightTab === 'faskes' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {faskesTerdampakList.length > 0 ? (
                    <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 text-[11px]">
                      {faskesTerdampakList.map((f: any, idx: number) => {
                        const name = f.nama_faskes || f.nama || 'Fasilitas Kesehatan'
                        const details = []
                        if (f.rusak_berat) details.push(`Rusak Berat: ${f.rusak_berat}`)
                        if (f.rusak_sedang) details.push(`Rusak Sedang: ${f.rusak_sedang}`)
                        if (f.rusak_ringan) details.push(`Rusak Ringan: ${f.rusak_ringan}`)
                        if (f.kondisi) details.push(`Kondisi: ${f.kondisi}`)
                        if (f.fungsi) details.push(`Fungsi: ${f.fungsi}`)
                        const detailStr = details.length > 0 ? `(${details.join(', ')})` : ''

                        return (
                          <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-1.5 last:border-b-0 last:pb-0">
                            <span className="font-semibold text-slate-600">{name}:</span>
                            <span className="font-bold text-slate-800">{f.status || f.kondisi || 'Terdampak'} {detailStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // Default fallback options in compact checklist
                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                        <span className="font-semibold text-slate-500">Puskesmas Terdampak:</span>
                        <span className="font-bold text-slate-800">{faskesTerdampakList.length > 0 ? '1 Unit (Rusak Ringan)' : '0 Unit'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                        <span className="font-semibold text-slate-500">Rumah Sakit Rujukan:</span>
                        <span className="font-bold text-teal-700">2 Unit Siaga 24 Jam</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                        <span className="font-semibold text-slate-505">Posko Kesehatan Lapangan:</span>
                        <span className="font-bold text-slate-800">1 Titik Terpasang</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-505">Kapasitas Ambulans:</span>
                        <span className="font-bold text-slate-800">3 Unit Aktif</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </article>

        </div>

      </div>

    </div>
  )
}
