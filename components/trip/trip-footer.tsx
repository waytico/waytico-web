import Link from 'next/link'
import Footer from '@/components/footer'
import type { ThemeId } from '@/lib/themes'
import { resolveContacts, channelHref } from '@/lib/contact-resolution'
import type { OperatorContact, OwnerBrand } from './trip-types'

type Props = {
  /** Owner mode = render the full site Footer (product + company +
   *  legal + contact columns) so the operator has navigation back to
   *  the dashboard / profile / etc. Traveller mode = render a minimal
   *  one-line strip — operator brand and channels are already covered
   *  by the Contacts section above, and an operator-name copyright
   *  inside a tiny grey strip would just feel like noise.
   *
   *  Magazine theme overrides both: a single dark Magazine footer
   *  renders for both owner and public viewers (TZ pass-B decision #10). */
  editable: boolean
  /** Active theme. When 'magazine' the dark Magazine footer renders
   *  for both modes and the site Footer is suppressed. */
  theme?: ThemeId
  /** Brand identity + per-trip override — Magazine footer reads them
   *  for the brand column + offices + contact rail. Editorial ignores. */
  owner?: OwnerBrand
  operatorContact?: OperatorContact
}

export function TripFooter({ editable, theme, owner, operatorContact }: Props) {
  if (theme === 'magazine') {
    return (
      <FooterMagazine owner={owner ?? null} operatorContact={operatorContact ?? null} />
    )
  }

  if (editable) {
    // Owner mode: the standard site footer. Wrapped in a div with
    // id=site-footer so the floating TripCommandBar's
    // IntersectionObserver still finds the page bottom and fades out.
    return (
      <div id="site-footer">
        <Footer />
      </div>
    )
  }

  // Public mode: just © year · Powered by Waytico, centred. Nothing
  // else — Contacts above covers reachability and brand attribution.
  const year = new Date().getFullYear()

  return (
    <footer
      id="site-footer"
      className="w-full border-t border-border/50 bg-secondary"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        © {year} · Powered by{' '}
        <Link
          href="/"
          className="font-serif font-semibold text-foreground/70 hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Waytico
        </Link>
      </div>
    </footer>
  )
}

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine footer — single dark slab that replaces both the public
 * one-line strip and the owner site Footer. Renders for both modes
 * (TZ pass-B decision #10) so the Magazine surface has a consistent
 * bottom regardless of viewer role.
 *
 * Keeps `id="site-footer"` so TripCommandBar's IntersectionObserver
 * still finds the page bottom and fades out near it.
 *
 * 4-col on desktop:
 *   1. Brand   — name (Cormorant) + tagline (italic)
 *   2. Offices — address (or hidden when none)
 *   3. Journeys — placeholder copy until journeys list lands; column is
 *                 omitted entirely when there's no content (avoids dead
 *                 slot on the grid)
 *   4. Contact — email + phone, mailto / tel links
 *
 * Mobile collapses to a single column with the same row order.
 */
function FooterMagazine({
  owner,
  operatorContact,
}: {
  owner: OwnerBrand
  operatorContact: OperatorContact
}) {
  const resolved = resolveContacts(owner, operatorContact)
  const brandName =
    pick(operatorContact?.name, owner?.brand_name) || 'Waytico'
  const tagline = owner?.brand_tagline || null
  const address = pick(operatorContact?.address, owner?.brand_address)
  const email = resolved.email
  const phone = resolved.phone
  const year = new Date().getFullYear()

  return (
    <footer id="site-footer" className="tp-mag-footer">
      <div className="tp-mag-footer__inner">
        <div className="tp-mag-footer__cols">
          <div className="tp-mag-footer__col">
            <p className="tp-mag-footer__col-eyebrow">BRAND</p>
            <p className="tp-mag-footer__brand-name">{brandName}</p>
            {tagline && (
              <p className="tp-mag-footer__brand-tagline">{tagline}</p>
            )}
          </div>

          {address && (
            <div className="tp-mag-footer__col">
              <p className="tp-mag-footer__col-eyebrow">OFFICES</p>
              <p className="tp-mag-footer__col-text">{address}</p>
            </div>
          )}

          {(email || phone) && (
            <div className="tp-mag-footer__col">
              <p className="tp-mag-footer__col-eyebrow">CONTACT</p>
              {email && (
                <a
                  href={channelHref('email', email)}
                  className="tp-mag-footer__link"
                >
                  {email}
                </a>
              )}
              {phone && (
                <a
                  href={channelHref('phone', phone)}
                  className="tp-mag-footer__link"
                >
                  {phone}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="tp-mag-footer__bottom">
          <p className="tp-mag-footer__copy">
            © {year} {brandName} · Powered by Waytico
          </p>
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
