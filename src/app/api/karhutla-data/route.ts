import { NextRequest, NextResponse } from 'next/server'

// ─── High-Performance Server-Side Cache for Google Apps Script ────────────────
let cachedGasPayload: any = null
let cachedGasTimestamp = 0
let inFlightGasPromise: Promise<any> | null = null
const GAS_STALE_TTL_MS = 60_000 // 1 menit: jika kurang dari 1 menit, langsung pakai cache
const GAS_MAX_TTL_MS = 10 * 60_000 // 10 menit: batas maksimal umur cache

const DEFAULT_KARHUTLA_APPS_SCRIPT_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnQrgPfjNZ5BJQrOyPF-Fa6fcB7OLacj-nIw9idFSda1lGM_XvSxd0lWB0KHbnaS7GfDlcMsAIIaprkcie0M6vJfQv20eFa8pd_Vom8kaLFW0D-PizFkQCRsIwthJGK3xSqG3FPgFuZOsd3T2AVH8FFVicipzxaPupH-scv8VDt4r6HE6bdRy2MjQNePSvlidTGssQ1GTrqK5lPKPB97yRNSdRcv6yO0A0coiTNRWwyMhDWQux-mIygk8bsaoQFGs-wB34qCKJK1NeuYoeBfARP5oUAsjQ&lib=MJDqNJ7KZb-xY-mdADesuGqUP6vH7slX0'

function getGasUrl(): string {
  return (
    process.env.GOOGLE_APPS_SCRIPT_KARHUTLA_URL ||
    process.env.NEXT_PUBLIC_KARHUTLA_APPS_SCRIPT_URL ||
    DEFAULT_KARHUTLA_APPS_SCRIPT_URL
  )
}

async function triggerBackgroundGasRefresh(bypassCache = false): Promise<any> {
  if (inFlightGasPromise) return inFlightGasPromise

  inFlightGasPromise = (async () => {
    try {
      const url = getGasUrl()
      if (!url) return null

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        redirect: 'follow',
        cache: bypassCache ? 'no-store' : 'default',
      })

      if (res.ok) {
        const fetched = await res.json()
        if (fetched && fetched.success) {
          cachedGasPayload = fetched
          cachedGasTimestamp = Date.now()
          return fetched
        }
      }
    } catch (err) {
      console.warn('[api/karhutla-data] Gagal fetch dari Google Apps Script:', err)
    } finally {
      inFlightGasPromise = null
    }
    return null
  })()

  return inFlightGasPromise
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const noCache = searchParams.get('nocache') === 'true' || searchParams.get('refresh') === 'true'
    const filterProvinsi = searchParams.get('provinsi')?.trim().toLowerCase() || null

    const now = Date.now()
    const cacheAge = now - cachedGasTimestamp
    const hasCache = cachedGasPayload !== null

    let rawData: any = null

    if (noCache) {
      rawData = await triggerBackgroundGasRefresh(true)
      if (!rawData && hasCache) {
        rawData = cachedGasPayload
      }
    } else if (hasCache) {
      rawData = cachedGasPayload
      // Trigger refresh asynchronously jika sudah melewati batas stale TTL
      if (cacheAge > GAS_STALE_TTL_MS) {
        triggerBackgroundGasRefresh()
      }
    } else {
      rawData = await triggerBackgroundGasRefresh()
    }

    if (!rawData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal memuat data dari endpoint Google Apps Script Karhutla.',
        },
        { status: 502 }
      )
    }

    // Jika filter provinsi diberikan, siapkan data yang terfilter
    let responseData = rawData
    if (filterProvinsi && filterProvinsi !== 'semua' && filterProvinsi !== 'all') {
      const matchProv = (provName?: string) =>
        provName ? provName.toLowerCase().includes(filterProvinsi) : false

      const filteredPenduduk = (rawData.penduduk_terdampak?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredIspa = (rawData.ispa?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredPenyakit = (rawData.penyakit_lainnya?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredIspu = (rawData.ispu?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredLogDinkes = (rawData.logistik?.dinkes?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredLogPuskris = (rawData.logistik?.puskris?.data || []).filter((d: any) =>
        matchProv(d.provinsi)
      )
      const filteredSdmk = (rawData.sdmk?.data || []).filter((d: any) => matchProv(d.provinsi))
      const filteredUpaya = (rawData.upaya?.data || []).filter(
        (d: any) => matchProv(d.wilayah) || d.wilayah?.toLowerCase() === 'nasional'
      )

      responseData = {
        ...rawData,
        filter_active: filterProvinsi,
        penduduk_terdampak: {
          ...rawData.penduduk_terdampak,
          data: filteredPenduduk,
        },
        ispa: {
          ...rawData.ispa,
          data: filteredIspa,
        },
        penyakit_lainnya: {
          ...rawData.penyakit_lainnya,
          data: filteredPenyakit,
        },
        ispu: {
          ...rawData.ispu,
          data: filteredIspu,
        },
        logistik: {
          dinkes: {
            ...rawData.logistik?.dinkes,
            data: filteredLogDinkes,
          },
          puskris: {
            ...rawData.logistik?.puskris,
            data: filteredLogPuskris,
          },
        },
        sdmk: {
          ...rawData.sdmk,
          data: filteredSdmk,
        },
        upaya: {
          ...rawData.upaya,
          data: filteredUpaya,
        },
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('[api/karhutla-data] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
