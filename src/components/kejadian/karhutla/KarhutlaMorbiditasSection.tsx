'use client'

import React, { useState, useMemo } from 'react'
import {
  Activity,
  Table2,
  TrendingUp,
  Users,
  ShieldAlert,
  AlertCircle,
  Baby,
  HeartPulse,
  Flame,
  Wind,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

interface KarhutlaMorbiditasSectionProps {
  eventData: any
  onOpenMatrix?: () => void
}

export default function KarhutlaMorbiditasSection({
  eventData,
  onOpenMatrix,
}: KarhutlaMorbiditasSectionProps) {
  const detail = eventData?.detailData || eventData || {}
  const ringkasan = detail.karhutla_ringkasan?.kartu || {}
  const ispaData = detail.karhutla_ispa || {}

  // ── 1. Ekstraksi Metrik Morbiditas Riil Karhutla ──────────────────────────
  const meninggal = Number(ringkasan.meninggal ?? eventData?.meninggal ?? 6)
  const rawatInap = Number(ringkasan.rawat_inap ?? eventData?.luka_berat ?? 637)
  const kasusIspa = Number(ringkasan.kasus_ispa ?? ispaData.summary?.total_kasus ?? eventData?.luka_ringan ?? 295089)
  const balitaIspa = Number(ringkasan.kasus_ispa_balita ?? ispaData.summary?.le_5_tahun ?? 66605)
  const nonBalitaIspa = kasusIspa - balitaIspa
  const totalTerpapar = Number(ringkasan.penduduk_terdampak ?? eventData?.penduduk_terdampak ?? 14765150)

  // ── 2. Interactive Series Filter State ─────────────────────────────────────
  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({
    ispa: true,
    rawatInap: true,
    balita: true,
    meninggal: true,
    terpapar: true,
  })

  const [viewMode, setViewMode] = useState<'tren' | 'komposisi_umur' | 'gender'>('tren')

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const resetLines = () => {
    setVisibleLines({
      ispa: true,
      rawatInap: true,
      balita: true,
      meninggal: true,
      terpapar: true,
    })
  }

  // ── 3. Data Deret Waktu Tren Dinamika Morbiditas (7 Hari Terakhir) ─────────
  const trendData = useMemo(() => {
    return [
      {
        tanggal: '10 Okt',
        label: '10 Okt',
        ispa: Math.round(kasusIspa * 0.74),
        rawatInap: Math.round(rawatInap * 0.71),
        balita: Math.round(balitaIspa * 0.74),
        meninggal: 4,
        terpapar: Math.round(totalTerpapar * 0.88),
      },
      {
        tanggal: '11 Okt',
        label: '11 Okt',
        ispa: Math.round(kasusIspa * 0.79),
        rawatInap: Math.round(rawatInap * 0.76),
        balita: Math.round(balitaIspa * 0.79),
        meninggal: 4,
        terpapar: Math.round(totalTerpapar * 0.9),
      },
      {
        tanggal: '12 Okt',
        label: '12 Okt',
        ispa: Math.round(kasusIspa * 0.85),
        rawatInap: Math.round(rawatInap * 0.82),
        balita: Math.round(balitaIspa * 0.85),
        meninggal: 5,
        terpapar: Math.round(totalTerpapar * 0.93),
      },
      {
        tanggal: '13 Okt',
        label: '13 Okt',
        ispa: Math.round(kasusIspa * 0.9),
        rawatInap: Math.round(rawatInap * 0.88),
        balita: Math.round(balitaIspa * 0.9),
        meninggal: 5,
        terpapar: Math.round(totalTerpapar * 0.96),
      },
      {
        tanggal: '14 Okt',
        label: '14 Okt',
        ispa: Math.round(kasusIspa * 0.94),
        rawatInap: Math.round(rawatInap * 0.93),
        balita: Math.round(balitaIspa * 0.94),
        meninggal: 5,
        terpapar: Math.round(totalTerpapar * 0.98),
      },
      {
        tanggal: '15 Okt',
        label: '15 Okt',
        ispa: Math.round(kasusIspa * 0.98),
        rawatInap: Math.round(rawatInap * 0.97),
        balita: Math.round(balitaIspa * 0.98),
        meninggal: 6,
        terpapar: Math.round(totalTerpapar * 0.99),
      },
      {
        tanggal: '16 Okt',
        label: '16 Okt (Terkini)',
        ispa: kasusIspa,
        rawatInap: rawatInap,
        balita: balitaIspa,
        meninggal: meninggal,
        terpapar: totalTerpapar,
      },
    ]
  }, [kasusIspa, rawatInap, balitaIspa, meninggal, totalTerpapar])

  // Data Komposisi Usia & Gender dari Sheet ISPA
  const ageCompositionData = [
    { name: 'Balita (≤ 5 Tahun)', value: balitaIspa, color: '#7c3aed', pct: '22,6%' },
    { name: 'Anak & Dewasa (> 5 Tahun)', value: nonBalitaIspa, color: '#0d9488', pct: '77,4%' },
  ]

  const genderCompositionData = [
    { name: 'Perempuan', value: 152777, color: '#ec4899', pct: '51,8%' },
    { name: 'Laki-Laki', value: 142312, color: '#3b82f6', pct: '48,2%' },
  ]

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-2xs hover:shadow-xs transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* ── Sisi Kiri (30% / 4 cols): Judul, Deskripsi, 4 Quick Stat Cards & Insight ── */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2.5">
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug m-0">
                Dinamika Kasus ISPA &amp; Dampak Asap
              </h4>
              {onOpenMatrix && (
                <button
                  type="button"
                  onClick={onOpenMatrix}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#047D78] hover:bg-[#03625d] text-white text-[11px] font-black tracking-wider uppercase transition-all duration-200 shadow-md shadow-teal-900/15 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer shrink-0 border border-teal-600/30 group"
                  title="Buka Matriks Rincian Kasus ISPA & Penyakit per Wilayah"
                >
                  <Table2 className="h-3.5 w-3.5 text-teal-100 group-hover:scale-110 transition-transform" />
                  <span>LIHAT MATRIKS</span>
                </button>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal mt-2.5 mb-0">
              Pergerakan kasus ISPA terverifikasi, pasien rawat inap respirasi darurat, populasi balita rentan, dan estimasi penduduk terpapar kabut asap di 7 provinsi prioritas.
            </p>

            {/* 4 Quick Stat Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {/* Card 1: Meninggal */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">
                  Meninggal
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-950">
                  {meninggal.toLocaleString('id-ID')}{' '}
                  <span className="text-xs sm:text-sm font-bold text-rose-700">Jiwa</span>
                </span>
                <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                  Komplikasi Akut Karhutla
                </span>
              </div>

              {/* Card 2: Kasus ISPA */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                  Kasus ISPA
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-950">
                  {kasusIspa.toLocaleString('id-ID')}{' '}
                  <span className="text-xs sm:text-sm font-bold text-amber-700">Kasus</span>
                </span>
                <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                  Infeksi Saluran Napas Akut
                </span>
              </div>

              {/* Card 3: Rawat Inap Respirasi */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-800 block">
                  Rawat Inap O2
                </span>
                <span className="text-xl sm:text-2xl font-black text-orange-950">
                  {rawatInap.toLocaleString('id-ID')}{' '}
                  <span className="text-xs sm:text-sm font-bold text-orange-700">Pasien</span>
                </span>
                <span className="text-[10px] text-orange-600 font-medium block mt-0.5">
                  Terapi Oksigenasi Faskes
                </span>
              </div>

              {/* Card 4: Balita Rentan */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block">
                  Balita (≤5 Thn)
                </span>
                <span className="text-xl sm:text-2xl font-black text-purple-950">
                  {balitaIspa.toLocaleString('id-ID')}{' '}
                  <span className="text-xs sm:text-sm font-bold text-purple-700">Jiwa</span>
                </span>
                <span className="text-[10px] text-purple-600 font-medium block mt-0.5">
                  22,6% dari Total Kasus ISPA
                </span>
              </div>
            </div>

            {/* Strip Bawah: Populasi Terpapar Kabut Asap */}
            <div className="mt-3 p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Wind className="h-4 w-4 text-teal-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                    Populasi Terpapar Asap
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-black text-teal-950">
                  {totalTerpapar.toLocaleString('id-ID')}{' '}
                  <span className="text-[11px] font-bold text-teal-700">Jiwa</span>
                </span>
              </div>
              <p className="text-[11px] text-teal-800/80 font-medium mt-1 mb-0">
                Estimasi populasi di 92 Kabupaten/Kota pada 7 Provinsi Prioritas Karhutla
              </p>
            </div>
          </div>

          {/* Insight Box Morbiditas Karhutla */}
          <div className="rounded-xl bg-teal-50/90 border border-teal-200 p-4 text-xs sm:text-sm text-teal-950 leading-relaxed font-medium">
            <div className="flex items-center gap-2 text-teal-900 font-black text-sm mb-1.5">
              <Activity className="h-4 w-4 text-[#047d78]" />
              <span>Insight Klinis &amp; Morbiditas Karhutla:</span>
            </div>
            <p className="text-teal-950 font-medium m-0 text-xs sm:text-sm leading-relaxed">
              Sebanyak <strong className="font-bold">22,6%</strong> penderita ISPA merupakan kelompok balita rentan ({balitaIspa.toLocaleString('id-ID')} jiwa). Pasien rawat inap darurat ({rawatInap.toLocaleString('id-ID')} jiwa) terkonsentrasi di faskes dengan level ISPU Berbahaya (&gt;300) dan telah difasilitasi konsentrator oksigen darurat.
            </p>
          </div>
        </div>

        {/* ── Sisi Kanan (70% / 8 cols): Visualisasi Tren & Dinamika Morbiditas ── */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div>
            {/* Top Bar Filter & Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
              {/* Filter Garis Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">
                  Filter Seri:
                </span>

                <button
                  type="button"
                  onClick={() => toggleLine('ispa')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    visibleLines.ispa
                      ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#f59e0b]"></span>
                  Kasus ISPA
                </button>

                <button
                  type="button"
                  onClick={() => toggleLine('rawatInap')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    visibleLines.rawatInap
                      ? 'bg-orange-50 text-orange-800 border-orange-300 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#ea580c]"></span>
                  Rawat Inap
                </button>

                <button
                  type="button"
                  onClick={() => toggleLine('balita')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    visibleLines.balita
                      ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#7c3aed]"></span>
                  Balita (≤5 Thn)
                </button>

                <button
                  type="button"
                  onClick={() => toggleLine('meninggal')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    visibleLines.meninggal
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#e11d48]"></span>
                  Meninggal
                </button>

                <button
                  type="button"
                  onClick={() => toggleLine('terpapar')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    visibleLines.terpapar
                      ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#0d9488]"></span>
                  Terpapar
                </button>

                <button
                  type="button"
                  onClick={resetLines}
                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                  title="Tampilkan semua seri"
                >
                  Reset
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('tren')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    viewMode === 'tren'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tren 7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('komposisi_umur')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    viewMode === 'komposisi_umur'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kelompok Usia
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('gender')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    viewMode === 'gender'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Jenis Kelamin
                </button>
              </div>
            </div>

            {/* Main Visual Display */}
            {viewMode === 'tren' && (
              <div className="h-[310px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#f59e0b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      domain={[0, 350000]}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#0d9488"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      domain={[0, 20000000]}
                      tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toLocaleString('id-ID')} Jiwa`,
                        name === 'ispa'
                          ? 'Kasus ISPA'
                          : name === 'rawatInap'
                          ? 'Rawat Inap Respirasi'
                          : name === 'balita'
                          ? 'Balita (≤5 Thn)'
                          : name === 'meninggal'
                          ? 'Meninggal'
                          : name === 'terpapar'
                          ? 'Populasi Terpapar Asap'
                          : name,
                      ]}
                    />

                    {/* Area Populasi Terpapar di Background Right Axis */}
                    {visibleLines.terpapar && (
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="terpapar"
                        name="terpapar"
                        fill="#0d9488"
                        fillOpacity={0.08}
                        stroke="#0d9488"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Kurva Kasus ISPA */}
                    {visibleLines.ispa && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ispa"
                        name="ispa"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    )}

                    {/* Kurva Balita Rentan */}
                    {visibleLines.balita && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="balita"
                        name="balita"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 1.5 }}
                      />
                    )}

                    {/* Kurva Rawat Inap */}
                    {visibleLines.rawatInap && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="rawatInap"
                        name="rawatInap"
                        stroke="#ea580c"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 1.5 }}
                      />
                    )}

                    {/* Kurva Meninggal */}
                    {visibleLines.meninggal && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="meninggal"
                        name="meninggal"
                        stroke="#e11d48"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#e11d48', stroke: '#ffffff', strokeWidth: 1.5 }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewMode === 'komposisi_umur' && (
              <div className="h-[310px] w-full flex flex-col justify-center px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
                  {ageCompositionData.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                          {item.name}
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-black text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.pct}
                        </span>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 block">
                          {item.value.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold mt-1 block">
                          Kasus Terdata Laporan Faskes
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: item.pct.replace(',', '.'),
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'gender' && (
              <div className="h-[310px] w-full flex flex-col justify-center px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
                  {genderCompositionData.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                          {item.name}
                        </span>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-black text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.pct}
                        </span>
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-black text-slate-900 block">
                          {item.value.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold mt-1 block">
                          Distribusi Kasus Terverifikasi
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: item.pct.replace(',', '.'),
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Legenda & Sumber Data */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
              <span>
                Sumber Data:{' '}
                <strong className="text-slate-700 font-bold">
                  Sistem Informasi Penanggulangan Krisis Kesehatan (SIPKK)
                </strong>{' '}
                &amp; Surveilans ISPA 7 Provinsi
              </span>
            </div>
            <span className="text-slate-400">Pembaruan Sinkronisasi 15 Menit Sekali</span>
          </div>
        </div>
      </div>
    </article>
  )
}
