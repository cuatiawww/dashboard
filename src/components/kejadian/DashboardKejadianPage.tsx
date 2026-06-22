'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  Flame,
  Heart,
  HelpCircle,
  Loader2,
  Users,
  ShieldAlert,
  Sparkles,
  MapPin,
  TrendingUp,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { buildApiUrl } from '@/lib/utils/api'
import { useAuthStore } from '@/lib/authStore'

// Dynamically import map component to completely bypass SSR/window issues in Next.js
const DisasterMap = dynamic(() => import('./DisasterMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl bg-slate-100/50 backdrop-blur-sm border border-slate-200">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-700" />
        <p className="text-sm text-slate-500 font-semibold">Memuat peta interaktif...</p>
      </div>
    </div>
  ),
})

type SummaryData = {
  total_bencana: number
  total_meninggal: number
  total_luka: number
  total_hilang: number
  total_pengungsi: number
  total_terdampak: number
}

type PieChartItem = {
  nama: string
  jumlah: number
}

type MarkerItem = {
  kode_trans: string
  tgl_kejadian: string
  jenis_bencana: string
  lat: number
  lng: number
  nama_desa?: string
  kecamatan?: string
  total_korban: number
}

type ApiResponse = {
  success: boolean
  summary: SummaryData
  jenis_bencana: PieChartItem[]
  wilayah: PieChartItem[]
  markers: MarkerItem[]
}

const COLORS = ['#0f8f96', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#f43f5e', '#eab308']

export default function DashboardKejadianPage() {
  const { token, isInitialized, user } = useAuthStore()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  const getRegionLabel = () => {
    const scope = user?.wilayah_scope
    if (!scope) return 'NASIONAL'

    if (scope.mode === 'kabupaten') {
      return scope.kabupaten?.label?.toUpperCase() || 'KAB/KOTA'
    } else if (scope.mode === 'provinsi') {
      return scope.provinsi?.label?.toUpperCase() || 'PROVINSI'
    }
    return 'NASIONAL'
  }

  useEffect(() => {
    if (!isInitialized) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(buildApiUrl(`/web_api/v1/bencana-stats?token=${encodeURIComponent(token || '')}`), {
          method: 'GET',
          headers,
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Gagal mengambil data statistik bencana.')
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isInitialized, token])

  const generateAiInsight = () => {
    if (!data) return
    setGeneratingAi(true)
    setTimeout(() => {
      if (data.summary.total_bencana === 0) {
        setAiInsight(`[ANALISIS RISK ASSESSMENT]
Tidak ada data laporan kejadian bencana yang terdaftar di dalam database.

Rekomendasi Respons:
N/A`)
        setGeneratingAi(false)
        return
      }

      const topDisaster = data.jenis_bencana[0]?.nama || 'Banjir'
      const topRegion = data.wilayah[0]?.nama || 'Jawa Barat'
      const caseFatalityRate = (
        (data.summary.total_meninggal /
          (data.summary.total_meninggal + data.summary.total_luka || 1)) *
        100
      ).toFixed(1)

      let guidelines = ''
      if (topDisaster.toLowerCase().includes('banjir')) {
        guidelines = `Penyebab utama krisis air bersih pasca-bencana adalah luapan air sungai yang terkontaminasi limbah tinja. Risiko terpenting yang diwaspadai adalah lonjakan kasus Leptospirosis (karena urin tikus) dan Diare akut. Rekomendasi darurat meliputi pemberian kaporit, distribusi Zinc + oralit di posko medis, dan surveillance aktif kasus demam >38°C.`
      } else if (topDisaster.toLowerCase().includes('gempa')) {
        guidelines = `Masalah kesehatan utama adalah cedera fraktur sekunder akibat runtuhan bangunan. Sangat direkomendasikan untuk menyiagakan ATS (Anti Tetanus Serum) di faskes primer sekitar lokasi episentrum untuk mencegah infeksi luka terbuka, serta mendirikan tenda pelayanan darurat yang berventilasi baik mencegah penularan Tuberkulosis/ISPA.`
      } else {
        guidelines = `Sanitasi lingkungan pengungsian merupakan titik kritis pencegahan penyebaran penyakit menular. Pengawasan kualitas makanan siap saji dan ketersediaan jamban darurat (1 toilet untuk maksimal 20 orang) harus segera dipenuhi dalam waktu 48 jam.`
      }

      setAiInsight(`[ANALISIS RISK ASSESSMENT]
Berdasarkan data insiden terbaru, ${topDisaster} merupakan ancaman paling dominan di tingkat nasional (wilayah teraktif: ${topRegion}). 

Indeks Kematian (Case Fatality Rate - CFR) terpantau di angka ${caseFatalityRate}%. Tingginya angka pengungsi (${data.summary.total_pengungsi.toLocaleString()} jiwa) berpotensi memicu kejadian luar biasa (KLB) penyakit menular jika kondisi sanitasi memburuk.

PANDUAN KLINIS & RESPONS CEPAT:
${guidelines}`)
      setGeneratingAi(false)
    }, 1250)
  }

  // Pre-generate AI insight once data is loaded
  useEffect(() => {
    if (data && !aiInsight) {
      generateAiInsight()
    }
  }, [data])

  if (loading || !isInitialized) {
    return (
      <div className="flex min-h-[500px] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-700" />
          <p className="text-slate-600 font-bold uppercase tracking-wider text-sm">Sedang sinkronisasi data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto my-8 max-w-[500px] rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-900">Gagal Sinkronisasi</h3>
        <p className="mt-2 text-sm text-slate-600">{error || 'Gagal memuat data.'}</p>
      </div>
    )
  }

  const isDbEmpty = data.summary.total_bencana === 0

  const getCardValue = (val: number) => {
    if (isDbEmpty) return 'N/A'
    return val.toLocaleString()
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 bg-[#fbffff]">
      {/* Header Panel */}
      <section className="flex flex-col justify-between gap-4 border-b border-teal-200/40 pb-5 md:flex-row md:items-center">
        <div>
          <span className="inline-block rounded-full bg-teal-50 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.15em] text-teal-700">
            Kejadian Bencana - {getRegionLabel()}
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
            PEMETAAN KRISIS KESEHATAN AKIBAT BENCANA
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Analisis spasial kejadian bencana dan dampaknya terhadap sumber daya kesehatan secara real-time di wilayah {getRegionLabel()}.
          </p>
        </div>
        {/* <div>
          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-2 text-xs font-semibold text-teal-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-600"></span>
            </span>
            Koneksi Region Terfilter
          </div>
        </div> */}
      </section>

      {/* Summary Cards Grid */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total Kejadian', value: data.summary.total_bencana, color: 'text-teal-700', icon: Flame, bg: 'bg-teal-50/80' },
          { label: 'Korban Meninggal', value: data.summary.total_meninggal, color: 'text-red-600', icon: ShieldAlert, bg: 'bg-red-50/80' },
          { label: 'Korban Luka', value: data.summary.total_luka, color: 'text-amber-600', icon: Heart, bg: 'bg-amber-50/80' },
          { label: 'Korban Hilang', value: data.summary.total_hilang, color: 'text-indigo-650', icon: HelpCircle, bg: 'bg-indigo-50/80' },
          { label: 'Jumlah Pengungsi', value: data.summary.total_pengungsi, color: 'text-sky-600', icon: Users, bg: 'bg-sky-50/80' },
          { label: 'Penduduk Terdampak', value: data.summary.total_terdampak, color: 'text-slate-700', icon: Activity, bg: 'bg-slate-50/80' },
        ].map((card, idx) => {
          const Icon = card.icon
          return (
            <article
              key={idx}
              className="flex min-h-[110px] w-full items-center gap-3 border border-[#bedbda] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,120,116,0.1)]"
              style={{
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <div className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full ${card.bg} ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold leading-tight text-[#5f6f6f] uppercase tracking-wider">
                  {card.label}
                </p>
                <p className={`text-[26px] font-bold leading-none tracking-[-0.02em] ${card.color} md:text-[30px]`}>
                  {getCardValue(card.value)}
                </p>
              </div>
            </article>
          )
        })}
      </section>

      {/* Map + AI Insight Section - Matches Homepage Aesthetics */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-start">

          <div className="space-y-3">
            {/* ── AI Insight Card ── */}
            <article
              className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-[415px] xl:w-[381px]"
              style={{
                backgroundImage: "url('/bg insght.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,251,250,0.72)_0%,rgba(231,247,246,0.60)_100%)]" />

              <div className="relative z-10 flex h-full flex-col">
                {/* Icon + Title */}
                <div className="flex items-start gap-3">
                  <Image
                    src="/insight.svg"
                    alt="Insight"
                    width={52}
                    height={52}
                    className="h-13 w-13 flex-shrink-0"
                  />
                  <h3 className="text-[15px] font-bold leading-[1.3] text-[#1a3535] sm:text-[17px]">
                    Analisis Penilaian Risiko Krisis Kesehatan Akibat Bencana
                  </h3>
                </div>

                {/* Body text */}
                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px] overflow-y-auto max-h-[180px] min-h-[140px]">
                  <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px] whitespace-pre-line">
                    {aiInsight || 'Klik tombol di bawah untuk membuat analisis.'}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-4 h-px bg-[rgba(0,0,0,0.08)]" />

                <div className="mt-auto">
                  <button
                    onClick={generateAiInsight}
                    disabled={generatingAi}
                    className="group flex w-full items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-[#4d90d0] to-[#6c5ce7] px-4 py-3.5 text-white shadow-[0_4px_14px_rgba(77,144,208,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(108,92,231,0.42)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                      {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">
                      {generatingAi ? 'Sedang Menganalisis...' : 'Analisis AI'}
                    </span>
                  </button>
                </div>
              </div>
            </article>

            {/* Source card */}
            <article
              className="border border-[#b7c8c9] bg-[#e9f1f2] p-4 xl:h-[183px] xl:w-[381px]"
              style={{
                borderTopLeftRadius: '17px',
                borderTopRightRadius: '17px',
                borderBottomRightRadius: '22px',
                borderBottomLeftRadius: '17px',
              }}
            >
              <h4 className="text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Sumber Data:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">
                Kementerian Kesehatan Republik Indonesia
              </p>
              <h4 className="mt-4 text-[18px] font-bold text-[#2f3a3a] sm:text-[22px]">Data per:</h4>
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">22 Juni 2026 10.00 WIB</p>
            </article>
          </div>

          {/* Map Card */}
          <article
            className="border border-[#cdcdcd] bg-white p-4 xl:h-[615px]"
            style={{
              borderTopLeftRadius: '17px',
              borderTopRightRadius: '17px',
              borderBottomRightRadius: '22px',
              borderBottomLeftRadius: '17px',
            }}
          >
            <h3 className="text-[22px] font-bold leading-tight text-[#2f2f2f] sm:text-[30px]">
              SEBARAN SPASIAL KEJADIAN BENCANA
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
              Pemetaan ini menyajikan gambaran komprehensif mengenai distribusi geografis dan
              lokasi kejadian bencana yang dilaporkan.
            </p>
            <div className="mt-4 h-[300px] sm:h-[350px] md:h-[420px] xl:h-[470px]">
              <DisasterMap markers={data.markers} />
            </div>
          </article>

        </div>
      </section>

      {/* Donut Charts & Disease Risks Grid */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Pie Chart 1: Jenis Bencana */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]">
          <h3 className="text-base font-bold text-slate-900">DISTRIBUSI JENIS BENCANA</h3>
          <p className="text-xs text-slate-500 mb-4">Persentase kejadian berdasarkan tipe bencana.</p>
          <div className="h-[220px]">
            {isDbEmpty ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Ada Data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.jenis_bencana}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="jumlah"
                    nameKey="nama"
                  >
                    {data.jenis_bencana.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Pie Chart 2: Wilayah Bencana */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)]">
          <h3 className="text-base font-bold text-slate-900">DAERAH RAWAN KRISIS</h3>
          <p className="text-xs text-slate-500 mb-4">Distribusi bencana pada provinsi paling terdampak.</p>
          <div className="h-[220px]">
            {isDbEmpty || data.wilayah.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tidak Ada Data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.wilayah}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="jumlah"
                    nameKey="nama"
                  >
                    {data.wilayah.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* Post-Disaster Disease Risk */}
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,118,110,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4.5 w-4.5 text-teal-650" />
              <h3 className="text-base font-bold text-slate-900">RISIKO PENYAKIT PASCA-BENCANA</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Indeks kerentanan KLB penyakit menular di posko pengungsian.</p>

            <div className="space-y-3.5">
              {[
                { name: 'ISPA / Pneumonia', risk: isDbEmpty ? 0 : 85, color: 'bg-red-500' },
                { name: 'Penyakit Kulit & Gatal', risk: isDbEmpty ? 0 : 72, color: 'bg-orange-500' },
                { name: 'Diare Akut / Gastroenteritis', risk: isDbEmpty ? 0 : 65, color: 'bg-amber-500' },
                { name: 'Leptospirosis / Demam Tikus', risk: isDbEmpty ? 0 : 34, color: 'bg-indigo-500' },
              ].map((disease, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{disease.name}</span>
                    <span className="text-slate-900">{isDbEmpty ? 'N/A' : `${disease.risk}% Tingkat Bahaya`}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${disease.color}`} style={{ width: isDbEmpty ? '0%' : `${disease.risk}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{isDbEmpty ? 'Respons darurat belum diperlukan.' : 'Fokus respons: Penyediaan air bersih & posko obat-obatan.'}</span>
          </div>
        </article>
      </section>
    </div>
  )
}
