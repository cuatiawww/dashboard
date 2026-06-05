'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { X } from 'lucide-react'
import {
  ChartCardsSkeleton,
  StatCardsSkeleton,
  SummaryCardsSkeleton,
} from '@/components/psc119/DashboardSkeletons'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const IndonesiaMapPlaceholder = dynamic(
  () => import('@/components/psc119/IndonesiaMapPlaceholder'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
        <span className="text-gray-500">Memuat peta PK3D...</span>
      </div>
    ),
  }
)

const googleMapsKey = 'AIzaSyBXTugo1hwTo7HYsCInWH2tQBspD1QHTMY'

// Fallback static samples used only if the live dashboard API is unavailable.
const summaryCards = [
  {
    id: 'total-psc-pk3d',
    title: 'TOTAL AMBULAN PSC 119',
    value: '#NA',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    iconBgClass: 'bg-[#ffd7d7]',
    titleClass: 'text-[#d62828]',
    valueClass: 'text-[#c82333]',
    buttonClass: 'bg-[#c82333] hover:bg-[#aa1d2b]',
    iconSrc: '/card/tot-ambulan-psc.svg',
    baseline: 'Data belum terintegrasi',
  },
  {
    id: 'total-ambulan-pk3d',
    title: 'TOTAL AMBULAN ON DUTY',
    value: '#NA',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    iconBgClass: 'bg-[#ffe0b8]',
    titleClass: 'text-[#f97316]',
    valueClass: 'text-[#d45b0f]',
    buttonClass: 'bg-[#f29b38] hover:bg-[#db8623]',
    iconSrc: '/card/tot-ambulan.svg',
    baseline: 'Data belum terintegrasi',
  },
  {
    id: 'on-duty-pk3d',
    title: 'TOTAL AMBULAN READY',
    value: '#NA',
    borderClass: 'border-[#edd56b]',
    bgClass: 'bg-[#fffdf0]',
    iconBgClass: 'bg-[#ffe76a]',
    titleClass: 'text-[#c88a00]',
    valueClass: 'text-[#a56a00]',
    buttonClass: 'bg-[#a56a00] hover:bg-[#875700]',
    iconSrc: '/card/ambulan.svg',
    baseline: 'Data belum terintegrasi',
  },
  {
    id: 'standby-pk3d',
    title: 'TOTAL AMBULAN OFF',
    value: '#NA',
    borderClass: 'border-[#9fd0cf]',
    bgClass: 'bg-[#f2fbfb]',
    iconBgClass: 'bg-[#cce8e7]',
    titleClass: 'text-[#0f7c7b]',
    valueClass: 'text-[#0b6a69]',
    buttonClass: 'bg-[#0f7c7b] hover:bg-[#0b6665]',
    iconSrc: '/card/maintain.svg',
    baseline: 'Data belum terintegrasi',
  },
]

const summaryPopupData = {
  'total-psc-pk3d': {
    columns: ['Wilayah', 'Jumlah PSC'],
    rows: [
      ['Jakarta Timur', '28'],
      ['Jakarta Barat', '24'],
      ['Jakarta Selatan', '20'],
      ['Jakarta Utara', '18'],
      ['Jakarta Pusat', '15'],
    ],
  },
  'total-ambulan-pk3d': {
    columns: ['Wilayah', 'Jumlah Ambulan'],
    rows: [
      ['Jakarta Timur', '8'],
      ['Jakarta Barat', '5'],
      ['Jakarta Selatan', '4'],
      ['Jakarta Utara', '3'],
      ['Jakarta Pusat', '3'],
    ],
  },
  'on-duty-pk3d': {
    columns: ['Wilayah', 'Unit Aktif'],
    rows: [
      ['Jakarta Timur', '16'],
      ['Jakarta Barat', '14'],
      ['Jakarta Selatan', '13'],
      ['Jakarta Utara', '12'],
      ['Jakarta Pusat', '11'],
    ],
  },
  'standby-pk3d': {
    columns: ['Wilayah', 'Unit Standby'],
    rows: [
      ['Jakarta Timur', '4'],
      ['Jakarta Barat', '3'],
      ['Jakarta Selatan', '3'],
      ['Jakarta Utara', '2'],
      ['Jakarta Pusat', '2'],
    ],
  },
} as const

// Fallback static samples used only if the live dashboard API is unavailable.
const spatialStats = [
  {
    label: 'TOTAL PERMINTAAN AMBULAN HARI INI',
    value: '#NA',
    detail: 'Data belum terintegrasi',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    titleClass: 'text-[#ef4444]',
    valueClass: 'text-[#d62828]',
  },
  {
    label: 'TOTAL AMBULAN RESPON PANGGILAN',
    value: '#NA',
    detail: 'Data belum terintegrasi',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    titleClass: 'text-[#d99000]',
    valueClass: 'text-[#a56a00]',
  },
]

// Fallback static samples used only if a PK3D-specific API is not available yet.
const bottomStats = [
  {
    label: 'PRA FASILITAS',
    value: '#NA',
    change: 'Data belum terintegrasi',
    baseline: '',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    titleClass: 'text-[#d62828]',
    valueClass: 'text-[#c82333]',
  },
  {
    label: 'DUKUNGAN KESEHATAN',
    value: '#NA',
    change: 'Data belum terintegrasi',
    baseline: '',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    titleClass: 'text-[#d45b0f]',
    valueClass: 'text-[#d45b0f]',
  },
  {
    label: 'ANTAR FASILITAS KESEHATAN',
    value: '#NA',
    change: 'Data belum terintegrasi',
    baseline: '',
    borderClass: 'border-[#edd56b]',
    bgClass: 'bg-[#fffdf0]',
    titleClass: 'text-[#a56a00]',
    valueClass: 'text-[#a56a00]',
  },
  {
    label: 'NON EMERGENCY',
    value: '#NA',
    change: 'Data belum terintegrasi',
    baseline: '',
    borderClass: 'border-[#9fd0cf]',
    bgClass: 'bg-[#f2fbfb]',
    titleClass: 'text-[#0b6a69]',
    valueClass: 'text-[#0b6a69]',
  },
]

// Fallback static samples used only if the live dashboard API is unavailable.
const areaBarCards = [
  {
    title: 'KAB/KOTA',
    titleClass: 'text-blue-600',
    borderClass: 'border-blue-200',
    data: [
      { name: 'Jakarta Timur', gadar: 18, transport: 7 },
      { name: 'Jakarta Selatan', gadar: 16, transport: 6 },
      { name: 'Jakarta Barat', gadar: 14, transport: 6 },
      { name: 'Jakarta Utara', gadar: 12, transport: 5 },
      { name: 'Jakarta Pusat', gadar: 10, transport: 4 },
    ],
  },
  {
    title: 'PSC 119',
    titleClass: 'text-[#ef4444]',
    borderClass: 'border-[#f2b8b8]',
    data: [
      { name: 'PK3D Matraman', gadar: 9, transport: 4 },
      { name: 'PK3D Kebayoran', gadar: 8, transport: 3 },
      { name: 'PK3D Grogol', gadar: 7, transport: 3 },
      { name: 'PK3D Tanjung Priok', gadar: 6, transport: 2 },
      { name: 'PK3D Cempaka Putih', gadar: 5, transport: 2 },
    ],
  },
]

// Fallback static samples used only if a PK3D-specific trend API is not available yet.
const trendData = [
  { day: '01 Apr', label: '1 April 2026', monitored: 12, responded: 7 },
  { day: '02 Apr', label: '2 April 2026', monitored: 18, responded: 10 },
  { day: '03 Apr', label: '3 April 2026', monitored: 23, responded: 14 },
  { day: '04 Apr', label: '4 April 2026', monitored: 29, responded: 19 },
  { day: '05 Apr', label: '5 April 2026', monitored: 34, responded: 23 },
  { day: '06 Apr', label: '6 April 2026', monitored: 39, responded: 28 },
  { day: '07 Apr', label: '7 April 2026', monitored: 45, responded: 33 },
  { day: '08 Apr', label: '8 April 2026', monitored: 51, responded: 39 },
  { day: '09 Apr', label: '9 April 2026', monitored: 56, responded: 44 },
  { day: '10 Apr', label: '10 April 2026', monitored: 61, responded: 48 },
  { day: '11 Apr', label: '11 April 2026', monitored: 67, responded: 53 },
  { day: '12 Apr', label: '12 April 2026', monitored: 72, responded: 58 },
  { day: '13 Apr', label: '13 April 2026', monitored: 76, responded: 62 },
  { day: '14 Apr', label: '14 April 2026', monitored: 81, responded: 67 },
  { day: '15 Apr', label: '15 April 2026', monitored: 85, responded: 71 },
  { day: '16 Apr', label: '16 April 2026', monitored: 88, responded: 74 },
  { day: '17 Apr', label: '17 April 2026', monitored: 91, responded: 78 },
  { day: '18 Apr', label: '18 April 2026', monitored: 94, responded: 82 },
  { day: '19 Apr', label: '19 April 2026', monitored: 96, responded: 85 },
  { day: '20 Apr', label: '20 April 2026', monitored: 98, responded: 88 },
]

type TrendTooltipEntry = {
  color?: string
  name?: string
  value?: number
  payload?: {
    label?: string
  }
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TrendTooltipEntry[]
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0)

  return (
    <div className="min-w-[260px] rounded-xl border-2 border-gray-300 bg-white p-4 shadow-xl">
      <p className="mb-3 border-b pb-2 text-base font-bold text-gray-900">
        {payload[0]?.payload?.label || 'Detail Tren'}
      </p>
      <div className="space-y-2">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color || '#047D78' }}
              />
              <span className="text-sm font-medium text-gray-700">
                {entry.name}:
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {(entry.value || 0).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Total:</span>
          <span className="text-sm font-bold text-primary">
            {total.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Pk3dJakartaPage() {
  type SummaryResponse = {
    psc?: {
      total?: number
    }
    ambulan?: {
      total_gadar?: number
      total_transport?: number
    }
    ambulan_on_duty?: {
      hari_ini?: number
      kemarin?: number
    }
    ambulan_standby?: {
      hari_ini?: number
      kemarin?: number
    }
    permintaan_ambulan?: {
      hari_ini?: number
      kemarin?: number
      persentase?: number
    }
    ambulan_respon?: {
      persentase_respon?: number
      persentase_terlayani?: number
      persentase_pending?: number
    }
  }

  const [activeSummaryCardId, setActiveSummaryCardId] =
    useState<keyof typeof summaryPopupData | null>(null)
  const [dashboardSummaryCards, setDashboardSummaryCards] = useState(summaryCards)
  const [dashboardSpatialStats, setDashboardSpatialStats] = useState(spatialStats)
  const [dashboardAreaBarCards] = useState(areaBarCards)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const activeSummaryDetail = activeSummaryCardId
    ? summaryPopupData[activeSummaryCardId]
    : null

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        setIsDashboardLoading(true)
        const requestBody = { kode_provinsi: '31' }
        const summaryRes = await fetch('/api/psc119/dashboard/rekap-dashboard-psc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          cache: 'no-store',
        })

        if (!summaryRes.ok) {
          throw new Error('Gagal memuat dashboard DKI Jakarta')
        }

        await summaryRes.json()

        if (!active) return

        setDashboardSummaryCards(summaryCards)
        setDashboardSpatialStats(spatialStats)
      } catch {
        if (!active) return
      } finally {
        if (active) setIsDashboardLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-white pb-16 pt-14 lg:pb-20 lg:pt-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="space-y-8 lg:space-y-10">
            <div className="text-center">
              <h1 className="mb-5 text-[2.7rem] font-bold uppercase leading-[1.08] text-gray-900 md:text-[3.2rem] lg:text-[3.6rem]">
                Dashboard Ambulan PK3D
                <br />
                <span className="text-primary">DKI Jakarta Tahun 2026</span>
              </h1>
              <p className="text-[1.04rem] leading-relaxed text-gray-600 lg:text-[1.14rem]">
                Pusat pemantauan data operasional ambulan PK3D DKI Jakarta secara real-time, mencakup jumlah armada, persebaran, respons layanan, dan tren pemantauan bulanan.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">Ringkasan Sebaran Ambulan PK3D</h2>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-gray-600">
              Menyajikan data rekapitulasi dan pemetaan distribusi armada Ambulan PK3D untuk memantau ketersediaan layanan gawat darurat secara komprehensif.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Detail
            </Link>
          </div>

          {isDashboardLoading ? (
            <SummaryCardsSkeleton />
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardSummaryCards.map((card) => (
              <div key={card.title} className={`rounded-2xl border ${card.borderClass} ${card.bgClass} p-5 text-center`}>
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${card.iconBgClass}`}>
                  <Image src={card.iconSrc} alt={card.title} width={24} height={24} className="h-6 w-6 object-contain" />
                </div>
                <p className={`mb-3 text-sm font-bold uppercase leading-snug ${card.titleClass}`}>{card.title}</p>
                <p className={`mb-4 text-5xl font-bold tracking-tight ${card.valueClass}`}>{card.value}</p>
                <button
                  type="button"
                  disabled
                  className={`mb-4 rounded-full px-4 py-1.5 text-xs font-semibold text-white opacity-50 ${card.buttonClass}`}
                >
                  Detail
                </button>
                <p className="text-[11px] text-gray-600">{card.baseline}</p>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-stretch">
            <div>
              <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">Sebaran Spasial Ambulan PK3D</h2>
              <p className="mb-5 max-w-xl text-base leading-relaxed text-gray-600">
                Pemantauan real-time terhadap distribusi dan respons unit ambulan PK3D di wilayah DKI Jakarta.
              </p>
              <Link
                href="/"
                className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Detail
              </Link>
            </div>

            {isDashboardLoading ? (
              <StatCardsSkeleton count={2} />
            ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:h-full">
              {dashboardSpatialStats.map((stat) => (
                <div key={stat.label} className={`flex h-full flex-col justify-between rounded-2xl border ${stat.borderClass} ${stat.bgClass} p-5 text-center`}>
                  <p className={`mb-3 text-sm font-bold uppercase leading-snug ${stat.titleClass}`}>{stat.label}</p>
                  <div className="flex flex-1 flex-col justify-center">
                    <p className={`mb-3 text-5xl font-bold tracking-tight ${stat.valueClass}`}>{stat.value}</p>
                    <p className="text-[11px] text-gray-600">{stat.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <IndonesiaMapPlaceholder
              tileUrl={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`}
              attribution="&copy; Google"
              jakartaOnly
              kodeProvinsi="31"
              showLegend={false}
              showBottomPanel={false}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {bottomStats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border ${stat.borderClass} ${stat.bgClass} p-5 text-center`}>
                <p className={`mb-3 text-sm font-bold uppercase leading-snug ${stat.titleClass}`}>{stat.label}</p>
                <p className={`mb-3 text-5xl font-bold tracking-tight ${stat.valueClass}`}>{stat.value}</p>
                <p className="text-[11px] text-gray-600">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">Sebaran Ambulan PK3D</h2>
            <p className="text-base leading-relaxed text-gray-600">
              Menampilkan rincian data jumlah, lokasi, dan status operasional armada ambulan PSC 119 yang dikelompokkan berdasarkan provinsi dan kabupaten/kota.
            </p>
          </div>

          {isDashboardLoading ? (
            <ChartCardsSkeleton count={2} />
          ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {dashboardAreaBarCards.map((card) => (
              <Card
                key={card.title}
                className={`border-2 ${card.borderClass} rounded-2xl bg-white text-slate-950 shadow-lg transition-shadow hover:shadow-xl dark:!border-slate-200 dark:!bg-white dark:!text-slate-950`}
              >
                <CardContent className="p-6">
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <h3 className={`text-2xl font-bold uppercase ${card.titleClass}`}>{card.title}</h3>
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                      Detail
                    </button>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={card.data}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={92} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="gadar" name="Ambulan Gadar" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="transport" name="Ambulan Transport" stackId="a" fill="#0F8784" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </section> */}

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">Tren Pantauan Ambulan PK3D</h2>
            <p className="text-base leading-relaxed text-gray-600">
              Menyajikan visualisasi data historis dan grafik operasional armada Ambulan PK3D untuk memantau pola dan frekuensi layanan dari waktu ke waktu.
            </p>
          </div>

          <Card className="rounded-2xl border-2 border-gray-200 bg-white text-slate-950 shadow-lg dark:!border-slate-200 dark:!bg-white dark:!text-slate-950">
            <CardContent className="p-6 lg:p-8">
              <h3 className="mb-4 text-lg font-bold text-gray-800">
                Tren Pantauan PK3D DKI Jakarta
              </h3>

              <ResponsiveContainer width="100%" height={500}>
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="day"
                    height={52}
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                  <Brush
                    dataKey="day"
                    height={26}
                    stroke="#047D78"
                    fill="#f0f0f0"
                    travellerWidth={10}
                  />
                  <Line
                    type="monotone"
                    dataKey="monitored"
                    stroke="#EF4444"
                    strokeWidth={3}
                    name="Total Permintaan Ambulan"
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="responded"
                    stroke="#047D78"
                    strokeWidth={3}
                    name="Total Ambulan di Mobilisasi"
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {activeSummaryDetail && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
          onClick={() => setActiveSummaryCardId(null)}
        >
          <div
            className="relative w-full max-w-[440px] rounded-[28px] bg-white px-7 pb-6 pt-14 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveSummaryCardId(null)}
              className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup detail"
            >
              <X className="h-5 w-5" />
            </button>

            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr>
                  {activeSummaryDetail.columns.map((column, index) => (
                    <th
                      key={column}
                      className={`bg-primary px-5 py-3 text-left text-sm font-semibold text-white ${
                        index === 0 ? 'rounded-l-2xl' : 'rounded-r-2xl text-right'
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSummaryDetail.rows.map((row, index) => (
                  <tr key={row[0]}>
                    <td
                      className={`px-5 py-2 text-[15px] text-[#0f7c7b] ${
                        index % 2 === 0 ? 'bg-[#f3f4f6]' : 'bg-white'
                      }`}
                    >
                      {row[0]}
                    </td>
                    <td
                      className={`px-5 py-2 text-right text-[15px] font-medium text-[#0f7c7b] ${
                        index % 2 === 0 ? 'bg-[#f3f4f6]' : 'bg-white'
                      }`}
                    >
                      {row[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setActiveSummaryCardId(null)}
                className="rounded-full bg-primary px-6 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
