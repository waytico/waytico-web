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
  X,
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
  onClientChanged?: (client: Client) => void
  /**
   * When provided, renders a close (×) button in the top-right of the
   * block header. Used by themes that gate ClientInfo behind a toggle in
   * the action bar (Magazine). Themes that show the block unconditionally
   * (Classic, Cinematic, Clean) leave this undefined and get no button.
   */
  onClose?: () => void
}

/**
 * Operator service block. Sits at the very top of the trip page,
 * directly under TripActionBar.
 *
 * Brand-aligned: warm cream secondary bg + white card pills with
 * border-border, matching the dashboard brand panel and the rest of
 * the operator chrome. NOT a themed proposal section.
 *
 * Three stacked sub-blocks separated by hairline rules:
 *   1. Identity   — nickname (full-width) + name/email/phone/source
 *   2. Channels   — WA/TG/IG/FB/YT/TT, 4-col on lg, icon-priority
 *   3. This trip  — booking ref + special requests + internal notes
 *
 * Field iconography uses accent (terracotta) when filled, muted when
 * empty — at-a-glance signal of which channels are captured.
 *
 * Persistence
 * ───────────
 * Identity + channels go to the per-agent clients table via
 * /api/clients/upsert (first save) or PATCH /api/clients/:id
 * (subsequent saves). On first save we also PATCH the trip to attach
 * client_id. Trip-only fields go through saveProjectPatch.
 */
export function ClientInfo({
  client,
  bookingRef,
  internalNotes,
  specialRequests,
  saveProjectPatch,
  onClientChanged,
  onClose,
}: Props) {
  const { getToken } = useAuth()
  const [localClient, setLocalClient] = useState<Client | null>(client)

  useEffect(() => setLocalClient(client), [client])

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
        if (saved) await saveProjectPatch({ clientId: saved.id })
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
      aria-label="Client info — operator only"
      className="w-full bg-highlight/70 border-y border-accent/20"
    >
      <div className="max-w-4xl mx-auto px-5 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={13} className="text-foreground/60 shrink-0" aria-hidden="true" />
            <h2 className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground/80">
              Client
            </h2>
            <span className="text-[10px] text-foreground/50 italic truncate">
              · all fields optional
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              For your eyes only
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close client info"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* ── Identity ───────────────────────────────────────── */}
        <div className="mb-1.5">
          <Field
            Icon={Tag}
            label="Nickname"
            value={localClient?.nickname ?? null}
            placeholder='Short label, e.g. "Amina" or "Anna 2 pax"'
            onSave={(v) => saveClientField('nickname', v)}
            wide
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-1.5 mb-3">
          <Field
            Icon={User}
            label="Name"
            value={localClient?.name ?? null}
            placeholder="Full name"
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
            placeholder="Instagram, referral…"
            onSave={(v) => saveClientField('source', v)}
          />
        </div>

        {/* ── Channels ───────────────────────────────────────── */}
        <div className="border-t border-border/70 pt-2.5 mb-3">
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-foreground/50 mb-1.5">
            Channels
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5">
            <Field
              Icon={WhatsAppIcon}
              label="WhatsApp"
              type="tel"
              value={localClient?.whatsapp ?? null}
              placeholder="+1 604 555 1234"
              onSave={(v) => saveClientField('whatsapp', v)}

            />
            <Field
              Icon={TelegramIcon}
              label="Telegram"
              value={localClient?.telegram ?? null}
              placeholder="@username or phone"
              onSave={(v) => saveClientField('telegram', v)}

            />
            <Field
              Icon={InstagramIcon}
              label="Instagram"
              value={localClient?.instagram ?? null}
              placeholder="@username"
              onSave={(v) => saveClientField('instagram', v)}

            />
            <Field
              Icon={FacebookIcon}
              label="Facebook"
              value={localClient?.facebook ?? null}
              placeholder="facebook.com/…"
              onSave={(v) => saveClientField('facebook', v)}

            />
            <Field
              Icon={YouTubeIcon}
              label="YouTube"
              value={localClient?.youtube ?? null}
              placeholder="youtube.com/@…"
              onSave={(v) => saveClientField('youtube', v)}

            />
            <Field
              Icon={TikTokIcon}
              label="TikTok"
              value={localClient?.tiktok ?? null}
              placeholder="@username"
              onSave={(v) => saveClientField('tiktok', v)}

            />
          </div>
        </div>

        {/* ── Trip-only ──────────────────────────────────────── */}
        <div className="border-t border-border/70 pt-2.5">
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-foreground/50 mb-1.5">
            This trip
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 mb-1.5">
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
//   default   — icon + click-to-edit pill on a single line
//   wide      — pill spans the full row width
//   multiline — edit opens a textarea; Cmd/Ctrl+Enter commits

function Field({
  Icon,
  label,
  value,
  placeholder,
  type = 'text',
  onSave,
  wide,
  multiline,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string | null
  placeholder: string
  type?: 'text' | 'email' | 'tel'
  onSave: (v: string | null) => Promise<boolean>
  wide?: boolean
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

  const filled = !!value && value.length > 0
  const displayValue = value
    ? multiline
      ? value.split('\n')[0]
      : value
    : null

  // Filled icon → accent terracotta; empty → muted. Single visual
  // signal of "what's already captured" without an extra meter.
  const iconColor = filled ? 'text-accent' : 'text-foreground/30'

  // One-line layout: icon | pill. The icon's `title` attribute carries
  // the field name for hover/accessibility — there's no visible label
  // because the placeholder text + icon shape already say what the
  // field is for.
  const baseBox =
    'flex-1 min-w-0 border rounded-md text-sm leading-tight px-2.5 py-1 transition-colors'

  return (
    <div className={`flex items-center gap-2 ${wide ? 'w-full' : 'min-w-0'}`}>
      <Icon
        size={14}
        className={`shrink-0 ${iconColor}`}
        aria-hidden="true"
      />
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
            aria-label={label}
            className={`${baseBox} bg-card border-accent outline-none resize-y`}
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
            aria-label={label}
            className={`${baseBox} bg-card border-accent outline-none`}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={label}
          aria-label={label}
          className={`${baseBox} text-left truncate ${
            filled
              ? 'bg-card border-border hover:border-foreground/30 text-foreground'
              : 'bg-card/40 border-dashed border-border hover:border-foreground/30 text-foreground/40 italic'
          }`}
        >
          {displayValue || placeholder}
        </button>
      )}
    </div>
  )
}
