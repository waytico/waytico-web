import Link from 'next/link'

const productLinks = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/help/ai-assistant', label: 'AI assistant' },
  { href: '/pricing', label: 'Pricing' },
]

const resourcesLinks = [
  { href: '/help', label: 'Help center' },
  { href: '/about', label: 'About' },
]

const legalLinks = [
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/personal-information', label: 'Personal Information' },
  { href: '/cookies', label: 'Cookies' },
]

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-secondary">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Resources" links={resourcesLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@waytico.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  hello@waytico.com
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
            Waytico
          </Link>
          <span>© {new Date().getFullYear()} Waytico. Built for small travel businesses.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
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
