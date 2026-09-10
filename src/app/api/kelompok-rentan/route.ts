import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_KELOMPOK_RENTAN_URL ||
  process.env.GOOGLE_APPS_SCRIPT_KORBAN_URL ||
  process.env.NEXT_PUBLIC_NTT_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwt-VTU0wNteo_03CyCJIALO2KZ8I6cyya049A16OnslSal6nKqzw7e-y_JIYPIjUZn/exec'

// In-Memory Server Cache (60s TTL)
let cachedPayload: any = null
let cachedTimestamp = 0
const CACHE_TTL_MS = 60 * 1000

// Snapshot data riil dari Sheet "DATA KELOMPOK RENTAN" (sebagai fallback andal)
const FALLBACK_KELOMPOK_RENTAN = {
  tersedia: true,
  sheet_name: 'DATA KELOMPOK RENTAN',
  source: 'google_spreadsheet_snapshot_fallback',
  tanggal_terbaru: '2026-08-26',
  daftar_tanggal: [
    '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19',
    '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
    '2026-08-25', '2026-08-26'
  ],
  summary: {
    total_seluruh_rentan: 260341,
    total_bayi: 15654,
    total_balita: 57052,
    total_ibu_hamil: 18772,
    total_ibu_menyusui: 6108,
    total_lansia: 151709,
    total_disabilitas: 8224,
    total_odgj: 2822,
    total_kabupaten: 7,
    daftar_kabupaten: [
      'Kab. Sikka', 'Kab. Manggarai Timur', 'Kab. Manggarai',
      'Kab. Ngada', 'Kab. Nagekeo', 'Kab. Ende', 'Kab. Manggarai Barat'
    ],
    daftar_tanggal: [
      '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19',
      '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
      '2026-08-25', '2026-08-26'
    ],
    tanggal_terbaru: '2026-08-26'
  },
  by_variabel: {
    'Bayi': { variabel: 'Bayi', total: 15654, persentase: 6.0, persentase_formatted: '6.0%' },
    'Balita': { variabel: 'Balita', total: 57052, persentase: 21.9, persentase_formatted: '21.9%' },
    'Ibu Hamil': { variabel: 'Ibu Hamil', total: 18772, persentase: 7.2, persentase_formatted: '7.2%' },
    'Ibu Menyusui/Nifas': { variabel: 'Ibu Menyusui/Nifas', total: 6108, persentase: 2.3, persentase_formatted: '2.3%' },
    'Lansia': { variabel: 'Lansia', total: 151709, persentase: 58.3, persentase_formatted: '58.3%' },
    'Disabilitas': { variabel: 'Disabilitas', total: 8224, persentase: 3.2, persentase_formatted: '3.2%' },
    'ODGJ': { variabel: 'ODGJ', total: 2822, persentase: 1.1, persentase_formatted: '1.1%' }
  },
  by_kabupaten: {
    'Kab. Sikka': {
      kabupaten: 'Kab. Sikka',
      total_rentan: 60920,
      variabel: {
        'Bayi': { total: 3904, harian: { '2026-08-15': 2348, '2026-08-19': 1124, '2026-08-21': 113, '2026-08-22': 319 } },
        'Balita': { total: 14803, harian: { '2026-08-15': 8246, '2026-08-19': 4149, '2026-08-21': 369, '2026-08-22': 2039 } },
        'Ibu Hamil': { total: 1734, harian: { '2026-08-15': 9288, '2026-08-19': -7839, '2026-08-20': 285 } },
        'Ibu Menyusui/Nifas': { total: 728, harian: { '2026-08-15': 289, '2026-08-19': 302, '2026-08-21': 9, '2026-08-22': 128 } },
        'Lansia': { total: 32986, harian: { '2026-08-15': 23575, '2026-08-19': 5904, '2026-08-21': 444, '2026-08-22': 3063 } },
        'Disabilitas': { total: 2707, harian: { '2026-08-15': 376, '2026-08-19': 383, '2026-08-20': 1948 } },
        'ODGJ': { total: 1247, harian: { '2026-08-15': 527, '2026-08-19': 327, '2026-08-20': 393 } }
      }
    },
    'Kab. Manggarai Timur': {
      kabupaten: 'Kab. Manggarai Timur',
      total_rentan: 55940,
      variabel: {
        'Bayi': { total: 4233, harian: { '2026-08-15': 4233 } },
        'Balita': { total: 18052, harian: { '2026-08-15': 18052 } },
        'Ibu Hamil': { total: 1456, harian: { '2026-08-15': 904, '2026-08-22': 552, '2026-08-25': -438, '2026-08-26': 438 } },
        'Ibu Menyusui/Nifas': { total: 299, harian: { '2026-08-15': 298, '2026-08-22': 1, '2026-08-25': 6, '2026-08-26': -6 } },
        'Lansia': { total: 29208, harian: { '2026-08-15': 29117, '2026-08-22': 91, '2026-08-25': -31, '2026-08-26': 31 } },
        'Disabilitas': { total: 1974, harian: { '2026-08-22': 1974, '2026-08-25': -376, '2026-08-26': 376 } },
        'ODGJ': { total: 810, harian: { '2026-08-15': 811, '2026-08-22': -1, '2026-08-25': 1, '2026-08-26': -1 } }
      }
    },
    'Kab. Manggarai': {
      kabupaten: 'Kab. Manggarai',
      total_rentan: 8645,
      variabel: {
        'Bayi': { total: 432, harian: { '2026-08-15': 3, '2026-08-17': 7, '2026-08-18': 30, '2026-08-19': 33, '2026-08-20': 23, '2026-08-21': 71, '2026-08-22': 18, '2026-08-23': 29, '2026-08-24': 84, '2026-08-25': 65, '2026-08-26': 87 } },
        'Balita': { total: 1934, harian: { '2026-08-15': 2, '2026-08-16': 1, '2026-08-17': 15, '2026-08-18': 35, '2026-08-19': 38, '2026-08-20': 59, '2026-08-21': 121, '2026-08-22': 1015, '2026-08-23': 71, '2026-08-24': 163, '2026-08-25': 113, '2026-08-26': 242 } },
        'Ibu Hamil': { total: 1063, harian: { '2026-08-15': 7, '2026-08-16': 5, '2026-08-17': 6, '2026-08-18': 37, '2026-08-19': 95, '2026-08-20': 97, '2026-08-21': 86, '2026-08-22': 155, '2026-08-23': 8, '2026-08-24': 211, '2026-08-25': 43, '2026-08-26': 140 } },
        'Ibu Menyusui/Nifas': { total: 183, harian: { '2026-08-15': 3, '2026-08-17': 2, '2026-08-18': 16, '2026-08-19': 23, '2026-08-20': 17, '2026-08-21': 20, '2026-08-22': 35, '2026-08-23': 8, '2026-08-24': 24, '2026-08-25': 14, '2026-08-26': 21 } },
        'Lansia': { total: 4027, harian: { '2026-08-15': 3, '2026-08-17': 26, '2026-08-18': 109, '2026-08-19': 210, '2026-08-20': 205, '2026-08-21': 524, '2026-08-22': 1257, '2026-08-23': 260, '2026-08-24': 418, '2026-08-25': 397, '2026-08-26': 644 } },
        'Disabilitas': { total: 23, harian: { '2026-08-19': 1, '2026-08-20': 6, '2026-08-21': 8, '2026-08-23': 1, '2026-08-24': 7 } },
        'ODGJ': { total: 0, harian: {} }
      }
    },
    'Kab. Ngada': {
      kabupaten: 'Kab. Ngada',
      total_rentan: 60927,
      variabel: {
        'Bayi': { total: 1977, harian: { '2026-08-15': 1977 } },
        'Balita': { total: 9401, harian: { '2026-08-15': 9401 } },
        'Ibu Hamil': { total: 1977, harian: { '2026-08-15': 1977 } },
        'Ibu Menyusui/Nifas': { total: 1975, harian: { '2026-08-15': 1975 } },
        'Lansia': { total: 43260, harian: { '2026-08-15': 43260 } },
        'Disabilitas': { total: 0, harian: {} },
        'ODGJ': { total: 338, harian: { '2026-08-15': 338 } }
      }
    },
    'Kab. Nagekeo': {
      kabupaten: 'Kab. Nagekeo',
      total_rentan: 29228,
      variabel: {
        'Bayi': { total: 1744, harian: { '2026-08-15': 1744 } },
        'Balita': { total: 7061, harian: { '2026-08-15': 7061 } },
        'Ibu Hamil': { total: 2004, harian: { '2026-08-15': 2004 } },
        'Ibu Menyusui/Nifas': { total: 623, harian: { '2026-08-15': 623 } },
        'Lansia': { total: 17604, harian: { '2026-08-15': 17604 } },
        'Disabilitas': { total: 104, harian: { '2026-08-15': 104 } },
        'ODGJ': { total: 88, harian: { '2026-08-15': 88 } }
      }
    },
    'Kab. Ende': {
      kabupaten: 'Kab. Ende',
      total_rentan: 17793,
      variabel: {
        'Bayi': { total: 1852, harian: { '2026-08-15': 1852 } },
        'Balita': { total: 4575, harian: { '2026-08-15': 4575 } },
        'Ibu Hamil': { total: 1680, harian: { '2026-08-15': 1680 } },
        'Ibu Menyusui/Nifas': { total: 890, harian: { '2026-08-15': 890 } },
        'Lansia': { total: 7280, harian: { '2026-08-15': 7280 } },
        'Disabilitas': { total: 1220, harian: { '2026-08-15': 1220 } },
        'ODGJ': { total: 296, harian: { '2026-08-15': 296 } }
      }
    },
    'Kab. Manggarai Barat': {
      kabupaten: 'Kab. Manggarai Barat',
      total_rentan: 26888,
      variabel: {
        'Bayi': { total: 1512, harian: { '2026-08-15': 1512 } },
        'Balita': { total: 5020, harian: { '2026-08-15': 5020 } },
        'Ibu Hamil': { total: 1880, harian: { '2026-08-15': 1880 } },
        'Ibu Menyusui/Nifas': { total: 910, harian: { '2026-08-15': 910 } },
        'Lansia': { total: 16310, harian: { '2026-08-15': 16310 } },
        'Disabilitas': { total: 1196, harian: { '2026-08-15': 1196 } },
        'ODGJ': { total: 60, harian: { '2026-08-15': 60 } }
      }
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const requestedKab = searchParams.get('kabupaten')?.trim().toLowerCase() || ''
    const requestedVar = searchParams.get('variabel')?.trim().toLowerCase() || ''
    const isRefresh = searchParams.get('nocache') === 'true' || searchParams.get('refresh') === 'true'
    const now = Date.now()

    let payload: any = null

    // 1. Cek Server Cache Memory (jika tidak diminta nocache / refresh)
    if (!isRefresh && cachedPayload && (now - cachedTimestamp < CACHE_TTL_MS)) {
      payload = cachedPayload
    } else {
      // 2. Fetch Live dari Google Apps Script Spreadsheet API
      try {
        const fetchUrl = `${GOOGLE_APPS_SCRIPT_URL}${GOOGLE_APPS_SCRIPT_URL.includes('?') ? '&' : '?'}type=kelompok_rentan${isRefresh ? '&nocache=true' : ''}`
        const res = await fetch(fetchUrl, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
          next: { revalidate: 0 }
        })

        if (res.ok) {
          const json = await res.json()
          if (json && json.success && json.summary) {
            payload = json
            cachedPayload = json
            cachedTimestamp = now
          }
        }
      } catch (gasErr: any) {
        console.warn('[API Kelompok Rentan] Live fetch error, using fallback:', gasErr.message)
      }

      // 3. Jika Apps Script belum merespon atau offline, gunakan data snapshot terverifikasi
      if (!payload) {
        payload = FALLBACK_KELOMPOK_RENTAN
      }
    }

    // 4. Terapkan Filter Dinamis jika ada
    let resultByKabupaten = { ...(payload.by_kabupaten || {}) }
    let resultByVariabel = { ...(payload.by_variabel || {}) }

    if (requestedKab && requestedKab !== 'semua' && requestedKab !== 'all') {
      const filteredKab: Record<string, any> = {}
      Object.keys(resultByKabupaten).forEach(k => {
        if (k.toLowerCase().includes(requestedKab)) {
          filteredKab[k] = resultByKabupaten[k]
        }
      })
      resultByKabupaten = filteredKab
    }

    if (requestedVar && requestedVar !== 'semua' && requestedVar !== 'all') {
      const filteredVar: Record<string, any> = {}
      Object.keys(resultByVariabel).forEach(v => {
        if (v.toLowerCase().includes(requestedVar)) {
          filteredVar[v] = resultByVariabel[v]
        }
      })
      resultByVariabel = filteredVar
    }

    return NextResponse.json({
      success: true,
      source: payload.source || 'google_spreadsheet_kelompok_rentan',
      updated_at: payload.updated_at || new Date().toISOString(),
      summary: payload.summary,
      daftar_kabupaten: payload.daftar_kabupaten || Object.keys(payload.by_kabupaten || {}),
      daftar_tanggal: payload.daftar_tanggal || [],
      tanggal_terbaru: payload.tanggal_terbaru || '',
      by_kabupaten: resultByKabupaten,
      by_variabel: resultByVariabel,
      tren_harian: payload.tren_harian || [],
      data_detail: payload.data_detail || []
    })

  } catch (err: any) {
    console.error('[API Kelompok Rentan Error]:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal memuat data kelompok rentan',
        summary: { total_seluruh_rentan: 0 },
        by_kabupaten: {},
        by_variabel: {}
      },
      { status: 500 }
    )
  }
}
