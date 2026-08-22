import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

export interface MasterFaskesInfo {
  id: string
  jenis_faskes: string
  kode_sarana: string
  kode_satusehat: string
  nama_master: string
  subjenis: string
  alamat: string
  kode_prop: string
  nama_prop: string
  kode_kab: string
  nama_kab: string
  kode_kecamatan: string
  nama_kecamatan: string
  latitude: number | null
  longitude: number | null
  telp: string
  email: string
  website: string
  operasional: string
  status_aktif: string
  alias_collector: string
}

let cachedMasterList: MasterFaskesInfo[] | null = null

function cleanLookupName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/^(rsud|rs\s*umum\s*daerah|rs\s*umum|rs|puskesmas|pkm|uptd|upt|klinik|pustu)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Load and cache all master faskes data from user manual mapped CSV and complete master dataset.
 */
export function getNttMasterFaskesList(): MasterFaskesInfo[] {
  if (cachedMasterList && cachedMasterList.length > 0) {
    return cachedMasterList
  }

  const list: MasterFaskesInfo[] = []
  const cwd = process.cwd()

  // 1. Priority 1: User manual mapping CSV ('Data Faskes NTT LENGKAP - Sheet2.csv')
  const userMappedPaths = [
    path.join(cwd, 'data', 'Data Faskes NTT LENGKAP - Sheet2.csv'),
    path.join(cwd, '..', 'dashboard-utama', 'data', 'Data Faskes NTT LENGKAP - Sheet2.csv'),
    path.join(cwd, 'public', 'data', 'Data Faskes NTT LENGKAP - Sheet2.csv'),
  ]

  let userMappedLoaded = false
  for (const p of userMappedPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8')
        const parsed = Papa.parse<string[]>(content, { header: false, skipEmptyLines: true })
        parsed.data.forEach((r) => {
          if (!r || r.length < 5) return
          const item: MasterFaskesInfo = {
            id: String(r[0] || '').trim(),
            jenis_faskes: String(r[1] || '').trim(),
            kode_sarana: String(r[2] || '').trim(),
            kode_satusehat: String(r[3] || '').trim(),
            nama_master: String(r[4] || '').trim(),
            subjenis: String(r[5] || '').trim(),
            alamat: String(r[6] || '').trim(),
            kode_prop: String(r[7] || '53').trim(),
            nama_prop: String(r[8] || 'Nusa Tenggara Timur').trim(),
            kode_kab: String(r[9] || '').trim(),
            nama_kab: String(r[10] || '').trim(),
            kode_kecamatan: String(r[11] || '').trim(),
            nama_kecamatan: String(r[12] || '').trim(),
            latitude: parseFloat(String(r[13] || '')) || null,
            longitude: parseFloat(String(r[14] || '')) || null,
            telp: String(r[15] || '').trim(),
            email: String(r[16] || '').trim(),
            website: String(r[17] || '').trim(),
            operasional: String(r[18] || 'Operasional').trim(),
            status_aktif: String(r[19] || 'Aktif').trim(),
            alias_collector: String(r[20] || r[4] || '').trim(),
          }
          list.push(item)
        })
        userMappedLoaded = true
        break
      } catch (err) {
        console.warn('[nttFaskesMasterMapper] Error parsing user mapped CSV:', err)
      }
    }
  }

  // 2. Priority 2: Supplementary Complete Master Dataset (1,818 faskes se-NTT)
  const completeMasterPaths = [
    path.join(cwd, 'public', 'data', 'export_faskes_ntt', 'master_data_faskes_ntt_lengkap.csv'),
    path.join(cwd, '..', 'export_faskes_ntt', 'master_data_faskes_ntt_lengkap.csv'),
  ]

  for (const p of completeMasterPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8')
        const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true, delimiter: ';' })
        parsed.data.forEach((r) => {
          if (!r || !r['Nama Fasilitas Kesehatan']) return
          const kodeSarana = String(r['Kode Sarana / Faskes'] || '').trim()
          const exists = list.some((it) => it.kode_sarana === kodeSarana || it.nama_master.toLowerCase() === String(r['Nama Fasilitas Kesehatan']).toLowerCase())
          if (!exists) {
            list.push({
              id: String(r['No'] || '').trim(),
              jenis_faskes: String(r['Jenis Faskes'] || '').trim(),
              kode_sarana: kodeSarana,
              kode_satusehat: String(r['Kode SatuSehat Kemenkes'] || '').trim(),
              nama_master: String(r['Nama Fasilitas Kesehatan'] || '').trim(),
              subjenis: String(r['Kategori / Subjenis'] || '').trim(),
              alamat: String(r['Alamat Lengkap'] || '').trim(),
              kode_prop: String(r['Kode Provinsi'] || '53').trim(),
              nama_prop: String(r['Nama Provinsi'] || 'Nusa Tenggara Timur').trim(),
              kode_kab: String(r['Kode Kab/Kota'] || '').trim(),
              nama_kab: String(r['Nama Kab/Kota'] || '').trim(),
              kode_kecamatan: String(r['Kode Kecamatan'] || '').trim(),
              nama_kecamatan: String(r['Nama Kecamatan'] || '').trim(),
              latitude: parseFloat(String(r['Latitude'] || '')) || null,
              longitude: parseFloat(String(r['Longitude'] || '')) || null,
              telp: String(r['No Telepon'] || '').trim(),
              email: String(r['Email'] || '').trim(),
              website: String(r['Website'] || '').trim(),
              operasional: String(r['Status Operasional'] || 'Operasional').trim(),
              status_aktif: String(r['Status Aktif'] || 'Aktif').trim(),
              alias_collector: String(r['Nama Fasilitas Kesehatan'] || '').trim(),
            })
          }
        })
        break
      } catch (err) {
        console.warn('[nttFaskesMasterMapper] Error parsing complete master CSV:', err)
      }
    }
  }

  cachedMasterList = list
  return list
}

/**
 * Match a collector faskes name or row against the master dataset.
 */
export function findMasterFaskes(queryName: string, queryKab?: string, kodeSarana?: string): MasterFaskesInfo | null {
  const masterList = getNttMasterFaskesList()
  if (!masterList || masterList.length === 0) return null

  // 1. Match by Kode Sarana if provided
  if (kodeSarana && kodeSarana.trim() !== '') {
    const found = masterList.find((m) => m.kode_sarana === kodeSarana.trim())
    if (found) return found
  }

  if (!queryName || queryName.trim() === '') return null
  const cleanQ = cleanLookupName(queryName)
  const cleanKab = queryKab ? cleanLookupName(queryKab) : ''

  // 2. Exact match on alias_collector
  let match = masterList.find((m) => cleanLookupName(m.alias_collector) === cleanQ)
  if (match) return match

  // 3. Exact match on nama_master
  match = masterList.find((m) => cleanLookupName(m.nama_master) === cleanQ)
  if (match) return match

  // 4. Match with Kabupaten filter if available
  if (cleanKab) {
    match = masterList.find((m) => {
      const mKab = cleanLookupName(m.nama_kab)
      if (!mKab.includes(cleanKab) && !cleanKab.includes(mKab)) return false
      const mAlias = cleanLookupName(m.alias_collector)
      const mMaster = cleanLookupName(m.nama_master)
      return (
        mAlias.includes(cleanQ) ||
        cleanQ.includes(mAlias) ||
        mMaster.includes(cleanQ) ||
        cleanQ.includes(mMaster)
      )
    })
    if (match) return match
  }

  // 5. Fuzzy Substring match
  if (cleanQ.length >= 3) {
    match = masterList.find((m) => {
      const mAlias = cleanLookupName(m.alias_collector)
      const mMaster = cleanLookupName(m.nama_master)
      return (
        mAlias.includes(cleanQ) ||
        cleanQ.includes(mAlias) ||
        mMaster.includes(cleanQ) ||
        cleanQ.includes(mMaster)
      )
    })
    if (match) return match
  }

  return null
}

/**
 * Enrich a collector faskes row with official master data coordinates, official names, and wilayah codes.
 */
export function enrichNttFaskesRow(row: any, type: 'rs' | 'puskesmas' | 'faskes' = 'faskes'): any {
  if (!row || typeof row !== 'object') return row

  const rawName = String(
    row.nama_rs ||
    row.nama_puskesmas ||
    row.nama_faskes ||
    row.nama_lengkap ||
    row.nama ||
    row.rs ||
    row.puskesmas ||
    ''
  ).trim()

  const rawKab = String(row.kabupaten || row.nama_kab || '').trim()
  const rawKode = String(row.kode_sarana || row.kode || '').trim()

  const master = findMasterFaskes(rawName, rawKab, rawKode)

  const out = { ...row }

  if (master) {
    out.master_matched = true
    out.id_master = master.id
    out.kode_sarana = master.kode_sarana
    out.kode_satusehat = master.kode_satusehat
    out.nama_master = master.nama_master
    out.nama_resmi = master.nama_master
    out.nama_faskes = rawName ? rawName : master.nama_master
    out.subjenis = master.subjenis
    out.alamat = master.alamat
    out.kode_prop = master.kode_prop
    out.nama_prop = master.nama_prop
    out.kode_kab = master.kode_kab
    out.nama_kab = master.nama_kab
    out.kabupaten = master.nama_kab || out.kabupaten
    out.kode_kecamatan = master.kode_kecamatan
    out.nama_kecamatan = master.nama_kecamatan
    out.kecamatan = master.nama_kecamatan || out.kecamatan
    // Ensure accurate master coordinates
    out.latitude = master.latitude !== null ? master.latitude : out.latitude
    out.longitude = master.longitude !== null ? master.longitude : out.longitude
    out.lat = out.latitude
    out.lng = out.longitude
    out.telp = master.telp || out.telp
    out.email = master.email || out.email
    out.website = master.website || out.website
    out.status_operasional = master.operasional || out.status_operasional || 'Operasional'
    out.status_aktif = master.status_aktif || out.status_aktif || 'Aktif'
  }

  return out
}

/**
 * Batch enrich an array of collector rows and deduplicate by unique facility identity.
 */
export function enrichNttFaskesTable(rows: any[], type: 'rs' | 'puskesmas' | 'faskes' = 'faskes'): any[] {
  if (!Array.isArray(rows)) return []
  const enriched = rows.map((r) => enrichNttFaskesRow(r, type))

  // Deduplicate by unique faskes identity (latest entry wins if multiple dates exist)
  const uniqueMap = new Map<string, any>()
  enriched.forEach((item) => {
    const key = (
      item.kode_sarana && item.kode_sarana !== '-'
        ? `sarana_${item.kode_sarana}`
        : item.id_master
        ? `master_${item.id_master}`
        : cleanLookupName(item.nama_master || item.nama_rs || item.nama_puskesmas || item.nama || '')
    )
    if (key) {
      uniqueMap.set(key, item)
    }
  })

  return Array.from(uniqueMap.values())
}
