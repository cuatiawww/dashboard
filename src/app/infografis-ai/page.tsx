'use client'

import { useState, useMemo } from 'react'
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
  Plus,
  X,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react'

// Define the template item type
type InfographicItem = {
  id: number
  title: string
  category: string
  description: string
  date: string
  fileSize: string
  pages: number
  gradient: string
  downloads: number
  pdfUrl: string
  imageUrl: string
}

const mockInfographics: InfographicItem[] = [
  {
    id: 1,
    title: 'Poster Kesiapsiagaan Gempa Bumi Banten 2026',
    category: 'Mitigasi Bencana',
    description: 'Panduan infografis kesiapsiagaan mandiri masyarakat saat gempa bumi, jalur evakuasi, dan koordinasi EMT di daerah Sumur Pandeglang.',
    date: '22 Juli 2026',
    fileSize: '2.4 MB',
    pages: 1,
    gradient: 'from-orange-500 via-rose-500 to-red-600',
    downloads: 142,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 2,
    title: 'Panduan Respon Cepat Kesehatan Darurat Pasca-Banjir DKI',
    category: 'Panduan Klinis',
    description: 'Buku panduan taktis mengenai sanitasi darurat pengungsian, pencegahan KLB penyakit menular, dan pengelolaan air bersih bagi korban terdampak.',
    date: '21 Juli 2026',
    fileSize: '4.1 MB',
    pages: 12,
    gradient: 'from-teal-500 via-cyan-500 to-blue-600',
    downloads: 98,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 3,
    title: 'Analisis Tren & Evaluasi Fatalitas Bencana Kuartal II',
    category: 'Laporan EOC',
    description: 'Infografis komparatif statistika kejadian bencana nasional, tingkat fatalitas kasus (CFR), dan efisiensi waktu respon tim medis darurat (EMT).',
    date: '18 Juli 2026',
    fileSize: '6.8 MB',
    pages: 8,
    gradient: 'from-purple-500 via-indigo-500 to-blue-600',
    downloads: 215,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 4,
    title: 'Poster Higienitas & PHBS di Kamp Pengungsian Terpusat',
    category: 'Promosi Kesehatan',
    description: 'Poster edukasi interaktif visual perilaku hidup bersih sehat di posko pengungsian mandiri guna menekan risiko penularan diare & ISPA.',
    date: '10 Juli 2026',
    fileSize: '1.8 MB',
    pages: 1,
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    downloads: 184,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 5,
    title: 'Infografis Kesiapan Kapasitas Faskes Rujukan Jawa Barat',
    category: 'Laporan EOC',
    description: 'Pemetaan kapasitas pelayanan IGD darurat, ketersediaan obat esensial (INN generik), dan BOR faskes rujukan di zona rawan gempa.',
    date: '05 Juli 2026',
    fileSize: '3.5 MB',
    pages: 3,
    gradient: 'from-blue-500 via-indigo-650 to-purple-700',
    downloads: 76,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1586772002160-b0ac5968b29f?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 6,
    title: 'Poster Mitigasi Kesehatan Erupsi Gunung Berapi Aktif',
    category: 'Mitigasi Bencana',
    description: 'Panduan visual perlindungan pernapasan abu vulkanik, titik kumpul medis darurat, dan zonasi risiko wilayah merah letusan.',
    date: '28 Juni 2026',
    fileSize: '2.1 MB',
    pages: 1,
    gradient: 'from-red-500 via-amber-500 to-yellow-600',
    downloads: 129,
    pdfUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1461088945293-0c17689e48ac?auto=format&fit=crop&q=80&w=400',
  },
]

export default function InfografisPage() {
  const [infographics, setInfographics] = useState<InfographicItem[]>(mockInfographics)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [activePreview, setActivePreview] = useState<InfographicItem | null>(null)
  
  // Generator states
  const [genTitle, setGenTitle] = useState('')
  const [genCategory, setGenCategory] = useState('Mitigasi Bencana')
  const [genPrompt, setGenPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genSuccess, setGenSuccess] = useState(false)

  // Categories extraction
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

  // Generator simulation
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!genTitle.trim()) return

    setGenerating(true)
    
    // Simulate AI generation process (2.5 seconds)
    setTimeout(() => {
      const colors = [
        'from-fuchsia-500 to-pink-650',
        'from-teal-500 to-emerald-600',
        'from-violet-500 to-purple-700',
        'from-cyan-500 to-blue-650',
        'from-rose-500 to-red-650',
      ]
      const chosenGradient = colors[Math.floor(Math.random() * colors.length)]
      
      const newInfographic: InfographicItem = {
        id: Date.now(),
        title: genTitle,
        category: genCategory,
        description: genPrompt || `Laporan infografis instan yang digenerate secara cerdas oleh AI berdasarkan data terkini mengenai ${genTitle}.`,
        date: 'Hari ini',
        fileSize: `${(Math.random() * 5 + 1.5).toFixed(1)} MB`,
        pages: Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 5) + 2,
        gradient: chosenGradient,
        downloads: 0,
        pdfUrl: '#',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
      }

      setInfographics((prev) => [newInfographic, ...prev])
      setGenerating(false)
      setGenSuccess(true)
      
      // Reset input
      setGenTitle('')
      setGenPrompt('')

      setTimeout(() => {
        setGenSuccess(false)
        setIsGeneratorOpen(false)
      }, 1500)
    }, 2500)
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8 space-y-8 min-h-[calc(100vh-140px)] bg-slate-50/50">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-xl border border-teal-100">
              <FileText className="h-6 w-6 text-teal-700" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-wide">
              Galeri Infografis & Dokumen AI
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-550 font-medium">
            Kumpulan dokumen laporan PDF dan poster infografis hasil generate Gemini AI berdasarkan data riil kebencanaan.
          </p>
        </div>

        <button
          onClick={() => setIsGeneratorOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-[#047D78] hover:bg-[#03605c] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm hover:scale-[1.02] active:scale-95 shrink-0"
        >
          <Sparkles className="h-4.5 w-4.5 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span>Generate Infografis AI</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul infografis atau dokumen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none bg-slate-50/50"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide border transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-650 border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Infographics Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] hover:border-slate-300 transition-all duration-200"
            >
              
              {/* Product Cover/Poster Thumbnail */}
              <div className="relative h-[220px] w-full bg-slate-900 overflow-hidden group">
                {/* Gradient Shape Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90 transition-opacity duration-300 group-hover:opacity-95`} />
                
                {/* Visual Art Elements (Decorative abstract UI grid for digital product aesthetic) */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Floating AI Badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white text-[9px] font-black uppercase tracking-widest">
                  <Sparkles className="h-3 w-3 fill-yellow-300 text-yellow-300 animate-pulse" />
                  <span>Generated AI</span>
                </div>

                {/* PDF Pages Badge */}
                <div className="absolute top-4 right-4 z-10 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg text-white text-[10px] font-extrabold">
                  {item.pages} {item.pages === 1 ? 'Halaman' : 'Hlm'}
                </div>

                {/* Cover Center Content (Product Title style) */}
                <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center text-white select-none">
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm mb-3">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider leading-snug line-clamp-2 max-w-xs">
                    {item.title}
                  </h3>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-teal-100/90">
                    <Clock className="h-3 w-3 text-teal-200/90" />
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Hover Quick Action Screen */}
                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200 z-20">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/25 hover:scale-105 transition"
                    title="Pratinjau Poster"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <a
                    href={item.pdfUrl}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 hover:scale-105 transition"
                    title="Unduh PDF Dokumen"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Card Meta & Detail Info */}
              <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-150 text-teal-750 text-[9px] font-black uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-455 font-bold">
                      {item.fileSize}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setActivePreview(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Pratinjau</span>
                  </button>

                  <a
                    href={item.pdfUrl}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
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
        <div className="bg-white p-12 text-center border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="mx-auto w-12 h-12 bg-slate-100 flex items-center justify-center rounded-2xl text-slate-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850">Tidak ada hasil ditemukan</h3>
            <p className="text-xs text-slate-450">Cobalah ubah kata kunci atau ganti filter kategori.</p>
          </div>
        </div>
      )}

      {/* ── Generate Infografis Modal ── */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600 fill-teal-100" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Generate Infografis Baru (AI)
                </h3>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-450 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            {genSuccess ? (
              <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-100 animate-bounce">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-850">Infografis Berhasil Dibuat!</h4>
                  <p className="text-xs text-slate-500">Poster dan dokumen PDF AI baru telah ditambahkan ke galeri.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-6 overflow-y-auto space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-650 uppercase tracking-wider">
                    Judul Dokumen / Poster
                  </label>
                  <input
                    type="text"
                    required
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="Contoh: Poster Kesiapsiagaan Longsor Sukabumi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-650 uppercase tracking-wider">
                    Kategori Laporan
                  </label>
                  <select
                    value={genCategory}
                    onChange={(e) => setGenCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 bg-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Mitigasi Bencana">Mitigasi Bencana</option>
                    <option value="Panduan Klinis">Panduan Klinis</option>
                    <option value="Laporan EOC">Laporan EOC</option>
                    <option value="Promosi Kesehatan">Promosi Kesehatan</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-650 uppercase tracking-wider flex items-center justify-between">
                    <span>Prompt Khusus untuk AI (Opsional)</span>
                    <span className="text-[9px] text-teal-650 font-bold lowercase tracking-normal">Gunakan Gemini AI</span>
                  </label>
                  <textarea
                    rows={4}
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Jelaskan data spesifik atau instruksi yang ingin dianalisis oleh AI menjadi infografis..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Warning note */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-[10px] leading-relaxed text-slate-500 font-semibold">
                    💡 <strong>Catatan AI:</strong> Sistem akan mengolah statistik bencana, data logistik, dan peta kerentanan terbaru di database lokal menjadi infografis terstruktur & file dokumen PDF siap pakai.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#047D78] hover:bg-[#03605c] disabled:bg-teal-550/60 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm"
                >
                  {generating ? (
                    <>
                      <Wand2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Sedang Merancang & Menulis PDF...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4.5 w-4.5" />
                      <span>Mulai Generate via Gemini AI</span>
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Poster Cover Header Art */}
            <div className={`relative h-[250px] w-full bg-gradient-to-br ${activePreview.gradient} flex flex-col justify-center items-center text-center p-6 text-white shrink-0`}>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />
              
              <button
                onClick={() => setActivePreview(null)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm mb-3">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider leading-snug line-clamp-2 max-w-sm">
                {activePreview.title}
              </h3>
              <p className="text-[10px] text-teal-150/90 font-extrabold uppercase tracking-widest mt-1">
                {activePreview.category} | {activePreview.fileSize}
              </p>
            </div>

            {/* Poster Body Details */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Deskripsi Infografis
                </h4>
                <p className="text-xs md:text-sm text-slate-650 leading-relaxed font-semibold">
                  {activePreview.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Generate</span>
                  <p className="text-xs font-bold text-slate-800">{activePreview.date}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Halaman</span>
                  <p className="text-xs font-bold text-slate-800">{activePreview.pages} Halaman</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={activePreview.imageUrl}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  <Eye className="h-4 w-4" />
                  <span>Lihat Poster</span>
                </a>

                <a
                  href={activePreview.pdfUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#047D78] hover:bg-[#03605c] text-white text-xs font-bold rounded-xl transition shadow-sm"
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
