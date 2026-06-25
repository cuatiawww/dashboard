'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  ChevronUp,
  Sparkles,
  Loader2,
} from 'lucide-react'
import IndonesiaStatusMapClient from '@/components/landing/IndonesiaStatusMapClient'
import FilterDropdownBar, { type FilterSummary } from '@/components/landing/FilterDropdownBar'
import ChartCardsSection from '@/components/landing/ChartCardsSection'
import FacilityProvinceSection, { type FacilityKey } from '@/components/landing/FacilityProvinceSection'
import InsightModal, { type ModalTab, type InsightData } from '@/components/landing/InsightModal'

const assets = {
  insightBackground: '/bg insght.png',
}

const summaryCards = [
  { id: 'total-faskes', facility: 'all', title: 'TOTAL FASILITAS KESEHATAN', value: '10.123', icon: '/faskes.svg' },
  { id: 'total-rs', facility: 'rumahSakit', title: 'TOTAL RUMAH SAKIT', value: '3.123', icon: '/rumah%20sakit.svg' },
  { id: 'total-puskesmas', facility: 'puskesmas', title: 'TOTAL PUSKESMAS', value: '5.123', icon: '/puskesmas.svg' },
  { id: 'total-posyandu', facility: 'posyandu', title: 'TOTAL POSYANDU', value: '2.123', icon: '/posyandu.svg' },
] as const

const defaultFilterSummary: FilterSummary = {
  cakupan: 'Nasional',
  provinsi: 'Semua Provinsi',
  kabkota: 'Semua Kab/Kota',
}

function isAllValue(value: string) {
  return value.toLowerCase().startsWith('semua')
}

function buildRegionSuffix(summary: FilterSummary) {
  const cakupan = summary.cakupan.toLowerCase()
  const province = summary.provinsi.toUpperCase()
  const district = summary.kabkota.toUpperCase()

  let suffix = 'NASIONAL'

  if (cakupan.includes('kabupaten') && !isAllValue(district)) {
    suffix = `${district}, PROV. ${province}`
  } else if (!isAllValue(province)) {
    suffix = `PROV. ${province} (${isAllValue(district) ? 'SEMUA KAB' : district})`
  }

  return suffix
}

function buildFacilityDistributionTitle(summary: FilterSummary) {
  const province = summary.provinsi.toUpperCase()
  const district = summary.kabkota.toUpperCase()

  if (!isAllValue(district)) {
    return `SEBARAN FASILITAS KESEHATAN DI ${district}`
  }

  if (!isAllValue(province)) {
    return `SEBARAN FASILITAS KESEHATAN PER KAB/KOTA DI PROV. ${province}`
  }

  return 'SEBARAN FASILITAS KESEHATAN PER PROVINSI'
}

function buildFacilityDistributionDescription(summary: FilterSummary) {
  const province = summary.provinsi.toUpperCase()
  const district = summary.kabkota.toUpperCase()

  if (!isAllValue(district)) {
    return `Menampilkan pemetaan distribusi dan jumlah fasilitas kesehatan pada wilayah ${district}.`
  }

  if (!isAllValue(province)) {
    return `Menampilkan pemetaan distribusi dan jumlah fasilitas kesehatan per kabupaten/kota di PROV. ${province}.`
  }

  return 'Menampilkan pemetaan distribusi dan jumlah fasilitas kesehatan yang tersebar di setiap provinsi.'
}

function buildCapaianTitle(summary: FilterSummary) {
  const province = summary.provinsi.toUpperCase()
  const district = summary.kabkota.toUpperCase()

  if (!isAllValue(district)) {
    return `CAPAIAN WILAYAH ${district}`
  }

  if (!isAllValue(province)) {
    return `CAPAIAN PER KAB/KOTA DI PROV. ${province}`
  }

  return 'CAPAIAN PER PROVINSI'
}

function buildCapaianDescription(summary: FilterSummary) {
  const province = summary.provinsi.toUpperCase()
  const district = summary.kabkota.toUpperCase()

  if (!isAllValue(district)) {
    return `Menyajikan rincian data dan perbandingan progres pencapaian target program pada wilayah ${district}.`
  }

  if (!isAllValue(province)) {
    return `Menyajikan rincian data dan perbandingan progres pencapaian target program per kabupaten/kota di PROV. ${province}.`
  }

  return 'Menyajikan rincian data dan perbandingan progres pencapaian target program secara spesifik untuk masing-masing provinsi.'
}

export default function HomePage() {
  const activeFacility: FacilityKey = 'puskesmas'
  const [aiInsight, setAiInsight] = useState<InsightData | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [filterSummary, setFilterSummary] = useState<FilterSummary>(defaultFilterSummary)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>('ringkasan')

  const openModal = (tab: ModalTab) => {
    setModalTab(tab)
    setModalOpen(true)
  }

  const generateAiInsight = async () => {
    if (generatingAi) return
    setGeneratingAi(true)
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gaps: [
            { rank: 1, name: 'Ketersediaan Alat Kesehatan', pct: 82 },
            { rank: 2, name: 'Layanan Kesehatan Anak (MTBS)', pct: 67 },
            { rank: 3, name: 'Tenaga Gizi di Wilayah Terpencil', pct: 61 },
            { rank: 4, name: 'Sarana Air Bersih Faskes', pct: 54 },
            { rank: 5, name: 'Sistem Rujukan Berjenjang', pct: 48 },
          ],
          stats: [
            { num: '72%', label: 'Tingkat Kepatuhan Nasional' },
            { num: '10.123', label: 'Total Faskes Terdaftar' },
            { num: '34', label: 'Provinsi Terevaluasi' },
          ],
          criticalProvinces: ['Papua Pegunungan', 'Papua Selatan', 'Maluku Utara'],
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || 'Gagal generate AI')
      }

      const data = (await res.json()) as InsightData
      setAiInsight(data)
      openModal('ringkasan')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal generate AI insight')
    } finally {
      setGeneratingAi(false)
    }
  }

  const insightPreviewText =
    aiInsight?.summary ??
    'GAP terbesar nasional berada pada alat kesehatan, layanan anak, dan ketersediaan tenaga gizi di wilayah terpencil.'
  const regionSuffix = buildRegionSuffix(filterSummary)
  const regionSuffixText = buildRegionSuffix(filterSummary)
  const facilityDistributionTitle = buildFacilityDistributionTitle(filterSummary)
  const facilityDistributionDescription = buildFacilityDistributionDescription(filterSummary)
  const capaianTitle = buildCapaianTitle(filterSummary)
  const capaianDescription = buildCapaianDescription(filterSummary)

  return (
    <div className="min-h-screen bg-[#fbffff] text-slate-800">

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#fbffff] py-3">
        <div className="w-full px-4 sm:px-5 lg:px-6">
          <FilterDropdownBar onSummaryChange={setFilterSummary} />

          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                key={card.id}
                className="flex min-h-[118px] w-full items-center gap-3 border border-[#bedbda] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] transition-all sm:px-5 sm:py-3.5"
                style={{
                  borderTopLeftRadius: '17px',
                  borderTopRightRadius: '17px',
                  borderBottomRightRadius: '22px',
                  borderBottomLeftRadius: '17px',
                }}
              >
                <div className="flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-full bg-[#e8efef]">
                  <Image src={card.icon} alt={card.title} width={44} height={44} className="h-11 w-11" />
                </div>
                <div>
                  <p className="text-[12px] font-bold leading-tight text-[#4f4f4f] sm:text-[13px]">
                    {card.title} {regionSuffix}
                  </p>
                  <p className="mt-2 text-[42px] font-bold leading-[0.92] tracking-[-0.02em] text-[#454545] sm:text-[52px]">
                    {card.value}
                  </p>
                  <p className="mt-2.5 text-[12px] text-[#383838] sm:text-[13px]">
                    <span className="inline-flex items-center gap-1 font-bold text-[#17b7b2]">
                      <ChevronUp className="h-3.5 w-3.5 stroke-[2.8]" />
                      2,1%
                    </span>{' '}
                    dari bulan sebelumnya
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Insight + Map Section ────────────────────────────────────────────── */}
      <section className="w-full bg-[#fbffff] pb-5">
        <div className="grid w-full grid-cols-1 gap-4 px-4 sm:px-5 lg:px-6 xl:grid-cols-[381px_minmax(0,1fr)] xl:items-start">

          <div className="space-y-3">

            {/* ── Insight Card (IMPROVED) ─────────────────────────────────── */}
            <article
              className="relative overflow-hidden border border-[#b7d9d8] p-5 xl:h-[415px] xl:w-[381px]"
              style={{
                backgroundImage: `url('${assets.insightBackground}')`,
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
                    Analisis Penilaian Indikator Kinerja Fasilitas Kesehatan
                  </h3>
                </div>

                {/* Body text */}
                <div className="mt-3 rounded-xl border-l-[3px] border-l-[#16b7b2] bg-white/60 px-3 py-2.5 backdrop-blur-[2px]">
                  <p className="text-[13px] leading-relaxed text-[#2f4040] sm:text-[14px]">
                    {insightPreviewText}
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
                      {generatingAi ? 'Sedang Generate...' : 'Generate AI'}
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
              <p className="mt-1 text-[14px] text-[#3f4a4a] sm:text-[16px]">11 Mei 2026 10.00 WIB</p>
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
              SEBARAN SPASIAL STATUS FASILITAS KESEHATAN {regionSuffix}
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4b4b4b] sm:text-[16px]">
              Pemetaan ini menyajikan gambaran komprehensif mengenai distribusi geografis dan
              klasifikasi status Fasilitas Kesehatan pada cakupan {regionSuffixText}.
            </p>
            <div className="mt-4 h-[300px] sm:h-[350px] md:h-[420px] xl:h-[470px]">
              <IndonesiaStatusMapClient />
            </div>
          </article>
        </div>
      </section>

      {/* ── Chart Cards ──────────────────────────────────────────────────────── */}
      <ChartCardsSection capaianTitle={capaianTitle} capaianDescription={capaianDescription} />
      <FacilityProvinceSection
        key={activeFacility}
        activeFacility={activeFacility}
        title={facilityDistributionTitle}
        description={facilityDistributionDescription}
      />

      {/* ── Insight Modal ────────────────────────────────────────────────────── */}
      <InsightModal
        key={modalTab}
        open={modalOpen}
        defaultTab={modalTab}
        aiInsight={aiInsight}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
