'use client'

type FilterOption = {
  label: string
  value: string
}

type HeroFilterPanelProps = {
  provinceId?: string
  provinceLabel?: string
  provinceValue?: string
  provinceOptions?: FilterOption[]
  onProvinceChange?: (value: string) => void
  pscId: string
  pscLabel: string
  pscValue: string
  pscOptions: FilterOption[]
  onPscChange?: (value: string) => void
  onReset?: () => void
  submitLabel?: string
  resetLabel?: string
  showProvinceFilter?: boolean
}

export default function HeroFilterPanel({
  provinceId = 'filter-provinsi',
  provinceLabel = 'Pilih Provinsi',
  provinceValue = '',
  provinceOptions = [],
  onProvinceChange,
  pscId,
  pscLabel,
  pscValue,
  pscOptions,
  onPscChange,
  onReset,
  submitLabel = 'Tampilkan',
  resetLabel = 'Reset',
  showProvinceFilter = true,
}: HeroFilterPanelProps) {
  return (
    <div className="rounded-[26px] border border-primary/10 bg-gradient-to-r from-[#eaf7f6] via-white to-[#eef8f7] p-4 lg:p-5">
      <div
        className={`grid gap-4 lg:items-end ${
          showProvinceFilter
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]'
            : 'lg:grid-cols-[minmax(0,1fr)_auto_auto]'
        }`}
      >
        {showProvinceFilter && (
          <div className="space-y-2">
            <label htmlFor={provinceId} className="block text-sm font-semibold text-slate-700">
              {provinceLabel}
            </label>
            <div className="relative">
              <select
                id={provinceId}
                value={provinceValue}
                onChange={(event) => onProvinceChange?.(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-primary/15 bg-white px-4 pr-11 text-sm text-gray-700 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                {provinceOptions.map((option) => (
                  <option key={option.value || option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m19 9-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={pscId} className="block text-sm font-semibold text-slate-700">
            {pscLabel}
          </label>
          <div className="relative">
            <select
              id={pscId}
              value={pscValue}
              onChange={(event) => onPscChange?.(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-primary/15 bg-white px-4 pr-11 text-sm text-gray-700 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              {pscOptions.map((option) => (
                <option key={option.value || option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m19 9-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        <button
          type="button"
          className="h-12 rounded-xl bg-primary px-7 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          {submitLabel}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="h-12 rounded-xl border border-primary/15 bg-white px-7 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  )
}
