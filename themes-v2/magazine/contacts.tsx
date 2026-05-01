'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, Globe, Eye, EyeOff } from 'lucide-react'
import type { ThemePropsV2, OperatorContact } from '@/types/theme-v2'
import {
  channelHref,
  CHANNEL_LABEL,
  resolveContacts,
  type ChannelKey,
} from '@/lib/contact-resolution'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { Hairline } from './styles'

// Lucide and our brand-mark icons share the same { size, className } prop
// API; the union of their concrete types defeats a strict ComponentType
// signature, so we use `any` here and trust the call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON: Record<ChannelKey, any> = {
  email: Mail,
  phone: Phone,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  website: Globe,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
}

const TEXT_CHANNELS: ChannelKey[] = ['email', 'phone', 'website']
const SOCIAL_CHANNELS: ChannelKey[] = [
  'whatsapp',
  'telegram',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
]
const ALL_CHANNELS: ChannelKey[] = [...TEXT_CHANNELS, ...SOCIAL_CHANNELS]

export function Contacts({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const owner = data.owner
  const operatorContact = (data.project.operator_contact ?? null) as OperatorContact

  const resolved = resolveContacts(owner as never, operatorContact as never)
  const hidden = new Set(operatorContact?.hidden_channels || [])

  // operatorContact.name / address override owner.brand_* (legacy 148-149).
  const brandName =
    (operatorContact?.name?.trim() || owner?.brand_name?.trim() || '') || null
  const brandTagline = owner?.brand_tagline?.trim() || null
  const brandAddress =
    (operatorContact?.address?.trim() || owner?.brand_address?.trim() || '') ||
    null
  const brandLogoUrl = owner?.brand_logo_url || null

  const visibleChannels = ALL_CHANNELS.filter(
    (k) => resolved[k] && !hidden.has(k),
  )
  const configuredChannels = ALL_CHANNELS.filter((k) => resolved[k])
  const missingLabels = ALL_CHANNELS.filter((k) => !resolved[k]).map(
    (k) => CHANNEL_LABEL[k],
  )

  if (
    !editable &&
    visibleChannels.length === 0 &&
    !brandName &&
    !brandAddress
  ) {
    return null
  }

  const saveProjectPatch = ctx?.mutations.saveProjectPatch

  const onSaveValue = async (key: ChannelKey, next: string | null) => {
    if (!saveProjectPatch) return false
    const patch = { ...(operatorContact || {}), [key]: next }
    return saveProjectPatch({ operatorContact: patch })
  }

  const onToggleHidden = async (key: ChannelKey) => {
    if (!saveProjectPatch) return false
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    const patch = {
      ...(operatorContact || {}),
      hidden_channels: Array.from(next),
    }
    return saveProjectPatch({ operatorContact: patch })
  }

  const renderChannels = editable ? configuredChannels : visibleChannels
  const textRows = renderChannels.filter((k) => TEXT_CHANNELS.includes(k))
  const socialRows = renderChannels.filter((k) => SOCIAL_CHANNELS.includes(k))

  return (
    <section id="contacts" className="mag-contacts">
      <div className="mag-shell">
        <Hairline className="mag-terms__hairline" />
        <div className="mag-eyebrow">{UI.sectionLabels.contacts.toUpperCase()}</div>
        <h2 className="mag-contacts__heading">{UI.contactsHeading}</h2>

        {brandLogoUrl && (
          <img
            src={brandLogoUrl}
            alt={brandName || 'Operator'}
            className="mag-contacts__logo"
          />
        )}

        {brandName && (
          <div
            className={
              'mag-contacts__brand-name' +
              (brandTagline ? ' mag-contacts__brand-name--with-tagline' : '')
            }
          >
            {brandName}
          </div>
        )}
        {brandTagline && (
          <div className="mag-contacts__brand-tagline">{brandTagline}</div>
        )}
        {brandAddress && (
          <div className="mag-contacts__brand-address">
            <MapPin size={14} aria-hidden="true" />
            <span>{brandAddress}</span>
          </div>
        )}

        {textRows.length > 0 && (
          <ul
            className={
              'mag-contacts__list' +
              (socialRows.length ? ' mag-contacts__list--with-socials' : '')
            }
          >
            {textRows.map((k) => (
              <ChannelRow
                key={k}
                channelKey={k}
                value={resolved[k]!}
                override={(operatorContact?.[k] as string | null | undefined) ?? null}
                hidden={hidden.has(k)}
                editable={editable}
                onSaveValue={(v) => onSaveValue(k, v)}
                onToggleHidden={() => onToggleHidden(k)}
              />
            ))}
          </ul>
        )}

        {/* Public mode: socials as icon-only strip. Owner mode: full
            text rows so the operator can edit the value (forceTextDisplay
            parity with legacy 263-274). */}
        {socialRows.length > 0 && !editable && (
          <div className="mag-contacts__socials">
            {socialRows.map((k) => {
              const Icon = ICON[k]
              return (
                <a
                  key={k}
                  href={channelHref(k, resolved[k]!)}
                  aria-label={CHANNEL_LABEL[k]}
                  className="mag-contacts__social-link"
                >
                  <Icon size={18} />
                </a>
              )
            })}
          </div>
        )}

        {socialRows.length > 0 && editable && (
          <ul className="mag-contacts__list mag-contacts__list--social">
            {socialRows.map((k) => (
              <ChannelRow
                key={k}
                channelKey={k}
                value={resolved[k]!}
                override={(operatorContact?.[k] as string | null | undefined) ?? null}
                hidden={hidden.has(k)}
                editable={editable}
                onSaveValue={(v) => onSaveValue(k, v)}
                onToggleHidden={() => onToggleHidden(k)}
              />
            ))}
          </ul>
        )}

        {editable && missingLabels.length > 0 && (
          <p className="mag-contacts__hint">
            Add{' '}
            {missingLabels.length === 1
              ? missingLabels[0]
              : missingLabels.slice(0, -1).join(', ') +
                ' or ' +
                missingLabels.slice(-1)[0]}{' '}
            in your{' '}
            <Link href="/dashboard" className="mag-contacts__hint-link">
              profile
            </Link>{' '}
            to show {missingLabels.length === 1 ? 'it' : 'them'} here.
          </p>
        )}
      </div>
    </section>
  )
}

function ChannelRow({
  channelKey,
  value,
  override,
  hidden,
  editable,
  onSaveValue,
  onToggleHidden,
}: {
  channelKey: ChannelKey
  value: string
  override: string | null
  hidden: boolean
  editable: boolean
  onSaveValue: (v: string | null) => Promise<boolean>
  onToggleHidden: () => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(override || '')
  const Icon = ICON[channelKey]

  async function commit() {
    const v = draft.trim()
    const next = v.length > 0 ? v : null
    if (next !== override) await onSaveValue(next)
    setEditing(false)
  }

  // Public render: legacy text-style row inside .mag-contacts__list.
  if (!editable) {
    return (
      <li>
        <div className="mag-contacts__row">
          <span className="mag-contacts__label">
            {CHANNEL_LABEL[channelKey].toUpperCase()}
          </span>
          <a
            href={channelHref(channelKey, value)}
            className="mag-contacts__row-link"
          >
            {channelKey === 'website'
              ? value.replace(/^https?:\/\//, '').replace(/\/$/, '')
              : value}
          </a>
        </div>
        <Hairline />
      </li>
    )
  }

  return (
    <li
      className={
        'mag-contacts__row-edit' +
        (hidden ? ' mag-contacts__row-edit--hidden' : '')
      }
    >
      <span className="mag-contacts__row-edit-icon" aria-hidden="true">
        <Icon size={14} />
      </span>
      <span className="mag-contacts__row-edit-label">
        {CHANNEL_LABEL[channelKey].toUpperCase()}
      </span>
      {editing ? (
        <input
          type={
            channelKey === 'email'
              ? 'email'
              : channelKey === 'phone'
                ? 'tel'
                : 'text'
          }
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
          className="mag-contacts__row-edit-input"
        />
      ) : (
        <button
          type="button"
          className="mag-contacts__row-edit-value"
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
        onClick={() => void onToggleHidden()}
        className="mag-contacts__row-edit-eye"
        title={hidden ? 'Show on this trip' : 'Hide from this trip'}
        aria-label={hidden ? 'Show on this trip' : 'Hide from this trip'}
      >
        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </li>
  )
}
