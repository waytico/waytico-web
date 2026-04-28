'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Lock,
  User,
  Mail,
  Phone,
  Tag,
  Hash,
  Sparkles,
  StickyNote,
  Compass,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import type { Client, Mutations } from './trip-types'

type Props = {
  projectId: string
  client: Client | null
  bookingRef: string | null
  internalNotes: string | null
  specialRequests: string | null
  saveProjectPatch: Mutations['saveProjectPatch']
  /** Notify the page when the linked client changes — caller can
   *  refetch /full so the dashboard sees the new nickname. */
  onClientChanged?: (client: Client) => void
}

/**
 * Owner-only service block. Sits at the very top of the trip page,
 * directly under the sticky TripActionBar — operators reach it with
 * one glance instead of scrolling to the bottom.
 *
 * Visual model: neutral slate panel, NOT a themed proposal section.
 * Icons lead every field so the block scans top-to-bottom even when
 * channels are unfilled.
 *
 * Persistence
 * ───────────
 * Identity (nickname/name/email/phone/source) and channels go to the
 * agent's per-agent clients table via /api/clients/upsert when no
 * client is linked yet, or PATCH /api/clients/:id once linked. After
 * the first save we PATCH the trip to attach client_id.
 *
 * Trip-only fields (booking_ref, internal_notes, special_requests) go
 * through saveProjectPatch — they live on the trip itself.
 */
export function ClientInfo({
  client,
  bookingRef,
  internalNotes,
  specialRequests,
  saveProjectPatch,
  onClientChanged,
}: Props) {
  const { getToken } = useAuth()
  const [localClient, setLocalClient] = useState<Client | null>(client)

  // Sync from props when /full re-fetches (e.g. after a tool call from
  // the AI command bar updated the client).
  useEffect(() => setLocalClient(client), [client])

  /**
   * Persist a single client field. Routes through upsert (creates or
   * matches by email/phone) on the first save when there's no linked
   * client yet, then through PATCH /:id for subsequent edits.
   */
  async function saveClientField(
    key: keyof Client,
    value: string | null,
  ): Promise<boolean> {
    try {
      const token = await getToken()
      if (!token) return false
      const payload: Record<string, any> = { [key]: value }

      let saved: Client | null = null
      if (localClient) {
        const res = await apiFetch(`/api/clients/${localClient.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          if (res.status === 409) {
            toast.error('Another client already uses that email or phone.')
            return false
          }
          toast.error('Could not save')
          return false
        }
        saved = ((await res.json()).client as Client) ?? null
      } else {
        const res = await apiFetch('/api/clients/upsert', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          toast.error('Could not save')
          return false
        }
        saved = ((await res.json()).client as Client) ?? null
        if (saved) {
          await saveProjectPatch({ clientId: saved.id })
        }
      }

      if (saved) {
        setLocalClient(saved)
        onClientChanged?.(saved)
      }
      return true
    } catch {
      toast.error('Could not save')
      return false
    }
  }

  return (
    <section
      aria-label="Client info — for operator only"
      className="w-full border-b border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800"
    >
      <div className="max-w-4xl mx-auto px-4 py-3.5">
        {/* Header strip */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Lock size={12} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
            Client info
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">·</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
            for your eyes only
          </span>
        </div>

        {/* Nickname — full-width, drives dashboard heading */}
        <div className="mb-2.5">
          <Field
            Icon={Tag}
            label="Nickname"
            value={localClient?.nickname ?? null}
            placeholder='Short label, e.g. "Amina" or "Anna 2 pax"'
            onSave={(v) => saveClientField('nickname', v)}
            wide
          />
        </div>

        {/* Identity row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 mb-3">
          <Field
            Icon={User}
            label="Name"
            value={localClient?.name ?? null}
            placeholder="Client name"
            onSave={(v) => saveClientField('name', v)}
          />
          <Field
            Icon={Mail}
            label="Email"
            type="email"
            value={localClient?.email ?? null}
            placeholder="email@example.com"
            onSave={(v) => saveClientField('email', v)}
          />
          <Field
            Icon={Phone}
            label="Phone"
            type="tel"
            value={localClient?.phone ?? null}
            placeholder="+1 604 555 1234"
            onSave={(v) => saveClientField('phone', v)}
          />
          <Field
            Icon={Compass}
            label="Source"
            value={localClient?.source ?? null}
            placeholder="Where from?"
            onSave={(v) => saveClientField('source', v)}
          />
        </div>

        {/* Channels — icon-priority row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-1.5 mb-3">
          <Field
            Icon={WhatsAppIcon}
            label="WhatsApp"
            type="tel"
            value={localClient?.whatsapp ?? null}
            placeholder="+1 604 555…"
            onSave={(v) => saveClientField('whatsapp', v)}
            iconOnly
          />
          <Field
            Icon={TelegramIcon}
            label="Telegram"
            value={localClient?.telegram ?? null}
            placeholder="@user"
            onSave={(v) => saveClientField('telegram', v)}
            iconOnly
          />
          <Field
            Icon={InstagramIcon}
            label="Instagram"
            value={localClient?.instagram ?? null}
            placeholder="@user"
            onSave={(v) => saveClientField('instagram', v)}
            iconOnly
          />
          <Field
            Icon={FacebookIcon}
            label="Facebook"
            value={localClient?.facebook ?? null}
            placeholder="fb.com/…"
            onSave={(v) => saveClientField('facebook', v)}
            iconOnly
          />
          <Field
            Icon={YouTubeIcon}
            label="YouTube"
            value={localClient?.youtube ?? null}
            placeholder="yt.com/@…"
            onSave={(v) => saveClientField('youtube', v)}
            iconOnly
          />
          <Field
            Icon={TikTokIcon}
            label="TikTok"
            value={localClient?.tiktok ?? null}
            placeholder="@user"
            onSave={(v) => saveClientField('tiktok', v)}
            iconOnly
          />
        </div>

        {/* Trip-specific row */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            <Field
              Icon={Hash}
              label="Booking ref"
              value={bookingRef}
              placeholder="Booking / contract / invoice"
              onSave={(v) => saveProjectPatch({ bookingRef: v })}
            />
            <Field
              Icon={Sparkles}
              label="Special requests"
              value={specialRequests}
              placeholder="Diet, allergies, mobility…"
              onSave={(v) => saveProjectPatch({ specialRequests: v })}
              multiline
            />
          </div>
          <Field
            Icon={StickyNote}
            label="Notes"
            value={internalNotes}
            placeholder="Your private notes about this trip"
            onSave={(v) => saveProjectPatch({ internalNotes: v })}
            multiline
            wide
          />
        </div>
      </div>
    </section>
  )
}

// ─── Field ──────────────────────────────────────────────────────
//
// Variants:
//   default   : icon + small label above + click-to-edit value below
//   iconOnly  : icon IS the label (channel row); aria-label preserved
//   wide      : value spans the row's full width
//   multiline : edit mode opens a textarea, Cmd/Ctrl+Enter commits

function Field({
  Icon,
  label,
  value,
  placeholder,
  type = 'text',
  onSave,
  wide,
  iconOnly,
  multiline,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string | null
  placeholder: string
  type?: 'text' | 'email' | 'tel'
  onSave: (v: string | null) => Promise<boolean>
  wide?: boolean
  iconOnly?: boolean
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    if (multiline) {
      textareaRef.current?.focus()
      textareaRef.current?.select?.()
    } else {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, multiline])

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    const next = trimmed.length > 0 ? trimmed : null
    if ((next || '') === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(next)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  // Multiline collapsed: show first line only so a long notes block
  // doesn't push later fields out of view.
  const displayValue = value
    ? multiline
      ? value.split('\n')[0]
      : value
    : null

  if (iconOnly) {
    return (
      <div className="flex items-center gap-1.5 min-w-0" title={label}>
        <Icon
          size={13}
          className="text-slate-500 dark:text-slate-400 shrink-0"
          aria-hidden="true"
        />
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(value || '')
                setEditing(false)
              }
            }}
            disabled={saving}
            placeholder={placeholder}
            aria-label={label}
            className="flex-1 min-w-0 bg-background border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs outline-none focus:border-slate-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className={`flex-1 min-w-0 text-left text-xs px-1 py-0.5 rounded transition-colors truncate hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
              !value
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-foreground'
            }`}
          >
            {displayValue || placeholder}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${wide ? 'w-full' : ''} min-w-0`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon
          size={11}
          className="text-slate-500 dark:text-slate-400 shrink-0"
          aria-hidden="true"
        />
        <label className="text-[9.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </label>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(value || '')
                setEditing(false)
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                commit()
              }
            }}
            disabled={saving}
            rows={2}
            placeholder={placeholder}
            className="bg-background border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-slate-500 resize-y ml-[18px]"
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(value || '')
                setEditing(false)
              }
            }}
            disabled={saving}
            placeholder={placeholder}
            className="bg-background border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-sm outline-none focus:border-slate-500 ml-[18px]"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left text-sm px-2 py-0.5 rounded transition-colors truncate ml-[18px] hover:bg-slate-100 dark:hover:bg-slate-800/60 ${
            !value
              ? 'text-slate-400 dark:text-slate-500 italic'
              : 'text-foreground'
          }`}
        >
          {displayValue || placeholder}
        </button>
      )}
    </div>
  )
}
