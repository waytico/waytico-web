'use client'

/**
 * Photo Bank — filter strip (search / category / city / country dropdown).
 *
 * TZ Stage 10 Block B: replaces the previous single 'region' field with
 *   - city: free-text (debounced ILIKE prefix on backend)
 *   - country: dropdown built from /api/global-bank/countries
 * The search field itself targets ai_description / ai_tags / ai_landmarks
 * only — city/country dropped from the OR-pool to kill cross-region
 * false positives ('Paris' returning Rome rows whose description references
 * Paris).
 *
 * Reused by both free preview и paid full UI; controlled component, caller
 * owns state.
 */

import { ChangeEvent } from 'react'

const VISIBLE_CATEGORIES = [
  'landmark',
  'architecture',
  'landscape',
  'urban',
  'beach',
  'mountain',
  'food',
  'street_scene',
  'water_view',
  'museum',
  'religious_site',
  'nature',
] as const

export interface PhotoFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  category: string
  onCategoryChange: (v: string) => void
  city: string
  onCityChange: (v: string) => void
  country: string
  onCountryChange: (v: string) => void
  countryOptions: string[]
}

export function PhotoFilters(props: PhotoFiltersProps) {
  const {
    search,
    onSearchChange,
    category,
    onCategoryChange,
    city,
    onCityChange,
    country,
    onCountryChange,
    countryOptions,
  } = props
  const handle =
    (setter: (v: string) => void) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setter(e.target.value)

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      role="search"
      aria-label="Photo filters"
    >
      <input
        type="search"
        value={search}
        onChange={handle(onSearchChange)}
        placeholder="Search description, tags, landmarks…"
        className="h-9 flex-1 min-w-[180px] rounded border border-zinc-300 bg-white px-3 text-sm"
      />
      <select
        value={category}
        onChange={handle(onCategoryChange)}
        className="h-9 rounded border border-zinc-300 bg-white px-2 text-sm"
        aria-label="Category"
      >
        <option value="">All categories</option>
        {VISIBLE_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <input
        type="text"
        value={city}
        onChange={handle(onCityChange)}
        placeholder="City"
        className="h-9 w-[140px] rounded border border-zinc-300 bg-white px-3 text-sm"
        aria-label="City"
      />
      <select
        value={country}
        onChange={handle(onCountryChange)}
        className="h-9 rounded border border-zinc-300 bg-white px-2 text-sm"
        aria-label="Country"
      >
        <option value="">All countries</option>
        {countryOptions.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  )
}
