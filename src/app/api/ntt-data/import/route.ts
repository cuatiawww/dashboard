import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import {
  NTT_TABLES,
  NTT_TABLE_DEFINITIONS,
  NttTableName,
  isNttTableName,
  isValidDateFormat,
} from '@/lib/nttConstants'
import { saveNttRecordsToDatabase } from '@/lib/nttDatabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_ADMIN_PASSWORD = 'EocNtt@Kemenkes2026!'

function getAdminPassword(): string {
  return process.env.NTT_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
}

const WRITE_DIRS = [
  process.env.NTT_DATA_DIR ? path.resolve(process.env.NTT_DATA_DIR) : null,
  path.join(process.cwd(), 'public', 'data', 'ntt'),
  path.join(process.cwd(), 'data', 'ntt'),
].filter((v): v is string => Boolean(v))

type Manifest = {
  version?: number
  source_url?: string
  updated_at?: string
  latest_date?: string
  dates?: Record<string, Partial<Record<NttTableName, string>>>
}

async function updateManifestInDir(dir: string, tanggal: string, tabel: NttTableName, filename: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
    const manifestPath = path.join(dir, 'manifest.json')
    let manifest: Manifest = {
      version: 1,
      source_url: 'https://ntt.tanggap-bencana.go.id/',
      updated_at: new Date().toISOString(),
      latest_date: tanggal,
      dates: {},
    }

    try {
      const raw = await fs.readFile(manifestPath, 'utf-8')
      manifest = JSON.parse(raw)
    } catch {
      // Manifest belum ada, buat baru
    }

    if (!manifest.dates) manifest.dates = {}
    if (!manifest.dates[tanggal]) manifest.dates[tanggal] = {}
    manifest.dates[tanggal][tabel] = filename
    manifest.updated_at = new Date().toISOString()

    const allDates = Object.keys(manifest.dates).filter(isValidDateFormat).sort()
    if (allDates.length > 0) {
      manifest.latest_date = allDates[allDates.length - 1]
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  } catch (err) {
    console.warn(`[API Import] Gagal memperbarui manifest di ${dir}:`, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const inputPassword =
      (formData.get('password') as string | null) ||
      req.headers.get('x-admin-password') ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      ''

    let formTabel = (formData.get('tabel') as string | null) || ''
    let formTanggal = (formData.get('tanggal') as string | null) || ''

    // 1. Verifikasi Password Admin
    const expectedPassword = getAdminPassword()
    if (!inputPassword || inputPassword.trim() !== expectedPassword.trim()) {
      return NextResponse.json(
        { error: 'Password admin tidak valid atau akses ditolak.' },
        { status: 401 },
      )
    }

    // 2. Validasi File Upload
    if (!file) {
      return NextResponse.json(
        { error: 'File CSV wajib diunggah.' },
        { status: 400 },
      )
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    let textContent = rawBuffer.toString('utf-8')

    // Hilangkan UTF-8 BOM jika ada
    if (textContent.charCodeAt(0) === 0xfeff) {
      textContent = textContent.slice(1)
    }

    // 3. Deteksi Tanggal dan Tabel dari Nama File jika belum diinput manual
    // Format nama file standar: 2026-08-26_pasien_rs.csv
    const match = file.name.match(/^(\d{4}-\d{2}-\d{2})_([a-z0-9_]+)\.csv$/i)
    if (match) {
      if (!formTanggal) formTanggal = match[1]
      const inferredTable = match[2].toLowerCase()
      if (!formTabel && isNttTableName(inferredTable)) {
        formTabel = inferredTable
      }
    }

    // 4. Parsing CSV
    const parsed = Papa.parse<Record<string, any>>(textContent, {
      header: true,
      skipEmptyLines: 'greedy',
    })

    if (!parsed.data || parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'File CSV kosong atau tidak memiliki baris data.' },
        { status: 400 },
      )
    }

    const headers = (parsed.meta.fields || []).map((h) => h.trim())

    // 5. Tentukan Jenis Tabel jika belum terdeteksi (cocokkan dengan header kolom)
    if (!isNttTableName(formTabel)) {
      for (const t of NTT_TABLES) {
        const requiredHeaders = NTT_TABLE_DEFINITIONS[t].headers
        // Cek apakah minimal 70% header tabel cocok
        const matched = requiredHeaders.filter((rh) => headers.includes(rh))
        if (matched.length >= Math.floor(requiredHeaders.length * 0.7)) {
          formTabel = t
          break
        }
      }
    }

    if (!isNttTableName(formTabel)) {
      return NextResponse.json(
        {
          error:
            'Format kolom CSV tidak dikenali sebagai 4 tabel bencana NTT (analisa_ringkasan_harian, situasi_kesehatan, pasien_rs, pasien_puskesmas).',
        },
        { status: 400 },
      )
    }

    // Tentukan tanggal
    if (!formTanggal || !isValidDateFormat(formTanggal)) {
      // Coba ambil dari baris data kolom tanggal
      const firstRowDate = parsed.data[0]?.tanggal
      if (firstRowDate && isValidDateFormat(String(firstRowDate))) {
        formTanggal = String(firstRowDate)
      } else {
        formTanggal = new Date().toISOString().slice(0, 10)
      }
    }

    // Normalisasi baris data
    const normalizedRows: Array<Record<string, any>> = []
    for (const rawRow of parsed.data) {
      const cleanRow: Record<string, any> = {}
      let hasData = false
      for (const [key, val] of Object.entries(rawRow)) {
        const cleanKey = String(key).trim()
        const cleanVal = typeof val === 'string' ? val.trim() : val
        cleanRow[cleanKey] = cleanVal
        if (cleanKey !== 'tanggal' && cleanVal !== '' && cleanVal !== null && cleanVal !== undefined) {
          hasData = true
        }
      }
      if (hasData) {
        cleanRow.tanggal = formTanggal
        normalizedRows.push(cleanRow)
      }
    }

    if (normalizedRows.length === 0) {
      return NextResponse.json(
        { error: 'File CSV tidak berisi data valid selain tanggal.' },
        { status: 400 },
      )
    }

    const finalFilename = `${formTanggal}_${formTabel}.csv`

    // Buat ulang konten CSV yang bersih dan ber-BOM UTF-8
    const finalCsvString =
      '\uFEFF' +
      Papa.unparse({
        fields: NTT_TABLE_DEFINITIONS[formTabel].headers,
        data: normalizedRows,
      }) +
      '\n'

    // 6. Simpan File ke Disk Host & Update Manifest
    for (const dir of WRITE_DIRS) {
      try {
        await fs.mkdir(dir, { recursive: true })
        const targetPath = path.join(dir, finalFilename)
        await fs.writeFile(targetPath, finalCsvString, 'utf-8')
        await updateManifestInDir(dir, formTanggal, formTabel, finalFilename)
      } catch (err) {
        console.warn(`[API Import] Gagal menulis file ke ${dir}:`, err)
      }
    }

    // 7. Simpan / Upsert ke PostgreSQL
    let databaseSynced = false
    let dbErrorMsg: string | undefined
    try {
      await saveNttRecordsToDatabase({
        dataset: formTabel,
        tanggal: formTanggal,
        sourceFile: finalFilename,
        fileContent: finalCsvString,
        rows: normalizedRows,
      })
      databaseSynced = true
    } catch (err: any) {
      console.warn('[API Import] PostgreSQL sync failed; file CSV lokal tetap tersimpan:', err)
      dbErrorMsg = err?.message || String(err)
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${normalizedRows.length} baris data ${NTT_TABLE_DEFINITIONS[formTabel].label} (${formTanggal}).`,
      filename: finalFilename,
      dataset: formTabel,
      tanggal: formTanggal,
      rowCount: normalizedRows.length,
      databaseSynced,
      note: !databaseSynced ? 'Disimpan ke file CSV (PostgreSQL offline/tidak terhubung).' : undefined,
    })
  } catch (error: any) {
    console.error('[API Import Error]:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses import CSV.' },
      { status: 500 },
    )
  }
}
