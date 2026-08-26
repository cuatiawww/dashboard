import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  NTT_TABLE_DEFINITIONS,
  isNttTableName,
  isValidDateFormat,
} from '@/lib/nttConstants'
import { getNttPool } from '@/lib/nttDatabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_DIR_CANDIDATES = [
  process.env.NTT_DATA_DIR ? path.resolve(process.env.NTT_DATA_DIR) : null,
  path.join(process.cwd(), 'public', 'data', 'ntt'),
  path.join(process.cwd(), 'data', 'ntt'),
].filter((v): v is string => Boolean(v))

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tabelParam = searchParams.get('tabel')
  const tanggalParam = searchParams.get('tanggal')

  if (!isNttTableName(tabelParam)) {
    return NextResponse.json(
      {
        error:
          'Parameter tabel tidak valid. Pilih: analisa_ringkasan_harian, situasi_kesehatan, pasien_rs, pasien_puskesmas',
      },
      { status: 400 },
    )
  }

  if (!tanggalParam || !isValidDateFormat(tanggalParam)) {
    return NextResponse.json(
      { error: 'Parameter tanggal wajib diisi dengan format YYYY-MM-DD' },
      { status: 400 },
    )
  }

  const meta = NTT_TABLE_DEFINITIONS[tabelParam]
  let rows: Array<Record<string, any>> = []

  // 1. Coba baca dari PostgreSQL ntt_records
  try {
    const result = await getNttPool().query<{ row_data: Record<string, any> }>(
      `
        SELECT row_data
        FROM ntt_records
        WHERE dataset = $1 AND TO_CHAR(tanggal, 'YYYY-MM-DD') = $2
        ORDER BY row_number ASC
      `,
      [tabelParam, tanggalParam],
    )
    if (result.rows.length > 0) {
      rows = result.rows.map((r: { row_data: Record<string, any> }) => r.row_data)
    }
  } catch (err) {
    console.warn('[API Export] PostgreSQL query failed, attempting CSV fallback:', err)
  }

  // 2. Fallback: baca dari file CSV di filesystem jika DB tidak menghasilkan baris
  if (rows.length === 0) {
    const filename = `${tanggalParam}_${tabelParam}.csv`
    for (const dir of DATA_DIR_CANDIDATES) {
      const filePath = path.join(dir, filename)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const parsed = Papa.parse<Record<string, any>>(content, {
          header: true,
          skipEmptyLines: 'greedy',
        })
        if (parsed.data && parsed.data.length > 0) {
          rows = parsed.data
          break
        }
      } catch {
        // Coba direktori berikutnya
      }
    }
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error: `Data tidak ditemukan untuk tabel ${meta.label} pada tanggal ${tanggalParam}`,
      },
      { status: 404 },
    )
  }

  // Generate CSV dengan BOM utf-8
  const csvBody = Papa.unparse({
    fields: meta.headers,
    data: rows,
  })

  const csvWithBom = `\uFEFF${csvBody}\n`
  const filename = `${tanggalParam}_${tabelParam}.csv`

  return new NextResponse(csvWithBom, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
