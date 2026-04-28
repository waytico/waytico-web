'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Globe } from 'lucide-react'
import { UI } from '@/lib/ui-strings'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import type { OperatorContact, OwnerBrand, Mutations } from './trip-types'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
}

type ContactKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'whatsapp'
  | 'telegram'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'

type ContactField = {
  key: ContactKey
  label: string
  type: 'text' | 'tel' | 'email' | 'url' | 'multiline'
  /** Builds an outbound href when public viewers click the value/icon. */
  href?: (v: string) => string
  /** Renders the inline icon. lucide-react components and the brand-mark
   *  components from lib/contact-icons share the same { size } prop API
   *  but lucide ones are forwardRef-typed; using a permissive type so
   *  both fit. */
  Icon?: React.ComponentType<any>
}

const IDENTITY_FIELDS: ContactField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', href: (v) => `mailto:${v}`, Icon: Mail },
  { key: 'phone', label: 'Phone', type: 'tel', href: (v) => `tel:${v}`, Icon: Phone },
  { key: 'address', label: 'Address', type: 'multiline', Icon: MapPin },
]

const CHANNEL_FIELDS: ContactField[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    type: 'tel',
    href: (v) => `https://wa.me/${v.replace(/[^\d+]/g, '')}`,
    Icon: WhatsAppIcon,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    type: 'text',
    href: (v) => `https://t.me/${v.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`,
    Icon: TelegramIcon,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    type: 'text',
    href: (v) => buildSocialUrl(v, 'instagram.com'),
    Icon: InstagramIcon,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    type: 'url',
    href: (v) => buildSocialUrl(v, 'facebook.com'),
    Icon: FacebookIcon,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    type: 'url',
    href: (v) => buildSocialUrl(v, 'youtube.com'),
    Icon: YouTubeIcon,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    type: 'text',
    href: (v) => buildSocialUrl(v, 'tiktok.com'),
    Icon: TikTokIcon,
  },
  {
    key: 'website',
    label: 'Website',
    type: 'url',
    href: (v) => (v.startsWith('http') ? v : `https://${v}`),
    Icon: Globe,
  },
]

const ALL_FIELDS: ContactField[] = [...IDENTITY_FIELDS, ...CHANNEL_FIELDS]

/**
 * Contacts — last block on the page. Source order:
 *   1. operator_contact override (per-trip, set on the project)
 *   2. owner brand defaults (set in user profile)
 *
 * Layout: identity column (name, email, phone, address) on the left,
 * channel column (WhatsApp / Telegram / Instagram / Facebook / YouTube /
 * TikTok / Website) on the right. Each row has a leading 16px icon.
 *
 * Owner mode: tap a row to edit. Saves go onto operator_contact, so a
 * blank field falls back to the brand defaults.
 */
export function TripContacts({ owner, operatorContact, editable, saveProjectPatch }: Props) {
  const resolved = resolveContacts(owner, operatorContact)
  const hasAny = ALL_FIELDS.some((f) => resolved[f.key])

  if (!editable && !hasAny) return null

  const renderRow = (f: ContactField) => (
    <ContactRow
      key={f.key}
      field={f}
      value={resolved[f.key]}
      override={(operatorContact?.[f.key] as string | null | undefined) ?? null}
      editable={editable}
      onSave={async (next) => {
        if (!saveProjectPatch) return false
        const patch: Record<string, any> = {
          ...(operatorContact || {}),
          [f.key]: next,
        }
        return saveProjectPatch({ operatorContact: patch })
      }}
    />
  )

  return (
    <section className="tp-section" id="contacts">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.contacts}</h2>
        </header>
        <div className="tp-contacts-grid">
          <div className="tp-contacts-col">
            {IDENTITY_FIELDS.map(renderRow)}
          </div>
          <div className="tp-contacts-col">
            {CHANNEL_FIELDS.map(renderRow)}
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactRow({
  field,
  value,
  override,
  editable,
  onSave,
}: {
  field: ContactField
  value: string | null
  override: string | null
  editable: boolean
  onSave: (next: string | null) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(override || '')

  const Icon = field.Icon
  const isMultiline = field.type === 'multiline'

  async function commit() {
    const v = draft.trim()
    const next = v.length > 0 ? v : null
    if (next !== override) {
      await onSave(next)
    }
    setEditing(false)
  }

  // Owner editor
  if (editable) {
    if (editing) {
      return (
        <div className="tp-contact-row">
          {Icon && (
            <span className="tp-contact-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
          )}
          <span className="tp-contact-label">{field.label}</span>
          {isMultiline ? (
            <textarea
              className="tp-contact-input tp-contact-input--multiline"
              value={draft}
              autoFocus
              rows={2}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(override || '')
                  setEditing(false)
                }
              }}
            />
          ) : (
            <input
              className="tp-contact-input"
              type={field.type === 'multiline' ? 'text' : field.type}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setDraft(override || '')
                  setEditing(false)
                }
              }}
            />
          )}
        </div>
      )
    }

    return (
      <div
        className="tp-contact-row"
        onClick={() => setEditing(true)}
        style={{ cursor: 'text' }}
      >
        {Icon && (
          <span className="tp-contact-icon" aria-hidden="true">
            <Icon size={16} />
          </span>
        )}
        <span className="tp-contact-label">{field.label}</span>
        {value ? (
          <span
            className="tp-contact-value"
            style={isMultiline ? { whiteSpace: 'pre-line' } : undefined}
          >
            {value}
          </span>
        ) : (
          <span className="tp-contact-value tp-contact-value--placeholder">
            Add {field.label.toLowerCase()}
          </span>
        )}
      </div>
    )
  }

  // Public render
  if (!value) return null

  const inner = field.href ? (
    <a
      className="tp-contact-value"
      href={field.href(value)}
      target="_blank"
      rel="noopener noreferrer"
      style={isMultiline ? { whiteSpace: 'pre-line' } : undefined}
    >
      {displayValue(field, value)}
    </a>
  ) : (
    <span
      className="tp-contact-value"
      style={isMultiline ? { whiteSpace: 'pre-line' } : undefined}
    >
      {displayValue(field, value)}
    </span>
  )

  return (
    <div className="tp-contact-row">
      {Icon && (
        <span className="tp-contact-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
      )}
      <span className="tp-contact-label">{field.label}</span>
      {inner}
    </div>
  )
}

function displayValue(f: ContactField, v: string): string {
  if (
    f.type === 'url' ||
    f.key === 'website' ||
    f.key === 'instagram' ||
    f.key === 'facebook' ||
    f.key === 'youtube' ||
    f.key === 'tiktok'
  ) {
    return v.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  return v
}

function buildSocialUrl(v: string, host: string): string {
  if (v.startsWith('http')) return v
  const handle = v.replace(/^@/, '').replace(/^\//, '')
  return `https://${host}/${handle}`
}

function resolveContacts(
  owner: OwnerBrand,
  override: OperatorContact,
): Record<ContactKey, string | null> {
  return {
    name: pick(override?.name, owner?.brand_name),
    email: pick(override?.email, owner?.brand_email),
    phone: pick(override?.phone, owner?.brand_phone),
    address: pick(override?.address, owner?.brand_address),
    whatsapp: pick(override?.whatsapp, owner?.brand_whatsapp),
    telegram: pick(override?.telegram, owner?.brand_telegram),
    website: pick(override?.website, owner?.brand_website),
    instagram: pick(override?.instagram, owner?.brand_instagram),
    facebook: pick(override?.facebook, owner?.brand_facebook),
    youtube: pick(override?.youtube, owner?.brand_youtube),
    tiktok: pick(override?.tiktok, owner?.brand_tiktok),
  }
}

function pick(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (typeof a === 'string' && a.trim().length > 0) return a
  if (typeof b === 'string' && b.trim().length > 0) return b
  return null
}
