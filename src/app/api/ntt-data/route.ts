import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
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

  const databaseSnapshot = await readNttDatabase()
  if (databaseSnapshot && (!requestedDate || databaseSnapshot.dates.includes(requestedDate))) {
    const validDates = databaseSnapshot.dates.filter((d) =>
      databaseSnapshot.rows.some(
        (r) => r.tanggal === d && (r.dataset === 'situasi_kesehatan' || r.dataset === 'pasien_rs' || r.dataset === 'analisa_ringkasan_harian'),
      ),
    )
    const targetDate = requestedDate || validDates.at(-1) || databaseSnapshot.dates.at(-1) || ''
    const targetRows = databaseSnapshot.rows.filter((row) => row.tanggal === targetDate)
    const tables: Record<string, unknown[]> = {}

    for (const tableName of tableNames) {
      if (tableName === 'master_faskes') continue
      tables[tableName] = normalizeTableRows(
        targetRows
          .filter((row) => row.dataset === tableName)
          .map((row) => ({ tanggal: row.tanggal, ...row.row_data })),
      )
    }

    if (Array.isArray(tables.pasien_rs)) {
      tables.pasien_rs = enrichNttFaskesTable(tables.pasien_rs, 'rs')
    }
    if (Array.isArray(tables.pasien_puskesmas)) {
      tables.pasien_puskesmas = enrichNttFaskesTable(tables.pasien_puskesmas, 'puskesmas')
    }

    const timeline = (dataset: string) =>
      normalizeTableRows(
        databaseSnapshot.rows
          .filter((row) => row.dataset === dataset)
          .map((row) => ({ tanggal: row.tanggal, ...row.row_data })),
      )

    const timelineSituasi = timeline('situasi_kesehatan')
    const timelineAnalisa = timeline('analisa_ringkasan_harian')
    const timelinePasienRs = enrichNttFaskesTable(timeline('pasien_rs'), 'rs')
    const timelinePasienPkm = enrichNttFaskesTable(timeline('pasien_puskesmas'), 'puskesmas')
    const masterFaskes = getAllNttMasterFaskesWithCollectorOverlay(
      tables.pasien_rs || [],
      tables.pasien_puskesmas || [],
    )
    const summaryFaskes = getNttMasterFaskesSummary(masterFaskes)
    tables.master_faskes = masterFaskes

    return jsonResponse({
      success: true,
      source: 'postgresql',
      tanggal: targetDate,
      dates_available: databaseSnapshot.dates,
      timeline_situasi_kesehatan: timelineSituasi,
      timeline_analisa_ringkasan: timelineAnalisa,
      timeline_pasien_rs: timelinePasienRs,
      timeline_pasien_puskesmas: timelinePasienPkm,
      updated_at: databaseSnapshot.updated_at,
      source_url: 'https://ntt.tanggap-bencana.go.id/',
      tables,
      summary_faskes: summaryFaskes,
    })
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
          source_url: manifest.source_url ?? 'https://ntt.tanggap-bencana.go.id/',
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
