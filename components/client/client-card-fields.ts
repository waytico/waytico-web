/**
 * Single source of truth for channel rendering inside <ClientCard>.
 *
 * Each channel knows its label, the field key on Client, the input
 * type, the icon component, the link builder for view-mode hrefs, and
 * the normaliser applied on save (digits-only for phone/whatsapp,
 * leading-@ strip for telegram/instagram).
 *
 * Stage 3 will pull `client-row-expanded.tsx`'s channel rendering off
 * its own helpers and onto these so dashboard and trip-page render
 * the same.
 */

import type { ComponentType } from 'react'
import { Mail, Phone } from 'lucide-react'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import type { Client } from '@/components/trip/trip-types'

export type ChannelKey =
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'telegram'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'

export type ChannelConfig = {
  key: ChannelKey
  label: string
  type: 'text' | 'tel' | 'email'
  Icon: ComponentType<any>
  placeholder: string
  /** View-mode href. Null when value can't be linked (e.g. empty). */
  buildHref: (value: string) => string | null
  /** Save-mode normaliser. Returns trimmed/cleaned value or '' to drop. */
  normalise: (value: string) => string
}

function digitsOnly(v: string): string {
  return v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
}

function stripLeadingAt(v: string): string {
  return v.trim().replace(/^@+/, '')
}

function asUrlPath(v: string): string {
  return stripLeadingAt(v).replace(/^https?:\/\//, '').replace(/^\/+/, '')
}

export const CHANNELS: Record<ChannelKey, ChannelConfig> = {
  phone: {
    key: 'phone',
    label: 'Phone',
    type: 'tel',
    Icon: Phone,
    placeholder: '+1 604 555 1234',
    buildHref: (v) => (v ? `tel:${digitsOnly(v) || v}` : null),
    normalise: (v) => digitsOnly(v),
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp',
    type: 'tel',
    Icon: WhatsAppIcon,
    placeholder: 'number or copy phone',
    buildHref: (v) => {
      const d = digitsOnly(v).replace(/^\+/, '')
      return d ? `https://wa.me/${d}` : null
    },
    normalise: (v) => digitsOnly(v),
  },
  email: {
    key: 'email',
    label: 'Email',
    type: 'email',
    Icon: Mail,
    placeholder: 'name@example.com',
    buildHref: (v) => (v ? `mailto:${v.trim()}` : null),
    normalise: (v) => v.trim(),
  },
  telegram: {
    key: 'telegram',
    label: 'Telegram',
    type: 'text',
    Icon: TelegramIcon,
    placeholder: '@username or phone',
    buildHref: (v) => {
      const s = stripLeadingAt(v)
      if (!s) return null
      // Phone-shaped → tg://; username → t.me
      return /^[+\d\s().-]+$/.test(s) ? `tel:${digitsOnly(s)}` : `https://t.me/${s}`
    },
    normalise: (v) => stripLeadingAt(v),
  },
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    type: 'text',
    Icon: InstagramIcon,
    placeholder: '@username',
    buildHref: (v) => {
      const s = stripLeadingAt(v)
      return s ? `https://instagram.com/${s}` : null
    },
    normalise: (v) => stripLeadingAt(v),
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    type: 'text',
    Icon: FacebookIcon,
    placeholder: 'facebook.com/handle',
    buildHref: (v) => {
      const s = asUrlPath(v).replace(/^facebook\.com\//, '')
      return s ? `https://facebook.com/${s}` : null
    },
    normalise: (v) => v.trim(),
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    type: 'text',
    Icon: YouTubeIcon,
    placeholder: 'youtube.com/@handle',
    buildHref: (v) => {
      const s = asUrlPath(v).replace(/^youtube\.com\//, '')
      return s ? `https://youtube.com/${s}` : null
    },
    normalise: (v) => v.trim(),
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    type: 'text',
    Icon: TikTokIcon,
    placeholder: '@handle',
    buildHref: (v) => {
      const s = stripLeadingAt(v)
      return s ? `https://tiktok.com/@${s.replace(/^@/, '')}` : null
    },
    normalise: (v) => stripLeadingAt(v),
  },
}

export const PRIMARY_CHANNELS: ChannelKey[] = [
  'phone',
  'whatsapp',
  'email',
  'telegram',
  'instagram',
]

export const EXTRA_CHANNELS: ChannelKey[] = ['facebook', 'youtube', 'tiktok']

/** Identifier-required channels per TZ §2.5 — at least one of these
 *  must be non-empty for save validation to pass. */
export const REQUIRED_ANY_CHANNELS: ChannelKey[] = [
  'phone',
  'whatsapp',
  'email',
  'telegram',
]

/** Channel rows for view-mode rendering — only those with values, in
 *  priority order (phone first). */
export function buildChannels(
  client: Pick<Client, ChannelKey>,
): Array<{ cfg: ChannelConfig; value: string; href: string | null }> {
  const out: Array<{ cfg: ChannelConfig; value: string; href: string | null }> = []
  const order: ChannelKey[] = [...PRIMARY_CHANNELS, ...EXTRA_CHANNELS]
  for (const k of order) {
    const v = (client[k] ?? '').toString().trim()
    if (!v) continue
    const cfg = CHANNELS[k]
    out.push({ cfg, value: v, href: cfg.buildHref(v) })
  }
  return out
}
