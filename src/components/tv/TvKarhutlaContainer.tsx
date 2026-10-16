'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  Flame,
  Wind,
  HeartPulse,
  AlertTriangle,
  Building2,
  Users,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowLeft,
  BriefcaseMedical,
  Stethoscope,
  ShieldAlert,
  Layers,
  Activity,
  FileSpreadsheet,
  Loader2
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const DisasterMap = dynamic(() => import('@/components/kejadian/DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
      <div className="text-center space-y-2">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Memuat Spasial Command Center...</p>
      </div>
    </div>
  ),
})

const PROV_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Kalimantan Tengah': { lat: -2.2136, lng: 113.9108 },
  'Kalimantan Barat': { lat: -0.0263, lng: 109.3425 },
  'Kalimantan Selatan': { lat: -3.4402, lng: 114.8385 },
  'Kalimantan Timur': { lat: -0.5021, lng: 117.1537 },
  'Riau': { lat: 0.5071, lng: 101.4478 },
  'Sumatera Selatan': { lat: -2.9909, lng: 104.7565 },
  'Jambi': { lat: -1.6101, lng: 103.6131 },
}

export default function TvKarhutlaContainer() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [apiData, setApiData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentSlide, setCurrentSlide] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false)
  const SLIDE_COUNT = 4

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
          ' WIB'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto rotate slides every 20 seconds
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDE_COUNT)
    }, 20000)
    return () => clearInterval(interval)
  }, [isPlaying, SLIDE_COUNT])

  // Load API Data Murni
  const loadData = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${basePath}/api/karhutla-data`)
      if (res.ok) {
        const json = await res.json()
        if (json && json.success) {
          setApiData(json)
        }
      }
    } catch (err) {
      console.error('[TvKarhutlaContainer] Error fetching:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Tampilan Loading Screen Jika Data Belum Tiba dari API
  if (isLoading || !apiData) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-500" />
          <h2 className="text-base font-black tracking-widest text-orange-400 uppercase">
            Memuat Video Wall Command Center EOC...
          </h2>
          <p className="text-xs text-slate-500">
            Sinkronisasi data langsung dengan Google Apps Script Pusat Krisis Kesehatan.
          </p>
        </div>
      </div>
    )
  }

  const rawKartu = apiData?.ringkasan?.kartu || {}

  // Hitung total masker & oksigen konsentrator murni dari API
  const dinkesMasker = (rawKartu.logistik_dinkes_jenis || []).find((j: any) => j.jenis_key === 'masker')?.jumlah ?? 0
  const puskrisMasker = (rawKartu.logistik_puskris_jenis || []).find((j: any) => j.jenis_key === 'masker')?.jumlah ?? 0
  const totalMasker = dinkesMasker + puskrisMasker

  const dinkesKons = (rawKartu.logistik_dinkes_jenis || []).find((j: any) => j.jenis_key === 'oksigen_konsentrator')?.jumlah ?? 0
  const puskrisKons = (rawKartu.logistik_puskris_jenis || []).find((j: any) => j.jenis_key === 'oksigen_konsentrator')?.jumlah ?? 0
  const totalKons = dinkesKons + puskrisKons

  // Map markers murni dari API
  const mapMarkers = (apiData?.ispu?.data || [])
    .filter((st: any) => st.data_tersedia)
    .map((st: any) => {
      const coord = PROV_COORDINATES[st.provinsi] || { lat: -2.2, lng: 113.9 }
      return {
        id: `tv-ispu-${st.id}`,
        name: `ISPU ${st.stasiun}: ${st.nilai_ispu} (${st.kategori})`,
        bencana_nama: `Indeks Standar Pencemar Udara (${st.kategori})`,
        latitude: coord.lat + (Math.sin(st.no) * 0.15),
        longitude: coord.lng + (Math.cos(st.no) * 0.15),
        korban: st.nilai_ispu,
        tanggal: apiData?.ringkasan?.ispu_update_text || 'Live ISPU KLHK',
        status: `Parameter Kritis: ${st.parameter_kritis || 'PM2.5'}`,
        icon_url: 'https://pusatkrisis.kemkes.go.id/spasial/images/bencana.png',
      }
    })

  // ISPA bar chart data murni dari API
  const ispaChartData = (apiData?.ispa?.data || []).map((item: any) => ({
    provinsi: item.provinsi.replace('Kalimantan', 'Kal.').replace('Sumatera', 'Sum.'),
    Balita: item.kategori_umur?.le_5_tahun || 0,
    'Non-Balita': item.kategori_umur?.gt_5_tahun || 0,
  }))

  const maxPenyakitCount = Math.max(
    ...(apiData?.penyakit_lainnya?.by_penyakit || []).map((p: any) => p.jumlah || 0),
    1
  )

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-white select-none">
      {/* ── Top HUD Header ── */}
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-orange-500/20 bg-slate-950/95 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/karhutla-indonesia')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Kembali ke Dashboard Utama"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg shadow-orange-500/30">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider text-orange-400 uppercase">
                  COMMAND CENTER EOC KEMENKES
                </span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-400 border border-rose-500/30">
                  SIAGA DARURAT BENCANA ASAP
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                  LIVE GS FEED
                </span>
              </div>
              <h1 className="text-base font-black tracking-tight text-white">
                SITUASI NASIONAL KRISIS KESEHATAN KARHUTLA 2026
              </h1>
            </div>
          </div>
        </div>

        {/* Slide Indicators & Clock */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            {['Peta Spasial & ISPU', 'Penduduk Terdampak', 'Surveilans ISPA', 'Logistik & SDMK'].map(
              (label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    currentSlide === idx
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-slate-400">WAKTU SISTEM</p>
            <p className="text-xs font-black tracking-wider text-orange-400 font-mono">{currentTime}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              title={isPlaying ? 'Jeda Otomatis' : 'Mulai Rotasi'}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              title="Suara Peringatan"
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-orange-400" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              title="Layar Penuh"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── KPI Deck (Top Bar Murni dari API) ── */}
      <section className="z-10 grid shrink-0 grid-cols-6 gap-2 border-b border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400">Penduduk Terdampak</span>
          <p className="mt-1 text-xl font-black text-white">
            {(rawKartu.penduduk_terdampak ?? 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] font-semibold text-orange-400">
            {rawKartu.kabupaten_terdampak ?? 0} Kab/Kota Terdampak
          </span>
        </div>

        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-rose-300">Korban Jiwa & Inap</span>
          <p className="mt-1 text-xl font-black text-rose-400">
            {rawKartu.meninggal ?? 0} <span className="text-xs font-bold text-slate-400">Meninggal</span>
          </p>
          <span className="text-[10px] font-bold text-rose-300">
            {(rawKartu.rawat_inap ?? 0).toLocaleString('id-ID')} Pasien Rawat Inap
          </span>
        </div>

        <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-purple-300">Morbiditas ISPA</span>
          <p className="mt-1 text-xl font-black text-purple-300">
            {(rawKartu.kasus_ispa ?? 0).toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] font-semibold text-purple-400">
            Balita: {(rawKartu.kasus_ispa_balita ?? 0).toLocaleString('id-ID')} Jiwa
          </span>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-amber-300">ISPU Tertinggi</span>
          <p className="mt-1 text-xl font-black text-amber-400">
            {rawKartu.ispu_tertinggi?.nilai_ispu ?? '-'} <span className="text-xs text-white">ISPU</span>
          </p>
          <span className="text-[10px] font-bold text-rose-400">
            {rawKartu.ispu_tertinggi?.stasiun ?? '-'} ({rawKartu.ispu_tertinggi?.kategori ?? '-'})
          </span>
        </div>

        <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-blue-300">SDMK Digerakkan</span>
          <p className="mt-1 text-xl font-black text-blue-300">
            {(rawKartu.sdmk_digerakkan ?? 0).toLocaleString('id-ID')} Nakes
          </p>
          <span className="text-[10px] font-semibold text-blue-400">
            {apiData.sdmk?.summary?.jumlah_provinsi || 7} Provinsi Terdata
          </span>
        </div>

        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-emerald-300">Logistik Masker & O2</span>
          <p className="mt-1 text-xl font-black text-emerald-300">
            {totalMasker.toLocaleString('id-ID')} Pcs
          </p>
          <span className="text-[10px] font-semibold text-emerald-400">
            {totalKons} Unit Oksigen Konsentrator
          </span>
        </div>
      </section>

      {/* ── Main Big Screen Stage (Slides) ── */}
      <main className="relative flex-1 overflow-hidden p-4">
        {/* SLIDE 0: Peta Spasial & Radar ISPU */}
        {currentSlide === 0 && (
          <div className="flex h-full w-full gap-4">
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <DisasterMap
                markers={mapMarkers}
                faskesList={[]}
                poskoList={[]}
                disasterType="Kebakaran Hutan dan Lahan"
                isFloodEocMode={true}
              />
              <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs backdrop-blur-md">
                <p className="font-black text-orange-400 uppercase tracking-wider">InaRISK ArcGIS & KLHK ISPU</p>
                <p className="text-[11px] text-slate-400">
                  Radar {apiData.ispu?.summary?.jumlah_stasiun || 48} Stasiun Pemantau • {rawKartu.stasiun_ispu_berbahaya || 0} Kategori Berbahaya
                </p>
              </div>
            </div>

            {/* Side Radar Kualitas Udara */}
            <div className="w-96 shrink-0 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
              <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider">
                Stasiun ISPU Kategori Berbahaya (&gt;300)
              </h3>
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {(apiData?.ispu?.data || [])
                  .filter((st: any) => st.kategori === 'Berbahaya')
                  .slice(0, 7)
                  .map((st: any) => (
                    <div
                      key={st.id}
                      className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{st.stasiun}</p>
                        <span className="text-[10px] text-slate-400">{st.provinsi}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-rose-400">{st.nilai_ispu}</span>
                        <p className="text-[9px] font-bold text-rose-300">{st.parameter_kritis || 'PM2.5'}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: Tabel Penduduk Terdampak */}
        {currentSlide === 1 && (
          <div className="flex h-full w-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider">
                  Matriks Penduduk & Wilayah Terdampak Bencana Asap ({apiData.penduduk_terdampak?.total || 92} Kab/Kota)
                </h3>
                <p className="text-xs text-slate-400">Data real-time bersumber dari Google Spreadsheet Puskris Kemenkes</p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                Total Terdampak: {(rawKartu.penduduk_terdampak ?? 0).toLocaleString('id-ID')} Jiwa
              </span>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Provinsi</th>
                    <th className="px-4 py-3">Kabupaten / Kota</th>
                    <th className="px-4 py-3 text-right">Penduduk Terdampak</th>
                    <th className="px-4 py-3 text-center">Rawat Inap</th>
                    <th className="px-4 py-3 text-center">Meninggal</th>
                    <th className="px-4 py-3">Catatan Medis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(apiData?.penduduk_terdampak?.data || [])
                    .filter((d: any) => d.penduduk_terdampak > 0 || d.korban?.meninggal > 0)
                    .slice(0, 15)
                    .map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-semibold text-slate-400">{d.provinsi}</td>
                        <td className="px-4 py-2.5 font-bold text-white">{d.kabupaten}</td>
                        <td className="px-4 py-2.5 text-right font-black text-orange-400">
                          {d.penduduk_terdampak?.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-2.5 text-center text-amber-400 font-bold">
                          {d.korban?.luka_berat_rawat_inap || 0}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {d.korban?.meninggal > 0 ? (
                            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-400 font-black border border-rose-500/30">
                              {d.korban.meninggal} Jiwa
                            </span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-[11px] line-clamp-1">
                          {d.keterangan?.meninggal || d.keterangan?.luka_berat_rawat_inap || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE 2: Surveilans ISPA & Morbiditas */}
        {currentSlide === 2 && (
          <div className="grid h-full w-full grid-cols-2 gap-4">
            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider mb-2">
                Distribusi Kasus ISPA per Provinsi (Balita vs Non-Balita)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Total Kasus ISPA: {(rawKartu.kasus_ispa ?? 0).toLocaleString('id-ID')} Jiwa
              </p>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ispaChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="provinsi" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Legend />
                    <Bar dataKey="Balita" fill="#f97316" radius={[4, 4, 0, 0]} name="Balita (≤ 5 Thn)" />
                    <Bar dataKey="Non-Balita" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Non-Balita (> 5 Thn)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider mb-2">
                7 Morbiditas Penyakit Lainnya Akibat Karhutla
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Total Kasus: {(rawKartu.kasus_penyakit_lainnya ?? 0).toLocaleString('id-ID')} Jiwa
              </p>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {(apiData?.penyakit_lainnya?.by_penyakit || []).map((p: any) => (
                  <div key={p.penyakit} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-200">{p.penyakit}</span>
                      <span className="text-purple-400 font-mono">{p.jumlah?.toLocaleString('id-ID')} Kasus</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        style={{ width: `${Math.min(100, Math.round((p.jumlah / maxPenyakitCount) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: Logistik & SDMK */}
        {currentSlide === 3 && (
          <div className="grid h-full w-full grid-cols-2 gap-4">
            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-black text-teal-400 uppercase tracking-wider mb-2">
                Logistik Kesehatan Puskris Kemenkes & Buffer Stock Regional
              </h3>
              <p className="text-xs text-slate-400 mb-4">Penguatan suplai alat oksigenasi dan masker pelindung</p>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {(apiData?.logistik?.puskris?.by_jenis || []).map((j: any) => (
                  <div key={j.jenis_logistik} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{j.jenis_logistik}</p>
                    <p className="text-xl font-black text-teal-400 mt-1">{j.jumlah.toLocaleString('id-ID')}</p>
                    <span className="text-[10px] text-slate-500">{j.satuan}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider mb-2">
                Mobilisasi SDMK & Upaya Respon Strategis
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Total {rawKartu.sdmk_digerakkan || 0} Tenaga Kesehatan • {apiData.upaya?.summary?.total_upaya || 0} Tindakan
              </p>
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {(apiData?.sdmk?.data || []).map((s: any) => (
                  <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white">{s.provinsi}</span>
                      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-blue-400 border border-blue-500/30">
                        {s.jumlah} Nakes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{s.keterangan}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Running Ticker ── */}
      <footer className="z-20 flex h-10 shrink-0 items-center border-t border-slate-800 bg-slate-950 px-4 text-xs font-semibold text-slate-300">
        <span className="mr-3 shrink-0 rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
          WASPADA KARHUTLA
        </span>
        <div className="overflow-hidden whitespace-nowrap">
          <p className="inline-block animate-marquee pl-full">
            KEMENTERIAN KESEHATAN RI MENGHIMBAU MASYARAKAT DI WILAYAH TERDAMPAK KABUT ASAP UNTUK MEMBATASI AKTIVITAS LUAR RUANG • GUNAKAN MASKER MEDIS ATAU N95 • SENTRA SAFE HOUSE RUANG OKSIGEN BERFILTER HEPA TERSEDIA DI PUSKESMAS & RSUD RUJUKAN • HUBUNGI PUBLIC SAFETY CENTER (PSC) 119 UNTUK EVAKUASI MEDIS DARURAT • DATA SINKRON OTOMATIS DENGAN GOOGLE APPS SCRIPT PUSKRIS KEMENKES
          </p>
        </div>
      </footer>
    </div>
  )
}
