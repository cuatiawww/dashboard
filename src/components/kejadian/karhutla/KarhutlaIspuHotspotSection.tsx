'use client'

import React, { useMemo } from 'react'
import {
  Table2,
  Flame,
  Wind,
  ShieldCheck,
  Building2,
  Stethoscope,
  Activity,
  AlertTriangle,
  Zap,
  Droplets,
  Home,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

interface KarhutlaIspuHotspotSectionProps {
  eventData: any
  onOpenMatrix?: () => void
}

const ISPU_COLORS = {
  Berbahaya: '#111827', // Hitam (>300)
  SangatTidakSehat: '#ef4444', // Merah (201-300)
  TidakSehat: '#eab308', // Kuning (101-200)
  Sedang: '#3b82f6', // Biru (51-100)
  Baik: '#22c55e', // Hijau (0-50)
}

export default function KarhutlaIspuHotspotSection({
  eventData,
  onOpenMatrix,
}: KarhutlaIspuHotspotSectionProps) {
  const detail = eventData?.detailData || eventData || {}
  const ringkasan = detail.karhutla_ringkasan?.kartu || {}
  const ispuData = detail.karhutla_ispu || {}
  const hotspotData = detail.karhutla_hotspot || {}

  const ispuMax = Number(ringkasan.ispu_tertinggi?.nilai || eventData?.ispu_tertinggi || 1447)
  const ispuLokasi = ringkasan.ispu_tertinggi?.lokasi
    ? `${ringkasan.ispu_tertinggi.lokasi} (${ringkasan.ispu_tertinggi.kategori || 'Berbahaya'})`
    : 'Kab. Katingan (Berbahaya)'

  const totalHotspot = Number(hotspotData.total_nasional || eventData?.hotspot || 5275)

  // ── 4 Koridor Wilayah Prioritas Pantauan ISPU & Hotspot ────────────────────
  const regionalCorridors = useMemo(() => {
    return [
      {
        key: 'kalteng_kalsel',
        title: 'Kalteng & Kalsel',
        svgIcon: '/images/faskes-icons/rs.svg',
        ispuMax: 1447,
        kategoriMax: 'Berbahaya',
        badgeColor: 'bg-slate-900 text-white',
        hotspot: 1780,
        faskesSiaga: 350,
        safeHouse: 48,
        totalStasiun: 16,
        pieData: [
          { name: 'Berbahaya (>300)', value: 8, fill: ISPU_COLORS.Berbahaya },
          { name: 'Sangat Tidak Sehat (201-300)', value: 4, fill: ISPU_COLORS.SangatTidakSehat },
          { name: 'Tidak Sehat (101-200)', value: 3, fill: ISPU_COLORS.TidakSehat },
          { name: 'Sedang (51-100)', value: 1, fill: ISPU_COLORS.Sedang },
        ],
      },
      {
        key: 'sumsel_jambi',
        title: 'Sumsel & Jambi',
        svgIcon: '/images/faskes-icons/puskesmas.svg',
        ispuMax: 205,
        kategoriMax: 'Sangat Tidak Sehat',
        badgeColor: 'bg-rose-600 text-white',
        hotspot: 1227,
        faskesSiaga: 418,
        safeHouse: 36,
        totalStasiun: 13,
        pieData: [
          { name: 'Sangat Tidak Sehat (201-300)', value: 5, fill: ISPU_COLORS.SangatTidakSehat },
          { name: 'Tidak Sehat (101-200)', value: 6, fill: ISPU_COLORS.TidakSehat },
          { name: 'Sedang (51-100)', value: 2, fill: ISPU_COLORS.Sedang },
        ],
      },
      {
        key: 'kalbar_kaltim',
        title: 'Kalbar & Kaltim',
        svgIcon: '/images/faskes-icons/pustu.svg',
        ispuMax: 195,
        kategoriMax: 'Tidak Sehat',
        badgeColor: 'bg-amber-500 text-slate-900',
        hotspot: 978,
        faskesSiaga: 580,
        safeHouse: 42,
        totalStasiun: 10,
        pieData: [
          { name: 'Sangat Tidak Sehat (201-300)', value: 3, fill: ISPU_COLORS.SangatTidakSehat },
          { name: 'Tidak Sehat (101-200)', value: 4, fill: ISPU_COLORS.TidakSehat },
          { name: 'Sedang (51-100)', value: 2, fill: ISPU_COLORS.Sedang },
          { name: 'Baik (0-50)', value: 1, fill: ISPU_COLORS.Baik },
        ],
      },
      {
        key: 'riau',
        title: 'Provinsi Riau',
        svgIcon: '/images/faskes-icons/klinik.svg',
        ispuMax: 190,
        kategoriMax: 'Tidak Sehat',
        badgeColor: 'bg-amber-500 text-slate-900',
        hotspot: 410,
        faskesSiaga: 463,
        safeHouse: 34,
        totalStasiun: 9,
        pieData: [
          { name: 'Sangat Tidak Sehat (201-300)', value: 2, fill: ISPU_COLORS.SangatTidakSehat },
          { name: 'Tidak Sehat (101-200)', value: 4, fill: ISPU_COLORS.TidakSehat },
          { name: 'Sedang (51-100)', value: 3, fill: ISPU_COLORS.Sedang },
        ],
      },
    ]
  }, [])

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* ── Sisi Kiri (4 cols / ~33%): Ringkasan Kualitas Udara & Kesiapan Faskes ── */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-slate-900 leading-snug m-0">
                  Status Kualitas Udara &amp; Kesiapan Faskes
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 mb-0">
                  Pemantauan 48 Stasiun ISPU KLHK &amp; 1.811 faskes siaga bencana asap di 7 provinsi.
                </p>
              </div>
              {onOpenMatrix && (
                <button
                  type="button"
                  onClick={onOpenMatrix}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#047D78] hover:bg-[#03625d] text-white text-[11px] font-black tracking-wider uppercase transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer shrink-0 border border-teal-600/30 group"
                  title="Buka Matriks Kualitas Udara ISPU & Faskes"
                >
                  <Table2 className="h-3.5 w-3.5 text-teal-100 group-hover:scale-110 transition-transform" />
                  <span>LIHAT MATRIKS</span>
                </button>
              )}
            </div>

            {/* Top Metric Strip: Total Faskes, 100% Siaga Asap, Titik Panas Hotspot */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Faskes
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
                  1.811
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Siaga Asap
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-900 block mt-0.5">
                  100% Normal
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Titik Panas
                </span>
                <span className="text-base sm:text-lg font-black text-rose-900 block mt-0.5">
                  {totalHotspot.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Clean Quality & Hotspot Box (Replaces Damage Box) */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Wind className="h-4 w-4 text-teal-700" />
                Indeks ISPU Tertinggi
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-black text-white flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                {ispuMax} ISPU (Berbahaya)
              </span>
            </div>

            {/* 3 Stasiun Kategori Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-800 uppercase block">
                  Berbahaya
                </span>
                <span className="text-lg font-black text-slate-950 leading-tight block mt-0.5">
                  16 <span className="text-[10px] font-semibold text-slate-500">Stn</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-rose-150 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">
                  Sangat Tdk Sehat
                </span>
                <span className="text-lg font-black text-rose-900 leading-tight block mt-0.5">
                  12 <span className="text-[10px] font-semibold text-rose-500">Stn</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-amber-150 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Tidak Sehat
                </span>
                <span className="text-lg font-black text-amber-900 leading-tight block mt-0.5">
                  14 <span className="text-[10px] font-semibold text-amber-500">Stn</span>
                </span>
              </div>
            </div>

            {/* Utilitas & Fasilitas Siaga Asap Faskes (Replaces Listrik / Air / Tenda) */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-1.5 text-[10.5px] font-bold text-slate-700 text-center">
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">Safe House: <strong>160</strong></span>
              </div>
              <div className="flex items-center justify-center gap-1 border-x border-slate-200">
                <Activity className="h-3 w-3 text-teal-600 shrink-0" />
                <span className="truncate">Posko O2: <strong>92</strong></span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-3 w-3 text-blue-600 shrink-0" />
                <span className="truncate">Konsentrator: <strong>280</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sisi Kanan (8 cols / ~67%): 4 Cards Solid Pie Charts (4 Koridor Wilayah) ── */}
        <div className="lg:col-span-8 flex flex-col bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/90">
          {/* Legend Bar Kategori ISPU Standar KLHK */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-4 pb-3 mb-3 border-b border-slate-200/70 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827] shrink-0" /> Berbahaya (&gt;300)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] shrink-0" /> Sangat Tidak Sehat (201-300)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#eab308] shrink-0" /> Tidak Sehat (101-200)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6] shrink-0" /> Sedang (51-100)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e] shrink-0" /> Baik (0-50)
            </span>
          </div>

          {/* 4 Cards Grid Koridor Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1 items-stretch my-auto">
            {regionalCorridors.map((cat) => {
              return (
                <div
                  key={cat.key}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate" title={cat.title}>
                        {cat.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0 border border-slate-200/60">
                      {cat.totalStasiun} Stasiun
                    </span>
                  </div>

                  {/* Solid Pie Chart (Pizza Slice Model) */}
                  <div className="relative w-full h-[155px] flex items-center justify-center my-auto">
                    {typeof window !== 'undefined' && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={cat.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={68}
                            paddingAngle={cat.pieData.length > 1 ? 2 : 0}
                            dataKey="value"
                            isAnimationActive={true}
                            animationDuration={800}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          >
                            {cat.pieData.map((entry, index) => (
                              <Cell key={`cell-${cat.key}-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontWeight: 700,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            }}
                            formatter={(val: any, name: any) => [`${val} Stasiun`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Bottom Stats: ISPU Maks, Hotspot, Faskes Siaga */}
                  <div className="mt-1.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px] font-bold text-center">
                    <div className="text-slate-800">
                      <span className="block text-slate-900 font-black leading-none text-xs">
                        {cat.ispuMax}
                      </span>
                      <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5 truncate">
                        {cat.kategoriMax}
                      </span>
                    </div>
                    <div className="border-l border-slate-150 pl-1 text-orange-700">
                      <span className="block text-orange-600 font-black leading-none text-xs">
                        {cat.hotspot}
                      </span>
                      <span className="text-[8.5px] font-semibold text-slate-500 block mt-0.5">
                        Titik Panas
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}
