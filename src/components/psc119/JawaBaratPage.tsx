'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { X } from 'lucide-react'
import HeroFilterPanel from '@/components/psc119/HeroFilterPanel'
import {
  ChartCardsSkeleton,
  RealtimeTableSkeleton,
  StatCardsSkeleton,
  SummaryCardsSkeleton,
} from '@/components/psc119/DashboardSkeletons'
import { Card, CardContent } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
        <span className="text-gray-500">Memuat peta Jawa Barat...</span>
      </div>
    ),
  }
)

// Fallback static samples used only if the live dashboard API is unavailable.
const summaryCards = [
  {
    id: 'total-psc-jabar',
    title: 'TOTAL PSC 119',
    value: '52',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    iconBgClass: 'bg-[#ffd7d7]',
    titleClass: 'text-[#d62828]',
    valueClass: 'text-[#c82333]',
    buttonClass: 'bg-[#c82333] hover:bg-[#aa1d2b]',
    iconSrc: '/card/psc.svg',
    baseline: '50',
  },
  {
    id: 'total-ambulan-jabar',
    title: 'TOTAL AMBULAN PSC 119',
    value: '112',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    iconBgClass: 'bg-[#ffe0b8]',
    titleClass: 'text-[#f97316]',
    valueClass: 'text-[#d45b0f]',
    buttonClass: 'bg-[#f29b38] hover:bg-[#db8623]',
    iconSrc: '/card/tot-ambulan-psc.svg',
    baseline: '104',
  },
  {
    id: 'on-duty-jabar',
    title: 'AMBULAN ON DUTY HARI INI',
    value: '42',
    borderClass: 'border-[#edd56b]',
    bgClass: 'bg-[#fffdf0]',
    iconBgClass: 'bg-[#ffe76a]',
    titleClass: 'text-[#c88a00]',
    valueClass: 'text-[#a56a00]',
    buttonClass: 'bg-[#a56a00] hover:bg-[#875700]',
    iconSrc: '/card/tot-ambulan.svg',
    baseline: '39',
  },
  {
    id: 'standby-jabar',
    title: 'TOTAL AMBULAN STANDBY',
    value: '53',
    borderClass: 'border-[#9fd0cf]',
    bgClass: 'bg-[#f2fbfb]',
    iconBgClass: 'bg-[#cce8e7]',
    titleClass: 'text-[#0f7c7b]',
    valueClass: 'text-[#0b6a69]',
    buttonClass: 'bg-[#0f7c7b] hover:bg-[#0b6665]',
    iconSrc: '/card/ambulan.svg',
    baseline: '49',
  },
]

const summaryPopupData = {
  'total-psc-jabar': {
    columns: ['Kab/Kota', 'Jumlah PSC'],
    rows: [
      ['Kota Bandung', '12'],
      ['Kota Bekasi', '9'],
      ['Kab. Bekasi', '8'],
      ['Kota Bogor', '7'],
      ['Kab. Karawang', '6'],
    ],
  },
  'total-ambulan-jabar': {
    columns: ['Kab/Kota', 'Jumlah Ambulan'],
    rows: [
      ['Kota Bandung', '24'],
      ['Kota Bekasi', '18'],
      ['Kab. Bekasi', '16'],
      ['Kota Bogor', '14'],
      ['Kab. Karawang', '12'],
    ],
  },
  'on-duty-jabar': {
    columns: ['Kab/Kota', 'Unit Aktif'],
    rows: [
      ['Kota Bandung', '11'],
      ['Kota Bekasi', '9'],
      ['Kab. Bekasi', '8'],
      ['Kota Bogor', '7'],
      ['Kab. Karawang', '7'],
    ],
  },
  'standby-jabar': {
    columns: ['Kab/Kota', 'Unit Standby'],
    rows: [
      ['Kota Bandung', '13'],
      ['Kota Bekasi', '9'],
      ['Kab. Bekasi', '8'],
      ['Kota Bogor', '7'],
      ['Kab. Karawang', '6'],
    ],
  },
} as const

// Fallback static samples used only if the live dashboard API is unavailable.
const spatialStats = [
  {
    label: 'TOTAL PERMINTAAN AMBULAN HARI INI',
    value: '525',
    detail: '+4,0% | Kemarin: 503',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    titleClass: 'text-[#ef4444]',
    valueClass: 'text-[#d62828]',
  },
  {
    label: 'TOTAL AMBULAN RESPON PANGGILAN',
    value: '88%',
    detail: '462 terlayani | 63 pending',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    titleClass: 'text-[#d99000]',
    valueClass: 'text-[#a56a00]',
  },
]

// Fallback static samples used only if the live dashboard API is unavailable.
const areaBarCards = [
  {
    title: 'KAB/KOTA',
    titleClass: 'text-blue-600',
    borderClass: 'border-blue-200',
    data: [
      { name: 'Bandung', gadar: 28, transport: 12 },
      { name: 'Bekasi', gadar: 24, transport: 10 },
      { name: 'Bogor', gadar: 21, transport: 9 },
      { name: 'Karawang', gadar: 18, transport: 8 },
      { name: 'Cirebon', gadar: 15, transport: 7 },
    ],
  },
  {
    title: 'PSC 119',
    titleClass: 'text-[#ef4444]',
    borderClass: 'border-[#f2b8b8]',
    data: [
      { name: 'PSC 119 Bandung', gadar: 25, transport: 11 },
      { name: 'PSC 119 Bekasi', gadar: 21, transport: 9 },
      { name: 'PSC 119 Bogor', gadar: 19, transport: 8 },
      { name: 'PSC 119 Karawang', gadar: 16, transport: 7 },
      { name: 'PSC 119 Cirebon', gadar: 14, transport: 6 },
    ],
  },
]

// Fallback static samples used only if the live dashboard API is unavailable.
const realtimeRows = [
  {
    id: '01',
    pscName: 'PSC 119 Kota Bandung',
    province: 'Jawa Barat',
    serviceDate: '2 April 2026 10:13:54 WIB',
    reporter: 'M. Lutfi',
    ambulanceCode: 'PSC8523',
    responseTime: '01:47',
  },
  {
    id: '02',
    pscName: 'PSC 119 Kota Bekasi',
    province: 'Jawa Barat',
    serviceDate: '2 April 2026 12:23:54 WIB',
    reporter: 'M. Ridwan',
    ambulanceCode: 'PSC42312',
    responseTime: '02:31',
  },
  {
    id: '03',
    pscName: 'PSC 119 Kab. Bekasi',
    province: 'Jawa Barat',
    serviceDate: '2 April 2026 15:13:54 WIB',
    reporter: 'Anditani',
    ambulanceCode: 'PSC3141',
    responseTime: '01:51',
  },
]

export default function JawaBaratPage() {
  type SummaryResponse = {
    psc?: {
      total?: number
      tahun_sebelumnya?: number
      total_psc_tahun_lalu?: number
      persentase?: number
    }
    ambulan?: {
      total_gadar?: number
      total_transport?: number
    }
    ambulan_on_duty?: {
      hari_ini?: number
      kemarin?: number
      persentase?: number
    }
    ambulan_standby?: {
      hari_ini?: number
      kemarin?: number
      persentase?: number
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

  type RegionItem = {
    nama_kabupaten?: string
    nama_psc?: string
    jumlah_ambulan_gadar?: number
    jumlah_ambulan_transport?: number
  }

  type RegionResponse = {
    data?: {
      kabupaten?: RegionItem[]
      psc?: RegionItem[]
    }
  }

  type CallRow = {
    nama_psc?: string
    nama_provinsi?: string
    waktu_panggilan?: string
    nama_pelapor?: string
    kode_ambulan?: string
    ticket_id?: string
    response_time?: string | number
    status?: string
  }

  type CallsResponse = {
    tgl_awal?: string
    tgl_akhir?: string
    data?: CallRow[]
  }

  const formatNumber = (value?: number) => (value ?? 0).toLocaleString('id-ID')
  const formatSignedPercent = (value?: number) => {
    const amount = Number(value ?? 0)
    return `${amount > 0 ? '+' : ''}${amount.toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })}%`
  }
  const formatPercent = (value?: number) =>
    `${Number(value ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
  const [activeSummaryCardId, setActiveSummaryCardId] =
    useState<keyof typeof summaryPopupData | null>(null)
  const [selectedPsc, setSelectedPsc] = useState('')
  const [pscFilterOptions, setPscFilterOptions] = useState([
    { value: '', label: 'Masukkan nama PSC 119' },
  ])
  const [dashboardSummaryCards, setDashboardSummaryCards] = useState(summaryCards)
  const [dashboardSpatialStats, setDashboardSpatialStats] = useState(spatialStats)
  const [dashboardAreaBarCards, setDashboardAreaBarCards] = useState(areaBarCards)
  const [dashboardRealtimeRows, setDashboardRealtimeRows] = useState(realtimeRows)
  const [realtimeRangeLabel, setRealtimeRangeLabel] = useState('02 Mar 2026 - 02 Apr 2026')
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const activeSummaryDetail = activeSummaryCardId
    ? summaryPopupData[activeSummaryCardId]
    : null

  const handleResetFilter = () => {
    setSelectedPsc('')
  }

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        setIsDashboardLoading(true)
        const requestBody = { kode_provinsi: '32' }
        const [summaryRes, regionRes, callsRes] = await Promise.all([
          fetch('/api/psc119/dashboard/rekap-dashboard-psc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            cache: 'no-store',
          }),
          fetch('/api/psc119/dashboard/sebaran-ambulan-wilayah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            cache: 'no-store',
          }),
          fetch('/api/psc119/dashboard/panggilan-terkini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            cache: 'no-store',
          }),
        ])

        if (!summaryRes.ok || !regionRes.ok || !callsRes.ok) {
          throw new Error('Gagal memuat dashboard Jawa Barat')
        }

        const summaryData = (await summaryRes.json()) as SummaryResponse
        const regionData = (await regionRes.json()) as RegionResponse
        const callsData = (await callsRes.json()) as CallsResponse

        if (!active) return

        const totalAmbulance =
          Number(summaryData.ambulan?.total_gadar || 0) +
          Number(summaryData.ambulan?.total_transport || 0)

        setDashboardSummaryCards([
          {
            ...summaryCards[0],
            value: formatNumber(summaryData.psc?.total || 0),
            baseline: formatNumber(summaryData.psc?.total_psc_tahun_lalu || 0),
          },
          {
            ...summaryCards[1],
            value: formatNumber(totalAmbulance),
            baseline: formatNumber(summaryData.ambulan_on_duty?.hari_ini || 0),
          },
          {
            ...summaryCards[2],
            value: formatNumber(summaryData.ambulan_on_duty?.hari_ini || 0),
            baseline: formatNumber(summaryData.ambulan_on_duty?.kemarin || 0),
          },
          {
            ...summaryCards[3],
            value: formatNumber(summaryData.ambulan_standby?.hari_ini || 0),
            baseline: formatNumber(summaryData.ambulan_standby?.kemarin || 0),
          },
        ])

        setDashboardSpatialStats([
          {
            ...spatialStats[0],
            value: formatNumber(summaryData.permintaan_ambulan?.hari_ini || 0),
            detail: `${formatSignedPercent(summaryData.permintaan_ambulan?.persentase)} | Kemarin: ${formatNumber(summaryData.permintaan_ambulan?.kemarin || 0)}`,
          },
          {
            ...spatialStats[1],
            value: formatPercent(summaryData.ambulan_respon?.persentase_respon),
            detail: `${formatPercent(summaryData.ambulan_respon?.persentase_terlayani)} terlayani | ${formatPercent(summaryData.ambulan_respon?.persentase_pending)} pending`,
          },
        ])

        setDashboardAreaBarCards([
          {
            ...areaBarCards[0],
            data: (regionData.data?.kabupaten || []).slice(0, 5).map((item, index) => ({
              name: String(item.nama_kabupaten || `Data ${index + 1}`).trim(),
              gadar: Number(item.jumlah_ambulan_gadar || 0),
              transport: Number(item.jumlah_ambulan_transport || 0),
            })),
          },
          {
            ...areaBarCards[1],
            data: (regionData.data?.psc || []).slice(0, 5).map((item, index) => ({
              name: String(item.nama_psc || `Data ${index + 1}`).trim(),
              gadar: Number(item.jumlah_ambulan_gadar || 0),
              transport: Number(item.jumlah_ambulan_transport || 0),
            })),
          },
        ])

        const nextPscOptions = [
          { value: '', label: 'Masukkan nama PSC 119' },
          ...(regionData.data?.psc || [])
            .map((item) => String(item.nama_psc || '').trim())
            .filter(Boolean)
            .filter((name, index, items) => items.indexOf(name) === index)
            .sort((a, b) => a.localeCompare(b, 'id'))
            .map((name) => ({
              value: name,
              label: name,
            })),
        ]

        setPscFilterOptions(nextPscOptions)

        setDashboardRealtimeRows(
          (callsData.data || []).slice(0, 20).map((row, index) => ({
            id: String(index + 1).padStart(2, '0'),
            pscName: row.nama_psc || '-',
            province: row.nama_provinsi || 'Jawa Barat',
            serviceDate: row.waktu_panggilan || '-',
            reporter: row.nama_pelapor || '-',
            ambulanceCode: row.kode_ambulan || row.ticket_id || '-',
            responseTime:
              row.response_time !== undefined && row.response_time !== null
                ? String(row.response_time)
                : row.status || '-',
          })),
        )

        if (callsData.tgl_awal && callsData.tgl_akhir) {
          setRealtimeRangeLabel(`${callsData.tgl_awal} - ${callsData.tgl_akhir}`)
        }
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
                Dashboard Ambulan PSC 119
                <br />
                <span className="text-primary">Provinsi Jawa Barat Tahun 2026</span>
              </h1>
              <p className="text-[1.04rem] leading-relaxed text-gray-600 lg:text-[1.14rem]">
                Pusat informasi dan pemantauan real-time operasional layanan kegawatdaruratan medis PSC 119 di seluruh wilayah Jawa Barat, mencakup unit, armada, sebaran spasial, respons layanan, dan data panggilan harian untuk membantu pengambilan keputusan yang cepat dan merata bagi masyarakat Jawa Barat.
              </p>
            </div>

            <HeroFilterPanel
              showProvinceFilter={false}
              // Filter provinsi sementara dinonaktifkan.
              pscId="filter-psc-jabar"
              pscLabel="Pilih PSC 119"
              pscValue={selectedPsc}
              onPscChange={setSelectedPsc}
              pscOptions={pscFilterOptions}
              onReset={handleResetFilter}
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">
              Ringkasan Sebaran Ambulan PSC 119 Provinsi Jawa Barat
            </h2>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-gray-600">
              Ringkasan data yang memberikan gambaran distribusi armada ambulan PSC 119 yang tersebar di seluruh wilayah Jawa Barat.
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
                  onClick={() =>
                    setActiveSummaryCardId(card.id as keyof typeof summaryPopupData)
                  }
                  className={`mb-4 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors ${card.buttonClass}`}
                >
                  Detail
                </button>
                <p className="text-[11px] text-gray-600">+5,0% | Kemarin: {card.baseline}</p>
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
              <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">
                Sebaran Spasial Ambulan PSC 119 Provinsi Jawa Barat
              </h2>
              <p className="mb-5 max-w-xl text-base leading-relaxed text-gray-600">
                Pemantauan harian secara real-time terhadap distribusi armada PSC 119
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
              kodeProvinsi="32"
              showTickets={false}
              showLegend={false}
              showBottomPanel={false}
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">
              Sebaran Ambulan PSC 119 Provinsi Jawa Barat
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Menampilkan kecenderungan jumlah unit yang aktif dalam operasional ambulan di wilayah Jawa Barat berdasarkan kota/kabupaten dan unit PSC 119.
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
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
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
      </section>

      <section className="bg-white py-12 lg:py-14">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="mb-3 text-3xl font-bold uppercase text-gray-900">
              Realtime Ambulan PSC 119 Provinsi Jawa Barat
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Monitoring unit ambulans PSC 119 yang bertugas secara real-time untuk mempercepat respons layanan darurat.
            </p>
          </div>

          {isDashboardLoading ? (
            <RealtimeTableSkeleton />
          ) : (
          <div className="rounded-2xl border border-teal-100 bg-white p-3">
            <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3">
              <h3 className="text-lg font-bold text-gray-900 uppercase">
                Panggilan Terkini <span className="text-base font-semibold normal-case text-gray-600">({realtimeRangeLabel})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="rounded-l-xl px-4 py-4 text-center font-semibold whitespace-nowrap w-[52px]"></th>
                    <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">Nama PSC</th>
                    <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">Provinsi</th>
                    <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">Tgl Layanan</th>
                    <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">Nama Pelapor</th>
                    <th className="px-4 py-4 text-left font-semibold whitespace-nowrap">Kode Ambulans</th>
                    <th className="px-4 py-4 text-center font-semibold whitespace-nowrap">Waktu Respon</th>
                    <th className="rounded-r-xl px-4 py-4 text-center font-semibold whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardRealtimeRows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}>
                      <td className="px-4 py-4 text-center font-semibold text-gray-700">{row.id}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">{row.pscName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">{row.province}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">{row.serviceDate}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">{row.reporter}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">{row.ambulanceCode}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-gray-700">{row.responseTime}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#25D366] text-white transition-colors hover:bg-[#1fb257]" aria-label="WhatsApp">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                            </svg>
                          </button>
                          <button className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#1877F2] text-white transition-colors hover:bg-[#1365cf]" aria-label="Telepon">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                          <button className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#2f80ed] text-white transition-colors hover:bg-[#216fd7]" aria-label="Detail Ticket">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6M7 8h10M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
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
