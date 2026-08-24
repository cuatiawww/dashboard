// @ts-ignore
import { Pool } from 'pg'

const DATASETS = [
  'analisa_ringkasan_harian',
  'situasi_kesehatan',
  'pasien_rs',
  'pasien_puskesmas',
] as const

export type NttDatabaseRow = {
  dataset: string
  tanggal: string
  row_data: Record<string, unknown>
  imported_at: string | null
}

export type NttDatabaseSnapshot = {
  rows: NttDatabaseRow[]
  dates: string[]
  updated_at: string
}

let pool: Pool | undefined

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'db-postgres',
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || 'collector_bencana_ntt',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || undefined,
      connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECT_TIMEOUT_SECONDS || 10) * 1000,
      max: 5,
    })
  }
  return pool
}

export async function readNttDatabase(): Promise<NttDatabaseSnapshot | null> {
  try {
    const result = await getPool().query<NttDatabaseRow>(
      `
        SELECT
          dataset,
          TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal,
          row_data,
          imported_at
        FROM ntt_records
        WHERE dataset = ANY($1::text[])
        ORDER BY tanggal ASC, dataset ASC, row_number ASC
      `,
      [DATASETS],
    )

    if (result.rows.length === 0) return null

    const dateSet = new Set<string>()
    result.rows.forEach((row: NttDatabaseRow) => {
      if (row.tanggal) dateSet.add(String(row.tanggal))
    })
    const dates = Array.from(dateSet).sort()
    const latestImport = result.rows
      .map((row: NttDatabaseRow) => row.imported_at)
      .filter((value: string | null): value is string => Boolean(value))
      .sort()
      .at(-1)

    return {
      rows: result.rows,
      dates,
      updated_at: latestImport || new Date().toISOString(),
    }
  } catch (error) {
    console.warn('[API ntt-data] PostgreSQL read failed; using CSV fallback:', error)
    return null
  }
}
