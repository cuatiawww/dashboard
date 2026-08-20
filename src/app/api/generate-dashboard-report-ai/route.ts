import { NextResponse } from 'next/server'

/**
 * POST /api/generate-dashboard-report-ai
 *
 * Server-side proxy yang memanggil Gemini AI langsung untuk generate
 * sintesis analisis surveilans EOC.
 * Key tersimpan di .env (server-only), aman dari client exposure.
 *
 * Flow:
 *   1. Coba forward ke backend PHP (sipkk-baru.test) dulu
 *   2. Jika backend gagal, panggil Gemini AI langsung dengan multi-model rotation
 *   3. Tidak ada fallback template statis — harus dari AI
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ── Step 1: Forward ke Backend PHP ──
    const backendBase = (
      process.env.SIPKK_BACKEND_BASE_URL || 'http://sipkk-baru.test'
    ).replace(/\/+$/, '')

    const dashboardToken = process.env.SIPKK_DASHBOARD_TTOKEN?.trim() || ''
    const authHeader = req.headers.get('authorization') || ''
    const clientToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : ''
    const tokenToSend = clientToken || dashboardToken

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (tokenToSend) forwardHeaders['TTOKEN'] = tokenToSend

    let aiData: any = null

    try {
      console.log('[generate-dashboard-report-ai] Forwarding to backend PHP...')
      const backendRes = await fetch(`${backendBase}/api/generate-dashboard-report-ai`, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify(body),
        cache: 'no-store',
      })

      if (backendRes.ok) {
        const json = await backendRes.json()
        if (json.success && json.data) {
          console.log('[generate-dashboard-report-ai] Backend PHP response OK')
          return NextResponse.json(json)
        }
      } else {
        console.warn(`[generate-dashboard-report-ai] Backend returned HTTP ${backendRes.status}`)
      }
    } catch (backendErr) {
      console.warn('[generate-dashboard-report-ai] Backend PHP unreachable:', backendErr)
    }

    // ── Step 2: Direct Gemini AI Call ──
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''
    if (!geminiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY tidak tersedia di server environment' },
        { status: 500 }
      )
    }

    const {
      totalReports = 0,
      totalMeninggal = 0,
      totalLuka = 0,
      totalHilang = 0,
      totalTerdampak = 0,
      totalPengungsi = 0,
      totalFaskes = 0,
      filterWilayahText = 'Seluruh Wilayah (Nasional)',
      filterBencanaText = 'Semua Jenis Bencana',
      timePresetText = 'Semua Periode',
      topRegions = [],
      topJenis = [],
    } = body

    const topRegionsStr = (topRegions as any[]).slice(0, 5).map((r: any, i: number) =>
      `${i + 1}. ${r.name}: ${r.total_laporan} Kejadian (MD: ${r.korban_meninggal || 0}, LK: ${r.korban_luka || 0}, HL: ${r.korban_hilang || 0}, Terdampak: ${(r.penduduk_terdampak || 0) + (r.pengungsi || 0)}, Dominan: ${r.bencana_dominan || '-'})`
    ).join('\n')

    const topJenisStr = (topJenis as any[]).slice(0, 5).map((j: any) =>
      `- ${j.name || j[0] || 'Lainnya'}: ${j.count || j[1] || 0} kejadian`
    ).join('\n')

    const prompt = `Anda adalah Kepala Analisis Surveilans Epidemiologi & Tanggap Bencana Pusat Krisis Kesehatan (EOC) Kementerian Kesehatan Republik Indonesia.
Tugas Anda adalah membuat sintesis intelejen surveilans bencana kesehatan resmi yang sangat komprehensif, terstruktur formal, dan berbobot analitis mendalam berdasarkan parameter statistik berikut:

Parameter Data:
- Cakupan Wilayah: ${filterWilayahText}
- Jenis Bencana Terfilter: ${filterBencanaText}
- Periode Waktu: ${timePresetText}
- Total Laporan Kejadian: ${totalReports} Kejadian
- Korban Meninggal Dunia: ${totalMeninggal} Jiwa
- Korban Luka-Luka: ${totalLuka} Jiwa
- Korban Hilang: ${totalHilang} Jiwa
- Penduduk Terdampak: ${totalTerdampak} Jiwa
- Pengungsi di Posko: ${totalPengungsi} Jiwa
- Fasilitas Pelayanan Kesehatan Terdampak: ${totalFaskes} Unit

Sebaran Wilayah Terparah:
${topRegionsStr}

Distribusi Jenis Bencana:
${topJenisStr}

Susun respons HANYA dalam format JSON murni yang valid (tanpa blok markdown triple backtick):
{
  "ringkasan_laporan": "Laporan pengawasan surveilans krisis kesehatan dan kebencanaan...",
  "poin_utama": [
    "**Pemantauan Agregat & Skala Dampak:** ...",
    "**Distribusi Spasial & Koridor Hotspot:** ...",
    "**Karakteristik Bahaya & Bencana Dominan:** ...",
    "**Surveilans Penyakit Potensial KLB di Pengungsian:** ...",
    "**Kesiapsiagaan Fasilitas Pelayanan Kesehatan (Faskes):** ...",
    "**Aktivasi Protokol Emergency Medical Team (EMT):** ..."
  ],
  "aktivitas_indikator": [
    {
      "indikator": "Kejadian Bencana Hidrometeorologi & Geologi",
      "tren": "Meningkat/Terkendali",
      "level": "Siaga Darurat/Waspada",
      "keterangan": "..."
    },
    {
      "indikator": "Tingkat Fatalitas & Morbiditas Jiwa",
      "tren": "...",
      "level": "...",
      "keterangan": "..."
    },
    {
      "indikator": "Surveilans Potensi KLB di Pengungsian",
      "tren": "...",
      "level": "...",
      "keterangan": "..."
    },
    {
      "indikator": "Kesiapsiagaan Kapasitas Fasyankes & Tim Medis (EMT)",
      "tren": "...",
      "level": "...",
      "keterangan": "..."
    }
  ],
  "rekomendasi_emt": [
    {
      "fase": "Fase 1: Respons Akut (0 - 72 Jam)",
      "tindakan": "..."
    },
    {
      "fase": "Fase 2: Surveilans & Sanitasi (Hari ke 4 - 14)",
      "tindakan": "..."
    },
    {
      "fase": "Fase 3: Pemulihan & Transisi Pelayanan",
      "tindakan": "..."
    }
  ],
  "himbauan_masyarakat": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}`

    const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

    for (const modelName of models) {
      try {
        console.log(`[generate-dashboard-report-ai] Trying Gemini model: ${modelName}`)
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 8192,
                topP: 0.95,
              },
            }),
          }
        )

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json()
          const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            let cleanJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '')
            if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3)
            const parsed = JSON.parse(cleanJson.trim())
            if (parsed && parsed.poin_utama) {
              aiData = parsed
              console.log(`[generate-dashboard-report-ai] Gemini ${modelName} success!`)
              break
            }
          }
        } else {
          const errStatus = geminiRes.status
          console.warn(`[generate-dashboard-report-ai] Gemini ${modelName} HTTP ${errStatus}`)
          if (errStatus === 429 || errStatus === 403) continue
        }
      } catch (modelErr) {
        console.warn(`[generate-dashboard-report-ai] Gemini ${modelName} error:`, modelErr)
      }
    }

    if (!aiData) {
      return NextResponse.json(
        { success: false, error: 'Semua model Gemini AI gagal menghasilkan respons. Periksa API key.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: aiData,
      source: 'gemini-direct',
    })
  } catch (err) {
    console.error('[generate-dashboard-report-ai] Fatal error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
