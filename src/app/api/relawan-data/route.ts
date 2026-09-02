import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// URL Web App Google Apps Script
const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_RELAWAN_URL ||
  process.env.GOOGLE_APPS_SCRIPT_KORBAN_URL ||
  process.env.NEXT_PUBLIC_NTT_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwt-VTU0wNteo_03CyCJIALO2KZ8I6cyya049A16OnslSal6nKqzw7e-y_JIYPIjUZn/exec'

// In-Memory Server Cache (Ultra-Fast Response)
let memoryCache: { [key: string]: { data: any; timestamp: number } } = {}
const CACHE_TTL_MS = 60 * 1000 // 60 Detik TTL

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type') || 'relawan'
    const isRefresh = searchParams.get('refresh') === 'true' || searchParams.get('nocache') === 'true'
    const cacheKey = `relawan_${type}`

    const now = Date.now()
    const cachedEntry = memoryCache[cacheKey]

    // 1. Jika ada di Server Memory Cache dan masih valid (< 60 detik) serta bukan manual refresh
    if (!isRefresh && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        ...cachedEntry.data,
        is_server_cached: true,
        cached_age_seconds: Math.round((now - cachedEntry.timestamp) / 1000)
      })
    }

    // 2. Fetch live data dari Google Apps Script Web App dengan timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000) // 12s timeout

    const url = `${GOOGLE_APPS_SCRIPT_URL}?type=${type}${isRefresh ? '&nocache=true' : ''}`
    
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 }
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        if (json && typeof json === 'object') {
          // Simpan hasil sukses ke Memory Cache
          memoryCache[cacheKey] = {
            data: json,
            timestamp: now
          }

          return NextResponse.json({
            ...json,
            source: 'live_google_sheets_api',
            fetched_at: new Date().toISOString(),
            is_server_cached: false
          })
        }
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      console.warn('[API Relawan Data Fetch Warning]:', fetchErr.message)

      // Jika fetch gagal/timeout tapi kita punya cache sebelumnya, kembalikan data cache
      if (cachedEntry && cachedEntry.data) {
        return NextResponse.json({
          ...cachedEntry.data,
          is_server_cached: true,
          is_stale_fallback: true
        })
      }
      throw fetchErr
    }

    throw new Error('Gagal mengambil data dari Google Apps Script.')

  } catch (err: any) {
    console.error('[API Relawan Data Live Fetch Error]:', err.message)

    // Clean empty response jika tidak ada cache sama sekali
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal menarik data live dari Google Spreadsheet.',
        summary: {
          total_registrasi_kumulatif: 0,
          total_relawan_aktif_terkini: 0,
          total_nakes_terdaftar: 0,
          total_non_nakes_terdaftar: 0,
          total_tim_lembaga: 0,
          tanggal_terbaru: ''
        },
        registrasi_relawan: {
          tersedia: false,
          daftar_tanggal: [],
          tren_harian: [],
          summary_jenis_tenaga: [],
          data_detail: []
        },
        relawan_berdasarkan_tim: {
          tersedia: false,
          total_relawan_tim: 0,
          kategori_tim: []
        },
        relawan_aktif_harian: {
          tersedia: false,
          daftar_tanggal: [],
          tren_aktif_harian: [],
          summary_jenis_tenaga: [],
          data_detail: []
        }
      },
      { status: 502 }
    )
  }
}
