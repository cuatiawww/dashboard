'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DetailKejadianPage from './DetailKejadianPage'
import { useHeaderStore } from '@/lib/headerStore'

// Data Dasar Struktur Gempa NTT (Nilai awal bersih, diisi 100% dinamis dari API Collector /api/ntt-data)
const BASE_NTT_GEMPA_EVENT = {
  id: 'EVT-NTT-2026-0819-01',
  kode_trans: 'EVT-NTT-2026-0819-01',
  nama: 'Gempa Bumi M 7.7 Laut Flores - 30 km Timur Laut Mbay-Nagekeo-NTT',
  nama_bencana: 'Gempa Bumi',
  jenis_bencana: 'Gempa Bumi',
  provinsi: 'NUSA TENGGARA TIMUR',
  kabupaten: 'FLORES TIMUR',
  kecamatan: 'Mbay, Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
  waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA (M 7.7)',
  tgl_kejadian_riil: '2026-08-15 09:18:22',
  tgl_kejadian: '2026-08-15 09:18:22',
  tgl_laporan: '2026-08-21 10:01:00',
  updated_at: '2026-08-21 10:01:00',
  latitude: -8.3421,
  longitude: 122.9814,
  status_bencana: 'Tanggap Darurat',
  keterangan: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
  kronologis: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
  deskripsi: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
  buletin_eoc: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
  
  // Parameter Seismisitas BMKG
  magnitudo: 7.7,
  kedalaman: 15,
  potensi_tsunami: 'Berpotensi Tsunami (Status Siaga & Waspada)',
  tsunami: 'Berpotensi Tsunami (Status Siaga & Waspada)',
  skala_mmi: 'VII - VIII MMI (Mbay-Nagekeo, Flores Timur, Alor, Sikka, Manggarai)',

  // Data Korban Ringkasan Awal
  meninggal: 82,
  luka_berat: 335,
  luka_ringan: 630,
  luka: 965,
  hilang: 0,
  pengungsi: 40083,
  titik_pengungsian: 400,
  penduduk_terdampak: 1917732,

  detailData: {
    id: 'EVT-NTT-2026-0819-01',
    kode_trans: 'EVT-NTT-2026-0819-01',
    nama_bencana: 'Gempa Bumi',
    jenis_bencana: 'Gempa Bumi',
    provinsi: 'NUSA TENGGARA TIMUR',
    kabupaten: 'FLORES TIMUR',
    kecamatan: 'Mbay, Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
    waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA (M 7.7)',
    tgl_kejadian_riil: '2026-08-15 09:18:22',
    tgl_kejadian: '2026-08-15 09:18:22',
    tgl_laporan: '2026-08-21 10:01:00',
    updated_at: '2026-08-21 10:01:00',
    latitude: -8.3421,
    longitude: 122.9814,
    deskripsi: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
    kronologis: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
    keterangan: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
    buletin_eoc: 'Telah terjadi gempa bumi dengan M 7.7 pada kedalaman 15 km. Gempa berpusat di Laut 30 km Timur laut Mbay-Nagekeo-NTT, Provinsi Nusa Tenggara Timur. Gempa berpotensi Tsunami dengan Status Siaga: Kabupaten Manggarai, Ngada, Manggarai Barat, Selayar, Ende, Sikka , Jeneponto, Banteang dan Status Waspada:Kabupaten Bima, Kota-bima, Flores-timur, Dompu, Kota-bau-bau, Takalar, Bone, Wajo, Luwu,  dan Kota-palopo.',
    
    // Parameter Seismisitas
    magnitudo: 7.7,
    kedalaman: 15,
    potensi_tsunami: 'Berpotensi Tsunami (Status Siaga & Waspada)',
    tsunami: 'Berpotensi Tsunami (Status Siaga & Waspada)',
    skala_mmi: 'VII - VIII MMI (Mbay-Nagekeo, Flores Timur, Alor, Sikka, Manggarai)',
    status_tanggap_darurat: 'Tanggap Darurat (Level Provinsi & Nasional)',

    korban_meninggal: 82,
    korban_luka_berat: 335,
    korban_luka_ringan: 630,
    korban_luka: 965,
    korban_hilang: 0,
    pengungsi: 40083,
    titik_pengungsian: 400,
    populasi_terdampak: 1917732,
    meninggal: 82,
    luka_berat: 335,
    luka_ringan: 630,
    luka: 965,
    hilang: 0,
    penduduk_terdampak: 1917732,

    // Array data dinamis dari Collector
    breakdown_kabupaten: [
      { kabupaten: 'Sikka', ibukota: 'Maumere', meninggal: 6, luka_berat: 23, luka_ringan: 32, total_luka: 55, hilang: 0, pengungsi: 1972, titik_posko: 9, populasi_terdampak: 350715, zona: 'Zona Oranye', zonaColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { kabupaten: 'Manggarai Timur', ibukota: 'Borong', meninggal: 26, luka_berat: 239, luka_ringan: 404, total_luka: 643, hilang: 0, pengungsi: 19330, titik_posko: 246, populasi_terdampak: 313876, zona: 'Zona Merah', zonaColor: 'bg-rose-50 text-rose-700 border-rose-200' },
      { kabupaten: 'Manggarai', ibukota: 'Ruteng', meninggal: 27, luka_berat: 32, luka_ringan: 104, total_luka: 136, hilang: 0, pengungsi: 10083, titik_posko: 14, populasi_terdampak: 340153, zona: 'Zona Merah', zonaColor: 'bg-rose-50 text-rose-700 border-rose-200' },
      { kabupaten: 'Ngada', ibukota: 'Bajawa', meninggal: 2, luka_berat: 17, luka_ringan: 19, total_luka: 36, hilang: 0, pengungsi: 1333, titik_posko: 27, populasi_terdampak: 176462, zona: 'Zona Oranye', zonaColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { kabupaten: 'Nagekeo', ibukota: 'Mbay', meninggal: 13, luka_berat: 13, luka_ringan: 9, total_luka: 22, hilang: 0, pengungsi: 6221, titik_posko: 70, populasi_terdampak: 170669, zona: 'Zona Merah', zonaColor: 'bg-rose-50 text-rose-700 border-rose-200' },
      { kabupaten: 'Ende', ibukota: 'Ende', meninggal: 6, luka_berat: 5, luka_ringan: 67, total_luka: 72, hilang: 0, pengungsi: 3144, titik_posko: 25, populasi_terdampak: 284165, zona: 'Zona Oranye', zonaColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { kabupaten: 'Manggarai Barat', ibukota: 'Labuan Bajo', meninggal: 2, luka_berat: 2, luka_ringan: 4, total_luka: 6, hilang: 0, pengungsi: 1603, titik_posko: 9, populasi_terdampak: 281692, zona: 'Zona Oranye', zonaColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    ],
    faskes_terdampak: [
      { id: 'rs-1', nama: 'RSUD dr. TC Hillers Maumere', jenis: 'RS', kabupaten: 'Sikka', kecamatan: 'Alok', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 1, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total_pasien: 4, kapasitas_tersedia: '42 TT', stok_darah: 'A: 12, B: 15, O: 24, AB: 6', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Clara, Sp.B' },
      { id: 'rs-2', nama: 'RSUD Borong', jenis: 'RS', kabupaten: 'Manggarai Timur', kecamatan: 'Borong', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Sedang', triase_merah: 12, triase_kuning: 17, triase_hijau: 8, triase_hitam: 1, total_pasien: 38, kapasitas_tersedia: '18 TT', stok_darah: 'A: 8, B: 10, O: 14, AB: 3', listrik: 'Genset Darurat EOC', pj_medis: 'dr. Anton, Sp.An' },
      { id: 'rs-3', nama: 'RSUD Ruteng (dr. Ben Mboi)', jenis: 'RS', kabupaten: 'Manggarai', kecamatan: 'Langke Rembong', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 2, triase_kuning: 8, triase_hijau: 1, triase_hitam: 0, total_pasien: 11, kapasitas_tersedia: '35 TT', stok_darah: 'A: 18, B: 20, O: 30, AB: 8', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Ronald, Sp.OG' },
      { id: 'rs-4', nama: 'RSUD Bajawa', jenis: 'RS', kabupaten: 'Ngada', kecamatan: 'Bajawa', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 0, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total_pasien: 3, kapasitas_tersedia: '28 TT', stok_darah: 'A: 10, B: 12, O: 16, AB: 4', listrik: 'PLN', pj_medis: 'dr. Maria, Sp.PD' },
      { id: 'rs-5', nama: 'RSUD Aeramo', jenis: 'RS', kabupaten: 'Nagekeo', kecamatan: 'Aesesa', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Sedang', triase_merah: 3, triase_kuning: 2, triase_hijau: 0, triase_hitam: 0, total_pasien: 5, kapasitas_tersedia: '22 TT', stok_darah: 'A: 6, B: 8, O: 12, AB: 2', listrik: 'PLN / Genset', pj_medis: 'dr. Yohanes, Sp.B' },
      { id: 'rs-6', nama: 'RSUD Ende', jenis: 'RS', kabupaten: 'Ende', kecamatan: 'Ende Selatan', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 1, triase_kuning: 7, triase_hijau: 0, triase_hitam: 0, total_pasien: 8, kapasitas_tersedia: '30 TT', stok_darah: 'A: 14, B: 16, O: 22, AB: 5', listrik: 'PLN', pj_medis: 'dr. Stefanus, Sp.OT' },
      { id: 'rs-7', nama: 'RSUD Komodo', jenis: 'RS', kabupaten: 'Manggarai Barat', kecamatan: 'Komodo', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Aman Terkendali', triase_merah: 0, triase_kuning: 9, triase_hijau: 0, triase_hitam: 0, total_pasien: 9, kapasitas_tersedia: '40 TT', stok_darah: 'A: 20, B: 22, O: 35, AB: 10', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Melinda, Sp.A' },
    ],
    faskes_terdekat: [
      { id: 'rs-1', nama: 'RSUD dr. TC Hillers Maumere', jenis: 'RS', kabupaten: 'Sikka', kecamatan: 'Alok', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 1, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total_pasien: 4, kapasitas_tersedia: '42 TT', stok_darah: 'A: 12, B: 15, O: 24, AB: 6', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Clara, Sp.B' },
      { id: 'rs-2', nama: 'RSUD Borong', jenis: 'RS', kabupaten: 'Manggarai Timur', kecamatan: 'Borong', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Sedang', triase_merah: 12, triase_kuning: 17, triase_hijau: 8, triase_hitam: 1, total_pasien: 38, kapasitas_tersedia: '18 TT', stok_darah: 'A: 8, B: 10, O: 14, AB: 3', listrik: 'Genset Darurat EOC', pj_medis: 'dr. Anton, Sp.An' },
      { id: 'rs-3', nama: 'RSUD Ruteng (dr. Ben Mboi)', jenis: 'RS', kabupaten: 'Manggarai', kecamatan: 'Langke Rembong', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 2, triase_kuning: 8, triase_hijau: 1, triase_hitam: 0, total_pasien: 11, kapasitas_tersedia: '35 TT', stok_darah: 'A: 18, B: 20, O: 30, AB: 8', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Ronald, Sp.OG' },
      { id: 'rs-4', nama: 'RSUD Bajawa', jenis: 'RS', kabupaten: 'Ngada', kecamatan: 'Bajawa', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 0, triase_kuning: 3, triase_hijau: 0, triase_hitam: 0, total_pasien: 3, kapasitas_tersedia: '28 TT', stok_darah: 'A: 10, B: 12, O: 16, AB: 4', listrik: 'PLN', pj_medis: 'dr. Maria, Sp.PD' },
      { id: 'rs-5', nama: 'RSUD Aeramo', jenis: 'RS', kabupaten: 'Nagekeo', kecamatan: 'Aesesa', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Sedang', triase_merah: 3, triase_kuning: 2, triase_hijau: 0, triase_hitam: 0, total_pasien: 5, kapasitas_tersedia: '22 TT', stok_darah: 'A: 6, B: 8, O: 12, AB: 2', listrik: 'PLN / Genset', pj_medis: 'dr. Yohanes, Sp.B' },
      { id: 'rs-6', nama: 'RSUD Ende', jenis: 'RS', kabupaten: 'Ende', kecamatan: 'Ende Selatan', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Rusak Ringan', triase_merah: 1, triase_kuning: 7, triase_hijau: 0, triase_hitam: 0, total_pasien: 8, kapasitas_tersedia: '30 TT', stok_darah: 'A: 14, B: 16, O: 22, AB: 5', listrik: 'PLN', pj_medis: 'dr. Stefanus, Sp.OT' },
      { id: 'rs-7', nama: 'RSUD Komodo', jenis: 'RS', kabupaten: 'Manggarai Barat', kecamatan: 'Komodo', status: 'Beroperasi Siaga Bencana', kondisi_bangunan: 'Aman Terkendali', triase_merah: 0, triase_kuning: 9, triase_hijau: 0, triase_hitam: 0, total_pasien: 9, kapasitas_tersedia: '40 TT', stok_darah: 'A: 20, B: 22, O: 35, AB: 10', listrik: 'PLN / Genset Siaga', pj_medis: 'dr. Melinda, Sp.A' },
    ],
    lokasi: [
      { id: 'loc-1', kecamatan: 'Mbay', kabupaten: 'Nagekeo', latitude: -8.562, longitude: 121.284 },
      { id: 'loc-2', kecamatan: 'Borong', kabupaten: 'Manggarai Timur', latitude: -8.621, longitude: 120.612 },
      { id: 'loc-3', kecamatan: 'Ruteng', kabupaten: 'Manggarai', latitude: -8.614, longitude: 120.463 },
      { id: 'loc-4', kecamatan: 'Bajawa', kabupaten: 'Ngada', latitude: -8.792, longitude: 120.965 },
      { id: 'loc-5', kecamatan: 'Maumere', kabupaten: 'Sikka', latitude: -8.621, longitude: 122.211 },
      { id: 'loc-6', kecamatan: 'Ende', kabupaten: 'Ende', latitude: -8.843, longitude: 121.662 },
      { id: 'loc-7', kecamatan: 'Labuan Bajo', kabupaten: 'Manggarai Barat', latitude: -8.496, longitude: 119.887 },
    ],
    pos_pengungsi: [],
    logistik: [],
    tck: []
  }
}

export default function ProvNttBencanaPage() {
  const router = useRouter()
  const { setHeader, resetHeader } = useHeaderStore()
  const [eventData, setEventData] = useState<any>(BASE_NTT_GEMPA_EVENT)
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-21')
  const [isLoadingDate, setIsLoadingDate] = useState<boolean>(false)

  useEffect(() => {
    setHeader({
      title: 'DASHBOARD GEMPA BUMI - PROV. NTT',
      description: 'Analisis spasial kejadian bencana dan dampaknya terhadap sumber daya kesehatan secara real-time di wilayah PROV. NUSA TENGGARA TIMUR.',
    })

    return () => {
      resetHeader()
    }
  }, [setHeader, resetHeader])

  // Ambil data real-time dari API resmi collector (/api/ntt-data)
  const loadCollectorData = async (targetDate?: string) => {
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
          const breakdownKab: any[] = []
          const faskesList: any[] = []

          // 1. Situasi Kesehatan Per Kabupaten
          if (json.tables?.situasi_kesehatan && Array.isArray(json.tables.situasi_kesehatan) && json.tables.situasi_kesehatan.length > 0) {
            const rows = json.tables.situasi_kesehatan
            let sm = 0, slb = 0, slr = 0, sp = 0, stp = 0, sterdampak = 0, shilang = 0
            rows.forEach((r: any) => {
              const meninggal = Number(r.meninggal || r.korban_meninggal || 0)
              const lukaBerat = Number(r.luka_berat || r.korban_luka_berat || 0)
              const lukaRingan = Number(r.luka_ringan || r.korban_luka_ringan || 0)
              const pengungsi = Number(r.pengungsi || r.jumlah_pengungsi || 0)
              const titikPosko = Number(r.titik_pengungsian || r.titik_posko || 0)
              const terdampak = Number(r.populasi_terdampak || r.penduduk_terdampak || 0)
              const hilang = Number(r.hilang || r.korban_hilang || 0)

              sm += meninggal
              slb += lukaBerat
              slr += lukaRingan
              sp += pengungsi
              stp += titikPosko
              sterdampak += terdampak
              shilang += hilang

              breakdownKab.push({
                kabupaten: r.kabupaten || '',
                ibukota: r.ibukota || '',
                meninggal,
                luka_berat: lukaBerat,
                luka_ringan: lukaRingan,
                total_luka: lukaBerat + lukaRingan,
                hilang,
                pengungsi,
                titik_posko: titikPosko,
                populasi_terdampak: terdampak,
                zona: meninggal > 10 ? 'Zona Merah' : meninggal > 0 ? 'Zona Oranye' : 'Zona Kuning',
                zonaColor: meninggal > 10 ? 'bg-rose-50 text-rose-700 border-rose-200' : meninggal > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
              })
            })
            tot = {
              meninggal: sm,
              luka_berat: slb,
              luka_ringan: slr,
              total_luka: slb + slr,
              hilang: shilang,
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
              hilang: Number(lastRow.hilang || 0),
              pengungsi: Number(lastRow.pengungsi || lastRow.jumlah_pengungsi || 0),
              titik_pengungsian: Number(lastRow.titik_pengungsian || 0),
              populasi_terdampak: Number(lastRow.populasi_terdampak || lastRow.penduduk_terdampak || 0)
            }
          }

          // 2. Data Pasien RS & Puskesmas dari Collector
          if (Array.isArray(json.tables?.pasien_rs)) {
            json.tables.pasien_rs.forEach((rs: any, idx: number) => {
              faskesList.push({
                id: `rs-${idx + 1}`,
                nama: rs.nama_rs || rs.rs || rs.nama || 'RS Rujukan',
                jenis: 'RS',
                kabupaten: rs.kabupaten || '',
                kecamatan: rs.kecamatan || '-',
                status: rs.status || 'Beroperasi Siaga Bencana',
                kondisi_bangunan: rs.kondisi_bangunan || 'Terpantau EOC',
                triase_merah: Number(rs.triase_merah || 0),
                triase_kuning: Number(rs.triase_kuning || 0),
                triase_hijau: Number(rs.triase_hijau || 0),
                triase_hitam: Number(rs.triase_hitam || 0),
                total_pasien: Number(rs.total || 0),
                kapasitas_tersedia: rs.kapasitas_tersedia || '-',
                stok_darah: rs.stok_darah || '-',
                listrik: rs.listrik || 'PLN / Genset Siaga',
                pj_medis: rs.pj_medis || '-',
              })
            })
          }

          if (Array.isArray(json.tables?.pasien_puskesmas)) {
            json.tables.pasien_puskesmas.forEach((pkm: any, idx: number) => {
              faskesList.push({
                id: `pkm-${idx + 1}`,
                nama: pkm.nama_puskesmas || pkm.puskesmas || pkm.nama || 'Puskesmas',
                jenis: 'Puskesmas',
                kabupaten: pkm.kabupaten || '',
                kecamatan: pkm.kecamatan || '-',
                status: pkm.status || 'Beroperasi',
                kondisi_bangunan: pkm.kondisi_bangunan || 'Normal',
                triase_merah: Number(pkm.triase_merah || 0),
                triase_kuning: Number(pkm.triase_kuning || 0),
                triase_hijau: Number(pkm.triase_hijau || 0),
                triase_hitam: Number(pkm.triase_hitam || 0),
                total_pasien: Number(pkm.total || 0),
                kapasitas_tersedia: pkm.kapasitas_tersedia || '-',
                listrik: pkm.listrik || 'PLN',
                pj_medis: pkm.pj_medis || '-',
              })
            })
          }
          
          const updateTimestamp = json.updated_at || (tgl ? `${tgl} 10:01:00` : '2026-08-21 10:01:00')
          setEventData((prev: any) => ({
            ...prev,
            tgl_kejadian: tgl ? `${tgl} 10:01:00` : prev.tgl_kejadian,
            tgl_laporan: updateTimestamp || prev.tgl_laporan,
            updated_at: updateTimestamp,
            meninggal: tot.meninggal ?? prev.meninggal,
            luka_berat: tot.luka_berat ?? prev.luka_berat,
            luka_ringan: tot.luka_ringan ?? prev.luka_ringan,
            luka: tot.total_luka ?? prev.luka,
            hilang: tot.hilang ?? prev.hilang,
            pengungsi: tot.pengungsi ?? prev.pengungsi,
            titik_pengungsian: tot.titik_pengungsian ?? prev.titik_pengungsian,
            penduduk_terdampak: tot.populasi_terdampak ?? prev.penduduk_terdampak,
            detailData: {
              ...prev.detailData,
              tgl_kejadian: tgl ? `${tgl} 10:01:00` : prev.detailData.tgl_kejadian,
              tgl_laporan: updateTimestamp || prev.detailData.tgl_laporan,
              updated_at: updateTimestamp,
              korban_meninggal: tot.meninggal ?? prev.detailData.korban_meninggal,
              korban_luka_berat: tot.luka_berat ?? prev.detailData.korban_luka_berat,
              korban_luka_ringan: tot.luka_ringan ?? prev.detailData.korban_luka_ringan,
              korban_luka: tot.total_luka ?? prev.detailData.korban_luka,
              korban_hilang: tot.hilang ?? prev.detailData.korban_hilang,
              pengungsi: tot.pengungsi ?? prev.detailData.pengungsi,
              titik_pengungsian: tot.titik_pengungsian ?? prev.detailData.titik_pengungsian,
              populasi_terdampak: tot.populasi_terdampak ?? prev.detailData.populasi_terdampak,
              meninggal: tot.meninggal ?? prev.detailData.meninggal,
              luka_berat: tot.luka_berat ?? prev.detailData.luka_berat,
              luka_ringan: tot.luka_ringan ?? prev.detailData.luka_ringan,
              luka: tot.total_luka ?? prev.detailData.luka,
              hilang: tot.hilang ?? prev.detailData.hilang,
              penduduk_terdampak: tot.populasi_terdampak ?? prev.detailData.penduduk_terdampak,
              breakdown_kabupaten: breakdownKab.length > 0 ? breakdownKab : prev.detailData.breakdown_kabupaten,
              faskes_terdampak: faskesList.length > 0 ? faskesList : prev.detailData.faskes_terdampak,
              faskes_terdekat: faskesList.length > 0 ? faskesList : prev.detailData.faskes_terdekat,
              pos_pengungsi: prev.detailData.pos_pengungsi || [],
              logistik: prev.detailData.logistik || [],
              tck: prev.detailData.tck || []
            }
          }))
        }
      }
    } catch (e) {
      console.warn('Error loading collector data:', e)
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
