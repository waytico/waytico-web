/**
 * Shared footer content. Both the Classic site Footer
 * (components/footer.tsx) and the Magazine theme's owner-mode footer
 * (FooterMagazine inside components/trip/trip-footer.tsx) read from
 * here so the navigation, contact email, brand wordmark and
 * copyright line stay in sync across themes — change once, both
 * footers update.
 *
 * Only owner-mode Magazine consumes this; the public/tourist
 * Magazine footer is intentionally minimal (© year · Powered by
 * Waytico) and does not carry product navigation.
 */

export interface FooterLink {
  href: string
  label: string
}

export const FOOTER_PRODUCT_LINKS: FooterLink[] = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/help/ai-assistant', label: 'AI assistant' },
  { href: '/pricing', label: 'Pricing' },
]

export const FOOTER_RESOURCES_LINKS: FooterLink[] = [
  { href: '/help', label: 'Help center' },
  { href: '/about', label: 'About' },
]

export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/personal-information', label: 'Personal Information' },
  { href: '/cookies', label: 'Cookies' },
]

export const FOOTER_CONTACT_EMAIL = 'hello@waytico.com'
export const FOOTER_BRAND_WORDMARK = 'Waytico'

export function footerCopyLine(year: number): string {
  return `© ${year} Waytico. Built for small travel businesses.`
}
