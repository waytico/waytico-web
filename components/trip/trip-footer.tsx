import Link from 'next/link'
import type { OwnerBrand, OperatorContact } from './trip-types'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
}

/**
 * Footer rendered at the end of /t/[slug]. Replaces the global site
 * Footer (Product / Company / Legal / Contact columns) which was
 * Waytico-facing and useless to a traveller landing on a proposal.
 *
 * Three goals at the bottom of the page, in priority order:
 *   1. Reach the operator. Long page, decision moment, traveller may
 *      have one last question. We surface email / phone / whatsapp
 *      again with big tappable links.
 *   2. Close the brand loop. Logo + business name + tagline reinforce
 *      "this is a real company" rather than "this is a Waytico page".
 *   3. Tiny "Powered by Waytico" — gives Waytico attribution without
 *      stealing focus from the operator's brand.
 *
 * What we deliberately don't include:
 *   - Privacy / Terms / Cookies / About / How it works / Sign in.
 *     None of those are for the traveller — they belong on marketing
 *     pages, not on a quote.
 *   - Duplicates of every section nav. The Contacts block above
 *     already does that; here we keep contact compact.
 *
 * Tagged with id="site-footer" so the floating TripCommandBar's
 * IntersectionObserver hides the bar when the footer enters view.
 */
export function TripFooter({ owner, operatorContact }: Props) {
  // Resolve effective contacts: per-trip override → brand defaults.
  // Same precedence the Contacts section uses, so the footer never
  // contradicts what's higher on the page.
  const name = pick(operatorContact?.name, owner?.brand_name)
  const email = pick(operatorContact?.email, owner?.brand_email)
  const phone = pick(operatorContact?.phone, owner?.brand_phone)
  const whatsapp = pick(operatorContact?.whatsapp, owner?.brand_whatsapp)
  const website = pick(operatorContact?.website, owner?.brand_website)
  const tagline = owner?.brand_tagline || null
  const logoUrl = owner?.brand_logo_url || null

  const year = new Date().getFullYear()
  const hasOperator = !!(name || email || phone || whatsapp || website || logoUrl)

  return (
    <footer
      id="site-footer"
      className="w-full border-t border-border/50 bg-secondary"
    >
      <div className="max-w-4xl mx-auto px-4 py-10">
        {hasOperator && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left: operator brand block */}
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
              </div>
            </div>

            {/* Right: contact channels — questions-prompt + tappable links */}
            <div className="md:text-right">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Questions about this trip?
              </h3>
              <ul className="space-y-1.5 md:flex md:flex-col md:items-end">
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {phone}
                    </a>
                  </li>
                )}
                {whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${whatsapp.replace(/[^\d+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      WhatsApp · {whatsapp}
                    </a>
                  </li>
                )}
                {website && (
                  <li>
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {website.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Bottom strip — copyright on the operator's name (not Waytico's),
            tiny powered-by attribution on the right. */}
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
