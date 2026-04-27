'use client'

import { useState } from 'react'
import { UI } from '@/lib/ui-strings'
import type { OperatorContact, OwnerBrand, Mutations } from './trip-types'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
}

type ContactField = {
  key: 'name' | 'email' | 'phone' | 'whatsapp' | 'telegram' | 'website'
  label: string
  href?: (v: string) => string
  type: 'text' | 'tel' | 'email' | 'url'
}

const FIELDS: ContactField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', href: (v) => `mailto:${v}` },
  { key: 'phone', label: 'Phone', type: 'tel', href: (v) => `tel:${v}` },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel', href: (v) => `https://wa.me/${v.replace(/[^\d+]/g, '')}` },
  { key: 'telegram', label: 'Telegram', type: 'text', href: (v) => `https://t.me/${v.replace(/^@/, '')}` },
  { key: 'website', label: 'Website', type: 'url', href: (v) => (v.startsWith('http') ? v : `https://${v}`) },
]

/**
 * Contacts — last block on the page. Source order:
 *   1. operator_contact override (per-trip, set on the project)
 *   2. owner brand defaults (set in user profile)
 *
 * In owner mode, fields edit the project-level operator_contact override
 * (not the user profile). Empty fields fall back to the brand defaults so
 * the operator can leave most of them blank and still show contact info.
 */
export function TripContacts({ owner, operatorContact, editable, saveProjectPatch }: Props) {
  const resolved = resolveContacts(owner, operatorContact)
  const hasAny = FIELDS.some((f) => resolved[f.key])

  if (!editable && !hasAny) return null

  return (
    <section className="tp-section" id="contacts">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.contacts}</h2>
        </header>
        <div className="tp-contacts">
          {FIELDS.map((f) => (
            <ContactRow
              key={f.key}
              field={f}
              value={resolved[f.key]}
              override={operatorContact?.[f.key] ?? null}
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
          ))}
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
  /** Effective resolved value (override → brand fallback). */
  value: string | null
  /** Per-trip override only (so owner mode shows what *they* typed, not the brand fallback). */
  override: string | null
  editable: boolean
  onSave: (next: string | null) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(override || '')

  if (editable) {
    if (editing) {
      return (
        <div className="tp-contact-row">
          <span className="tp-contact-label">{field.label}</span>
          <input
            className="tp-contact-input"
            type={field.type}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={async () => {
              const v = draft.trim()
              const next = v.length > 0 ? v : null
              if (next !== override) {
                await onSave(next)
              }
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setDraft(override || '')
                setEditing(false)
              }
            }}
          />
        </div>
      )
    }
    return (
      <div className="tp-contact-row" onClick={() => setEditing(true)} style={{ cursor: 'text' }}>
        <span className="tp-contact-label">{field.label}</span>
        {value ? (
          <span className="tp-contact-value">{value}</span>
        ) : (
          <span className="tp-contact-value tp-contact-value--placeholder">Add {field.label.toLowerCase()}</span>
        )}
      </div>
    )
  }

  if (!value) return null
  return (
    <div className="tp-contact-row">
      <span className="tp-contact-label">{field.label}</span>
      {field.href ? (
        <a className="tp-contact-value" href={field.href(value)} target="_blank" rel="noopener noreferrer">
          {value}
        </a>
      ) : (
        <span className="tp-contact-value">{value}</span>
      )}
    </div>
  )
}

/** Per-trip override wins; falls back to user brand defaults. */
function resolveContacts(
  owner: OwnerBrand,
  override: OperatorContact,
): Record<ContactField['key'], string | null> {
  return {
    name: pick(override?.name, owner?.brand_name),
    email: pick(override?.email, owner?.brand_email),
    phone: pick(override?.phone, owner?.brand_phone),
    whatsapp: pick(override?.whatsapp, owner?.brand_whatsapp),
    telegram: pick(override?.telegram, owner?.brand_telegram),
    website: pick(override?.website, owner?.brand_website),
  }
}

function pick(a: string | null | undefined, b: string | null | undefined): string | null {
  if (typeof a === 'string' && a.trim().length > 0) return a
  if (typeof b === 'string' && b.trim().length > 0) return b
  return null
}
