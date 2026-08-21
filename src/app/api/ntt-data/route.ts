import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR_CANDIDATES = [
  process.env.NTT_DATA_DIR ? path.resolve(process.env.NTT_DATA_DIR) : null,
  path.join(process.cwd(), 'public', 'data', 'ntt'),
  path.join(process.cwd(), 'data', 'ntt'),
].filter((value): value is string => Boolean(value))
const TABLES = [
  'analisa_ringkasan_harian',
  'situasi_kesehatan',
  'pasien_rs',
  'pasien_puskesmas',
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
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

function isTableName(value: string): value is TableName {
  return (TABLES as readonly string[]).includes(value)
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

async function locateDataDir() {
  for (const dataDir of DATA_DIR_CANDIDATES) {
    try {
      await fs.access(path.join(dataDir, 'manifest.json'))
      return dataDir
    } catch {
      // Try the next supported location.
    }
  }

  const error = new Error('NTT manifest not found') as NodeJS.ErrnoException
  error.code = 'ENOENT'
  throw error
}

async function readManifest(dataDir: string): Promise<Manifest> {
  const content = await fs.readFile(path.join(dataDir, 'manifest.json'), 'utf8')
  return JSON.parse(content) as Manifest
}

async function readTable(dataDir: string, filename: string) {
  if (!/^[\d]{4}-[\d]{2}-[\d]{2}_[a-z0-9_]+\.csv$/.test(filename)) {
    throw new Error('invalid data filename')
  }

  const content = await fs.readFile(path.join(dataDir, filename), 'utf8')
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`)
  }

  return result.data
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

  try {
    const dataDir = await locateDataDir()
    const manifest = await readManifest(dataDir)
    const date = requestedDate || manifest.latest_date
    if (!date || !manifest.dates?.[date]) {
      return jsonResponse(
        { success: false, error: 'data_not_found', message: 'Data untuk tanggal tersebut tidak tersedia.' },
        404,
      )
    }

    const files = manifest.dates[date]
    const tableNames: TableName[] = requestedTable
      ? [requestedTable as TableName]
      : [...TABLES]
    const tables: Record<string, unknown[]> = {}

    for (const tableName of tableNames) {
      const filename = files?.[tableName]
      if (!filename) {
        tables[tableName] = []
        continue
      }
      tables[tableName] = await readTable(dataDir, filename)
    }

    return jsonResponse({
      success: true,
      tanggal: date,
      updated_at: manifest.updated_at ?? null,
      source_url: manifest.source_url ?? null,
      tables,
    })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return jsonResponse(
        { success: false, error: 'data_unavailable', message: 'Collector belum menghasilkan data.' },
        503,
      )
    }

    console.error('NTT data API error:', error)
    return jsonResponse(
      { success: false, error: 'data_read_error', message: 'Data lokal tidak dapat dibaca.' },
      500,
    )
  }
}
