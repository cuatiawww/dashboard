'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DetailKejadianPage from './DetailKejadianPage'

// Data Dasar Gempa NTT Terpadu (Menggabungkan Hasil Scraped Resmi ntt.tanggap-bencana.go.id & Master Layout DetailKejadianPage)
const BASE_NTT_GEMPA_EVENT = {
  id: 'EVT-NTT-2026-0819-01',
  kode_trans: 'EVT-NTT-2026-0819-01',
  nama: 'Gempa Bumi Tektonik Laut Flores - NTT (M 7.4)',
  nama_bencana: 'Gempa Bumi',
  jenis_bencana: 'Gempa Bumi',
  provinsi: 'NUSA TENGGARA TIMUR',
  kabupaten: 'FLORES TIMUR',
  kecamatan: 'Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
  waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA (M 7.4)',
  tgl_kejadian_riil: '2026-08-15 09:18:22',
  tgl_kejadian: '2026-08-15 09:18:22',
  tgl_laporan: '2026-08-20 10:20:14',
  latitude: -8.3421,
  longitude: 122.9814,
  status_bencana: 'Tanggap Darurat',
  keterangan: 'Gempa bumi tektonik dangkal berpusat di Laut Flores menggoncang Kepulauan Flores dan sekitarnya (Sikka, Manggarai Timur, Manggarai, Ngada, Nagekeo, Ende, Manggarai Barat). Sejumlah fasilitas pelayanan kesehatan dan rumah warga mengalami kerusakan struktural. Posko Klaster Kesehatan Dinkes Prov. NTT dan Kemenkes RI telah diaktivasi penuh.',
  
  // Parameter Seismisitas BMKG
  magnitudo: 7.4,
  kedalaman: 10,
  potensi_tsunami: 'Dinyatakan Berakhir (TEWS BMKG)',
  skala_mmi: 'VII - VIII MMI (Flores Timur, Alor, Sikka, Manggarai)',

  // Data Korban Scraped
  meninggal: 78,
  luka_berat: 331,
  luka_ringan: 639,
  luka: 970,
  hilang: 3,
  pengungsi: 43686,
  titik_pengungsian: 400,
  penduduk_terdampak: 1917732,

  detailData: {
    id: 'EVT-NTT-2026-0819-01',
    kode_trans: 'EVT-NTT-2026-0819-01',
    nama_bencana: 'Gempa Bumi',
    jenis_bencana: 'Gempa Bumi',
    provinsi: 'NUSA TENGGARA TIMUR',
    kabupaten: 'FLORES TIMUR',
    kecamatan: 'Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
    waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA (M 7.4)',
    tgl_kejadian_riil: '2026-08-15 09:18:22',
    tgl_kejadian: '2026-08-15 09:18:22',
    tgl_laporan: '2026-08-20 10:20:14',
    latitude: -8.3421,
    longitude: 122.9814,
    deskripsi: 'Gempa bumi tektonik dangkal berpusat di Laut Flores menggoncang wilayah NTT dengan intensitas VII - VIII MMI.',
    
    // Parameter Seismisitas
    magnitudo: 7.4,
    kedalaman: 10,
    potensi_tsunami: 'Dinyatakan Berakhir (TEWS BMKG)',
    tsunami: 'Dinyatakan Berakhir (TEWS BMKG)',
    skala_mmi: 'VII - VIII MMI (Flores Timur, Alor, Sikka, Manggarai)',
    status_tanggap_darurat: 'Tanggap Darurat (Level Provinsi & Nasional)',

    // Data Korban Scraped
    korban_meninggal: 78,
    korban_luka_berat: 331,
    korban_luka_ringan: 639,
    korban_luka: 970,
    korban_hilang: 3,
    pengungsi: 43686,
    titik_pengungsian: 400,
    populasi_terdampak: 1917732,
    meninggal: 78,
    luka_berat: 331,
    luka_ringan: 639,
    luka: 970,
    hilang: 3,
    penduduk_terdampak: 1917732,

    // Sebaran Titik Bencana (Lokasi Kecamatan di Kepulauan Flores NTT)
    lokasi: [
      { id: 'lok-1', kecamatan: 'Larantuka', kabupaten: 'Flores Timur', latitude: -8.3421, longitude: 122.9814, status: 'Episentrum Utama' },
      { id: 'lok-2', kecamatan: 'Alok', kabupaten: 'Sikka', latitude: -8.6225, longitude: 122.2156, status: 'Guncangan Kuat' },
      { id: 'lok-3', kecamatan: 'Borong', kabupaten: 'Manggarai Timur', latitude: -8.5833, longitude: 120.6167, status: 'Kerusakan Berat' },
      { id: 'lok-4', kecamatan: 'Langke Rembong', kabupaten: 'Manggarai', latitude: -8.6167, longitude: 120.4667, status: 'Kerusakan Berat' },
      { id: 'lok-5', kecamatan: 'Bajawa', kabupaten: 'Ngada', latitude: -8.7667, longitude: 120.9667, status: 'Guncangan Sedang' },
      { id: 'lok-6', kecamatan: 'Aesesa', kabupaten: 'Nagekeo', latitude: -8.6500, longitude: 121.2833, status: 'Guncangan Sedang' },
      { id: 'lok-7', kecamatan: 'Ende', kabupaten: 'Ende', latitude: -8.8433, longitude: 121.6625, status: 'Guncangan Sedang' },
      { id: 'lok-8', kecamatan: 'Komodo', kabupaten: 'Manggarai Barat', latitude: -8.5000, longitude: 119.8833, status: 'Guncangan Ringan' }
    ],

    // Faskes Terdampak (7 RSUD & Puskesmas Scraped)
    faskes_terdampak: [
      {
        id: 'faskes-1',
        nama: 'RSUD dr. TC Hillers Maumere',
        jenis: 'RS',
        kabupaten: 'Sikka',
        kecamatan: 'Alok',
        status: 'Beroperasi Sebagian',
        kondisi_bangunan: 'Rusak Ringan',
        latitude: -8.6241,
        longitude: 122.2198,
        triase_merah: 1,
        triase_kuning: 3,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 4,
        kapasitas_tersedia: 85,
        stok_darah: 'A: 12, B: 18, O: 24, AB: 6',
        listrik: 'Genset Cadangan Beroperasi',
        air_bersih: 'Truk Tangki PDAM Terpasang',
        telepon: '0382-21234'
      },
      {
        id: 'faskes-2',
        nama: 'RSUD Borong',
        jenis: 'RS',
        kabupaten: 'Manggarai Timur',
        kecamatan: 'Borong',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Rusak Sedang',
        latitude: -8.5912,
        longitude: 120.6245,
        triase_merah: 12,
        triase_kuning: 17,
        triase_hijau: 8,
        triase_hitam: 1,
        total_pasien: 38,
        kapasitas_tersedia: 40,
        stok_darah: 'A: 5, B: 8, O: 14, AB: 2',
        listrik: 'PLN & Genset 100 kVA',
        air_bersih: 'Tandon Darurat Dinkes',
        telepon: '0385-22110'
      },
      {
        id: 'faskes-3',
        nama: 'RSUD dr. Ben Mboi Ruteng',
        jenis: 'RS',
        kabupaten: 'Manggarai',
        kecamatan: 'Langke Rembong',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Utuh / Siap Rujukan',
        latitude: -8.6189,
        longitude: 120.4682,
        triase_merah: 2,
        triase_kuning: 8,
        triase_hijau: 1,
        triase_hitam: 0,
        total_pasien: 11,
        kapasitas_tersedia: 110,
        stok_darah: 'A: 20, B: 25, O: 35, AB: 10',
        listrik: 'Stabil (PLN Normal)',
        air_bersih: 'Normal',
        telepon: '0385-21345'
      },
      {
        id: 'faskes-4',
        nama: 'RSUD Bajawa',
        jenis: 'RS',
        kabupaten: 'Ngada',
        kecamatan: 'Bajawa',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Utuh / Siaga',
        latitude: -8.7712,
        longitude: 120.9715,
        triase_merah: 0,
        triase_kuning: 3,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 3,
        kapasitas_tersedia: 60,
        stok_darah: 'A: 10, B: 12, O: 18, AB: 4',
        listrik: 'Normal',
        air_bersih: 'Normal',
        telepon: '0384-21118'
      },
      {
        id: 'faskes-5',
        nama: 'RSUD Aeramo',
        jenis: 'RS',
        kabupaten: 'Nagekeo',
        kecamatan: 'Aesesa',
        status: 'Beroperasi Sebagian',
        kondisi_bangunan: 'Rusak Ringan',
        latitude: -8.6542,
        longitude: 121.2885,
        triase_merah: 3,
        triase_kuning: 2,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 5,
        kapasitas_tersedia: 35,
        stok_darah: 'A: 4, B: 6, O: 10, AB: 1',
        listrik: 'Genset',
        air_bersih: 'Tangki Darurat',
        telepon: '0384-22234'
      },
      {
        id: 'faskes-6',
        nama: 'RSUD Ende',
        jenis: 'RS',
        kabupaten: 'Ende',
        kecamatan: 'Ende Selatan',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Utuh',
        latitude: -8.8475,
        longitude: 121.6689,
        triase_merah: 1,
        triase_kuning: 7,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 8,
        kapasitas_tersedia: 90,
        stok_darah: 'A: 15, B: 20, O: 30, AB: 8',
        listrik: 'Normal',
        air_bersih: 'Normal',
        telepon: '0381-21010'
      },
      {
        id: 'faskes-7',
        nama: 'RSUD Komodo Labuan Bajo',
        jenis: 'RS',
        kabupaten: 'Manggarai Barat',
        kecamatan: 'Komodo',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Utuh / Pusat Evakuasi',
        latitude: -8.5065,
        longitude: 119.8912,
        triase_merah: 0,
        triase_kuning: 9,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 9,
        kapasitas_tersedia: 75,
        stok_darah: 'A: 18, B: 22, O: 28, AB: 7',
        listrik: 'Normal',
        air_bersih: 'Normal',
        telepon: '0385-41222'
      },
      {
        id: 'pkm-1',
        nama: 'Puskesmas Dampek',
        jenis: 'Puskesmas',
        kabupaten: 'Manggarai Timur',
        kecamatan: 'Lamba Leda Utara',
        status: 'Tenda Darurat',
        kondisi_bangunan: 'Rusak Sedang',
        latitude: -8.4520,
        longitude: 120.6120,
        triase_merah: 8,
        triase_kuning: 24,
        triase_hijau: 92,
        triase_hitam: 0,
        total_pasien: 124,
        kapasitas_tersedia: 15,
        listrik: 'Genset Portabel',
        air_bersih: 'Tandon 2000L',
        telepon: '0812-3456-7890'
      },
      {
        id: 'pkm-2',
        nama: 'Puskesmas Reo',
        jenis: 'Puskesmas',
        kabupaten: 'Manggarai',
        kecamatan: 'Reok',
        status: 'Beroperasi Penuh',
        kondisi_bangunan: 'Rusak Ringan',
        latitude: -8.3180,
        longitude: 120.4560,
        triase_merah: 0,
        triase_kuning: 2,
        triase_hijau: 36,
        triase_hitam: 0,
        total_pasien: 38,
        kapasitas_tersedia: 20,
        listrik: 'PLN Normal',
        air_bersih: 'Normal',
        telepon: '0813-4455-6677'
      }
    ],

    // Faskes Terdekat Siaga Rujukan (Mix & Match Long-Lat Kecamatan & Master Data Dokter PJ)
    faskes_terdekat: [
      {
        id: 'f-1',
        nama: 'RSUD dr. TC Hillers Maumere',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Sikka',
        kecamatan: 'Alok',
        desa: 'Kota Uneng',
        petugas: 'dr. Clara Silvia, Sp.B (PJ IGD & Bedah)',
        latitude: -8.6241,
        longitude: 122.2198,
        jarak: 14.2,
        waktu_tempuh: 25,
        operasional: 'Beroperasi Sebagian',
        tt_tersedia: 85,
        dokter: 14,
        perawat: 48,
        ambulans: 3,
        telepon: '0382-21234',
        triase_merah: 1,
        triase_kuning: 3,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 4
      },
      {
        id: 'f-2',
        nama: 'RSUD Borong',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Manggarai Timur',
        kecamatan: 'Borong',
        desa: 'Golo Lada',
        petugas: 'dr. Antonius Riberu, Sp.B (PJ Bedah Trauma)',
        latitude: -8.5912,
        longitude: 120.6245,
        jarak: 18.5,
        waktu_tempuh: 30,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 40,
        dokter: 8,
        perawat: 32,
        ambulans: 2,
        telepon: '0385-22110',
        triase_merah: 12,
        triase_kuning: 17,
        triase_hijau: 8,
        triase_hitam: 1,
        total_pasien: 38
      },
      {
        id: 'f-3',
        nama: 'RSUD dr. Ben Mboi Ruteng',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Manggarai',
        kecamatan: 'Langke Rembong',
        desa: 'Watu',
        petugas: 'dr. Ferdinandus Ben, Sp.A (PJ Trauma Center)',
        latitude: -8.6189,
        longitude: 120.4682,
        jarak: 22.0,
        waktu_tempuh: 38,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 110,
        dokter: 22,
        perawat: 75,
        ambulans: 5,
        telepon: '0385-21345',
        triase_merah: 2,
        triase_kuning: 8,
        triase_hijau: 1,
        triase_hitam: 0,
        total_pasien: 11
      },
      {
        id: 'f-4',
        nama: 'RSUD Bajawa',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Ngada',
        kecamatan: 'Bajawa',
        desa: 'Trikora',
        petugas: 'dr. Maria Goreti, Sp.An (PJ Tim Siaga Krisis)',
        latitude: -8.7712,
        longitude: 120.9715,
        jarak: 35.8,
        waktu_tempuh: 55,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 60,
        dokter: 10,
        perawat: 38,
        ambulans: 2,
        telepon: '0384-21118',
        triase_merah: 0,
        triase_kuning: 3,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 3
      },
      {
        id: 'f-5',
        nama: 'RSUD Aeramo',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Nagekeo',
        kecamatan: 'Aesesa',
        desa: 'Aeramo',
        petugas: 'dr. Yohanes Klau, Sp.PD (PJ Triase Darurat)',
        latitude: -8.6542,
        longitude: 121.2885,
        jarak: 28.4,
        waktu_tempuh: 45,
        operasional: 'Beroperasi Sebagian',
        tt_tersedia: 35,
        dokter: 6,
        perawat: 24,
        ambulans: 2,
        telepon: '0384-22234',
        triase_merah: 3,
        triase_kuning: 2,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 5
      },
      {
        id: 'f-6',
        nama: 'RSUD Ende',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Ende',
        kecamatan: 'Ende Selatan',
        desa: 'Rukun Lima',
        petugas: 'dr. Stefanus Lado, Sp.OT (PJ Orthopedi & Trauma)',
        latitude: -8.8475,
        longitude: 121.6689,
        jarak: 42.0,
        waktu_tempuh: 65,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 90,
        dokter: 18,
        perawat: 62,
        ambulans: 4,
        telepon: '0381-21010',
        triase_merah: 1,
        triase_kuning: 7,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 8
      },
      {
        id: 'f-7',
        nama: 'RSUD Komodo Labuan Bajo',
        jenis: 'Rumah Sakit (RSUD)',
        tipe: 'Rumah Sakit',
        kabupaten: 'Manggarai Barat',
        kecamatan: 'Komodo',
        desa: 'Batu Cermin',
        petugas: 'dr. Fransiskus Xaverius, Sp.B (PJ Rujukan Udara/Laut)',
        latitude: -8.5065,
        longitude: 119.8912,
        jarak: 65.0,
        waktu_tempuh: 95,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 75,
        dokter: 16,
        perawat: 54,
        ambulans: 3,
        telepon: '0385-41222',
        triase_merah: 0,
        triase_kuning: 9,
        triase_hijau: 0,
        triase_hitam: 0,
        total_pasien: 9
      },
      {
        id: 'f-8',
        nama: 'Puskesmas Dampek',
        jenis: 'Puskesmas',
        tipe: 'Puskesmas',
        kabupaten: 'Manggarai Timur',
        kecamatan: 'Lamba Leda Utara',
        desa: 'Dampek',
        petugas: 'dr. Ignasius Danga (PJ Layanan Primer)',
        latitude: -8.4520,
        longitude: 120.6120,
        jarak: 8.5,
        waktu_tempuh: 15,
        operasional: 'Tenda Darurat',
        tt_tersedia: 15,
        dokter: 2,
        perawat: 12,
        ambulans: 1,
        telepon: '0812-3456-7890',
        triase_merah: 3,
        triase_kuning: 12,
        triase_hijau: 20,
        triase_hitam: 12,
        total_pasien: 47
      },
      {
        id: 'f-9',
        nama: 'Puskesmas Reo',
        jenis: 'Puskesmas',
        tipe: 'Puskesmas',
        kabupaten: 'Manggarai',
        kecamatan: 'Reok',
        desa: 'Reo',
        petugas: 'dr. Yosephina Nau (PJ Layanan Primer)',
        latitude: -8.3180,
        longitude: 120.4560,
        jarak: 12.0,
        waktu_tempuh: 20,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 20,
        dokter: 3,
        perawat: 15,
        ambulans: 1,
        telepon: '0813-4455-6677',
        triase_merah: 9,
        triase_kuning: 24,
        triase_hijau: 60,
        triase_hitam: 15,
        total_pasien: 108
      },
      {
        id: 'f-10',
        nama: 'Puskesmas Pagal',
        jenis: 'Puskesmas',
        tipe: 'Puskesmas',
        kabupaten: 'Manggarai',
        kecamatan: 'Cibal',
        desa: 'Pagal',
        petugas: 'dr. Kornelis Boro (PJ Medis Darurat)',
        latitude: -8.5210,
        longitude: 120.4850,
        jarak: 16.5,
        waktu_tempuh: 28,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 18,
        dokter: 2,
        perawat: 14,
        ambulans: 1,
        telepon: '0812-8899-1122',
        triase_merah: 3,
        triase_kuning: 3,
        triase_hijau: 0,
        triase_hitam: 1,
        total_pasien: 7
      },
      {
        id: 'f-11',
        nama: 'Puskesmas Boawae',
        jenis: 'Puskesmas',
        tipe: 'Puskesmas',
        kabupaten: 'Nagekeo',
        kecamatan: 'Boawae',
        desa: 'Rateno',
        petugas: 'dr. Gregorius Bima (PJ Posko Kesehatan)',
        latitude: -8.7450,
        longitude: 121.2150,
        jarak: 24.5,
        waktu_tempuh: 38,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 22,
        dokter: 3,
        perawat: 16,
        ambulans: 1,
        telepon: '0813-1122-3344',
        triase_merah: 1,
        triase_kuning: 2,
        triase_hijau: 8,
        triase_hitam: 0,
        total_pasien: 11
      },
      {
        id: 'f-12',
        nama: 'Puskesmas Waigete',
        jenis: 'Puskesmas',
        tipe: 'Puskesmas',
        kabupaten: 'Sikka',
        kecamatan: 'Waigete',
        desa: 'Egon',
        petugas: 'dr. Maria Angela (PJ Puskesmas Siaga)',
        latitude: -8.6350,
        longitude: 122.3600,
        jarak: 15.0,
        waktu_tempuh: 25,
        operasional: 'Beroperasi Penuh',
        tt_tersedia: 20,
        dokter: 2,
        perawat: 12,
        ambulans: 1,
        telepon: '0812-3344-5566',
        triase_merah: 0,
        triase_kuning: 0,
        triase_hijau: 1,
        triase_hitam: 0,
        total_pasien: 1
      }
    ],

    // Pos Pengungsian & Pos Kesehatan (Mix & Match Long-Lat Kecamatan)
    pos_pengungsi: [
      {
        id: 'posko-1',
        nama: 'Posko Terpadu Lapangan Borong',
        jenis_pos: 'Pos Kesehatan & Pengungsian',
        kabupaten: 'Manggarai Timur',
        kecamatan: 'Borong',
        lokasi_spesifik: 'Lapangan Sepak Bola Borong',
        jumlah_jiwa: 19330,
        jumlah_kk: 4830,
        jarak: 18.5,
        waktu_tempuh: 30,
        kelompok_rentan: { balita: 1220, ibu_hamil: 245, lansia: 940, disabilitas: 58 },
        fasilitas_kesehatan: 'Poskes Tenda EMT Tipe 1 + 3 Dokter Umum + 8 Perawat',
        sanitasi_air: '12 Toilet Portable, 4 Tandon Air 5000L, Distribusi Air Bersih Harian',
        status_kebutuhan: 'Kebutuhan Mendesak: Selimut, MPASI Balita, Obat Kulit, Vitamin',
        latitude: -8.5875,
        longitude: 120.6190
      },
      {
        id: 'posko-2',
        nama: 'Posko Pengungsian GOR Ruteng',
        jenis_pos: 'Pos Pengungsian',
        kabupaten: 'Manggarai',
        kecamatan: 'Langke Rembong',
        lokasi_spesifik: 'Kompleks GOR Ruteng',
        jumlah_jiwa: 10083,
        jumlah_kk: 2520,
        jarak: 22.0,
        waktu_tempuh: 38,
        kelompok_rentan: { balita: 680, ibu_hamil: 122, lansia: 480, disabilitas: 34 },
        fasilitas_kesehatan: 'Poskes Lapangan Dinkes Manggarai + Ambulans Standby',
        sanitasi_air: 'MCK Gedung GOR + 6 Toilet Tambahan, Air Bersih PDAM Lancar',
        status_kebutuhan: 'Cukup, Monitoring Rutin Penyakit Menular (ISPA, Diare)',
        latitude: -8.6210,
        longitude: 120.4720
      },
      {
        id: 'posko-3',
        nama: 'Posko Kantor Camat Aesesa',
        jenis_pos: 'Pos Kesehatan & Pengungsian',
        kabupaten: 'Nagekeo',
        kecamatan: 'Aesesa',
        lokasi_spesifik: 'Halaman Kantor Camat',
        jumlah_jiwa: 6221,
        jumlah_kk: 1555,
        jarak: 28.4,
        waktu_tempuh: 45,
        kelompok_rentan: { balita: 410, ibu_hamil: 84, lansia: 310, disabilitas: 22 },
        fasilitas_kesehatan: 'Tim Medis Puskesmas Danga + TCK Kemenkes',
        sanitasi_air: 'Tandon Air Siap Minum + Tangki BPBD',
        status_kebutuhan: 'Perlu Tambahan Makanan Tambahan Balita & Selimut',
        latitude: -8.6520,
        longitude: 121.2850
      },
      {
        id: 'posko-4',
        nama: 'Posko Lapangan Egon Sikka',
        jenis_pos: 'Pos Pengungsian',
        kabupaten: 'Sikka',
        kecamatan: 'Waigete',
        lokasi_spesifik: 'Lapangan Sepak Bola Waigete',
        jumlah_jiwa: 1972,
        jumlah_kk: 490,
        jarak: 15.0,
        waktu_tempuh: 25,
        kelompok_rentan: { balita: 140, ibu_hamil: 28, lansia: 95, disabilitas: 12 },
        fasilitas_kesehatan: 'Poskes Puskesmas Waigete',
        sanitasi_air: 'Tandon Darurat Dinkes',
        status_kebutuhan: 'Tenda Keluarga & Matras Tambahan',
        latitude: -8.6350,
        longitude: 122.3600
      }
    ],

    // Logistik & Obat-Obatan
    logistik: [
      { kategori: 'Obat & Bahan Medis Habis Pakai', nama_barang: 'Emergency Trauma Kit & Perban Elastis', jumlah: 450, satuan: 'Set', status: 'Tersedia di Gudang Farmasi Dinkes' },
      { kategori: 'Obat & Bahan Medis Habis Pakai', nama_barang: 'Cairan Infus RL & NaCl 0.9%', jumlah: 2800, satuan: 'Kolf', status: 'Terdistribusi ke RSUD & Puskesmas' },
      { kategori: 'Obat & Bahan Medis Habis Pakai', nama_barang: 'Antibiotik, Analgetik & Anti-Tetanus (ATS)', jumlah: 1500, satuan: 'Vial/Box', status: 'Tersedia' },
      { kategori: 'Fasilitas Darurat', nama_barang: 'Tenda Rumah Sakit Lapangan (Hospital Tent)', jumlah: 8, satuan: 'Unit', status: 'Terpasang di RSUD Borong & Dampek' },
      { kategori: 'Fasilitas Darurat', nama_barang: 'Genset Mobile Silent 10-25 kVA', jumlah: 6, satuan: 'Unit', status: 'Operasional di Faskes Terdampak' },
      { kategori: 'Kantung Darah', nama_barang: 'Kantung Darah Golongan A, B, O, AB (PMI NTT)', jumlah: 350, satuan: 'Kantong', status: 'Didistribusikan ke BDRS' }
    ],

    // Tenaga Cadangan Kesehatan (TCK)
    tck: [
      { id: 'tck-1', nama: 'dr. Antonius Riberu, Sp.B', profesi: 'Dokter Spesialis Bedah', institusi: 'RSUP Dr. Wahidin Sudirohusodo / Kemenkes', penugasan: 'RSUD Borong (Operasi Trauma Akut)' },
      { id: 'tck-2', nama: 'dr. Maria Goreti, Sp.An', profesi: 'Dokter Spesialis Anestesi', institusi: 'RSUP Prof. Ngoerah Denpasar', penugasan: 'RSUD Borong' },
      { id: 'tck-3', nama: 'Ns. Kornelis Boro, S.Kep', profesi: 'Perawat Gawat Darurat (EMT)', institusi: 'Klaster Kesehatan Dinkes Prov. NTT', penugasan: 'Posko Lapangan Borong' },
      { id: 'tck-4', nama: 'dr. Yohanes Klau', profesi: 'Dokter Umum EMT', institusi: 'Dinkes Kab. Manggarai', penugasan: 'Puskesmas Dampek' },
      { id: 'tck-5', nama: 'Yosefina Nau, S.Tr.KL', profesi: 'Sanitarian & Kesling', institusi: 'BBTKLPP Surabaya', penugasan: 'Pengawasan Kualitas Air Seluruh Posko' }
    ]
  }
}

export default function ProvNttBencanaPage() {
  const router = useRouter()
  const [eventData, setEventData] = useState<any>(BASE_NTT_GEMPA_EVENT)
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-21')
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string; phase: string }>>([
    { date: '2026-08-20', label: '20 Agustus 2026', phase: 'Hari-H Kejadian Gempa M6.4' },
    { date: '2026-08-21', label: '21 Agustus 2026', phase: 'Tanggap Darurat H+1 (Update Terkini)' },
  ])
  const [isLoadingDate, setIsLoadingDate] = useState<boolean>(false)

  // Ambil data real-time dari API resmi collector (/dashboard-eoc/api/ntt-data)
  const loadCollectorData = async (targetDate: string) => {
    setIsLoadingDate(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const url = targetDate ? `${basePath}/api/ntt-data?tanggal=${targetDate}` : `${basePath}/api/ntt-data`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          let tot: any = {}
          let tgl = json.tanggal || targetDate || ''

          if (json.tables?.situasi_kesehatan && Array.isArray(json.tables.situasi_kesehatan) && json.tables.situasi_kesehatan.length > 0) {
            const rows = json.tables.situasi_kesehatan
            let sm = 0, slb = 0, slr = 0, sp = 0, stp = 0, sterdampak = 0
            rows.forEach((r: any) => {
              sm += Number(r.meninggal || r.korban_meninggal || 0)
              slb += Number(r.luka_berat || r.korban_luka_berat || 0)
              slr += Number(r.luka_ringan || r.korban_luka_ringan || 0)
              sp += Number(r.pengungsi || r.jumlah_pengungsi || 0)
              stp += Number(r.titik_pengungsian || 0)
              sterdampak += Number(r.populasi_terdampak || r.penduduk_terdampak || 0)
            })
            tot = {
              meninggal: sm,
              luka_berat: slb,
              luka_ringan: slr,
              total_luka: slb + slr,
              pengungsi: sp,
              titik_pengungsian: stp,
              populasi_terdampak: sterdampak
            }
          } else if (json.tables?.analisa_ringkasan_harian) {
            const rows = json.tables.analisa_ringkasan_harian
            const lastRow = rows[rows.length - 1] || {}
            tot = {
              meninggal: Number(lastRow.meninggal || lastRow.korban_meninggal || 0),
              luka_berat: Number(lastRow.luka_berat || lastRow.korban_luka_berat || 0),
              luka_ringan: Number(lastRow.luka_ringan || lastRow.korban_luka_ringan || 0),
              total_luka: Number(lastRow.total_luka || lastRow.luka || 0),
              pengungsi: Number(lastRow.pengungsi || lastRow.jumlah_pengungsi || 0),
              titik_pengungsian: Number(lastRow.titik_pengungsian || 0),
              populasi_terdampak: Number(lastRow.populasi_terdampak || lastRow.penduduk_terdampak || 0)
            }
          } else if (json.data) {
            tot = json.data.total_ringkasan || json.data
            tgl = json.data.tanggal_update || tgl
          }
          
          const updateTimestamp = json.updated_at || (tgl ? `${tgl} 10:20:14` : null)
          setEventData((prev: any) => ({
            ...prev,
            tgl_kejadian: tgl ? `${tgl} 10:20:14` : prev.tgl_kejadian,
            tgl_laporan: updateTimestamp || prev.tgl_laporan,
            updated_at: updateTimestamp,
            meninggal: tot.meninggal ?? prev.meninggal,
            luka_berat: tot.luka_berat ?? prev.luka_berat,
            luka_ringan: tot.luka_ringan ?? prev.luka_ringan,
            luka: tot.total_luka ?? prev.luka,
            pengungsi: tot.pengungsi ?? prev.pengungsi,
            titik_pengungsian: tot.titik_pengungsian ?? prev.titik_pengungsian,
            penduduk_terdampak: tot.populasi_terdampak ?? prev.penduduk_terdampak,
            detailData: {
              ...prev.detailData,
              tgl_kejadian: tgl ? `${tgl} 10:20:14` : prev.detailData.tgl_kejadian,
              tgl_laporan: updateTimestamp || prev.detailData.tgl_laporan,
              updated_at: updateTimestamp,
              korban_meninggal: tot.meninggal ?? prev.detailData.korban_meninggal,
              korban_luka_berat: tot.luka_berat ?? prev.detailData.korban_luka_berat,
              korban_luka_ringan: tot.luka_ringan ?? prev.detailData.korban_luka_ringan,
              korban_luka: tot.total_luka ?? prev.detailData.korban_luka,
              pengungsi: tot.pengungsi ?? prev.detailData.pengungsi,
              titik_pengungsian: tot.titik_pengungsian ?? prev.detailData.titik_pengungsian,
              populasi_terdampak: tot.populasi_terdampak ?? prev.detailData.populasi_terdampak,
              meninggal: tot.meninggal ?? prev.detailData.meninggal,
              luka_berat: tot.luka_berat ?? prev.detailData.luka_berat,
              luka_ringan: tot.luka_ringan ?? prev.detailData.luka_ringan,
              luka: tot.total_luka ?? prev.detailData.luka,
              penduduk_terdampak: tot.populasi_terdampak ?? prev.detailData.penduduk_terdampak,
            }
          }))
        }
      }
    } catch (e) {
      console.warn('Using base NTT dataset:', e)
    } finally {
      setIsLoadingDate(false)
    }
  }

  useEffect(() => {
    loadCollectorData(selectedDate)
    const interval = setInterval(() => {
      loadCollectorData(selectedDate)
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedDate])

  return (
    <div className="w-full">
      <DetailKejadianPage
        selectedEvent={eventData}
        onBack={() => router.push('/')}
      />
    </div>
  )
}
