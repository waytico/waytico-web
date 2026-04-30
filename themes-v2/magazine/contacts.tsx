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
 *
 * Mobile + desktop sizing per §R.2 lives in layout.css.
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
import { Hairline } from './styles'

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

  const textRows = channels.filter(
    (c) => c.key === 'email' || c.key === 'phone' || c.key === 'website'
  )
  const socials = channels.filter((c) => SOCIAL_ICONS[c.key])

  const brandName = data.owner?.brand_name?.trim()
  const brandTagline = data.owner?.brand_tagline?.trim()

  return (
    <section id="contacts" className="mag-contacts">
      <div className="mag-shell">
        <Hairline className="mag-terms__hairline" />
        <div className="mag-eyebrow">{UI.sectionLabels.contacts.toUpperCase()}</div>
        <h2 className="mag-contacts__heading">{UI.contactsHeading}</h2>

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

        {textRows.length > 0 && (
          <ul
            className={
              'mag-contacts__list' +
              (socials.length ? ' mag-contacts__list--with-socials' : '')
            }
          >
            {textRows.map((c) => (
              <li key={c.key}>
                <div className="mag-contacts__row">
                  <span className="mag-contacts__label">
                    {CHANNEL_LABEL[c.key].toUpperCase()}
                  </span>
                  <a
                    href={channelHref(c.key, c.value)}
                    className="mag-contacts__row-link"
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
          <div className="mag-contacts__socials">
            {socials.map((c) => {
              const Icon = SOCIAL_ICONS[c.key]
              if (!Icon) return null
              return (
                <a
                  key={c.key}
                  href={channelHref(c.key, c.value)}
                  aria-label={CHANNEL_LABEL[c.key]}
                  className="mag-contacts__social-link"
                >
                  <Icon size={18} />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
