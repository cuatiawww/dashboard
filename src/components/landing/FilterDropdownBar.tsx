'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe, MapPin, Building2, ChevronDown, Info } from 'lucide-react'
import { useAuthStore, type WilayahScope } from '@/lib/authStore'
import { buildRegionsUrl } from '@/lib/utils/api'

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
  selectedProvinceName?: string | null
}

type RegionOption = {
  id?: string | number
  code?: string | number
  name: string
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

// Mode-mode scope yang dianggap valid & terkunci ke wilayah tertentu.
const SCOPED_MODES: WilayahScope['mode'][] = ['provinsi', 'kabupaten']

function hasValidScopedMode(scope?: WilayahScope): scope is WilayahScope {
  return !!scope && SCOPED_MODES.includes(scope.mode)
}

export default function FilterDropdownBar({ onSummaryChange, selectedProvinceName }: FilterDropdownBarProps = {}) {
  const userScope = useAuthStore((state) => state.user?.wilayah_scope)

  // Hanya benar-benar "scoped" jika mode dikenal (provinsi/kabupaten).
  // Selain itu (termasuk 'all' atau mode tak terduga/aneh) -> treat sebagai nasional.
  const isScoped = hasValidScopedMode(userScope)

  // Mulai KOSONG (selain "Semua ..."), bukan array statis fallback.
  const [dynamicProvinces, setDynamicProvinces] = useState<Array<{ value: string; label: string }>>([
    { value: 'semua-provinsi', label: 'Semua Provinsi' },
  ])
  const [dynamicKabkota, setDynamicKabkota] = useState<Array<{ value: string; label: string }>>([
    { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
  ])

  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingKabkota, setLoadingKabkota] = useState(false)

  const activeFilterData = useMemo<FilterItem[]>(() => {
    let result: FilterItem[] = []
    if (!isScoped) {
      // Nasional / tamu / mode tidak dikenal -> dropdown aktif & dinamis dari API.
      result = [
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
    } else {
      // userScope dipastikan ada & mode-nya valid (provinsi/kabupaten) di sini.
      const scope = userScope as WilayahScope

      const cakupanValue = scope.cakupan.value || scope.mode
      const provinsiValue = scope.provinsi.id ? String(scope.provinsi.id) : slugify(scope.provinsi.label)
      const kabupatenValue = scope.kabupaten.id ? String(scope.kabupaten.id) : slugify(scope.kabupaten.label)
      const kabupatenOptions =
        scope.mode === 'kabupaten'
          ? [
            {
              value: kabupatenValue,
              label: scope.kabupaten.label,
            },
          ]
          : [
            { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
            ...(scope.kabupaten.options || []).map((item) => ({
              value: String(item.id),
              label: item.label,
            })),
          ]

      result = [
        {
          id: 'cakupan',
          icon: 'globe',
          sublabel: 'Cakupan',
          defaultValue: cakupanValue,
          locked: scope.cakupan.locked,
          options: [{ value: cakupanValue, label: scope.cakupan.label }],
        },
        {
          id: 'provinsi',
          icon: 'pin',
          sublabel: 'Provinsi',
          defaultValue: provinsiValue,
          locked: scope.provinsi.locked,
          options: [{ value: provinsiValue, label: scope.provinsi.label }],
        },
        {
          id: 'kabkota',
          icon: 'building',
          sublabel: 'Kab/Kota',
          defaultValue: scope.mode === 'kabupaten' ? kabupatenValue : 'semua-kabkota',
          locked: scope.kabupaten.locked,
          options: kabupatenOptions,
        },
      ]
    }

    return result.map(item => ({
      ...item,
      options: item.options.map(opt => ({
        ...opt,
        label: opt.label.toUpperCase()
      }))
    }))
  }, [isScoped, userScope, dynamicProvinces, dynamicKabkota, loadingProvinces, loadingKabkota])

  const defaultSelected = useMemo(() => {
    if (!isScoped) {
      return {
        cakupan: 'nasional',
        provinsi: 'semua-provinsi',
        kabkota: 'semua-kabkota',
      }
    }
    const scope = userScope as WilayahScope
    const cakupanValue = scope.cakupan.value || scope.mode
    const provinsiValue = scope.provinsi.id ? String(scope.provinsi.id) : slugify(scope.provinsi.label)
    const kabupatenValue = scope.mode === 'kabupaten'
      ? (scope.kabupaten.id ? String(scope.kabupaten.id) : slugify(scope.kabupaten.label))
      : 'semua-kabkota'
    return {
      cakupan: cakupanValue,
      provinsi: provinsiValue,
      kabkota: kabupatenValue,
    }
  }, [isScoped, userScope])

  const [selected, setSelected] = useState<Record<string, string>>(defaultSelected)
  const [openId, setOpenId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Only update selected values when the default values change (e.g., user scope loads or changes)
  const defaultSelectedStr = JSON.stringify(defaultSelected)
  useEffect(() => {
    const parsed = JSON.parse(defaultSelectedStr)
    let hasDifference = false
    for (const key in parsed) {
      if (parsed[key] !== selected[key]) {
        hasDifference = true
        break
      }
    }
    if (hasDifference) {
      setSelected(parsed)
      setOpenId(null)
    }
  }, [defaultSelectedStr, selected])

  useEffect(() => {
    if (selectedProvinceName) {
      const cleanName = selectedProvinceName.toUpperCase().trim()
      const found = dynamicProvinces.find(
        (p) => p.label.toUpperCase().trim() === cleanName
      )
      if (found) {
        const nextProv = found.value
        if (selected.provinsi !== nextProv || selected.cakupan !== 'provinsi' || selected.kabkota !== 'semua-kabkota') {
          setSelected((prev) => ({
            ...prev,
            provinsi: nextProv,
            cakupan: 'provinsi',
            kabkota: 'semua-kabkota',
          }))
        }
      }
    } else {
      const parsed = JSON.parse(defaultSelectedStr)
      let hasDifference = false
      for (const key in parsed) {
        if (parsed[key] !== selected[key]) {
          hasDifference = true
          break
        }
      }
      if (hasDifference) {
        setSelected(parsed)
      }
    }
  }, [selectedProvinceName, dynamicProvinces, defaultSelectedStr, selected])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch provinsi hanya jika TIDAK scoped (nasional/tamu/mode tak dikenal).
  useEffect(() => {
    if (isScoped) return

    const fetchProvinces = async () => {
      setLoadingProvinces(true)
      try {
        const res = await fetch(buildRegionsUrl())
        const contentType = res.headers.get('content-type') || ''

        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error(`Unexpected response while loading provinces: ${res.status}`)
        }

        const payload = await res.json()
        if (payload?.success && Array.isArray(payload?.data)) {
          const list = [
            { value: 'semua-provinsi', label: 'Semua Provinsi' },
            ...payload.data.map((item: RegionOption) => ({
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
  }, [isScoped])

  const selectedProvince = selected['provinsi']

  // Fetch kab/kota cascade hanya jika TIDAK scoped.
  useEffect(() => {
    if (isScoped) return

    if (!selectedProvince || selectedProvince === 'semua-provinsi') {
      setDynamicKabkota([{ value: 'semua-kabkota', label: 'Semua Kab/Kota' }])
      setLoadingKabkota(false)
      return
    }

    const fetchKabkota = async () => {
      setLoadingKabkota(true)
      try {
        const res = await fetch(buildRegionsUrl({ province_id: selectedProvince }))
        const contentType = res.headers.get('content-type') || ''

        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error(`Unexpected response while loading kabkota: ${res.status}`)
        }

        const payload = await res.json()
        if (payload?.success && Array.isArray(payload?.data)) {
          const list = [
            { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
            ...payload.data.map((item: RegionOption) => ({
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
  }, [selectedProvince, isScoped])

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

  // Keep track of the last emitted summary to prevent infinite loops
  const lastSummaryRef = useRef<string>('')

  useEffect(() => {
    const summaryStr = JSON.stringify(summary)
    if (summaryStr !== lastSummaryRef.current) {
      lastSummaryRef.current = summaryStr
      onSummaryChange?.(summary)
    }
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
                              if (opt.value === 'semua-provinsi') {
                                next['cakupan'] = 'nasional'
                              } else {
                                next['cakupan'] = 'provinsi'
                              }
                            } else if (filter.id === 'kabkota') {
                              if (opt.value === 'semua-kabkota') {
                                if (prev['provinsi'] === 'semua-provinsi') {
                                  next['cakupan'] = 'nasional'
                                } else {
                                  next['cakupan'] = 'provinsi'
                                }
                              } else {
                                next['cakupan'] = 'kabupaten-kota'
                              }
                            } else if (filter.id === 'cakupan') {
                              if (opt.value === 'nasional') {
                                next['provinsi'] = 'semua-provinsi'
                                next['kabkota'] = 'semua-kabkota'
                              } else if (opt.value === 'provinsi') {
                                next['kabkota'] = 'semua-kabkota'
                              }
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
