'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  Layers,
  Maximize,
  Minimize,
  RefreshCw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Radio,
} from 'lucide-react'

interface TvTopHudProps {
  onToggleLayers: () => void
  isLayersOpen: boolean
  soundEnabled: boolean
  onToggleSound: () => void
  refreshCountdown: number
  refreshInterval: number
  onManualRefresh: () => void
  isLoading: boolean
  activeSpotlightName?: string | null
  currentTourProvince?: string | null
  autoProvinceTour?: boolean
  onToggleProvinceTour?: () => void
}

export default function TvTopHud({
  onToggleLayers,
  isLayersOpen,
  soundEnabled,
  onToggleSound,
  refreshCountdown,
  refreshInterval,
  onManualRefresh,
  isLoading,
  activeSpotlightName,
  currentTourProvince,
  autoProvinceTour,
  onToggleProvinceTour,
}: TvTopHudProps) {
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Realtime digital clock with seconds
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setTimeStr(`${hours}:${minutes}:${seconds} WIB`)

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      setDateStr(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`)
    }

    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fullscreen state handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Calculate refresh progress percentage
  const refreshPercent = Math.max(0, Math.min(100, ((refreshInterval - refreshCountdown) / refreshInterval) * 100))

  return (
    <header className="fixed top-3 left-3 right-3 z-40 flex items-center justify-between gap-4 pointer-events-none">
      {/* ── Left Branding Section ── */}
      <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-2xl px-4 py-2.5 shadow-[0_8px_24px_rgba(4,125,120,0.09)] text-slate-800">
        <Link
          href="/"
          className="group flex items-center justify-center h-9 w-9 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#047D78] transition-all shadow-xs"
          title="Kembali ke Dashboard Utama"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-extrabold tracking-wider text-sm text-[#047D78]">
              PEMANTAUAN EOC
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              Pusat Krisis Kesehatan • Kementerian Kesehatan RI
            </span>
          </div>
        </div>

        {currentTourProvince ? (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="text-[10px] text-[#047D78] font-extrabold uppercase tracking-wider">Pemantauan Provinsi:</span>
            <span className="text-xs font-black text-[#047D78] bg-teal-50 border border-teal-300 px-2.5 py-0.5 rounded-xl truncate max-w-[220px]">
              {currentTourProvince}
            </span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Cakupan Wilayah:</span>
            <span className="text-xs font-black text-[#047D78] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-xl">
              Nasional (34 Provinsi)
            </span>
          </div>
        )}
      </div>

      {/* ── Middle Live Digital Clock ── */}
      <div className="pointer-events-auto hidden md:flex items-center gap-3 bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-2xl px-5 py-2 shadow-[0_8px_24px_rgba(4,125,120,0.09)] text-slate-800">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#047D78] animate-pulse" />
            <span className="font-mono text-lg font-black tracking-widest text-[#047D78]">
              {timeStr || '--:--:-- WIB'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            {dateStr || 'Memuat waktu...'}
          </span>
        </div>
      </div>

      {/* ── Right Quick Controls Deck ── */}
      <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-[#bedbda] rounded-2xl p-1.5 shadow-[0_8px_24px_rgba(4,125,120,0.09)] text-slate-800">
        {/* Province Tour Toggle (30s) */}
        {onToggleProvinceTour && (
          <button
            type="button"
            onClick={onToggleProvinceTour}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
              autoProvinceTour
                ? 'bg-gradient-to-r from-[#047D78] to-[#00B0AA] text-white shadow-md shadow-teal-700/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={autoProvinceTour ? 'Jeda Rotasi Provinsi 30s' : 'Aktifkan Rotasi Provinsi Otomatis (30s)'}
          >
            <span>{autoProvinceTour ? 'Rotasi 30s: ON' : 'Rotasi 30s: OFF'}</span>
          </button>
        )}

        {/* Auto Refresh with Countdown */}
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isLoading}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#047D78] text-xs font-bold transition-all overflow-hidden shadow-xs"
          title={`Klik untuk refresh sekarang (Auto refresh dalam ${refreshCountdown}s)`}
        >
          {/* Progress bar background indicator */}
          <div
            className="absolute left-0 bottom-0 top-0 bg-teal-200/50 transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${refreshPercent}%` }}
          />
          <RefreshCw className={`h-3.5 w-3.5 text-[#047D78] ${isLoading ? 'animate-spin' : ''}`} />
          <span className="font-mono text-[11px] text-[#047D78] z-10">{refreshCountdown}s</span>
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`flex items-center justify-center h-8 w-8 rounded-xl border transition-all shadow-xs ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
          }`}
          title={soundEnabled ? 'Suara Sirine/Alert Aktif' : 'Suara Dimatikan (Mute)'}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {/* InaRISK / EOC Layers Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleLayers}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all shadow-xs ${
            isLayersOpen
              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
              : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
          }`}
          title="Buka / Tutup Layar InaRISK & Services"
        >
          <Layers className={`h-3.5 w-3.5 ${isLayersOpen ? 'text-white' : 'text-orange-600'}`} />
          <span className="hidden lg:inline">Layer InaRISK</span>
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-[#047D78] transition-all shadow-xs"
          title={isFullscreen ? 'Keluar Fullscreen (Esc)' : 'Tampilan Layar Penuh (F11)'}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
