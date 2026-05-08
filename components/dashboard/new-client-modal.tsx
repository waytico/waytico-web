'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, X } from 'lucide-react'
import { toast } from 'sonner'
import SmartClientInput, { detectIdentity } from './smart-client-input'
import { apiFetch } from '@/lib/api'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  onClose: () => void
  /** Pre-fill on open. Used by SmartClientPicker → "Create new with X". */
  /** Pre-populate fields from a smart-detected draft. Modal opens with
   *  these values pre-filled. Used by SmartClientPicker auto-create. */
  preDraft?: Partial<Client>
  /** Called with the resulting client (newly created OR existing-deduped). */
  onSaved: (client: Client, deduped: boolean) => void
}

type ChipKey = 'phone' | 'email' | 'telegram' | 'whatsapp' | 'instagram' | 'facebook' | 'youtube' | 'tiktok'

type FormState = {
  contacts: Partial<Record<ChipKey, string>>
  nickname: string
  name: string
  source: string
  notes: string
}

const EMPTY: FormState = {
  contacts: {},
  nickname: '',
  name: '',
  source: '',
  notes: '',
}

/** True when at least one of phone / email / whatsapp / telegram is set
 *  to a non-empty value. TZ §3.7 minimum-contact rule. */
function hasIdentifier(s: FormState): boolean {
  const c = s.contacts
  return Boolean((c.phone || c.email || c.whatsapp || c.telegram || '').trim())
}

function draftToState(draft?: Partial<Client>): FormState {
  if (!draft) return EMPTY
  const out: FormState = { ...EMPTY, contacts: {} }
  if (draft.phone)     out.contacts.phone     = draft.phone
  if (draft.email)     out.contacts.email     = draft.email
  if (draft.telegram)  out.contacts.telegram  = draft.telegram
  if (draft.whatsapp)  out.contacts.whatsapp  = draft.whatsapp
  if (draft.instagram) out.contacts.instagram = draft.instagram
  if (draft.facebook)  out.contacts.facebook  = draft.facebook
  if (draft.youtube)   out.contacts.youtube   = draft.youtube
  if (draft.tiktok)    out.contacts.tiktok    = draft.tiktok
  if (draft.nickname)  out.nickname           = draft.nickname
  if (draft.name)      out.name               = draft.name
  if (draft.source)    out.source             = draft.source
  if (draft.notes)     out.notes              = draft.notes
  return out
}

const CONTACT_LABELS: Record<ChipKey, string> = {
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

/**
 * NewClientModal — primary "+ New client" sheet on the dashboard.
 *
 *   Title
 *   SmartClientInput (auto-detect → adds chip below)
 *   chips for typed/detected contacts (each editable + removable)
 *   "+ Add another contact" button → opens dropdown of contact-types
 *   "More fields ▾" → nickname / name / source / notes
 *   [Create client]
 *
 * Save = POST /api/clients/upsert. If the response is an existing
 * client (server dedups by email/phone), surfaces a toast and treats
 * it as a successful link.
 */
export default function NewClientModal({ open, onClose, preDraft, onSaved }: Props) {
  const { getToken } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<FormState>(EMPTY)
  const [showMore, setShowMore] = useState(false)
  const [adding, setAdding] = useState<ChipKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      setState(draftToState(preDraft))
      setShowMore(false)
      setSaving(false)
      setPickerOpen(false)
    }
  }, [open, preDraft])

  // Esc closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function setContact(k: ChipKey, v: string) {
    setState((s) => ({ ...s, contacts: { ...s.contacts, [k]: v } }))
  }
  function removeContact(k: ChipKey) {
    setState((s) => {
      const next = { ...s.contacts }
      delete next[k]
      return { ...s, contacts: next }
    })
  }
  function addContact(k: ChipKey) {
    setContact(k, '')
    setPickerOpen(false)
  }

  function smartChange(v: string) {
    // Treat the smart input as a write to the auto-detected channel.
    const det = detectIdentity(v)
    if (det.kind === 'name') {
      setState((s) => ({ ...s, name: v.trim() }))
      // Clear any earlier auto-fill into a contact channel — keeps
      // the smart input single-purpose: typed value lives either as
      // name (free text) or as one channel chip.
    } else {
      const k: ChipKey =
        det.kind === 'phone' ? 'phone'
          : det.kind === 'email' ? 'email'
            : det.kind === 'telegram' ? 'telegram'
              : 'instagram'
      setContact(k, det.value)
    }
  }

  // What the smart input shows is the "current detection candidate".
  // We mirror it from contacts.* / name when re-opening with a draft.
  const smartValue =
    state.contacts.phone ||
    state.contacts.email ||
    state.contacts.telegram ||
    state.contacts.instagram ||
    state.name ||
    ''

  const valid = hasIdentifier(state)

  const availableChannels: ChipKey[] = (
    ['phone', 'email', 'whatsapp', 'telegram', 'instagram', 'facebook', 'youtube', 'tiktok'] as ChipKey[]
  ).filter((k) => !(k in state.contacts))

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    try {
      const token = await getToken()
      const body: Record<string, unknown> = {
        nickname: state.nickname.trim() || null,
        name: state.name.trim() || null,
        source: state.source.trim() || null,
        notes: state.notes.trim() || null,
      }
      for (const k of Object.keys(state.contacts) as ChipKey[]) {
        const v = (state.contacts[k] ?? '').trim()
        if (v) body[k] = v
      }

      const res = await apiFetch('/api/clients/upsert', {
        token,
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error('Could not save client')
        return
      }
      const data = await res.json()
      const c: Client = data.client
      // The backend doesn't tell us "newly created vs matched" so we
      // detect indirectly: if created_at is older than 5 seconds we
      // assume it was deduped.
      const ageMs = Date.now() - +new Date(c.created_at)
      const deduped = ageMs > 5000
      if (deduped) toast.success('Linked existing client')
      else toast.success('Client created')
      onSaved(c, deduped)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New client"
        className="relative w-full max-w-md rounded-lg bg-card border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">New client</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <SmartClientInput
            value={smartValue}
            onChange={smartChange}
            placeholder="Phone, email, telegram, WhatsApp, Instagram…"
            autoFocus
          />

          {Object.entries(state.contacts).length > 0 && (
            <div className="space-y-2">
              {(Object.keys(state.contacts) as ChipKey[]).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <label className="w-20 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {CONTACT_LABELS[k]}
                  </label>
                  <input
                    type="text"
                    value={state.contacts[k] ?? ''}
                    onChange={(e) => setContact(k, e.target.value)}
                    className="flex-1 px-2.5 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(k)}
                    aria-label={`Remove ${CONTACT_LABELS[k]}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={availableChannels.length === 0}
              className="text-xs text-foreground/70 hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
            >
              + Add another contact
              <ChevronDown className="w-3 h-3" />
            </button>
            {pickerOpen && availableChannels.length > 0 && (
              <div className="absolute z-10 left-0 mt-1 rounded-md border border-border bg-card shadow-lg py-1 min-w-[160px]">
                {availableChannels.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => addContact(k)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/60"
                  >
                    {CONTACT_LABELS[k]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs text-foreground/70 hover:text-foreground inline-flex items-center gap-1"
          >
            More fields
            <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>

          {showMore && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="w-20 text-[11px] uppercase tracking-wider text-muted-foreground">Nickname</label>
                <input
                  type="text"
                  value={state.nickname}
                  onChange={(e) => setState((s) => ({ ...s, nickname: e.target.value }))}
                  className="flex-1 px-2.5 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-20 text-[11px] uppercase tracking-wider text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                  className="flex-1 px-2.5 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-20 text-[11px] uppercase tracking-wider text-muted-foreground">Source</label>
                <input
                  type="text"
                  value={state.source}
                  onChange={(e) => setState((s) => ({ ...s, source: e.target.value }))}
                  className="flex-1 px-2.5 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex items-start gap-2">
                <label className="w-20 mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Notes</label>
                <textarea
                  value={state.notes}
                  onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                  rows={3}
                  className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 h-9 text-sm text-foreground/70 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid || saving}
            className="px-4 h-9 text-sm rounded-md bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            {saving ? 'Saving…' : 'Create client'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
