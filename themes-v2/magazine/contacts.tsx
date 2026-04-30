/**
 * Magazine — Contacts section.
 *
 * Source: no Magazine-specific design — magazine-trip.jsx replaces this
 * with a sticky "INQUIRE →" bar that we explicitly defer (§I).
 *
 * Approach: clean Magazine-styled list of all visible operator channels
 * resolved via the existing lib/contact-resolution helper. Email and
 * phone render as labeled rows; brand-mark icons (WA / TG / IG / FB /
 * YT / TT) sit in a horizontal strip beneath them.
 *
 * Empty state: if no resolvable channels → section hidden.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import {
  channelHref,
  CHANNEL_LABEL,
  getVisibleChannels,
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
import { ACCENT, body, CREAM, display, eyebrow, Hairline, MUTED } from './styles'

const SOCIAL_ICONS: Partial<Record<ChannelKey, (props: { size?: number }) => JSX.Element>> = {
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
}

export function Contacts({ data }: ThemePropsV2) {
  const channels = getVisibleChannels(
    data.owner as never,
    (data.project.operator_contact ?? null) as never,
  )
  if (channels.length === 0) return null

  const textRows = channels.filter((c) => c.key === 'email' || c.key === 'phone' || c.key === 'website')
  const socials = channels.filter((c) => SOCIAL_ICONS[c.key])

  const brandName = data.owner?.brand_name?.trim()
  const brandTagline = data.owner?.brand_tagline?.trim()

  return (
    <section id="contacts" style={{ background: CREAM, padding: '0 24px 80px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 18 }}>
        {UI.sectionLabels.contacts.toUpperCase()}
      </div>
      <h2 style={{ ...display, fontSize: 24, lineHeight: 1.2, margin: 0, marginBottom: 24 }}>
        {UI.contactsHeading}
      </h2>

      {brandName && (
        <div style={{ ...body, fontSize: 15, marginBottom: brandTagline ? 4 : 18, fontWeight: 500 }}>
          {brandName}
        </div>
      )}
      {brandTagline && (
        <div style={{ ...body, fontSize: 13, color: MUTED, marginBottom: 18 }}>
          {brandTagline}
        </div>
      )}

      {textRows.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', marginBottom: socials.length ? 18 : 0 }}>
          {textRows.map((c) => (
            <li key={c.key}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0' }}>
                <span style={{ ...eyebrow, fontSize: 10, color: MUTED, minWidth: 64 }}>
                  {CHANNEL_LABEL[c.key].toUpperCase()}
                </span>
                <a
                  href={channelHref(c.key, c.value)}
                  style={{
                    ...body,
                    fontSize: 14,
                    color: ACCENT,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    textDecorationThickness: 1,
                    wordBreak: 'break-all',
                  }}
                >
                  {c.value}
                </a>
              </div>
              <Hairline />
            </li>
          ))}
        </ul>
      )}

      {socials.length > 0 && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          {socials.map((c) => {
            const Icon = SOCIAL_ICONS[c.key]
            if (!Icon) return null
            return (
              <a
                key={c.key}
                href={channelHref(c.key, c.value)}
                aria-label={CHANNEL_LABEL[c.key]}
                style={{
                  color: ACCENT,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36, height: 36,
                  border: '1px solid rgba(184,90,62,0.3)',
                }}
              >
                <Icon size={18} />
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
