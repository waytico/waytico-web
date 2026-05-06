'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { ContactAgentMenu } from './contact-agent-menu'
import type { OperatorContact, OwnerBrand } from './trip-types'

/**
 * Owner-side wrapper around <ContactAgentMenu>. Shows the Contact pill the
 * client will see ("Contact agent" or "Contact {label}") plus an inline
 * pencil affordance that opens a small popover for editing the label.
 *
 * Persists to users.contact_label via PATCH /api/users/me. After save the
 * caller's onSaved() runs — used by trip-page-client to refresh the owner
 * payload so the rendered pill picks up the new value without a reload.
 *
 * Public viewers go through the bare <ContactAgentMenu>; this component is
 * only mounted in owner mode (and never in showcase / anon-creator views).
 */

const MAX = 40
const PLACEHOLDER = 'Camille · Maison Voyage · your guide'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  onPhoto?: boolean
  /** Called after a successful save so the parent can refresh
   *  owner-derived state (label re-renders without reload). */
  onSaved?: () => void
}

export function ContactPillEditor({ owner, operatorContact, onPhoto = false, onSaved }: Props) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const initial = owner?.contact_label ?? ''
  const [draft, setDraft] = useState(initial)

  // Compose the trigger label the same way the public viewer does. When no
  // label is set we don't pass `label` at all → the menu falls back to its
  // own "Contact agent" default. Avoids drifting copy between viewers.
  const composedLabel = owner?.contact_label
    ? `Contact ${owner.contact_label}`
    : undefined

  // Reset draft whenever the popover opens, so cancel reverts cleanly.
  useEffect(() => {
    if (open) setDraft(initial)
  }, [open, initial])

  // Click-outside / Esc dismiss for the popover.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  async function save() {
    if (busy) return
    const trimmed = draft.trim().slice(0, MAX)
    if (trimmed === (initial ?? '')) {
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Not signed in')
        return
      }
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ contactLabel: trimmed === '' ? null : trimmed }),
      })
      if (!res.ok) {
        toast.error('Could not save')
        return
      }
      setOpen(false)
      onSaved?.()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  // Pencil styled to match the rest of the on-photo / off-photo strip.
  // Not a button background — affordance reads as part of the metadata
  // register, like the validity dates.
  const pencilStyle: React.CSSProperties = {
    color: onPhoto ? 'rgba(255,255,255,0.92)' : 'var(--ink-mute)',
    filter: onPhoto ? 'drop-shadow(0 1px 4px rgba(0,0,0,0.4))' : undefined,
  }

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-1.5">
      <ContactAgentMenu
        owner={owner}
        operatorContact={operatorContact}
        onPhoto={onPhoto}
        label={composedLabel}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center p-1 -m-1 rounded hover:opacity-100 opacity-70 transition-opacity cursor-pointer"
        style={pencilStyle}
        aria-label="Edit contact label"
        title="Edit contact label"
      >
        <Pencil size={11} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Edit contact label"
          className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-background border border-border shadow-lg p-3 z-40"
        >
          <label className="block text-xs uppercase tracking-wider text-foreground/55 mb-1.5">
            How clients address you
          </label>
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
            }}
            placeholder={PLACEHOLDER}
            maxLength={MAX}
            className="w-full px-3 py-2 text-sm bg-secondary/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <p className="mt-2 text-xs text-foreground/50">
            Used on every trip's Contact pill. Leave blank for the default.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="px-3 py-1.5 text-sm bg-foreground text-background rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
