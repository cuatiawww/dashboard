'use client'

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from 'recharts'
import { Users, Activity, Wind, Flame, Package, Stethoscope, ClipboardList, AlertTriangle, Search } from 'lucide-react'
import {
  fmtNum,
  toNum,
  titleCase,
  normName,
  ispuColor,
  aqiColor,
  ISPU_LEGEND_DEFAULT,
  SOURCE_CREDITS,
  fmtUpdated,
  dataDukungUpdated,
} from './karhutlaUtils'

interface KarhutlaDataPanelsProps {
  karhutla: any // { all, hotspot, hotspotRingkasan, udara, errors }
}

const COLORS = ['#EA580C', '#0F766E', '#7C3AED', '#2563EB', '#DB2777', '#CA8A04', '#16A34A', '#475569']

const shortProv = (p: any) =>
  String(p || '')
    .replace(/Kalimantan/i, 'Kal.')
    .replace(/Sumatera/i, 'Sum.')
    .replace(/Sulawesi/i, 'Sul.')

const Card = ({ title, icon: Icon, children, source, updated, note }: any) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col">
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="h-4.5 w-4.5 text-orange-700" />}
      <h5 className="text-sm sm:text-base font-black text-slate-900 m-0">{title}</h5>
    </div>
    <div className="flex-1">{children}</div>
    {note && <p className="mt-2 text-[11px] text-amber-700 font-semibold">{note}</p>}
    <p className="mt-3 pt-2 border-t border-slate-100 text-[10.5px] text-slate-500 leading-snug m-0">
      Sumber: {source}
      {updated ? ` | Pembaruan: ${updated}` : ''}
    </p>
  </article>
)

const Empty = ({ text }: { text: string }) => (
  <div className="h-full min-h-[120px] flex items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 font-semibold text-center p-4">
    {text}
  </div>
)

const Kpi = ({ label, value, sub, tone = 'slate' }: any) => {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-950',
    red: 'bg-rose-50 border-rose-200 text-rose-950',
    teal: 'bg-teal-50 border-teal-200 text-teal-950',
    violet: 'bg-violet-50 border-violet-200 text-violet-950',
    dark: 'bg-slate-900 border-slate-800 text-white',
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <div className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xl sm:text-2xl font-black leading-tight mt-1">{value}</div>
      {sub && <div className="text-[10.5px] font-semibold opacity-75 mt-0.5">{sub}</div>}
    </div>
  )
}

const tooltipFmt = (v: any) => fmtNum(v)

export default function KarhutlaDataPanels({ karhutla }: KarhutlaDataPanelsProps) {
  const all = useMemo(() => karhutla?.all || {}, [karhutla])
  const kartu = all.ringkasan?.kartu || {}
  const sheetUpdated = fmtUpdated(all.updated_at)
  const hs = karhutla?.hotspotRingkasan
  const hsPts = karhutla?.hotspot
  const udara = karhutla?.udara
  const legendIspu = all.ispu?.legenda?.length ? all.ispu.legenda : ISPU_LEGEND_DEFAULT

  // ---------- Penduduk terdampak ----------
  const pendudukProv = useMemo(
    () =>
      (all.penduduk_terdampak?.by_provinsi || [])
        .map((r: any) => ({ provinsi: shortProv(r.provinsi), full: r.provinsi, penduduk: toNum(r.penduduk_terdampak), kab: toNum(r.kabupaten_terdampak) }))
        .sort((a: any, b: any) => b.penduduk - a.penduduk),
    [all.penduduk_terdampak]
  )
  const topKab = useMemo(
    () =>
      (all.penduduk_terdampak?.data || [])
        .map((r: any) => ({ nama: `${r.kabupaten} (${shortProv(r.provinsi)})`, penduduk: toNum(r.penduduk_terdampak) }))
        .sort((a: any, b: any) => b.penduduk - a.penduduk)
        .slice(0, 10),
    [all.penduduk_terdampak]
  )

  // ---------- ISPA ----------
  const ispaProv = useMemo(
    () =>
      (all.ispa?.data || [])
        .map((r: any) => ({
          provinsi: shortProv(r.provinsi),
          'Usia <=5 th': toNum(r.kategori_umur?.le_5_tahun),
          'Usia >5 th': toNum(r.kategori_umur?.gt_5_tahun),
          total: toNum(r.total_kasus),
        }))
        .sort((a: any, b: any) => b.total - a.total),
    [all.ispa]
  )
  const provTerdampak: string[] = all.ringkasan?.provinsi_terdampak || []
  const ispaMissing = provTerdampak.filter((p) => !(all.ispa?.data || []).some((r: any) => normName(r.provinsi) === normName(p)))

  // ---------- Penyakit lainnya ----------
  const penyakitList: string[] = useMemo(() => all.penyakit_lainnya?.summary?.daftar_penyakit || [], [all])
  const byPenyakit = useMemo(
    () => (all.penyakit_lainnya?.by_penyakit || []).map((r: any) => ({ penyakit: titleCase(r.penyakit), jumlah: toNum(r.jumlah) })),
    [all.penyakit_lainnya]
  )
  const penyakitProv = useMemo(
    () =>
      (all.penyakit_lainnya?.by_provinsi || []).map((r: any) => {
        const o: any = { provinsi: shortProv(r.provinsi) }
        penyakitList.forEach((p) => (o[titleCase(p)] = toNum(r.penyakit?.[p])))
        return o
      }),
    [all.penyakit_lainnya, penyakitList]
  )
  const penyakitMissing = provTerdampak.filter((p) => !(all.penyakit_lainnya?.by_provinsi || []).some((r: any) => normName(r.provinsi) === normName(p)))

  // ---------- ISPU ----------
  const ispuRows = useMemo(
    () => [...(all.ispu?.data || [])].sort((a: any, b: any) => (toNum(b.nilai_ispu) || -1) - (toNum(a.nilai_ispu) || -1)),
    [all.ispu]
  )
  const ispuKat = useMemo(() => {
    const per = all.ispu?.summary?.per_kategori || {}
    return legendIspu.map((l: any) => ({ kategori: l.kategori, jumlah: toNum(per[l.kategori]), hex: l.hex }))
  }, [all.ispu, legendIspu])
  const [ispuShowAll, setIspuShowAll] = useState(false)

  // ---------- Hotspot ----------
  const hsProv = useMemo(() => {
    if (Array.isArray(hs?.by_provinsi) && hs.by_provinsi.length)
      return hs.by_provinsi.map((r: any) => ({ provinsi: shortProv(r.provinsi), Tinggi: toNum(r.tinggi), Sedang: toNum(r.sedang), total: toNum(r.jumlah) })).slice(0, 12)
    return []
  }, [hs])
  const hsTanggal = useMemo(() => {
    const arr = Array.isArray(hs?.by_tanggal) ? hs.by_tanggal : []
    return [...arr].sort((a: any, b: any) => (a.tanggal_wib < b.tanggal_wib ? -1 : 1)).map((r: any) => ({ tanggal: r.tanggal_wib, jumlah: toNum(r.jumlah) }))
  }, [hs])

  // ---------- Kualitas udara model ----------
  const udaraWorst = useMemo(
    () => [...(udara?.data || [])].filter((r: any) => r.us_aqi !== null && r.us_aqi !== undefined).sort((a: any, b: any) => toNum(b.us_aqi) - toNum(a.us_aqi)).slice(0, 10),
    [udara]
  )
  const udaraProv = useMemo(() => (udara?.by_provinsi || []).map((r: any) => ({ provinsi: shortProv(r.provinsi), 'PM2.5 rata-rata': toNum(r.pm2_5_rata2), 'PM2.5 maks': toNum(r.pm2_5_maks) })), [udara])

  // ---------- Logistik ----------
  const logJenis = useMemo(() => {
    const m: Record<string, any> = {}
    const add = (arr: any[], key: 'Dinkes' | 'Puskris') =>
      (arr || []).forEach((r: any) => {
        const k = `${r.jenis_logistik} (${r.satuan || '-'})`
        if (!m[k]) m[k] = { jenis: k, Dinkes: 0, Puskris: 0 }
        m[k][key] += toNum(r.jumlah)
      })
    add(all.logistik?.dinkes?.by_jenis, 'Dinkes')
    add(all.logistik?.puskris?.by_jenis, 'Puskris')
    // Skala log: nilai 0 dijadikan null agar batang tidak dirender (bukan berarti data hilang)
    return Object.values(m)
      .sort((a: any, b: any) => b.Dinkes + b.Puskris - (a.Dinkes + a.Puskris))
      .map((r: any) => ({ ...r, Dinkes: r.Dinkes || null, Puskris: r.Puskris || null }))
  }, [all.logistik])
  const logRows = useMemo(
    () => [
      ...(all.logistik?.dinkes?.data || []).map((r: any) => ({ ...r, src: 'Dinkes' })),
      ...(all.logistik?.puskris?.data || []).map((r: any) => ({ ...r, src: 'Puskris' })),
    ],
    [all.logistik]
  )
  const [logFilter, setLogFilter] = useState<'all' | 'Dinkes' | 'Puskris'>('all')
  const [logProv, setLogProv] = useState('semua')
  const logProvOptions = Array.from(new Set(logRows.map((r: any) => r.provinsi).filter(Boolean))) as string[]
  const logFiltered = logRows.filter((r: any) => (logFilter === 'all' || r.src === logFilter) && (logProv === 'semua' || r.provinsi === logProv))

  // ---------- SDMK ----------
  const sdmkRows = useMemo(() => (all.sdmk?.data || []).map((r: any) => ({ ...r, provinsiShort: shortProv(r.provinsi), jumlah: toNum(r.jumlah) })), [all.sdmk])

  // ---------- Upaya ----------
  const upayaRows: any[] = useMemo(() => all.upaya?.data || [], [all])
  const [upInstansi, setUpInstansi] = useState('semua')
  const [upWilayah, setUpWilayah] = useState('semua')
  const [upQ, setUpQ] = useState('')
  const upInstansiOpts = Array.from(new Set(upayaRows.map((r) => r.instansi).filter(Boolean))) as string[]
  const upWilayahOpts = Array.from(new Set(upayaRows.map((r) => r.wilayah).filter(Boolean))) as string[]
  const upFiltered = upayaRows.filter(
    (r) =>
      (upInstansi === 'semua' || r.instansi === upInstansi) &&
      (upWilayah === 'semua' || r.wilayah === upWilayah) &&
      (!upQ.trim() || String(r.upaya || '').toLowerCase().includes(upQ.toLowerCase()))
  )
  const upayaPerWilayah = useMemo(() => {
    const m: Record<string, number> = {}
    upayaRows.forEach((r) => (m[r.wilayah] = (m[r.wilayah] || 0) + 1))
    return Object.entries(m).map(([wilayah, jumlah]) => ({ wilayah: shortProv(wilayah), jumlah })).sort((a, b) => b.jumlah - a.jumlah)
  }, [upayaRows])

  const ispuTop = kartu.ispu_tertinggi || all.ispu?.summary?.stasiun_tertinggi

  return (
    <section className="space-y-5">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 m-0">Data Situasi Karhutla per Indikator</h3>
        <p className="text-sm sm:text-base text-slate-600 font-normal mt-1.5 mb-0">
          Seluruh angka di bawah diambil langsung dari API spreadsheet karhutla (ringkasan, penduduk terdampak, ISPA, penyakit lainnya, ISPU, logistik, SDMK, upaya) dan data dukung (NASA FIRMS, Open-Meteo/CAMS).
        </p>
        {Array.isArray(karhutla?.errors) && karhutla.errors.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Sebagian data belum tersedia: {karhutla.errors.join('; ')}</span>
          </div>
        )}
      </div>

      {/* KPI ringkasan */}
      <Card title="Ringkasan Situasi" icon={Activity} source={SOURCE_CREDITS.sheet} updated={`${sheetUpdated}; ISPU ${all.ringkasan?.ispu_update_text || '-'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Kpi label="Penduduk terdampak" value={fmtNum(kartu.penduduk_terdampak)} sub={`${fmtNum(kartu.kabupaten_terdampak)} kab/kota terdampak`} tone="violet" />
          <Kpi label="Meninggal" value={fmtNum(kartu.meninggal)} sub={`Rawat inap ${fmtNum(kartu.rawat_inap)}`} tone="red" />
          <Kpi label="Kasus ISPA" value={fmtNum(kartu.kasus_ispa)} sub={`Balita ${fmtNum(kartu.kasus_ispa_balita)}`} tone="orange" />
          <Kpi label="Penyakit lainnya" value={fmtNum(kartu.kasus_penyakit_lainnya)} sub={`${fmtNum(penyakitList.length)} jenis penyakit`} tone="orange" />
          <Kpi label="ISPU tertinggi" value={fmtNum(ispuTop?.nilai_ispu)} sub={ispuTop ? `${ispuTop.stasiun} (${ispuTop.kategori})` : '-'} tone="dark" />
          <Kpi label="Stasiun ISPU berbahaya" value={fmtNum(kartu.stasiun_ispu_berbahaya)} sub={`dari ${fmtNum(all.ispu?.summary?.jumlah_stasiun)} stasiun`} tone="dark" />
          <Kpi label="Titik panas 24 jam" value={hs?.kartu ? fmtNum(hs.kartu.hotspot_24jam) : '-'} sub={hs?.kartu ? `Total ${fmtNum(hs.kartu.hotspot_total)} | tinggi ${fmtNum(hs.kartu.hotspot_tinggi)}` : 'data FIRMS belum tersedia'} tone="red" />
          <Kpi label="AQI model terburuk" value={fmtNum(udara?.summary?.lokasi_terburuk?.us_aqi)} sub={udara?.summary?.lokasi_terburuk ? `${udara.summary.lokasi_terburuk.kabupaten} (${udara.summary.lokasi_terburuk.kategori_aqi})` : 'data model belum tersedia'} tone="slate" />
          <Kpi label="SDMK digerakkan" value={fmtNum(kartu.sdmk_digerakkan)} sub={`${fmtNum(all.sdmk?.summary?.jumlah_provinsi)} provinsi`} tone="teal" />
          <Kpi label="Upaya kesehatan" value={fmtNum(kartu.jumlah_upaya)} sub={Object.entries(all.upaya?.summary?.per_instansi || {}).map(([k, v]) => `${titleCase(k)} ${v}`).join(' | ')} tone="teal" />
          <Kpi label="Masker tersalur" value={fmtNum([...(kartu.logistik_dinkes_jenis || []), ...(kartu.logistik_puskris_jenis || [])].filter((x: any) => x.jenis_key === 'masker').reduce((s: number, x: any) => s + toNum(x.jumlah), 0))} sub="Dinkes + Puskris (pcs)" tone="slate" />
          <Kpi label="Oksigen konsentrator" value={fmtNum([...(kartu.logistik_dinkes_jenis || []), ...(kartu.logistik_puskris_jenis || [])].filter((x: any) => x.jenis_key === 'oksigen_konsentrator').reduce((s: number, x: any) => s + toNum(x.jumlah), 0))} sub="Dinkes + Puskris (unit)" tone="slate" />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Penduduk terdampak */}
        <Card title="Penduduk Terdampak per Provinsi" icon={Users} source={`${SOURCE_CREDITS.sheet} (tab DATA PENDUDUK TERDAMPAK)`} updated={sheetUpdated}>
          {pendudukProv.length ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendudukProv} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="provinsi" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(1)} jt`} />
                  <Tooltip formatter={tooltipFmt} labelFormatter={(l, p: any) => p?.[0]?.payload?.full || l} />
                  <Bar dataKey="penduduk" name="Penduduk terdampak" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Data penduduk terdampak belum tersedia" />
          )}
        </Card>

        <Card title="10 Kab/Kota dengan Penduduk Terdampak Terbanyak" icon={Users} source={`${SOURCE_CREDITS.sheet} (tab DATA PENDUDUK TERDAMPAK)`} updated={sheetUpdated}>
          {topKab.length ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topKab} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(1)} jt`} />
                  <YAxis type="category" dataKey="nama" width={170} fontSize={10.5} />
                  <Tooltip formatter={tooltipFmt} />
                  <Bar dataKey="penduduk" name="Penduduk terdampak" fill="#A78BFA" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Data kab/kota belum tersedia" />
          )}
        </Card>

        {/* ISPA */}
        <Card
          title="Kasus ISPA per Provinsi (kelompok umur)"
          icon={Stethoscope}
          source={`${SOURCE_CREDITS.sheet} (tab DATA ISPA)`}
          updated={sheetUpdated}
          note={ispaMissing.length ? `Belum ada data ISPA untuk: ${ispaMissing.join(', ')}` : undefined}
        >
          {ispaProv.length ? (
            <>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ispaProv} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="provinsi" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)} rb`} />
                    <Tooltip formatter={tooltipFmt} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Usia <=5 th" stackId="a" fill="#F97316" />
                    <Bar dataKey="Usia >5 th" stackId="a" fill="#FDBA74" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
                <div className="rounded-lg bg-orange-50 p-2"><b className="block text-sm">{fmtNum(all.ispa?.summary?.total_kasus)}</b>total kasus</div>
                <div className="rounded-lg bg-sky-50 p-2"><b className="block text-sm">{fmtNum(all.ispa?.summary?.laki_laki)}</b>laki-laki</div>
                <div className="rounded-lg bg-pink-50 p-2"><b className="block text-sm">{fmtNum(all.ispa?.summary?.perempuan)}</b>perempuan</div>
              </div>
            </>
          ) : (
            <Empty text="Data ISPA belum tersedia" />
          )}
        </Card>

        {/* Penyakit lainnya */}
        <Card
          title="Penyakit Lainnya Terkait Asap"
          icon={Stethoscope}
          source={`${SOURCE_CREDITS.sheet} (tab DATA PENYAKIT LAINNYA)`}
          updated={sheetUpdated}
          note={penyakitMissing.length ? `Belum ada data penyakit lainnya untuk: ${penyakitMissing.join(', ')}` : undefined}
        >
          {byPenyakit.length ? (
            <div className="space-y-3">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPenyakit} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="penyakit" width={190} fontSize={10.5} />
                    <Tooltip formatter={tooltipFmt} />
                    <Bar dataKey="jumlah" name="Kasus" fill="#DB2777" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={penyakitProv} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="provinsi" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={tooltipFmt} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {penyakitList.map((p, i) => (
                      <Bar key={p} dataKey={titleCase(p)} stackId="p" fill={COLORS[i % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <Empty text="Data penyakit lainnya belum tersedia" />
          )}
        </Card>

        {/* ISPU */}
        <Card title="Kualitas Udara Stasiun ISPU" icon={Wind} source={SOURCE_CREDITS.ispu} updated={all.ispu?.update_text || sheetUpdated}>
          {ispuRows.length ? (
            <div className="space-y-3">
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ispuKat} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="kategori" fontSize={10.5} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip formatter={tooltipFmt} />
                    <Bar dataKey="jumlah" name="Jumlah stasiun" radius={[6, 6, 0, 0]}>
                      {ispuKat.map((k: any) => (
                        <Cell key={k.kategori} fill={k.hex} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="py-2 px-2">Stasiun</th>
                      <th className="py-2 px-2">Provinsi</th>
                      <th className="py-2 px-2 text-right">ISPU</th>
                      <th className="py-2 px-2">Kategori</th>
                      <th className="py-2 px-2">Param.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ispuShowAll ? ispuRows : ispuRows.slice(0, 12)).map((r: any) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-1.5 px-2 font-bold text-slate-800">{r.stasiun}</td>
                        <td className="py-1.5 px-2 text-slate-600">{r.provinsi}</td>
                        <td className="py-1.5 px-2 text-right font-black">{r.data_tersedia ? fmtNum(r.nilai_ispu) : '-'}</td>
                        <td className="py-1.5 px-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.data_tersedia ? r.warna_hex || ispuColor(r.nilai_ispu, legendIspu) : '#94A3B8' }} />
                            {r.kategori || 'Tidak ada data'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-500">{r.parameter_kritis || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ispuRows.length > 12 && (
                <button type="button" onClick={() => setIspuShowAll(!ispuShowAll)} className="text-xs font-bold text-teal-700 hover:underline">
                  {ispuShowAll ? 'Tampilkan 12 teratas' : `Lihat semua ${ispuRows.length} stasiun`}
                </button>
              )}
            </div>
          ) : (
            <Empty text="Data ISPU belum tersedia" />
          )}
        </Card>

        {/* Hotspot */}
        <Card
          title="Titik Panas (Hotspot) NASA FIRMS"
          icon={Flame}
          source={hs?.atribusi?.join(' ') || SOURCE_CREDITS.firms}
          updated={dataDukungUpdated(hs || hsPts)}
          note="Satu titik = satu deteksi piksel panas satelit, bukan satu kejadian kebakaran; api yang sama bisa terdeteksi beberapa satelit."
        >
          {hsProv.length ? (
            <div className="space-y-3">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hsProv} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="provinsi" fontSize={10.5} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={tooltipFmt} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Tinggi" stackId="h" fill="#DC2626" />
                    <Bar dataKey="Sedang" stackId="h" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {hsTanggal.length > 1 && (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hsTanggal} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="tanggal" fontSize={10.5} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={tooltipFmt} />
                      <Line type="monotone" dataKey="jumlah" name="Deteksi per hari (WIB)" stroke="#DC2626" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <Empty text="Ringkasan titik panas belum tersedia. Pastikan URL API GAS (/exec) versi data dukung sudah dipasang." />
          )}
        </Card>

        {/* Kualitas udara model */}
        <Card
          title="Kualitas Udara Model per Kab/Kota (US AQI)"
          icon={Wind}
          source={udara?.atribusi?.join(' ') || SOURCE_CREDITS.openmeteo}
          updated={dataDukungUpdated(udara)}
          note="Nilai model CAMS (~40 km), bukan pengukuran stasiun; pelengkap ISPU di wilayah tanpa stasiun."
        >
          {udaraWorst.length ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {udaraWorst.map((r: any, i: number) => (
                  <div key={`${r.nama_lokasi}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-[11.5px]">
                    <span className="font-bold text-slate-800 truncate">
                      {i + 1}. {r.kabupaten} <span className="text-slate-500 font-semibold">({shortProv(r.provinsi)})</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-500">PM2.5 {fmtNum(r.pm2_5, 1)}</span>
                      <span className="px-2 py-0.5 rounded-full text-white font-black" style={{ background: r.warna_aqi_hex || aqiColor(r.us_aqi) }}>
                        AQI {fmtNum(r.us_aqi)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {udaraProv.length > 0 && (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={udaraProv} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="provinsi" fontSize={10.5} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: any) => `${fmtNum(v, 1)} ug/m3`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="PM2.5 rata-rata" fill="#64748B" />
                      <Bar dataKey="PM2.5 maks" fill="#7F1D1D" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <Empty text="Data kualitas udara model belum tersedia. Pastikan URL API GAS (/exec) versi data dukung sudah dipasang." />
          )}
        </Card>

        {/* Logistik */}
        <Card title="Distribusi Logistik Kesehatan" icon={Package} source={`${SOURCE_CREDITS.sheet} (tab LOGISTIK DINKES & LOGISTIK PUSKRIS)`} updated={sheetUpdated} note="Jumlah dijumlahkan per jenis + satuan; satuan berbeda tidak digabung.">
          {logJenis.length ? (
            <div className="space-y-3">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={logJenis} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <XAxis type="number" scale="log" domain={[1, 'auto']} allowDataOverflow fontSize={10.5} tickFormatter={(v) => fmtNum(v)} />
                    <YAxis type="category" dataKey="jenis" width={190} fontSize={10} />
                    <Tooltip formatter={tooltipFmt} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Dinkes" fill="#0F766E" />
                    <Bar dataKey="Puskris" fill="#EA580C" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {(['all', 'Dinkes', 'Puskris'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setLogFilter(k)} className={`px-2.5 py-1 rounded-lg border font-bold ${logFilter === k ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                    {k === 'all' ? 'Semua sumber' : k}
                  </button>
                ))}
                <select value={logProv} onChange={(e) => setLogProv(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 font-semibold">
                  <option value="semua">Semua provinsi</option>
                  {logProvOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-slate-50 sticky top-0"><tr className="text-left text-slate-600"><th className="py-2 px-2">Sumber</th><th className="py-2 px-2">Provinsi</th><th className="py-2 px-2">Jenis</th><th className="py-2 px-2 text-right">Jumlah</th></tr></thead>
                  <tbody>
                    {logFiltered.map((r: any, i: number) => (
                      <tr key={r.id || i} className="border-t border-slate-100">
                        <td className="py-1.5 px-2">{r.src}</td>
                        <td className="py-1.5 px-2 text-slate-600">{r.provinsi}</td>
                        <td className="py-1.5 px-2 font-bold">{r.jenis_logistik}{r.buffer_stock ? ' (buffer stock)' : ''}</td>
                        <td className="py-1.5 px-2 text-right font-black">{fmtNum(r.jumlah)} {r.satuan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Empty text="Data logistik belum tersedia" />
          )}
        </Card>

        {/* SDMK */}
        <Card title="SDMK Daerah yang Digerakkan" icon={Users} source={`${SOURCE_CREDITS.sheet} (tab SDMK DAERAH DIGERAKKAN)`} updated={sheetUpdated} note="Sheet hanya memuat jumlah total per provinsi dan daftar jenis tenaga (tanpa rincian jumlah per profesi).">
          {sdmkRows.length ? (
            <div className="space-y-3">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdmkRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="provinsiShort" fontSize={10.5} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={tooltipFmt} />
                    <Bar dataKey="jumlah" name="SDMK" fill="#0D9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {sdmkRows.map((r: any) => (
                  <div key={r.id} className="text-[11px]">
                    <span className="font-black text-slate-800">{r.provinsi}</span> <span className="text-slate-500">({fmtNum(r.jumlah)})</span>:{' '}
                    {(r.jenis_tenaga || []).map((j: string) => (
                      <span key={j} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-100 text-teal-900 font-semibold">{j}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="Data SDMK belum tersedia" />
          )}
        </Card>

        {/* Upaya */}
        <Card title="Upaya Kesehatan (Kemenkes & Dinkes)" icon={ClipboardList} source={`${SOURCE_CREDITS.sheet} (tab UPAYA)`} updated={sheetUpdated}>
          {upayaRows.length ? (
            <div className="space-y-3">
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={upayaPerWilayah} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="wilayah" fontSize={10} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip formatter={tooltipFmt} />
                    <Bar dataKey="jumlah" name="Jumlah upaya" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <select value={upInstansi} onChange={(e) => setUpInstansi(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 font-semibold">
                  <option value="semua">Semua instansi</option>
                  {upInstansiOpts.map((p) => (<option key={p} value={p}>{titleCase(p)}</option>))}
                </select>
                <select value={upWilayah} onChange={(e) => setUpWilayah(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 font-semibold">
                  <option value="semua">Semua wilayah</option>
                  {upWilayahOpts.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
                <label className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200">
                  <Search className="h-3 w-3 text-slate-400" />
                  <input value={upQ} onChange={(e) => setUpQ(e.target.value)} placeholder="Cari upaya..." className="outline-none w-32" />
                </label>
                <span className="self-center text-slate-500 font-semibold">{upFiltered.length} upaya</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                {upFiltered.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-slate-100 p-2 text-[11.5px]">
                    <div className="flex flex-wrap gap-1.5 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${r.level === 'pusat' ? 'bg-teal-700 text-white' : 'bg-orange-100 text-orange-900'}`}>{titleCase(r.instansi)}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{r.wilayah}</span>
                    </div>
                    <div className="text-slate-800 leading-snug">{r.upaya}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="Data upaya belum tersedia" />
          )}
        </Card>
      </div>
    </section>
  )
}
