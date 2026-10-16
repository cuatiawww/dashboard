'use client'

import React from 'react'
import { fmtNum, ispuColor, ISPU_LEGEND_DEFAULT } from './karhutlaUtils'

// Pengganti strip tren cuaca/kualitas udara eksternal pada kartu header: ISPU maksimum per provinsi dari API (tab DATA ISPU)
export default function KarhutlaIspuStrip({ karhutla }: { karhutla: any }) {
  const ispu = karhutla?.all?.ispu || {}
  const legend = ispu.legenda?.length ? ispu.legenda : ISPU_LEGEND_DEFAULT
  const rows: any[] = Array.isArray(ispu.by_provinsi) ? ispu.by_provinsi : []
  return (
    <div className="col-span-1 md:col-span-2 2xl:col-span-5 flex flex-col justify-between pl-0 2xl:pl-2 min-w-0">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block truncate">ISPU MAKSIMUM PER PROVINSI (STASIUN KLHK)</span>
        {ispu.update_text && <span className="text-[10px] font-semibold text-slate-500 truncate">{ispu.update_text}</span>}
      </div>
      {rows.length ? (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 w-full flex-1 min-w-0">
          {rows.map((r: any) => {
            const col = ispuColor(r.ispu_maks, legend)
            return (
              <div key={r.provinsi} className="flex flex-col items-center justify-between py-2 px-1 rounded-xl border border-slate-200/90 bg-white/90 min-w-0" title={`${r.provinsi}: ISPU maks ${fmtNum(r.ispu_maks)}, rata-rata ${fmtNum(r.ispu_rata2)}, ${fmtNum(r.jumlah_stasiun)} stasiun`}>
                <span className="text-[10px] font-black uppercase leading-tight text-slate-500 text-center line-clamp-2">{String(r.provinsi).replace(/Kalimantan/i, 'Kal.').replace(/Sumatera/i, 'Sum.')}</span>
                <span className="my-1.5 px-2 py-0.5 rounded-full text-[11px] font-black text-white" style={{ background: col }}>{fmtNum(r.ispu_maks)}</span>
                <span className="text-[9.5px] font-bold text-slate-600 text-center leading-tight line-clamp-2">{r.kategori_maks || '-'}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">{fmtNum(r.jumlah_stasiun)} stasiun</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-xs text-slate-500 font-semibold">Data ISPU belum tersedia.</div>
      )}
    </div>
  )
}
