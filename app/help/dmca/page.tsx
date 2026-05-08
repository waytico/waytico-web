import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'DMCA / Copyright Takedown — Waytico',
  description:
    'How to send a copyright takedown notice for content hosted on Waytico, and how we respond.',
  robots: { index: true, follow: true },
}

/**
 * /help/dmca — public DMCA / copyright takedown page (TZ Photo Bank Stage 9 §13).
 *
 * Targets two audiences:
 *   1. Rights-holders looking for the notification address and the
 *      required fields. Surface the email + the perjury / signature
 *      checklist exactly per the TZ wording.
 *   2. Operators who want to understand the response timeline and what
 *      we forward to them.
 */
export default function DmcaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Copyright takedown requests (DMCA)
            </h1>
            <p className="text-lg text-foreground/60">
              Waytico responds to verified DMCA notices within 24 hours on
              business days. Read this page before sending one — it tells
              you what we need from you and what happens after.
            </p>
          </header>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Where to send notices
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Email{' '}
            <a
              href="mailto:hello@waytico.com?subject=DMCA%20Takedown"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            with the subject line{' '}
            <strong className="font-semibold text-foreground">DMCA Takedown — [URL]</strong>.
            Include every field listed below.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What to include
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>The full URL of the page or trip on Waytico where the content appears.</li>
            <li>The specific photo or asset at issue (file URL, or a description that lets us locate it on the page).</li>
            <li>Your name, organization (if any), and a contact email and phone number.</li>
            <li>
              A statement under penalty of perjury that you are the copyright
              owner of the work, or are authorized to act on behalf of the
              owner.
            </li>
            <li>Your physical or electronic signature.</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            Notices missing any of these fields slow our response — we may
            ask for clarification before acting.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What we do when we receive a notice
          </h2>
          <ol className="list-decimal pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              Acknowledge receipt to you within 24 hours on business days.
            </li>
            <li>
              Remove the photo or asset from public access on the affected
              trip page(s).
            </li>
            <li>
              Forward your notice to the operator who uploaded the content,
              with their identifying details redacted from your copy of the
              communication.
            </li>
            <li>
              Give the operator an opportunity to send a counter-notification
              if they believe the takedown is mistaken.
            </li>
          </ol>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Counter-notifications
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Operators who receive a forwarded notice may reply with a
            counter-notification under penalty of perjury. We process valid
            counter-notifications by forwarding them to the original
            notifier; if the matter isn&apos;t resolved between the parties
            within 10 business days we may restore the content.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Repeat infringers
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            We terminate operator accounts that accumulate repeated valid
            takedown notices, in accordance with our{' '}
            <Link href="/terms" className="text-primary hover:underline underline-offset-2">
              Terms of Use
            </Link>
            .
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Operator responsibilities
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Every Waytico operator confirms before uploading photos that they
            own the rights to those photos or have explicit permission to
            use them commercially. Waytico stores photos on the operator&apos;s
            behalf — the operator is the responsible party for the content
            they upload, and a takedown forwarded by us must be answered by
            them, not by us.
          </p>

          <p className="text-sm text-foreground/60 mt-12">
            Questions about anything above?{' '}
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
