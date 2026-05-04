import Link from 'next/link'
import Footer from '@/components/footer'
import type { ThemeId } from '@/lib/themes'
import {
  FOOTER_PRODUCT_LINKS,
  FOOTER_RESOURCES_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_CONTACT_EMAIL,
  FOOTER_BRAND_WORDMARK,
  footerCopyLine,
  type FooterLink,
} from '@/lib/footer-content'

type Props = {
  /** Owner mode = render the full footer (product / resources /
   *  legal / contact + brand wordmark + copy line). Traveller mode =
   *  minimal "© year · Powered by Waytico" strip — operator brand
   *  identity is already covered by the Contacts section above, no
   *  product navigation needed for a viewer-only surface.
   *
   *  Both modes apply across themes; only the visual treatment
   *  differs (Magazine = dark slab, Classic / Cinematic / Clean =
   *  light shadcn semantic tokens). */
  editable: boolean
  /** Active theme. Magazine renders the dark variant for both modes;
   *  other themes use the standard site Footer (owner) or the
   *  minimal Classic strip (public). */
  theme?: ThemeId
}

export function TripFooter({ editable, theme }: Props) {
  if (theme === 'magazine') {
    return <FooterMagazine editable={editable} />
  }

  if (editable) {
    // Owner mode on non-Magazine themes: full site footer. Wrapped in
    // a div with id=site-footer so the floating TripCommandBar's
    // IntersectionObserver still finds the page bottom and fades out.
    return (
      <div id="site-footer">
        <Footer />
      </div>
    )
  }

  // Public mode on non-Magazine themes: minimal strip, light palette.
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
 * Magazine footer — dark slab with two role-dependent shapes.
 *
 *   PUBLIC (traveller / showcase visitor):
 *     A single centred line — "© year · Powered by Waytico". Mirror of
 *     the Classic public-mode strip but in the Magazine dark
 *     aesthetic (cream-on-charcoal). Operator reachability lives in
 *     the Contacts section above; nothing else belongs here.
 *
 *   OWNER (operator viewing their own trip page):
 *     Full Waytico product navigation — Product / Resources / Legal /
 *     Contact columns + brand wordmark and copyright line at the
 *     bottom. Same content as Classic Footer (sourced from
 *     lib/footer-content.ts) styled in the Magazine dark aesthetic.
 *     Operator can navigate back to dashboard / pricing / help.
 *
 * Keeps `id="site-footer"` on the outer element in both modes so
 * TripCommandBar's IntersectionObserver still finds the page bottom
 * and fades out near it.
 */
function FooterMagazine({ editable }: { editable: boolean }) {
  const year = new Date().getFullYear()

  // Public / traveller mode — minimal centred strip.
  if (!editable) {
    return (
      <footer
        id="site-footer"
        className="tp-mag-footer tp-mag-footer--minimal"
      >
        <p className="tp-mag-footer__minimal-line">
          © {year} · Powered by{' '}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="tp-mag-footer__minimal-brand"
          >
            Waytico
          </Link>
        </p>
      </footer>
    )
  }

  // Owner mode — full product navigation in the dark Magazine
  // aesthetic. Content sourced from lib/footer-content.ts to stay in
  // sync with the Classic site Footer.
  return (
    <footer id="site-footer" className="tp-mag-footer">
      <div className="tp-mag-footer__inner">
        <div className="tp-mag-footer__cols">
          <FooterMagazineColumn
            eyebrow="PRODUCT"
            links={FOOTER_PRODUCT_LINKS}
          />
          <FooterMagazineColumn
            eyebrow="RESOURCES"
            links={FOOTER_RESOURCES_LINKS}
          />
          <FooterMagazineColumn
            eyebrow="LEGAL"
            links={FOOTER_LEGAL_LINKS}
          />
          <div className="tp-mag-footer__col">
            <p className="tp-mag-footer__col-eyebrow">CONTACT</p>
            <a
              href={`mailto:${FOOTER_CONTACT_EMAIL}`}
              className="tp-mag-footer__link"
            >
              {FOOTER_CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="tp-mag-footer__bottom">
          <Link href="/" className="tp-mag-footer__brand-mark">
            {FOOTER_BRAND_WORDMARK}
          </Link>
          <p className="tp-mag-footer__copy">{footerCopyLine(year)}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterMagazineColumn({
  eyebrow,
  links,
}: {
  eyebrow: string
  links: FooterLink[]
}) {
  return (
    <div className="tp-mag-footer__col">
      <p className="tp-mag-footer__col-eyebrow">{eyebrow}</p>
      <ul className="tp-mag-footer__col-list">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="tp-mag-footer__link">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
