import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  NTT_TABLE_DEFINITIONS,
  isNttTableName,
  isValidDateFormat,
} from '@/lib/nttConstants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tabelParam = searchParams.get('tabel')
  const tanggalParam = searchParams.get('tanggal') || new Date().toISOString().slice(0, 10)

  if (!isNttTableName(tabelParam)) {
    return NextResponse.json(
      {
        error: 'Parameter tabel tidak valid. Pilih salah satu: analisa_ringkasan_harian, situasi_kesehatan, pasien_rs, pasien_puskesmas',
      },
      { status: 400 },
    )
  }

  const tanggal = isValidDateFormat(tanggalParam)
    ? tanggalParam
    : new Date().toISOString().slice(0, 10)

  const meta = NTT_TABLE_DEFINITIONS[tabelParam]

  // Buat 1 baris sample template ber-tanggal
  const sampleRow: Record<string, any> = {
    tanggal,
    ...meta.sampleRow,
  }

  // Generate CSV dengan BOM utf-8 agar terbaca sempurna di Microsoft Excel maupun editor teks
  const csvBody = Papa.unparse({
    fields: meta.headers,
    data: [sampleRow],
  })

  const csvWithBom = `\uFEFF${csvBody}\n`
  const filename = `${tanggal}_${tabelParam}.csv`

  return new NextResponse(csvWithBom, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
