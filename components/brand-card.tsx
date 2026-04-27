'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, ChevronRight, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

const ALLOWED_LOGO_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOGO_SIZE = 15 * 1024 * 1024 // 15 MB

type DefaultContacts = {
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
}

type UserProfile = {
  id: string
  email: string | null
  name: string | null
  business_name: string | null
  brand_logo_url: string | null
  brand_tagline: string | null
  default_contacts: DefaultContacts | null
}

type ChannelKey = 'phone' | 'whatsapp' | 'telegram' | 'website'

const CHANNELS: Array<{ key: ChannelKey; label: string; placeholder: string; type: string }> = [
  { key: 'phone', label: 'Phone', placeholder: '+1 604 555 1234', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+1 604 555 1234', type: 'tel' },
  { key: 'telegram', label: 'Telegram', placeholder: '@username', type: 'text' },
  { key: 'website', label: 'Website', placeholder: 'https://yourbrand.com', type: 'url' },
]

export default function BrandCard() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initial load
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/users/me', { token })
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

  async function saveContact(key: ChannelKey, value: string): Promise<boolean> {
    const next: DefaultContacts = { ...(profile?.default_contacts || {}) }
    next[key] = value || null
    // If every channel ends up empty, send null instead of an empty object —
    // the column then goes back to NULL on the server.
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
      // 1. Presign
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
      // 2. PUT to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)
      // 3. Attach to profile
      await patchUser({ brandLogoUrl: cdnUrl })
      toast.success('Logo updated')
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
      <div className="mb-8 rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-secondary rounded" />
            <div className="h-3 w-48 bg-secondary rounded" />
          </div>
        </div>
      </div>
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
  const contactsCount = Object.values(contacts).filter((v) => v && v !== '').length

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-foreground/50 mb-3 font-sans">
        Your brand · auto-fills into every trip
      </p>
      <div className="flex items-start gap-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={logoUploading}
          className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/40 hover:border-accent/50 hover:bg-secondary/60 transition-colors flex items-center justify-center group"
          aria-label={profile.brand_logo_url ? 'Change logo' : 'Upload logo'}
        >
          {profile.brand_logo_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.brand_logo_url}
                alt="Brand logo"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </>
          ) : logoUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-foreground/50 group-hover:text-foreground/80">
              <span className="text-xl font-serif font-semibold">{initials || '+'}</span>
              <span className="text-[10px] uppercase tracking-wider">Logo</span>
            </div>
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
        </button>

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
          <p className="text-xs text-foreground/50 font-sans">
            {profile.email}
          </p>
        </div>

        {/* Logo remove (only if logo present) */}
        {profile.brand_logo_url && (
          <button
            type="button"
            onClick={removeLogo}
            className="text-xs text-foreground/50 hover:text-destructive transition-colors flex items-center gap-1"
            aria-label="Remove logo"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Logo</span>
          </button>
        )}
      </div>

      {/* Default contacts (collapsed by default) */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <button
          type="button"
          onClick={() => setContactsOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
          aria-expanded={contactsOpen}
        >
          {contactsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">Default contacts</span>
          <span className="text-foreground/40 text-xs">
            {contactsCount > 0 ? `${contactsCount} set` : 'none yet'}
          </span>
        </button>

        {contactsOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHANNELS.map((ch) => (
              <ContactRow
                key={ch.key}
                label={ch.label}
                value={(contacts as Record<string, string | null>)[ch.key] || null}
                placeholder={ch.placeholder}
                type={ch.type}
                onSave={(v) => saveContact(ch.key, v)}
              />
            ))}
          </div>
        )}
      </div>
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

function InlineText({
  value,
  placeholder,
  onSave,
  className,
  inputClassName,
  required,
}: InlineTextProps) {
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

  function cancel() {
    setDraft(value || '')
    setEditing(false)
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
            cancel()
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
  onSave: (v: string) => Promise<boolean>
}

function ContactRow({ label, value, placeholder, type, onSave }: ContactRowProps) {
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

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wider text-foreground/50 font-sans">
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
          className="bg-background border border-accent/40 rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left text-sm hover:bg-secondary/40 rounded px-2 py-1.5 -mx-2 transition-colors border border-transparent hover:border-border ${
            !value ? 'text-foreground/40 italic' : 'text-foreground'
          }`}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  )
}
