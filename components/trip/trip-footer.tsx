import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import type { OwnerBrand, OperatorContact } from './trip-types'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import { Globe } from 'lucide-react'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
}

/**
 * Footer rendered at the end of /t/[slug] for the traveller. Replaces
 * the global site Footer on this route only — operator-facing chrome
 * (sticky header + action bar + command bar) keeps owner navigation
 * available without crowding the page bottom.
 *
 * Layout
 * ──────
 *   Left   — operator brand: logo + business name + tagline +
 *             physical address (with a map pin icon).
 *   Right  — header "Questions about this trip?", then email + phone as
 *             text rows with leading icons, then a row of brand-mark
 *             icons for the social channels (WhatsApp, Telegram,
 *             Instagram, Facebook, YouTube, TikTok, Website).
 *   Bottom — © year Operator name · Powered by Waytico.
 *
 * Tagged id="site-footer" so the floating TripCommandBar's
 * IntersectionObserver hides the bar when the footer enters view.
 */
export function TripFooter({ owner, operatorContact }: Props) {
  // Resolve effective contacts: per-trip override → brand defaults.
  const name = pick(operatorContact?.name, owner?.brand_name)
  const email = pick(operatorContact?.email, owner?.brand_email)
  const phone = pick(operatorContact?.phone, owner?.brand_phone)
  const address = pick(operatorContact?.address, owner?.brand_address)
  const whatsapp = pick(operatorContact?.whatsapp, owner?.brand_whatsapp)
  const telegram = pick(operatorContact?.telegram, owner?.brand_telegram)
  const website = pick(operatorContact?.website, owner?.brand_website)
  const instagram = pick(operatorContact?.instagram, owner?.brand_instagram)
  const facebook = pick(operatorContact?.facebook, owner?.brand_facebook)
  const youtube = pick(operatorContact?.youtube, owner?.brand_youtube)
  const tiktok = pick(operatorContact?.tiktok, owner?.brand_tiktok)
  const tagline = owner?.brand_tagline || null
  const logoUrl = owner?.brand_logo_url || null

  const year = new Date().getFullYear()
  const hasOperator = !!(
    name || email || phone || address || whatsapp || telegram ||
    website || instagram || facebook || youtube || tiktok || logoUrl
  )

  // Channel icons rendered only if present. Size + colour match the rest
  // of the muted footer text.
  const channels: Array<{ href: string; label: string; Icon: React.ComponentType<any> }> = []
  if (whatsapp) channels.push({ href: `https://wa.me/${whatsapp.replace(/[^\d+]/g, '')}`, label: 'WhatsApp', Icon: WhatsAppIcon })
  if (telegram) channels.push({ href: `https://t.me/${telegram.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`, label: 'Telegram', Icon: TelegramIcon })
  if (instagram) channels.push({ href: socialUrl(instagram, 'instagram.com'), label: 'Instagram', Icon: InstagramIcon })
  if (facebook) channels.push({ href: socialUrl(facebook, 'facebook.com'), label: 'Facebook', Icon: FacebookIcon })
  if (youtube) channels.push({ href: socialUrl(youtube, 'youtube.com'), label: 'YouTube', Icon: YouTubeIcon })
  if (tiktok) channels.push({ href: socialUrl(tiktok, 'tiktok.com'), label: 'TikTok', Icon: TikTokIcon })
  if (website) channels.push({ href: website.startsWith('http') ? website : `https://${website}`, label: 'Website', Icon: Globe })

  return (
    <footer
      id="site-footer"
      className="w-full border-t border-border/50 bg-secondary"
    >
      <div className="max-w-4xl mx-auto px-4 py-10">
        {hasOperator && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left column: brand identity */}
            <div className="flex items-start gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={name || 'Operator'}
                  className="w-12 h-12 rounded-md object-cover border border-border/50 shrink-0"
                />
              )}
              <div className="min-w-0">
                {name && (
                  <p className="font-serif text-base text-foreground leading-tight">
                    {name}
                  </p>
                )}
                {tagline && (
                  <p className="text-sm text-muted-foreground mt-1">{tagline}</p>
                )}
                {address && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1.5 whitespace-pre-line">
                    <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right column: contact + channels */}
            <div className="md:text-right">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Questions about this trip?
              </h3>

              <ul className="space-y-1.5 mb-3 md:flex md:flex-col md:items-end">
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <Mail size={14} aria-hidden="true" />
                      <span>{email}</span>
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <Phone size={14} aria-hidden="true" />
                      <span>{phone}</span>
                    </a>
                  </li>
                )}
              </ul>

              {channels.length > 0 && (
                <div className="flex gap-3 md:justify-end flex-wrap">
                  {channels.map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={label}
                      aria-label={label}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                    >
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom strip */}
        <div
          className={`flex flex-col md:flex-row items-center md:justify-between gap-2 ${
            hasOperator ? 'pt-6 border-t border-border/50' : ''
          } text-xs text-muted-foreground`}
        >
          <span>
            © {year} {name || 'Operator'}
          </span>
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by{' '}
            <span className="font-serif font-semibold text-foreground/70">
              Waytico
            </span>
          </Link>
        </div>
      </div>
    </footer>
  )
}

function pick(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (typeof a === 'string' && a.trim().length > 0) return a
  if (typeof b === 'string' && b.trim().length > 0) return b
  return null
}

function socialUrl(v: string, host: string): string {
  if (v.startsWith('http')) return v
  const handle = v.replace(/^@/, '').replace(/^\//, '')
  return `https://${host}/${handle}`
}
