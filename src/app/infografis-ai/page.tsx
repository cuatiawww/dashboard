'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  FileText,
  Search,
  Sparkles,
  Download,
  Eye,
  FileDown,
  Clock,
  Filter,
  Wand2,
  X,
  CheckCircle,
  HelpCircle,
} from 'lucide-react'

type InfographicItem = {
  id: number
  title: string
  category: string
  description: string
  date: string
  fileSize: string
  pages: number
  accentColor: string
  iconBg: string
  pdfUrl: string
}

const mockInfographics: InfographicItem[] = [
  {
    id: 1,
    title: 'Poster Kesiapsiagaan Gempa Bumi Banten 2026',
    category: 'Mitigasi Bencana',
    description: 'Panduan infografis kesiapsiagaan mandiri masyarakat saat gempa bumi, jalur evakuasi, dan koordinasi EMT di Pandeglang.',
    date: '22 Juli 2026',
    fileSize: '2.4 MB',
    pages: 1,
    accentColor: 'text-rose-700 bg-rose-50 border-rose-200',
    iconBg: 'bg-rose-600',
    pdfUrl: '#',
  },
  {
    id: 2,
    title: 'Panduan Respon Cepat Kesehatan Darurat Pasca-Banjir DKI',
    category: 'Panduan Klinis',
    description: 'Buku panduan taktis sanitasi darurat pengungsian, pencegahan KLB penyakit menular, dan air bersih.',
    date: '21 Juli 2026',
    fileSize: '4.1 MB',
    pages: 12,
    accentColor: 'text-teal-700 bg-teal-50 border-teal-200',
    iconBg: 'bg-[#047D78]',
    pdfUrl: '#',
  },
  {
    id: 3,
    title: 'Analisis Tren & Evaluasi Fatalitas Bencana Kuartal II',
    category: 'Laporan EOC',
    description: 'Infografis komparatif statistika kejadian bencana nasional, tingkat fatalitas kasus (CFR), dan efisiensi waktu respon.',
    date: '18 Juli 2026',
    fileSize: '6.8 MB',
    pages: 8,
    accentColor: 'text-blue-700 bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-600',
    pdfUrl: '#',
  },
  {
    id: 4,
    title: 'Poster Higienitas & PHBS di Kamp Pengungsian Terpusat',
    category: 'Promosi Kesehatan',
    description: 'Poster edukasi perilaku hidup bersih sehat di posko pengungsian mandiri guna menekan risiko penularan diare & ISPA.',
    date: '10 Juli 2026',
    fileSize: '1.8 MB',
    pages: 1,
    accentColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-600',
    pdfUrl: '#',
  },
  {
    id: 5,
    title: 'Infografis Kesiapan Kapasitas Faskes Rujukan Jawa Barat',
    category: 'Laporan EOC',
    description: 'Pemetaan kapasitas pelayanan IGD darurat, ketersediaan obat esensial, dan BOR faskes rujukan di zona rawan gempa.',
    date: '05 Juli 2026',
    fileSize: '3.5 MB',
    pages: 3,
    accentColor: 'text-purple-700 bg-purple-50 border-purple-200',
    iconBg: 'bg-purple-600',
    pdfUrl: '#',
  },
  {
    id: 6,
    title: 'Poster Mitigasi Kesehatan Erupsi Gunung Berapi Aktif',
    category: 'Mitigasi Bencana',
    description: 'Panduan visual perlindungan pernapasan abu vulkanik, titik kumpul medis darurat, dan zonasi risiko wilayah merah.',
    date: '28 Juni 2026',
    fileSize: '2.1 MB',
    pages: 1,
    accentColor: 'text-amber-700 bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-600',
    pdfUrl: '#',
  },
]

export default function InfografisPage() {
  const [infographics, setInfographics] = useState<InfographicItem[]>(mockInfographics)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [activePreview, setActivePreview] = useState<InfographicItem | null>(null)
  
  // Generator form states
  const [genTitle, setGenTitle] = useState('')
  const [genCategory, setGenCategory] = useState('Mitigasi Bencana')
  const [genPrompt, setGenPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genSuccess, setGenSuccess] = useState(false)

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(infographics.map((i) => i.category))
    return ['Semua', ...Array.from(cats)]
  }, [infographics])

  // Filtered items
  const filteredItems = useMemo(() => {
    return infographics.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory =
        selectedCategory === 'Semua' || item.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [infographics, searchQuery, selectedCategory])

  // Simple Generator simulation
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!genTitle.trim()) return

    setGenerating(true)
    setTimeout(() => {
      const newInfographic: InfographicItem = {
        id: Date.now(),
        title: genTitle,
        category: genCategory,
        description: genPrompt || `Dokumen infografis yang dibuat berdasarkan analisis data bencana terkini.`,
        date: 'Hari ini',
        fileSize: `${(Math.random() * 3 + 1.5).toFixed(1)} MB`,
        pages: Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 4) + 2,
        accentColor: 'text-teal-700 bg-teal-50 border-teal-200',
        iconBg: 'bg-[#047D78]',
        pdfUrl: '#',
      }

      setInfographics((prev) => [newInfographic, ...prev])
      setGenerating(false)
      setGenSuccess(true)
      
      setGenTitle('')
      setGenPrompt('')

      setTimeout(() => {
        setGenSuccess(false)
        setIsGeneratorOpen(false)
      }, 1500)
    }, 2000)
  }

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 bg-[#fbffff] min-h-[calc(100vh-140px)] animate-in fade-in duration-200">
      
      {/* Header bar matching Detail Kejadian layout with Back Arrow */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition shrink-0"
            title="Kembali ke Dashboard Utama"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
              Galeri Infografis & Dokumen AI
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kumpulan dokumen laporan PDF dan poster infografis hasil generate Gemini AI berdasarkan data riil kebencanaan.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsGeneratorOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#047D78] hover:bg-[#03605c] text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>Generate Infografis AI</span>
        </button>
      </div>

      {/* Clean Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul infografis atau dokumen..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none bg-slate-50/50"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 me-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#047D78] text-white border-[#047D78] shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Clean PDF Document Cards Grid (4:5 ratio, No stock photos) */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              
              {/* PDF Document Vector Cover (4:5 Aspect Ratio) */}
              <div className="relative aspect-[4/5] w-full bg-slate-50 border-b border-slate-150 flex flex-col items-center justify-center p-6 text-center select-none group">
                
                {/* PDF Paper Sheet Illustration */}
                <div className="relative w-full max-w-[130px] aspect-[3/4] bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col items-center justify-between group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                  
                  {/* PDF Top Bar */}
                  <div className="w-full flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className={`p-1.5 rounded-lg ${item.iconBg} text-white shadow-sm`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      PDF
                    </span>
                  </div>

                  {/* Simulated PDF Document Text Lines */}
                  <div className="w-full space-y-1.5 py-3">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-3/5 bg-slate-200 rounded-full text-slate-300" />
                  </div>

                  {/* Bottom Pages Info */}
                  <div className="w-full text-center border-t border-slate-100 pt-1.5">
                    <span className="text-[9px] font-bold text-slate-400">
                      {item.pages} {item.pages === 1 ? 'Halaman' : 'Hlm'}
                    </span>
                  </div>
                </div>

                {/* Subtle Top Category Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-xs ${item.accentColor}`}>
                    {item.category}
                  </span>
                </div>

                {/* Hover Quick Action Screen */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200 z-20">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-md hover:scale-105 transition"
                    title="Pratinjau Dokumen"
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                  <a
                    href={item.pdfUrl}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#047D78] text-white shadow-md hover:scale-105 transition"
                    title="Unduh PDF"
                  >
                    <Download className="h-4.5 w-4.5" />
                  </a>
                </div>
              </div>

              {/* Simple Card Details */}
              <div className="p-4 flex flex-col flex-grow justify-between gap-3 bg-white">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.date}
                    </span>
                    <span>{item.fileSize}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Simple Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Pratinjau</span>
                  </button>

                  <a
                    href={item.pdfUrl}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[#047D78] hover:bg-[#03605c] text-white text-xs font-semibold rounded-lg transition shadow-sm"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Unduh PDF</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="mx-auto w-10 h-10 bg-slate-100 flex items-center justify-center rounded-xl text-slate-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Tidak ada hasil ditemukan</h3>
            <p className="text-xs text-slate-500">Coba ubah pencarian atau filter kategori.</p>
          </div>
        </div>
      )}

      {/* ── Generate Infografis Modal ── */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[#047D78]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Generate Infografis AI Baru
                </h3>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {genSuccess ? (
              <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center">
                <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-100">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Infografis Berhasil Dibuat</h4>
                  <p className="text-xs text-slate-500">Dokumen PDF dan poster baru telah ditambahkan.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-5 space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Judul Dokumen / Poster
                  </label>
                  <input
                    type="text"
                    required
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="Contoh: Poster Kesiapsiagaan Longsor Sukabumi"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kategori Laporan
                  </label>
                  <select
                    value={genCategory}
                    onChange={(e) => setGenCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Mitigasi Bencana">Mitigasi Bencana</option>
                    <option value="Panduan Klinis">Panduan Klinis</option>
                    <option value="Laporan EOC">Laporan EOC</option>
                    <option value="Promosi Kesehatan">Promosi Kesehatan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Instruksi Khusus untuk AI (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Jelaskan data spesifik yang ingin dianalisis oleh AI menjadi infografis..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#047D78] hover:bg-[#03605c] disabled:bg-teal-600/60 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {generating ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-spin" />
                      <span>Sedang Merancang Infografis...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Generate via Gemini AI</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Preview Modal Overlay ── */}
      {activePreview && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#047D78] uppercase">
                  {activePreview.category}
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  {activePreview.title}
                </h3>
              </div>
              <button
                onClick={() => setActivePreview(null)}
                className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="aspect-[4/5] w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                <div className="w-[120px] aspect-[3/4] bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-between">
                  <div className="w-full flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className={`p-1.5 rounded-lg ${activePreview.iconBg} text-white`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400">PDF</span>
                  </div>
                  <div className="w-full space-y-1.5 py-3">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
                    <div className="h-1.5 w-3/5 bg-slate-200 rounded-full" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{activePreview.pages} Hlm</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">Ringkasan Infografis</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {activePreview.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Tanggal: {activePreview.date}</span>
                <span>Ukuran: {activePreview.fileSize} ({activePreview.pages} Hlm)</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActivePreview(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Tutup
                </button>

                <a
                  href={activePreview.pdfUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#047D78] hover:bg-[#03605c] text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
