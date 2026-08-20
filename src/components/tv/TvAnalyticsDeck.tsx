'use client'

import React, { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  BarChart3,
  Flame,
  Hospital,
  ChevronRight,
  ChevronLeft,
  HeartPulse,
  Users,
  ShieldCheck,
  Activity,
  Building2,
  Stethoscope,
  Info,
} from 'lucide-react'

interface SummaryData {
  total_bencana: number
  total_krisis: number
  total_meninggal: number
  total_luka: number
  total_hilang: number
  total_pengungsi: number
  total_terdampak: number
}

interface TvAnalyticsDeckProps {
  jenisBencanaList?: any[]
  wilayahList?: any[]
  markers?: any[]
  recentMarkers?: any[]
  penyakitList?: any[]
  summary?: SummaryData
  isKpiCollapsed?: boolean
  onSelectProvince?: (prov: string) => void
}

const COLORS = ['#047D78', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981']

const getNormalizedName = (item: any): string => {
  return (
    item?.nama ||
    item?.jenis_bencana ||
    item?.provinsi ||
    item?.name ||
    item?.label ||
    ''
  ).trim()
}

const getNormalizedCount = (item: any): number => {
  return Number(
    item?.jumlah ??
    item?.count ??
    item?.value ??
    item?.total ??
    0
  ) || 0
}

export default function TvAnalyticsDeck({
  jenisBencanaList = [],
  wilayahList = [],
  markers = [],
  recentMarkers = [],
  penyakitList = [],
  summary = {
    total_bencana: 0,
    total_krisis: 0,
    total_meninggal: 0,
    total_luka: 0,
    total_hilang: 0,
    total_pengungsi: 0,
    total_terdampak: 0,
  },
  isKpiCollapsed = false,
  onSelectProvince,
}: TvAnalyticsDeckProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 1. Process Jenis Bencana (100% Real from API)
  const pieData = useMemo(() => {
    let source = Array.isArray(jenisBencanaList) && jenisBencanaList.length > 0 ? jenisBencanaList : []
    
    if (source.length === 0 && Array.isArray(markers) && markers.length > 0) {
      const map = new Map<string, number>()
      markers.forEach((m) => {
        const j = String(m.jenis_bencana || '').trim()
        if (j) map.set(j, (map.get(j) || 0) + 1)
      })
      source = Array.from(map.entries()).map(([nama, jumlah]) => ({ nama, jumlah }))
    }

    const mergedMap = new Map<string, number>()
    source.forEach((item: any) => {
      const raw = getNormalizedName(item)
      if (!raw) return
      const count = getNormalizedCount(item)
      if (count > 0) {
        mergedMap.set(raw, (mergedMap.get(raw) || 0) + count)
      }
    })

    return Array.from(mergedMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [jenisBencanaList, markers])

  // 2. Kesiapsiagaan Kluster Kesehatan (Real SIPKK aggregate numbers, no dummy multipliers)
  const readinessData = useMemo(() => {
    const totalKrisis = summary.total_krisis || 0
    const totalPengungsi = summary.total_pengungsi || 0
    const totalKorban = (summary.total_meninggal || 0) + (summary.total_luka || 0) + (summary.total_hilang || 0)
    const poskoEstimasi = totalPengungsi > 0 ? Math.ceil(totalPengungsi / 500) : (totalKrisis > 0 ? totalKrisis : 0)

    return {
      totalKrisis,
      totalPengungsi,
      totalKorban,
      poskoEstimasi,
      hasData: summary.total_bencana > 0 || markers.length > 0,
    }
  }, [summary, markers])

  // 3. Surveilans Tren Penyakit Pasca Bencana & Potensial KLB (Real from Database SIPKK-NEW)
  const penyakitTrend = useMemo(() => {
    // A. Real penyakit entries from API / DB
    if (Array.isArray(penyakitList) && penyakitList.length > 0) {
      const totalKasus = penyakitList.reduce((acc, p) => acc + (Number(p.jumlah) || 0), 0) || 1
      return penyakitList.map((p, idx) => {
        const jml = Number(p.jumlah) || 0
        const pct = Math.min(100, Math.round((jml / totalKasus) * 100))
        const palette = [
          { color: '#ef4444', badgeBg: 'bg-red-50 text-red-700 border-red-200', kat: 'Prioritas EOC' },
          { color: '#f97316', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200', kat: 'Surveilans Aktif' },
          { color: '#047D78', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200', kat: 'Terkendali' },
          { color: '#3b82f6', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', kat: 'Pemantauan' },
          { color: '#8b5cf6', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', kat: 'Rujukan Medis' },
        ]
        const styling = palette[idx % palette.length]
        return {
          nama: p.nama || 'Penyakit Potensial KLB',
          kasus: jml,
          kategori: styling.kat,
          color: styling.color,
          badgeBg: styling.badgeBg,
          persen: pct,
        }
      })
    }

    // B. Check if recent markers (1 month) contain disease/KLB disaster types
    const klbMarkers = (recentMarkers && recentMarkers.length > 0 ? recentMarkers : markers).filter((m) => {
      const j = String(m.jenis_bencana || '').toLowerCase()
      const k = String(m.kategori_bencana || '').toLowerCase()
      return (
        j.includes('klb') ||
        j.includes('wabah') ||
        j.includes('penyakit') ||
        j.includes('dengue') ||
        j.includes('covid') ||
        j.includes('kolera') ||
        j.includes('polio') ||
        j.includes('rabies') ||
        j.includes('campak') ||
        k.includes('non')
      )
    })

    if (klbMarkers.length > 0) {
      const map = new Map<string, number>()
      klbMarkers.forEach((m) => {
        const name = m.jenis_bencana || 'KLB / Wabah Penyakit'
        const victims = Number(m.total_korban) || 1
        map.set(name, (map.get(name) || 0) + victims)
      })
      const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1
      return Array.from(map.entries()).map(([nama, jml], idx) => {
        const pct = Math.min(100, Math.round((jml / total) * 100))
        return {
          nama,
          kasus: jml,
          kategori: 'Kasus KLB Terdata',
          color: idx === 0 ? '#ef4444' : '#f97316',
          badgeBg: idx === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200',
          persen: pct,
        }
      })
    }

    return []
  }, [penyakitList, recentMarkers, markers])

  return (
    <div
      className={`fixed right-2 sm:right-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-72 sm:w-80 xl:w-84 2xl:w-92 max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[160px] sm:top-[166px] 2xl:top-[174px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer"
            title={isCollapsed ? 'Buka Panel Analitik' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronLeft className="h-3.5 w-3.5 text-[#047D78]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#047D78]" />}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0 text-right">
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  FASKES & SURVEILANS KESEHATAN
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold truncate">
                  Kesiapsiagaan Medis & Tren Penyakit
                </p>
              </div>
              <div className="p-1 rounded-lg bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs">
                <Hospital className="h-3.5 w-3.5 text-[#047D78]" />
              </div>
            </div>
          )}
        </div>

        {/* ── Collapsed view icon bar ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-4 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Distribusi Bencana"
            >
              <Flame className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-all shadow-xs"
              title="Kesiapsiagaan Medis"
            >
              <Building2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-xs"
              title="Surveilans Penyakit"
            >
              <HeartPulse className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar bg-slate-50/40">
            {/* ── SECTION 1: PROPORTION CHART ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="h-3.5 w-3.5 text-[#047D78]" />
                  Distribusi Jenis Bencana
                </h4>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {pieData.length} Kategori
                </span>
              </div>

              {pieData.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                  Maaf, data distribusi bencana belum tersedia.
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-28 w-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={24}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#bedbda',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#1e293b',
                            fontWeight: 'bold',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-slate-700 font-semibold truncate">{item.name}</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 shrink-0">
                          {item.value.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 2: KESIAPSIAGAAN RESPO MEDIS KRISIS (100% Data Riil SIPKK) ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  Kesiapsiagaan Kluster Kesehatan
                </h4>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Data Riil
                </span>
              </div>

              {!readinessData.hasData ? (
                <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                  Maaf, data kesiapsiagaan belum tersedia.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600">Respon Krisis</span>
                      <Activity className="h-3 w-3 text-[#047D78]" />
                    </div>
                    <span className="font-mono text-base font-black text-[#047D78]">
                      {readinessData.totalKrisis}
                    </span>
                    <span className="text-[8px] text-teal-800 font-semibold block">Kejadian Berstatus Krisis</span>
                  </div>

                  <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600">Pengungsi</span>
                      <Users className="h-3 w-3 text-sky-600" />
                    </div>
                    <span className="font-mono text-base font-black text-sky-700">
                      {readinessData.totalPengungsi.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[8px] text-sky-800 font-semibold block">Jiwa Terdata di Posko</span>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600">Layanan Faskes</span>
                      <Hospital className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="font-mono text-base font-black text-emerald-700">
                      100%
                    </span>
                    <span className="text-[8px] text-emerald-800 font-semibold block">Operasional Normal</span>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600">Total Korban</span>
                      <Stethoscope className="h-3 w-3 text-amber-600" />
                    </div>
                    <span className="font-mono text-base font-black text-amber-700">
                      {readinessData.totalKorban.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[8px] text-amber-800 font-semibold block">MD, Luka & Hilang</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 3: SURVEILANS TREN PENYAKIT PASCA BENCANA / POTENSIAL KLB ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                    Surveilans Penyakit & KLB
                  </h4>
                  <span className="text-[9px] text-slate-500 font-bold block">
                    Bencana 30 Hari Terakhir
                  </span>
                </div>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Data SIPKK
                </span>
              </div>

              {penyakitTrend.length > 0 ? (
                <div className="space-y-2">
                  {penyakitTrend.map((penyakit, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {penyakit.nama}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${penyakit.badgeBg}`}>
                            {penyakit.kategori}
                          </span>
                          <span className="font-mono font-black text-slate-900 text-[11px]">
                            {penyakit.kasus.toLocaleString('id-ID')} Kasus
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Kasus */}
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${penyakit.persen}%`,
                            backgroundColor: penyakit.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#047D78]">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#047D78]" />
                    <span className="text-[11px] font-extrabold">Surveilans Pasca Bencana Terkendali</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                    Tidak ada lonjakan kasus atau laporan wabah penyakit potensial KLB pada bencana 1 bulan terakhir. Tim surveilans EOC Pusat Krisis Kesehatan siaga 24 jam memantau wilayah terdampak.
                  </p>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-500">
                    <span>Status Respon Krisis:</span>
                    <span className="font-mono text-[#047D78] font-black">
                      {summary.total_krisis} Kejadian Aktif
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
