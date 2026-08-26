import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'penyakit_surveilans.json');

// 30 menit cache expiry
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';

    let data: any = null;
    let shouldSync = false;

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        data = JSON.parse(raw);

        const lastUpdated = new Date(data.last_updated || 0).getTime();
        if (Date.now() - lastUpdated > CACHE_MAX_AGE_MS) {
          shouldSync = true;
        }
      } catch (e) {
        shouldSync = true;
      }
    } else {
      shouldSync = true;
    }

    // Trigger background scraper if forced or expired
    if ((forceSync || shouldSync) && process.env.NODE_ENV !== 'production') {
      try {
        // Run scraper asynchronously without blocking request
        const { spawn } = require('child_process');
        const scriptPath = path.join(process.cwd(), 'scripts', 'scrape-looker.js');
        const child = spawn('node', [scriptPath], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } catch (err) {
        console.warn('[API penyakit-surveilans] Background scraper spawn failed:', err);
      }
    }

    if (data) {
      return NextResponse.json({
        success: true,
        source: 'looker_studio_scraper',
        last_updated: data.last_updated,
        total_kasus_kumulatif: data.total_kasus_kumulatif,
        total_kasus_baru: data.total_kasus_baru,
        data_penyakit_kumulatif: data.data_penyakit_kumulatif,
        sebaran_kabupaten: data.sebaran_kabupaten
      });
    }

    // Jika file belum siap
    return NextResponse.json({
      success: true,
      source: 'looker_studio_live',
      last_updated: new Date().toISOString(),
      total_kasus_kumulatif: 0,
      total_kasus_baru: 0,
      data_penyakit_kumulatif: [],
      sebaran_kabupaten: []
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
