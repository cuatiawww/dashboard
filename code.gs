/**
 * ====================================================================
 * GOOGLE APPS SCRIPT: API TERPADU BENCANA GEMPA PROV. NTT & RELAWAN
 * Sheet Target:
 *  1. Sheet "PENDUDUK TERDAMPAK & KORBAN"
 *  2. Sheet "1 DATA PASIEN TRIASE RS" (atau DATA PASIEN TRIASE RS)
 *  3. Sheet "4 DATA PASIEN TRIASE PKM" (atau DATA PASIEN TRIASE PKM)
 *  4. Sheet "DATA FASILITAS PELAYANAN KESEHATAN TERDAMPAK"
 *  5. Sheet "DATA REGISTRASI RELAWAN" (atau DATA REGISTRASI RELAWAN HARIAN)
 *  6. Sheet "DATA RELAWAN BERDASARKAN TIM"
 *  7. Sheet "DATA JUMLAH RELAWAN AKTIF HARIAN" (atau DATA RELAWAN AKTIF HARIAN)
 *  8. Sheet "UPAYA BIDANG KESEHATAN" (atau UPAYA KESEHATAN / UPAYA)
 * ====================================================================
 */

function doGet(e) {
  try {
    const type = (e && e.parameter && e.parameter.type) ? e.parameter.type.toLowerCase().trim() : 'all';
    const noCache = (e && e.parameter && (e.parameter.nocache === 'true' || e.parameter.refresh === 'true'));
    const cache = CacheService.getScriptCache();
    const cacheKey = "sipkk_cache_v2_" + type;

    // 1. Cek Server Cache (Jika ada dan tidak diminta refresh)
    if (!noCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 2. JIKA REQUEST RELAWAN (?type=relawan) -> HANYA PROSES SHEET RELAWAN (SUPER CEPAT)
    if (type === 'relawan' || type === 'relawan_lengkap') {
      const relawanResult = parseDataRelawanLengkap(ss);
      const payloadRelawan = {
        success: true,
        source: 'google_spreadsheet_ntt_relawan',
        updated_at: new Date().toISOString(),
        summary: relawanResult.summary,
        registrasi_relawan: relawanResult.registrasi_relawan,
        relawan_berdasarkan_tim: relawanResult.relawan_berdasarkan_tim,
        relawan_aktif_harian: relawanResult.relawan_aktif_harian
      };
      
      const jsonStr = JSON.stringify(payloadRelawan);
      // Simpan di CacheService selama 10 Menit (600 detik)
      try { cache.put(cacheKey, jsonStr, 600); } catch (ce) {}
      return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. JIKA REQUEST FASKES TERDAMPAK (?type=faskes_terdampak) -> HANYA PROSES FASKES TERDAMPAK
    if (type === 'faskes_terdampak' || type === 'faskes_rusak') {
      const faskesTerdampakResult = parseDataFaskesTerdampak(ss);
      const payloadFaskes = {
        success: true,
        updated_at: new Date().toISOString(),
        total: faskesTerdampakResult.data.length,
        summary: faskesTerdampakResult.summary,
        data: faskesTerdampakResult.data
      };
      const jsonStr = JSON.stringify(payloadFaskes);
      try { cache.put(cacheKey, jsonStr, 600); } catch (ce) {}
      return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. JIKA REQUEST UPAYA KESEHATAN (?type=upaya / ?type=upaya_kesehatan / ?type=upaya_bidang_kesehatan)
    if (type === 'upaya' || type === 'upaya_kesehatan' || type === 'upaya_bidang_kesehatan') {
      const upayaResult = parseSheetUpayaKesehatan(ss);
      const payloadUpaya = {
        success: true,
        source: 'google_spreadsheet_upaya_kesehatan',
        updated_at: new Date().toISOString(),
        ...upayaResult
      };
      const jsonStr = JSON.stringify(payloadUpaya);
      try { cache.put(cacheKey, jsonStr, 600); } catch (ce) {}
      return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. JIKA REQUEST KORBAN / SEMUA (?type=all / type=korban)
    const sheetKorban = ss.getSheetByName("PENDUDUK TERDAMPAK & KORBAN") || findSheetByPattern(ss, ["KORBAN", "PENDUDUK"]) || ss.getSheets()[0];
    const korbanData = parseSheetKorban(sheetKorban);

    const sheetRS = ss.getSheetByName("1 DATA PASIEN TRIASE RS") || findSheetByPattern(ss, ["TRIASE RS", "PASIEN RS"]);
    const rsData = sheetRS ? parseSheetTriaseFaskes(sheetRS, "RS", korbanData.daftar_tanggal) : [];

    const sheetPKM = ss.getSheetByName("4 DATA PASIEN TRIASE PKM") || findSheetByPattern(ss, ["TRIASE PKM", "PASIEN PKM", "PUSKESMAS"]);
    const pkmData = sheetPKM ? parseSheetTriaseFaskes(sheetPKM, "Puskesmas", korbanData.daftar_tanggal) : [];

    const faskesTerdampakResult = parseDataFaskesTerdampak(ss);
    const relawanResult = parseDataRelawanLengkap(ss);
    const upayaKesehatanResult = parseSheetUpayaKesehatan(ss);

    let totalMerah = 0, totalKuning = 0, totalHijau = 0, totalHitam = 0;
    rsData.forEach(function(r) {
      totalMerah += Number(r.total_kumulatif.merah || 0);
      totalKuning += Number(r.total_kumulatif.kuning || 0);
      totalHijau += Number(r.total_kumulatif.hijau || 0);
      totalHitam += Number(r.total_kumulatif.hitam || 0);
    });
    pkmData.forEach(function(p) {
      totalMerah += Number(p.total_kumulatif.merah || 0);
      totalKuning += Number(p.total_kumulatif.kuning || 0);
      totalHijau += Number(p.total_kumulatif.hijau || 0);
      totalHitam += Number(p.total_kumulatif.hitam || 0);
    });

    const payload = {
      success: true,
      updated_at: new Date().toISOString(),
      daftar_tanggal: korbanData.daftar_tanggal,
      summary: korbanData.summary,
      data_kabupaten: korbanData.data_kabupaten,
      triase_rs: rsData,
      triase_pkm: pkmData,
      summary_triase: {
        merah: totalMerah,
        kuning: totalKuning,
        hijau: totalHijau,
        hitam: totalHitam,
        total: totalMerah + totalKuning + totalHijau + totalHitam
      },
      faskes_terdampak: faskesTerdampakResult.data,
      summary_faskes_terdampak: faskesTerdampakResult.summary,
      relawan: relawanResult,
      upaya_kesehatan: upayaKesehatanResult
    };

    const jsonStr = JSON.stringify(payload);
    try { cache.put(cacheKey, jsonStr, 600); } catch (ce) {}
    return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
      stack: err.stack
    });
  }
}

// ====================================================================
// MODUL 1: PARSER SHEET PENDUDUK TERDAMPAK & KORBAN
// ====================================================================
function parseSheetKorban(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error("Format Sheet Penduduk Terdampak & Korban tidak sesuai.");

  // Identifikasi Baris Header Tanggal (Mulai Kolom D / Index 3)
  let dateRowIdx = 0;
  for (let r = 0; r < Math.min(6, data.length); r++) {
    for (let c = 3; c < data[r].length; c++) {
      if (formatDate(data[r][c])) {
        dateRowIdx = r;
        break;
      }
    }
  }

  const headerRow = data[dateRowIdx];
  const dateColMap = [];
  const dateSet = {};

  // Hanya ambil kolom tanggal yang BENAR-BENAR memiliki data angka terisi di baris bawahnya
  for (let c = 3; c < headerRow.length; c++) {
    const formatted = formatDate(headerRow[c]);
    if (formatted) {
      let hasData = false;
      for (let r = dateRowIdx + 1; r < data.length; r++) {
        const val = parseNum(data[r][c]);
        if (val > 0) {
          hasData = true;
          break;
        }
      }

      // Jika tanggal ini ada angkanya (> 0), masukkan ke daftar tanggal aktif
      if (hasData) {
        dateColMap.push({ colIdx: c, dateStr: formatted });
        dateSet[formatted] = true;
      }
    }
  }

  const daftarTanggal = Object.keys(dateSet).sort();

  // Prioritas Kabupaten Resmi
  const TARGET_KABUPATEN = [
    "Kab. Manggarai Timur",
    "Kab. Manggarai Barat",
    "Kab. Manggarai",
    "Kab. Sikka",
    "Kab. Ende",
    "Kab. Nagekeo",
    "Kab. Ngada"
  ];

  const kabupatenMap = {};
  TARGET_KABUPATEN.forEach(function(kab) {
    const harian = {};
    daftarTanggal.forEach(function(d) {
      harian[d] = { populasi_terdampak: 0, meninggal: 0, luka_berat: 0, luka_ringan: 0, pengungsi: 0, titik_pengungsian: 0 };
    });
    kabupatenMap[kab] = {
      kabupaten: kab,
      populasi_terdampak: 0,
      meninggal: 0,
      luka_berat: 0,
      luka_ringan: 0,
      total_luka: 0,
      total_korban: 0,
      pengungsi: 0,
      titik_pengungsian: 0,
      harian: harian
    };
  });

  let currentKab = "";

  for (let r = dateRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    const colA = String(row[0] || "").trim();
    const colB = String(row[1] || "").trim();
    const colC = String(row[2] || "").trim();
    const colD = String(row[3] || "").trim();

    // 1. Cek nama Kabupaten di Col A, B, atau C
    const textKab = (colA + " " + colB + " " + colC).toLowerCase();
    if (textKab.includes("total") || textKab.includes("rekap") || textKab.includes("jumlah")) {
      currentKab = "";
      continue;
    }

    const matchedKab = TARGET_KABUPATEN.find(function(k) {
      const cleanName = k.toLowerCase().replace("kab. ", "").trim();
      return textKab.includes(cleanName);
    });

    if (matchedKab) {
      currentKab = matchedKab;
    }

    if (!currentKab || !kabupatenMap[currentKab]) continue;

    // 2. Tentukan Metric Key dari Col B, Col C, atau Col D (Variabel)
    const varText = (colB + " " + colC + " " + colD).toLowerCase();
    let metricKey = "";

    if (varText.includes("populasi") || varText.includes("jiwa terdampak") || varText.includes("penduduk terdampak") || varText === "pd" || varText.startsWith("pd ")) {
      metricKey = "populasi_terdampak";
    } else if (varText.includes("meninggal") || varText.includes("mati") || varText === "md" || varText.startsWith("md ")) {
      metricKey = "meninggal";
    } else if (varText.includes("luka berat") || varText.includes("rawat inap") || varText === "lb" || varText.startsWith("lb ")) {
      metricKey = "luka_berat";
    } else if (varText.includes("luka ringan") || varText.includes("rawat jalan") || varText === "lr" || varText.startsWith("lr ")) {
      metricKey = "luka_ringan";
    } else if (varText.includes("pengungsi") && !varText.includes("titik")) {
      metricKey = "pengungsi";
    } else if (varText.includes("titik") || varText.includes("posko") || varText.includes("pegs")) {
      metricKey = "titik_pengungsian";
    }

    if (!metricKey) continue;

    // 3. Simpan nilai harian per tanggal
    dateColMap.forEach(function(item) {
      const val = parseNum(row[item.colIdx]);
      if (kabupatenMap[currentKab].harian[item.dateStr]) {
        kabupatenMap[currentKab].harian[item.dateStr][metricKey] = val;
      }
    });
  }

  // Akumulasi summary
  let sumPopulasi = 0, sumMeninggal = 0, sumLukaBerat = 0, sumLukaRingan = 0, sumPengungsi = 0, sumTitik = 0;
  const resultKabupaten = [];

  TARGET_KABUPATEN.forEach(function(kab) {
    const kData = kabupatenMap[kab];
    let kabPop = 0, kabMD = 0, kabLB = 0, kabLR = 0, kabPeng = 0, kabTitik = 0;
    daftarTanggal.forEach(function(d) {
      const h = kData.harian[d];
      kabPop = Math.max(kabPop, h.populasi_terdampak);
      kabMD += h.meninggal;
      kabLB += h.luka_berat;
      kabLR += h.luka_ringan;
      kabPeng = Math.max(kabPeng, h.pengungsi);
      kabTitik = Math.max(kabTitik, h.titik_pengungsian);
    });

    kData.populasi_terdampak = kabPop;
    kData.meninggal = kabMD;
    kData.luka_berat = kabLB;
    kData.luka_ringan = kabLR;
    kData.total_luka = kabLB + kabLR;
    kData.total_korban = kabMD + kabLB + kabLR;
    kData.pengungsi = kabPeng;
    kData.titik_pengungsian = kabTitik;

    sumPopulasi += kabPop;
    sumMeninggal += kabMD;
    sumLukaBerat += kabLB;
    sumLukaRingan += kabLR;
    sumPengungsi += kabPeng;
    sumTitik += kabTitik;

    resultKabupaten.push(kData);
  });

  return {
    daftar_tanggal: daftarTanggal,
    summary: {
      total_populasi_terdampak: sumPopulasi,
      total_meninggal: sumMeninggal,
      total_luka_berat: sumLukaBerat,
      total_luka_ringan: sumLukaRingan,
      total_korban_luka: sumLukaBerat + sumLukaRingan,
      total_seluruh_korban: sumMeninggal + sumLukaBerat + sumLukaRingan,
      total_pengungsi: sumPengungsi,
      total_titik_pengungsian: sumTitik
    },
    data_kabupaten: resultKabupaten
  };
}

// ====================================================================
// MODUL 2: PARSER SHEET TRIASE FASKES (RS & PUSKESMAS)
// ====================================================================
function parseSheetTriaseFaskes(sheet, defaultJenis, daftarTanggal) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  let dateRowIdx = 0;
  for (let r = 0; r < Math.min(6, data.length); r++) {
    for (let c = 3; c < data[r].length; c++) {
      if (formatDate(data[r][c])) {
        dateRowIdx = r;
        break;
      }
    }
  }

  const headerRow = data[dateRowIdx];
  const dateColMap = [];
  for (let c = 3; c < headerRow.length; c++) {
    const formatted = formatDate(headerRow[c]);
    if (formatted && daftarTanggal.includes(formatted)) {
      dateColMap.push({ colIdx: c, dateStr: formatted });
    }
  }

  const faskesMap = {};
  let currentKab = "";
  let currentNamaFaskes = "";

  for (let r = dateRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    const colB = String(row[1] || "").trim();
    const colC = String(row[2] || "").trim();
    const colD = String(row[3] || "").trim();

    if (colB && !colB.toLowerCase().includes("total") && !colB.toLowerCase().includes("rekap")) {
      currentKab = colB.startsWith("Kab.") ? colB : ("Kab. " + colB);
    }
    if (colC && !colC.toLowerCase().includes("total") && !colC.toLowerCase().includes("rekap")) {
      currentNamaFaskes = colC;
    }

    if (!currentKab || !currentNamaFaskes) continue;

    const varLower = colD.toLowerCase();
    let triaseType = "";
    if (varLower.includes("merah") || varLower.includes("red")) triaseType = "merah";
    else if (varLower.includes("kuning") || varLower.includes("yellow")) triaseType = "kuning";
    else if (varLower.includes("hijau") || varLower.includes("green")) triaseType = "hijau";
    else if (varLower.includes("hitam") || varLower.includes("black")) triaseType = "hitam";

    if (!triaseType) continue;

    const key = currentKab + "__" + currentNamaFaskes;
    if (!faskesMap[key]) {
      const harian = {};
      daftarTanggal.forEach(function(d) {
        harian[d] = { merah: 0, kuning: 0, hijau: 0, hitam: 0, total: 0 };
      });

      faskesMap[key] = {
        kabupaten: currentKab,
        nama_faskes: currentNamaFaskes,
        nama_rs: defaultJenis === "RS" ? currentNamaFaskes : undefined,
        nama_puskesmas: defaultJenis === "Puskesmas" ? currentNamaFaskes : undefined,
        jenis: defaultJenis,
        harian: harian,
        total_kumulatif: { merah: 0, kuning: 0, hijau: 0, hitam: 0, total: 0 }
      };
    }

    dateColMap.forEach(function(item) {
      const val = parseNum(row[item.colIdx]);
      if (faskesMap[key].harian[item.dateStr]) {
        faskesMap[key].harian[item.dateStr][triaseType] = val;
        const h = faskesMap[key].harian[item.dateStr];
        h.total = h.merah + h.kuning + h.hijau + h.hitam;
      }
    });
  }

  const result = [];
  Object.values(faskesMap).forEach(function(f) {
    let m = 0, k = 0, hij = 0, hit = 0;
    daftarTanggal.forEach(function(d) {
      const h = f.harian[d];
      m += h.merah;
      k += h.kuning;
      hij += h.hijau;
      hit += h.hitam;
    });
    f.total_kumulatif = { merah: m, kuning: k, hijau: hij, hitam: hit, total: m + k + hij + hit };
    result.push(f);
  });

  return result;
}

// ====================================================================
// MODUL 3: PARSER FASILITAS PELAYANAN KESEHATAN TERDAMPAK
// ====================================================================
function parseDataFaskesTerdampak(ss) {
  let sheet = ss.getSheetByName('DATA FASILITAS PELAYANAN KESEHATAN TERDAMPAK');
  if (!sheet) {
    const allSheets = ss.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      const name = allSheets[i].getName().toLowerCase();
      if (name.includes('terdampak') && name.includes('fasilitas')) {
        sheet = allSheets[i];
        break;
      }
    }
  }
  if (!sheet) return { data: [], summary: {} };

  const rawData = sheet.getDataRange().getValues();
  if (!rawData || rawData.length < 4) return { data: [], summary: {} };

  const result = [];
  let rusakBerat = 0, rusakSedang = 0, rusakRingan = 0;
  let krisisListrik = 0, krisisAir = 0, butuhTenda = 0, butuhOksigen = 0, butuhMatras = 0, butuhSelimut = 0, butuhToilet = 0, butuhObat = 0;

  for (let i = 3; i < rawData.length; i++) {
    const row = rawData[i];
    const no = row[0];
    const kabRaw = String(row[1] || '').trim();
    const jenisRaw = String(row[2] || '').trim();
    const namaRaw = String(row[3] || '').trim();

    if (!namaRaw || namaRaw === '-' || namaRaw.toLowerCase().includes('total') || namaRaw.toLowerCase() === 'nama') {
      continue;
    }

    const kecamatan = String(row[4] || '-').trim();
    const jenisLayanan = String(row[5] || '-').trim();
    const kadis = String(row[6] || '-').trim();
    const kontak = String(row[7] || '-').trim();

    let jenisLabel = 'Puskesmas';
    let namaLengkap = namaRaw;
    const jLower = jenisRaw.toLowerCase();

    if (jLower === 'pkm' || jLower.includes('puskesmas')) {
      jenisLabel = 'Puskesmas';
      namaLengkap = 'Puskesmas ' + toTitleCase(namaRaw.replace(/^pkm\s+/i, '').replace(/^puskesmas\s+/i, ''));
    } else if (jLower === 'rs' || jLower === 'rsud' || jLower.includes('rumah sakit')) {
      jenisLabel = 'Rumah Sakit';
      namaLengkap = (namaRaw.toUpperCase().startsWith('RS') ? '' : 'RSUD ') + toTitleCase(namaRaw);
    } else if (jLower.includes('pustu')) {
      jenisLabel = 'Puskesmas Pembantu';
      namaLengkap = 'Pustu ' + toTitleCase(namaRaw);
    } else if (jLower.includes('klinik')) {
      jenisLabel = 'Klinik';
      namaLengkap = 'Klinik ' + toTitleCase(namaRaw);
    }

    const kerusakanRaw = String(row[8] || '').trim();
    let tingkatKerusakan = 'Normal';
    const kLower = kerusakanRaw.toLowerCase();
    if (kLower.includes('berat') || kLower.includes('hancur') || kLower.includes('roboh')) {
      tingkatKerusakan = 'Rusak Berat';
      rusakBerat++;
    } else if (kLower.includes('sedang')) {
      tingkatKerusakan = 'Rusak Sedang';
      rusakSedang++;
    } else if (kLower.includes('ringan')) {
      tingkatKerusakan = 'Rusak Ringan';
      rusakRingan++;
    }

    const statusRaw = String(row[9] || 'Operasional').trim();
    let statusOperasional = statusRaw || 'Operasional';

    const listrik = String(row[10] || 'Stabil').trim();
    const internet = String(row[11] || 'Stabil').trim();
    const ambulans = String(row[12] || '-').trim();

    const tenda = String(row[13] || '-').trim();
    const air = String(row[14] || '-').trim();
    const oksigen = String(row[15] || '-').trim();
    const matras = String(row[16] || '-').trim();
    const selimut = String(row[17] || '-').trim();
    const toilet = String(row[18] || '-').trim();
    const obat = String(row[19] || '-').trim();

    if (listrik.toLowerCase().includes('tidak') || listrik.toLowerCase().includes('rusak') || listrik.toLowerCase().includes('mati') || listrik.toLowerCase().includes('padam')) krisisListrik++;
    if (air.toLowerCase().includes('butuh') || air.toLowerCase().includes('krisis') || air.toLowerCase().includes('tercemar')) krisisAir++;
    if (tenda.toLowerCase().includes('butuh')) butuhTenda++;
    if (oksigen.toLowerCase().includes('butuh') || oksigen.toLowerCase().includes('terbatas')) butuhOksigen++;
    if (matras.toLowerCase().includes('butuh')) butuhMatras++;
    if (selimut.toLowerCase().includes('butuh')) butuhSelimut++;
    if (toilet.toLowerCase().includes('butuh')) butuhToilet++;
    if (obat.toLowerCase().includes('butuh')) butuhObat++;

    const listKebutuhan = [];
    if (tenda.toLowerCase().includes('butuh')) listKebutuhan.push('Tenda Darurat');
    if (air.toLowerCase().includes('butuh')) listKebutuhan.push('Air Bersih');
    if (oksigen.toLowerCase().includes('butuh') || oksigen.toLowerCase().includes('terbatas')) listKebutuhan.push('Oksigen Medis');
    if (matras.toLowerCase().includes('butuh')) listKebutuhan.push('Matras');
    if (selimut.toLowerCase().includes('butuh')) listKebutuhan.push('Selimut');
    if (toilet.toLowerCase().includes('butuh')) listKebutuhan.push('Toilet Portable');
    if (obat.toLowerCase().includes('butuh')) listKebutuhan.push('Obat-obatan');

    result.push({
      no: Number(no) || (result.length + 1),
      kabupaten: kabRaw ? formatKabupaten(kabRaw) : 'Kab. Ende',
      jenis_faskes: jenisLabel,
      nama_faskes: namaLengkap,
      nama_asli_sheet: namaRaw,
      kecamatan: kecamatan,
      jenis_layanan: jenisLayanan,
      kontak_pj: kontak,
      kadis_kapus: kadis,
      kondisi_bangunan: tingkatKerusakan,
      status_operasional: statusOperasional,
      listrik: listrik,
      internet: internet,
      ambulans: ambulans,
      air_bersih: air,
      oksigen: oksigen,
      matras: matras,
      selimut: selimut,
      toilet: toilet,
      obat: obat,
      kebutuhan_mendesak: listKebutuhan.length > 0 ? listKebutuhan.join(', ') : 'Terpenuhi'
    });
  }

  return {
    data: result,
    summary: {
      total_terdampak: result.length,
      rusak_berat: rusakBerat,
      rusak_sedang: rusakSedang,
      rusak_ringan: rusakRingan,
      krisis_listrik: krisisListrik,
      krisis_air: krisisAir,
      butuh_tenda: butuhTenda,
      butuh_oksigen: butuhOksigen,
      butuh_matras: butuhMatras,
      butuh_selimut: butuhSelimut,
      butuh_toilet: butuhToilet,
      butuh_obat: butuhObat
    }
  };
}

// ====================================================================
// MODUL 4: PARSER DATA RELAWAN (3 SHEET BARU)
// ====================================================================

/**
 * 4A. Parser Sheet: DATA REGISTRASI RELAWAN
 */
function parseSheetRegistrasiRelawan(ss) {
  const sheet = ss.getSheetByName("DATA REGISTRASI RELAWAN") || 
                ss.getSheetByName("DATA REGISTRASI RELAWAN HARIAN") || 
                ss.getSheetByName("REGISTRASI RELAWAN") ||
                findSheetByPattern(ss, ["REGISTRASI RELAWAN", "REGISTRASI", "RELAWAN HARIAN"]);
                
  if (!sheet) return { tersedia: false, pesan: "Sheet Registrasi Relawan tidak ditemukan." };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { tersedia: true, pesan: "Data registrasi kosong." };

  // 1. Cari baris header yang memuat tanggal
  let headerRowIdx = 1;
  let dateCols = [];
  
  for (let r = 0; r < Math.min(5, values.length); r++) {
    const tempDateCols = [];
    for (let c = 0; c < values[r].length; c++) {
      const dt = formatDate(values[r][c]);
      if (dt) {
        tempDateCols.push({ colIdx: c, dateStr: dt });
      }
    }
    if (tempDateCols.length >= 2) {
      headerRowIdx = r;
      dateCols = tempDateCols;
      break;
    }
  }

  if (dateCols.length === 0 && values.length >= 2) {
    headerRowIdx = 1;
    for (let c = 0; c < values[1].length; c++) {
      const dt = formatDate(values[1][c]);
      if (dt) dateCols.push({ colIdx: c, dateStr: dt });
    }
  }

  const headerRow = values[headerRowIdx];
  const firstDateColIdx = dateCols.length > 0 ? dateCols[0].colIdx : 2;

  // 2. Tentukan letak kolom 'Jenis Tenaga' dan 'Sub Jenis Tenaga'
  let jenisTenagaColIdx = -1;
  let subJenisTenagaColIdx = -1;

  for (let c = 0; c < firstDateColIdx; c++) {
    const hStr = String(headerRow[c] || "").toLowerCase();
    if (hStr.includes("sub")) {
      subJenisTenagaColIdx = c;
    } else if (hStr.includes("jenis") || hStr.includes("tenaga") || hStr.includes("profesi")) {
      jenisTenagaColIdx = c;
    }
  }

  if (jenisTenagaColIdx === -1) {
    if (firstDateColIdx >= 3) {
      jenisTenagaColIdx = 1;
      subJenisTenagaColIdx = 2;
    } else if (firstDateColIdx === 2) {
      jenisTenagaColIdx = 0;
      subJenisTenagaColIdx = 1;
    } else {
      jenisTenagaColIdx = 0;
      subJenisTenagaColIdx = 0;
    }
  }
  if (subJenisTenagaColIdx === -1) {
    subJenisTenagaColIdx = jenisTenagaColIdx;
  }

  const dataRows = [];
  let totalKumulatif = 0;
  const dailySums = {};
  const summaryJenisTenaga = {};

  dateCols.forEach(function(d) { dailySums[d.dateStr] = 0; });

  for (let r = headerRowIdx + 1; r < values.length; r++) {
    const row = values[r];
    const jenisTenaga = String(row[jenisTenagaColIdx] || "").trim();
    const subJenisTenaga = String(row[subJenisTenagaColIdx] || "").trim();

    if (!jenisTenaga && !subJenisTenaga) continue;
    if (jenisTenaga.toLowerCase().includes("total") || jenisTenaga.toLowerCase().includes("jumlah")) continue;

    const isNakes = !jenisTenaga.toLowerCase().includes("non kesehatan") && !jenisTenaga.toLowerCase().includes("non medis");
    const harian = {};
    let rowTotal = 0;

    for (let c = 0; c < dateCols.length; c++) {
      const dt = dateCols[c].dateStr;
      const count = parseNum(row[dateCols[c].colIdx]);
      harian[dt] = count;
      rowTotal += count;
      dailySums[dt] += count;
    }

    totalKumulatif += rowTotal;

    if (!summaryJenisTenaga[jenisTenaga]) {
      summaryJenisTenaga[jenisTenaga] = {
        jenis_tenaga: jenisTenaga,
        is_nakes: isNakes,
        total_kumulatif: 0,
        harian: {}
      };
      dateCols.forEach(function(d) { summaryJenisTenaga[jenisTenaga].harian[d.dateStr] = 0; });
    }
    summaryJenisTenaga[jenisTenaga].total_kumulatif += rowTotal;
    dateCols.forEach(function(d) { summaryJenisTenaga[jenisTenaga].harian[d.dateStr] += harian[d.dateStr]; });

    dataRows.push({
      no: dataRows.length + 1,
      jenis_tenaga: jenisTenaga,
      sub_jenis_tenaga: subJenisTenaga || jenisTenaga,
      is_nakes: isNakes,
      total_kumulatif: rowTotal,
      harian: harian
    });
  }

  const daftarTanggal = dateCols.map(function(item) { return item.dateStr; });
  let runningCumulative = 0;
  const trenHarian = daftarTanggal.map(function(tgl) {
    const penambahan = dailySums[tgl] || 0;
    runningCumulative += penambahan;
    return {
      tanggal: tgl,
      penambahan_baru: penambahan,
      total_kumulatif: runningCumulative
    };
  });

  return {
    tersedia: true,
    nama_sheet: sheet.getName(),
    daftar_tanggal: daftarTanggal,
    tanggal_terbaru: daftarTanggal.length > 0 ? daftarTanggal[daftarTanggal.length - 1] : "",
    total_registrasi_kumulatif: totalKumulatif,
    total_profesi_terdata: dataRows.length,
    tren_harian: trenHarian,
    summary_jenis_tenaga: Object.values(summaryJenisTenaga).sort(function(a, b) { return b.total_kumulatif - a.total_kumulatif; }),
    data_detail: dataRows
  };
}

/**
 * 4B. Parser Sheet: DATA RELAWAN BERDASARKAN TIM
 */
function parseSheetRelawanTim(ss) {
  const sheet = ss.getSheetByName("DATA RELAWAN BERDASARKAN TIM") || 
                ss.getSheetByName("RELAWAN BERDASARKAN TIM") || 
                findSheetByPattern(ss, ["BERDASARKAN TIM", "TIM RELAWAN", "KATEGORI TIM"]);
                
  if (!sheet) return { tersedia: false, pesan: "Sheet Relawan Berdasarkan Tim tidak ditemukan." };

  const values = sheet.getDataRange().getValues();
  const kategoriList = [];
  let totalRelawan = 0;

  for (let i = 1; i < values.length; i++) {
    const kat = String(values[i][0] || "").trim();
    const jml = parseNum(values[i][1]);

    if (!kat || kat.toLowerCase().includes("total") || kat.toLowerCase().includes("jumlah")) continue;

    totalRelawan += jml;
    kategoriList.push({ kategori: kat, jumlah: jml });
  }

  const kategoriWithPct = kategoriList.map(function(item) {
    const pct = totalRelawan > 0 ? ((item.jumlah / totalRelawan) * 100) : 0;
    return {
      kategori: item.kategori,
      jumlah: item.jumlah,
      persentase: Math.round(pct * 10) / 10,
      persentase_formatted: (Math.round(pct * 10) / 10).toFixed(1) + "%"
    };
  }).sort(function(a, b) { return b.jumlah - a.jumlah; });

  return {
    tersedia: true,
    nama_sheet: sheet.getName(),
    total_relawan_tim: totalRelawan,
    total_kategori: kategoriWithPct.length,
    kategori_tim: kategoriWithPct
  };
}

/**
 * 4C. Parser Sheet: DATA JUMLAH RELAWAN AKTIF HARIAN
 */
function parseSheetRelawanAktif(ss) {
  const sheet = ss.getSheetByName("DATA JUMLAH RELAWAN AKTIF HARIAN") || 
                ss.getSheetByName("DATA RELAWAN AKTIF HARIAN") || 
                ss.getSheetByName("RELAWAN AKTIF HARIAN") || 
                ss.getSheetByName("RELAWAN AKTIF") || 
                findSheetByPattern(ss, ["RELAWAN AKTIF HARIAN", "RELAWAN AKTIF", "AKTIF HARIAN"]);
                
  if (!sheet) return { tersedia: false, pesan: "Sheet Relawan Aktif Harian tidak ditemukan." };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { tersedia: true, pesan: "Data relawan aktif kosong." };

  // 1. Cari baris header yang memuat tanggal
  let headerRowIdx = 1;
  let dateCols = [];
  
  for (let r = 0; r < Math.min(5, values.length); r++) {
    const tempDateCols = [];
    for (let c = 0; c < values[r].length; c++) {
      const dt = formatDate(values[r][c]);
      if (dt) {
        tempDateCols.push({ colIdx: c, dateStr: dt });
      }
    }
    if (tempDateCols.length >= 2) {
      headerRowIdx = r;
      dateCols = tempDateCols;
      break;
    }
  }

  if (dateCols.length === 0 && values.length >= 2) {
    headerRowIdx = 1;
    for (let c = 0; c < values[1].length; c++) {
      const dt = formatDate(values[1][c]);
      if (dt) dateCols.push({ colIdx: c, dateStr: dt });
    }
  }

  const headerRow = values[headerRowIdx];
  const firstDateColIdx = dateCols.length > 0 ? dateCols[0].colIdx : 2;

  // 2. Tentukan letak kolom 'Jenis Tenaga' dan 'Sub Jenis Tenaga'
  let jenisTenagaColIdx = -1;
  let subJenisTenagaColIdx = -1;

  for (let c = 0; c < firstDateColIdx; c++) {
    const hStr = String(headerRow[c] || "").toLowerCase();
    if (hStr.includes("sub")) {
      subJenisTenagaColIdx = c;
    } else if (hStr.includes("jenis") || hStr.includes("tenaga") || hStr.includes("profesi")) {
      jenisTenagaColIdx = c;
    }
  }

  if (jenisTenagaColIdx === -1) {
    if (firstDateColIdx >= 3) {
      jenisTenagaColIdx = 1;
      subJenisTenagaColIdx = 2;
    } else if (firstDateColIdx === 2) {
      jenisTenagaColIdx = 0;
      subJenisTenagaColIdx = 1;
    } else {
      jenisTenagaColIdx = 0;
      subJenisTenagaColIdx = 0;
    }
  }
  if (subJenisTenagaColIdx === -1) {
    subJenisTenagaColIdx = jenisTenagaColIdx;
  }

  const dataRows = [];
  const dailyActiveSums = {};
  const dailyActiveMedis = {};
  const dailyActiveNonMedis = {};
  const summaryJenisTenaga = {};

  dateCols.forEach(function(d) {
    dailyActiveSums[d.dateStr] = 0;
    dailyActiveMedis[d.dateStr] = 0;
    dailyActiveNonMedis[d.dateStr] = 0;
  });

  for (let r = headerRowIdx + 1; r < values.length; r++) {
    const row = values[r];
    const jenisTenaga = String(row[jenisTenagaColIdx] || "").trim();
    const subJenisTenaga = String(row[subJenisTenagaColIdx] || "").trim();

    if (!jenisTenaga && !subJenisTenaga) continue;
    if (jenisTenaga.toLowerCase().includes("total") || jenisTenaga.toLowerCase().includes("jumlah")) continue;

    const isNakes = !jenisTenaga.toLowerCase().includes("non kesehatan") && !jenisTenaga.toLowerCase().includes("non medis");
    const harian = {};
    let latestCount = 0;

    for (let c = 0; c < dateCols.length; c++) {
      const dt = dateCols[c].dateStr;
      const count = parseNum(row[dateCols[c].colIdx]);
      harian[dt] = count;
      dailyActiveSums[dt] += count;
      if (isNakes) dailyActiveMedis[dt] += count;
      else dailyActiveNonMedis[dt] += count;
      latestCount = count;
    }

    if (!summaryJenisTenaga[jenisTenaga]) {
      summaryJenisTenaga[jenisTenaga] = {
        jenis_tenaga: jenisTenaga,
        is_nakes: isNakes,
        harian: {},
        aktif_terkini: 0
      };
      dateCols.forEach(function(d) { summaryJenisTenaga[jenisTenaga].harian[d.dateStr] = 0; });
    }
    dateCols.forEach(function(d) { summaryJenisTenaga[jenisTenaga].harian[d.dateStr] += harian[d.dateStr]; });
    summaryJenisTenaga[jenisTenaga].aktif_terkini += latestCount;

    dataRows.push({
      no: dataRows.length + 1,
      jenis_tenaga: jenisTenaga,
      sub_jenis_tenaga: subJenisTenaga || jenisTenaga,
      is_nakes: isNakes,
      aktif_terkini: latestCount,
      harian: harian
    });
  }

  const daftarTanggal = dateCols.map(function(item) { return item.dateStr; });
  const latestDateKey = daftarTanggal.length > 0 ? daftarTanggal[daftarTanggal.length - 1] : "";

  const trenAktifHarian = daftarTanggal.map(function(tgl) {
    return {
      tanggal: tgl,
      total_aktif: dailyActiveSums[tgl] || 0,
      aktif_medis: dailyActiveMedis[tgl] || 0,
      aktif_non_medis: dailyActiveNonMedis[tgl] || 0
    };
  });

  return {
    tersedia: true,
    nama_sheet: sheet.getName(),
    daftar_tanggal: daftarTanggal,
    tanggal_terbaru: latestDateKey,
    total_aktif_terkini: latestDateKey ? (dailyActiveSums[latestDateKey] || 0) : 0,
    total_aktif_medis_terkini: latestDateKey ? (dailyActiveMedis[latestDateKey] || 0) : 0,
    total_aktif_non_medis_terkini: latestDateKey ? (dailyActiveNonMedis[latestDateKey] || 0) : 0,
    total_profesi_terdata: dataRows.length,
    tren_aktif_harian: trenAktifHarian,
    summary_jenis_tenaga: Object.values(summaryJenisTenaga).sort(function(a, b) { return b.aktif_terkini - a.aktif_terkini; }),
    data_detail: dataRows
  };
}

/**
 * 4D. Gabungan Seluruh Data Relawan
 */
function parseDataRelawanLengkap(ss) {
  const registrasi = parseSheetRegistrasiRelawan(ss);
  const tim = parseSheetRelawanTim(ss);
  const aktif = parseSheetRelawanAktif(ss);

  let totalNakes = 0;
  let totalNonNakes = 0;
  if (registrasi.data_detail) {
    registrasi.data_detail.forEach(function(item) {
      if (item.is_nakes) totalNakes += item.total_kumulatif;
      else totalNonNakes += item.total_kumulatif;
    });
  }

  return {
    summary: {
      total_registrasi_kumulatif: (registrasi.tersedia && typeof registrasi.total_registrasi_kumulatif === 'number') ? registrasi.total_registrasi_kumulatif : (tim.total_relawan_tim || 0),
      total_relawan_aktif_terkini: aktif.total_aktif_terkini || 0,
      total_nakes_terdaftar: totalNakes,
      total_non_nakes_terdaftar: totalNonNakes,
      total_tim_lembaga: tim.total_kategori || 0,
      tanggal_terbaru: registrasi.tanggal_terbaru || aktif.tanggal_terbaru || ""
    },
    registrasi_relawan: registrasi,
    relawan_berdasarkan_tim: tim,
    relawan_aktif_harian: aktif
  };
}

// ====================================================================
// MODUL 5: PARSER SHEET UPAYA BIDANG KESEHATAN
// ====================================================================
function parseSheetUpayaKesehatan(ss) {
  const sheet = ss.getSheetByName("UPAYA BIDANG KESEHATAN") || 
                ss.getSheetByName("UPAYA KESEHATAN") || 
                ss.getSheetByName("UPAYA") ||
                findSheetByPattern(ss, ["UPAYA BIDANG KESEHATAN", "UPAYA KESEHATAN", "UPAYA BIDANG", "UPAYA"]);

  if (!sheet) {
    return {
      tersedia: false,
      pesan: "Sheet 'UPAYA BIDANG KESEHATAN' tidak ditemukan.",
      summary: { total_upaya: 0, total_kabupaten: 0, total_sub_klaster: 0, daftar_kabupaten: [], daftar_sub_klaster: [] },
      data: [],
      by_kabupaten: {},
      by_sub_klaster: {}
    };
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {
      tersedia: true,
      pesan: "Sheet 'UPAYA BIDANG KESEHATAN' kosong atau belum memiliki data.",
      summary: { total_upaya: 0, total_kabupaten: 0, total_sub_klaster: 0, daftar_kabupaten: [], daftar_sub_klaster: [] },
      data: [],
      by_kabupaten: {},
      by_sub_klaster: {}
    };
  }

  // 1. Identifikasi Baris Header dan Posisi Kolom
  // Default: Col A (0) = Kabupaten/Kota, Col B (1) = Sub Klaster, Col C (2) = Upaya
  let headerRowIdx = 0;
  let colKab = 0;
  let colSubKlaster = 1;
  let colUpaya = 2;

  for (let r = 0; r < Math.min(5, values.length); r++) {
    const row = values[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim().toUpperCase();
      if (cell.includes("KABUPATEN") || cell.includes("KOTA")) {
        headerRowIdx = r;
        colKab = c;
      }
      if (cell.includes("SUB KLASTER") || cell.includes("SUB-KLASTER") || cell.includes("KLASTER")) {
        colSubKlaster = c;
      }
      if (cell.includes("UPAYA") || cell.includes("KEGIATAN") || cell.includes("RESPON")) {
        colUpaya = c;
      }
    }
  }

  const items = [];
  let currentKabupaten = "";
  let currentSubKlaster = "";

  // 2. Iterasi Baris Data (Forward-Fill untuk cell yang dimerge atau sengaja dikosongkan)
  for (let r = headerRowIdx + 1; r < values.length; r++) {
    const row = values[r];
    const rawKab = String(row[colKab] || '').trim();
    const rawSub = String(row[colSubKlaster] || '').trim();
    const rawUpaya = String(row[colUpaya] || '').trim();

    // Jika kolom kabupaten terisi, perbarui kabupaten aktif
    if (rawKab && rawKab.length > 1 && !rawKab.toUpperCase().includes("KABUPATEN/KOTA")) {
      currentKabupaten = formatKabupaten(rawKab);
    }

    // Jika kolom sub klaster terisi, perbarui sub klaster aktif
    if (rawSub && rawSub.length > 1 && !rawSub.toUpperCase().includes("SUB KLASTER")) {
      currentSubKlaster = rawSub;
    }

    // Jika ada narasi upaya, simpan sebagai record data
    if (rawUpaya && rawUpaya.length > 1 && rawUpaya !== '-' && !rawUpaya.toUpperCase().includes("UPAYA")) {
      items.push({
        id: "upaya-" + (items.length + 1),
        kabupaten: currentKabupaten || "Kab. Nagekeo",
        sub_klaster: currentSubKlaster || "Sub Klaster Pelayanan Kesehatan",
        upaya: rawUpaya
      });
    }
  }

  // 3. Bangun Struktur Grouping Dinamis
  const byKabupaten = {};
  const bySubKlaster = {};
  const setKab = {};
  const setSub = {};

  items.forEach(function(item) {
    const kab = item.kabupaten;
    const sub = item.sub_klaster;

    setKab[kab] = true;
    setSub[sub] = true;

    // Grouping by Kabupaten -> Sub Klaster -> Upaya[]
    if (!byKabupaten[kab]) byKabupaten[kab] = {};
    if (!byKabupaten[kab][sub]) byKabupaten[kab][sub] = [];
    byKabupaten[kab][sub].push(item.upaya);

    // Grouping by Sub Klaster -> [{ kabupaten, upaya }]
    if (!bySubKlaster[sub]) bySubKlaster[sub] = [];
    bySubKlaster[sub].push({
      kabupaten: kab,
      upaya: item.upaya
    });
  });

  const daftarKabupaten = Object.keys(setKab);
  const daftarSubKlaster = Object.keys(setSub);

  return {
    tersedia: true,
    sheet_name: sheet.getName(),
    total: items.length,
    summary: {
      total_upaya: items.length,
      total_kabupaten: daftarKabupaten.length,
      total_sub_klaster: daftarSubKlaster.length,
      daftar_kabupaten: daftarKabupaten,
      daftar_sub_klaster: daftarSubKlaster
    },
    data: items,
    by_kabupaten: byKabupaten,
    by_sub_klaster: bySubKlaster
  };
}

// ====================================================================
// UTILITY HELPERS
// ====================================================================
function findSheetByPattern(ss, patterns) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toUpperCase();
    for (let p = 0; p < patterns.length; p++) {
      if (name.includes(patterns[p].toUpperCase())) return sheets[i];
    }
  }
  return null;
}

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  const str = String(val).trim();
  const matchMDY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchMDY) {
    let p1 = parseInt(matchMDY[1], 10);
    let p2 = parseInt(matchMDY[2], 10);
    let y = matchMDY[3];
    let month = p1 > 12 ? p2 : p1;
    let day = p1 > 12 ? p1 : p2;
    return y + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) return matchIso[0];
  return null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.round(val);
  const clean = String(val).replace(/[^0-9.-]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n);
}

function formatKabupaten(raw) {
  let clean = raw.replace(/^kab\.\s*/i, '').replace(/^kabupaten\s*/i, '').trim();
  clean = toTitleCase(clean);
  return 'Kab. ' + clean;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s|\/|-)\w/g, function(match) {
    return match.toUpperCase();
  });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// FUNGSI TESTING UNTUK EDITOR APPS SCRIPT (Klik 'Run' di testDoGet)
// ====================================================================
function testDoGet() {
  Logger.log("=== MEMULAI TEST TARIK DATA SPREADSHEET (LENGKAP) ===");
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Test Korban
  const sheetKorban = ss.getSheetByName("PENDUDUK TERDAMPAK & KORBAN") || ss.getSheets()[0];
  const korbanData = parseSheetKorban(sheetKorban);
  Logger.log("1. Tanggal Aktif: " + JSON.stringify(korbanData.daftar_tanggal));
  Logger.log("2. Total Summary Korban: " + JSON.stringify(korbanData.summary));

  // 2. Test Data Relawan
  Logger.log("=== MEMULAI TEST DATA RELAWAN (3 SHEET) ===");
  const relawanData = parseDataRelawanLengkap(ss);
  Logger.log("3. Summary Relawan: " + JSON.stringify(relawanData.summary));
  Logger.log("4. Registrasi Relawan Total: " + (relawanData.registrasi_relawan ? relawanData.registrasi_relawan.total_registrasi_kumulatif : 'N/A'));
  Logger.log("5. Relawan Tim Kategori: " + JSON.stringify(relawanData.relawan_berdasarkan_tim ? relawanData.relawan_berdasarkan_tim.kategori_tim : 'N/A'));
  Logger.log("6. Relawan Aktif Harian Terkini: " + (relawanData.relawan_aktif_harian ? relawanData.relawan_aktif_harian.total_aktif_terkini : 'N/A'));

  // 3. Test Data Upaya Bidang Kesehatan
  Logger.log("=== MEMULAI TEST DATA UPAYA BIDANG KESEHATAN ===");
  const upayaData = parseSheetUpayaKesehatan(ss);
  Logger.log("7. Summary Upaya Kesehatan: " + JSON.stringify(upayaData.summary));
  Logger.log("8. Total Upaya Terinput: " + upayaData.total);

  // 4. Test Full Endpoint Mock
  const mockResp = doGet({ parameter: { type: 'all' } });
  Logger.log("9. Status Output JSON Length: " + mockResp.getContent().length + " chars");
  Logger.log("=== TEST SELESAI DENGAN SUKSES ===");
}