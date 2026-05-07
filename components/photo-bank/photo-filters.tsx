'use client'

/**
 * Photo Bank — filter strip (search / category / region).
 *
 * Reused между free preview (global) и paid full UI. Controlled
 * component — caller owns the state. `category` options match a
 * subset of the controlled vocabulary that's most useful for filter
 * (subject types + activity), not the full 51-entry list which
 * would noise the dropdown.
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
  region: string
  onRegionChange: (v: string) => void
}

export function PhotoFilters(props: PhotoFiltersProps) {
  const {
    search,
    onSearchChange,
    category,
    onCategoryChange,
    region,
    onRegionChange,
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
          <option key={c} value={c}>
            {c.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={region}
        onChange={handle(onRegionChange)}
        placeholder="City or country"
        className="h-9 w-[160px] rounded border border-zinc-300 bg-white px-3 text-sm"
        aria-label="Region"
      />
    </div>
  )
}
