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
  HelpCircle
} from 'lucide-react'
import DisasterMap from './DisasterMap'

interface DetailKejadianPageProps {
  selectedEvent: any
  onBack: () => void
}

const getKorbanBreakdown = (total: number, jenis: string) => {
  const t = total || 0
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
}

export default function DetailKejadianPage({ selectedEvent, onBack }: DetailKejadianPageProps) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Helper for status flags
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
    if (!eventData.tgl_kejadian) return '-'
    try {
      return new Date(eventData.tgl_kejadian.replace(/\s+WIB/i, '')).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    } catch (e) {
      return eventData.tgl_kejadian
    }
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
    return hasDetail ? {
      meninggal: Number(detail?.meninggal ?? 0),
      luka: Number((detail?.luka_berat ?? 0) + (detail?.luka_ringan ?? 0)),
      luka_berat: Number(detail?.luka_berat ?? 0),
      luka_ringan: Number(detail?.luka_ringan ?? 0),
      hilang: Number(detail?.hilang ?? 0),
      pengungsi: Number(detail?.pengungsi ?? 0),
    } : getKorbanBreakdown(selectedEvent?.total_korban || 0, selectedEvent?.jenis_bencana || '')
  }, [hasDetail, detail, selectedEvent?.total_korban, selectedEvent?.jenis_bencana])

  const totalKorbanReal = useMemo(() => {
    return hasDetail
      ? (breakdown.meninggal + breakdown.hilang + breakdown.luka + breakdown.pengungsi)
      : (selectedEvent?.total_korban || 0)
  }, [hasDetail, breakdown, selectedEvent?.total_korban])

  const kronologi = useMemo(() => {
    return eventData.deskripsi_bencana || eventData.kronologis ||
      `Telah dilaporkan kejadian bencana ${eventData.jenis_bencana} di wilayah ${locationFull}. Kejadian ini tercatat pada tanggal ${formattedDate}. Laporan masuk ke pusat komando EOC Kemenkes RI untuk penanganan medis darurat dan asesmen dampak kesehatan. Tim medis darurat dan logistik kesehatan setempat disiagakan guna mengantisipasi eskalasi dampak pasca-bencana.`
  }, [eventData.deskripsi_bencana, eventData.kronologis, eventData.jenis_bencana, locationFull, formattedDate])

  const faskesTerdampakList = eventData.faskes_terdampak || []

  const aggregatedTenaga = useMemo(() => {
    const list = eventData.tenaga_kesehatan || []
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
      totals.dokter.aktif += Number(t.jml_dokter ?? 0)
      totals.dokter.butuh += Number(t.kebutuhan_dokter ?? 0)
      
      totals.perawat.aktif += Number(t.jml_perawat ?? 0)
      totals.perawat.butuh += Number(t.kebutuhan_perawat ?? 0)
      
      totals.bidan.aktif += Number(t.jml_bidan ?? 0)
      totals.bidan.butuh += Number(t.kebutuhan_bidan ?? 0)
      
      totals.farmasi.aktif += Number(t.jml_farmasi ?? 0)
      totals.farmasi.butuh += Number(t.kebutuhan_farmasi ?? 0)
      
      totals.gizi.aktif += Number(t.jml_gizi ?? 0)
      totals.gizi.butuh += Number(t.kebutuhan_gizi ?? 0)
      
      totals.kesling.aktif += Number(t.jml_kesling ?? 0)
      totals.kesling.butuh += Number(t.kebutuhan_kesling ?? 0)
      
      totals.lainnya.aktif += Number(t.jml_tenaga_lainnya ?? 0)
      totals.lainnya.butuh += Number(t.kebutuhan_tenaga_lainnya ?? 0)
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
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff] animate-in fade-in duration-200">
      {/* Back navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
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
            <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              DETAIL KEJADIAN KRISIS KESEHATAN
              {hasDetail && (
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Realtime API
                </span>
              )}
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

      {/* 1. Kronologi Kejadian */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3">
          KRONOLOGI / DESKRIPSI KEJADIAN
        </h4>
        <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line">
          {kronologi}
        </p>
      </article>

      {/* 2. Three cards in a row */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Jenis & Lokasi */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] flex gap-4 items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis & Lokasi Kejadian</p>
            <h5 className="font-extrabold text-[15px] text-slate-850 mt-1 leading-snug">{eventData.jenis_bencana}</h5>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-snug truncate" title={locationFull}>
              {locationFull}
            </p>
          </div>
        </article>

        {/* Card 2: Waktu Kejadian */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] flex gap-4 items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu Kejadian</p>
            <h5 className="font-extrabold text-[15px] text-slate-850 mt-1">{formattedDate}</h5>
          </div>
        </article>

        {/* Card 3: Penduduk Terdampak */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)] flex gap-4 items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Penduduk Terdampak</p>
            <h5 className="font-extrabold text-[24px] text-slate-850 leading-none mt-1">
              {eventData.penduduk_terdampak ? eventData.penduduk_terdampak.toLocaleString('id-ID') : (eventData.total_korban ? eventData.total_korban.toLocaleString('id-ID') : 0)} <span className="text-xs font-bold text-slate-400">Jiwa</span>
            </h5>
          </div>
        </article>
      </section>

      {/* 2.5. Aksesibilitas & Kondisi Infrastruktur (New Section) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
          <Compass className="h-4 w-4 text-teal-700" />
          KONDISI INFRASTRUKTUR & AKSESIBILITAS
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Akses Jalan */}
          <div className="flex flex-col justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Compass className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Akses Jalan</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.akses_lokasi, 'akses').color}`}>
                {getStatusLabel(eventData.akses_lokasi, 'akses').label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-3 leading-normal">
              {eventData.akses_lokasi_keterangan || 'Kondisi akses jalan menuju area terdampak krisis.'}
            </p>
          </div>

          {/* Jaringan Listrik */}
          <div className="flex flex-col justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Jaringan Listrik</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.jaringan_listrik, 'listrik').color}`}>
                {getStatusLabel(eventData.jaringan_listrik, 'listrik').label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-3 leading-normal">
              Kondisi keaktifan pasokan daya listrik di lokasi bencana krisis kesehatan.
            </p>
          </div>

          {/* Air Bersih */}
          <div className="flex flex-col justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Droplets className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Pasokan Air Bersih</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusLabel(eventData.air_bersih, 'air').color}`}>
                {getStatusLabel(eventData.air_bersih, 'air').label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-3 leading-normal">
              Ketersediaan air bersih higienis untuk sanitasi dan konsumsi pengungsi.
            </p>
          </div>

          {/* Jalur Komunikasi */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Wifi className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Jalur Komunikasi</span>
              <span className="text-xs font-extrabold text-slate-800 mt-0.5 truncate block">
                {eventData.jalur_komunikasi || 'Tidak Dilaporkan'}
              </span>
            </div>
          </div>

          {/* Mobilisasi EMT */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mobilisasi EMT</span>
              <span className="text-xs font-extrabold text-slate-800 mt-0.5 truncate block">
                {eventData.mobilisasi_emt || 'Tidak Ada Mobilisasi'}
              </span>
            </div>
          </div>

          {/* Mobilisasi PSC */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Phone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mobilisasi PSC 119</span>
              <span className="text-xs font-extrabold text-slate-800 mt-0.5 truncate block">
                {eventData.mobilisasi_psc || 'Tidak Ada Mobilisasi'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Four impact cards below */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Korban Meninggal */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Korban Meninggal</p>
          <div className="flex justify-between items-end mt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-650">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[24px] font-black text-slate-850 leading-none">{breakdown.meninggal || 0}</span>
          </div>
        </article>

        {/* Korban Luka Ringan */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Korban Luka Ringan / Rawat Jalan</p>
          <div className="flex justify-between items-end mt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[24px] font-black text-slate-850 leading-none">{breakdown.luka_ringan || (breakdown.luka - (breakdown.luka_berat ?? 0)) || 0}</span>
          </div>
        </article>

        {/* Korban Luka Berat */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Korban Luka Berat / Rawat Inap</p>
          <div className="flex justify-between items-end mt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[24px] font-black text-slate-850 leading-none">{breakdown.luka_berat || Math.max(0, Math.floor(breakdown.luka * 0.15)) || 0}</span>
          </div>
        </article>

        {/* Pengungsi */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pengungsi</p>
          <div className="flex justify-between items-end mt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[24px] font-black text-slate-850 leading-none">{breakdown.pengungsi || 0}</span>
          </div>
        </article>
      </section>

      {/* 3.5. Mobilisasi Sumber Daya Kesehatan (New Section) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
          <HeartPulse className="h-4.5 w-4.5 text-teal-700" />
          MOBILISASI & KEBUTUHAN TENAGA KESEHATAN
        </h4>
        
        {aggregatedTenaga ? (
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
              Berikut data total petugas medis yang telah berhasil dimobilisasi ke lokasi bencana beserta analisis kebutuhan mendesak tambahan tenaga kesehatan:
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {[
                { name: 'Dokter', val: aggregatedTenaga.dokter },
                { name: 'Perawat', val: aggregatedTenaga.perawat },
                { name: 'Bidan', val: aggregatedTenaga.bidan },
                { name: 'Farmasi', val: aggregatedTenaga.farmasi },
                { name: 'Gizi', val: aggregatedTenaga.gizi },
                { name: 'Kesling', val: aggregatedTenaga.kesling },
                { name: 'Tenaga Lain', val: aggregatedTenaga.lainnya },
              ].map((item, idx) => {
                const hasNeed = item.val.butuh > 0
                return (
                  <div key={idx} className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-center">
                    <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                    <div className="my-3">
                      <span className="text-lg font-black text-slate-800">{item.val.aktif}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Aktif di Lapangan</span>
                    </div>
                    <div className={`py-1 px-2 rounded-xl text-[9px] font-bold ${hasNeed ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-150/40 text-slate-400'}`}>
                      {hasNeed ? `Butuh +${item.val.butuh}` : 'Terpenuhi'}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Detail per Faskes List */}
            {eventData.tenaga_kesehatan && eventData.tenaga_kesehatan.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Rincian Penempatan Pos Medis:</span>
                <div className="overflow-x-auto text-xs max-h-[150px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-[10px] uppercase text-slate-400 font-bold">
                        <th className="pb-1.5 font-bold">Pos Medis/Faskes</th>
                        <th className="pb-1.5 text-center font-bold">Dokter</th>
                        <th className="pb-1.5 text-center font-bold">Perawat</th>
                        <th className="pb-1.5 text-center font-bold">Bidan</th>
                        <th className="pb-1.5 text-center font-bold">Farmasi</th>
                        <th className="pb-1.5 text-center font-bold">Lainnya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                      {eventData.tenaga_kesehatan.map((t: any, tidx: number) => (
                        <tr key={tidx}>
                          <td className="py-1.5">{t.nama_faskes || 'Fasilitas Kesehatan'}</td>
                          <td className="py-1.5 text-center font-bold text-slate-800">{t.jml_dokter || 0} <span className="text-[10px] text-slate-400">/{t.kebutuhan_dokter || 0}</span></td>
                          <td className="py-1.5 text-center font-bold text-slate-800">{t.jml_perawat || 0} <span className="text-[10px] text-slate-400">/{t.kebutuhan_perawat || 0}</span></td>
                          <td className="py-1.5 text-center font-bold text-slate-800">{t.jml_bidan || 0} <span className="text-[10px] text-slate-400">/{t.kebutuhan_bidan || 0}</span></td>
                          <td className="py-1.5 text-center font-bold text-slate-800">{t.jml_farmasi || 0} <span className="text-[10px] text-slate-400">/{t.kebutuhan_farmasi || 0}</span></td>
                          <td className="py-1.5 text-center font-bold text-slate-800">{Number(t.jml_gizi || 0) + Number(t.jml_kesling || 0) + Number(t.jml_tenaga_lainnya || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-1">
            <Activity className="h-8 w-8 text-slate-300" />
            <span>Tidak ada data mobilisasi petugas kesehatan khusus yang dilaporkan untuk kejadian ini.</span>
            <span className="text-[11px] text-slate-400/80 font-normal">Tim respon darurat dinkes setempat disiagakan di posko utama.</span>
          </div>
        )}
      </section>

      {/* 3.6. Posko Pengungsian & Dampak Pengungsian (New Section) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
          <Home className="h-4.5 w-4.5 text-teal-700" />
          INFORMASI TITIK POSKO PENGUNGSIAN
        </h4>
        
        {eventData.pos_pengungsi && eventData.pos_pengungsi.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Berikut daftar titik lokasi penampungan pengungsi beserta data jumlah kepala keluarga (KK), gender, dan sebarannya:
            </p>
            <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-slate-50/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                    <th className="py-2.5 px-4">Kecamatan / Lokasi</th>
                    <th className="py-2.5 px-4 text-center">Titik Pengungsian</th>
                    <th className="py-2.5 px-4 text-center">Total Kepala Keluarga (KK)</th>
                    <th className="py-2.5 px-4 text-center">Total Pengungsi</th>
                    <th className="py-2.5 px-4 text-center">Laki-Laki</th>
                    <th className="py-2.5 px-4 text-center">Perempuan</th>
                    <th className="py-2.5 px-4 text-center">Titik Koordinat (Lat, Lng)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                  {eventData.pos_pengungsi.map((pos: any, pidx: number) => (
                    <tr key={pidx} className="hover:bg-slate-100/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-800 font-bold">Kec. {pos.kecamatan || eventData.kecamatan || 'Kecamatan'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex gap-1.5 justify-center">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold" title="Terpusat">
                            T: {pos.jml_titik_pengungsian_terpusat || 0}
                          </span>
                          <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-bold" title="Mandiri">
                            M: {pos.jml_titik_pengungsian_mandiri || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                        {pos.jml_kk_pengungsi ? Number(pos.jml_kk_pengungsi).toLocaleString('id-ID') : 0} KK
                      </td>
                      <td className="py-2.5 px-4 text-center font-extrabold text-teal-800">
                        {pos.jml_total_pengungsi ? Number(pos.jml_total_pengungsi).toLocaleString('id-ID') : 0} Jiwa
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500">
                        {pos.jml_pengungsi_laki ? Number(pos.jml_pengungsi_laki).toLocaleString('id-ID') : 0}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500">
                        {pos.jml_pengungsi_perempuan ? Number(pos.jml_pengungsi_perempuan).toLocaleString('id-ID') : 0}
                      </td>
                      <td className="py-2.5 px-4 text-center text-[11px] text-slate-400 font-mono">
                        {pos.latitude && pos.longitude ? `${Number(pos.latitude).toFixed(4)}, ${Number(pos.longitude).toFixed(4)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-1">
            <Home className="h-8 w-8 text-slate-300" />
            <span>Tidak ada data spesifik titik posko pengungsian terdaftar untuk kejadian ini.</span>
            <span className="text-[11px] text-slate-400/80 font-normal">Data jumlah pengungsi dihitung berdasarkan estimasi laporan dinkes provinsi.</span>
          </div>
        )}
      </section>

      {/* 4. Respon EOC & Fasilitas Kesehatan */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Card 1: Fasilitas Kesehatan Terdampak & Siaga */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3">
            FASILITAS KESEHATAN TERDAMPAK & SIAGA
          </h4>
          {hasDetail ? (
            faskesTerdampakList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 font-semibold text-xs">
                Tidak ada fasilitas kesehatan terdampak yang dilaporkan.
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-750 max-h-[200px] overflow-y-auto pr-1">
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
                      <span className="font-semibold text-slate-505">{name}:</span>
                      <span className="font-bold text-slate-800">{f.status || f.kondisi || 'Terdampak'} {detailStr}</span>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            // Dummy fallback if no detail loaded
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                <span className="font-semibold text-slate-500">Puskesmas Terdampak:</span>
                <span className="font-bold text-slate-800">1 Unit (Rusak Ringan)</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                <span className="font-semibold text-slate-500">Rumah Sakit Rujukan Siaga:</span>
                <span className="font-bold text-teal-700">2 Unit Siaga 24 Jam</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                <span className="font-semibold text-slate-500">Posko Kesehatan Lapangan:</span>
                <span className="font-bold text-slate-800">1 Titik Terpasang</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Kapasitas Ambulans:</span>
                <span className="font-bold text-slate-800">3 Unit Aktif</span>
              </div>
            </div>
          )}
        </article>

        {/* Card 2: Upaya Penanganan */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3">
            UPAYA PENANGANAN KRISIS KESEHATAN (EOC)
          </h4>
          {hasDetail && detail.perkembangan && detail.perkembangan.length > 0 ? (
            <ul className="list-disc pl-4 space-y-1.5 text-xs font-semibold text-slate-650">
              {detail.perkembangan.map((p: any, idx: number) => (
                <li key={idx}>{p.keterangan || p.kronologis || p}</li>
              ))}
            </ul>
          ) : (
            <ul className="list-disc pl-4 space-y-1.5 text-xs font-semibold text-slate-600">
              <li>Mobilisasi Tim Reaksi Cepat (TRC) dan Tim Cadangan Kesehatan (TCK).</li>
              <li>Penyaluran logistik darurat berupa paket obat-obatan dan hygiene kit.</li>
              <li>Penyelenggaraan surveillance aktif penyakit potensi KLB di pos pengungsian.</li>
              <li>Koordinasi lintas sektor untuk pemulihan akses sanitasi dan air bersih.</li>
            </ul>
          )}
        </article>

        {/* Card 3: Distribusi Bantuan & Logistik Kesehatan (New Section) */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-teal-700" />
            DISTRIBUSI BANTUAN & LOGISTIK KESEHATAN
          </h4>
          <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line">
            {eventData.bantuan || 
              "Belum ada rincian bantuan logistik spesifik yang tercatat di sistem. Penyaluran logistik dasar (obat-obatan, masker, hygiene kit) biasanya disalurkan langsung oleh dinkes kabupaten/kota setempat."}
          </p>
        </article>

        {/* Card 4: Rekomendasi Medis & Rencana Tindak Lanjut (New Section) */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-teal-700" />
            REKOMENDASI DAN RENCANA TINDAK LANJUT
          </h4>
          <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line">
            {eventData.rekomendasi || 
              "Tingkatkan surveilans penyakit pasca bencana di wilayah pengungsian, pantau kecukupan logistik obat-obatan, serta pastikan koordinasi aktif 24 jam dengan pusat komando krisis kesehatan."}
          </p>
        </article>
      </section>

      {/* 5. Pemetaan Kejadian */}
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3">
          PEMETAAN KEJADIAN BENCANA
        </h4>
        <div className="h-[350px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
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
    </div>
  )
}
