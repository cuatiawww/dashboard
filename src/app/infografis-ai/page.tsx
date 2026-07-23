'use client'

import { useState, useMemo, useEffect } from 'react'
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
  Loader2,
} from 'lucide-react'

type InfographicItem = {
  id: number
  title: string
  category: string
  description: string
  date: string
  fileSize: string
  pages: number
  pdfUrl: string
}

const fallbackInfographics: InfographicItem[] = [
  {
    id: 1,
    title: 'Poster Kesiapsiagaan Gempa Bumi Banten 2026',
    category: 'Mitigasi Bencana',
    description: 'Panduan infografis kesiapsiagaan mandiri masyarakat saat gempa bumi, jalur evakuasi, dan koordinasi EMT di Pandeglang.',
    date: '22 Juli 2026',
    fileSize: '2.4 MB',
    pages: 3,
    pdfUrl: '/laporan_eoc_kemenkes.html',
  },
  {
    id: 2,
    title: 'Panduan Respon Cepat Kesehatan Pasca-Banjir DKI',
    category: 'Panduan Klinis',
    description: 'Buku panduan taktis sanitasi darurat pengungsian, pencegahan KLB penyakit menular, dan air bersih.',
    date: '21 Juli 2026',
    fileSize: '4.1 MB',
    pages: 3,
    pdfUrl: '/laporan_eoc_kemenkes.html',
  },
  {
    id: 3,
    title: 'Analisis Tren & Evaluasi Fatalitas Bencana Kuartal II',
    category: 'Laporan EOC',
    description: 'Infografis komparatif statistika kejadian bencana nasional, tingkat fatalitas kasus (CFR), dan efisiensi respon.',
    date: '18 Juli 2026',
    fileSize: '6.8 MB',
    pages: 3,
    pdfUrl: '/laporan_eoc_kemenkes.html',
  },
  {
    id: 4,
    title: 'Poster Higienitas & PHBS di Kamp Pengungsian',
    category: 'Promosi Kesehatan',
    description: 'Poster edukasi perilaku hidup bersih sehat di posko pengungsian mandiri guna menekan risiko penularan diare.',
    date: '10 Juli 2026',
    fileSize: '1.8 MB',
    pages: 3,
    pdfUrl: '/laporan_eoc_kemenkes.html',
  },
]

export default function InfografisPage() {
  const [infographics, setInfographics] = useState<InfographicItem[]>(fallbackInfographics)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [activePreview, setActivePreview] = useState<InfographicItem | null>(null)
  
  // Generator form states
  const [genTitle, setGenTitle] = useState('')
  const [genCategory, setGenCategory] = useState('Mitigasi Bencana')
  const [genPrompt, setGenPrompt] = useState('')
  const [genMonth, setGenMonth] = useState<number>(7) // Default Juli
  const [genYear, setGenYear] = useState<number>(2026) // Default 2026
  const [generating, setGenerating] = useState(false)
  const [genSuccess, setGenSuccess] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Fetch real infographics list from DB
  const loadInfographics = async () => {
    try {
      setIsLoadingData(true)
      const res = await fetch('/api/infografis-list')
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
        setInfographics(json.data)
      }
    } catch (e) {
      console.error('Failed loading infographics from DB:', e)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    loadInfographics()
  }, [])

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

  // Real Generator PDF submission via Gemini AI & mPDF
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genTitle.trim()) return

    setGenerating(true)
    setGenError(null)

    try {
      const res = await fetch('/api/generate-infografis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: genTitle,
          category: genCategory,
          prompt: genPrompt,
          month: genMonth,
          year: genYear,
        }),
      })

      const json = await res.json()
      if (json?.success && json?.data) {
        setInfographics((prev) => [json.data, ...prev])
        setGenSuccess(true)
        setGenTitle('')
        setGenPrompt('')

        setTimeout(() => {
          setGenSuccess(false)
          setIsGeneratorOpen(false)
        }, 1800)
      } else {
        setGenError(json?.message || 'Gagal membuat file PDF. Silakan coba lagi.')
      }
    } catch (err: any) {
      setGenError(err?.message || 'Terjadi kesalahan jaringan saat memicu generator.')
    } finally {
      setGenerating(false)
    }
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
              Kumpulan dokumen laporan infografis hasil generate Gemini AI berdasarkan data riil kebencanaan.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setGenError(null)
            setGenSuccess(false)
            setIsGeneratorOpen(true)
          }}
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

      {/* Compact Grid Layout (6 columns on XL, 5 on LG, 4 on MD, 3 on SM, 2 on Mobile) */}
      {isLoadingData ? (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#047D78]" />
          <p className="text-xs font-semibold text-slate-500">Memuat berkas infografis dari database...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 group"
            >
              
              {/* PDF Vector Cover (4:5 Aspect Ratio, Compact) */}
              <div className="relative aspect-[4/5] w-full bg-slate-50 border-b border-slate-150 flex flex-col items-center justify-center p-3 text-center select-none group">
                
                {/* Paper Illustration with RED PDF Icon */}
                <div className="relative w-full max-w-[85px] aspect-[3/4] bg-white rounded-lg border border-slate-200/90 shadow-2xs p-2 flex flex-col items-center justify-between group-hover:shadow-sm group-hover:scale-105 transition-all duration-200">
                  
                  {/* Top Bar with RED PDF Badge */}
                  <div className="w-full flex justify-between items-center border-b border-slate-100 pb-1">
                    <div className="p-1 rounded-md bg-red-600 text-white shadow-2xs">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[8px] font-black text-red-600 uppercase tracking-wider">
                      PDF
                    </span>
                  </div>

                  {/* Simulated Document Lines */}
                  <div className="w-full space-y-1 py-1.5">
                    <div className="h-1 w-full bg-slate-200 rounded-full" />
                    <div className="h-1 w-4/5 bg-slate-200 rounded-full" />
                    <div className="h-1 w-3/5 bg-slate-200 rounded-full text-slate-300" />
                  </div>

                  {/* Page count */}
                  <div className="w-full text-center border-t border-slate-100 pt-1">
                    <span className="text-[8px] font-bold text-slate-400">
                      {item.pages} Hlm
                    </span>
                  </div>
                </div>

                {/* Top Category Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-200 bg-white/90 text-slate-700 shadow-2xs">
                    {item.category}
                  </span>
                </div>

                {/* Hover Quick Action Screen */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity duration-200 z-20">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-md hover:scale-105 transition"
                    title="Pratinjau"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={item.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:scale-105 transition"
                    title="Unduh PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Compact Card Details */}
              <div className="p-2.5 flex flex-col flex-grow justify-between gap-2 bg-white">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.date}
                    </span>
                    <span>{item.fileSize}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={item.title}>
                    {item.title}
                  </h3>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-semibold rounded-md transition"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Lihat</span>
                  </button>

                  <a
                    href={item.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-md transition shadow-2xs"
                  >
                    <FileDown className="h-3 w-3" />
                    <span>PDF</span>
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
                  Generate Infografis AI
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
                  <h4 className="text-sm font-bold text-slate-800">Infografis AI Berhasil Dibuat</h4>
                  <p className="text-xs text-slate-500">Berkas PDF resmi telah tersimpan di database dan folder aset.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-5 space-y-4">
                
                {genError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                    {genError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Judul Laporan Infografis
                  </label>
                  <input
                    type="text"
                    required
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="Contoh: Laporan Analisis Respon Cepat Bencana EOC"
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Periode Bulan Data
                    </label>
                    <select
                      value={genMonth}
                      onChange={(e) => setGenMonth(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value={1}>Januari</option>
                      <option value={2}>Februari</option>
                      <option value={3}>Maret</option>
                      <option value={4}>April</option>
                      <option value={5}>Mei</option>
                      <option value={6}>Juni</option>
                      <option value={7}>Juli</option>
                      <option value={8}>Agustus</option>
                      <option value={9}>September</option>
                      <option value={10}>Oktober</option>
                      <option value={11}>November</option>
                      <option value={12}>Desember</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Periode Tahun Data
                    </label>
                    <select
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                      <option value={2024}>2024</option>
                      <option value={2023}>2023</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Instruksi Khusus ke Gemini AI (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Masukkan instruksi khusus atau area fokus yang ingin disorot oleh AI..."
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
                      <span>Sedang Merancang Infografis AI...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Generate Infografis AI</span>
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
              <div className="aspect-[4/5] w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative">
                {activePreview.pdfUrl.endsWith('.html') || activePreview.pdfUrl.includes('html') ? (
                  <iframe
                    src={activePreview.pdfUrl}
                    className="w-full h-full border-0 rounded-xl"
                    title="Pratinjau Template Infografis EOC"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-[100px] aspect-[3/4] bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex flex-col items-center justify-between">
                      <div className="w-full flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <div className="p-1 rounded-md bg-red-600 text-white">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[8px] font-black text-red-600">PDF</span>
                      </div>
                      <div className="w-full space-y-1 py-2">
                        <div className="h-1 w-full bg-slate-200 rounded-full" />
                        <div className="h-1 w-4/5 bg-slate-200 rounded-full" />
                        <div className="h-1 w-3/5 bg-slate-200 rounded-full" />
                      </div>
                      <span className="text-[8px] font-bold text-slate-400">{activePreview.pages} Hlm</span>
                    </div>
                  </div>
                )}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Buka / Unduh Dokumen</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
