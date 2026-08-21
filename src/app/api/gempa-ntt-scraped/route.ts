import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export const runtime = 'nodejs'

const JSON_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'gempa-ntt', 'gempa_ntt_data.json')
const PYTHON_SCRIPT_PATH = path.resolve(process.cwd(), '..', 'cron', 'scrape_gempa_ntt.py')

export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get('refresh') === 'true'

    if (refresh) {
      try {
        console.log('[API Gempa NTT] Menjalankan worker Python scraper...')
        await execPromise(`py "${PYTHON_SCRIPT_PATH}"`)
      } catch (err: any) {
        console.warn('[API Gempa NTT Worker Error]', err.message)
      }
    }

    if (fs.existsSync(JSON_FILE_PATH)) {
      const fileData = fs.readFileSync(JSON_FILE_PATH, 'utf-8')
      const json = JSON.parse(fileData)
      return NextResponse.json({
        success: true,
        source: 'scraped_ntt_worker',
        data: json
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Data JSON hasil scraping belum ditemukan. Silakan jalankan scraper worker.'
    }, { status: 404 })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat memuat data scraping gempa NTT.'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('[API Gempa NTT POST] Menjalankan worker Python scraper on-demand...')
    const { stdout, stderr } = await execPromise(`py "${PYTHON_SCRIPT_PATH}"`)
    
    if (fs.existsSync(JSON_FILE_PATH)) {
      const fileData = fs.readFileSync(JSON_FILE_PATH, 'utf-8')
      const json = JSON.parse(fileData)
      return NextResponse.json({
        success: true,
        message: 'Scraping berhasil diperbarui via Python Worker',
        output: stdout,
        data: json
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Worker selesai dijalankan',
      output: stdout,
      error: stderr
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Gagal menjalankan Python worker.'
    }, { status: 500 })
  }
}
