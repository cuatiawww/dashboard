'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/authStore'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Download,
  Flame,
  LogOut,
  MapPinned,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
  X,
  RefreshCw,
  Clock,
  LayoutGrid,
  // PANTAUAN icons
  Shield,
  Newspaper,
  Wind,
  Globe,
  TreePine,
  Cloud,
  Activity,
  Mountain,
  Layers,
  Users,
  Key,
  FileText,
  Info,
} from 'lucide-react'
import { buildApiUrl } from '@/lib/utils/api'
import { useHeaderStore } from '@/lib/headerStore'


type DashboardHeaderProps = {
  onToggleSidebar: () => void
}

type DashboardSidebarProps = {
  open: boolean
  onClose: () => void
}

type SidebarMenuItem = {
  label: string
  href: string
  icon: any
  isExternal?: boolean
}

type SidebarMenuGroup = {
  title: string
  items: SidebarMenuItem[]
  collapsible?: boolean
}

const sidebarMenu: SidebarMenuGroup[] = [
  {
    title: 'DASHBOARD EOC',
    items: [
      { label: 'DASHBOARD EOC', href: '/', icon: Flame },
    ],
  },
  {
    title: 'PANTAUAN',
    collapsible: true,
    items: [
      { label: 'PANTAUAN BNPB', href: '/pantauan/bnpb', icon: Shield },
      { label: 'PANTAUAN MEDIA', href: '/pantauan/media', icon: Newspaper },
      { label: 'PERGERAKAN ANGIN', href: '/pantauan/angin', icon: Wind },
      { label: 'PENYAKIT MENULAR DUNIA', href: '/pantauan/penyakit', icon: Globe },
      { label: 'HOTSPOT KARHUTLA', href: '/pantauan/karhutla', icon: TreePine },
      { label: 'CUACA', href: '/pantauan/cuaca', icon: Cloud },
      { label: 'GEMPA BUMI', href: '/pantauan/gempa', icon: Activity },
      { label: 'GUNUNG BERAPI', href: '/pantauan/gunung-berapi', icon: Mountain },
      { label: 'PERGERAKAN TANAH', href: '/pantauan/tanah', icon: Layers },
    ],
  },
  {
    title: 'AKSES SISTEM',
    items: [
      {
        label: 'AKSES SISTEM',
        href: '',
        icon: LayoutGrid,
        isExternal: true,
      },
    ],
  },
  {
    title: 'PENGELOLAAN',
    collapsible: true,
    items: [
      { label: 'VERIFIKASI DATA', href: 'faskes/verifikasi', icon: ShieldCheck, isExternal: true },
      { label: 'PENGATURAN', href: '/settings', icon: Settings },
    ],
  },
]

const notificationsData = [
  {
    id: 1,
    title: 'Krisis Banjir Bandang',
    description: 'Terjadi banjir bandang di Bandung. 12 korban luka, faskes tergenang.',
    time: '2m',
    icon: Flame,
    iconBg: 'bg-red-50 text-red-600 border-red-100',
    unread: true,
  },
  {
    id: 2,
    title: 'Siaga Gempa Bumi',
    description: 'Gempa M 5.6 di Karangasem, Bali. 5 korban jiwa dilaporkan.',
    time: '15m',
    icon: ShieldCheck,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    unread: true,
  },
  {
    id: 3,
    title: 'Peringatan KLB Diare',
    description: 'Kasus diare Tangerang melebihi ambang batas normal.',
    time: '1j',
    icon: Bell,
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    unread: true,
  },
  {
    id: 4,
    title: 'Evakuasi Tanah Longsor',
    description: 'Evakuasi pengungsi mandiri sedang berlangsung di posko Bogor.',
    time: '3j',
    icon: MapPinned,
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    unread: false,
  },
  {
    id: 5,
    title: 'Logistik Darurat NTT',
    description: 'Faskes melaporkan kekurangan stok obat-obatan darurat.',
    time: '1h',
    icon: Settings,
    iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
    unread: false,
  },
]

function getIconComponent(iconName: string) {
  const name = iconName?.toLowerCase() || ''
  if (name.includes('shield') || name.includes('security') || name.includes('bnpb')) return Shield
  if (name.includes('newspaper') || name.includes('media') || name.includes('news')) return Newspaper
  if (name.includes('wind') || name.includes('angin')) return Wind
  if (name.includes('globe') || name.includes('penyakit') || name.includes('world')) return Globe
  if (name.includes('tree') || name.includes('karhutla') || name.includes('forest')) return TreePine
  if (name.includes('cloud') || name.includes('cuaca') || name.includes('weather')) return Cloud
  if (name.includes('activity') || name.includes('gempa') || name.includes('seismic')) return Activity
  if (name.includes('mountain') || name.includes('gunung')) return Mountain
  if (name.includes('layers') || name.includes('tanah') || name.includes('ground')) return Layers
  if (name.includes('layout') || name.includes('dashboard')) return Flame
  if (name.includes('user') || name.includes('users') || name.includes('profile')) return Users
  if (name.includes('gear') || name.includes('settings') || name.includes('pengaturan')) return Settings
  if (name.includes('lock') || name.includes('key')) return Key
  if (name.includes('file') || name.includes('document')) return FileText
  if (name.includes('help') || name.includes('info')) return Info
  return LayoutGrid
}

const isLocalRoute = (route: string) => {
  const r = route?.toLowerCase() || ''
  return r.includes('pantauan/') || r === '/' || r === ''
}

const normalizeLocalRoute = (route: string) => {
  const r = route?.toLowerCase() || ''
  if (r.includes('pantauan/bnpb')) return '/pantauan/bnpb'
  if (r.includes('pantauan/media')) return '/pantauan/media'
  if (r.includes('pantauan/angin')) return '/pantauan/angin'
  if (r.includes('pantauan/penyakit')) return '/pantauan/penyakit'
  if (r.includes('pantauan/karhutla')) return '/pantauan/karhutla'
  if (r.includes('pantauan/cuaca')) return '/pantauan/cuaca'
  if (r.includes('pantauan/gempa')) return '/pantauan/gempa'
  if (r.includes('pantauan/gunung-berapi')) return '/pantauan/gunung-berapi'
  if (r.includes('pantauan/tanah')) return '/pantauan/tanah'
  return '/'
}

const buildExternalRoute = (route: string, token: string | null) => {
  const backendUrl = process.env.NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL || 'http://localhost/sipkk-baru'
  if (route.startsWith('http')) return route
  const cleanRoute = route.trim().replace(/^\/+/, '')
  if (token) {
    return `${backendUrl}/index.php?r=site/sso-login&token=${token}&redirect=${encodeURIComponent(cleanRoute)}`
  }
  return `${backendUrl}/index.php?r=${cleanRoute}`
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { token, user, isAuthenticated, isGuest } = useAuthStore()

  // Track expanded groups
  const isPantauanActive = pathname.startsWith('/pantauan')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    'DASHBOARD EOC': true,
    'PANTAUAN': true,
    'AKSES SISTEM': true,
    'PENGELOLAAN': true,
  }))

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

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
        className={`fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-slate-100 bg-white text-slate-800 shadow-[2px_0_12px_rgba(0,0,0,0.03)] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[4px] bg-[#047D78]" />
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
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
              <p className="text-sm font-bold tracking-wide text-slate-800">DASHBOARD EOC</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Kementerian Kesehatan RI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="h-[calc(100vh-80px)] space-y-5 overflow-y-auto px-3 py-4">
          {sidebarMenu.map((group) => {
            if (group.title === 'AKSES SISTEM') {
              const isMasyarakat = user?.level_name?.toLowerCase().includes('masyarakat') || false
              const isTamu = !isAuthenticated || isGuest
              if (isMasyarakat || isTamu) {
                return null
              }
            }

            const isExpanded = expandedGroups[group.title] ?? false

            return (
              <section key={group.title}>
                {/* Group header — clickable to toggle if collapsible */}
                {group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className="flex w-full items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 transition text-slate-800"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      {group.title}
                    </p>
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    }
                  </button>
                ) : (
                  <p className="px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    {group.title}
                  </p>
                )}

                {/* Items — hidden if collapsible and not expanded */}
                {(!group.collapsible || isExpanded) && (
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isLocal = !item.isExternal
                      const targetHref = isLocal ? item.href : buildExternalRoute(item.href, token)
                      const active = isLocal && pathname === targetHref

                      if (!isLocal) {
                        return (
                          <a
                            key={item.label}
                            href={targetHref}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.03em] text-slate-600 hover:bg-slate-50 hover:text-[#047D78] transition"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </a>
                        )
                      }

                      return (
                        <Link
                          key={item.label}
                          href={targetHref}
                          onClick={(event) => {
                            if (item.href === '#') event.preventDefault()
                            else onClose()
                          }}
                          className={`flex w-full items-center gap-3 py-2 px-3 text-xs font-semibold uppercase tracking-[0.03em] transition ${
                            active
                              ? 'bg-teal-50/70 text-[#047D78] font-bold border-l-4 border-[#047D78] rounded-r-xl rounded-l-none'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-[#047D78]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export default function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  
  const { user, logout, isAuthenticated } = useAuthStore()
  const { title: headerTitle, description: headerDesc, lastUpdated, sourceLabel, sourceUrl } = useHeaderStore()
  const [activeRegion, setActiveRegion] = useState('NASIONAL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.dispatchEvent(new CustomEvent('sipkk-refresh-data'))
    setTimeout(() => {
      setIsRefreshing(false)
    }, 850)
  }


  useEffect(() => {
    if (user?.wilayah_scope) {
      const scope = user.wilayah_scope
      if (scope.mode === 'kabupaten' && scope.kabupaten?.label) {
        setActiveRegion(`${scope.kabupaten.label.toUpperCase()}, PROV. ${scope.provinsi?.label?.toUpperCase()}`)
      } else if (scope.mode === 'provinsi' && scope.provinsi?.label) {
        setActiveRegion(`PROV. ${scope.provinsi.label.toUpperCase()}`)
      }
    }

    const handleRegionChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setActiveRegion(customEvent.detail)
    }

    window.addEventListener('sipkk-region-changed', handleRegionChange)
    return () => {
      window.removeEventListener('sipkk-region-changed', handleRegionChange)
    }
  }, [user])
  const initialName = isAuthenticated ? (user?.nama_lengkap || user?.username || 'Pengguna') : 'Tamu (Guest)'
  const roleName = isAuthenticated ? (user?.level_name || (user?.level_user_id === 1 ? 'Super Administrator' : 'Admin')) : 'Akses Publik'
  const userEmail = isAuthenticated ? (user?.email || `${user?.username || 'admin'}@faskes.go.id`) : 'guest@faskes.go.id'
  const accessLabel = isAuthenticated ? (user?.wilayah_scope?.access_label || 'Pusat pemantauan nasional fasilitas kesehatan') : 'Pusat pemantauan publik fasilitas kesehatan'

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

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false)
    }

    if (notifOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [notifOpen])

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
                <h1 className="max-w-[720px] text-2xl font-extrabold leading-tight tracking-normal text-slate-900 md:text-3xl uppercase">
                  {headerTitle}
                </h1>
                <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-slate-600 md:text-base">
                  {headerDesc || `Analisis spasial kejadian bencana dan dampaknya terhadap sumber daya kesehatan secara real-time di wilayah ${activeRegion}.`}
                </p>
                {(lastUpdated || (sourceLabel && sourceUrl)) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold">
                    {lastUpdated && (
                      <span>Diperbarui: {lastUpdated}</span>
                    )}
                    {lastUpdated && sourceLabel && <span className="text-slate-300">|</span>}
                    {sourceLabel && sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 hover:bg-teal-100 transition uppercase tracking-wider"
                      >
                        {sourceLabel}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700 hover:shadow-md disabled:cursor-wait"
                aria-label="Refresh Data"
                title="Refresh Data"
              >
                <RefreshCw className={`h-[18px] w-[18px] text-slate-600 ${isRefreshing ? 'animate-spin text-teal-650' : ''}`} />
              </button>
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-700 hover:shadow-md"
                  aria-label="Notifikasi"
                >
                  <Bell className="h-[19px] w-[19px]" />
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-teal-600 px-1 text-[10px] font-bold text-white">
                    5
                  </span>
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-14 z-30 w-[320px] sm:w-[380px] rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-md p-4 shadow-[0_12px_40px_rgba(15,118,110,0.15)] flex flex-col animate-in slide-in-from-top-2 duration-155">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">Notifikasi</span>
                        <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[9px] font-extrabold text-teal-700 uppercase tracking-wide">
                          5 Baru
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* List */}
                    <div className="mt-2 divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-1 no-scrollbar space-y-1">
                      {notificationsData.map((notif) => {
                        const NotifIcon = notif.icon;
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 py-2.5 px-2 transition hover:bg-slate-50/80 rounded-xl cursor-pointer ${
                              notif.unread ? 'bg-teal-50/10' : ''
                            }`}
                          >
                            {/* Left: Icon */}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${notif.iconBg}`}>
                              <NotifIcon className="h-4.5 w-4.5" />
                            </div>

                            {/* Middle: Title & Desc */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-[11px] font-bold text-slate-800 truncate leading-tight ${notif.unread ? 'text-teal-955 font-extrabold' : ''}`}>
                                  {notif.title}
                                </p>
                                {/* Right: Time */}
                                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 whitespace-nowrap pt-0.5 shrink-0">
                                  <Clock className="h-2.5 w-2.5" />
                                  {notif.time}
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500 leading-normal line-clamp-2">
                                {notif.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          alert('Buka halaman detail notifikasi');
                          setNotifOpen(false);
                        }}
                        className="w-full py-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all"
                      >
                        LIHAT SEMUA NOTIFIKASI
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  isAuthenticated ? (
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
                        <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700 transition hover:bg-slate-50">
                          <Settings className="h-4 w-4 text-teal-600" />
                          Pengaturan Akun
                        </Link>
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
                  ) : (
                    <div className="absolute right-0 top-14 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">Akses Pengunjung</p>
                          <p className="text-xs text-slate-500">Silakan login untuk fitur lengkap.</p>
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
                      <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-teal-700">Akses</p>
                        <p className="mt-0.5 text-xs text-slate-600">{accessLabel}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Link 
                          href="/login" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-teal-800"
                        >
                          Masuk (Login)
                        </Link>
                        <Link 
                          href="/register" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-teal-700 shadow-sm transition hover:bg-teal-50"
                        >
                          Daftar Sekarang
                        </Link>
                        <button 
                          type="button" 
                          onClick={() => {
                            logout()
                            setProfileOpen(false)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-red-600 shadow-sm transition hover:bg-red-50"
                        >
                          Keluar Akses Tamu
                        </button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-teal-400/80 via-teal-400/40 to-transparent" />
    </header>
  )
}
