import { NextResponse } from 'next/server'

type InsightResponse = {
  summary: string
  recommendations: string[]
}

function fallbackRecommendationsFromGaps(
  gaps: Array<{ name: string; pct: number }>
): string[] {
  return gaps.slice(0, 4).map((g, i) => {
    const bulan = i + 2
    return `<strong>Fokus ${g.name}</strong> - Prioritaskan intervensi pada gap ${g.pct}% dengan rencana aksi terukur dalam ${bulan} bulan.`
  })
}

function parseInsightText(
  raw: string,
  gaps: Array<{ name: string; pct: number }>
): InsightResponse {
  const text = raw.replace(/\r\n/g, '\n').trim()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  let summary = ''
  const recommendations: string[] = []
  let inSummary = false
  let inRecommendations = false

  for (const line of lines) {
    const upper = line.toUpperCase()

    if (upper.startsWith('RINGKASAN:')) {
      inSummary = true
      inRecommendations = false
      const v = line.slice(line.indexOf(':') + 1).trim()
      if (v) summary = v
      continue
    }

    if (upper.startsWith('REKOMENDASI:')) {
      inSummary = false
      inRecommendations = true
      continue
    }

    if (inSummary) {
      summary = summary ? `${summary} ${line}` : line
      continue
    }

    if (inRecommendations) {
      const clean = line.replace(/^\d+[\).\s-]*/, '').trim()
      if (clean) recommendations.push(clean)
    }
  }

  // Fallback summary: ambil 1-2 kalimat awal jika label tidak ada.
  if (!summary) {
    const firstParagraph = text.split('\n\n')[0]?.trim() ?? ''
    const sentenceParts = firstParagraph
      .replace(/^#+\s*/, '')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
    summary = sentenceParts.slice(0, 2).join(' ').trim() || lines.slice(0, 2).join(' ')
  }

  // Fallback recommendations: ambil bullet/nomor dari teks jika label REKOMENDASI tidak terdeteksi.
  if (recommendations.length === 0) {
    const bulletCandidates = lines
      .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[\).\s-]*/, '').trim())
      .filter((line) => line.length > 24 && !/^RINGKASAN[:\s]/i.test(line) && !/^REKOMENDASI[:\s]/i.test(line))

    for (const candidate of bulletCandidates.slice(0, 6)) {
      recommendations.push(candidate)
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(...fallbackRecommendationsFromGaps(gaps))
  }

  return {
    summary,
    recommendations: recommendations.slice(0, 6),
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum diatur di environment' },
        { status: 500 }
      )
    }

    const body = await req.json()

    // ── Check if this is the new Disaster/SIPKK Data Request ──
    if (body.bencanaData) {
      const { bencanaData } = body
      const regionLabel = bencanaData.regionLabel || 'Nasional'
      
      const prompt = `
Kamu adalah Senior Crisis Health Analyst di Emergency Operation Center (EOC) Kementerian Kesehatan RI dengan pengalaman internasional dan sangat familiar dengan standar dari WHO (World Health Organization) Health Emergency Response Framework, UNDRR, IMS (Incident Management System), PHEOC (Public Health Emergency Operations Center), dan praktik global penanganan krisis kesehatan akibat bencana dan pandemi.

Lakukan analisis komprehensif, evidence-based, dan berbobot strategis (setara laporan WHO / World Bank) terhadap data bencana aktif berikut:

DATA BENCANA AKTIF (${regionLabel}):
- Total Kejadian Bencana: ${bencanaData.summary.total_bencana}
- Total Krisis Kesehatan: ${bencanaData.summary.total_krisis}
- Korban Meninggal: ${bencanaData.summary.total_meninggal} Jiwa
- Korban Luka-Luka: ${bencanaData.summary.total_luka} Jiwa
- Korban Hilang: ${bencanaData.summary.total_hilang} Jiwa
- Jumlah Pengungsi: ${bencanaData.summary.total_pengungsi} Jiwa
- Total Penduduk Terdampak: ${bencanaData.summary.total_terdampak} Jiwa

DAFTAR BENCANA TERDOMINAN:
${(bencanaData.jenis_bencana || []).map((jb: any) => `- ${jb.nama}: ${jb.jumlah} kejadian`).join('\n')}

WILAYAH TERAKTIF:
${(bencanaData.wilayah || []).map((w: any) => `- ${w.nama}: ${w.jumlah} kejadian`).join('\n')}

Berikan analisis mendalam dengan membagi respon Anda menjadi DUA bagian utama secara persis (jangan gunakan format markdown asterisks ** atau markdown headings ###, gunakan pemisah teks biasa):

[ANALISIS RISK ASSESSMENT]
1. EXECUTIVE SUMMARY
- Analisis situasi krisis secara strategis berdasarkan data aktif di atas.
- Highlight risiko utama dan urgensi penanganan segera.

2. ANALISIS EPIDEMIOLOGIS & DAMPAK KESEHATAN
- Hitung dan tuliskan kalkulasi matematika eksplisit untuk:
  * Case Fatality Rate (CFR) = (Meninggal / (Meninggal + Luka)) * 100%
  * Injury Rate per Incident = (Luka / Total Kejadian)
  * Displacement Ratio = (Pengungsi / Total Penduduk Terdampak)
- Identifikasi potensi secondary health crisis (ancaman epidemiologi penyakit menular pasca-bencana di pos pengungsian seperti diare akut, ISPA, leptospirosis, penyakit kulit, malaria/DBD) akibat sanitasi buruk dan gangguan layanan faskes.

3. RISK & SEVERITY ASSESSMENT
- Klasifikasikan tingkat krisis (pilih salah satu secara tegas: Low, Moderate, High, atau Critical) berdasarkan WHO Health Emergency Framework dan Disaster Risk Index.
- Jelaskan indikator eskalasi situasi yang harus diwaspadai.

4. KOMPARASI GLOBAL
- Bandingkan kondisi di atas dengan studi kasus internasional nyata (misalnya penanganan bencana besar atau krisis pandemi global).
- Ulas perbedaan kapasitas sistem kesehatan, apa yang berhasil dan gagal, serta posisi Indonesia dibanding global benchmark menggunakan standar IMS dan PHEOC.

5. DAMPAK TERHADAP SISTEM KESEHATAN
- Analisis potensi overload rumah sakit rujukan, kapasitas tenaga kesehatan setempat, rantai pasok logistik (obat dan alat medis), serta aksesibilitas layanan kesehatan primer di daerah terisolasi.

6. GAP ANALYSIS
- Identifikasi kelemahan respon saat ini dibandingkan dengan standar WHO. Apa saja aspek penanganan darurat yang belum optimal?

PANDUAN KLINIS & RESPONS CEPAT:
7. REKOMENDASI STRATEGIS (ACTIONABLE & SCALABLE)
Rumuskan rencana tindak lanjut taktis medis darurat:
- Rekomendasi Jangka Pendek (Respon cepat medis, mobilisasi tim EMT/Emergency Medical Team, imunisasi/ATS darurat, logistik medis esensial).
- Rekomendasi Jangka Menengah (Tindakan sanitasi lingkungan darurat posko pengungsian dengan rasio air bersih dan ketersediaan jamban standar WHO 1:20, penguatan sistem faskes penyangga).
- Rekomendasi Jangka Panjang (Strategi mitigasi struktural, surveillance aktif berbasis komunitas, serta kesiapsiagaan PHEOC daerah).
`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1500,
            },
          }),
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        console.error('[ai-insight] Gemini API error:', errText)
        return NextResponse.json(
          { error: 'Gagal memproses permintaan AI dari Gemini', detail: errText },
          { status: 500 }
        )
      }

      const resData = await res.json()
      const raw = resData?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!raw || typeof raw !== 'string') {
        console.error('[ai-insight] Empty Gemini response:', resData)
        return NextResponse.json(
          { error: 'Respons Gemini kosong atau tidak valid', detail: JSON.stringify(resData) },
          { status: 500 }
        )
      }

      return NextResponse.json({ insight: raw })
    }

    // ── Fallback to Posyandu Logic ──
    const { gaps, stats, criticalProvinces } = body

    const prompt = `
Kamu adalah analis kesehatan senior Kementerian Kesehatan RI.
Berikan analisis singkat dan rekomendasi tindakan berdasarkan data berikut:

STATISTIK NASIONAL:
${stats.map((s: { num: string; label: string }) => `- ${s.label}: ${s.num}`).join('\n')}

GAP TERBESAR:
${gaps.map((g: { rank: number; name: string; pct: number }) => `${g.rank}. ${g.name}: ${g.pct}% gap`).join('\n')}

PROVINSI KRITIS:
${criticalProvinces.join(', ')}

Berikan output PERSIS dalam format teks berikut (tanpa markdown, tanpa code block):
RINGKASAN: <ringkasan 2-3 kalimat>
REKOMENDASI:
1. <strong>Judul 1</strong> - tindakan konkret + target waktu
2. <strong>Judul 2</strong> - tindakan konkret + target waktu
3. <strong>Judul 3</strong> - tindakan konkret + target waktu
4. <strong>Judul 4</strong> - tindakan konkret + target waktu
`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai-insight] Google AI error:', errText)
      return NextResponse.json(
        { error: 'Gagal memproses permintaan AI', detail: errText },
        { status: 500 }
      )
    }

    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!raw || typeof raw !== 'string') {
      console.error('[ai-insight] Empty AI response:', data)
      return NextResponse.json(
        { error: 'Respons AI kosong/tidak valid', detail: JSON.stringify(data) },
        { status: 500 }
      )
    }

    const parsed = parseInsightText(raw, gaps)

    if (!parsed?.summary || !Array.isArray(parsed?.recommendations)) {
      return NextResponse.json({
        summary:
          'Analisis otomatis belum sepenuhnya stabil, namun area prioritas tetap terfokus pada penguatan layanan dasar dan pemerataan kualitas fasilitas.',
        recommendations: fallbackRecommendationsFromGaps(gaps),
      })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[ai-insight] Error:', err)
    return NextResponse.json(
      { error: 'Gagal memproses permintaan AI', detail: String(err) },
      { status: 500 }
    )
  }
}
