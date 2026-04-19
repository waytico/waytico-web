import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Cookie Policy — Waytico',
  description: 'What cookies Waytico uses, why, and how to control them.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Cookie Policy
            </h1>
            <p className="text-sm text-foreground/60">Effective date: April 19, 2026</p>
          </header>

          <p className="text-foreground/80 leading-relaxed">
            This page explains the cookies and similar technologies Waytico uses. We keep it short
            because we don&apos;t use many.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What are cookies?
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Cookies are small text files your browser stores when you visit a website. They let the
            site remember things — like that you&apos;re logged in, or that you prefer dark mode.
            Some cookies are essential; some are optional.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Similar technologies include local storage (data saved by your browser), session
            storage (data that disappears when you close the tab), and web beacons (tiny signals
            that help track whether emails got opened). We use some of these too.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What we use, and why
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Strictly necessary</h3>
          <p className="text-foreground/80 leading-relaxed">
            These cookies have to be there — without them, Waytico doesn&apos;t work. We don&apos;t
            ask for consent because you can&apos;t really opt out and use the service.
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="border border-border px-4 py-2 font-semibold">Cookie</th>
                  <th className="border border-border px-4 py-2 font-semibold">Set by</th>
                  <th className="border border-border px-4 py-2 font-semibold">Purpose</th>
                  <th className="border border-border px-4 py-2 font-semibold">Lifetime</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr>
                  <td className="border border-border px-4 py-2 font-mono text-xs">__session</td>
                  <td className="border border-border px-4 py-2">Clerk</td>
                  <td className="border border-border px-4 py-2">Keeps you signed in</td>
                  <td className="border border-border px-4 py-2">Session</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2 font-mono text-xs">__clerk_db_jwt</td>
                  <td className="border border-border px-4 py-2">Clerk</td>
                  <td className="border border-border px-4 py-2">Token for authentication</td>
                  <td className="border border-border px-4 py-2">Short-lived (refreshes)</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2 font-mono text-xs">__client_uat</td>
                  <td className="border border-border px-4 py-2">Clerk</td>
                  <td className="border border-border px-4 py-2">Tracks session state</td>
                  <td className="border border-border px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Stripe session cookies</td>
                  <td className="border border-border px-4 py-2">Stripe</td>
                  <td className="border border-border px-4 py-2">
                    Processes payments securely during checkout
                  </td>
                  <td className="border border-border px-4 py-2">Checkout only</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Functional</h3>
          <p className="text-foreground/80 leading-relaxed">
            Help Waytico remember things you&apos;ve chosen. None yet — when we add things like
            theme preferences, they&apos;ll appear here.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Analytics</h3>
          <p className="text-foreground/80 leading-relaxed">
            We don&apos;t use third-party analytics (Google Analytics, Mixpanel, Amplitude, or
            anything similar) at this time. If we add them, we&apos;ll update this page and ask for
            consent where required.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Advertising</h3>
          <p className="text-foreground/80 leading-relaxed">
            We don&apos;t run ads. We don&apos;t use advertising cookies. We don&apos;t plan to.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            How to control cookies
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">In your browser.</strong> Every major
            browser lets you see, block, and delete cookies. Look for &ldquo;Privacy&rdquo; or
            &ldquo;Cookies&rdquo; in your browser&apos;s settings. Keep in mind that blocking
            essential cookies will break sign-in and payment.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Edge
              </a>
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Do Not Track.</strong> Some browsers
            send a &ldquo;Do Not Track&rdquo; signal. Standards around DNT are unsettled, so we
            don&apos;t treat it as a specific instruction — but since we don&apos;t track you
            across sites anyway, there&apos;s nothing to turn off.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Global Privacy Control.</strong> We
            recognize GPC signals where the law (like California&apos;s CCPA) gives you the right
            to opt out of sale or sharing. Since we don&apos;t sell or share personal information
            in that sense, there&apos;s nothing for GPC to change — but the legal right is
            respected.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Third-party cookies
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            The strictly necessary cookies above are set by third parties (Clerk, Stripe) acting on
            our behalf. They&apos;re governed by our contracts with those providers and their own
            privacy policies:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <a
                href="https://clerk.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Clerk Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Stripe Privacy Policy
              </a>
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            We don&apos;t embed third-party content (YouTube videos, Twitter feeds, Facebook
            widgets) that would drop additional cookies.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Changes to this policy
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            If we start using new cookies — especially analytics or anything optional — we&apos;ll
            update this page and, where required, ask for your consent before setting them.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Questions</h2>
          <p className="text-foreground/80 leading-relaxed">
            Write us at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            .
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
