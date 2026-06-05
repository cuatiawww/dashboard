'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, MapPin, Building2, ChevronDown } from 'lucide-react'

type FilterItem = {
  id: string
  icon: 'globe' | 'pin' | 'building'
  sublabel: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}

const filterData: FilterItem[] = [
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
    options: [
      { value: 'semua-provinsi', label: 'Semua Provinsi' },
      { value: 'jawa-barat', label: 'Jawa Barat' },
      { value: 'dki-jakarta', label: 'DKI Jakarta' },
      { value: 'jawa-tengah', label: 'Jawa Tengah' },
    ],
  },
  {
    id: 'kabkota',
    icon: 'building',
    sublabel: 'Kab/Kota',
    defaultValue: 'semua-kabkota',
    options: [
      { value: 'semua-kabkota', label: 'Semua Kab/Kota' },
      { value: 'kota-bandung', label: 'Kota Bandung' },
      { value: 'kota-bekasi', label: 'Kota Bekasi' },
      { value: 'kota-semarang', label: 'Kota Semarang' },
    ],
  },
]

const iconStyles: Record<FilterItem['icon'], { bg: string; color: string }> = {
  globe:    { bg: 'bg-[#E1F5EE]', color: 'text-[#0F6E56]' },
  pin:      { bg: 'bg-[#E6F1FB]', color: 'text-[#185FA5]' },
  building: { bg: 'bg-[#EEEDFE]', color: 'text-[#534AB7]' },
}

function FilterIcon({ icon, className }: { icon: FilterItem['icon']; className?: string }) {
  if (icon === 'globe')    return <Globe    className={className} />
  if (icon === 'pin')      return <MapPin   className={className} />
  return                          <Building2 className={className} />
}

export default function FilterDropdownBar() {
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(filterData.map((f) => [f.id, f.defaultValue]))
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={rootRef}>
      {/* Single unified label */}
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-[#6b7280]">
        Filter Wilayah
      </p>

      {/* Unified pill bar */}
      <div className="flex items-center rounded-2xl border border-[#e5e7eb] bg-white p-1.5">
        {filterData.map((filter, idx) => {
          const activeOption =
            filter.options.find((o) => o.value === selected[filter.id]) ?? filter.options[0]
          const isOpen = openId === filter.id
          const { bg, color } = iconStyles[filter.icon]

          return (
            <div key={filter.id} className="relative flex flex-1 items-center">
              {/* Divider between segments */}
              {idx > 0 && (
                <span className="h-7 w-px flex-shrink-0 bg-[#e5e7eb]" aria-hidden="true" />
              )}

              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : filter.id)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`
                  group flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2
                  transition-colors duration-150
                  hover:bg-[#f9fafb]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17b7b2]
                  ${isOpen ? 'bg-[#f3f4f6]' : ''}
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
                          setSelected((prev) => ({ ...prev, [filter.id]: opt.value }))
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
    </div>
  )
}