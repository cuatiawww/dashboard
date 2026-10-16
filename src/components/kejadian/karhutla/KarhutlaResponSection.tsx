'use client'

import React, { useMemo, useState } from 'react'
import { CheckCircle2, Package, ChevronDown, ChevronUp, ShieldCheck, Search } from 'lucide-react'
import { fmtNum, toNum, titleCase, SOURCE_CREDITS, fmtUpdated } from './karhutlaUtils'

interface KarhutlaResponSectionProps {
  eventData: any
}

// Seluruh isi section ini berasal dari API (type=upaya, logistik_dinkes, logistik_puskris).
// Tidak ada daftar/angka cadangan statis: jika API kosong, ditampilkan keterangan "belum ada data".
export default function KarhutlaResponSection({ eventData }: KarhutlaResponSectionProps) {
  const detail = eventData?.detailData || eventData || {}
  const all = useMemo(() => detail.karhutla?.all || eventData?.karhutla?.all || {}, [detail, eventData])
  const upayaPayload = useMemo(() => all.upaya || detail.karhutla_upaya || {}, [all, detail])
  const dinkes = useMemo(() => all.logistik?.dinkes || detail.karhutla_logistik_dinkes || {}, [all, detail])
  const puskris = useMemo(() => all.logistik?.puskris || detail.karhutla_logistik_puskris || {}, [all, detail])
  const updated = fmtUpdated(all.updated_at || detail.updated_at)

  const upayaList: any[] = useMemo(() => (Array.isArray(upayaPayload.data) ? upayaPayload.data : []), [upayaPayload])
  const [expandedUpaya, setExpandedUpaya] = useState(false)
  const [instansi, setInstansi] = useState('semua')
  const [wilayah, setWilayah] = useState('semua')
  const [q, setQ] = useState('')

  const instansiOpts = useMemo(() => {
    const m: Record<string, number> = {}
    upayaList.forEach((u) => (m[u.instansi] = (m[u.instansi] || 0) + 1))
    return Object.entries(m)
  }, [upayaList])
  const wilayahOpts = useMemo(() => {
    const m: Record<string, number> = {}
    upayaList.forEach((u) => (m[u.wilayah] = (m[u.wilayah] || 0) + 1))
    return Object.entries(m)
  }, [upayaList])

  const filteredUpaya = upayaList.filter(
    (u) =>
      (instansi === 'semua' || u.instansi === instansi) &&
      (wilayah === 'semua' || u.wilayah === wilayah) &&
      (!q.trim() || String(u.upaya || '').toLowerCase().includes(q.toLowerCase()))
  )

  // Logistik: total per jenis + satuan, gabungan Dinkes & Puskris
  const logistikJenis = useMemo(() => {
    const m: Record<string, any> = {}
    const add = (arr: any[], src: string) =>
      (arr || []).forEach((r: any) => {
        const key = `${r.jenis_logistik}|${r.satuan || '-'}`
        if (!m[key]) m[key] = { jenis: r.jenis_logistik, satuan: r.satuan || '-', total: 0, sumber: new Set<string>(), provinsi: new Set<string>() }
        m[key].total += toNum(r.jumlah)
        m[key].sumber.add(src)
        if (r.provinsi) m[key].provinsi.add(r.provinsi)
      })
    add(dinkes.data, 'Dinkes Provinsi')
    add(puskris.data, 'Puskris Kemenkes')
    return Object.values(m).sort((a: any, b: any) => b.total - a.total)
  }, [dinkes, puskris])

  const logistikProvCount = useMemo(() => {
    const s = new Set<string>()
    ;[...(dinkes.data || []), ...(puskris.data || [])].forEach((r: any) => r.provinsi && s.add(r.provinsi))
    return s.size
  }, [dinkes, puskris])

  const upayaProvCount = wilayahOpts.filter(([w]) => String(w).toLowerCase() !== 'nasional').length

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-1">
        <h4 className="text-xl sm:text-2xl font-black text-slate-900 m-0">Respon Dinkes &amp; EOC Kemenkes RI</h4>
        <p className="text-sm sm:text-base text-slate-600 font-normal mt-1 mb-0">
          Upaya kesehatan dan distribusi logistik dari spreadsheet karhutla: {fmtNum(upayaList.length)} upaya di {fmtNum(upayaProvCount)} provinsi
          {wilayahOpts.some(([w]) => String(w).toLowerCase() === 'nasional') ? ' + tingkat nasional' : ''}, logistik ke {fmtNum(logistikProvCount)} provinsi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Upaya */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50/50 to-white p-5 flex flex-col shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-teal-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <span className="text-xs font-black uppercase tracking-wider text-teal-950">Upaya Penanggulangan</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-700 text-white">
              {fmtNum(filteredUpaya.length)}
              {filteredUpaya.length !== upayaList.length ? ` / ${fmtNum(upayaList.length)}` : ''} Upaya
            </span>
          </div>

          {upayaList.length ? (
            <>
              <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                <select value={instansi} onChange={(e) => setInstansi(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 font-semibold bg-white">
                  <option value="semua">Semua instansi ({upayaList.length})</option>
                  {instansiOpts.map(([k, n]) => (<option key={k} value={k}>{titleCase(k)} ({n})</option>))}
                </select>
                <select value={wilayah} onChange={(e) => setWilayah(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 font-semibold bg-white">
                  <option value="semua">Semua wilayah</option>
                  {wilayahOpts.map(([k, n]) => (<option key={k} value={k}>{k} ({n})</option>))}
                </select>
                <label className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white">
                  <Search className="h-3 w-3 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari upaya..." className="outline-none w-28" />
                </label>
              </div>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 flex-1">
                {(expandedUpaya ? filteredUpaya : filteredUpaya.slice(0, 6)).map((u: any) => (
                  <div key={u.id} className="flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-bold text-teal-900">[{titleCase(u.instansi)} - {u.wilayah}]</span> {u.upaya}
                    </span>
                  </div>
                ))}
                {filteredUpaya.length === 0 && <div className="text-xs text-slate-500">Tidak ada upaya yang cocok dengan filter.</div>}
              </div>
              {filteredUpaya.length > 6 && (
                <button type="button" onClick={() => setExpandedUpaya(!expandedUpaya)} className="mt-3 pt-2 border-t border-teal-100 text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center justify-center gap-1 cursor-pointer">
                  <span>{expandedUpaya ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${filteredUpaya.length} Upaya)`}</span>
                  {expandedUpaya ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500 font-semibold">Belum ada data upaya dari API.</div>
          )}
        </div>

        {/* Logistik */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-5 flex flex-col shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-700" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-950">Distribusi Logistik</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white">{fmtNum(logistikJenis.length)} jenis</span>
          </div>
          {logistikJenis.length ? (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 flex-1">
              {logistikJenis.map((item: any) => (
                <div key={`${item.jenis}-${item.satuan}`} className="p-2.5 rounded-xl bg-white border border-amber-100/90 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{item.jenis}</span>
                    <span className="text-amber-800 font-black">{fmtNum(item.total)} {item.satuan}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-1 gap-2">
                    <span>{Array.from(item.sumber).join(' + ')}</span>
                    <span className="text-right">{item.provinsi.size} provinsi</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-semibold">Belum ada data logistik dari API.</div>
          )}
          <div className="mt-3 pt-2 border-t border-amber-100 text-[10.5px] text-amber-900 font-semibold">
            Jumlah dijumlahkan per jenis + satuan (satuan berbeda tidak digabung).
          </div>
        </div>
      </div>

      <p className="text-[10.5px] text-slate-500 m-0">
        Sumber: {SOURCE_CREDITS.sheet} (tab UPAYA, LOGISTIK DINKES, LOGISTIK PUSKRIS) | Pembaruan: {updated}
      </p>
    </article>
  )
}
