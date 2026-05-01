import type { OperatorContact, OwnerBrand } from '@/types/theme-v2'

/**
 * Channels supported across operator-contact UIs (Contacts section block,
 * top-of-page Contact-agent dropdown). Order matters — components iterate
 * in this order to render channel rows / dropdown items.
 */
export type ChannelKey =
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'

export const CHANNEL_KEYS: ChannelKey[] = [
  'email',
  'phone',
  'whatsapp',
  'telegram',
  'website',
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
]

/**
 * Source order:
 *   1. operator_contact override (per-trip, set on the project)
 *   2. owner brand defaults (from user profile)
 */
export function resolveContacts(
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

/** Channels with a value AND not listed in operator_contact.hidden_channels.
 *  This is what the public viewer should see. */
export function getVisibleChannels(
  owner: OwnerBrand,
  override: OperatorContact,
): Array<{ key: ChannelKey; value: string }> {
  const resolved = resolveContacts(owner, override)
  const hidden = new Set(override?.hidden_channels || [])
  const out: Array<{ key: ChannelKey; value: string }> = []
  for (const key of CHANNEL_KEYS) {
    const v = resolved[key]
    if (v && !hidden.has(key)) out.push({ key, value: v })
  }
  return out
}

/** Outbound URL builders. Mirrors the per-channel hrefs that lived
 *  inline in components/trip/contacts.tsx. */
export function channelHref(key: ChannelKey, value: string): string {
  switch (key) {
    case 'email':
      return `mailto:${value}`
    case 'phone':
      return `tel:${value}`
    case 'whatsapp':
      return `https://wa.me/${value.replace(/[^\d+]/g, '')}`
    case 'telegram':
      return `https://t.me/${value.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`
    case 'website':
      return value.startsWith('http') ? value : `https://${value}`
    case 'instagram':
      return buildSocialUrl(value, 'instagram.com')
    case 'facebook':
      return buildSocialUrl(value, 'facebook.com')
    case 'youtube':
      return buildSocialUrl(value, 'youtube.com')
    case 'tiktok':
      return buildSocialUrl(value, 'tiktok.com')
  }
}

export const CHANNEL_LABEL: Record<ChannelKey, string> = {
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  website: 'Website',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

function pick(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (typeof a === 'string' && a.trim().length > 0) return a
  if (typeof b === 'string' && b.trim().length > 0) return b
  return null
}

function buildSocialUrl(value: string, host: string): string {
  if (value.startsWith('http')) return value
  const handle = value.replace(/^@/, '').replace(/^\//, '')
  return `https://${host}/${handle}`
}
