'use client'

import { Newspaper, Clock, ExternalLink, TrendingUp, Search, Filter } from 'lucide-react'
import { useState } from 'react'
import PantauanPageTemplate, { PantauanStatWidget } from '../PantauanPageTemplate'

// ── Types & Mock Data ─────────────────────────────────────────────────────────

type KategoriBerita = 'Semua' | 'Banjir' | 'Gempa' | 'Karhutla' | 'Penyakit' | 'Longsor' | 'Tsunami'

interface BeritaItem {
  id: number
  judul: string
  ringkasan: string
  sumber: string
  url: string
  tanggal: string
  kategori: Exclude<KategoriBerita, 'Semua'>
  isTrending?: boolean
}

const MOCK_BERITA: BeritaItem[] = [
  {
    id: 1,
    judul: 'Banjir Bandang Landa Kabupaten Agam, Ratusan Warga Mengungsi',
    ringkasan: 'Hujan lebat yang mengguyur kawasan Agam sejak Sabtu malam menyebabkan banjir bandang yang merendam ratusan rumah. Petugas BPBD setempat telah mendirikan posko pengungsian.',
    sumber: 'BNPB',
    url: 'https://www.bnpb.go.id',
    tanggal: '2026-07-06T09:00:00',
    kategori: 'Banjir',
    isTrending: true,
  },
  {
    id: 2,
    judul: 'Gempa M5.7 Guncang Aceh Selatan, BMKG: Tidak Berpotensi Tsunami',
    ringkasan: 'Gempa bumi berkekuatan M5.7 mengguncang wilayah Aceh Selatan pada pukul 08:02 WIB. BMKG menyatakan gempa ini tidak berpotensi menimbulkan tsunami namun warga diimbau waspada.',
    sumber: 'BMKG',
    url: 'https://www.bmkg.go.id',
    tanggal: '2026-07-06T08:15:00',
    kategori: 'Gempa',
    isTrending: true,
  },
  {
    id: 3,
    judul: 'Titik Hotspot Karhutla di Kalimantan Meningkat 30% dalam Sepekan',
    ringkasan: 'Data LAPAN menunjukkan peningkatan titik panas di Kalimantan Tengah dan Kalimantan Selatan. BMKG memperingatkan potensi kekeringan yang dapat memperparah situasi.',
    sumber: 'Kompas.com',
    url: '#',
    tanggal: '2026-07-06T07:30:00',
    kategori: 'Karhutla',
    isTrending: true,
  },
  {
    id: 4,
    judul: 'Gunung Ruang Kembali Erupsi, Radius Bahaya Diperluas 7 Km',
    ringkasan: 'Gunung Ruang di Sulawesi Utara kembali erupsi dengan tinggi kolom abu mencapai 2.000 meter. PVMBG menetapkan status Awas dan meminta warga evakuasi dari radius 7 km.',
    sumber: 'Detik.com',
    url: '#',
    tanggal: '2026-07-06T06:45:00',
    kategori: 'Gempa',
  },
  {
    id: 5,
    judul: 'HMPV Melonjak di India, Kemenkes RI Perkuat Surveilans di Pintu Masuk',
    ringkasan: 'Kementerian Kesehatan RI memperkuat pengawasan di bandara dan pelabuhan internasional menyusul lonjakan kasus HMPV di India. Hingga saat ini belum ada kasus terkonfirmasi di Indonesia.',
    sumber: 'Kemenkes RI',
    url: '#',
    tanggal: '2026-07-05T16:00:00',
    kategori: 'Penyakit',
  },
  {
    id: 6,
    judul: 'Longsor di Garut Timpa 3 Rumah, 2 Orang Dalam Pencarian',
    ringkasan: 'Tanah longsor terjadi di Desa Sukajaya, Garut Jawa Barat akibat curah hujan tinggi. Tim SAR gabungan tengah melakukan pencarian terhadap dua orang yang dilaporkan tertimbun.',
    sumber: 'BPBD Jawa Barat',
    url: '#',
    tanggal: '2026-07-05T14:20:00',
    kategori: 'Longsor',
  },
  {
    id: 7,
    judul: 'Waspada Gelombang Tinggi di Selatan Jawa, BMKG Keluarkan Peringatan',
    ringkasan: 'BMKG mengeluarkan peringatan gelombang tinggi 2.5–4 meter di Selatan Jawa dan Bali untuk periode 6–8 Juli 2026. Nelayan diminta tidak melaut dan kapal kecil dilarang beroperasi.',
    sumber: 'BMKG',
    url: 'https://www.bmkg.go.id',
    tanggal: '2026-07-05T12:00:00',
    kategori: 'Banjir',
  },
  {
    id: 8,
    judul: 'Pemerintah Tetapkan Status Darurat Bencana di NTT Akibat Banjir dan Longsor',
    ringkasan: 'Gubernur NTT menetapkan status darurat bencana setelah banjir dan longsor melanda 7 kabupaten. Lebih dari 15.000 warga mengungsi dan akses jalan ke sejumlah kecamatan terputus.',
    sumber: 'BNPB',
    url: 'https://www.bnpb.go.id',
    tanggal: '2026-07-05T09:30:00',
    kategori: 'Banjir',
  },
]

const KATEGORI_LIST: KategoriBerita[] = ['Semua', 'Banjir', 'Gempa', 'Karhutla', 'Penyakit', 'Longsor', 'Tsunami']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hari lalu`
}

const KATEGORI_COLOR: Record<string, string> = {
  Banjir: 'bg-blue-100 text-blue-700 border-blue-200',
  Gempa: 'bg-orange-100 text-orange-700 border-orange-200',
  Karhutla: 'bg-red-100 text-red-700 border-red-200',
  Penyakit: 'bg-purple-100 text-purple-700 border-purple-200',
  Longsor: 'bg-amber-100 text-amber-700 border-amber-200',
  Tsunami: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PantauanMediaPage() {
  const [kategori, setKategori] = useState<KategoriBerita>('Semua')
  const [search, setSearch] = useState('')

  const filtered = MOCK_BERITA.filter((b) => {
    const matchKat = kategori === 'Semua' || b.kategori === kategori
    const matchSearch =
      !search ||
      b.judul.toLowerCase().includes(search.toLowerCase()) ||
      b.ringkasan.toLowerCase().includes(search.toLowerCase())
    return matchKat && matchSearch
  })

  const trending = MOCK_BERITA.filter((b) => b.isTrending)

  const statWidgets = (
    <>
      <PantauanStatWidget
        icon={Newspaper}
        iconBg="bg-blue-100 text-blue-600"
        label="Total Berita"
        value={MOCK_BERITA.length}
        sub="Hari Ini"
      />
      <PantauanStatWidget
        icon={TrendingUp}
        iconBg="bg-red-100 text-red-600"
        label="Trending"
        value={trending.length}
        sub="Berita Utama"
        trend="up"
        trendLabel="Diperbarui"
      />
      <PantauanStatWidget
        icon={Filter}
        iconBg="bg-purple-100 text-purple-600"
        label="Kategori Aktif"
        value={5}
        sub="Banjir, Gempa, Karhutla..."
      />
      <PantauanStatWidget
        icon={Search}
        iconBg="bg-teal-100 text-teal-700"
        label="Sumber Media"
        value="BNPB · BMKG"
        sub="+ Media Nasional"
      />
      <PantauanStatWidget
        icon={Clock}
        iconBg="bg-slate-100 text-slate-600"
        label="Diperbarui"
        value="Real-time"
        sub={new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      />
    </>
  )

  const bottomContent = (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berita bencana..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {KATEGORI_LIST.map((k) => (
            <button
              key={k}
              onClick={() => setKategori(k)}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                kategori === k
                  ? 'border-teal-500 bg-teal-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Berita Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Tidak ada berita yang sesuai dengan filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
            >
              {b.isTrending && (
                <span className="absolute right-3 top-3 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  🔥 Trending
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${KATEGORI_COLOR[b.kategori] || 'bg-slate-100 text-slate-600'}`}>
                  {b.kategori}
                </span>
                <span className="text-[11px] text-slate-400">{b.sumber}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug group-hover:text-teal-700 transition-colors line-clamp-3">
                {b.judul}
              </p>
              <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3 flex-1">
                {b.ringkasan}
              </p>
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">{timeAgo(b.tanggal)}</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-600">
                  Baca selengkapnya <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <PantauanPageTemplate
      title="Pantauan Media"
      description="Agregasi berita bencana dan krisis kesehatan dari media nasional, BNPB, dan BMKG"
      sourceLabel="BNPB · BMKG · Media"
      sourceUrl="https://www.bnpb.go.id/berita"
      icon={Newspaper}
      iconBg="bg-blue-100 text-blue-600"
      lastUpdated={new Date().toLocaleString('id-ID')}
      statWidgets={statWidgets}
      bottomContent={bottomContent}
    />
  )
}
