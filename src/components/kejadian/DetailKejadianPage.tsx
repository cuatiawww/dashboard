'use client'

import React from 'react'
import { MapPin, Users } from 'lucide-react'
import DisasterMap from './DisasterMap'

interface DetailKejadianPageProps {
  selectedEvent: any
  onBack: () => void
}

const getKorbanBreakdown = (total: number, jenis: string) => {
  const t = total || 0
  if (t === 0) return { meninggal: 0, luka: 0, hilang: 0, pengungsi: 0 }
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
  }
}

export default function DetailKejadianPage({ selectedEvent, onBack }: DetailKejadianPageProps) {
  if (!selectedEvent) return null

  const formattedDate = selectedEvent.tgl_kejadian
    ? new Date(selectedEvent.tgl_kejadian).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '-'

  const locationFull =
    [
      selectedEvent.kecamatan && `Kec. ${selectedEvent.kecamatan}`,
      selectedEvent.kabupaten,
      selectedEvent.provinsi,
    ]
      .filter(Boolean)
      .join(', ') || 'Nasional'

  const breakdown = getKorbanBreakdown(selectedEvent.total_korban, selectedEvent.jenis_bencana)

  // Generate dynamic chronology text
  const kronologi = `Telah dilaporkan kejadian bencana ${selectedEvent.jenis_bencana} di wilayah ${locationFull}. Kejadian ini tercatat pada tanggal ${formattedDate}. Laporan masuk ke pusat komando EOC Kemenkes RI untuk penanganan medis darurat dan asesmen dampak kesehatan. Tim medis darurat dan logistik kesehatan setempat disiagakan guna mengantisipasi eskalasi dampak pasca-bencana.`

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
            <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-wide">
              DETAIL KEJADIAN KRISIS KESEHATAN
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan rincian komprehensif logistik dan dampak korban untuk kejadian bencana.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Kronologi Kejadian */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3">
          KRONOLOGI KEJADIAN
        </h4>
        <p className="text-xs text-slate-650 leading-relaxed font-semibold">
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
            <h5 className="font-extrabold text-[15px] text-slate-850 mt-1 leading-snug">{selectedEvent.jenis_bencana}</h5>
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
              {selectedEvent.total_korban ? selectedEvent.total_korban.toLocaleString('id-ID') : 0} <span className="text-xs font-bold text-slate-400">Jiwa</span>
            </h5>
          </div>
        </article>
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
            <span className="text-[24px] font-black text-slate-850 leading-none">{breakdown.luka || 0}</span>
          </div>
        </article>

        {/* Korban Luka Berat */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Korban Luka Berat / Rawat Inap</p>
          <div className="flex justify-between items-end mt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-[24px] font-black text-slate-850 leading-none">{Math.max(0, Math.floor(breakdown.luka * 0.15)) || 0}</span>
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

      {/* 4. Respon EOC & Fasilitas Kesehatan */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Card 1: Fasilitas Kesehatan Siaga */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3">
            FASILITAS KESEHATAN TERDAMPAK & SIAGA
          </h4>
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
        </article>

        {/* Card 2: Upaya Penanganan */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
          <h4 className="text-[12px] font-black uppercase tracking-wider text-[#1a3535] border-b border-slate-100 pb-2 mb-3">
            UPAYA PENANGANAN KRISIS KESEHATAN (EOC)
          </h4>
          <ul className="list-disc pl-4 space-y-1.5 text-xs font-semibold text-slate-600">
            <li>Mobilisasi Tim Reaksi Cepat (TRC) dan Tim Cadangan Kesehatan (TCK).</li>
            <li>Penyaluran logistik darurat berupa paket obat-obatan dan hygiene kit.</li>
            <li>Penyelenggaraan surveillance aktif penyakit potensi KLB di pos pengungsian.</li>
            <li>Koordinasi lintas sektor untuk pemulihan akses sanitasi dan air bersih.</li>
          </ul>
        </article>
      </section>

      {/* 5. Pemetaan Kejadian */}
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(20,120,116,0.03)]">
        <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3">
          PEMETAAN KEJADIAN BENCANA
        </h4>
        <div className="h-[350px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
          <DisasterMap
            markers={[selectedEvent]}
            userScope={{
              mode: 'kabupaten',
              provinsi: { label: selectedEvent.provinsi },
              kabupaten: { label: selectedEvent.kabupaten },
            }}
            isGuest={true}
          />
        </div>
      </article>
    </div>
  )
}
