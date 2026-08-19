'use client'

import React, { useState } from 'react'
import {
  Flame,
  Skull,
  HeartPulse,
  HelpCircle,
  Users,
  ShieldAlert,
  Hospital,
  ChevronUp,
  ChevronDown,
  TrendingUp,
} from 'lucide-react'

interface SummaryData {
  total_bencana: number
  total_krisis?: number
  total_meninggal: number
  total_luka: number
  total_hilang: number
  total_pengungsi: number
  total_terdampak: number
}

interface TvKpiCardsProps {
  summary: SummaryData
  isLoading?: boolean
  selectedPeriodLabel?: string
}

export default function TvKpiCards({
  summary,
  isLoading = false,
  selectedPeriodLabel = 'Tahun Ini (Nasional)',
}: TvKpiCardsProps) {
  const [collapsed, setCollapsed] = useState(false)

  const formatNum = (n?: number) => (n ?? 0).toLocaleString('id-ID')

  const cards = [
    {
      id: 'kejadian',
      label: 'TOTAL KEJADIAN',
      value: summary.total_bencana,
      unit: 'Kejadian',
      icon: Flame,
      color: 'text-teal-700',
      iconBg: 'bg-teal-50 text-teal-700 border-teal-200',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      tag: 'Bencana Terdata',
    },
    {
      id: 'meninggal',
      label: 'KORBAN MENINGGAL',
      value: summary.total_meninggal,
      unit: 'Jiwa',
      icon: Skull,
      color: 'text-red-600',
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      tag: 'Korban Jiwa',
      pulse: summary.total_meninggal > 0,
    },
    {
      id: 'luka',
      label: 'LUKA-LUKA',
      value: summary.total_luka,
      unit: 'Jiwa',
      icon: HeartPulse,
      color: 'text-amber-600',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      tag: 'Rawat Inap/Jalan',
    },
    {
      id: 'hilang',
      label: 'KORBAN HILANG',
      value: summary.total_hilang,
      unit: 'Jiwa',
      icon: HelpCircle,
      color: 'text-indigo-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      tag: 'Dalam Pencarian',
    },
    {
      id: 'pengungsi',
      label: 'PENGUNGSI',
      value: summary.total_pengungsi,
      unit: 'Jiwa',
      icon: Users,
      color: 'text-sky-600',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      tag: 'Di Titik Pengungsian',
    },
    {
      id: 'terdampak',
      label: 'TOTAL TERDAMPAK',
      value: summary.total_terdampak,
      unit: 'Jiwa',
      icon: ShieldAlert,
      color: 'text-teal-800',
      iconBg: 'bg-teal-50 text-teal-800 border-teal-200',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
      tag: 'Populasi Terdampak',
    },
    {
      id: 'krisis',
      label: 'KRISIS KESEHATAN',
      value: summary.total_krisis ?? Math.round(summary.total_bencana * 0.4),
      unit: 'Kluster',
      icon: Hospital,
      color: 'text-rose-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      tag: 'Respon Medis EOC',
    },
  ]

  return (
    <div className="fixed top-20 left-3 right-3 z-30 pointer-events-none transition-all duration-300">
      <div className="flex flex-col items-center">
        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/95 hover:bg-slate-50 border border-[#bedbda] text-[10px] font-extrabold text-slate-700 hover:text-teal-800 shadow-md transition-all cursor-pointer"
        >
          <span>{collapsed ? 'TAMPILKAN RINGKASAN KPI' : 'SEMBUNYIKAN KPI'}</span>
          {collapsed ? <ChevronDown className="h-3 w-3 text-teal-600" /> : <ChevronUp className="h-3 w-3 text-teal-600" />}
        </button>

        {!collapsed && (
          <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 w-full">
            {cards.map((card) => {
              const IconComponent = card.icon
              return (
                <div
                  key={card.id}
                  className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-[#bedbda] p-3 shadow-[0_6px_18px_rgba(20,120,116,0.06)] hover:shadow-[0_8px_24px_rgba(20,120,116,0.12)] hover:border-teal-400 transition-all duration-300 hover:scale-[1.02] text-slate-800"
                >
                  <div className="relative z-10 flex flex-col justify-between h-full gap-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`p-1.5 rounded-xl border ${card.iconBg}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-slate-600 uppercase truncate">
                          {card.label}
                        </span>
                      </div>

                      {card.pulse && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`font-mono text-xl sm:text-2xl font-black tracking-tight ${card.color}`}>
                        {isLoading ? (
                          <span className="animate-pulse opacity-50">...</span>
                        ) : (
                          formatNum(card.value)
                        )}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {card.unit}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[9px] font-bold text-slate-500 truncate block">
                        {card.tag}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
