'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/nextjs'
import { Plus } from 'lucide-react'
import SmartClientInput, { detectIdentity, type SmartDetection } from './smart-client-input'
import { apiFetch } from '@/lib/api'
import type { Client } from '@/components/trip/trip-types'
import { clientAvatarClass, clientInitials } from '@/lib/clients-derive'

type Props = {
  /** Existing client picked from the dropdown. */
  onPick: (client: Client) => void
  /** "Create new client with X" pressed in the dropdown footer. Caller
   *  opens its own modal with this draft pre-populated; pass
   *  null/undefined to omit the row. */
  onCreateNew?: (draft: Partial<Client>) => void
  /** Auto-create request after a No-matches result. Called once per
   *  unique query, ~500ms after the empty result settles. Lets the
   *  caller open the create modal without an extra click. Independent
   *  of `onCreateNew` (which is the explicit dropdown button). */
  onCreateRequest?: (draft: Partial<Client>) => void
  /** Hide already-linked clients (e.g. don't suggest the trip's current
   *  client back to itself). */
  excludeIds?: string[]
  placeholder?: string
  autoFocus?: boolean
}

const MIN_QUERY = 2
const AUTO_CREATE_DELAY_MS = 500

/**
 * SmartClientPicker — search-as-you-type over the operator's roster
 * via /api/clients/search.
 *
 * Two create paths:
 *   - `onCreateRequest` — auto-fired ~500ms after a No-matches result
 *     (TZ Stage 1: skip the extra dropdown click).
 *   - `onCreateNew` — explicit "Create new client with X" footer in
 *     the dropdown, kept as a fallback when results exist but none
 *     match.
 *
 * Debounce 250ms, abort previous in-flight fetch on new keystroke.
 */
export default function SmartClientPicker({
  onPick,
  onCreateNew,
  onCreateRequest,
  excludeIds,
  placeholder,
  autoFocus,
}: Props) {
  const { getToken } = useAuth()
  const [value, setValue] = useState('')
  const [results, setResults] = useState<Client[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const detectionRef = useRef<SmartDetection | null>(null)
  const autoCreateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAutoQueryRef = useRef<string | null>(null)

  // Outside-click closes dropdown. The dropdown lives in a body portal,
  // so contains() on wrapRef alone returns false for clicks inside it.
  // We check both the wrapper and any ancestor tagged as the picker
  // dropdown (data-smart-picker-dropdown set on the portal node).
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (wrapRef.current && wrapRef.current.contains(target)) return
      if (target.closest('[data-smart-picker-dropdown="1"]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Debounced fetch on value change.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()
    const q = value.trim()
    if (q.length < MIN_QUERY) {
      setResults(null)
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      try {
        const token = await getToken()
        const res = await apiFetch(
          `/api/clients/search?q=${encodeURIComponent(q)}&limit=5`,
          { token, signal: ac.signal },
        )
        if (!res.ok) {
          setResults([])
          return
        }
        const data = await res.json()
        const list: Client[] = data.clients ?? []
        const filtered = excludeIds
          ? list.filter((c) => !excludeIds.includes(c.id))
          : list
        setResults(filtered)
      } catch (err: any) {
        if (err?.name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Reset auto-create memory whenever the query changes — every fresh
  // query gets its own one-shot auto-create attempt.
  useEffect(() => {
    lastAutoQueryRef.current = null
  }, [value])

  // Auto-fire onCreateRequest when search settles on No matches.
  // 500ms delay so the operator gets a moment to read the empty
  // dropdown before the modal pops.
  useEffect(() => {
    if (autoCreateTimerRef.current) clearTimeout(autoCreateTimerRef.current)
    if (!onCreateRequest) return
    if (loading) return
    if (results === null) return
    if (results.length !== 0) return
    const q = value.trim()
    if (q.length < MIN_QUERY) return
    if (lastAutoQueryRef.current === q) return
    autoCreateTimerRef.current = setTimeout(() => {
      lastAutoQueryRef.current = q
      onCreateRequest(buildDraftFromDetection())
      setOpen(false)
    }, AUTO_CREATE_DELAY_MS)
    return () => {
      if (autoCreateTimerRef.current) clearTimeout(autoCreateTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, loading, value, onCreateRequest])

  function buildDraftFromDetection(): Partial<Client> {
    const d = detectionRef.current ?? detectIdentity(value)
    const draft: Partial<Client> = {}
    if (d.value) {
      switch (d.kind) {
        case 'phone':     draft.phone = d.value; break
        case 'email':     draft.email = d.value; break
        case 'telegram':  draft.telegram = d.value; break
        case 'instagram': draft.instagram = d.value; break
        case 'name':      draft.name = d.value; break
      }
    }
    return draft
  }

  const showDropdown = open && value.trim().length >= MIN_QUERY

  // Mount dropdown into document.body so it escapes any ancestor that
  // clips overflow (sticky bars, magazine fixed-position ClientInfo
  // wrapper, etc.). Position is measured off the input wrapper.
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => setPortalReady(true), [])

  useLayoutEffect(() => {
    if (!showDropdown || !wrapRef.current) return
    const update = () => {
      const r = wrapRef.current!.getBoundingClientRect()
      setCoords({ left: r.left, top: r.bottom + 4, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [showDropdown])

  const dropdown = showDropdown && coords && portalReady
    ? createPortal(
        <div
          role="listbox"
          aria-label="Client search results"
          ref={(el) => {
            // Tag the portal node so the outside-click handler can
            // recognise clicks inside the dropdown as still "inside"
            // the picker (mousedown handler reads this).
            if (el) (el as any).dataset.smartPickerDropdown = '1'
          }}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            width: coords.width,
          }}
          className="z-[60] rounded-md border border-border bg-card shadow-lg overflow-hidden"
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}

          {!loading && results !== null && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {onCreateRequest ? 'No matches — opening new client form…' : 'No matches.'}
            </div>
          )}

          {!loading &&
            results &&
            results.map((c) => {
              const heading = c.nickname || c.name || c.email || c.phone || 'Unnamed'
              const sub = [c.email, c.phone, c.telegram && '@' + c.telegram]
                .filter(Boolean)
                .join(' · ')
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  onClick={() => {
                    onPick(c)
                    setOpen(false)
                    setValue('')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60 transition-colors"
                >
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold ${clientAvatarClass(c)}`}
                  >
                    {clientInitials(c)}
                  </span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm text-foreground truncate">{heading}</span>
                    {sub && (
                      <span className="text-xs text-muted-foreground truncate">{sub}</span>
                    )}
                  </span>
                </button>
              )
            })}

          {onCreateNew && value.trim().length >= MIN_QUERY && (
            <button
              type="button"
              onClick={() => {
                onCreateNew(buildDraftFromDetection())
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-foreground/85 border-t border-border hover:bg-secondary/60 transition-colors"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span>
                Create new client with{' '}
                <span className="font-medium">"{value.trim()}"</span>
              </span>
            </button>
          )}
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={wrapRef} className="relative">
      <SmartClientInput
        value={value}
        onChange={(v) => {
          setValue(v)
          if (!open) setOpen(true)
        }}
        onDetect={(d) => {
          detectionRef.current = d
        }}
        placeholder={placeholder ?? 'Search client by name, phone, email…'}
        autoFocus={autoFocus}
        inputRef={inputRef}
      />
      {dropdown}
    </div>
  )
}
