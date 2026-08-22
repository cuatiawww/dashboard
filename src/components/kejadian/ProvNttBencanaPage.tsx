'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DetailKejadianPage from './DetailKejadianPage'
import { useHeaderStore } from '@/lib/headerStore'

// Data Dasar Struktur Gempa NTT (Sinkron dengan BMKG & API Collector /api/ntt-data)
const BASE_NTT_GEMPA_EVENT = {
  id: 'EVT-NTT-2026-0819-01',
  kode_trans: 'EVT-NTT-2026-0819-01',
  nama: 'Gempa Bumi M 5.2 - Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai',
  nama_bencana: 'Gempa Bumi',
  jenis_bencana: 'Gempa Bumi',
  provinsi: 'NUSA TENGGARA TIMUR',
  kabupaten: 'FLORES TIMUR',
  kecamatan: 'Mbay, Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
  waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA',
  tgl_kejadian_riil: '2026-08-15 09:18:22',
  tgl_kejadian: '2026-08-15 09:18:22',
  tgl_laporan: '22 Agustus 2026, 01:47 WIB',
  updated_at: '2026-08-22 01:47:00',
  latitude: -8.03,
  longitude: 120.68,
  status_bencana: 'Tanggap Darurat',
  keterangan: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
  kronologis: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
  deskripsi: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
  buletin_eoc: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
  
  // Parameter Seismisitas BMKG
  magnitudo: 5.2,
  kedalaman: '10 km',
  potensi_tsunami: 'Tidak Berpotensi Tsunami',
  tsunami: 'Tidak Berpotensi Tsunami',
  skala_mmi: 'III MMI (Ruteng-Manggarai)',

  // Data Korban Ringkasan (Sinkron dengan collector)
  meninggal: 78,
  luka_berat: 331,
  luka_ringan: 639,
  luka: 970,
  hilang: 0,
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
    kecamatan: 'Mbay, Larantuka, Tanjung Bunga, Ile Mandiri, Adonara, Borong, Ruteng, Bajawa, Ende',
    waktu_kejadian_bmkg: '15 Agu 2026, 09:18:22 WITA',
    tgl_kejadian_riil: '2026-08-15 09:18:22',
    tgl_kejadian: '2026-08-15 09:18:22',
    tgl_laporan: '22 Agustus 2026, 01:47 WIB',
    updated_at: '2026-08-22 01:47:00',
    latitude: -8.03,
    longitude: 120.68,
    deskripsi: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
    kronologis: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
    keterangan: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
    buletin_eoc: 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.',
    
    // Parameter Seismisitas
    magnitudo: 5.2,
    kedalaman: '10 km',
    potensi_tsunami: 'Tidak Berpotensi Tsunami',
    tsunami: 'Tidak Berpotensi Tsunami',
    skala_mmi: 'III MMI (Ruteng-Manggarai)',
    status_tanggap_darurat: 'Tanggap Darurat (Level Provinsi & Nasional)',

    korban_meninggal: 78,
    korban_luka_berat: 331,
    korban_luka_ringan: 639,
    korban_luka: 970,
    korban_hilang: 0,
    pengungsi: 43686,
    titik_pengungsian: 400,
    populasi_terdampak: 1917732,
    meninggal: 78,
    luka_berat: 331,
    luka_ringan: 639,
    luka: 970,
    hilang: 0,
    penduduk_terdampak: 1917732,

    breakdown_kabupaten: [],
    faskes_terdampak: [],
    faskes_terdekat: [],
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

  // 1. Ambil Parameter Seismisitas Real-time dari BMKG API
  useEffect(() => {
    let active = true
    const fetchBmkg = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
        const res = await fetch(`${basePath}/api/bmkg-gempa`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!active || !json.success || !json.data) return

        const allGempa = [
          ...(Array.isArray(json.data.gempadirasakan) ? json.data.gempadirasakan : (json.data.gempadirasakan ? [json.data.gempadirasakan] : [])),
          ...(Array.isArray(json.data.gempaterkini) ? json.data.gempaterkini : (json.data.gempaterkini ? [json.data.gempaterkini] : [])),
          json.data.autogempa,
        ].filter(Boolean)

        // Cari gempa terdekat / terkait wilayah NTT (Manggarai, Ruteng, Sikka, Mbay, Nagekeo, Flores, NTT)
        const nttKeywords = ['manggarai', 'ruteng', 'sikka', 'mbay', 'nagekeo', 'flores', 'ende', 'ntt', 'kupang', 'alor']
        const matched = allGempa.find((g: any) => {
          const text = `${g.Wilayah || ''} ${g.Dirasakan || ''} ${g.region || ''}`.toLowerCase()
          return nttKeywords.some(kw => text.includes(kw))
        }) || json.data.autogempa || allGempa[0]

        if (matched) {
          const coords = matched.Coordinates ? matched.Coordinates.split(',') : []
          const lat = coords[0] ? parseFloat(coords[0].trim()) : -8.03
          const lng = coords[1] ? parseFloat(coords[1].trim()) : 120.68
          const mag = parseFloat(matched.Magnitude) || 5.2
          const depth = matched.Kedalaman || '10 km'
          const mmi = matched.Dirasakan ? `${matched.Dirasakan} MMI` : 'III MMI (Ruteng-Manggarai)'
          const potensi = matched.Potensi || 'Tidak Berpotensi Tsunami'
          const wilayahStr = matched.Wilayah || 'Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai'
          const kronologisText = 'Pusat Krisis Kemenkes memantau dampak gempa bumi M 5.2 (Pusat gempa berada di laut 68 km timur laut Ruteng-Manggarai). Tidak berpotensi tsunami. RSUD rujukan dan seluruh puskesmas di wilayah terdampak disiagakan.'

          setEventData((prev: any) => ({
            ...prev,
            nama: `Gempa Bumi M ${mag} - ${wilayahStr}`,
            magnitudo: mag,
            kedalaman: depth,
            potensi_tsunami: potensi,
            tsunami: potensi,
            skala_mmi: mmi,
            latitude: lat,
            longitude: lng,
            keterangan: kronologisText,
            kronologis: kronologisText,
            buletin_eoc: kronologisText,
            detailData: {
              ...prev.detailData,
              magnitudo: mag,
              kedalaman: depth,
              potensi_tsunami: potensi,
              tsunami: potensi,
              skala_mmi: mmi,
              latitude: lat,
              longitude: lng,
              deskripsi: kronologisText,
              kronologis: kronologisText,
              buletin_eoc: kronologisText,
            }
          }))
        }
      } catch (err) {
        console.warn('[ProvNttBencanaPage] Gagal memuat data BMKG live:', err)
      }
    }

    fetchBmkg()
  }, [])

  // 2. Ambil data real-time dari API resmi collector (/api/ntt-data)
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

          // 2. Data Pasien RS & Puskesmas dari Collector (Faskes Siaga yang melayani pasien)
          if (Array.isArray(json.tables?.pasien_rs)) {
            json.tables.pasien_rs.forEach((rs: any, idx: number) => {
              faskesList.push({
                id: `rs-${idx + 1}`,
                nama: rs.nama_rs || rs.rs || rs.nama || 'RS Rujukan',
                jenis: 'RS',
                kabupaten: rs.kabupaten || '',
                kecamatan: rs.kecamatan || '-',
                status: rs.status || 'Beroperasi Siaga Bencana',
                kondisi_bangunan: rs.kondisi_bangunan || 'Normal / Siaga',
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
              faskes_terdampak: [], // Faskes rusak fisik (hanya jika ada laporan kerusakan bangunan)
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
