<?php

require 'c:/laragon/www/sipkk-baru/vendor/autoload.php';

use Symfony\Component\Dotenv\Dotenv;
$dotenv = new Dotenv();
$dotenv->load('c:/laragon/www/sipkk-baru/.env');

require 'c:/laragon/www/sipkk-baru/vendor/yiisoft/yii2/Yii.php';
$config = require 'c:/laragon/www/sipkk-baru/_conf/console.php';
$app = new yii\console\Application($config);

$db = Yii::$app->db;

$exportDir = 'c:/laragon/www/sipkk-baru/dashboard-utama/public/data/export_faskes_ntt';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0777, true);
}

function cleanKabName($kab, $kode = '') {
    $kab = trim((string)$kab);
    if ($kode === '5302' || stripos($kab, 'Timor Tengah Selatan') !== false) return 'Kab. Timor Tengah Selatan';
    if ($kode === '5303' || stripos($kab, 'Timor Tengah Utara') !== false) return 'Kab. Timor Tengah Utara';
    if ($kode === '5301' || stripos($kab, 'Kupang') !== false && stripos($kab, 'Kota') === false) return 'Kab. Kupang';
    if ($kode === '5371' || stripos($kab, 'Kota Kupang') !== false) return 'Kota Kupang';
    if ($kab !== '' && stripos($kab, 'Kab') === false && stripos($kab, 'Kota') === false) {
        return 'Kab. ' . $kab;
    }
    if (strpos($kab, 'Kab ') === 0) {
        return 'Kab. ' . substr($kab, 4);
    }
    return $kab;
}

// 1. Export RS, Puskesmas, Klinik, Pustu
$faskesTables = [
    'Rumah Sakit' => 'tbl_rs_sarana',
    'Puskesmas'   => 'tbl_puskesmas_sarana',
    'Klinik'      => 'tbl_klinik_sarana',
    'Pustu'       => 'tbl_pustu_sarana',
];

$allFaskes = [];
$rekapPerKab = [];

foreach ($faskesTables as $jenis => $tbl) {
    $tableSchema = $db->getSchema()->getTableSchema($tbl);
    if (!$tableSchema) continue;
    $cols = $tableSchema->getColumnNames();
    
    $subjenisExpr = in_array('nama_subjenis', $cols) ? "COALESCE(nama_subjenis, '$jenis')" : (in_array('jenis_sarana_nama', $cols) ? "COALESCE(jenis_sarana_nama, '$jenis')" : "'$jenis'");
    $propCol = in_array('kode_prop', $cols) ? 'kode_prop' : 'kode_provinsi';
    $namaPropCol = in_array('nama_prop', $cols) ? 'nama_prop' : (in_array('nama_provinsi', $cols) ? 'nama_provinsi' : "'Nusa Tenggara Timur'");
    $kabCol = in_array('kode_kab', $cols) ? 'kode_kab' : (in_array('kode_kabkota', $cols) ? 'kode_kabkota' : "''");
    $namaKabCol = in_array('nama_kab', $cols) ? 'nama_kab' : (in_array('nama_kabkota', $cols) ? 'nama_kabkota' : "''");
    $kecCol = in_array('kode_kecamatan', $cols) ? 'kode_kecamatan' : "''";
    $namaKecCol = in_array('nama_kecamatan', $cols) ? 'nama_kecamatan' : "''";
    $telpCol = in_array('telp', $cols) ? 'telp' : "''";
    $emailCol = in_array('email', $cols) ? 'email' : "''";
    $webCol = in_array('website', $cols) ? 'website' : "''";
    $latCol = in_array('latitude', $cols) ? 'latitude' : "''";
    $lngCol = in_array('longitude', $cols) ? 'longitude' : "''";
    $alamatCol = in_array('alamat', $cols) ? 'alamat' : "''";
    $opCol = in_array('operasional', $cols) ? 'operasional' : '1';
    $aktifCol = in_array('status_aktif', $cols) ? 'status_aktif' : '1';
    $satusehatCol = in_array('kode_satusehat', $cols) ? 'kode_satusehat' : "''";
    $saranaCol = in_array('kode_sarana', $cols) ? 'kode_sarana' : "''";

    $sql = "
        SELECT 
            id,
            '$jenis' as jenis_faskes,
            $saranaCol as kode_sarana,
            $satusehatCol as kode_satusehat,
            nama,
            $subjenisExpr as subjenis,
            $alamatCol as alamat,
            $propCol as kode_prop,
            $namaPropCol as nama_prop,
            $kabCol as kode_kab,
            $namaKabCol as nama_kab,
            $kecCol as kode_kecamatan,
            $namaKecCol as nama_kecamatan,
            $latCol as latitude,
            $lngCol as longitude,
            $telpCol as telp,
            $emailCol as email,
            $webCol as website,
            $opCol as operasional,
            $aktifCol as status_aktif
        FROM $tbl 
        WHERE $propCol = '53' OR $propCol LIKE '53%'
        ORDER BY $kabCol, nama
    ";

    try {
        $rows = $db->createCommand($sql)->queryAll();
        foreach ($rows as $r) {
            $r['nama_kab'] = cleanKabName($r['nama_kab'], $r['kode_kab']);
            $allFaskes[] = $r;
            
            $kabKey = $r['kode_kab'] . ' - ' . $r['nama_kab'];
            if (!isset($rekapPerKab[$kabKey])) {
                $rekapPerKab[$kabKey] = [
                    'kode_kab' => $r['kode_kab'],
                    'nama_kab' => $r['nama_kab'],
                    'rs' => 0,
                    'puskesmas' => 0,
                    'klinik' => 0,
                    'pustu' => 0,
                    'posyandu' => 0,
                    'total_faskes' => 0
                ];
            }
            
            if ($jenis === 'Rumah Sakit') $rekapPerKab[$kabKey]['rs']++;
            if ($jenis === 'Puskesmas') $rekapPerKab[$kabKey]['puskesmas']++;
            if ($jenis === 'Klinik') $rekapPerKab[$kabKey]['klinik']++;
            if ($jenis === 'Pustu') $rekapPerKab[$kabKey]['pustu']++;
            $rekapPerKab[$kabKey]['total_faskes']++;
        }
        echo "Fetched $jenis: " . count($rows) . " rows\n";
    } catch (Exception $e) {
        echo "Error fetching $jenis: " . $e->getMessage() . PHP_EOL;
    }
}

// 2. Fetch Posyandu count per kab
try {
    $posSchema = $db->getSchema()->getTableSchema('tbl_posyandu_sarana');
    $posCols = $posSchema ? $posSchema->getColumnNames() : [];
    $pKabCol = in_array('kode_kab', $posCols) ? 'kode_kab' : (in_array('kode_kabkota', $posCols) ? 'kode_kabkota' : "''");
    $pNamaKabCol = in_array('nama_kab', $posCols) ? 'nama_kab' : (in_array('nama_kabkota', $posCols) ? 'nama_kabkota' : "''");
    $pPropCol = in_array('kode_prop', $posCols) ? 'kode_prop' : (in_array('kode_provinsi', $posCols) ? 'kode_provinsi' : "''");

    $posyanduRows = $db->createCommand("
        SELECT $pKabCol as kode_kab, $pNamaKabCol as nama_kab, COUNT(*) as jml 
        FROM tbl_posyandu_sarana 
        WHERE $pPropCol = '53' OR $pPropCol LIKE '53%'
        GROUP BY $pKabCol, $pNamaKabCol
    ")->queryAll();

    foreach ($posyanduRows as $pr) {
        $namaKabClean = cleanKabName($pr['nama_kab'], $pr['kode_kab']);
        $kabKey = $pr['kode_kab'] . ' - ' . $namaKabClean;
        if (isset($rekapPerKab[$kabKey])) {
            $rekapPerKab[$kabKey]['posyandu'] = (int)$pr['jml'];
        } else if ($kabKey !== '') {
            $rekapPerKab[$kabKey] = [
                'kode_kab' => $pr['kode_kab'],
                'nama_kab' => $namaKabClean,
                'rs' => 0,
                'puskesmas' => 0,
                'klinik' => 0,
                'pustu' => 0,
                'posyandu' => (int)$pr['jml'],
                'total_faskes' => 0
            ];
        }
    }
} catch (Exception $e) {
    echo "Posyandu query error: " . $e->getMessage() . PHP_EOL;
}

// Sort rekap by kode_kab
ksort($rekapPerKab);

// 3. Write CSV 1: All Faskes Utama (RS, Puskesmas, Klinik, Pustu) - 1.818 Rows
$csvFaskesFile = $exportDir . '/master_data_faskes_ntt_lengkap.csv';
$fp = fopen($csvFaskesFile, 'w');
fprintf($fp, chr(0xEF).chr(0xBB).chr(0xBF));

$header = [
    'No',
    'Jenis Faskes',
    'Kode Sarana / Faskes',
    'Kode SatuSehat Kemenkes',
    'Nama Fasilitas Kesehatan',
    'Kategori / Subjenis',
    'Alamat Lengkap',
    'Kode Provinsi',
    'Nama Provinsi',
    'Kode Kab/Kota',
    'Nama Kab/Kota',
    'Kode Kecamatan',
    'Nama Kecamatan',
    'Latitude',
    'Longitude',
    'No Telepon',
    'Email',
    'Website',
    'Status Operasional',
    'Status Aktif'
];
fputcsv($fp, $header, ';');

$no = 1;
foreach ($allFaskes as $r) {
    fputcsv($fp, [
        $no++,
        $r['jenis_faskes'],
        $r['kode_sarana'],
        $r['kode_satusehat'],
        $r['nama'],
        $r['subjenis'],
        $r['alamat'],
        $r['kode_prop'],
        $r['nama_prop'],
        $r['kode_kab'],
        $r['nama_kab'],
        $r['kode_kecamatan'],
        $r['nama_kecamatan'],
        $r['latitude'],
        $r['longitude'],
        $r['telp'],
        $r['email'],
        $r['website'],
        $r['operasional'] == 1 ? 'Operasional' : 'Non-Operasional',
        $r['status_aktif'] == 1 ? 'Aktif' : 'Non-Aktif'
    ], ';');
}
fclose($fp);
echo "Generated: $csvFaskesFile (Total: " . count($allFaskes) . " faskes)\n";

// 4. Write CSV 2: RS & Puskesmas Only (499 rows)
$csvRsPkmFile = $exportDir . '/master_data_faskes_ntt_rs_puskesmas.csv';
$fpRsPkm = fopen($csvRsPkmFile, 'w');
fprintf($fpRsPkm, chr(0xEF).chr(0xBB).chr(0xBF));
fputcsv($fpRsPkm, $header, ';');

$noRsPkm = 1;
foreach ($allFaskes as $r) {
    if (in_array($r['jenis_faskes'], ['Rumah Sakit', 'Puskesmas'])) {
        fputcsv($fpRsPkm, [
            $noRsPkm++,
            $r['jenis_faskes'],
            $r['kode_sarana'],
            $r['kode_satusehat'],
            $r['nama'],
            $r['subjenis'],
            $r['alamat'],
            $r['kode_prop'],
            $r['nama_prop'],
            $r['kode_kab'],
            $r['nama_kab'],
            $r['kode_kecamatan'],
            $r['nama_kecamatan'],
            $r['latitude'],
            $r['longitude'],
            $r['telp'],
            $r['email'],
            $r['website'],
            $r['operasional'] == 1 ? 'Operasional' : 'Non-Operasional',
            $r['status_aktif'] == 1 ? 'Aktif' : 'Non-Aktif'
        ], ';');
    }
}
fclose($fpRsPkm);
echo "Generated: $csvRsPkmFile\n";

// 5. Write CSV 3: Matriks Rekapitulasi per Kabupaten (22 Kab/Kota se-NTT)
$csvRekapFile = $exportDir . '/matriks_rekapitulasi_faskes_per_kabupaten_ntt.csv';
$fpRekap = fopen($csvRekapFile, 'w');
fprintf($fpRekap, chr(0xEF).chr(0xBB).chr(0xBF));

$headerRekap = [
    'No',
    'Kode Wilayah Kab/Kota',
    'Nama Kabupaten / Kota',
    'Rumah Sakit (RS)',
    'Puskesmas',
    'Klinik Pratama/Utama',
    'Puskesmas Pembantu (Pustu)',
    'Total Fasyankes',
    'Posyandu Terdata'
];
fputcsv($fpRekap, $headerRekap, ';');

$noRekap = 1;
$totRs = 0; $totPkm = 0; $totKlinik = 0; $totPustu = 0; $totAll = 0; $totPos = 0;

foreach ($rekapPerKab as $rk) {
    fputcsv($fpRekap, [
        $noRekap++,
        $rk['kode_kab'],
        $rk['nama_kab'],
        $rk['rs'],
        $rk['puskesmas'],
        $rk['klinik'],
        $rk['pustu'],
        $rk['total_faskes'],
        $rk['posyandu']
    ], ';');
    
    $totRs += $rk['rs'];
    $totPkm += $rk['puskesmas'];
    $totKlinik += $rk['klinik'];
    $totPustu += $rk['pustu'];
    $totAll += $rk['total_faskes'];
    $totPos += $rk['posyandu'];
}

// Baris Total
fputcsv($fpRekap, [
    'TOTAL',
    '53',
    'PROVINSI NUSA TENGGARA TIMUR',
    $totRs,
    $totPkm,
    $totKlinik,
    $totPustu,
    $totAll,
    $totPos
], ';');
fclose($fpRekap);
echo "Generated: $csvRekapFile\n";

// Copy also to root export directory for easy access
$rootExportDir = 'c:/laragon/www/sipkk-baru/export_faskes_ntt';
if (!is_dir($rootExportDir)) {
    mkdir($rootExportDir, 0777, true);
}
copy($csvFaskesFile, $rootExportDir . '/master_data_faskes_ntt_lengkap.csv');
copy($csvRsPkmFile, $rootExportDir . '/master_data_faskes_ntt_rs_puskesmas.csv');
copy($csvRekapFile, $rootExportDir . '/matriks_rekapitulasi_faskes_per_kabupaten_ntt.csv');

echo "Export completed successfully with normalized 22 regencies/cities in NTT!\n";
