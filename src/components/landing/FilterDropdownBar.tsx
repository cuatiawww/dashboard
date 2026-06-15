'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe, MapPin, Building2, ChevronDown, Info } from 'lucide-react'
import { useAuthStore, type WilayahScope } from '@/lib/authStore'

type FilterItem = {
  id: string
  icon: 'globe' | 'pin' | 'building'
  sublabel: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
  locked?: boolean
}

export type FilterSummary = {
  cakupan: string
  provinsi: string
  kabkota: string
}

type FilterDropdownBarProps = {
  onSummaryChange?: (summary: FilterSummary) => void
}

const iconStyles: Record<FilterItem['icon'], { bg: string; color: string }> = {
  globe: { bg: 'bg-[#E1F5EE]', color: 'text-[#0F6E56]' },
  pin: { bg: 'bg-[#E6F1FB]', color: 'text-[#185FA5]' },
  building: { bg: 'bg-[#EEEDFE]', color: 'text-[#534AB7]' },
}

function FilterIcon({ icon, className }: { icon: FilterItem['icon']; className?: string }) {
  if (icon === 'globe') return <Globe className={className} />
  if (icon === 'pin') return <MapPin className={className} />
  return <Building2 className={className} />
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function FilterDropdownBar({ onSummaryChange }: FilterDropdownBarProps = {}) {
  const userScope = useAuthStore((state) => state.user?.wilayah_scope)

  // Mulai KOSONG, bukan array statis fallback.
  const [dynamicProvinces, setDynamicProvinces] = useState<Array<{ value: string; label: string }>>([
    { value: 'semua-provinsi', label: 'Semua Provinsi' },
  ])
  const [dynamicKabkota, setDynamicKabkota] = useState<Array<{ value: string; label: string }>>([
    { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
  ])

  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingKabkota, setLoadingKabkota] = useState(false)

  const activeFilterData = useMemo<FilterItem[]>(() => {
    if (!userScope || userScope.mode === 'all') {
      return [
        {
          id: 'cakupan',
          icon: 'globe',
          sublabel: 'Cakupan',
          defaultValue: 'nasional',
          options: [
            { value: 'nasional', label: 'Nasional' },
            { value: 'provinsi', label: 'Provinsi' },
            { value: 'kabupaten-kota', label: 'Kabupaten/Kota' },
          ],
        },
        {
          id: 'provinsi',
          icon: 'pin',
          sublabel: 'Provinsi',
          defaultValue: 'semua-provinsi',
          options: loadingProvinces
            ? [{ value: 'semua-provinsi', label: 'Memuat...' }]
            : dynamicProvinces,
        },
        {
          id: 'kabkota',
          icon: 'building',
          sublabel: 'Kab/Kota',
          defaultValue: 'semua-kabkota',
          options: loadingKabkota
            ? [{ value: 'semua-kabkota', label: 'Memuat...' }]
            : dynamicKabkota,
        },
      ]
    }

    const cakupanValue = userScope.cakupan.value || userScope.mode
    const provinsiValue = userScope.provinsi.id ? String(userScope.provinsi.id) : slugify(userScope.provinsi.label)
    const kabupatenValue = userScope.kabupaten.id ? String(userScope.kabupaten.id) : slugify(userScope.kabupaten.label)
    const kabupatenOptions =
      userScope.mode === 'kabupaten'
        ? [
          {
            value: kabupatenValue,
            label: userScope.kabupaten.label,
          },
        ]
        : [
          { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
          ...(userScope.kabupaten.options || []).map((item) => ({
            value: String(item.id),
            label: item.label,
          })),
        ]

    return [
      {
        id: 'cakupan',
        icon: 'globe',
        sublabel: 'Cakupan',
        defaultValue: cakupanValue,
        locked: userScope.cakupan.locked,
        options: [{ value: cakupanValue, label: userScope.cakupan.label }],
      },
      {
        id: 'provinsi',
        icon: 'pin',
        sublabel: 'Provinsi',
        defaultValue: provinsiValue,
        locked: userScope.provinsi.locked,
        options: [{ value: provinsiValue, label: userScope.provinsi.label }],
      },
      {
        id: 'kabkota',
        icon: 'building',
        sublabel: 'Kab/Kota',
        defaultValue: userScope.mode === 'kabupaten' ? kabupatenValue : 'semua-kabkota',
        locked: userScope.kabupaten.locked,
        options: kabupatenOptions,
      },
    ]
  }, [userScope, dynamicProvinces, dynamicKabkota, loadingProvinces, loadingKabkota])

  const defaultSelected = useMemo(
    () => Object.fromEntries(activeFilterData.map((f) => [f.id, f.defaultValue])),
    [activeFilterData]
  )
  const [selected, setSelected] = useState<Record<string, string>>(defaultSelected)
  const [openId, setOpenId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelected(defaultSelected)
    setOpenId(null)
  }, [defaultSelected])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!userScope || userScope.mode === 'all') {
      const fetchProvinces = async () => {
        setLoadingProvinces(true)
        try {
          const baseUrl = (process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || 'http://localhost/sipkk-baru').replace(/\/+$/, '')
          const res = await fetch(`${baseUrl}/auth/regions-api`)
          const payload = await res.json()
          if (payload?.success && Array.isArray(payload?.data)) {
            const list = [
              { value: 'semua-provinsi', label: 'Semua Provinsi' },
              ...payload.data.map((item: any) => ({
                value: String(item.code || item.id),
                label: item.name,
              })),
            ]
            setDynamicProvinces(list)
          } else {
            setDynamicProvinces([{ value: 'semua-provinsi', label: 'Semua Provinsi' }])
          }
        } catch (err) {
          console.error('Gagal mengambil data provinsi', err)
          setDynamicProvinces([{ value: 'semua-provinsi', label: 'Semua Provinsi' }])
        } finally {
          setLoadingProvinces(false)
        }
      }
      fetchProvinces()
    }
  }, [userScope])

  const selectedProvince = selected['provinsi']

  useEffect(() => {
    if (!userScope || userScope.mode === 'all') {
      if (!selectedProvince || selectedProvince === 'semua-provinsi') {
        setDynamicKabkota([{ value: 'semua-kabkota', label: 'Semua Kab/Kota' }])
        setLoadingKabkota(false)
        return
      }

      const fetchKabkota = async () => {
        setLoadingKabkota(true)
        try {
          const baseUrl = (process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || 'http://localhost/sipkk-baru').replace(/\/+$/, '')
          const res = await fetch(`${baseUrl}/auth/regions-api?province_id=${selectedProvince}`)
          const payload = await res.json()
          if (payload?.success && Array.isArray(payload?.data)) {
            const list = [
              { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
              ...payload.data.map((item: any) => ({
                value: String(item.code || item.id),
                label: item.name,
              })),
            ]
            setDynamicKabkota(list)
          } else {
            setDynamicKabkota([{ value: 'semua-kabkota', label: 'Semua Kab/Kota' }])
          }
        } catch (err) {
          console.error('Gagal mengambil data kabkota', err)
          setDynamicKabkota([{ value: 'semua-kabkota', label: 'Semua Kab/Kota' }])
        } finally {
          setLoadingKabkota(false)
        }
      }
      fetchKabkota()
    }
  }, [selectedProvince, userScope])

  const summaryItems = useMemo(
    () =>
      activeFilterData.map((filter) => {
        const activeOption =
          filter.options.find((option) => option.value === selected[filter.id]) ?? filter.options[0]

        return {
          id: filter.id,
          label: filter.sublabel,
          value: activeOption.label,
        }
      }),
    [activeFilterData, selected]
  )

  const summary = useMemo<FilterSummary>(
    () => ({
      cakupan: summaryItems.find((item) => item.id === 'cakupan')?.value || 'Nasional',
      provinsi: summaryItems.find((item) => item.id === 'provinsi')?.value || 'Semua Provinsi',
      kabkota: summaryItems.find((item) => item.id === 'kabkota')?.value || 'Semua Kab/Kota',
    }),
    [summaryItems]
  )

  useEffect(() => {
    onSummaryChange?.(summary)
  }, [onSummaryChange, summary])

  return (
    <div ref={rootRef}>
      {/* Single unified label */}
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-[#6b7280]">
        Filter Wilayah
      </p>

      {/* Unified pill bar */}
      <div className="flex items-center rounded-2xl border border-[#e5e7eb] bg-white p-1.5">
        {activeFilterData.map((filter, idx) => {
          const activeOption =
            filter.options.find((o) => o.value === selected[filter.id]) ?? filter.options[0]
          const isOpen = openId === filter.id
          const { bg, color } = iconStyles[filter.icon]
          const locked = Boolean(filter.locked)

          return (
            <div key={filter.id} className="relative flex flex-1 items-center">
              {/* Divider between segments */}
              {idx > 0 && (
                <span className="h-7 w-px flex-shrink-0 bg-[#e5e7eb]" aria-hidden="true" />
              )}

              <button
                type="button"
                onClick={() => {
                  if (!locked) setOpenId(isOpen ? null : filter.id)
                }}
                disabled={locked}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={locked ? 'Filter dikunci sesuai wilayah akun' : undefined}
                className={`
                  group flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2
                  transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17b7b2]
                  ${isOpen ? 'bg-[#f3f4f6]' : ''}
                  ${locked ? 'cursor-not-allowed bg-[#f8fafc] opacity-80' : 'hover:bg-[#f9fafb]'}
                `}
              >
                {/* Colored icon badge */}
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}
                  aria-hidden="true"
                >
                  <FilterIcon icon={filter.icon} className={`h-4 w-4 ${color}`} />
                </span>

                {/* Sublabel + value stacked */}
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="text-[10px] font-medium leading-none text-[#9ca3af]">
                    {filter.sublabel}
                  </span>
                  <span className="truncate text-[14px] font-semibold leading-none text-[#111827]">
                    {activeOption.label}
                  </span>
                </span>

                <ChevronDown
                  className={`
                    ml-auto h-4 w-4 flex-shrink-0 text-[#9ca3af]
                    transition-transform duration-200
                    ${isOpen ? 'rotate-180' : ''}
                    ${locked ? 'opacity-30' : ''}
                  `}
                />
              </button>

              {/* Dropdown */}
              {isOpen && (
                <div
                  role="listbox"
                  className="
                    absolute left-0 top-[calc(100%+8px)] z-30 min-w-[180px]
                    overflow-hidden rounded-2xl border border-[#e5e7eb]
                    bg-white shadow-[0_8px_24px_rgba(0,0,0,0.10)]
                    max-h-[300px] overflow-y-auto scrollbar-thin
                  "
                >
                  {filter.options.map((opt) => {
                    const isSelected = opt.value === selected[filter.id]
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelected((prev) => {
                            const next = { ...prev, [filter.id]: opt.value }
                            if (filter.id === 'provinsi') {
                              next['kabkota'] = 'semua-kabkota'
                            }
                            return next
                          })
                          setOpenId(null)
                        }}
                        className={`
                          flex w-full items-center gap-2.5 px-4 py-2.5 text-left
                          text-[13px] transition-colors duration-100
                          ${isSelected
                            ? 'bg-[#f0fdf9] font-semibold text-[#0F6E56]'
                            : 'text-[#374151] hover:bg-[#f9fafb]'
                          }
                        `}
                      >
                        <span
                          className={`
                            h-1.5 w-1.5 flex-shrink-0 rounded-full
                            ${isSelected ? 'bg-[#1D9E75]' : 'bg-transparent'}
                          `}
                        />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-teal-100 bg-[#f6fffd] px-3.5 py-2.5 text-[12px] shadow-[0_6px_18px_rgba(20,120,116,0.04)] sm:flex-row sm:flex-wrap sm:items-center">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.08em] text-[#0f766e]">
          <Info className="h-3.5 w-3.5" />
          Info Filter
        </span>
        <span className="hidden h-4 w-px bg-teal-200 sm:inline-block" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
          {summaryItems.map((item, index) => (
            <span key={item.label} className="inline-flex items-center gap-1">
              <span className="font-medium text-slate-500">{item.label}:</span>
              <span className="font-bold text-slate-800">{item.value}</span>
              {index < summaryItems.length - 1 ? (
                <span className="ml-1 text-teal-400" aria-hidden="true">
                  |
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}