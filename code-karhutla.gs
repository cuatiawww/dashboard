/**
 * ====================================================================
 * GOOGLE APPS SCRIPT: API DASHBOARD KARHUTLA 2026 - PUSAT KRISIS KESEHATAN
 * Bound ke spreadsheet "DATA DASHBOARD KARHUTLA 2026 PUSKRIS"
 * Konvensi mengikuti "API GEMPA" (doGet + ?type=..., CacheService 10 menit,
 * ?nocache=true / ?refresh=true, respons { success, source, updated_at, ... }).
 *
 * Sheet sumber:
 *  1. DATA PENDUDUK TERDAMPAK                       -> type=penduduk_terdampak
 *  2. DATA ISPA                                     -> type=ispa
 *  3. DATA PENYAKIT LAINNYA                         -> type=penyakit_lainnya
 *  4. DATA ISPU (IMPORTRANGE dari MASTER DATA ISPU) -> type=ispu
 *  5. DATA LOGISTIK DI DISTRIBUSIKAN OLEH DINKES    -> type=logistik_dinkes
 *  6. DATA LOGISTIK DI DISTRIBUSIKAN PUKRIS KE DINKES/RE -> type=logistik_puskris
 *  7. SDMK DAERAH DIGERAKAN PENANGANAN KARHUTLA     -> type=sdmk
 *  8. DATA UPAYA                                    -> type=upaya
 *  (DATA DI DASHBOARD & Sheet10 = catatan konsep / kosong, tidak diekspos)
 *
 * Parameter umum (semua opsional):
 *  type      : all | ringkasan | penduduk_terdampak | ispa | penyakit_lainnya | ispu |
 *              logistik | logistik_dinkes | logistik_puskris | sdmk | upaya | meta
 *  provinsi  : filter provinsi, boleh dipisah koma (case-insensitive), mis. "Riau,Jambi"
 *  kabupaten : filter kab/kota (penduduk_terdampak), substring, case-insensitive
 *  penyakit  : filter penyakit (penyakit_lainnya), substring
 *  kategori  : filter kategori ISPU (Baik/Sedang/Tidak Sehat/Sangat Tidak Sehat/Berbahaya)
 *  instansi  : filter instansi upaya (kemenkes / dinkes)
 *  jenis     : filter jenis logistik, substring
 *  q         : pencarian teks bebas (upaya)
 *  limit, offset : paginasi untuk array `data` (default: semua)
 *  nocache / refresh = true : lewati cache
 *  token     : wajib HANYA jika Script Property API_TOKEN diisi
 *
 * Keamanan: tidak ada secret di kode. Untuk mengaktifkan token, isi
 * Project Settings > Script Properties > API_TOKEN. Jika kosong, API terbuka
 * (sama seperti API GEMPA yang di-deploy "Anyone").
 * ====================================================================
 */

const API_VERSION = 'karhutla-v1';
const CACHE_PREFIX = 'karhutla_cache_v1_';
const CACHE_TTL = 600; // detik (10 menit), sama dengan API GEMPA

const SHEETS = {
  penduduk: ['DATA PENDUDUK TERDAMPAK'],
  ispa: ['DATA ISPA'],
  penyakit: ['DATA PENYAKIT LAINNYA'],
  ispu: ['DATA ISPU'],
  logistikDinkes: ['DATA LOGISTIK DI DISTRIBUSIKAN OLEH DINKES'],
  logistikPuskris: ['DATA LOGISTIK DI DISTRIBUSIKAN PUKRIS KE DINKES/RE', 'DATA LOGISTIK DI DISTRIBUSIKAN PUSKRIS KE DINKES/RE'],
  sdmk: ['SDMK DAERAH DIGERAKAN PENANGANAN KARHUTLA'],
  upaya: ['DATA UPAYA', 'UPAYA BIDANG KESEHATAN']
};

const SHEET_PATTERNS = {
  penduduk: [['PENDUDUK', 'TERDAMPAK']],
  ispa: [['ISPA']],
  penyakit: [['PENYAKIT']],
  ispu: [['ISPU']],
  logistikDinkes: [['LOGISTIK', 'OLEH DINKES']],
  logistikPuskris: [['LOGISTIK', 'KE DINKES']],
  sdmk: [['SDMK'], ['SDM', 'DIGERAKAN']],
  upaya: [['UPAYA']]
};

const ISPU_KATEGORI = [
  { min: 0, max: 50, kategori: 'Baik', warna: 'Hijau', hex: '#22C55E' },
  { min: 51, max: 100, kategori: 'Sedang', warna: 'Biru', hex: '#3B82F6' },
  { min: 101, max: 200, kategori: 'Tidak Sehat', warna: 'Kuning', hex: '#EAB308' },
  { min: 201, max: 300, kategori: 'Sangat Tidak Sehat', warna: 'Merah', hex: '#EF4444' },
  { min: 301, max: null, kategori: 'Berbahaya', warna: 'Hitam', hex: '#111827' }
];

// ====================================================================
// ENTRY POINT
// ====================================================================
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};

    // 0. Token opsional (Script Properties > API_TOKEN)
    const requiredToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
    if (requiredToken && String(p.token || '') !== requiredToken) {
      return createJsonResponse({ success: false, code: 401, error: 'Unauthorized: token tidak valid atau tidak dikirim.' });
    }

    const type = (p.type ? String(p.type) : 'all').toLowerCase().trim();
    const noCache = (p.nocache === 'true' || p.refresh === 'true');
    const cache = CacheService.getScriptCache();
    const cacheKey = buildCacheKey(type, p);

    // 1. Cek cache
    if (!noCache) {
      const cached = cache.get(cacheKey);
      if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActive();
    const filters = parseFilters(p);
    let payload;

    switch (type) {
      case 'penduduk_terdampak':
      case 'penduduk':
      case 'korban':
        payload = withPaging(parsePendudukTerdampak(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_penduduk_terdampak';
        break;

      case 'ispa':
        payload = withPaging(parseIspa(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_ispa';
        break;

      case 'penyakit_lainnya':
      case 'penyakit':
        payload = withPaging(parsePenyakitLainnya(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_penyakit_lainnya';
        break;

      case 'ispu':
      case 'kualitas_udara':
        payload = withPaging(parseIspu(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_ispu';
        break;

      case 'logistik_dinkes':
        payload = withPaging(parseLogistik(ss, 'logistikDinkes', 'dinkes', filters), filters);
        payload.source = 'google_spreadsheet_karhutla_logistik_dinkes';
        break;

      case 'logistik_puskris':
      case 'logistik_pukris':
        payload = withPaging(parseLogistik(ss, 'logistikPuskris', 'puskris', filters), filters);
        payload.source = 'google_spreadsheet_karhutla_logistik_puskris';
        break;

      case 'logistik':
        payload = {
          success: true,
          source: 'google_spreadsheet_karhutla_logistik',
          dinkes: parseLogistik(ss, 'logistikDinkes', 'dinkes', filters),
          puskris: parseLogistik(ss, 'logistikPuskris', 'puskris', filters)
        };
        break;

      case 'sdmk':
      case 'sdm':
        payload = withPaging(parseSdmk(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_sdmk';
        break;

      case 'upaya':
      case 'upaya_kesehatan':
      case 'upaya_bidang_kesehatan':
        payload = withPaging(parseUpaya(ss, filters), filters);
        payload.source = 'google_spreadsheet_karhutla_upaya';
        break;

      case 'ringkasan':
      case 'summary':
        payload = buildRingkasan(ss, filters);
        payload.source = 'google_spreadsheet_karhutla_ringkasan';
        break;

      case 'meta':
        payload = buildMeta(ss);
        payload.source = 'google_spreadsheet_karhutla_meta';
        break;

      case 'all':
        payload = buildAll(ss, filters);
        payload.source = 'google_spreadsheet_karhutla_all';
        break;

      default:
        return createJsonResponse({
          success: false,
          code: 400,
          error: "Parameter type tidak dikenal: '" + type + "'.",
          available_types: ['all', 'ringkasan', 'penduduk_terdampak', 'ispa', 'penyakit_lainnya', 'ispu',
            'logistik', 'logistik_dinkes', 'logistik_puskris', 'sdmk', 'upaya', 'meta']
        });
    }

    payload.success = true;
    payload.api_version = API_VERSION;
    payload.type = type;
    payload.filters = filters.echo;
    payload.updated_at = new Date().toISOString();

    const jsonStr = JSON.stringify(orderPayload(payload));
    try { cache.put(cacheKey, jsonStr, CACHE_TTL); } catch (ce) { /* payload > 100KB: lewati cache */ }
    return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return createJsonResponse({ success: false, code: 500, error: String(err && err.message ? err.message : err) });
  }
}

// ====================================================================
// MODUL 1: DATA PENDUDUK TERDAMPAK (per kab/kota)
// Header 3 baris: (1) grup, (2) sub-kolom, (3) nomor kolom 0..10. Baris TOTAL di akhir.
// A Provinsi | B Kab/Kota | C Penduduk terdampak | D Luka berat/rawat inap | E Luka ringan/rawat jalan
// F Meninggal | G Pengungsi | H..K keterangan masing-masing kolom D..G
// ====================================================================
function parsePendudukTerdampak(ss, f) {
  const sheet = getSheet(ss, 'penduduk');
  if (!sheet) return notFound('DATA PENDUDUK TERDAMPAK');
  const values = sheet.getDataRange().getValues();

  const headerIdx = findRowIndex(values, function (row) {
    return normUpper(row[0]).indexOf('PROVINSI') > -1 && normUpper(row[1]).indexOf('KABUPATEN') > -1;
  }, 0);
  let start = headerIdx + 1;
  // lewati sub-header (kolom B kosong) & baris nomor kolom (0,1,2,...)
  while (start < values.length && (String(values[start][1] || '').trim() === '' || isNumberRow(values[start]))) start++;

  const rows = [];
  let sheetTotal = null;
  let currentProv = '';
  for (let r = start; r < values.length; r++) {
    const row = values[r];
    const a = String(row[0] || '').trim();
    const b = String(row[1] || '').trim();
    if (!a && !b) continue;
    if (normUpper(a) === 'TOTAL' || normUpper(b) === 'TOTAL') {
      sheetTotal = {
        penduduk_terdampak: parseNum(row[2]), rawat_inap: parseNum(row[3]), rawat_jalan: parseNum(row[4]),
        meninggal: parseNum(row[5]), pengungsi: parseNum(row[6])
      };
      continue;
    }
    if (a) currentProv = a;
    if (!b) continue;

    rows.push({
      id: 'pt-' + (rows.length + 1),
      provinsi: toTitleCase(currentProv),
      provinsi_key: normUpper(currentProv),
      kabupaten: toTitleCase(b),
      kabupaten_key: normUpper(b),
      penduduk_terdampak: parseNum(row[2]),
      korban: {
        luka_berat_rawat_inap: parseNum(row[3]),
        luka_ringan_rawat_jalan: parseNum(row[4]),
        meninggal: parseNum(row[5]),
        pengungsi: parseNum(row[6])
      },
      keterangan: {
        luka_berat_rawat_inap: cleanText(row[7]),
        luka_ringan_rawat_jalan: cleanText(row[8]),
        meninggal: cleanText(row[9]),
        pengungsi: cleanText(row[10])
      }
    });
  }

  const data = rows.filter(function (x) {
    return matchProvinsi(x.provinsi_key, f) && (!f.kabupaten || x.kabupaten_key.indexOf(f.kabupaten) > -1);
  });

  const byProv = {};
  data.forEach(function (x) {
    const k = x.provinsi;
    if (!byProv[k]) byProv[k] = { provinsi: k, jumlah_kabupaten: 0, kabupaten_terdampak: 0, penduduk_terdampak: 0, luka_berat_rawat_inap: 0, luka_ringan_rawat_jalan: 0, meninggal: 0, pengungsi: 0 };
    const p = byProv[k];
    p.jumlah_kabupaten++;
    if (x.penduduk_terdampak > 0) p.kabupaten_terdampak++;
    p.penduduk_terdampak += x.penduduk_terdampak;
    p.luka_berat_rawat_inap += x.korban.luka_berat_rawat_inap;
    p.luka_ringan_rawat_jalan += x.korban.luka_ringan_rawat_jalan;
    p.meninggal += x.korban.meninggal;
    p.pengungsi += x.korban.pengungsi;
  });

  const summary = sumObjects(Object.keys(byProv).map(function (k) { return byProv[k]; }),
    ['jumlah_kabupaten', 'kabupaten_terdampak', 'penduduk_terdampak', 'luka_berat_rawat_inap', 'luka_ringan_rawat_jalan', 'meninggal', 'pengungsi']);
  summary.jumlah_provinsi = Object.keys(byProv).length;
  summary.total_korban = summary.luka_berat_rawat_inap + summary.luka_ringan_rawat_jalan + summary.meninggal;

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    summary: summary,
    total_baris_sheet: f.isFiltered ? undefined : sheetTotal,
    by_provinsi: Object.keys(byProv).map(function (k) { return byProv[k]; }),
    data: data
  };
}

// ====================================================================
// MODUL 2: DATA ISPA (per provinsi, umur & jenis kelamin)
// Header 2 baris. A Provinsi | B <=5 th | C >5 th | D Jumlah | E Laki-laki | F Perempuan | G Jumlah
// I1:J3 = "DATA DARI" -> cakupan (n provinsi, n kab/kota)
// ====================================================================
function parseIspa(ss, f) {
  const sheet = getSheet(ss, 'ispa');
  if (!sheet) return notFound('DATA ISPA');
  const values = sheet.getDataRange().getValues();

  const cakupan = { jumlah_provinsi: null, jumlah_kabupaten_kota: null };
  for (let r = 0; r < Math.min(6, values.length); r++) {
    for (let c = 7; c < values[r].length - 1; c++) {
      const label = normUpper(values[r][c + 1]);
      if (label === 'PROVINSI' && values[r][c] !== '') cakupan.jumlah_provinsi = parseNum(values[r][c]);
      if (label.indexOf('KABUPATEN') > -1 && values[r][c] !== '') cakupan.jumlah_kabupaten_kota = parseNum(values[r][c]);
    }
  }

  const rows = [];
  let sheetTotal = null;
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const prov = String(row[0] || '').trim();
    const up = normUpper(prov);
    if (!prov || up === 'PROVINSI' || up === 'NAMA PROVINSI') continue;
    if (typeof row[1] !== 'number' && isNaN(parseFloat(String(row[1]).replace(/[,.]/g, '')))) continue;
    const rec = {
      balita: parseNum(row[1]), non_balita: parseNum(row[2]), total_umur: parseNum(row[3]),
      laki_laki: parseNum(row[4]), perempuan: parseNum(row[5]), total_jenis_kelamin: parseNum(row[6])
    };
    if (up === 'TOTAL') { sheetTotal = rec; continue; }
    rows.push({
      id: 'ispa-' + (rows.length + 1),
      provinsi: toTitleCase(prov),
      provinsi_key: up,
      kategori_umur: { le_5_tahun: rec.balita, gt_5_tahun: rec.non_balita, jumlah: rec.total_umur },
      jenis_kelamin: { laki_laki: rec.laki_laki, perempuan: rec.perempuan, jumlah: rec.total_jenis_kelamin },
      total_kasus: rec.total_umur
    });
  }

  const data = rows.filter(function (x) { return matchProvinsi(x.provinsi_key, f); });
  const summary = {
    jumlah_provinsi: data.length,
    total_kasus: 0, le_5_tahun: 0, gt_5_tahun: 0, laki_laki: 0, perempuan: 0
  };
  data.forEach(function (x) {
    summary.total_kasus += x.total_kasus;
    summary.le_5_tahun += x.kategori_umur.le_5_tahun;
    summary.gt_5_tahun += x.kategori_umur.gt_5_tahun;
    summary.laki_laki += x.jenis_kelamin.laki_laki;
    summary.perempuan += x.jenis_kelamin.perempuan;
  });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    cakupan_data: cakupan,
    summary: summary,
    total_baris_sheet: f.isFiltered ? undefined : sheetTotal,
    data: data
  };
}

// ====================================================================
// MODUL 3: DATA PENYAKIT LAINNYA (long format: provinsi x penyakit -> jumlah)
// ====================================================================
function parsePenyakitLainnya(ss, f) {
  const sheet = getSheet(ss, 'penyakit');
  if (!sheet) return notFound('DATA PENYAKIT LAINNYA');
  const values = sheet.getDataRange().getValues();
  const cols = locateColumns(values, { provinsi: ['PROVINSI'], penyakit: ['PENYAKIT'], jumlah: ['JUMLAH'] }, { provinsi: 0, penyakit: 1, jumlah: 2 });

  const rows = [];
  for (let r = cols.headerIdx + 1; r < values.length; r++) {
    const row = values[r];
    const prov = String(row[cols.provinsi] || '').trim();
    const peny = String(row[cols.penyakit] || '').trim();
    if (!prov || !peny || normUpper(prov) === 'TOTAL') continue;
    rows.push({
      id: 'pl-' + (rows.length + 1),
      provinsi: toTitleCase(prov),
      provinsi_key: normUpper(prov),
      penyakit: peny,
      penyakit_key: slug(peny),
      jumlah: parseNum(row[cols.jumlah])
    });
  }

  const data = rows.filter(function (x) {
    return matchProvinsi(x.provinsi_key, f) && (!f.penyakit || normUpper(x.penyakit).indexOf(f.penyakit) > -1);
  });

  const byPenyakit = {}, byProv = {};
  data.forEach(function (x) {
    byPenyakit[x.penyakit] = (byPenyakit[x.penyakit] || 0) + x.jumlah;
    if (!byProv[x.provinsi]) byProv[x.provinsi] = { provinsi: x.provinsi, total: 0, penyakit: {} };
    byProv[x.provinsi].total += x.jumlah;
    byProv[x.provinsi].penyakit[x.penyakit] = (byProv[x.provinsi].penyakit[x.penyakit] || 0) + x.jumlah;
  });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    summary: {
      total_kasus: data.reduce(function (s, x) { return s + x.jumlah; }, 0),
      jumlah_provinsi: Object.keys(byProv).length,
      jumlah_penyakit: Object.keys(byPenyakit).length,
      daftar_penyakit: Object.keys(byPenyakit)
    },
    by_penyakit: Object.keys(byPenyakit).map(function (k) { return { penyakit: k, penyakit_key: slug(k), jumlah: byPenyakit[k] }; })
      .sort(function (a, b) { return b.jumlah - a.jumlah; }),
    by_provinsi: Object.keys(byProv).map(function (k) { return byProv[k]; }),
    data: data
  };
}

// ====================================================================
// MODUL 4: DATA ISPU (A1 = "Update per ...", A2 = IMPORTRANGE header+data)
// Kolom: No | ID Stasiun | Provinsi | Nilai ISPU | Kategori | Parameter Kritis
// Nilai #N/A (stasiun tanpa data) -> null
// ====================================================================
function parseIspu(ss, f) {
  const sheet = getSheet(ss, 'ispu');
  if (!sheet) return notFound('DATA ISPU');
  const values = sheet.getDataRange().getValues();

  let updateText = null;
  const a1 = String(values[0] && values[0][0] || '').trim();
  if (/update/i.test(a1)) updateText = a1.replace(/[\r\n]+/g, ' ').trim();

  const cols = locateColumns(values,
    { stasiun: ['ID STASIUN', 'STASIUN'], provinsi: ['PROVINSI'], nilai: ['NILAI ISPU', 'ISPU'], kategori: ['KATEGORI'], parameter: ['PARAMETER KRITIS', 'PARAMETER'] },
    { stasiun: 1, provinsi: 2, nilai: 3, kategori: 4, parameter: 5 }, 6);

  const rows = [];
  for (let r = cols.headerIdx + 1; r < values.length; r++) {
    const row = values[r];
    const stasiun = String(row[cols.stasiun] || '').trim();
    const prov = String(row[cols.provinsi] || '').trim();
    if (!stasiun || !prov) continue;
    const nilai = toNumberOrNull(row[cols.nilai]);
    const kat = nilai === null ? null : ispuKategori(nilai);
    const katSheet = cleanText(row[cols.kategori]);
    rows.push({
      id: 'ispu-' + (rows.length + 1),
      no: toNumberOrNull(row[0]),
      stasiun: stasiun,
      provinsi: toTitleCase(prov),
      provinsi_key: normUpper(prov),
      nilai_ispu: nilai,
      kategori: katSheet || (kat ? kat.kategori : null),
      warna: kat ? kat.warna : null,
      warna_hex: kat ? kat.hex : null,
      parameter_kritis: cleanText(row[cols.parameter]),
      data_tersedia: nilai !== null
    });
  }

  const data = rows.filter(function (x) {
    return matchProvinsi(x.provinsi_key, f) && (!f.kategori || normUpper(x.kategori) === f.kategori);
  });

  const perKategori = {};
  ISPU_KATEGORI.forEach(function (k) { perKategori[k.kategori] = 0; });
  let tanpaData = 0, maxRec = null;
  const byProv = {};
  data.forEach(function (x) {
    if (!x.data_tersedia) { tanpaData++; return; }
    const k = ispuKategori(x.nilai_ispu).kategori;
    perKategori[k] = (perKategori[k] || 0) + 1;
    if (!maxRec || x.nilai_ispu > maxRec.nilai_ispu) maxRec = x;
    if (!byProv[x.provinsi]) byProv[x.provinsi] = { provinsi: x.provinsi, jumlah_stasiun: 0, ispu_maks: null, ispu_rata2: null, _sum: 0, _n: 0 };
    const p = byProv[x.provinsi];
    p._sum += x.nilai_ispu; p._n++;
    p.ispu_maks = p.ispu_maks === null ? x.nilai_ispu : Math.max(p.ispu_maks, x.nilai_ispu);
  });
  data.forEach(function (x) { if (byProv[x.provinsi]) byProv[x.provinsi].jumlah_stasiun++; });
  const byProvArr = Object.keys(byProv).map(function (k) {
    const p = byProv[k];
    p.ispu_rata2 = p._n ? Math.round(p._sum / p._n) : null;
    const kat = p.ispu_maks !== null ? ispuKategori(p.ispu_maks) : null;
    p.kategori_maks = kat ? kat.kategori : null;
    delete p._sum; delete p._n;
    return p;
  }).sort(function (a, b) { return (b.ispu_maks || 0) - (a.ispu_maks || 0); });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    update_text: updateText,
    total: data.length,
    legenda: ISPU_KATEGORI,
    summary: {
      jumlah_stasiun: data.length,
      stasiun_tanpa_data: tanpaData,
      per_kategori: perKategori,
      stasiun_tertinggi: maxRec ? { stasiun: maxRec.stasiun, provinsi: maxRec.provinsi, nilai_ispu: maxRec.nilai_ispu, kategori: maxRec.kategori } : null
    },
    by_provinsi: byProvArr,
    data: data
  };
}

// ====================================================================
// MODUL 5: LOGISTIK (Dinkes -> faskes/masyarakat, dan Puskris -> Dinkes/Regional)
// A Provinsi (tujuan) | B Jenis logistik | C Satuan | D Jumlah | E Keterangan
// Kolom G:H (UNIQUE/SUMIFS) adalah helper grafik -> diabaikan, dihitung ulang.
// ====================================================================
function parseLogistik(ss, key, label, f) {
  const sheet = getSheet(ss, key);
  if (!sheet) return notFound(SHEETS[key][0]);
  const values = sheet.getDataRange().getValues();
  const cols = locateColumns(values,
    { provinsi: ['PROVINSI'], jenis: ['JENIS LOGISTIK'], satuan: ['SATUAN'], jumlah: ['JUMLAH'], keterangan: ['KETERANGAN'] },
    { provinsi: 0, jenis: 1, satuan: 2, jumlah: 3, keterangan: 4 }, 5);

  const rows = [];
  for (let r = cols.headerIdx + 1; r < values.length; r++) {
    const row = values[r];
    const prov = String(row[cols.provinsi] || '').trim();
    const jenis = String(row[cols.jenis] || '').trim();
    if (!prov || !jenis) continue;
    const ket = cleanText(row[cols.keterangan]);
    rows.push({
      id: 'log-' + label + '-' + (rows.length + 1),
      sumber: label === 'puskris' ? 'Pusat Krisis Kesehatan' : 'Dinas Kesehatan Provinsi',
      provinsi: toTitleCase(prov),
      provinsi_key: normUpper(prov),
      jenis_logistik: jenis,
      jenis_key: slug(jenis),
      satuan: cleanText(row[cols.satuan]),
      jumlah: parseNum(row[cols.jumlah]),
      keterangan: ket,
      buffer_stock: !!(ket && /buffer/i.test(ket))
    });
  }

  const data = rows.filter(function (x) {
    return matchProvinsi(x.provinsi_key, f) && (!f.jenis || normUpper(x.jenis_logistik).indexOf(f.jenis) > -1);
  });

  const byJenis = {}, byProv = {};
  data.forEach(function (x) {
    const kj = x.jenis_logistik + '|' + (x.satuan || '');
    if (!byJenis[kj]) byJenis[kj] = { jenis_logistik: x.jenis_logistik, jenis_key: x.jenis_key, satuan: x.satuan, jumlah: 0 };
    byJenis[kj].jumlah += x.jumlah;
    if (!byProv[x.provinsi]) byProv[x.provinsi] = { provinsi: x.provinsi, items: {} };
    byProv[x.provinsi].items[x.jenis_logistik] = (byProv[x.provinsi].items[x.jenis_logistik] || 0) + x.jumlah;
  });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    summary: {
      jumlah_provinsi: Object.keys(byProv).length,
      jumlah_jenis: Object.keys(byJenis).length,
      catatan: 'Jumlah dijumlahkan per jenis + satuan (satuan berbeda tidak digabung).'
    },
    by_jenis: Object.keys(byJenis).map(function (k) { return byJenis[k]; }).sort(function (a, b) { return b.jumlah - a.jumlah; }),
    by_provinsi: Object.keys(byProv).map(function (k) { return byProv[k]; }),
    data: data
  };
}

// ====================================================================
// MODUL 6: SDMK DAERAH DIGERAKAN (A Provinsi | B Jumlah | C Keterangan jenis tenaga)
// Data mulai A4 via IMPORTRANGE; baris 2 kosong, baris 3 nomor kolom.
// ====================================================================
function parseSdmk(ss, f) {
  const sheet = getSheet(ss, 'sdmk');
  if (!sheet) return notFound('SDMK DAERAH DIGERAKAN PENANGANAN KARHUTLA');
  const values = sheet.getDataRange().getValues();
  const cols = locateColumns(values, { provinsi: ['PROVINSI'], jumlah: ['JUMLAH'], keterangan: ['KETERANGAN'] }, { provinsi: 0, jumlah: 1, keterangan: 2 });

  const rows = [];
  for (let r = cols.headerIdx + 1; r < values.length; r++) {
    const row = values[r];
    const prov = String(row[cols.provinsi] || '').trim();
    if (!prov || isNumberRow(row) || normUpper(prov) === 'TOTAL' || /^#/.test(prov)) continue;
    const ket = cleanText(row[cols.keterangan]);
    rows.push({
      id: 'sdmk-' + (rows.length + 1),
      provinsi: toTitleCase(prov),
      provinsi_key: normUpper(prov),
      jumlah: parseNum(row[cols.jumlah]),
      jenis_tenaga: ket ? ket.split(/[,.;]/).map(function (s) { return s.replace(/\bdan\b/i, '').trim(); }).filter(String) : [],
      keterangan: ket
    });
  }
  const data = rows.filter(function (x) { return matchProvinsi(x.provinsi_key, f); })
    .sort(function (a, b) { return b.jumlah - a.jumlah; });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    summary: {
      total_sdmk: data.reduce(function (s, x) { return s + x.jumlah; }, 0),
      jumlah_provinsi: data.length
    },
    data: data
  };
}

// ====================================================================
// MODUL 7: DATA UPAYA (A Instansi | B Wilayah | C Upaya). Wilayah "-" = nasional.
// ====================================================================
function parseUpaya(ss, f) {
  const sheet = getSheet(ss, 'upaya');
  if (!sheet) return notFound('DATA UPAYA');
  const values = sheet.getDataRange().getValues();
  const cols = locateColumns(values, { instansi: ['INSTANSI'], wilayah: ['WILAYAH', 'PROVINSI'], upaya: ['UPAYA'] }, { instansi: 0, wilayah: 1, upaya: 2 });

  const rows = [];
  let curInstansi = '', curWilayah = '';
  for (let r = cols.headerIdx + 1; r < values.length; r++) {
    const row = values[r];
    const inst = String(row[cols.instansi] || '').trim();
    const wil = String(row[cols.wilayah] || '').trim();
    const up = String(row[cols.upaya] || '').trim();
    if (inst) { curInstansi = inst; curWilayah = ''; }
    if (wil) curWilayah = wil;
    if (!up || up === '-' || up.length < 3) continue;

    const nasional = !curWilayah || /^-+$/.test(curWilayah);
    const instUp = normUpper(curInstansi);
    rows.push({
      id: 'upaya-' + (rows.length + 1),
      instansi: curInstansi,
      level: instUp.indexOf('KEMENTERIAN') > -1 ? 'pusat' : 'provinsi',
      wilayah: nasional ? 'Nasional' : toTitleCase(curWilayah),
      provinsi_key: nasional ? 'NASIONAL' : normUpper(curWilayah),
      upaya: up.replace(/\s+/g, ' ').trim()
    });
  }

  const data = rows.filter(function (x) {
    if (f.provinsi.length && !matchProvinsi(x.provinsi_key, f)) return false;
    if (f.instansi) {
      const want = f.instansi;
      const isPusat = x.level === 'pusat';
      if ((want === 'KEMENKES' || want === 'PUSAT') && !isPusat) return false;
      if ((want === 'DINKES' || want === 'PROVINSI') && isPusat) return false;
      if (['KEMENKES', 'PUSAT', 'DINKES', 'PROVINSI'].indexOf(want) === -1 && normUpper(x.instansi).indexOf(want) === -1) return false;
    }
    if (f.q && normUpper(x.upaya).indexOf(f.q) === -1) return false;
    return true;
  });

  const byWilayah = {}, byInstansi = {};
  data.forEach(function (x) {
    if (!byWilayah[x.wilayah]) byWilayah[x.wilayah] = [];
    byWilayah[x.wilayah].push(x.upaya);
    byInstansi[x.instansi] = (byInstansi[x.instansi] || 0) + 1;
  });

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: data.length,
    summary: {
      total_upaya: data.length,
      per_instansi: byInstansi,
      jumlah_wilayah: Object.keys(byWilayah).length,
      daftar_wilayah: Object.keys(byWilayah)
    },
    by_wilayah: byWilayah,
    data: data
  };
}

// ====================================================================
// AGREGAT: RINGKASAN (kartu KPI dashboard) & ALL
// ====================================================================
function buildRingkasan(ss, f) {
  const pt = parsePendudukTerdampak(ss, f);
  const ispa = parseIspa(ss, f);
  const pl = parsePenyakitLainnya(ss, f);
  const ispu = parseIspu(ss, f);
  const ld = parseLogistik(ss, 'logistikDinkes', 'dinkes', f);
  const lp = parseLogistik(ss, 'logistikPuskris', 'puskris', f);
  const sdmk = parseSdmk(ss, f);
  const upaya = parseUpaya(ss, f);

  const provSet = {};
  [pt.data, ispa.data, pl.data, ispu.data, sdmk.data].forEach(function (arr) {
    (arr || []).forEach(function (x) { if (x.provinsi) provSet[x.provinsi] = true; });
  });

  return {
    kartu: {
      penduduk_terdampak: pt.summary ? pt.summary.penduduk_terdampak : 0,
      kabupaten_terdampak: pt.summary ? pt.summary.kabupaten_terdampak : 0,
      meninggal: pt.summary ? pt.summary.meninggal : 0,
      rawat_inap: pt.summary ? pt.summary.luka_berat_rawat_inap : 0,
      kasus_ispa: ispa.summary ? ispa.summary.total_kasus : 0,
      kasus_ispa_balita: ispa.summary ? ispa.summary.le_5_tahun : 0,
      kasus_penyakit_lainnya: pl.summary ? pl.summary.total_kasus : 0,
      stasiun_ispu_berbahaya: ispu.summary ? (ispu.summary.per_kategori['Berbahaya'] || 0) : 0,
      ispu_tertinggi: ispu.summary ? ispu.summary.stasiun_tertinggi : null,
      sdmk_digerakkan: sdmk.summary ? sdmk.summary.total_sdmk : 0,
      jumlah_upaya: upaya.summary ? upaya.summary.total_upaya : 0,
      logistik_dinkes_jenis: ld.by_jenis || [],
      logistik_puskris_jenis: lp.by_jenis || []
    },
    ispu_update_text: ispu.update_text || null,
    provinsi_terdampak: Object.keys(provSet).sort()
  };
}

function buildAll(ss, f) {
  return {
    ringkasan: buildRingkasan(ss, f),
    penduduk_terdampak: parsePendudukTerdampak(ss, f),
    ispa: parseIspa(ss, f),
    penyakit_lainnya: parsePenyakitLainnya(ss, f),
    ispu: parseIspu(ss, f),
    logistik: {
      dinkes: parseLogistik(ss, 'logistikDinkes', 'dinkes', f),
      puskris: parseLogistik(ss, 'logistikPuskris', 'puskris', f)
    },
    sdmk: parseSdmk(ss, f),
    upaya: parseUpaya(ss, f)
  };
}

function buildMeta(ss) {
  const tabs = {};
  Object.keys(SHEETS).forEach(function (k) {
    const s = getSheet(ss, k);
    tabs[k] = s ? { sheet_name: s.getName(), last_row: s.getLastRow(), last_column: s.getLastColumn() } : null;
  });
  return {
    spreadsheet: ss.getName(),
    endpoints: ['all', 'ringkasan', 'penduduk_terdampak', 'ispa', 'penyakit_lainnya', 'ispu', 'logistik', 'logistik_dinkes', 'logistik_puskris', 'sdmk', 'upaya', 'meta'],
    parameters: ['type', 'provinsi', 'kabupaten', 'penyakit', 'kategori', 'instansi', 'jenis', 'q', 'limit', 'offset', 'nocache', 'refresh', 'token'],
    tabs: tabs,
    cache_ttl_seconds: CACHE_TTL
  };
}

// ====================================================================
// UTILITY HELPERS
// ====================================================================
function getSheet(ss, key) {
  const names = SHEETS[key] || [];
  for (let i = 0; i < names.length; i++) {
    const s = ss.getSheetByName(names[i]);
    if (s) return s;
  }
  const pats = SHEET_PATTERNS[key] || [];
  const sheets = ss.getSheets();
  for (let p = 0; p < pats.length; p++) {
    for (let i = 0; i < sheets.length; i++) {
      const n = sheets[i].getName().toUpperCase();
      if (pats[p].every(function (t) { return n.indexOf(t) > -1; })) return sheets[i];
    }
  }
  return null;
}

function notFound(name) {
  return { tersedia: false, pesan: "Sheet '" + name + "' tidak ditemukan.", total: 0, summary: {}, data: [] };
}

/** Cari baris header & posisi kolom berdasarkan label; fallback ke posisi default. */
function locateColumns(values, labels, defaults, scanCols) {
  const out = { headerIdx: 0 };
  Object.keys(defaults).forEach(function (k) { out[k] = defaults[k]; });
  const maxCols = scanCols || 8;
  for (let r = 0; r < Math.min(6, values.length); r++) {
    const row = values[r];
    let hits = 0;
    const found = {};
    for (let c = 0; c < Math.min(row.length, maxCols); c++) {
      const cell = normUpper(row[c]);
      if (!cell) continue;
      Object.keys(labels).forEach(function (k) {
        if (found[k] !== undefined) return;
        if (labels[k].some(function (l) { return cell === l || cell.indexOf(l) > -1; })) { found[k] = c; hits++; }
      });
    }
    if (hits >= 2) {
      out.headerIdx = r;
      Object.keys(found).forEach(function (k) { out[k] = found[k]; });
      return out;
    }
  }
  return out;
}

function findRowIndex(values, pred, fallback) {
  for (let r = 0; r < Math.min(10, values.length); r++) if (pred(values[r])) return r;
  return fallback;
}

/** Baris nomor kolom seperti "0,1,2,3..." di bawah header. */
function isNumberRow(row) {
  const filled = row.filter(function (v) { return v !== '' && v !== null; });
  if (filled.length < 2) return false;
  for (let i = 0; i < filled.length; i++) {
    if (typeof filled[i] !== 'number' || filled[i] !== Math.floor(filled[i]) || filled[i] > 30) return false;
  }
  return filled[0] === 0 || filled[0] === 1;
}

function parseFilters(p) {
  const list = function (v) {
    return v ? String(v).split(',').map(function (s) { return normUpper(s); }).filter(String) : [];
  };
  const one = function (v) { return v ? normUpper(v) : ''; };
  const limit = p.limit !== undefined && p.limit !== '' ? Math.max(0, parseInt(p.limit, 10) || 0) : null;
  const offset = p.offset !== undefined && p.offset !== '' ? Math.max(0, parseInt(p.offset, 10) || 0) : 0;
  const f = {
    provinsi: list(p.provinsi),
    kabupaten: one(p.kabupaten),
    penyakit: one(p.penyakit),
    kategori: one(p.kategori),
    instansi: one(p.instansi),
    jenis: one(p.jenis),
    q: one(p.q),
    limit: limit,
    offset: offset
  };
  f.isFiltered = !!(f.provinsi.length || f.kabupaten || f.penyakit || f.kategori || f.instansi || f.jenis || f.q);
  f.echo = {
    provinsi: p.provinsi || null, kabupaten: p.kabupaten || null, penyakit: p.penyakit || null,
    kategori: p.kategori || null, instansi: p.instansi || null, jenis: p.jenis || null, q: p.q || null,
    limit: limit, offset: offset
  };
  return f;
}

function matchProvinsi(provKey, f) {
  if (!f.provinsi.length) return true;
  const k = normUpper(provKey);
  return f.provinsi.some(function (want) { return k === want || k.indexOf(want) > -1; });
}

/** Paginasi untuk array `data` (setelah summary dihitung dari seluruh hasil filter). */
function withPaging(res, f) {
  if (!res || !Array.isArray(res.data)) return res;
  const total = res.data.length;
  if (f.limit !== null || f.offset) {
    const end = f.limit !== null ? f.offset + f.limit : undefined;
    res.data = res.data.slice(f.offset, end);
  }
  res.pagination = {
    total: total,
    offset: f.offset,
    limit: f.limit,
    returned: res.data.length,
    has_more: f.limit !== null ? (f.offset + res.data.length) < total : false
  };
  return res;
}

function buildCacheKey(type, p) {
  const keys = ['provinsi', 'kabupaten', 'penyakit', 'kategori', 'instansi', 'jenis', 'q', 'limit', 'offset'];
  const parts = keys.map(function (k) { return k + '=' + (p[k] ? String(p[k]).toLowerCase().trim() : ''); }).join('&');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, parts)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  return CACHE_PREFIX + type + '_' + digest;
}

/** Hapus cache manual (jalankan dari editor setelah update data besar). */
function clearApiCache() {
  // CacheService tidak punya "clear all"; cukup naikkan CACHE_PREFIX atau tunggu TTL 10 menit.
  Logger.log('Naikkan CACHE_PREFIX (mis. karhutla_cache_v2_) untuk invalidasi seketika, atau pakai ?refresh=true.');
}

function orderPayload(p) {
  const head = ['success', 'api_version', 'type', 'source', 'updated_at', 'filters'];
  const out = {};
  head.forEach(function (k) { if (p[k] !== undefined) out[k] = p[k]; });
  Object.keys(p).forEach(function (k) { if (head.indexOf(k) === -1 && p[k] !== undefined) out[k] = p[k]; });
  return out;
}

function ispuKategori(v) {
  for (let i = 0; i < ISPU_KATEGORI.length; i++) {
    const k = ISPU_KATEGORI[i];
    if (v >= k.min && (k.max === null || v <= k.max)) return k;
  }
  return ISPU_KATEGORI[ISPU_KATEGORI.length - 1];
}

function sumObjects(arr, keys) {
  const out = {};
  keys.forEach(function (k) { out[k] = 0; });
  arr.forEach(function (o) { keys.forEach(function (k) { out[k] += Number(o[k] || 0); }); });
  return out;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const s = String(val).trim();
  if (/^#/.test(s)) return 0; // #N/A, #REF!
  const clean = s.replace(/[^0-9-]/g, ''); // angka sheet ber-format "1,234" atau "1.234" (tanpa desimal)
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

function toNumberOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (/^#/.test(s)) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

function cleanText(v) {
  const s = String(v === null || v === undefined ? '' : v).replace(/\r/g, '').trim();
  if (!s || s === '-' || /^#/.test(s)) return null;
  return s;
}

function normUpper(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase();
}

function slug(s) {
  return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function toTitleCase(str) {
  const keepUpper = ['ISPA', 'ILI', 'PALI', 'IKN', 'KIPP', 'KPIKN', 'OKU', 'BPBD', 'AQMS', 'RS', 'PKM', 'TCK', 'PSC'];
  return String(str || '').toLowerCase().replace(/(^|[\s\/\-(])([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); })
    .split(' ').map(function (w) {
      const bare = w.replace(/[()]/g, '').toUpperCase();
      return keepUpper.indexOf(bare) > -1 ? w.toUpperCase() : w;
    }).join(' ');
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// TEST DARI EDITOR (Run > testDoGet), lihat Execution log
// ====================================================================
function testDoGet() {
  const types = ['meta', 'ringkasan', 'penduduk_terdampak', 'ispa', 'penyakit_lainnya', 'ispu', 'logistik', 'sdmk', 'upaya', 'all'];
  types.forEach(function (t) {
    const resp = doGet({ parameter: { type: t, nocache: 'true' } });
    const body = JSON.parse(resp.getContent());
    Logger.log(t + ' -> success=' + body.success + ', total=' + (body.total !== undefined ? body.total : '-') +
      ', chars=' + resp.getContent().length + (body.error ? ', error=' + body.error : ''));
  });
  const f = doGet({ parameter: { type: 'penduduk_terdampak', provinsi: 'Riau', limit: '5', nocache: 'true' } });
  Logger.log('filter Riau limit 5 -> ' + f.getContent().slice(0, 500));
}
