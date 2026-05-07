'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/nextjs'
import { Ban, Archive, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  client: Client | null
  /** How many trips reference this client. Drives the delete-confirm
   *  message — operators get a louder warning when removing a client
   *  with linked trips (FK is ON DELETE SET NULL on backend, so trips
   *  survive but lose attribution). */
  tripCount?: number
  onClose: () => void
  onSaved: (client: Client) => void
  onDeleted?: (clientId: string) => void
}

type FormState = {
  nickname: string
  name: string
  email: string
  phone: string
  whatsapp: string
  telegram: string
  instagram: string
  facebook: string
  youtube: string
  tiktok: string
  source: string
  notes: string
  archived: boolean
  blacklisted: boolean
}

function fromClient(c: Client): FormState {
  return {
    nickname: c.nickname ?? '',
    name: c.name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    whatsapp: c.whatsapp ?? '',
    telegram: c.telegram ?? '',
    instagram: c.instagram ?? '',
    facebook: c.facebook ?? '',
    youtube: c.youtube ?? '',
    tiktok: c.tiktok ?? '',
    source: c.source ?? '',
    notes: c.notes ?? '',
    archived: c.archived,
    blacklisted: c.blacklisted,
  }
}

/**
 * EditClientModal — pre-populated edit sheet for an existing client.
 * Same fields as NewClientModal in spirit, plus archived / blacklisted
 * toggles at the bottom. Save = PATCH /api/clients/:id.
 *
 * Intentionally less compact than NewClientModal — every field is
 * shown so the operator can edit any piece of the record without
 * digging through "More fields".
 */
export default function EditClientModal({ open, client, tripCount = 0, onClose, onSaved, onDeleted }: Props) {
  const { getToken } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open && client) {
      setState(fromClient(client))
      setSaving(false)
    }
  }, [open, client])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted || !open || !client || !state) return null

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setState((s) => (s ? { ...s, [k]: v } : s))
  }

  async function handleSave() {
    if (!state || saving || !client) return
    setSaving(true)
    try {
      const token = await getToken()
      const body: Record<string, unknown> = {
        nickname: state.nickname.trim() || null,
        name: state.name.trim() || null,
        email: state.email.trim() || null,
        phone: state.phone.trim() || null,
        whatsapp: state.whatsapp.trim() || null,
        telegram: state.telegram.trim() || null,
        instagram: state.instagram.trim() || null,
        facebook: state.facebook.trim() || null,
        youtube: state.youtube.trim() || null,
        tiktok: state.tiktok.trim() || null,
        source: state.source.trim() || null,
        notes: state.notes.trim() || null,
        archived: state.archived,
        blacklisted: state.blacklisted,
      }
      const res = await apiFetch(`/api/clients/${client.id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (res.status === 409) {
        toast.error('Another client of yours already uses that email or phone.')
        return
      }
      if (!res.ok) {
        toast.error('Could not save changes')
        return
      }
      const data = await res.json()
      onSaved(data.client)
      toast.success('Client updated')
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!client) return
    const headline = client.nickname || client.name || client.email || 'this client'
    const message =
      tripCount > 0
        ? `${headline} has ${tripCount} trip${tripCount === 1 ? '' : 's'} on file. Trips will keep their data but become unowned. Delete client?`
        : `Delete ${headline}? This cannot be undone.`
    if (!window.confirm(message)) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/clients/${client.id}`, { token, method: 'DELETE' })
      if (!res.ok) {
        toast.error('Could not delete')
        return
      }
      toast.success('Client deleted')
      onDeleted?.(client.id)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  function row(label: string, k: keyof FormState) {
    return (
      <div className="flex items-center gap-2">
        <label className="w-20 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
        <input
          type="text"
          value={String(state![k] ?? '')}
          onChange={(e) => set(k, e.target.value as any)}
          className="flex-1 px-2.5 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/40 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit client"
        className="relative w-full max-w-md rounded-lg bg-card border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Edit client</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {row('Nickname', 'nickname')}
          {row('Name', 'name')}
          {row('Email', 'email')}
          {row('Phone', 'phone')}
          {row('WhatsApp', 'whatsapp')}
          {row('Telegram', 'telegram')}
          {row('Instagram', 'instagram')}
          {row('Facebook', 'facebook')}
          {row('YouTube', 'youtube')}
          {row('TikTok', 'tiktok')}
          {row('Source', 'source')}
          <div className="flex items-start gap-2">
            <label className="w-20 mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              value={state.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            />
          </div>

          <div className="pt-3 mt-3 border-t border-border space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground/85">
              <input
                type="checkbox"
                checked={state.archived}
                onChange={(e) => set('archived', e.target.checked)}
              />
              <Archive className="w-3.5 h-3.5 text-muted-foreground" />
              Archived
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/85">
              <input
                type="checkbox"
                checked={state.blacklisted}
                onChange={(e) => set('blacklisted', e.target.checked)}
              />
              <Ban className="w-3.5 h-3.5 text-muted-foreground" />
              Blacklisted
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="ml-auto flex items-center gap-2">
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
              disabled={saving}
              className="px-4 h-9 text-sm rounded-md bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

