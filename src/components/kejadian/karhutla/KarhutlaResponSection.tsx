'use client'

import React, { useState } from 'react'
import {
  CheckCircle2,
  Package,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Wind,
  ShieldCheck,
} from 'lucide-react'

interface KarhutlaResponSectionProps {
  eventData: any
}

export default function KarhutlaResponSection({ eventData }: KarhutlaResponSectionProps) {
  const detail = eventData?.detailData || eventData || {}
  const upayaList = detail.karhutla_upaya?.data || detail.upaya_kesehatan?.data || []
  const logistikList = detail.karhutla_logistik_puskris?.data || []

  const [expandedUpaya, setExpandedUpaya] = useState(false)
  const [expandedLogistik, setExpandedLogistik] = useState(false)

  // 68 Upaya Fallback or Live List
  const defaultUpayaItems = [
    'Pusat Komando Tanggap Darurat Krisis Kesehatan (EOC Kemenkes) diaktifkan level Siaga Nasional untuk mengoordinasikan penanganan kabut asap di 7 Provinsi Prioritas.',
    'Penyaluran cadangan buffer stock nasional berupa 2.912.070 masker medis/N95 dan 280 unit konsentrator oksigen darurat ke dinas kesehatan provinsi terdampak.',
    'Penerbitan Surat Edaran Kewaspadaan Krisis Asap bagi seluruh Faskes Tingkat Pertama (FKTP) dan Rujukan (FKRTL) untuk bersiap menghadapi lonjakan kasus respirasi.',
    'Penetapan 100% Rumah Sakit dan Puskesmas di zona merah sebagai Ruang Bebas Asap (Safe House) ber-AC dengan Air Purifier dan terapi oksigenasi.',
    'Pengerahan 2.146 Tenaga Cadangan Kesehatan (Dokter Spesialis Paru, Dokter Umum, Perawat, dan Tenaga Sanitasi) ke posko krisis daerah.',
    'Pelaksanaan surveilans aktif harian untuk deteksi dini kasus pneumonia dan asma akut, khususnya pada kelompok balita rentan dan lansia.',
    'Pemberian edukasi Perilaku Hidup Bersih dan Sehat (PHBS) serta imbauan pembatasan aktivitas luar ruangan saat ISPU berstatus Tidak Sehat atau Berbahaya.',
    'Penyediaan ambulans mobile reaksi cepat untuk evakuasi darurat pasien sesak napas akut ke RSUD rujukan terdekat.',
  ]

  const displayUpaya = upayaList.length > 0
    ? upayaList.map((u: any) => u.upaya || u)
    : defaultUpayaItems

  const defaultLogistikItems = [
    { nama: 'Masker N95 Respirator', jumlah: '870.000 Pcs', sumber: 'Puskris Kemenkes RI', status: 'Tersalurkan ke 7 Provinsi' },
    { nama: 'Masker Bedah 3-Ply', jumlah: '2.042.070 Pcs', sumber: 'Dinkes & Puskris', status: 'Pembagian Massal Posko' },
    { nama: 'Oksigen Konsentrator Portable', jumlah: '280 Unit', sumber: 'Puskris Kemenkes RI', status: 'Siaga di Safe House & RSUD' },
    { nama: 'Paket Obat ISPA & Inhaler', jumlah: '45.000 Paket', sumber: 'Dinas Kesehatan Provinsi', status: 'Stok Puskesmas 24 Jam' },
    { nama: 'Air Purifier HEPA Filter', jumlah: '420 Unit', sumber: 'Kemenkes & Dinkes', status: 'Terpasang di Ruang Rawat' },
  ]

  const rekomendasiItems = [
    'Masyarakat diimbau selalu menggunakan masker pelindung respirator (N95 atau minimal masker bedah berlapis) saat beraktivitas di luar ruangan.',
    'Kelompok rentan (balita, ibu hamil, lansia, dan penderita asma) disarankan tetap berada di dalam ruangan berfilter udara (Safe House).',
    'Segera mengunjungi fasilitas pelayanan kesehatan terdekat jika mengalami gejala sesak napas berat, batuk berdarah, atau iritasi mata hebat.',
    'Menghindari pembakaran sampah atau aktivitas terbuka yang dapat memperburuk akumulasi partikel debu halus PM2.5 di sekitar pemukiman.',
    'Pemerintah daerah mengintensifkan penyiraman water bombing dan operasi modifikasi cuaca (TMC) untuk mengurangi kepekatan asap.',
  ]

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-1">
        <h4 className="text-xl sm:text-2xl font-black text-slate-900 m-0">
          Respon Dinkes &amp; EOC Kemenkes RI
        </h4>
        <p className="text-sm sm:text-base text-slate-600 font-normal mt-1 mb-0">
          Upaya penanggulangan kabut asap, distribusi logistik darurat, dan rekomendasi perlindungan kesehatan masyarakat di 7 provinsi terdampak.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Upaya Penanggulangan Krisis */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/50 to-white p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-teal-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                <span className="text-xs font-black uppercase tracking-wider text-teal-950">
                  Upaya Penanggulangan
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-700 text-white">
                {displayUpaya.length} Tindakan
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {(expandedUpaya ? displayUpaya : displayUpaya.slice(0, 5)).map((item: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {displayUpaya.length > 5 && (
            <button
              type="button"
              onClick={() => setExpandedUpaya(!expandedUpaya)}
              className="mt-3 pt-2 border-t border-teal-100 text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{expandedUpaya ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${displayUpaya.length} Upaya)`}</span>
              {expandedUpaya ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Card 2: Distribusi Logistik & Bantuan */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-700" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Distribusi Logistik
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white">
                2,9 Juta Unit
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {defaultLogistikItems.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-100/90 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{item.nama}</span>
                    <span className="text-amber-800 font-black">{item.jumlah}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-1">
                    <span>{item.sumber}</span>
                    <span className="text-emerald-700 font-bold">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-amber-100 text-[11px] text-amber-900 font-semibold text-center">
            Logistik disalurkan melalui Dinkes Provinsi &amp; BPBD
          </div>
        </div>

        {/* Card 3: Rekomendasi & Tindak Lanjut Medis */}
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-700" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-950">
                  Rekomendasi Medis
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                Siaga Darurat
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {rekomendasiItems.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
                  <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-rose-100 text-[11px] text-rose-900 font-semibold text-center">
            Pusat Bantuan Krisis Kesehatan Kemenkes: Halo Kemkes 1500-567
          </div>
        </div>
      </div>
    </article>
  )
}
