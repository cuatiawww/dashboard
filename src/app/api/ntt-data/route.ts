import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  enrichNttFaskesRow,
  enrichNttFaskesTable,
  getAllNttMasterFaskesWithCollectorOverlay,
  getNttMasterFaskesSummary,
} from '@/lib/nttFaskesMasterMapper'
import { readNttDatabase } from '@/lib/nttDatabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Data directory candidates for manifest-based collector output (per-date CSVs).
 * The collector (collector.py) writes to public/data/ntt.
 */
const MANIFEST_DIR_CANDIDATES = [
  process.env.NTT_DATA_DIR ? path.resolve(process.env.NTT_DATA_DIR) : null,
  path.join(process.cwd(), 'public', 'data', 'ntt'),
  path.join(process.cwd(), 'data', 'ntt'),
].filter((value): value is string => Boolean(value))

const TABLES = [
  'analisa_ringkasan_harian',
  'situasi_kesehatan',
  'pasien_rs',
  'pasien_puskesmas',
  'surveilans_penyakit',
  'master_faskes',
] as const

type TableName = (typeof TABLES)[number]

type Manifest = {
  version?: number
  source_url?: string
  updated_at?: string
  latest_date?: string
  dates?: Record<string, Partial<Record<TableName, string>>>
}

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

function isTableName(value: string): value is TableName {
  return (TABLES as readonly string[]).includes(value)
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

async function locateManifestDir(): Promise<string | null> {
  for (const dir of MANIFEST_DIR_CANDIDATES) {
    try {
      await fs.access(path.join(dir, 'manifest.json'))
      return dir
    } catch {
      // try next
    }
  }
  return null
}

async function readManifest(dataDir: string): Promise<Manifest> {
  const content = await fs.readFile(path.join(dataDir, 'manifest.json'), 'utf8')
  return JSON.parse(content) as Manifest
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    })
    return result.data || []
  } catch {
    return []
  }
}

/**
 * Normalize CSV rows: convert any header format ("Luka Berat", "Nama RS", etc.)
 * to consistent snake_case lowercase keys so all frontend consumers work uniformly.
 */
function normalizeTableRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows
  return rows.map(row => {
    const out: Record<string, unknown> = {}
    Object.entries(row).forEach(([k, v]) => {
      const key = k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      out[key] = v
    })
    return out
  })
}

const GOOGLE_APPS_SCRIPT_KORBAN_URL =
  process.env.GOOGLE_APPS_SCRIPT_KORBAN_URL ||
  process.env.NEXT_PUBLIC_NTT_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwt-VTU0wNteo_03CyCJIALO2KZ8I6cyya049A16OnslSal6nKqzw7e-y_JIYPIjUZn/exec'

// Hardcoded real fallback dataset from spreadsheet (15-25 Aug 2026 for 7 Kab NTT)
const REAL_SPREADSHEET_KORBAN_DATA = {
  "daftar_tanggal": [
    "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19",
    "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24",
    "2026-08-25"
  ],
  "summary": {
    "populasi_terdampak": 1917732,
    "meninggal": 105,
    "luka_berat": 385,
    "luka_ringan": 1287,
    "total_luka": 1672,
    "total_korban": 1777,
    "pengungsi": 185131,
    "titik_pengungsian": 397
  },
  "data_kabupaten": [
    {
      "kabupaten": "Kab. Sikka",
      "populasi_terdampak": 350715,
      "meninggal": 6,
      "luka_berat": 23,
      "luka_ringan": 20,
      "total_luka": 43,
      "total_korban": 49,
      "pengungsi": 18829,
      "titik_pengungsian": 9,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 345319, "meninggal": 3, "luka_berat": 0, "luka_ringan": 6, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 3, "luka_ringan": 9, "pengungsi": 1694, "titik_pengungsian": 4 },
        "2026-08-17": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 3, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 2 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-19": { "populasi_terdampak": 5396, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 278, "titik_pengungsian": 3 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 3, "luka_berat": 17, "luka_ringan": 3, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 5132, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 10483, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 1085, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 161, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-26": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 2, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-27": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-28": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 }
      }
    },
    {
      "kabupaten": "Kab. Manggarai Timur",
      "populasi_terdampak": 313876,
      "meninggal": 36,
      "luka_berat": 239,
      "luka_ringan": 404,
      "total_luka": 643,
      "total_korban": 679,
      "pengungsi": 31372,
      "titik_pengungsian": 246,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 301525, "meninggal": 17, "luka_berat": 1, "luka_ringan": 18, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 37, "titik_pengungsian": 0 },
        "2026-08-17": { "populasi_terdampak": 12351, "meninggal": 8, "luka_berat": 161, "luka_ringan": 386, "pengungsi": 19293, "titik_pengungsian": 246 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-19": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 20, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 57, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 473, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 4, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 11569, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 3, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 2, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 }
      }
    },
    {
      "kabupaten": "Kab. Manggarai",
      "populasi_terdampak": 340153,
      "meninggal": 41,
      "luka_berat": 58,
      "luka_ringan": 484,
      "total_luka": 542,
      "total_korban": 583,
      "pengungsi": 50939,
      "titik_pengungsian": 14,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 340153, "meninggal": 21, "luka_berat": 23, "luka_ringan": 16, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 2, "luka_berat": 4, "luka_ringan": 10, "pengungsi": 2078, "titik_pengungsian": 0 },
        "2026-08-17": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 4, "luka_berat": 5, "luka_ringan": 78, "pengungsi": 8005, "titik_pengungsian": 14 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 19899, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 4, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 11445, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 5092, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 6, "luka_berat": 26, "luka_ringan": 370, "pengungsi": 1321, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 3, "luka_berat": 0, "luka_ringan": 18, "pengungsi": 2716, "titik_pengungsian": 0 }
      }
    },
    {
      "kabupaten": "Kab. Ngada",
      "populasi_terdampak": 176462,
      "meninggal": 5,
      "luka_berat": 15,
      "luka_ringan": 87,
      "total_luka": 102,
      "total_korban": 107,
      "pengungsi": 2551,
      "titik_pengungsian": 71,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 176462, "meninggal": 1, "luka_berat": 2, "luka_ringan": 3, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-17": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 5, "luka_ringan": 16, "pengungsi": 1333, "titik_pengungsian": 27 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-19": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 7, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 1, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 1218, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 2, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 67, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 1, "pengungsi": 0, "titik_pengungsian": 44 }
      }
    },
    {
      "kabupaten": "Kab. Nagekeo",
      "populasi_terdampak": 170669,
      "meninggal": 13,
      "luka_berat": 33,
      "luka_ringan": 119,
      "total_luka": 152,
      "total_korban": 165,
      "pengungsi": 50644,
      "titik_pengungsian": 70,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 170669, "meninggal": 1, "luka_berat": 1, "luka_ringan": 5, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 3, "luka_ringan": 4, "pengungsi": 440, "titik_pengungsian": 4 },
        "2026-08-17": { "populasi_terdampak": 0, "meninggal": 6, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 9, "luka_ringan": 0, "pengungsi": 5781, "titik_pengungsian": 66 },
        "2026-08-19": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 4, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 21883, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 6152, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 20, "luka_ringan": 109, "pengungsi": 14803, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 1, "pengungsi": 1299, "titik_pengungsian": 0 }
      }
    },
    {
      "kabupaten": "Kab. Ende",
      "populasi_terdampak": 284165,
      "meninggal": 3,
      "luka_berat": 11,
      "luka_ringan": 79,
      "total_luka": 90,
      "total_korban": 93,
      "pengungsi": 4417,
      "titik_pengungsian": 25,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 284165, "meninggal": 1, "luka_berat": 0, "luka_ringan": 11, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 4, "luka_ringan": 4, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-17": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 0, "luka_ringan": 7, "pengungsi": 2717, "titik_pengungsian": 23 },
        "2026-08-18": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 132, "titik_pengungsian": 2 },
        "2026-08-19": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 1, "luka_ringan": 35, "pengungsi": 295, "titik_pengungsian": 0 },
        "2026-08-20": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 10, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 154, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 131, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 346, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 1, "luka_berat": 6, "luka_ringan": 12, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 519, "titik_pengungsian": 0 }
      }
    },
    {
      "kabupaten": "Kab. Manggarai Barat",
      "populasi_terdampak": 281692,
      "meninggal": 1,
      "luka_berat": 6,
      "luka_ringan": 86,
      "total_luka": 92,
      "total_korban": 93,
      "pengungsi": 27167,
      "titik_pengungsian": 9,
      "harian": {
        "2026-08-15": { "populasi_terdampak": 281692, "meninggal": 1, "luka_berat": 2, "luka_ringan": 4, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-16": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 1603, "titik_pengungsian": 9 },
        "2026-08-21": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 4000, "titik_pengungsian": 0 },
        "2026-08-22": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 14351, "titik_pengungsian": 0 },
        "2026-08-23": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 0, "pengungsi": 4775, "titik_pengungsian": 0 },
        "2026-08-24": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 4, "luka_ringan": 74, "pengungsi": 0, "titik_pengungsian": 0 },
        "2026-08-25": { "populasi_terdampak": 0, "meninggal": 0, "luka_berat": 0, "luka_ringan": 8, "pengungsi": 2438, "titik_pengungsian": 0 }
      }
    }
  ]
}

// ─── High-Performance Server-Side Cache for Google Apps Script (30s TTL) ────
let cachedGasPayload: any = null
let cachedGasTimestamp = 0
let inFlightGasPromise: Promise<any> | null = null
const GAS_CACHE_TTL_MS = 30_000 // 30 detik

async function fetchGoogleAppsScriptData(): Promise<any> {
  const now = Date.now()
  if (cachedGasPayload && (now - cachedGasTimestamp < GAS_CACHE_TTL_MS)) {
    return cachedGasPayload
  }

  if (inFlightGasPromise) {
    return inFlightGasPromise
  }

  inFlightGasPromise = (async () => {
    try {
      if (GOOGLE_APPS_SCRIPT_KORBAN_URL) {
        const gasRes = await fetch(GOOGLE_APPS_SCRIPT_KORBAN_URL, {
          headers: { Accept: 'application/json' },
          redirect: 'follow',
        })
        if (gasRes.ok) {
          const fetched = await gasRes.json()
          if (fetched && fetched.success && Array.isArray(fetched.data_kabupaten)) {
            cachedGasPayload = fetched
            cachedGasTimestamp = Date.now()
            return fetched
          }
        }
      }
    } catch (err) {
      console.warn('[API ntt-data] Live Google Sheets fetch failed, using fallback:', err)
    } finally {
      inFlightGasPromise = null
    }
    return cachedGasPayload || REAL_SPREADSHEET_KORBAN_DATA
  })()

  return inFlightGasPromise
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const requestedDate = searchParams.get('tanggal')?.trim() || ''
  const requestedTable = searchParams.get('tabel')?.trim() || ''

  if (requestedDate && !isValidDate(requestedDate)) {
    return jsonResponse(
      { success: false, error: 'invalid_date', message: 'Format tanggal harus YYYY-MM-DD.' },
      400,
    )
  }

  if (requestedTable && !isTableName(requestedTable)) {
    return jsonResponse(
      { success: false, error: 'invalid_table', tables: TABLES },
      400,
    )
  }

  const tableNames: TableName[] = requestedTable
    ? [requestedTable as TableName]
    : [...TABLES]

  // ─── Priority 1: Google Apps Script Live Korban & Penduduk Terdampak API ─────
  try {
    const rawKorbanJson = await fetchGoogleAppsScriptData()

    if (rawKorbanJson && Array.isArray(rawKorbanJson.data_kabupaten)) {
      const rawDates = (Array.isArray(rawKorbanJson.daftar_tanggal) && rawKorbanJson.daftar_tanggal.length > 0)
        ? rawKorbanJson.daftar_tanggal.slice().sort()
        : REAL_SPREADSHEET_KORBAN_DATA.daftar_tanggal.slice().sort()
        
      // Batasi tanggal: hanya tanggal yang sudah memiliki data laporan terkonfirmasi (15 - 25 Agustus 2026)
      const nowWib = new Date()
      const wibOffset = 7 * 60 * 60 * 1000
      const todayIso = new Date(nowWib.getTime() + wibOffset).toISOString().slice(0, 10)

      const allDates = rawDates.filter((d: string) => {
        if (d > todayIso) return false
        if (d >= '2026-08-26') return false // Tanggal 26 belum ada inputan resmi final
        return true
      })
      if (allDates.length === 0) {
        allDates.push(...rawDates.filter((d: string) => d <= '2026-08-25'))
      }

      const targetDate = (requestedDate && allDates.includes(requestedDate))
        ? requestedDate
        : allDates[allDates.length - 1]

      // Bangun timeline_situasi_kesehatan per tanggal per kabupaten dengan Running Kumulatif & Delta Harian
      const timelineSituasiKesehatan: Record<string, unknown>[] = []
      const runningKabStats: Record<string, {
        cum_meninggal: number
        cum_luka_berat: number
        cum_luka_ringan: number
        cum_pengungsi: number
        cum_titik_posko: number
      }> = {}
      
      allDates.forEach((dt: string) => {
        rawKorbanJson.data_kabupaten.forEach((kabItem: any) => {
          const rawKab = kabItem.kabupaten.replace(/^Kab\.\s*/i, '').trim()
          if (!runningKabStats[rawKab]) {
            runningKabStats[rawKab] = {
              cum_meninggal: 0,
              cum_luka_berat: 0,
              cum_luka_ringan: 0,
              cum_pengungsi: 0,
              cum_titik_posko: 0,
            }
          }
          const stat = runningKabStats[rawKab]
          const harianMap = kabItem.harian || {}
          const harianData = harianMap[dt] || {}

          const deltaMeninggal = Number(harianData.meninggal || 0)
          const deltaLukaBerat = Number(harianData.luka_berat || 0)
          const deltaLukaRingan = Number(harianData.luka_ringan || 0)
          const deltaPengungsi = Number(harianData.pengungsi || 0)
          const deltaTitikPosko = Number(harianData.titik_pengungsian || 0)

          // Akumulasi kumulatif berjalan
          stat.cum_meninggal += deltaMeninggal
          stat.cum_luka_berat += deltaLukaBerat
          stat.cum_luka_ringan += deltaLukaRingan
          stat.cum_pengungsi += deltaPengungsi
          stat.cum_titik_posko += deltaTitikPosko

          const totalLuka = stat.cum_luka_berat + stat.cum_luka_ringan
          const totalKorban = stat.cum_meninggal + totalLuka
          const populasi = Number(kabItem.populasi_terdampak || 0)

          timelineSituasiKesehatan.push({
            tanggal: dt,
            kabupaten: rawKab,
            kabupaten_kota: kabItem.kabupaten,
            populasi_terdampak: populasi,
            penduduk_terdampak: populasi,
            // Nilai Kumulatif Berjalan s/d Tanggal Ini
            meninggal: stat.cum_meninggal,
            korban_meninggal: stat.cum_meninggal,
            luka_berat: stat.cum_luka_berat,
            korban_luka_berat: stat.cum_luka_berat,
            luka_ringan: stat.cum_luka_ringan,
            korban_luka_ringan: stat.cum_luka_ringan,
            total_luka: totalLuka,
            total_korban: totalKorban,
            pengungsi: stat.cum_pengungsi,
            jumlah_pengungsi: stat.cum_pengungsi,
            titik_pengungsian: stat.cum_titik_posko,
            titik_posko: stat.cum_titik_posko,
            // Delta Penambahan Hari Ini
            delta_meninggal: deltaMeninggal,
            delta_luka_berat: deltaLukaBerat,
            delta_luka_ringan: deltaLukaRingan,
            delta_total_luka: deltaLukaBerat + deltaLukaRingan,
            delta_pengungsi: deltaPengungsi,
            delta_titik_posko: deltaTitikPosko,
          })
        })
      })

      // Bangun timeline_pasien_rs dan timeline_pasien_puskesmas
      const rawRsList = (Array.isArray(rawKorbanJson.triase_rs) && rawKorbanJson.triase_rs.length > 0)
        ? rawKorbanJson.triase_rs
        : []
      
      const rawPkmList = (Array.isArray(rawKorbanJson.triase_pkm) && rawKorbanJson.triase_pkm.length > 0)
        ? rawKorbanJson.triase_pkm
        : []

      const timelinePasienRs: any[] = []
      const timelinePasienPkm: any[] = []

      allDates.forEach((dt: string) => {
        rawRsList.forEach((rs: any) => {
          const h = rs.harian?.[dt] || { merah: 0, kuning: 0, hijau: 0, hitam: 0 }
          const m = Number(h.merah || 0)
          const k = Number(h.kuning || 0)
          const hij = Number(h.hijau || 0)
          const hit = Number(h.hitam || 0)
          const tot = m + k + hij + hit

          const enriched = enrichNttFaskesRow({
            tanggal: dt,
            kabupaten: rs.kabupaten.replace(/^Kab\.\s*/i, '').trim(),
            nama_rs: rs.nama_rs,
            nama_faskes: rs.nama_rs,
            jenis: 'RS',
            triase_merah: m,
            triase_kuning: k,
            triase_hijau: hij,
            triase_hitam: hit,
            total: tot,
          }, 'rs')

          enriched.nama_display = enriched.master_matched
            ? (enriched.nama_master || rs.nama_rs)
            : `${rs.nama_rs}*`

          timelinePasienRs.push(enriched)
        })

        rawPkmList.forEach((pkm: any) => {
          const h = pkm.harian?.[dt] || { merah: 0, kuning: 0, hijau: 0, hitam: 0 }
          const m = Number(h.merah || 0)
          const k = Number(h.kuning || 0)
          const hij = Number(h.hijau || 0)
          const hit = Number(h.hitam || 0)
          const tot = m + k + hij + hit

          const enriched = enrichNttFaskesRow({
            tanggal: dt,
            kabupaten: pkm.kabupaten.replace(/^Kab\.\s*/i, '').trim(),
            nama_puskesmas: pkm.nama_puskesmas,
            nama_faskes: pkm.nama_puskesmas,
            jenis: 'Puskesmas',
            triase_merah: m,
            triase_kuning: k,
            triase_hijau: hij,
            triase_hitam: hit,
            total: tot,
          }, 'puskesmas')

          enriched.nama_display = enriched.master_matched
            ? (enriched.nama_master || pkm.nama_puskesmas)
            : `${pkm.nama_puskesmas}*`

          timelinePasienPkm.push(enriched)
        })
      })

      // Snapshot tabel untuk targetDate
      const situasiKesehatanTarget = timelineSituasiKesehatan.filter((r: any) => r.tanggal === targetDate)
      const pasienRsTarget = timelinePasienRs.filter((r: any) => r.tanggal === targetDate)
      const pasienPkmTarget = timelinePasienPkm.filter((r: any) => r.tanggal === targetDate)

      // Hitung kumulatif seluruh faskes aktif (9 RS + 8 PKM = 17 Faskes) untuk Master Overlay
      const cumRsMap: Record<string, any> = {}
      timelinePasienRs.forEach(r => {
        const key = `${r.kabupaten}__${r.nama_rs}`
        if (!cumRsMap[key]) {
          cumRsMap[key] = { ...r, triase_merah: 0, triase_kuning: 0, triase_hijau: 0, triase_hitam: 0, total: 0 }
        }
        cumRsMap[key].triase_merah += Number(r.triase_merah || 0)
        cumRsMap[key].triase_kuning += Number(r.triase_kuning || 0)
        cumRsMap[key].triase_hijau += Number(r.triase_hijau || 0)
        cumRsMap[key].triase_hitam += Number(r.triase_hitam || 0)
        cumRsMap[key].total = cumRsMap[key].triase_merah + cumRsMap[key].triase_kuning + cumRsMap[key].triase_hijau + cumRsMap[key].triase_hitam
      })
      const cumPasienRs = Object.values(cumRsMap)

      const cumPkmMap: Record<string, any> = {}
      timelinePasienPkm.forEach(p => {
        const key = `${p.kabupaten}__${p.nama_puskesmas}`
        if (!cumPkmMap[key]) {
          cumPkmMap[key] = { ...p, triase_merah: 0, triase_kuning: 0, triase_hijau: 0, triase_hitam: 0, total: 0 }
        }
        cumPkmMap[key].triase_merah += Number(p.triase_merah || 0)
        cumPkmMap[key].triase_kuning += Number(p.triase_kuning || 0)
        cumPkmMap[key].triase_hijau += Number(p.triase_hijau || 0)
        cumPkmMap[key].triase_hitam += Number(p.triase_hitam || 0)
        cumPkmMap[key].total = cumPkmMap[key].triase_merah + cumPkmMap[key].triase_kuning + cumPkmMap[key].triase_hijau + cumPkmMap[key].triase_hitam
      })
      const cumPasienPkm = Object.values(cumPkmMap)

      // Master faskes fallback dengan overlay 17 faskes aktif
      const masterFaskes = getAllNttMasterFaskesWithCollectorOverlay(cumPasienRs, cumPasienPkm)
      const summaryFaskes = getNttMasterFaskesSummary(masterFaskes)

      // Surveilans Penyakit dari Collector NTT
      let surveilansPenyakitList: any[] = []
      try {
        const pFile = path.join(process.cwd(), 'src', 'data', 'penyakit_surveilans.json')
        const rawP = await fs.readFile(pFile, 'utf8')
        const jsonP = JSON.parse(rawP)
        if (jsonP && Array.isArray(jsonP.data_penyakit_kumulatif)) {
          surveilansPenyakitList = jsonP.data_penyakit_kumulatif
        }
      } catch {}

      const responsePayload = {
        success: true,
        source: 'google_sheets_spreadsheet_api',
        tanggal: targetDate,
        dates_available: allDates,
        summary_korban: rawKorbanJson.summary,
        timeline_situasi_kesehatan: timelineSituasiKesehatan,
        timeline_analisa_ringkasan: [],
        timeline_pasien_rs: timelinePasienRs,
        timeline_pasien_puskesmas: timelinePasienPkm,
        updated_at: rawKorbanJson.updated_at || new Date().toISOString(),
        source_url: 'https://docs.google.com/spreadsheets/d/1-gdeokvKWvNsve1Vf5Yx6QbeeWYBXEHpSQDjE2oyQNw/',
        faskes_terdampak: rawKorbanJson.faskes_terdampak || rawKorbanJson.faskes?.data || [],
        summary_faskes_terdampak: rawKorbanJson.summary_faskes_terdampak || rawKorbanJson.faskes?.summary || null,
        tables: {
          situasi_kesehatan: situasiKesehatanTarget,
          analisa_ringkasan_harian: [],
          pasien_rs: pasienRsTarget,
          pasien_puskesmas: pasienPkmTarget,
          surveilans_penyakit: surveilansPenyakitList,
          faskes_terdampak: rawKorbanJson.faskes_terdampak || rawKorbanJson.faskes?.data || [],
          master_faskes: masterFaskes,
        },
        summary_faskes: summaryFaskes,
      }

      return jsonResponse(responsePayload)
    }
  } catch (gasErr) {
    console.warn('[API ntt-data] Google Sheets Korban integration error:', gasErr)
  }

  // ─── Priority 2: Manifest-based per-date CSV fallback ─────────────────────
  const manifestDir = await locateManifestDir()
  if (manifestDir) {
    try {
      const manifest: Manifest = await readManifest(manifestDir).catch(() => ({ version: 1, latest_date: '', dates: {} } as Manifest))
      const manifestDates: Record<string, Record<string, string>> = (manifest.dates as unknown as Record<string, Record<string, string>>) || {}

      // Auto-discover all dated CSV files in directory so no historical dates are ever missed
      try {
        const dirEntries = await fs.readdir(manifestDir)
        for (const filename of dirEntries) {
          const match = filename.match(/^(\d{4}-\d{2}-\d{2})_(analisa_ringkasan_harian|situasi_kesehatan|pasien_rs|pasien_puskesmas)\.csv$/)
          if (match) {
            const [, dt, tableKey] = match
            if (!manifestDates[dt]) manifestDates[dt] = {}
            if (!manifestDates[dt][tableKey]) {
              manifestDates[dt][tableKey] = filename
            }
          }
        }
      } catch (scanErr) {
        console.warn('[API ntt-data] Directory scan fallback error:', scanErr)
      }

      manifest.dates = manifestDates as unknown as Manifest['dates']
      const allDates = Object.keys(manifestDates).sort()
      const targetDate = requestedDate || manifest.latest_date || allDates.at(-1) || ''

      if (targetDate && manifestDates[targetDate]) {
        const files = manifestDates[targetDate]
        const tables: Record<string, unknown[]> = {}

        // 1. Load active snapshot table rows for targetDate
        for (const tableName of tableNames) {
          if (tableName === 'master_faskes') continue
          const filename = files?.[tableName]
          if (!filename) { tables[tableName] = []; continue }
          tables[tableName] = normalizeTableRows(await parseCsv(path.join(manifestDir, filename)))
        }

        if (Array.isArray(tables.pasien_rs)) {
          tables.pasien_rs = enrichNttFaskesTable(tables.pasien_rs, 'rs')
        }
        if (Array.isArray(tables.pasien_puskesmas)) {
          tables.pasien_puskesmas = enrichNttFaskesTable(tables.pasien_puskesmas, 'puskesmas')
        }

        // 2. Load and merge ALL dates into timeline arrays for continuous trend progression
        const allSituasiRows: Record<string, string>[] = []
        const allAnalisaRows: Record<string, string>[] = []
        const allPasienRsRows: Record<string, string>[] = []
        const allPasienPkmRows: Record<string, string>[] = []

        for (const dateKey of allDates) {
          const dateFiles = manifest.dates?.[dateKey] || {}
          if (dateFiles.situasi_kesehatan) {
            const rows = await parseCsv(path.join(manifestDir, dateFiles.situasi_kesehatan))
            allSituasiRows.push(...rows)
          }
          if (dateFiles.analisa_ringkasan_harian) {
            const rows = await parseCsv(path.join(manifestDir, dateFiles.analisa_ringkasan_harian))
            allAnalisaRows.push(...rows)
          }
          if (dateFiles.pasien_rs) {
            const rows = await parseCsv(path.join(manifestDir, dateFiles.pasien_rs))
            allPasienRsRows.push(...rows)
          }
          if (dateFiles.pasien_puskesmas) {
            const rows = await parseCsv(path.join(manifestDir, dateFiles.pasien_puskesmas))
            allPasienPkmRows.push(...rows)
          }
        }

        // 3. Generate complete 1,818+ Master Faskes with Collector Overlay
        const masterFaskes = getAllNttMasterFaskesWithCollectorOverlay(
          tables.pasien_rs || [],
          tables.pasien_puskesmas || []
        )
        const summaryFaskes = getNttMasterFaskesSummary(masterFaskes)
        tables.master_faskes = masterFaskes

        return jsonResponse({
          success: true,
          source: 'manifest',
          tanggal: targetDate,
          dates_available: allDates,
          timeline_situasi_kesehatan: normalizeTableRows(allSituasiRows),
          timeline_analisa_ringkasan: normalizeTableRows(allAnalisaRows),
          timeline_pasien_rs: enrichNttFaskesTable(normalizeTableRows(allPasienRsRows), 'rs'),
          timeline_pasien_puskesmas: enrichNttFaskesTable(normalizeTableRows(allPasienPkmRows), 'puskesmas'),
          updated_at: manifest.updated_at ?? new Date().toISOString(),
          source_url: manifest.source_url ?? 'https://docs.google.com/spreadsheets/d/1-gdeokvKWvNsve1Vf5Yx6QbeeWYBXEHpSQDjE2oyQNw/',
          tables,
          summary_faskes: summaryFaskes,
        })
      }
    } catch (err) {
      console.warn('[API ntt-data] Manifest read failed:', err)
    }
  }

  // ─── Priority 2: Fallback directly to Master Faskes if manifest unavailable ───
  const masterFaskesFallback = getAllNttMasterFaskesWithCollectorOverlay([], [])
  if (masterFaskesFallback.length > 0) {
    return jsonResponse({
      success: true,
      source: 'master_dataset_fallback',
      tanggal: requestedDate || '2026-08-23',
      dates_available: ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'],
      updated_at: new Date().toISOString(),
      source_url: 'https://docs.google.com/spreadsheets/d/1-gdeokvKWvNsve1Vf5Yx6QbeeWYBXEHpSQDjE2oyQNw/',
      tables: {
        analisa_ringkasan_harian: [],
        situasi_kesehatan: [],
        pasien_rs: [],
        pasien_puskesmas: [],
        master_faskes: masterFaskesFallback,
      },
      summary_faskes: getNttMasterFaskesSummary(masterFaskesFallback),
    })
  }

  // ─── No data available ────────────────────────────────────────────────────
  return jsonResponse(
    {
      success: false,
      error: 'data_unavailable',
      message: 'Collector belum menghasilkan data. Pastikan collector.py sudah berjalan dan data tersedia.',
    },
    503,
  )
}
