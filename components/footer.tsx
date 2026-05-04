import Link from 'next/link'
import { ScrollToTop } from '@/components/scroll-to-top'
import {
  FOOTER_PRODUCT_LINKS,
  FOOTER_RESOURCES_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_CONTACT_EMAIL,
  FOOTER_BRAND_WORDMARK,
  footerCopyLine,
  type FooterLink,
} from '@/lib/footer-content'

export default function Footer() {
  return (
    <>
      <footer className="w-full border-t border-border/50 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <FooterColumn title="Product" links={FOOTER_PRODUCT_LINKS} />
            <FooterColumn title="Resources" links={FOOTER_RESOURCES_LINKS} />
            <FooterColumn title="Legal" links={FOOTER_LEGAL_LINKS} />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Contact</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href={`mailto:${FOOTER_CONTACT_EMAIL}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {FOOTER_CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-2 pt-6 border-t border-border/50 text-sm text-muted-foreground">
            <Link
              href="/"
              className="font-serif font-semibold text-foreground/70 hover:text-foreground transition-colors"
            >
              {FOOTER_BRAND_WORDMARK}
            </Link>
            <span>{footerCopyLine(new Date().getFullYear())}</span>
          </div>
        </div>
      </footer>
      {/* Sibling, not child — kept outside <footer> so its fixed-position
          context isn't constrained by the footer's stacking ancestor. */}
      <ScrollToTop />
    </>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: FooterLink[]
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
