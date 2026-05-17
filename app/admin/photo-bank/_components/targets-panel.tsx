'use client'

/**
 * Photo Bank v2 — admin Targets panel.
 *
 * Title sits on its own line; filters and the Top-up action share a
 * single row below it. The country picker is a custom dropdown so long
 * country names can wrap onto two lines (native <option> can't wrap).
 *
 * Single-action model for Top-up: there is no popover. Pick the country
 * (or the explicit "All countries" entry) in the same dropdown that
 * filters the table, set `extra` inline, click Top up. With no country
 * picked the button is disabled — clicking it accidentally does nothing.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Loader2 } from 'lucide-react'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

/**
 * Sentinel value for the country picker. '' = nothing chosen (placeholder
 * "Choose country" — table shows everything, Top-up is disabled).
 * ALL_COUNTRIES = explicit "All countries" — table still unfiltered, but
 * Top-up fires the full sweep (with a confirm).
 */
const ALL_COUNTRIES = '__all__'

interface TargetRow {
  id: string
  country: string
  name: string
  kind: 'city' | 'landmark'
  country_score: number
  location_score: number
  priority: number
  target_count: number
  collected_count: number
  exhausted: boolean
  search_query: string | null
  last_attempt_at: string | null
}

interface CountryEntry {
  country: string
  count: number
}

interface Props {
  authedFetch: AuthedFetch
}

type SortKey = 'priority' | 'last_attempt'

export function TargetsPanel({ authedFetch }: Props) {
  const [rows, setRows] = useState<TargetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [country, setCountry] = useState<string>('') // '' | ALL_COUNTRIES | <name>
  const [city, setCity] = useState<string>('')
  const [sort, setSort] = useState<SortKey>('priority')
  const [refreshTick, setRefreshTick] = useState(0)
  const [countries, setCountries] = useState<CountryEntry[]>([])
  const [citiesForCountry, setCitiesForCountry] = useState<string[]>([])

  // Inline-edit state for the Goal column.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // "Specific country" = neither empty nor the All-countries sentinel.
  const isSpecificCountry = country !== '' && country !== ALL_COUNTRIES
  const filterCountry = isSpecificCountry ? country : ''

  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (filterCountry) sp.set('country', filterCountry)
    // City picked → narrow the table to that exact row (city is a
    // target name, not a foreign key). Server-side this hits the
    // existing `name` exact-match filter.
    if (filterCountry && city) sp.set('name', city)
    if (sort !== 'priority') sp.set('sort', sort)
    return sp.toString()
  }, [filterCountry, city, sort])

  // Country list — refreshed alongside the table so a freshly generated
  // country appears in the picker.
  useEffect(() => {
    let cancelled = false
    authedFetch(`${API_URL}/api/admin/photo-bank/targets/countries`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { countries: CountryEntry[] }
        if (!cancelled) setCountries(data.countries || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, refreshTick])

  // Per-country CITY list — populates the second dropdown (city scope
  // for city-landmark top-up). Landmarks have no nested top-up so they
  // don't appear in this dropdown.
  useEffect(() => {
    if (!isSpecificCountry) {
      setCitiesForCountry([])
      setCity('')
      return
    }
    let cancelled = false
    const sp = new URLSearchParams()
    sp.set('country', filterCountry)
    sp.set('kind', 'city')
    sp.set('perPage', '200')
    authedFetch(`${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { targets: TargetRow[] }
        if (cancelled) return
        const names = (data.targets || [])
          .map((t) => t.name)
          .sort((a, b) => a.localeCompare(b))
        setCitiesForCountry(names)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, filterCountry, isSpecificCountry, refreshTick])

  useEffect(() => {
    let cancelled = false
    const isFirstLoad = rows.length === 0
    if (isFirstLoad) setLoading(true)
    const sp = new URLSearchParams(queryString)
    sp.set('page', String(page))
    sp.set('perPage', String(perPage))
    const url = `${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`
    const fetchOnce = () =>
      authedFetch(url)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return (await res.json()) as {
            targets: TargetRow[]
            totalCount: number
            totalPages: number
          }
        })
        .then((data) => {
          if (cancelled) return
          setRows(data.targets)
          setTotalCount(data.totalCount)
          setTotalPages(data.totalPages)
          setError(null)
        })
        .catch((err) => {
          if (!cancelled) setError(err?.message || 'load failed')
        })
        .finally(() => {
          if (!cancelled && isFirstLoad) setLoading(false)
        })
    fetchOnce()
    // Silent 10s autopoll — collected_count and last_attempt_at change
    // as the collector + Pass-2 cleanup work through targets. We do
    // NOT reset loading=true on repeat ticks, so the table re-renders
    // in place without flicker. Matches the Collector control panel
    // and the Workers panel for a single consistent cadence across
    // photo-bank admin.
    const t = setInterval(fetchOnce, 10_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch, page, perPage, queryString, refreshTick])

  const patch = useCallback(
    async (id: string, body: Partial<TargetRow>) => {
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRefreshTick((t) => t + 1)
      } catch (err) {
        setError((err as Error)?.message || 'update failed')
      }
    },
    [authedFetch],
  )

  const startEditGoal = useCallback((row: TargetRow) => {
    setEditingId(row.id)
    setEditingValue(String(row.target_count))
  }, [])
  const cancelEditGoal = useCallback(() => {
    setEditingId(null)
    setEditingValue('')
  }, [])

  // Hard-delete a single target row. Confirms first because there is
  // no undo path on the backend; on success refreshTick bump rerenders
  // the table. Already-collected photos survive (ON DELETE SET NULL).
  const deleteRow = useCallback(
    async (row: TargetRow) => {
      if (
        !window.confirm(
          `Delete "${row.name}" (${row.kind}) in ${row.country}?\n\nAlready-collected photos stay; only the targeting record is removed.`,
        )
      ) {
        return
      }
      setDeletingId(row.id)
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/${row.id}`,
          { method: 'DELETE' },
        )
        if (!res.ok && res.status !== 404) {
          setError(`Delete failed: HTTP ${res.status}`)
          return
        }
        setRefreshTick((t) => t + 1)
      } catch (e: any) {
        setError(`Delete failed: ${e?.message ?? 'unknown'}`)
      } finally {
        setDeletingId(null)
      }
    },
    [authedFetch],
  )
  const commitEditGoal = useCallback(
    (row: TargetRow) => {
      const n = parseInt(editingValue, 10)
      setEditingId(null)
      if (!Number.isFinite(n) || n < 1) return
      if (n === row.target_count) return
      patch(row.id, { target_count: n })
    },
    [editingValue, patch],
  )

  const toggleSort = useCallback(() => {
    setSort((s) => (s === 'last_attempt' ? 'priority' : 'last_attempt'))
    setPage(1)
  }, [])

  return (
    <div>
      <header className="mb-3">
        <h1 className="mb-2 text-lg font-medium">Photo bank — locations</h1>
        <div className="flex items-center gap-2 text-sm">
          <CountryDropdown
            value={country}
            countries={countries}
            onChange={(v) => {
              setCountry(v)
              setPage(1)
            }}
          />
          <CityDropdown
            value={city}
            cities={citiesForCountry}
            disabled={!isSpecificCountry}
            country={isSpecificCountry ? filterCountry : null}
            onChange={(v) => {
              setCity(v)
              setPage(1)
            }}
          />
          <GeneratorControls
            authedFetch={authedFetch}
            country={country}
            city={city}
            onAfter={() => setRefreshTick((t) => t + 1)}
          />
        </div>
      </header>

      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {totalCount} locations · page {page} of {Math.max(1, totalPages)}
        </span>
        <span className="text-xs">
          <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-rose-300 bg-rose-50 align-middle" />
          red rows = exhausted (no more photos available from Wikimedia)
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
          No locations match. Pick a country and press <strong>Top up</strong> to
          ask the model for more places — runs in the background.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Kind</th>
                <th
                  className="px-3 py-2"
                  title="country_score × location_score"
                >
                  Priority
                </th>
                <th
                  className="px-3 py-2"
                  title="Country score · Location score (both 0–100)"
                >
                  Scores
                </th>
                <th className="px-3 py-2" title="Photos collected so far">
                  Photos
                </th>
                <th
                  className="px-3 py-2"
                  title="Target photo count — click to edit"
                >
                  Goal
                </th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="font-medium hover:underline"
                    title="Sort by last attempt (stalest first)"
                  >
                    Last attempt
                    {sort === 'last_attempt' ? ' ▲' : ''}
                  </button>
                </th>
                <th className="px-3 py-2 text-right" title="Delete this location (asks for confirmation)">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    'border-t border-zinc-100 ' +
                    (row.exhausted ? 'bg-rose-50' : '')
                  }
                  title={
                    row.exhausted
                      ? 'Exhausted — Wikimedia has no more photos for this location'
                      : undefined
                  }
                >
                  <td className="px-3 py-2">{row.country}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.kind}</td>
                  <td className="px-3 py-2 font-mono">{row.priority}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {row.country_score} · {row.location_score}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {row.collected_count}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === row.id ? (
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={editingValue}
                        autoFocus
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEditGoal(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditGoal(row)
                          else if (e.key === 'Escape') cancelEditGoal()
                        }}
                        className="w-20 rounded border border-zinc-300 px-1 py-0.5 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditGoal(row)}
                        className="rounded px-1 py-0.5 hover:bg-zinc-100"
                        title="Click to edit"
                      >
                        {row.target_count}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.last_attempt_at
                      ? new Date(row.last_attempt_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteRow(row)}
                      disabled={deletingId === row.id}
                      title={`Delete ${row.name}`}
                      className="rounded px-2 py-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Delete ${row.name}`}
                    >
                      {deletingId === row.id ? '…' : '×'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-zinc-500">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/**
 * Searchable country dropdown with line-wrapping options.
 *
 * Native <select>'s <option> elements can't wrap to multiple lines in
 * Chrome/Edge — long country names like "Saint Vincent and the
 * Grenadines" get clipped at the right edge of a narrow trigger. This
 * component renders options as <button>s instead, which lets us set
 * whitespace-normal + break-words and have them flow to two lines
 * naturally. A search input at the top filters the (~190-entry) list
 * by substring. Closes on outside-click or Esc.
 */
function CountryDropdown({
  value,
  countries,
  onChange,
}: {
  value: string
  countries: CountryEntry[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return countries
    const q = query.trim().toLowerCase()
    return countries.filter((c) => c.country.toLowerCase().includes(q))
  }, [countries, query])

  const display =
    value === ALL_COUNTRIES
      ? 'All countries'
      : value === ''
        ? 'Choose country'
        : value

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          'flex w-40 items-center justify-between gap-1 rounded border border-zinc-300 px-2 py-1 text-left text-sm leading-tight ' +
          (value === '' ? 'text-zinc-400' : 'text-zinc-900')
        }
        title={display}
      >
        <span className="break-words">{display}</span>
        <span className="text-xs text-zinc-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded border border-zinc-300 bg-white shadow-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            autoFocus
            className="w-full border-b border-zinc-200 px-2 py-1 text-sm outline-none"
          />
          <div className="max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => pick('')}
              className={
                'block w-full whitespace-normal break-words px-2 py-1 text-left text-sm leading-tight hover:bg-zinc-50 ' +
                (value === '' ? 'bg-zinc-100' : '')
              }
            >
              <span className="text-zinc-500">Choose country</span>
            </button>
            <button
              type="button"
              onClick={() => pick(ALL_COUNTRIES)}
              className={
                'block w-full whitespace-normal break-words border-t border-zinc-100 px-2 py-1 text-left text-sm leading-tight hover:bg-zinc-50 ' +
                (value === ALL_COUNTRIES ? 'bg-zinc-100' : '')
              }
            >
              All countries{' '}
              <span className="text-xs text-zinc-400">(top up all)</span>
            </button>
            {filtered.map((c) => (
              <button
                key={c.country}
                type="button"
                onClick={() => pick(c.country)}
                className={
                  'block w-full whitespace-normal break-words border-t border-zinc-100 px-2 py-1 text-left text-sm leading-tight hover:bg-zinc-50 ' +
                  (value === c.country ? 'bg-zinc-100' : '')
                }
              >
                {c.country}{' '}
                <span className="text-xs text-zinc-400">({c.count})</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-sm text-zinc-400">
                No matches.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * City scope dropdown — popover with search, same shape as
 * CountryDropdown so the two siblings in the toolbar look identical.
 * Disabled until a specific country is picked; when active shows
 * "Country-level (no city)" as the default option followed by every
 * city in the country.
 */
function CityDropdown({
  value,
  cities,
  disabled,
  country,
  onChange,
}: {
  value: string
  cities: string[]
  disabled: boolean
  country: string | null
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return cities
    const q = query.trim().toLowerCase()
    return cities.filter((n) => n.toLowerCase().includes(q))
  }, [cities, query])

  const display = disabled
    ? 'Pick a country first'
    : value === ''
      ? 'Country-level (no city)'
      : value

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        title={
          disabled
            ? 'Pick a country first'
            : country
              ? `City scope for Top up · ${country}`
              : ''
        }
        className={
          'flex w-40 items-center justify-between gap-1 rounded border border-zinc-300 px-2 py-1 text-left text-sm leading-tight ' +
          (disabled
            ? 'bg-zinc-50 text-zinc-400'
            : value === ''
              ? 'text-zinc-500'
              : 'text-zinc-900')
        }
      >
        <span className="truncate">{display}</span>
        <span className="text-xs text-zinc-400">▾</span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded border border-zinc-300 bg-white shadow-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city…"
            autoFocus
            className="w-full border-b border-zinc-200 px-2 py-1 text-sm outline-none"
          />
          <div className="max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => pick('')}
              className={
                'block w-full whitespace-normal break-words px-2 py-1 text-left text-sm leading-tight hover:bg-zinc-50 ' +
                (value === '' ? 'bg-zinc-100' : '')
              }
            >
              <span className="text-zinc-500">Country-level (no city)</span>
            </button>
            {filtered.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pick(n)}
                className={
                  'block w-full whitespace-normal break-words border-t border-zinc-100 px-2 py-1 text-left text-sm leading-tight hover:bg-zinc-50 ' +
                  (value === n ? 'bg-zinc-100' : '')
                }
              >
                {n}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-sm text-zinc-400">
                No matches.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface GeneratorState {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
  startedAt: string | null
  finishedAt: string | null
  totalCountries: number
  processedCountries: number
  currentCountry: string | null
  locationsAdded: number
  errors: Array<{ country: string; message: string }>
  fatalError: string | null
}

/**
 * Inline Top-up control — `extra` input + Top-up button, no popover.
 *
 * Scope is whatever's in the parent's country picker:
 *   ''             → button disabled (placeholder mode, accidental
 *                    clicks do nothing).
 *   ALL_COUNTRIES  → POST /generate          (pass 1 + pass 2). Confirm.
 *   one country    → POST /generate-country  (pass 2 only). Cheap; no
 *                    confirm.
 *
 * Both routes drive the same singleton backend job — one running pill
 * covers either run. `extra` left empty means: backend uses the default
 * per-target plan from config_settings.
 */
function GeneratorControls({
  authedFetch,
  country,
  city,
  onAfter,
}: {
  authedFetch: AuthedFetch
  country: string
  city: string
  onAfter: () => void
}) {
  const [state, setState] = useState<GeneratorState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [extra, setExtra] = useState('')

  useEffect(() => {
    let cancelled = false
    authedFetch(`${API_URL}/api/admin/photo-bank/targets/generate-status`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { state: GeneratorState }
        if (!cancelled) setState(data.state)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch])

  useEffect(() => {
    if (state?.status !== 'running') return
    const t = setInterval(() => {
      authedFetch(`${API_URL}/api/admin/photo-bank/targets/generate-status`)
        .then(async (res) => {
          if (!res.ok) return
          const data = (await res.json()) as { state: GeneratorState }
          setState((prev) => {
            if (prev?.status === 'running' && data.state.status !== 'running') {
              onAfter()
            }
            return data.state
          })
        })
        .catch(() => {})
    }, 4_000)
    return () => clearInterval(t)
  }, [state?.status, authedFetch, onAfter])

  const start = useCallback(async () => {
    if (busy) return
    if (country === '') return // defensive: button is also disabled
    const isFullSweep = country === ALL_COUNTRIES
    const isCityTopUp = !isFullSweep && city !== ''
    if (
      isFullSweep &&
      !confirm(
        'Run a full top-up across all countries? This makes ~1 + N LLM calls and takes a few minutes.',
      )
    )
      return
    setBusy(true)
    setErr(null)
    const n = parseInt(extra, 10)
    try {
      let res: Response
      if (isFullSweep) {
        const body: { target_count?: number } = {}
        if (Number.isFinite(n) && n >= 1) body.target_count = n
        res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
      } else if (isCityTopUp) {
        const body: { country: string; city: string; extra_count?: number } = {
          country,
          city,
        }
        if (Number.isFinite(n) && n >= 1) body.extra_count = n
        res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/generate-city-landmarks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
      } else {
        // Specific country, no city → country-level top-up.
        const body: { country: string; extra_count?: number } = { country }
        if (Number.isFinite(n) && n >= 1) body.extra_count = n
        res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/generate-country`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
      }
      const data = (await res.json()) as {
        state?: GeneratorState
        error?: string
      }
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`)
        if (data?.state) setState(data.state)
      } else if (data?.state) {
        setState(data.state)
      }
    } catch (e) {
      setErr((e as Error)?.message || 'request failed')
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy, country, city, extra])

  const cancel = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/generate-cancel`,
        { method: 'POST' },
      )
      const data = (await res.json()) as { state?: GeneratorState }
      if (data?.state) setState(data.state)
    } catch {
      // soft fail — the polling loop will pick up the new status.
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy])

  // Compact running pill — keeps the single-row layout intact during a
  // long generation. Full progress lives in the tooltip.
  if (state?.status === 'running') {
    const total = state.totalCountries || 1
    const title =
      `Top up running · ${state.processedCountries}/${total}` +
      (state.currentCountry ? ` · ${state.currentCountry}` : '') +
      ` · +${state.locationsAdded} rows`
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-900"
        title={title}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {state.processedCountries}/{total}
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="ml-1 rounded border border-amber-300 px-1 text-xs hover:bg-amber-100 disabled:opacity-50"
          title="Cancel run"
        >
          ×
        </button>
      </span>
    )
  }

  const disabled = busy || country === ''
  const buttonTitle = disabled
    ? country === ''
      ? 'Pick a country first'
      : 'Working…'
    : country === ALL_COUNTRIES
      ? 'Top up all countries (full sweep)'
      : city !== ''
        ? `Top up landmarks in ${city} (${country})`
        : `Top up ${country} (country-level)`

  return (
    <>
      <input
        type="number"
        min={1}
        max={1000}
        placeholder="extra"
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
        className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
        title="How many new places to add (leave blank for the configured default)"
      />
      <button
        type="button"
        onClick={() => {
          setErr(null)
          void start()
        }}
        disabled={disabled}
        title={buttonTitle}
        className={
          'rounded border px-3 py-1 text-sm ' +
          (disabled
            ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
            : 'border-zinc-300 hover:bg-zinc-50')
        }
      >
        Top up
      </button>
      {err && <span className="text-xs text-rose-700">{err}</span>}
      <span className="mx-1 text-xs uppercase tracking-wide text-zinc-400">or</span>
      <ManualAddControl
        authedFetch={authedFetch}
        country={country}
        onAfter={onAfter}
      />
    </>
  )
}

/**
 * Manual single-row add — for the rare case the AI generator missed a
 * place or the admin wants a niche custom target. Uses the parent's
 * country selection; disabled until a specific country is picked.
 * Hits POST /photo-bank/targets and refreshes the table on success.
 * 409 (already exists) surfaces as an inline message.
 */
function ManualAddControl({
  authedFetch,
  country,
  onAfter,
}: {
  authedFetch: AuthedFetch
  country: string
  onAfter: () => void
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'city' | 'landmark'>('city')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const disabled =
    busy || country === '' || country === ALL_COUNTRIES || name.trim() === ''
  const title =
    country === '' || country === ALL_COUNTRIES
      ? 'Pick a specific country first'
      : name.trim() === ''
        ? 'Enter a location name'
        : `Add "${name.trim()}" (${kind}) to ${country}`

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country, name: name.trim(), kind }),
        },
      )
      if (res.status === 409) {
        setErr('Already exists')
        return
      }
      if (!res.ok) {
        setErr(`HTTP ${res.status}`)
        return
      }
      setName('')
      onAfter()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        type="text"
        placeholder="location name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-40 rounded border border-zinc-300 px-2 py-1 text-sm"
        title="Exact name of the place to add"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as 'city' | 'landmark')}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
        title="Whether this is a city or a landmark"
      >
        <option value="city">city</option>
        <option value="landmark">landmark</option>
      </select>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={disabled}
        title={title}
        className={
          'rounded border px-3 py-1 text-sm ' +
          (disabled
            ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
            : 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100')
        }
      >
        {busy ? '…' : 'Add'}
      </button>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </>
  )
}

