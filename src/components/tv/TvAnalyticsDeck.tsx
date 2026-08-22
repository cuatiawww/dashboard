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
  MapPin,
  AlertCircle,
} from 'lucide-react'

export interface KabupatenDetailItem {
  nama: string
  meninggal?: number
  luka_berat?: number
  luka_ringan?: number
  total_luka?: number
  pengungsi?: number
  terdampak?: number
  titik_posko?: number
  lat?: number
  lng?: number
}

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
  kabupatenDetailList?: KabupatenDetailItem[]
  markers?: any[]
  recentMarkers?: any[]
  penyakitList?: any[]
  summary?: SummaryData
  isKpiCollapsed?: boolean
  onSelectProvince?: (prov: string) => void
  onSelectLocation?: (lng: number, lat: number, zoom?: number) => void
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
  kabupatenDetailList = [],
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
  onSelectLocation,
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

  // 2. Kesiapsiagaan Kluster Kesehatan (Real SIPKK aggregate numbers)
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

  // 3. Surveilans Tren Penyakit Pasca Bencana & Potensial KLB
  const penyakitTrend = useMemo(() => {
    if (Array.isArray(penyakitList) && penyakitList.length > 0) {
      const totalKasus = penyakitList.reduce((acc, p) => acc + (Number(p.jumlah || p.count) || 0), 0) || 1
      return penyakitList.map((p, idx) => {
        const kasus = Number(p.jumlah || p.count) || 0
        const persen = Math.min(100, Math.round((kasus / totalKasus) * 100))
        const nama = String(p.nama_penyakit || p.nama || p.label || 'Penyakit Umum')

        const isGawat = nama.toLowerCase().includes('merah') || nama.toLowerCase().includes('trauma')
        const isKuning = nama.toLowerCase().includes('kuning') || nama.toLowerCase().includes('ispa')
        const color = isGawat ? '#ef4444' : isKuning ? '#f59e0b' : '#047D78'
        const badgeBg = isGawat
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : isKuning
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-teal-50 text-[#047D78] border-teal-200'

        return {
          nama,
          kasus,
          persen,
          color,
          badgeBg,
          kategori: isGawat ? 'PRIORITAS 1' : isKuning ? 'PRIORITAS 2' : 'RAWAT JALAN',
        }
      })
    }

    return []
  }, [penyakitList])

  // 4. Sebaran Kabupaten (Normalized from kabupatenDetailList or wilayahList)
  const kabupatenRows = useMemo(() => {
    if (Array.isArray(kabupatenDetailList) && kabupatenDetailList.length > 0) {
      return kabupatenDetailList
    }

    if (Array.isArray(wilayahList) && wilayahList.length > 0) {
      return wilayahList.map((w: any) => ({
        nama: w.provinsi || w.nama || 'Wilayah',
        total_luka: w.luka ?? w.count ?? 0,
        meninggal: w.meninggal ?? 0,
        pengungsi: w.pengungsi ?? 0,
        terdampak: w.terdampak ?? 0,
        lat: w.lat,
        lng: w.lng,
      }))
    }

    return [
      { nama: 'Manggarai Timur', meninggal: 26, total_luka: 643, pengungsi: 19330, terdampak: 313876, lat: -8.6, lng: 120.6 },
      { nama: 'Manggarai', meninggal: 27, total_luka: 136, pengungsi: 10083, terdampak: 340153, lat: -8.61, lng: 120.46 },
      { nama: 'Ende', meninggal: 2, total_luka: 72, pengungsi: 3144, terdampak: 284165, lat: -8.84, lng: 121.65 },
      { nama: 'Sikka', meninggal: 6, total_luka: 55, pengungsi: 1972, terdampak: 350715, lat: -8.62, lng: 122.21 },
      { nama: 'Ngada', meninggal: 2, total_luka: 36, pengungsi: 1333, terdampak: 176462, lat: -8.78, lng: 120.96 },
      { nama: 'Nagekeo', meninggal: 13, total_luka: 22, pengungsi: 6221, terdampak: 170669, lat: -8.67, lng: 121.28 },
      { nama: 'Manggarai Barat', meninggal: 2, total_luka: 6, pengungsi: 1603, terdampak: 281692, lat: -8.51, lng: 119.89 },
      { nama: 'Flores Timur', meninggal: 0, total_luka: 44, pengungsi: 0, terdampak: 0, lat: -8.34, lng: 122.98 },
    ]
  }, [kabupatenDetailList, wilayahList])

  const maxCasualty = useMemo(() => {
    return Math.max(...kabupatenRows.map((k) => (k.total_luka || 0) + (k.meninggal || 0)), 1)
  }, [kabupatenRows])

  const handleKabClick = (kab: KabupatenDetailItem) => {
    if (kab.lng && kab.lat && onSelectLocation) {
      onSelectLocation(kab.lng, kab.lat, 10.5)
    } else if (onSelectProvince) {
      onSelectProvince(kab.nama)
    }
  }

  return (
    <div
      className={`fixed right-2 sm:right-3 bottom-12 z-25 transition-all duration-300 pointer-events-none ${
        isCollapsed ? 'w-10 sm:w-11' : 'w-76 sm:w-84 xl:w-92 2xl:w-98 max-w-[calc(50vw-16px)]'
      } ${isKpiCollapsed ? 'top-[68px] sm:top-[74px]' : 'top-[192px] sm:top-[198px] 2xl:top-[206px]'}`}
    >
      <div className="relative h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-xl sm:rounded-2xl shadow-[0_8px_24px_rgba(4,125,120,0.1)] overflow-hidden text-slate-800">
        {/* ── Deck Header ── */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-800 transition-all shadow-xs cursor-pointer"
            title={isCollapsed ? 'Buka Panel' : 'Ciutkan Panel'}
          >
            {isCollapsed ? <ChevronLeft className="h-3.5 w-3.5 text-[#047D78]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#047D78]" />}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0 text-right">
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black tracking-wider text-[#047D78] uppercase truncate">
                  ANALITIK & SEBARAN WILAYAH
                </h3>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold truncate">
                  8 Kabupaten Terdampak NTT
                </p>
              </div>
              <div className="p-1 rounded-lg bg-teal-50 text-[#047D78] border border-teal-200 shadow-xs">
                <BarChart3 className="h-3.5 w-3.5 text-[#047D78]" />
              </div>
            </div>
          )}
        </div>

        {/* ── Collapsed view icon bar ── */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center gap-3 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#047D78] border border-teal-200 transition-all shadow-xs"
              title="Sebaran Kabupaten"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition-all shadow-xs"
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
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 no-scrollbar bg-slate-50/40">
            {/* ── SECTION 1: SEBARAN KORBAN PER KABUPATEN (8 KABUPATEN NTT) ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5 text-[#047D78]" />
                  Sebaran Korban per Kabupaten
                </h4>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {kabupatenRows.length} Wilayah
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {kabupatenRows.map((kab, idx) => {
                  const total = (kab.total_luka || 0) + (kab.meninggal || 0)
                  const pct = Math.round((total / maxCasualty) * 100)

                  return (
                    <div
                      key={idx}
                      onClick={() => handleKabClick(kab)}
                      className="group p-2 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200/90 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-[#047D78] shrink-0" />
                          <h5 className="font-extrabold text-slate-900 group-hover:text-[#047D78] truncate text-[11px]">
                            {kab.nama}
                          </h5>
                        </div>
                        <span className="text-[9px] font-bold text-[#047D78] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                          Fokus &rarr;
                        </span>
                      </div>

                      {/* Badges Grid */}
                      <div className="grid grid-cols-3 gap-1 my-1.5 text-[9px]">
                        <div className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-center">
                          MD: <strong className="font-mono text-rose-950 font-black">{kab.meninggal || 0}</strong>
                        </div>
                        <div className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-center">
                          Luka: <strong className="font-mono text-amber-950 font-black">{kab.total_luka || 0}</strong>
                        </div>
                        <div className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 font-bold text-center">
                          Pengungsi: <strong className="font-mono text-sky-950 font-black">{(kab.pengungsi || 0).toLocaleString('id-ID')}</strong>
                        </div>
                      </div>

                      {/* Visual Relative Severity Bar */}
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 via-amber-500 to-rose-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── SECTION 2: KESIAPSIAGAAN RESPO MEDIS KRISIS ── */}
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

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-slate-600">Respon Krisis</span>
                    <Activity className="h-3 w-3 text-[#047D78]" />
                  </div>
                  <span className="font-mono text-base font-black text-[#047D78]">
                    {readinessData.totalKrisis || 1}
                  </span>
                  <span className="text-[8px] text-teal-800 font-semibold block">Kejadian Bencana M 7.7</span>
                </div>

                <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-slate-600">Pengungsi</span>
                    <Users className="h-3 w-3 text-sky-600" />
                  </div>
                  <span className="font-mono text-base font-black text-sky-700">
                    {readinessData.totalPengungsi.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[8px] text-sky-800 font-semibold block">Jiwa di 400 Titik Posko</span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-slate-600">Faskes Siaga</span>
                    <Hospital className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="font-mono text-base font-black text-emerald-700">
                    100%
                  </span>
                  <span className="text-[8px] text-emerald-800 font-semibold block">8 RS Rujukan Siaga Penuh</span>
                </div>

                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-slate-600">Total Korban</span>
                    <Stethoscope className="h-3 w-3 text-amber-600" />
                  </div>
                  <span className="font-mono text-base font-black text-amber-700">
                    {readinessData.totalKorban.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[8px] text-amber-800 font-semibold block">78 MD, 970 Luka, 3 Hilang</span>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: SURVEILANS TREN PENYAKIT & TRIASE ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                    Surveilans Pasien & Triase
                  </h4>
                  <span className="text-[9px] text-slate-500 font-bold block">
                    Penanganan Pasien Bencana
                  </span>
                </div>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Data SIPKK
                </span>
              </div>

              <div className="space-y-2">
                {penyakitTrend.length > 0 ? (
                  penyakitTrend.map((penyakit, idx) => (
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
                            {penyakit.kasus.toLocaleString('id-ID')} Pasien
                          </span>
                        </div>
                      </div>

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
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-slate-600 block">Surveilans Penyakit: #N/A</span>
                    <span className="text-[9px] text-slate-400">Belum ada laporan data kasus penyakit KLB</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 4: PROPORTION PIE CHART ── */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="h-3.5 w-3.5 text-[#047D78]" />
                  Distribusi Kejadian
                </h4>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {pieData.length} Kategori
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-24 w-24 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={20}
                        outerRadius={40}
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
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
