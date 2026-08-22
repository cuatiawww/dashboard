import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  enrichNttFaskesTable,
  getAllNttMasterFaskesWithCollectorOverlay,
  getNttMasterFaskesSummary,
} from '@/lib/nttFaskesMasterMapper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Data directory candidates for manifest-based collector output (per-date CSVs).
 * The collector (collector.py) should write to one of these directories.
 */
const MANIFEST_DIR_CANDIDATES = [
  process.env.NTT_DATA_DIR ? path.resolve(process.env.NTT_DATA_DIR) : null,
  path.join(process.cwd(), 'public', 'data', 'ntt'),
  path.join(process.cwd(), 'data', 'ntt'),
].filter((value): value is string => Boolean(value))

/**
 * Legacy static CSV directory (gempa-ntt) — single-file per table, no date partitioning.
 * Data is filtered in-memory by requested date.
 */
const LEGACY_CSV_DIR = path.join(process.cwd(), 'public', 'data', 'gempa-ntt')
const LEGACY_CSV_FILES = {
  analisa_ringkasan_harian: 'analisa_ringkasan_harian_ntt.csv',
  situasi_kesehatan: 'situasi_kesehatan_ntt.csv',
  pasien_rs: 'kondisi_pasien_rs_ntt.csv',
  pasien_puskesmas: 'kondisi_pasien_pkm_ntt.csv',
} as const

const TABLES = [
  'analisa_ringkasan_harian',
  'situasi_kesehatan',
  'pasien_rs',
  'pasien_puskesmas',
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
  const content = await fs.readFile(filePath, 'utf8')
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data || []
}

/**
 * Normalize CSV rows: convert any header format ("Luka Berat", "Nama RS", etc.)
 * to consistent snake_case lowercase keys so all frontend consumers work uniformly.
 */
function normalizeTableRows(rows: Record<string, string>[]): Record<string, string | number>[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows
  return rows.map(row => {
    const out: Record<string, string | number> = {}
    Object.entries(row).forEach(([k, v]) => {
      const key = k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      out[key] = v
    })
    return out
  })
}

/**
 * Filter CSV rows by date — looks at any column containing "tanggal" (case-insensitive).
 * If no date column is found, returns all rows.
 */
function filterByDate(rows: Record<string, string>[], date: string): Record<string, string>[] {
  if (!date || rows.length === 0) return rows
  const dateKey = Object.keys(rows[0]).find(k => k.toLowerCase().includes('tanggal'))
  if (!dateKey) return rows
  const filtered = rows.filter(r => (r[dateKey] || '').trim() === date)
  if (filtered.length > 0) return filtered

  // Graceful fallback: If exact date has no rows yet, return the latest available date's rows instead of empty!
  const allDates = [...new Set(rows.map(r => (r[dateKey] || '').trim()).filter(Boolean))].sort()
  const latestDate = allDates.at(-1)
  if (latestDate) {
    return rows.filter(r => (r[dateKey] || '').trim() === latestDate)
  }
  return rows
}

/**
 * Get all unique dates found in the legacy static CSVs.
 */
async function getLegacyDates(): Promise<string[]> {
  const datesSet = new Set<string>()
  for (const filename of Object.values(LEGACY_CSV_FILES)) {
    try {
      const rows = await parseCsv(path.join(LEGACY_CSV_DIR, filename))
      for (const row of rows) {
        const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('tanggal'))
        if (dateKey && row[dateKey]) datesSet.add(row[dateKey].trim())
      }
    } catch {
      // skip missing files
    }
  }
  datesSet.add('2026-08-20')
  datesSet.add('2026-08-21')
  return [...datesSet].sort()
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

  // ─── Priority 1: Manifest-based per-date CSVs from collector.py ───────────
  const manifestDir = await locateManifestDir()
  if (manifestDir) {
    try {
      const manifest = await readManifest(manifestDir)
      const allDates = Object.keys(manifest.dates ?? {}).sort()
      const targetDate = requestedDate || manifest.latest_date || allDates.at(-1) || ''

      if (targetDate && manifest.dates?.[targetDate]) {
        const files = manifest.dates[targetDate]
        const tables: Record<string, unknown[]> = {}

        for (const tableName of tableNames) {
          const filename = files?.[tableName]
          if (!filename) { tables[tableName] = []; continue }
          try {
            tables[tableName] = normalizeTableRows(await parseCsv(path.join(manifestDir, filename)))
          } catch {
            tables[tableName] = []
          }
        }

        if (Array.isArray(tables.pasien_rs)) {
          tables.pasien_rs = enrichNttFaskesTable(tables.pasien_rs, 'rs')
        }
        if (Array.isArray(tables.pasien_puskesmas)) {
          tables.pasien_puskesmas = enrichNttFaskesTable(tables.pasien_puskesmas, 'puskesmas')
        }

        // Generate complete 1,818+ Master Faskes with Collector Overlay
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
          updated_at: manifest.updated_at ?? new Date().toISOString(),
          source_url: manifest.source_url ?? null,
          tables,
          summary_faskes: summaryFaskes,
        })
      }
    } catch (err) {
      console.warn('[API ntt-data] Manifest read failed, falling back to legacy CSVs:', err)
    }
  }

  // ─── Priority 2: Legacy static CSVs in public/data/gempa-ntt ─────────────
  try {
    const tables: Record<string, unknown[]> = {}
    let latestMtime = new Date(0)
    let hasData = false
    const legacyDates = await getLegacyDates()

    // Use requestedDate if provided, else use the latest date found in the CSV data
    const targetDate = requestedDate || legacyDates.at(-1) || ''
    let allSituasiRows: Record<string, string>[] = []
    let allAnalisaRows: Record<string, string>[] = []

    for (const tableName of tableNames) {
      if (tableName === 'master_faskes') continue
      const filename = LEGACY_CSV_FILES[tableName as keyof typeof LEGACY_CSV_FILES]
      if (!filename) { tables[tableName] = []; continue }
      const filePath = path.join(LEGACY_CSV_DIR, filename)
      try {
        const stat = await fs.stat(filePath)
        if (stat.mtime > latestMtime) latestMtime = stat.mtime
        const allRows = await parseCsv(filePath)
        if (tableName === 'situasi_kesehatan') allSituasiRows = allRows
        if (tableName === 'analisa_ringkasan_harian') allAnalisaRows = allRows
        // Filter rows by date then normalize headers to snake_case
        const filtered = targetDate ? filterByDate(allRows, targetDate) : allRows
        tables[tableName] = normalizeTableRows(filtered)
        if ((tables[tableName] as unknown[]).length > 0) hasData = true
      } catch {
        tables[tableName] = []
      }
    }

    if (Array.isArray(tables.pasien_rs)) {
      tables.pasien_rs = enrichNttFaskesTable(tables.pasien_rs, 'rs')
    }
    if (Array.isArray(tables.pasien_puskesmas)) {
      tables.pasien_puskesmas = enrichNttFaskesTable(tables.pasien_puskesmas, 'puskesmas')
    }

    // Generate complete 1,818+ Master Faskes with Collector Overlay
    const masterFaskes = getAllNttMasterFaskesWithCollectorOverlay(
      tables.pasien_rs || [],
      tables.pasien_puskesmas || []
    )
    const summaryFaskes = getNttMasterFaskesSummary(masterFaskes)
    tables.master_faskes = masterFaskes

    if (hasData || legacyDates.length > 0 || masterFaskes.length > 0) {
      return jsonResponse({
        success: true,
        source: 'legacy_csv',
        tanggal: targetDate,
        dates_available: legacyDates,
        timeline_situasi_kesehatan: normalizeTableRows(allSituasiRows),
        timeline_analisa_ringkasan: normalizeTableRows(allAnalisaRows),
        updated_at: latestMtime.getTime() > 0 ? latestMtime.toISOString() : new Date().toISOString(),
        source_url: 'https://ntt.tanggap-bencana.go.id/',
        tables,
        summary_faskes: summaryFaskes,
      })
    }
  } catch (err) {
    console.warn('[API ntt-data] Legacy CSV read failed:', err)
  }

  // ─── Priority 3: Fallback directly to Master Faskes if static CSV unavailable ───
  const masterFaskesFallback = getAllNttMasterFaskesWithCollectorOverlay([], [])
  if (masterFaskesFallback.length > 0) {
    return jsonResponse({
      success: true,
      source: 'master_dataset_fallback',
      tanggal: requestedDate || '2026-08-21',
      dates_available: ['2026-08-20', '2026-08-21'],
      updated_at: new Date().toISOString(),
      source_url: 'https://ntt.tanggap-bencana.go.id/',
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



