'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { X } from 'lucide-react'
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
      <div className="flex h-[420px] items-center justify-center rounded-2xl border-2 border-gray-200 bg-gray-100 shadow-lg">
        <span className="text-gray-500">Memuat peta Indonesia...</span>
      </div>
    ),
  }
)

type SummaryCard = {
  id: 'total-psc' | 'total-ambulan-psc' | 'on-duty' | 'standby'
  title: string
  value: string
  detailLabel: string
  footerType: 'yearly' | 'breakdown' | 'daily'
  change?: string
  yearLabel?: string
  baseline?: string
  previous?: string
  gadar?: string
  transport?: string
  gps?: string
  borderClass: string
  bgClass: string
  iconBgClass: string
  titleClass: string
  valueClass: string
  buttonClass: string
  iconSrc: string
  iconAlt: string
  trendClass: string
}

// Fallback static samples used only if the live dashboard API is unavailable.
const ambulanceSummaryCards: SummaryCard[] = [
  {
    id: 'total-psc',
    title: 'TOTAL PSC 119',
    value: '386',
    detailLabel: 'Detail',
    footerType: 'yearly',
    change: '+5%',
    yearLabel: 'Kemarin',
    baseline: '500',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    iconBgClass: 'bg-[#ffd7d7]',
    titleClass: 'text-[#d62828]',
    valueClass: 'text-[#c82333]',
    buttonClass: 'bg-[#c82333] hover:bg-[#aa1d2b] text-white',
    iconSrc: '/card/psc.svg',
    iconAlt: 'Total PSC 119',
    trendClass: 'text-[#6b7280]',
  },
  {
    id: 'total-ambulan-psc',
    title: 'TOTAL AMBULAN PSC 119',
    value: '126',
    detailLabel: 'Detail',
    footerType: 'yearly',
    change: '+5%',
    yearLabel: 'Kemarin',
    baseline: '242',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    iconBgClass: 'bg-[#ffe0b8]',
    titleClass: 'text-[#f97316]',
    valueClass: 'text-[#d45b0f]',
    buttonClass: 'bg-[#f29b38] hover:bg-[#db8623] text-white',
    iconSrc: '/card/tot-ambulan-psc.svg',
    iconAlt: 'Total ambulan PSC 119',
    trendClass: 'text-[#6b7280]',
  },
  {
    id: 'on-duty',
    title: 'AMBULAN ON DUTY HARI INI',
    value: '2.159',
    detailLabel: 'Detail',
    footerType: 'daily',
    change: '+8,0%',
    previous: '134',
    borderClass: 'border-[#edd56b]',
    bgClass: 'bg-[#fffdf0]',
    iconBgClass: 'bg-[#ffe76a]',
    titleClass: 'text-[#c88a00]',
    valueClass: 'text-[#a56a00]',
    buttonClass: 'bg-[#a56a00] hover:bg-[#875700] text-white',
    iconSrc: '/card/tot-ambulan.svg',
    iconAlt: 'Ambulan on duty hari ini',
    trendClass: 'text-[#6b7280]',
  },
  {
    id: 'standby',
    title: 'AMBULAN STANDBY',
    value: '483',
    detailLabel: 'Detail',
    footerType: 'daily',
    change: '+9,0%',
    previous: '654',
    borderClass: 'border-[#9fd0cf]',
    bgClass: 'bg-[#f2fbfb]',
    iconBgClass: 'bg-[#cce8e7]',
    titleClass: 'text-[#0f7c7b]',
    valueClass: 'text-[#0b6a69]',
    buttonClass: 'bg-[#0f7c7b] hover:bg-[#0b6665] text-white',
    iconSrc: '/card/ambulan.svg',
    iconAlt: 'Ambulan standby',
    trendClass: 'text-[#6b7280]',
  },
]

type SummaryResponse = {
  success?: boolean
  message?: string
  psc?: {
    total?: number
    tahun_sekarang?: number
    tahun_sebelumnya?: number
    total_psc_tahun_ini?: number
    total_psc_tahun_lalu?: number
    persentase?: number
  }
  ambulan?: {
    total_ambulan?: number
    total_gadar?: number
    total_transport?: number
    total_memiliki_gps?: number
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
  nama_provinsi?: string
  nama_kabupaten?: string
  nama_psc?: string
  jumlah_ambulan_gadar?: number
  jumlah_ambulan_transport?: number
}

type RegionResponse = {
  sukses?: number
  data?: {
    provinsi?: RegionItem[]
    kabupaten?: RegionItem[]
    psc?: RegionItem[]
  }
}

type CallRow = {
  ticket_id?: string
  status?: string
  jenis_layanan?: string
  waktu_panggilan?: string
  petugas_panggilan?: string
  nama_pelapor?: string
  nama_korban?: string
  alamat?: string
  url_whatsapp?: string
  url_telp?: string
  url_dashboard?: string
  nama_psc?: string
  nama_provinsi?: string
  kode_ambulan?: string
  response_time?: string | number
}

type CallsResponse = {
  sukses?: number
  tgl_awal?: string
  tgl_akhir?: string
  data?: CallRow[]
}

type RealtimeRow = {
  id: string
  pscName: string
  province: string
  serviceDate: string
  reporter: string
  ambulanceCode: string
  responseTime: string
}

type SummaryPopupDetail = {
  title: string
  columns: [string, string]
  rows: Array<[string, string]>
}

type RegionChartCardKey = 'provinsi' | 'kabupaten' | 'psc'

type RegionChartCard = {
  key: RegionChartCardKey
  title: string
  borderClass: string
  titleClass: string
  data: Array<{
    name: string
    gadar: number
    transport: number
  }>
}

type RegionMatrixDetail = {
  title: string
  subtitle: string
  labelColumn: string
  rows: Array<{
    label: string
    gadar: number
    transport: number
    total: number
  }>
  grandTotal: {
    gadar: number
    transport: number
    total: number
  }
}

type SummaryPopupResponse = {
  totalPscByProvince?: Array<{ provinceName?: string; totalPsc?: number }>
  totalAmbulanceByProvince?: Array<{ provinceName?: string; totalAmbulance?: number }>
  onDutyByProvince?: Array<{ provinceName?: string; totalActive?: number }>
  standbyByProvince?: Array<{ provinceName?: string; totalStandby?: number }>
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

const mapRegionRows = (items: RegionItem[] | undefined, labelKey: keyof RegionItem) =>
  (items || []).slice(0, 5).map((item, index) => ({
    name: String(item[labelKey] || `Data ${index + 1}`).trim(),
    gadar: Number(item.jumlah_ambulan_gadar || 0),
    transport: Number(item.jumlah_ambulan_transport || 0),
  }))

const buildRegionMatrixDetail = (
  items: RegionItem[] | undefined,
  labelKey: keyof RegionItem,
  title: string,
  subtitle: string,
  labelColumn: string,
): RegionMatrixDetail => {
  const rows = (items || []).map((item, index) => {
    const gadar = Number(item.jumlah_ambulan_gadar || 0)
    const transport = Number(item.jumlah_ambulan_transport || 0)

    return {
      label: String(item[labelKey] || `Data ${index + 1}`).trim(),
      gadar,
      transport,
      total: gadar + transport,
    }
  })

  const grandTotal = rows.reduce(
    (accumulator, row) => ({
      gadar: accumulator.gadar + row.gadar,
      transport: accumulator.transport + row.transport,
      total: accumulator.total + row.total,
    }),
    { gadar: 0, transport: 0, total: 0 },
  )

  return {
    title,
    subtitle,
    labelColumn,
    rows,
    grandTotal,
  }
}

const summaryPopupData: Record<string, SummaryPopupDetail> = {
  'total-psc': {
    title: 'Detail Total PSC 119',
    columns: ['Provinsi', 'Jumlah PSC'],
    rows: [
      ['DKI Jakarta', '124'],
      ['Jawa Barat', '111'],
      ['Jawa Tengah', '102'],
      ['Jawa Timur', '96'],
      ['Banten', '87'],
    ],
  },
  'total-ambulan-psc': {
    title: 'Detail Total Ambulan PSC 119',
    columns: ['Provinsi', 'Jumlah Ambulan'],
    rows: [
      ['DKI Jakarta', '328'],
      ['Jawa Barat', '301'],
      ['Jawa Tengah', '244'],
      ['Jawa Timur', '219'],
      ['Banten', '176'],
    ],
  },
  'on-duty': {
    title: 'Detail Ambulan On Duty Hari Ini',
    columns: ['Provinsi', 'Unit Aktif'],
    rows: [
      ['DKI Jakarta', '412'],
      ['Jawa Barat', '396'],
      ['Jawa Tengah', '352'],
      ['Jawa Timur', '315'],
      ['Banten', '281'],
    ],
  },
  standby: {
    title: 'Detail Ambulan Standby',
    columns: ['Provinsi', 'Unit Standby'],
    rows: [
      ['DKI Jakarta', '96'],
      ['Jawa Barat', '88'],
      ['Jawa Tengah', '74'],
      ['Jawa Timur', '69'],
      ['Banten', '54'],
    ],
  },
} as const

// Fallback static samples used only if the live dashboard API is unavailable.
const spatialStats = [
  {
    value: '1.125',
    label: 'TOTAL PERMINTAAN AMBULAN HARI INI',
    detail: '+5,0% | Kemarin: 500',
    borderClass: 'border-[#f2b8b8]',
    bgClass: 'bg-[#fff6f6]',
    valueClass: 'text-[#d62828]',
    labelClass: 'text-[#ef4444]',
  },
  {
    value: '78%',
    label: 'TOTAL AMBULAN RESPON PANGGILAN',
    detail: '60% terlayani | 142',
    borderClass: 'border-[#f4c48e]',
    bgClass: 'bg-[#fff8f1]',
    valueClass: 'text-[#a56a00]',
    labelClass: 'text-[#d99000]',
  },
  // {
  //   value: '17,1',
  //   label: 'INDEX RESPON AMBULAN',
  //   detail: '',
  //   borderClass: 'border-[#9fd0cf]',
  //   bgClass: 'bg-[#f2fbfb]',
  //   valueClass: 'text-[#0b6a69]',
  //   labelClass: 'text-[#0f7c7b]',
  // },
]

const provinceChartData = [
  { name: 'Prov A', gadar: 60, transport: 25 },
  { name: 'Prov B', gadar: 52, transport: 21 },
  { name: 'Prov C', gadar: 48, transport: 20 },
  { name: 'Prov D', gadar: 42, transport: 18 },
  { name: 'Prov E', gadar: 38, transport: 16 },
]

const cityChartData = [
  { name: 'Kab A', gadar: 46, transport: 19 },
  { name: 'Kab B', gadar: 41, transport: 17 },
  { name: 'Kab C', gadar: 36, transport: 15 },
  { name: 'Kab D', gadar: 30, transport: 13 },
  { name: 'Kab E', gadar: 28, transport: 12 },
]

const pscChartData = [
  { name: 'PSC A', gadar: 34, transport: 14 },
  { name: 'PSC B', gadar: 29, transport: 13 },
  { name: 'PSC C', gadar: 27, transport: 11 },
  { name: 'PSC D', gadar: 24, transport: 10 },
  { name: 'PSC E', gadar: 20, transport: 9 },
]

// Fallback static samples used only if the live dashboard API is unavailable.
const regionChartCards: RegionChartCard[] = [
  {
    key: 'provinsi',
    title: 'PROVINSI',
    borderClass: 'border-primary/30',
    titleClass: 'text-primary',
    data: provinceChartData,
  },
  {
    key: 'kabupaten',
    title: 'KAB/KOTA',
    borderClass: 'border-blue-200',
    titleClass: 'text-blue-600',
    data: cityChartData,
  },
  {
    key: 'psc',
    title: 'PSC119',
    borderClass: 'border-orange-200',
    titleClass: 'text-orange-600',
    data: pscChartData,
  },
]

// Fallback static samples used only if the live dashboard API is unavailable.
const realtimeRows = [
  {
    id: '01',
    pscName: 'PSC 119 Kota Bandung',
    province: 'Jawa Barat',
    serviceDate: '1 April 2026 11:13:54 WIB',
    reporter: 'ARLANSYAH',
    ambulanceCode: 'PSC5323',
    responseTime: '01:47',
  },
  {
    id: '02',
    pscName: 'PSC 119 Kota Bekasi',
    province: 'Jawa Barat',
    serviceDate: '1 April 2026 12:23:54 WIB',
    reporter: 'M. Ridwan',
    ambulanceCode: 'PSC42312',
    responseTime: '02:31',
  },
  {
    id: '03',
    pscName: 'PSC 119 Kab. Bekasi',
    province: 'Jawa Barat',
    serviceDate: '1 April 2026 15:13:54 WIB',
    reporter: 'Anditani',
    ambulanceCode: 'PSC3141',
    responseTime: '01:51',
  },
]

export default function PSC119Page() {
  const [activeSummaryCardId, setActiveSummaryCardId] =
    useState<keyof typeof summaryPopupData | null>(null)
  const [activeRegionDetailKey, setActiveRegionDetailKey] = useState<RegionChartCardKey | null>(null)
  const [dashboardSummaryCards, setDashboardSummaryCards] =
    useState<SummaryCard[]>(ambulanceSummaryCards)
  const [dashboardSpatialStats, setDashboardSpatialStats] = useState(spatialStats)
  const [dashboardRegionChartCards, setDashboardRegionChartCards] =
    useState<RegionChartCard[]>(regionChartCards)
  const [dashboardRealtimeRows, setDashboardRealtimeRows] = useState<RealtimeRow[]>(realtimeRows)
  const [realtimeRangeLabel, setRealtimeRangeLabel] = useState('02 Mar 2026 - 02 Apr 2026')
  const [dashboardSummaryPopupData, setDashboardSummaryPopupData] = useState(summaryPopupData)
  const [dashboardRegionMatrixDetails, setDashboardRegionMatrixDetails] = useState<
    Record<RegionChartCardKey, RegionMatrixDetail>
  >({
    provinsi: buildRegionMatrixDetail(
      regionChartCards[0].data.map((item) => ({
        nama_provinsi: item.name,
        jumlah_ambulan_gadar: item.gadar,
        jumlah_ambulan_transport: item.transport,
      })),
      'nama_provinsi',
      'Ringkasan Sebaran Ambulan PSC 119 per Provinsi',
      'Matriks distribusi armada per provinsi berdasarkan jenis ambulan.',
      'Provinsi',
    ),
    kabupaten: buildRegionMatrixDetail(
      regionChartCards[1].data.map((item) => ({
        nama_kabupaten: item.name,
        jumlah_ambulan_gadar: item.gadar,
        jumlah_ambulan_transport: item.transport,
      })),
      'nama_kabupaten',
      'Ringkasan Sebaran Ambulan PSC 119 per Kab/Kota',
      'Matriks distribusi armada per kabupaten/kota berdasarkan jenis ambulan.',
      'Kab/Kota',
    ),
    psc: buildRegionMatrixDetail(
      regionChartCards[2].data.map((item) => ({
        nama_psc: item.name,
        jumlah_ambulan_gadar: item.gadar,
        jumlah_ambulan_transport: item.transport,
      })),
      'nama_psc',
      'Ringkasan Sebaran Ambulan PSC 119 per PSC 119',
      'Matriks distribusi armada per PSC 119 berdasarkan jenis ambulan.',
      'PSC 119',
    ),
  })
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)

  const activeSummaryDetail = activeSummaryCardId
    ? dashboardSummaryPopupData[activeSummaryCardId]
    : null
  const activeRegionDetail = activeRegionDetailKey
    ? dashboardRegionMatrixDetails[activeRegionDetailKey]
    : null

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        setIsDashboardLoading(true)
        const requestBody = { kode_provinsi: '' }
        const [summaryRes, regionRes, callsRes, popupRes] = await Promise.all([
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
          fetch('/api/psc119/dashboard/summary-popup', {
            cache: 'no-store',
          }),
        ])

        if (!summaryRes.ok || !regionRes.ok || !callsRes.ok || !popupRes.ok) {
          throw new Error('Gagal memuat dashboard PSC 119')
        }

        const summaryData = (await summaryRes.json()) as SummaryResponse
        const regionData = (await regionRes.json()) as RegionResponse
        const callsData = (await callsRes.json()) as CallsResponse
        const popupData = (await popupRes.json()) as SummaryPopupResponse

        if (!active) return

        const totalAmbulance =
          Number(summaryData.ambulan?.total_gadar || 0) +
          Number(summaryData.ambulan?.total_transport || 0)
        const gpsPercent =
          totalAmbulance > 0
            ? (
                (Number(summaryData.ambulan?.total_memiliki_gps || 0) / totalAmbulance) *
                100
              ).toLocaleString('id-ID', { maximumFractionDigits: 0 })
            : '0'

        setDashboardSummaryCards([
          {
            ...ambulanceSummaryCards[0],
            value: formatNumber(summaryData.psc?.total || 0),
            change: formatSignedPercent(summaryData.psc?.persentase),
            yearLabel: String(summaryData.psc?.tahun_sebelumnya || 'Tahun lalu'),
            baseline: formatNumber(summaryData.psc?.total_psc_tahun_lalu || 0),
          },
          {
            ...ambulanceSummaryCards[1],
            value: formatNumber(totalAmbulance),
            footerType: 'breakdown',
            gadar: `${formatNumber(summaryData.ambulan?.total_gadar || 0)} unit`,
            transport: `${formatNumber(summaryData.ambulan?.total_transport || 0)} unit`,
            gps: `${gpsPercent}%`,
          },
          {
            ...ambulanceSummaryCards[2],
            value: formatNumber(summaryData.ambulan_on_duty?.hari_ini || 0),
            change: formatSignedPercent(summaryData.ambulan_on_duty?.persentase),
            previous: formatNumber(summaryData.ambulan_on_duty?.kemarin || 0),
          },
          {
            ...ambulanceSummaryCards[3],
            value: formatNumber(summaryData.ambulan_standby?.hari_ini || 0),
            change: formatSignedPercent(summaryData.ambulan_standby?.persentase),
            previous: formatNumber(summaryData.ambulan_standby?.kemarin || 0),
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

        setDashboardRegionChartCards([
          {
            ...regionChartCards[0],
            data: mapRegionRows(regionData.data?.provinsi, 'nama_provinsi'),
          },
          {
            ...regionChartCards[1],
            data: mapRegionRows(regionData.data?.kabupaten, 'nama_kabupaten'),
          },
          {
            ...regionChartCards[2],
            data: mapRegionRows(regionData.data?.psc, 'nama_psc'),
          },
        ])

        setDashboardRegionMatrixDetails({
          provinsi: buildRegionMatrixDetail(
            regionData.data?.provinsi,
            'nama_provinsi',
            'Ringkasan Sebaran Ambulan PSC 119 per Provinsi',
            'Matriks distribusi armada per provinsi berdasarkan jenis ambulan.',
            'Provinsi',
          ),
          kabupaten: buildRegionMatrixDetail(
            regionData.data?.kabupaten,
            'nama_kabupaten',
            'Ringkasan Sebaran Ambulan PSC 119 per Kab/Kota',
            'Matriks distribusi armada per kabupaten/kota berdasarkan jenis ambulan.',
            'Kab/Kota',
          ),
          psc: buildRegionMatrixDetail(
            regionData.data?.psc,
            'nama_psc',
            'Ringkasan Sebaran Ambulan PSC 119 per PSC 119',
            'Matriks distribusi armada per PSC 119 berdasarkan jenis ambulan.',
            'PSC 119',
          ),
        })

        setDashboardRealtimeRows(
          (callsData.data || []).slice(0, 20).map((row, index) => ({
            id: String(index + 1).padStart(2, '0'),
            pscName: row.nama_psc || '-',
            province: row.nama_provinsi || '-',
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

        setDashboardSummaryPopupData({
          'total-psc': {
            title: 'Detail Total PSC 119',
            columns: ['Provinsi', 'Jumlah PSC'],
            rows:
              popupData.totalPscByProvince?.map((item) => [
                item.provinceName || '-',
                formatNumber(item.totalPsc || 0),
              ]) || summaryPopupData['total-psc'].rows,
          },
          'total-ambulan-psc': {
            title: 'Detail Total Ambulan PSC 119',
            columns: ['Provinsi', 'Jumlah Ambulan'],
            rows:
              popupData.totalAmbulanceByProvince?.map((item) => [
                item.provinceName || '-',
                formatNumber(item.totalAmbulance || 0),
              ]) || summaryPopupData['total-ambulan-psc'].rows,
          },
          'on-duty': {
            title: 'Detail Ambulan On Duty Hari Ini',
            columns: ['Parameter', 'Nilai'],
            rows: [
              ['Hari Ini', formatNumber(summaryData.ambulan_on_duty?.hari_ini || 0)],
              ['Kemarin', formatNumber(summaryData.ambulan_on_duty?.kemarin || 0)],
              ['Perubahan', formatSignedPercent(summaryData.ambulan_on_duty?.persentase)],
              ['Cakupan Data', 'Nasional'],
            ],
          },
          standby: {
            title: 'Detail Ambulan Standby',
            columns: ['Parameter', 'Nilai'],
            rows: [
              ['Hari Ini', formatNumber(summaryData.ambulan_standby?.hari_ini || 0)],
              ['Kemarin', formatNumber(summaryData.ambulan_standby?.kemarin || 0)],
              ['Perubahan', formatSignedPercent(summaryData.ambulan_standby?.persentase)],
              ['Cakupan Data', 'Nasional'],
            ],
          },
        })
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
    <>
      <div>
        <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-white pb-16 pt-14 lg:pb-20 lg:pt-16">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-8 lg:space-y-10">
              <div className="text-center">
                <h1 className="mb-6 text-[2.8rem] font-bold uppercase leading-[1.08] text-gray-900 md:text-[3.35rem] lg:text-[3.8rem]">
                  Dashboard Ambulan PSC 119 Secara
                  <br />
                  <span className="text-gray-900">Nasional Tahun 2026</span>
                </h1>

                <p className="text-[1.08rem] leading-relaxed text-gray-700 lg:text-[1.18rem]">
                  Pusat informasi dan pemantauan real-time layanan kegawatdaruratan medis PSC 119 se-Indonesia tahun 2026. Dashboard ini melacak distribusi ambulan, waktu tanggap (response time), dan tren kasus untuk memastikan layanan darurat yang cepat, tepat, dan merata.
                </p>
              </div>
            </div>

            {/*
            <div className="rounded-2xl border border-primary/20 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
              <div className="p-6 lg:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-md text-white">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">Informasi Dashboard</h2>
                    <p className="max-w-5xl text-base leading-relaxed text-gray-700">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            */}
          </div>
        </section>

        <section className="bg-white pb-16 pt-8 lg:pb-20 lg:pt-10">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10 max-w-4xl">
              <h2 className="mb-4 text-3xl font-bold uppercase text-gray-900">
                Ringkasan Sebaran Ambulan PSC 119
              </h2>
              <p className="mb-6 text-base leading-relaxed text-gray-600">
                Menyajikan data pemetaan dan jumlah armada ambulan PSC 119 yang tersebar di seluruh wilayah untuk memantau ketersediaan layanan gawat darurat secara real-time.
              </p>
              <button className="rounded-xl bg-primary px-7 py-3 font-semibold text-white transition-colors hover:bg-primary-dark">
                Detail
              </button>
            </div>

            {isDashboardLoading ? (
              <SummaryCardsSkeleton />
            ) : (
            <div className="flex flex-wrap xl:flex-nowrap gap-4">
              {dashboardSummaryCards.map((card) => (
                <div
                  key={card.title}
                  className={`flex-1 min-w-[240px] border ${card.borderClass} ${card.bgClass} rounded-2xl p-6 text-center transition-colors`}
                >
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${card.iconBgClass}`}>
                    <Image
                      src={card.iconSrc}
                      alt={card.iconAlt}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                  </div>

                  <p className={`mb-3 text-sm font-bold uppercase leading-snug ${card.titleClass}`}>{card.title}</p>
                  <p className={`mb-4 text-5xl font-bold tracking-tight ${card.valueClass}`}>{card.value}</p>

                  <button
                    type="button"
                    onClick={() =>
                    setActiveSummaryCardId(card.id as keyof typeof summaryPopupData)
                    }
                    className={`mb-4 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${card.buttonClass}`}
                  >
                    {card.detailLabel}
                  </button>

                  {card.footerType === 'yearly' && (
                    <div className={`flex items-center justify-center gap-1 text-[11px] ${card.trendClass}`}>
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span className="font-semibold">{card.change}</span>
                        <span>|</span>
                        <span>{card.yearLabel}: {card.baseline}</span>
                      </div>
                    </div>
                  )}

                  {card.footerType === 'breakdown' && (
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><span className="font-semibold text-gray-900">GADAR:</span> {card.gadar}</p>
                      <p><span className="font-semibold text-gray-900">Transport:</span> {card.transport}</p>
                      <p><span className="font-semibold text-gray-900">Memiliki GPS:</span> {card.gps}</p>
                    </div>
                  )}

                  {card.footerType === 'daily' && (
                    <div className={`flex items-center justify-center gap-1 text-[11px] ${card.trendClass}`}>
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span className="font-semibold">{card.change}</span>
                        <span>|</span>
                        <span>Kemarin: {card.previous}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}

            {/* <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI Generated</p>
              <h3 className="mt-2 text-xl font-bold text-gray-900">Kesimpulan AI Generated</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 lg:text-base">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div> */}
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-8">
              <div className="mb-12 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start xl:gap-10">
                <div className="max-w-xl">
                  <h2 className="mb-4 text-3xl font-bold uppercase leading-tight text-gray-900 lg:text-[42px]">
                    Sebaran Spasial Ambulan PSC 119
                  </h2>
                  <p className="mb-8 max-w-xl text-base leading-relaxed text-gray-600 lg:text-[17px]">
                    Pemantauan harian secara real-time terhadap ambulan PSC 119
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-dark">
                      Detail
                    </button>
                    <Link
                      href="/pk3d/dki-jakarta"
                      className="rounded-xl bg-[#c62828] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#ad2323]"
                    >
                      Prov. DKI Jakarta
                    </Link>
                    <Link
                      href="/psc119/jawa-barat"
                      className="rounded-xl bg-[#f29b38] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#de8825]"
                    >
                      Jawa Barat
                    </Link>
                  </div>
                </div>

                {isDashboardLoading ? (
                  <StatCardsSkeleton />
                ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:h-full">
                  {dashboardSpatialStats.filter(Boolean).map((stat) => (
                    <div
                      key={stat.label}
                      className={`flex h-full min-h-[180px] flex-col justify-between rounded-2xl border ${stat.borderClass} ${stat.bgClass} p-6 text-center`}
                    >
                      <p className={`mb-4 text-sm font-bold uppercase leading-snug ${stat.labelClass}`}>
                        {stat.label}
                      </p>
                      <div className="flex flex-1 flex-col justify-center">
                        <p className={`mb-3 text-5xl font-bold tracking-tight ${stat.valueClass}`}>
                          {stat.value}
                        </p>
                        <p className="text-[11px] text-gray-600">{stat.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              <IndonesiaMapPlaceholder
                kodeProvinsi=""
                showTickets
                showLegend={false}
                showBottomPanel={false}
              />
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 uppercase">
                Sebaran Ambulan PSC 119 Per Wilayah
              </h2>
              <p className="text-base text-gray-600 leading-relaxed max-w-4xl">
                Menampilkan rincian data jumlah, lokasi, dan status operasional armada ambulan PSC 119 yang dikelompokkan berdasarkan provinsi dan kabupaten/kota.</p>
            </div>

            {isDashboardLoading ? (
              <ChartCardsSkeleton />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {dashboardRegionChartCards.map((card) => (
                <Card
                  key={card.title}
                  className={`border-2 ${card.borderClass} bg-white text-slate-950 shadow-lg transition-shadow hover:shadow-xl dark:!border-slate-200 dark:!bg-white dark:!text-slate-950`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <h3 className={`text-xl font-bold ${card.titleClass}`}>{card.title}</h3>
                      <button
                        type="button"
                        onClick={() => setActiveRegionDetailKey(card.key)}
                        className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
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
                        <YAxis dataKey="name" type="category" width={58} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar dataKey="gadar" stackId="a" fill="#F59E0B" name="Ambulan Gadar" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="transport" stackId="a" fill="#047D78" name="Ambulan Transport" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 uppercase">
               REALTIME AMBULAN PSC 119
              </h2>
              <p className="text-base text-gray-600 leading-relaxed max-w-4xl">
                Melacak posisi akurat dan status operasional (siaga/sedang bertugas) armada ambulan secara langsung (real-time).
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

              <div className="overflow-hidden">
                <table className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-snug">
                  <thead>
                  <tr className="bg-primary text-white">
                      <th className="w-[44px] rounded-l-xl px-2 py-3 text-center font-semibold">No</th>
                      <th className="w-[32%] px-3 py-3 text-left font-semibold">Nama PSC</th>
                      <th className="w-[8%] px-2 py-3 text-left font-semibold">Provinsi</th>
                      <th className="w-[15%] px-3 py-3 text-left font-semibold">Tgl Layanan</th>
                      <th className="w-[12%] px-3 py-3 text-left font-semibold">Nama Pelapor</th>
                      <th className="w-[17%] px-3 py-3 text-left font-semibold">Kode Ambulans</th>
                      <th className="w-[8%] px-2 py-3 text-center font-semibold">Waktu Respon</th>
                      <th className="w-[72px] rounded-r-xl px-2 py-3 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardRealtimeRows.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}>
                        <td className="px-2 py-3 text-center font-semibold text-gray-700">{row.id}</td>
                        <td className="px-3 py-3 text-gray-700 break-words">{row.pscName}</td>
                        <td className="px-2 py-3 text-gray-700 break-words">{row.province}</td>
                        <td className="px-3 py-3 text-gray-700 break-words">{row.serviceDate}</td>
                        <td className="px-3 py-3 text-gray-700 break-words">{row.reporter}</td>
                        <td className="px-3 py-3 text-gray-700 break-all">{row.ambulanceCode}</td>
                        <td className="px-2 py-3 text-center text-gray-700 break-words">{row.responseTime}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-[#25D366] text-white transition-colors hover:bg-[#1fb257]" aria-label="WhatsApp">
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                              </svg>
                            </button>
                            <button className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-[#1877F2] text-white transition-colors hover:bg-[#1365cf]" aria-label="Telepon">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </button>
                            <button className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-[#2f80ed] text-white transition-colors hover:bg-[#216fd7]" aria-label="Detail Ticket">
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
      {activeRegionDetail && (
        <div
          className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]"
          onClick={() => setActiveRegionDetailKey(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 pb-5 pt-6 md:px-8">
              <button
                type="button"
                onClick={() => setActiveRegionDetailKey(null)}
                className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup detail wilayah"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="pr-10 text-2xl font-bold text-slate-900">{activeRegionDetail.title}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {activeRegionDetail.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <div className="rounded-2xl bg-[#f5f9f9] px-4 py-2 text-slate-700">
                  Total baris data: <span className="font-semibold text-[#0f7c7b]">{formatNumber(activeRegionDetail.rows.length)}</span>
                </div>
                <div className="rounded-2xl bg-[#fff7ed] px-4 py-2 text-slate-700">
                  Grand total armada: <span className="font-semibold text-[#c86b08]">{formatNumber(activeRegionDetail.grandTotal.total)}</span>
                </div>
              </div>
            </div>

            <div className="overflow-auto px-6 py-6 md:px-8">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="rounded-tl-2xl bg-primary px-4 py-3 text-left font-semibold text-white">
                      {activeRegionDetail.labelColumn}
                    </th>
                    <th className="bg-primary px-4 py-3 text-right font-semibold text-white">
                      Ambulan Gadar
                    </th>
                    <th className="bg-primary px-4 py-3 text-right font-semibold text-white">
                      Ambulan Transport
                    </th>
                    <th className="rounded-tr-2xl bg-primary px-4 py-3 text-right font-semibold text-white">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeRegionDetail.rows.map((row, index) => (
                    <tr key={`${row.label}-${index}`}>
                      <td
                        className={`border-b border-slate-100 px-4 py-3 text-slate-700 ${
                          index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        {row.label}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-4 py-3 text-right font-medium text-[#c86b08] ${
                          index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        {formatNumber(row.gadar)}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-4 py-3 text-right font-medium text-[#0f7c7b] ${
                          index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        {formatNumber(row.transport)}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-900 ${
                          index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        {formatNumber(row.total)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="bg-[#e8f4f3] px-4 py-3 text-base font-bold text-[#0b6a69]">
                      Grand Total
                    </td>
                    <td className="bg-[#fff1df] px-4 py-3 text-right text-base font-bold text-[#c86b08]">
                      {formatNumber(activeRegionDetail.grandTotal.gadar)}
                    </td>
                    <td className="bg-[#e8f4f3] px-4 py-3 text-right text-base font-bold text-[#0f7c7b]">
                      {formatNumber(activeRegionDetail.grandTotal.transport)}
                    </td>
                    <td className="bg-[#eef2ff] px-4 py-3 text-right text-base font-bold text-slate-900">
                      {formatNumber(activeRegionDetail.grandTotal.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 text-center md:px-8">
              <button
                type="button"
                onClick={() => setActiveRegionDetailKey(null)}
                className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}


