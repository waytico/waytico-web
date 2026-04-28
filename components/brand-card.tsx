'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Upload,
  Phone,
  Mail,
  Globe,
  MapPin,
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

const ALLOWED_LOGO_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOGO_SIZE = 15 * 1024 * 1024 // 15 MB

type DefaultContacts = {
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
  address?: string | null
  instagram?: string | null
  facebook?: string | null
  youtube?: string | null
  tiktok?: string | null
}

type UserProfile = {
  id: string
  email: string | null
  contact_email: string | null
  name: string | null
  business_name: string | null
  brand_logo_url: string | null
  brand_tagline: string | null
  brand_terms: string | null
  default_contacts: DefaultContacts | null
}

type ChannelKey =
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'website'
  | 'address'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'

type ChannelDef = {
  key: ChannelKey
  label: string
  placeholder: string
  type: string
  /** Render as a multiline textarea instead of a single-line input. */
  multiline?: boolean
  /** Permissive type so both lucide forwardRef components and our
   *  brand-mark FCs from lib/contact-icons fit. */
  Icon: React.ComponentType<any>
}

/** Channel groupings — same shape as the trip-page Contacts section
 *  but reorganised around what the operator is filling in: who wants to
 *  reach me directly, where can clients find me online, where do I
 *  physically operate from. */
type ChannelGroup = {
  title: string
  hint?: string
  channels: ChannelDef[]
}

const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    title: 'Reach you directly',
    hint: 'Shown to clients on every trip page so they can ask questions.',
    channels: [
      { key: 'phone', label: 'Phone', placeholder: '+1 604 555 1234', type: 'tel', Icon: Phone },
      { key: 'whatsapp', label: 'WhatsApp', placeholder: '+1 604 555 1234', type: 'tel', Icon: WhatsAppIcon },
      { key: 'telegram', label: 'Telegram', placeholder: '@username', type: 'text', Icon: TelegramIcon },
    ],
  },
  {
    title: 'Find you online',
    channels: [
      { key: 'website', label: 'Website', placeholder: 'https://yourbrand.com', type: 'url', Icon: Globe },
      { key: 'instagram', label: 'Instagram', placeholder: '@yourbrand', type: 'text', Icon: InstagramIcon },
      { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourbrand', type: 'text', Icon: FacebookIcon },
      { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@yourbrand', type: 'text', Icon: YouTubeIcon },
      { key: 'tiktok', label: 'TikTok', placeholder: '@yourbrand', type: 'text', Icon: TikTokIcon },
    ],
  },
  {
    title: 'Visit you',
    channels: [
      { key: 'address', label: 'Address', placeholder: '123 Main St, Vancouver BC', type: 'text', multiline: true, Icon: MapPin },
    ],
  },
]

export default function BrandCard() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/users/me', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setLoading(false)
          return
        }
        const data = await res.json()
        if (active) {
          setProfile(data.user)
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [getToken])

  async function patchUser(body: Record<string, unknown>): Promise<boolean> {
    try {
      const token = await getToken()
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Save failed')
        return false
      }
      const data = await res.json()
      setProfile(data.user)
      return true
    } catch {
      toast.error('Network error')
      return false
    }
  }

  async function saveBusinessName(value: string): Promise<boolean> {
    return patchUser({ businessName: value })
  }

  async function saveTagline(value: string): Promise<boolean> {
    return patchUser({ brandTagline: value || null })
  }

  async function saveTerms(value: string): Promise<boolean> {
    return patchUser({ brandTerms: value || null })
  }

  async function saveContactEmail(value: string): Promise<boolean> {
    const trimmed = value.trim()
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Not a valid email')
      return false
    }
    return patchUser({ contactEmail: trimmed || null })
  }

  async function saveContact(key: ChannelKey, value: string): Promise<boolean> {
    const next: DefaultContacts = { ...(profile?.default_contacts || {}) }
    next[key] = value || null
    const hasAny = Object.values(next).some((v) => v !== null && v !== '')
    return patchUser({ defaultContacts: hasAny ? next : null })
  }

  async function handleLogoSelect(file: File) {
    if (!ALLOWED_LOGO_MIME.includes(file.type)) {
      toast.error('Use JPEG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 15MB.`)
      return
    }
    setLogoUploading(true)
    try {
      const token = await getToken()
      const presignRes = await apiFetch('/api/users/me/brand-logo/presign', {
        method: 'POST',
        token,
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.error || `Presign failed (${presignRes.status})`)
      }
      const { uploadUrl, cdnUrl } = (await presignRes.json()) as { uploadUrl: string; cdnUrl: string }
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)
      await patchUser({ brandLogoUrl: cdnUrl })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg)
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeLogo() {
    await patchUser({ brandLogoUrl: null })
  }

  if (loading) {
    return (
      <div className="mb-6 rounded-md bg-secondary/50 h-12 animate-pulse" />
    )
  }
  if (!profile) return null

  const initials = (profile.business_name || profile.name || profile.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const contacts = profile.default_contacts || {}

  // ─── Collapsed (default) ───────────────────────────────
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mb-6 flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50 hover:bg-secondary/70 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-background border border-border">
          {profile.brand_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.brand_logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-foreground/60">
              {initials}
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-foreground">Your profile</span>
        {profile.business_name && (
          <>
            <span className="text-foreground/30 text-sm hidden sm:inline">·</span>
            <span className="text-sm text-foreground/60 truncate hidden sm:inline">
              {profile.business_name}
            </span>
          </>
        )}
        <span className="ml-auto text-xs text-foreground/60 flex items-center gap-1 flex-shrink-0">
          Edit <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>
    )
  }

  // ─── Expanded ───────────────────────────────────────────
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        {/* Logo with hover-trash */}
        <div className="relative h-20 w-20 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={logoUploading}
            className="group/logo h-full w-full overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/40 hover:border-accent/50 hover:bg-secondary/60 transition-colors flex items-center justify-center"
            aria-label={profile.brand_logo_url ? 'Change logo' : 'Upload logo'}
          >
            {profile.brand_logo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.brand_logo_url} alt="Brand logo" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </>
            ) : logoUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-foreground/50">
                <span className="text-xl font-serif font-semibold">{initials || '+'}</span>
                <span className="text-[10px] uppercase tracking-wider">Logo</span>
              </div>
            )}
          </button>
          {/* Hover trash on logo itself */}
          {profile.brand_logo_url && (
            <button
              type="button"
              onClick={removeLogo}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white opacity-0 hover:opacity-100 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="Remove logo"
              style={{ opacity: 1 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleLogoSelect(f)
            }}
          />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <InlineText
            value={profile.business_name}
            placeholder="Your business name"
            onSave={saveBusinessName}
            className="text-xl font-serif font-semibold tracking-tight text-foreground block"
            inputClassName="text-xl font-serif font-semibold tracking-tight"
            required
          />
          <InlineText
            value={profile.brand_tagline}
            placeholder="Add a short tagline (optional)"
            onSave={saveTagline}
            className="text-sm text-foreground/70 block"
            inputClassName="text-sm"
          />
        </div>

        {/* Collapse */}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
          aria-label="Collapse"
        >
          Collapse <ChevronRight className="w-3.5 h-3.5 rotate-90" />
        </button>
      </div>

      {/* Channel groups — same content as before, but grouped by intent
          (Reach / Online / Visit) so the operator can scan and find the
          right field instead of reading every label. Each row has a
          leading icon matching the brand mark on the trip page so the
          dashboard and the live page reinforce each other visually. */}
      <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
        {CHANNEL_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="mb-2">
              <h3 className="text-[10px] uppercase tracking-wider font-semibold text-foreground/60">
                {group.title}
              </h3>
              {group.hint && (
                <p className="text-[10px] text-foreground/40 mt-0.5">
                  {group.hint}
                </p>
              )}
            </div>
            <div className={`grid gap-x-6 gap-y-1 ${
              // Single-channel groups (Visit/Address) get a wide row;
              // multi-channel groups go 2-column on sm+.
              group.channels.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}>
              {/* Email pinned to the top of the Reach group — uses a
                  separate save handler because it lives on
                  users.contact_email, not default_contacts. */}
              {group.title === 'Reach you directly' && (
                <ContactRow
                  label="Email"
                  Icon={Mail}
                  value={profile.contact_email || profile.email || null}
                  placeholder="your.business@email.com"
                  type="email"
                  hint={
                    !profile.contact_email && profile.email
                      ? 'Currently using your login email.'
                      : undefined
                  }
                  onSave={saveContactEmail}
                />
              )}
              {group.channels.map((ch) => (
                <ContactRow
                  key={ch.key}
                  label={ch.label}
                  Icon={ch.Icon}
                  value={(contacts as Record<string, string | null>)[ch.key] || null}
                  placeholder={ch.placeholder}
                  type={ch.type}
                  multiline={ch.multiline}
                  onSave={(v) => saveContact(ch.key, v)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Default Terms — fourth group, matches the rhythm of the
          channel groups above (eyebrow title + hint + content). Brand
          defaults flow into every new trip's terms; per-trip overrides
          on the trip page take precedence. */}
      <section className="mt-4 pt-4 border-t border-border/50">
        <div className="mb-2">
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-foreground/60">
            Default trip terms
          </h3>
          <p className="text-[10px] text-foreground/40 mt-0.5">
            Auto-applied to every new trip. Cancellation, deposit, force majeure.
          </p>
        </div>
        <BrandTermsRow value={profile.brand_terms} onSave={saveTerms} />
      </section>
    </div>
  )
}

// ─── Inline editors ────────────────────────────────────────

type InlineTextProps = {
  value: string | null | undefined
  placeholder: string
  onSave: (v: string) => Promise<boolean>
  className?: string
  inputClassName?: string
  required?: boolean
}

function InlineText({ value, placeholder, onSave, className, inputClassName, required }: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    if (required && !trimmed) {
      setDraft(value || '')
      setEditing(false)
      return
    }
    if (trimmed === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(trimmed)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
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
        className={`w-full bg-background border border-accent/40 rounded px-2 py-1 outline-none focus:border-accent ${inputClassName || ''}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-left w-full hover:bg-secondary/40 rounded px-2 py-1 -mx-2 transition-colors ${className || ''} ${
        !value ? 'text-foreground/40 italic' : ''
      }`}
    >
      {value || placeholder}
    </button>
  )
}

type ContactRowProps = {
  label: string
  value: string | null
  placeholder: string
  type: string
  multiline?: boolean
  /** Lucide or brand-mark icon — same permissive type as the channel
   *  defs above so both sources fit. */
  Icon?: React.ComponentType<any>
  /** Tiny secondary helper text under the label. */
  hint?: string
  onSave: (v: string) => Promise<boolean>
}

function ContactRow({
  label,
  value,
  placeholder,
  type,
  multiline,
  Icon,
  hint,
  onSave,
}: ContactRowProps) {
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
    if (trimmed === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(trimmed)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  // First line only for the collapsed display so a multi-line address
  // doesn't break the strip rhythm — full text appears as soon as the
  // operator clicks to edit.
  const displayValue = value
    ? multiline
      ? value.split('\n')[0]
      : value
    : null

  // Multiline (Address) keeps its own layout — label on top, textarea
  // below, since a 500-char address won't fit on one inline line.
  if (multiline) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <span className="text-foreground/50 shrink-0" aria-hidden="true">
              <Icon size={13} />
            </span>
          )}
          <label className="text-[10px] uppercase tracking-wider text-foreground/60 font-sans font-medium">
            {label}
          </label>
        </div>
        {editing ? (
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
            className="bg-background border border-accent/40 rounded px-2 py-1 text-sm outline-none focus:border-accent resize-y"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`text-left text-sm hover:bg-secondary/40 rounded px-2 py-1 -mx-2 transition-colors border border-transparent hover:border-border truncate ${
              !value ? 'text-foreground/40 italic' : 'text-foreground'
            }`}
          >
            {displayValue || placeholder}
          </button>
        )}
      </div>
    )
  }

  // Single-line: icon + LABEL + value inline. Editing swaps value for
  // an input that takes the remaining row width.
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 py-1">
        {Icon && (
          <span className="text-foreground/50 shrink-0" aria-hidden="true">
            <Icon size={13} />
          </span>
        )}
        <label className="text-[10px] uppercase tracking-wider text-foreground/60 font-sans font-medium shrink-0 w-16">
          {label}
        </label>
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
            className="flex-1 bg-background border border-accent/40 rounded px-2 py-0.5 text-sm outline-none focus:border-accent min-w-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`flex-1 text-left text-sm hover:bg-secondary/40 rounded px-2 py-0.5 -mx-2 transition-colors border border-transparent hover:border-border truncate min-w-0 ${
              !value ? 'text-foreground/40 italic' : 'text-foreground'
            }`}
          >
            {displayValue || placeholder}
          </button>
        )}
      </div>
      {hint && (
        <p className="text-[10px] text-foreground/40 ml-[88px] -mt-0.5">{hint}</p>
      )}
    </div>
  )
}


// ─── Default Terms row ─────────────────────────────────────
//
// Mirrors the ContactRow strip rhythm but uses a textarea in edit mode
// so multi-paragraph terms (cancellation policy, deposit terms, force
// majeure, etc.) fit. Display mode is a one-line truncation with a
// right-aligned Edit affordance.

type BrandTermsRowProps = {
  value: string | null
  onSave: (v: string) => Promise<boolean>
}

function BrandTermsRow({ value, onSave }: BrandTermsRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    if (trimmed === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(trimmed)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  // Display: single-row strip, label left, value (truncated) middle, Edit right.
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded text-left text-sm hover:bg-secondary/40 border border-transparent hover:border-border transition-colors"
      >
        <span className="text-xs uppercase tracking-wider text-foreground/50 shrink-0 w-28">
          Default terms
        </span>
        <span
          className={`flex-1 min-w-0 truncate ${
            value ? 'text-foreground' : 'text-foreground/40 italic'
          }`}
        >
          {value || 'Add default terms (cancellation policy, deposits, etc.)'}
        </span>
        <span className="text-xs text-foreground/50 shrink-0">Edit</span>
      </button>
    )
  }

  // Edit: full-width textarea + Save / Cancel actions.
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-2">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          Default terms
        </span>
      </div>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(value || '')
            setEditing(false)
          }
        }}
        disabled={saving}
        rows={6}
        placeholder="Cancellation policy, deposit, force majeure, etc."
        className="w-full bg-background border border-accent/40 rounded px-3 py-2 text-sm outline-none focus:border-accent resize-y"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(value || '')
            setEditing(false)
          }}
          disabled={saving}
          className="text-xs text-foreground/60 hover:text-foreground px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 px-3 py-1 rounded transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
