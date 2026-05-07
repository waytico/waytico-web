import Link from 'next/link'
import { ScrollToTop } from '@/components/scroll-to-top'
import {
  FOOTER_PRODUCT_LINKS,
  FOOTER_RESOURCES_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_CONTACT_EMAIL,
  FOOTER_BRAND_WORDMARK,
  type FooterLink,
} from '@/lib/footer-content'
import { renderCopyLine } from '@/lib/footer-copy'

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
              className="font-syne font-medium uppercase tracking-[0.18em] text-[13px] text-foreground/70 hover:text-foreground transition-colors inline-block"
              style={{ transform: 'scaleX(1.35)', transformOrigin: 'left center' }}
            >
              {FOOTER_BRAND_WORDMARK}
            </Link>
            <span className="text-[12px] text-muted-foreground">{renderCopyLine(new Date().getFullYear(), 'font-syne font-medium uppercase tracking-[0.18em] inline-block mx-4', { transform: 'scaleX(1.35)', transformOrigin: 'center' })}</span>
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






