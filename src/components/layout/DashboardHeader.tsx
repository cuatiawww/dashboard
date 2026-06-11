'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/authStore'
import {
  BarChart3,
  Bell,
  ChevronDown,
  Download,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
  X,
} from 'lucide-react'

type DashboardHeaderProps = {
  onToggleSidebar: () => void
}

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

const sidebarMenu = [
  {
    title: 'Menu Utama',
    items: [
      { label: 'Dashboard Nasional', href: '/', icon: Home },
      { label: 'Dashboard PSC 119', href: '/psc119', icon: BarChart3 },
      { label: 'Sebaran Provinsi', href: '/psc119/jawa-barat', icon: MapPinned },
    ],
  },
  {
    title: 'Pengelolaan',
    items: [
      { label: 'Verifikasi Data', href: '#', icon: ShieldCheck },
      { label: 'Pengaturan', href: '#', icon: Settings },
    ],
  },
]

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px]"
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-teal-300/30 bg-gradient-to-b from-[#0f8f96] via-[#076176] to-[#03384d] text-slate-100 shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[3px] bg-gradient-to-r from-teal-300 via-cyan-200 to-transparent" />
        <div className="flex items-start justify-between gap-3 border-b border-teal-200/20 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/95 p-1.5 shadow-sm">
              <Image
                src="/kemenkes.png"
                alt="Logo Kementerian Kesehatan"
                width={38}
                height={38}
                className="h-auto w-full"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-wide text-white">FASILITAS KESEHATAN</p>
              <p className="mt-0.5 text-[11px] text-teal-50/80">Kementerian Kesehatan RI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="rounded-lg p-1 text-teal-50/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="h-[calc(100vh-80px)] space-y-5 overflow-y-auto px-3 py-4">
          {sidebarMenu.map((group) => (
            <section key={group.title}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                {group.title}
              </p>
              <div className="mt-2 space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = item.href !== '#' && pathname === item.href

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(event) => {
                        if (item.href === '#') event.preventDefault()
                        else onClose()
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold uppercase tracking-[0.03em] transition ${
                        active
                          ? 'bg-white/14 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(94,234,212,0.55)]'
                          : 'text-teal-50/85 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  
  const { user, logout } = useAuthStore()
  const initialName = user?.nama_lengkap || user?.username || 'Admin Pusat'
  const roleName = user?.level_name || (user?.level_user_id === 1 ? 'Super Administrator' : 'Admin')
  const userEmail = user?.email || `${user?.username || 'admin'}@faskes.go.id`
  const accessLabel = user?.wilayah_scope?.access_label || 'Pusat pemantauan nasional fasilitas kesehatan'

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }
  const initials = getInitials(initialName)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false)
    }

    if (profileOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [profileOpen])

  return (
    <header className="w-full border-b-2 border-teal-400/25 bg-white">
      <div className="relative flex min-h-[118px] items-stretch overflow-visible">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-95"
          style={{ backgroundImage: "url('/bg header.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/82 to-white/92" />
        <div className="relative grid w-full gap-5 px-4 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={onToggleSidebar}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-5">
              <Image
                src="/Logo-Kemenkes.png"
                alt="Logo Kemenkes"
                width={170}
                height={62}
                className="h-auto w-[132px] shrink-0 md:w-[168px]"
                priority
              />
              <div className="min-w-0 border-teal-200/80 md:border-l md:pl-5">
                <h1 className="max-w-[720px] text-2xl font-extrabold leading-tight tracking-normal text-slate-900 md:text-3xl">
                  DASHBOARD INDIKATOR PENILAIAN KINERJA FASILITAS KESEHATAN
                </h1>
                <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-slate-600 md:text-base">
                  Pantau perkembangan fasilitas kesehatan di seluruh Indonesia secara real-time.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <button
                type="button"
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700 hover:shadow-md"
                aria-label="Notifikasi"
              >
                <Bell className="h-[19px] w-[19px]" />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-teal-600 px-1 text-[10px] font-bold text-white">
                  5
                </span>
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-xl border border-teal-200 bg-white/95 px-4 text-xs font-bold uppercase tracking-[0.05em] text-teal-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-md"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-teal-600">
                  <Download className="h-4 w-4" />
                </span>
                Unduh Laporan
              </button>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 pr-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-xs font-extrabold text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold uppercase tracking-[0.04em] leading-4 text-slate-900">{initialName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-teal-700">{roleName}</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-14 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-sm font-extrabold text-white">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{initialName}</p>
                          <p className="text-xs text-slate-500">{userEmail}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileOpen(false)}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Tutup"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal-700">Akses</p>
                      <p className="mt-0.5 text-xs text-slate-600">{accessLabel}</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700 transition hover:bg-slate-50">
                        <UserCircle className="h-4 w-4 text-teal-600" />
                        Profil Saya
                      </button>
                      <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700 transition hover:bg-slate-50">
                        <Settings className="h-4 w-4 text-teal-600" />
                        Pengaturan Akun
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          logout()
                          setProfileOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-left text-[13px] font-bold uppercase tracking-[0.03em] text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Keluar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-teal-400/80 via-teal-400/40 to-transparent" />
    </header>
  )
}
