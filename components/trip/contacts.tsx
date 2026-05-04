'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, Globe, Eye, EyeOff } from 'lucide-react'
import { UI } from '@/lib/ui-strings'
import { EditableField } from '@/components/editable/editable-field'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import type { OperatorContact, OwnerBrand, Mutations } from './trip-types'
import type { ThemeId } from '@/lib/themes'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
  /** When 'magazine', renders the Magazine variant — same channel
   *  resolution + EyeOff/inline-edit semantics, restyled wrapper +
   *  identity panel. Other values keep the editorial layout. */
  theme?: ThemeId
}

type ChannelKey =
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'

type Channel = {
  key: ChannelKey
  label: string
  /** lucide-react components and our brand-mark components share the
   *  same { size, className } prop API; permissive type so both fit. */
  Icon: React.ComponentType<any>
  /** Outbound URL builder for public viewers. */
  href: (v: string) => string
  /** Whether the public render shows the value as text (email/phone)
   *  or as an icon-only link (social channels). */
  textInPublic: boolean
}

const CHANNELS: Channel[] = [
  {
    key: 'email',
    label: 'Email',
    Icon: Mail,
    href: (v) => `mailto:${v}`,
    textInPublic: true,
  },
  {
    key: 'phone',
    label: 'Phone',
    Icon: Phone,
    href: (v) => `tel:${v}`,
    textInPublic: true,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    Icon: WhatsAppIcon,
    href: (v) => `https://wa.me/${v.replace(/[^\d+]/g, '')}`,
    textInPublic: false,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    Icon: TelegramIcon,
    href: (v) =>
      `https://t.me/${v.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`,
    textInPublic: false,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: InstagramIcon,
    href: (v) => buildSocialUrl(v, 'instagram.com'),
    textInPublic: false,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    href: (v) => buildSocialUrl(v, 'facebook.com'),
    textInPublic: false,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    Icon: YouTubeIcon,
    href: (v) => buildSocialUrl(v, 'youtube.com'),
    textInPublic: false,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    Icon: TikTokIcon,
    href: (v) => buildSocialUrl(v, 'tiktok.com'),
    textInPublic: false,
  },
  {
    key: 'website',
    label: 'Website',
    Icon: Globe,
    href: (v) => (v.startsWith('http') ? v : `https://${v}`),
    textInPublic: false,
  },
]

/**
 * Contacts — section block at the end of /t/[slug] in the
 * "Questions about this trip?" idiom. Replaces the previous tabular
 * Name/Email/Phone grid; the table layout duplicated visual weight
 * with the section header without giving travellers any new info.
 *
 * Source order (resolveContacts):
 *   1. operator_contact override (per-trip, set on the project)
 *   2. owner brand defaults (from user profile)
 *
 * Hidden channels: operator_contact.hidden_channels — strings naming
 * channels to suppress on this trip even if a value exists. Public
 * render skips them entirely; owner render shows them dimmed with an
 * EyeOff toggle.
 *
 * Layout
 * ──────
 *   Left:  brand identity (logo + name + tagline + address)
 *   Right: "Questions about this trip?" + email/phone as text rows
 *          with leading icon + a row of brand-mark icons for social
 *          channels and Website.
 *
 * Owner mode adds, on every channel:
 *   - inline editable value (click to edit)
 *   - EyeOff/Eye toggle to hide/show on the public page
 *   - small hint at the bottom linking to /dashboard for adding the
 *     channels not configured on the brand yet.
 */
export function TripContacts({ owner, operatorContact, editable, saveProjectPatch, theme }: Props) {
  if (theme === 'magazine') {
    return (
      <ContactsMagazine
        owner={owner}
        operatorContact={operatorContact}
        editable={editable}
        saveProjectPatch={saveProjectPatch}
      />
    )
  }

  const resolved = resolveContacts(owner, operatorContact)
  const hidden = new Set(operatorContact?.hidden_channels || [])
  const tagline = owner?.brand_tagline || null
  const logoUrl = owner?.brand_logo_url || null
  const brandName = pick(operatorContact?.name, owner?.brand_name)
  const address = pick(operatorContact?.address, owner?.brand_address)

  // Visible channels = configured AND not hidden, for the public render.
  const visibleChannels = CHANNELS.filter(
    (c) => resolved[c.key] && !hidden.has(c.key),
  )
  // Channels with a value, regardless of hidden flag — owner mode
  // shows these all so the operator can flip visibility without losing
  // sight of what's there.
  const configuredChannels = CHANNELS.filter((c) => resolved[c.key])
  // Channels not yet configured anywhere — surfaced as a "add these
  // in your profile" hint in owner mode.
  const missingChannelLabels = CHANNELS.filter((c) => !resolved[c.key]).map(
    (c) => c.label,
  )

  if (!editable && visibleChannels.length === 0 && !brandName && !address) {
    return null
  }

  const textChannels = (editable ? configuredChannels : visibleChannels).filter(
    (c) => c.textInPublic,
  )
  const iconChannels = (editable ? configuredChannels : visibleChannels).filter(
    (c) => !c.textInPublic,
  )

  return (
    <section className="tp-section" id="contacts">
      <div className="tp-container">
        <div className="tp-contacts-block">
          {/* Left: brand identity */}
          <div className="tp-contacts-brand">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={brandName || 'Operator'}
                className="tp-contacts-logo"
              />
            )}
            <div className="tp-contacts-identity">
              {brandName && (
                <p className="tp-contacts-brand-name">{brandName}</p>
              )}
              {tagline && (
                <p className="tp-contacts-brand-tagline">{tagline}</p>
              )}
              {address && (
                <p className="tp-contacts-brand-address">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: questions header + reachable channels */}
          <div className="tp-contacts-channels">
            <h2 className="tp-contacts-heading">
              <EditableField
                as="text"
                editable={editable}
                value={
                  operatorContact?.heading?.trim() || UI.contactsHeading
                }
                placeholder={UI.contactsHeading}
                onSave={(v) => {
                  const trimmed = v.trim()
                  const next =
                    !trimmed || trimmed === UI.contactsHeading ? null : trimmed
                  return saveValue('heading', next, operatorContact, saveProjectPatch)
                }}
                maxLength={120}
              />
            </h2>
            <p className="tp-contacts-subheading">
              <EditableField
                as="multiline"
                rows={2}
                editable={editable}
                value={
                  operatorContact?.subheading?.trim() ||
                  UI.contactsSubheading
                }
                placeholder={UI.contactsSubheading}
                onSave={(v) => {
                  const trimmed = v.trim()
                  const next =
                    !trimmed || trimmed === UI.contactsSubheading ? null : trimmed
                  return saveValue('subheading', next, operatorContact, saveProjectPatch)
                }}
              />
            </p>

            {/* Email/phone — text rows with leading icon */}
            <ul className="tp-contacts-list">
              {textChannels.map((c) => (
                <ChannelTextRow
                  key={c.key}
                  channel={c}
                  value={resolved[c.key]!}
                  override={(operatorContact?.[c.key] as string | null | undefined) ?? null}
                  hidden={hidden.has(c.key)}
                  editable={editable}
                  onSaveValue={(v) =>
                    saveValue(c.key, v, operatorContact, saveProjectPatch)
                  }
                  onToggleHidden={() =>
                    toggleHidden(c.key, hidden, operatorContact, saveProjectPatch)
                  }
                />
              ))}
            </ul>

            {/* Social + website — icon row in public, expanded list in owner */}
            {iconChannels.length > 0 && !editable && (
              <div className="tp-contacts-icons">
                {iconChannels.map((c) => {
                  const v = resolved[c.key]!
                  const Icon = c.Icon
                  return (
                    <a
                      key={c.key}
                      href={c.href(v)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={c.label}
                      aria-label={c.label}
                      className="tp-contacts-icon-link"
                    >
                      <Icon size={20} />
                    </a>
                  )
                })}
              </div>
            )}

            {/* Owner: editable list for social channels (still icon-led) */}
            {iconChannels.length > 0 && editable && (
              <ul className="tp-contacts-list tp-contacts-list--social">
                {iconChannels.map((c) => (
                  <ChannelTextRow
                    key={c.key}
                    channel={c}
                    value={resolved[c.key]!}
                    override={(operatorContact?.[c.key] as string | null | undefined) ?? null}
                    hidden={hidden.has(c.key)}
                    editable={editable}
                    /** In owner mode social channels show their value
                     *  for clarity even though public sees only an
                     *  icon — the operator is editing, after all. */
                    forceTextDisplay
                    onSaveValue={(v) =>
                      saveValue(c.key, v, operatorContact, saveProjectPatch)
                    }
                    onToggleHidden={() =>
                      toggleHidden(c.key, hidden, operatorContact, saveProjectPatch)
                    }
                  />
                ))}
              </ul>
            )}

            {/* Owner hint about adding more channels */}
            {editable && missingChannelLabels.length > 0 && (
              <p className="tp-contacts-hint">
                Add{' '}
                {missingChannelLabels.length === 1
                  ? missingChannelLabels[0]
                  : missingChannelLabels.slice(0, -1).join(', ') +
                    ' or ' +
                    missingChannelLabels.slice(-1)[0]}{' '}
                in your{' '}
                <Link href="/dashboard" className="tp-contacts-hint-link">
                  profile
                </Link>{' '}
                to show {missingChannelLabels.length === 1 ? 'it' : 'them'} here.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Text-row for a single channel: icon, optional inline editor on
 *  click (owner mode), value display, eye-toggle for hiding (owner). */
function ChannelTextRow({
  channel,
  value,
  override,
  hidden,
  editable,
  forceTextDisplay,
  onSaveValue,
  onToggleHidden,
}: {
  channel: Channel
  value: string
  override: string | null
  hidden: boolean
  editable: boolean
  forceTextDisplay?: boolean
  onSaveValue: (v: string | null) => Promise<boolean>
  onToggleHidden: () => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(override || '')
  const Icon = channel.Icon

  async function commit() {
    const v = draft.trim()
    const next = v.length > 0 ? v : null
    if (next !== override) {
      await onSaveValue(next)
    }
    setEditing(false)
  }

  // Public render: value as text rendered as a link.
  if (!editable) {
    return (
      <li>
        <a
          href={channel.href(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="tp-contacts-link"
        >
          <Icon size={14} aria-hidden="true" />
          <span>{value}</span>
        </a>
      </li>
    )
  }

  // Owner render: row with editor + eye-toggle. forceTextDisplay just
  // distinguishes public icon-row layout from the editor list.
  void forceTextDisplay
  return (
    <li className={hidden ? 'tp-contacts-row tp-contacts-row--hidden' : 'tp-contacts-row'}>
      <span className="tp-contacts-row-icon" aria-hidden="true">
        <Icon size={14} />
      </span>
      {editing ? (
        <input
          type={channel.key === 'email' ? 'email' : channel.key === 'phone' ? 'tel' : 'text'}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setDraft(override || '')
              setEditing(false)
            }
          }}
          className="tp-contacts-row-input"
        />
      ) : (
        <button
          type="button"
          className="tp-contacts-row-value"
          onClick={() => {
            setDraft(override || '')
            setEditing(true)
          }}
          title="Click to edit"
        >
          {value}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleHidden}
        className="tp-contacts-row-eye"
        title={hidden ? 'Show on this trip' : 'Hide from this trip'}
        aria-label={hidden ? 'Show on this trip' : 'Hide from this trip'}
      >
        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </li>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ──────────────────────────────────────────────────────────────────── */

async function saveValue(
  key: ChannelKey | 'heading' | 'subheading',
  next: string | null,
  current: OperatorContact,
  saveProjectPatch?: Mutations['saveProjectPatch'],
): Promise<boolean> {
  if (!saveProjectPatch) return false
  const patch: Record<string, any> = { ...(current || {}), [key]: next }
  return saveProjectPatch({ operatorContact: patch })
}

async function toggleHidden(
  key: ChannelKey | 'address',
  hidden: Set<string>,
  current: OperatorContact,
  saveProjectPatch?: Mutations['saveProjectPatch'],
): Promise<boolean> {
  if (!saveProjectPatch) return false
  const next = new Set(hidden)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  const patch: Record<string, any> = {
    ...(current || {}),
    hidden_channels: Array.from(next),
  }
  return saveProjectPatch({ operatorContact: patch })
}

function buildSocialUrl(v: string, host: string): string {
  if (v.startsWith('http')) return v
  const handle = v.replace(/^@/, '').replace(/^\//, '')
  return `https://${host}/${handle}`
}

function resolveContacts(
  owner: OwnerBrand,
  override: OperatorContact,
): Record<ChannelKey, string | null> {
  return {
    email: pick(override?.email, owner?.brand_email),
    phone: pick(override?.phone, owner?.brand_phone),
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

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine variant — single horizontal row of icon links, one per
 * configured channel. No text rows, no inline editor: channel values
 * are edited in /dashboard (the operator's profile) or via the AI
 * editor agent's set_operator_contact tool. The page surface only
 * exposes per-trip visibility (eye-toggle below each icon in owner
 * mode), which writes operator_contact.hidden_channels.
 *
 * Heading is the same hardcoded "Questions about this trip?" used by
 * the editorial layout. The right column reads visually like Classic;
 * the left column keeps the Magazine identity stack.
 */
function ContactsMagazine({
  owner,
  operatorContact,
  editable,
  saveProjectPatch,
}: {
  owner: OwnerBrand
  operatorContact: OperatorContact
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
}) {
  const resolved = resolveContacts(owner, operatorContact)
  const hidden = new Set(operatorContact?.hidden_channels || [])
  const tagline = owner?.brand_tagline || null
  const logoUrl = owner?.brand_logo_url || null
  const brandName = pick(operatorContact?.name, owner?.brand_name)
  const address = pick(operatorContact?.address, owner?.brand_address)

  const visibleChannels = CHANNELS.filter(
    (c) => resolved[c.key] && !hidden.has(c.key),
  )
  const configuredChannels = CHANNELS.filter((c) => resolved[c.key])
  const missingChannelLabels = CHANNELS.filter((c) => !resolved[c.key]).map(
    (c) => c.label,
  )

  if (!editable && visibleChannels.length === 0 && !brandName && !address) {
    return null
  }

  // Single icon row for all channels — no text/icon bifurcation, no
  // inline editor. Public sees bare icon links; owner sees the same
  // icons with a small eye-toggle below each one. Channel values are
  // edited in /dashboard (the operator's profile) or via the AI editor
  // agent's set_operator_contact tool — never inline on the trip page.
  const sourceChannels = editable ? configuredChannels : visibleChannels

  return (
    <section className="tp-mag-section tp-mag-contacts" id="contacts">
      <div className="tp-mag-container">
        <div className="tp-mag-contacts__grid">
          <div className="tp-mag-contacts__identity">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={brandName || 'Operator'}
                className="tp-mag-contacts__logo"
              />
            )}
            {brandName && (
              <p className="tp-mag-contacts__brand-name">{brandName}</p>
            )}
            {tagline && (
              <p className="tp-mag-contacts__brand-tagline">{tagline}</p>
            )}
            {address && (() => {
              const addressHidden = hidden.has('address')
              if (!editable && addressHidden) return null
              return (
                <div
                  className={
                    addressHidden
                      ? 'tp-mag-contacts__address-block is-hidden'
                      : 'tp-mag-contacts__address-block'
                  }
                >
                  <p className="tp-mag-contacts__brand-address">
                    <MapPin size={14} aria-hidden="true" />
                    <span>{address}</span>
                  </p>
                  {editable && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleHidden(
                          'address',
                          hidden,
                          operatorContact,
                          saveProjectPatch,
                        )
                      }
                      title={addressHidden ? 'Show on this trip' : 'Hide from this trip'}
                      aria-label={addressHidden ? 'Show on this trip' : 'Hide from this trip'}
                      className="tp-mag-contacts__visibility-toggle"
                    >
                      {addressHidden ? 'SHOW' : 'HIDE'}
                    </button>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="tp-mag-contacts__channels">
            <h2 className="tp-mag-contacts__heading">
              <EditableField
                as="text"
                editable={editable}
                value={
                  operatorContact?.heading?.trim() || UI.contactsHeading
                }
                placeholder={UI.contactsHeading}
                onSave={(v) => {
                  const trimmed = v.trim()
                  const next =
                    !trimmed || trimmed === UI.contactsHeading ? null : trimmed
                  return saveValue('heading', next, operatorContact, saveProjectPatch)
                }}
                maxLength={120}
              />
            </h2>
            <p className="tp-mag-contacts__subheading">
              <EditableField
                as="multiline"
                rows={2}
                editable={editable}
                value={
                  operatorContact?.subheading?.trim() ||
                  UI.contactsSubheading
                }
                placeholder={UI.contactsSubheading}
                onSave={(v) => {
                  const trimmed = v.trim()
                  const next =
                    !trimmed || trimmed === UI.contactsSubheading ? null : trimmed
                  return saveValue('subheading', next, operatorContact, saveProjectPatch)
                }}
              />
            </p>

            {sourceChannels.length > 0 && (
              <ul className="tp-mag-contacts__icons">
                {sourceChannels.map((c) => {
                  const v = resolved[c.key]!
                  const Icon = c.Icon
                  const isHidden = hidden.has(c.key)
                  return (
                    <li
                      key={c.key}
                      className={
                        isHidden
                          ? 'tp-mag-contacts__icons-item is-hidden'
                          : 'tp-mag-contacts__icons-item'
                      }
                    >
                      <a
                        href={c.href(v)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={c.label}
                        aria-label={c.label}
                        className="tp-mag-contacts__icon-link"
                      >
                        <Icon size={28} aria-hidden="true" />
                      </a>
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleHidden(
                              c.key,
                              hidden,
                              operatorContact,
                              saveProjectPatch,
                            )
                          }
                          title={isHidden ? 'Show on this trip' : 'Hide from this trip'}
                          aria-label={isHidden ? 'Show on this trip' : 'Hide from this trip'}
                          className="tp-mag-contacts__visibility-toggle"
                        >
                          {isHidden ? 'SHOW' : 'HIDE'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {editable && (sourceChannels.length > 0 || !!address) && (
              <p className="tp-mag-contacts__hint tp-mag-contacts__hint--intro">
                Click HIDE to keep that contact away from clients. Tap
                Preview at the top to see what they see.
              </p>
            )}

            {editable && missingChannelLabels.length > 0 && (
              <p className="tp-mag-contacts__hint">
                Add{' '}
                {missingChannelLabels.length === 1
                  ? missingChannelLabels[0]
                  : missingChannelLabels.slice(0, -1).join(', ') +
                    ' or ' +
                    missingChannelLabels.slice(-1)[0]}{' '}
                in your{' '}
                <Link href="/dashboard" className="tp-mag-contacts__hint-link">
                  profile
                </Link>{' '}
                to show {missingChannelLabels.length === 1 ? 'it' : 'them'} here.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
