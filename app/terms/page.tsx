import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Terms of Use — Waytico',
  description: 'The terms that govern your use of Waytico.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Terms of Use
            </h1>
            <p className="text-sm text-foreground/60">Effective date: April 19, 2026</p>
          </header>

          <p className="text-foreground/80 leading-relaxed">
            These terms are the agreement between you and Waytico. By using the service, you agree
            to them. If you don&apos;t, please don&apos;t use the service.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;ve tried to write these in plain English. Where we use legal language,
            it&apos;s because we have to.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            1. What Waytico is
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is a software service that helps travel operators create, share, and manage
            trip proposals and operational plans. We provide the tools; you provide the expertise
            and the content.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            2. Your account
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            To use most features, you need an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>Give us accurate information when you sign up</li>
            <li>Keep your login credentials secure</li>
            <li>Tell us if you notice unauthorized access to your account</li>
            <li>Be responsible for everything that happens on your account</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            You must be at least 18 years old to create an account.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            3. How you can use Waytico
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            You can use Waytico to run your travel business — creating proposals, sharing them with
            clients, managing bookings, and all the normal things that implies.
          </p>
          <p className="text-foreground/80 leading-relaxed">You can&apos;t use Waytico to:</p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>Break the law or help anyone else break it</li>
            <li>Send spam, phishing attempts, or misleading proposals</li>
            <li>
              Upload content that&apos;s illegal, fraudulent, or that you don&apos;t have the
              rights to use
            </li>
            <li>Harass, threaten, or defraud your clients or anyone else</li>
            <li>Reverse-engineer, scrape, or otherwise hack the service</li>
            <li>Resell or rebrand Waytico as your own product</li>
            <li>Create fake trip pages for purposes unrelated to real travel services</li>
            <li>Use it to generate abusive, hateful, or sexually explicit content</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            If you do any of the above, we may suspend or terminate your account without notice.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            4. Your content
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Anything you create or upload in Waytico — trip descriptions, photos, documents, custom
            edits — stays yours. You own it.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            By putting it in Waytico, you give us permission to store it, display it, process it
            through our AI pipelines, and deliver it to the clients you share it with. That
            permission ends when you delete the content or your account.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            You&apos;re responsible for what you upload. Don&apos;t upload anything you don&apos;t
            have the right to — photos you didn&apos;t take and don&apos;t have permission for,
            copyrighted itineraries, client data you haven&apos;t been authorized to store, and so
            on.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            5. AI-generated content
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico uses AI to help generate trip content. The AI works from your inputs, but
            it&apos;s not a substitute for your judgment. You&apos;re responsible for reviewing
            everything before you send it to a client — facts, prices, dates, terms, everything.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We don&apos;t guarantee that AI output is accurate, complete, or suitable for any
            particular client. Treat it as a first draft.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            6. Pricing and payment
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Today, Waytico is free to use.</strong>{' '}
            Creating and editing trip quotes is free, with no card on file required.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">In the future,</strong> we plan to
            introduce two ways to pay: a one-time charge per trip when you turn a confirmed
            proposal into a live operational page, and an optional monthly subscription for
            advanced quote-building features. See the{' '}
            <Link href="/pricing" className="text-primary hover:underline underline-offset-2">
              pricing page
            </Link>
            {' '}for what we&apos;ve committed to. We&apos;ll announce final prices on this page
            and email active users at least 30 days before any charges begin.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Once paid plans launch,</strong>{' '}
            charges (where applicable) will be processed through Stripe. Prices will be shown at
            the point of purchase. By proceeding to pay, you&apos;ll agree to the displayed amount.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Refunds.</strong> If something goes
            wrong with a paid feature once it&apos;s available, email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            within 7 days and we&apos;ll work it out in good faith.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Price changes.</strong> If we change
            pricing after it launches, new pricing applies only to new charges. Anything you&apos;ve
            already paid for stays at what you paid.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            7. Your clients
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            When you share a trip page with a client, you&apos;re the one inviting them into the
            relationship. You&apos;re responsible for what you tell them, what you promise them,
            and what you deliver. Waytico is not a party to your deal with your client.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;re also not responsible for the trip itself — the flights, hotels, guides,
            insurance, or anything else you arrange. That&apos;s between you, your suppliers, and
            your client.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            8. Service availability
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            We do our best to keep Waytico running. We don&apos;t guarantee 100% uptime. Things
            break sometimes, deployments go sideways, third-party services have outages. When that
            happens, we fix it as fast as we can.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We may change, improve, or remove features. When we remove something you were relying
            on, we&apos;ll give notice when we can.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            9. Disclaimers
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is provided &ldquo;as is.&rdquo; We don&apos;t make warranties — express or
            implied — about its reliability, accuracy, fitness for a particular purpose, or
            non-infringement.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;re a tool, not your business. You run your business.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            10. Limitation of liability
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            To the maximum extent the law allows, Waytico and its team aren&apos;t liable for
            indirect, incidental, consequential, or punitive damages — lost profits, lost bookings,
            reputational harm, anything like that — arising from your use of the service.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Our total liability in any dispute is limited to the amount you&apos;ve paid us in the
            12 months before the dispute.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            None of this limits liability for things the law says can&apos;t be limited — like
            gross negligence or intentional misconduct.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            11. Termination
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">By you.</strong> Delete your account
            any time. Email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            or use the in-app option when available.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">By us.</strong> We may suspend or
            terminate your account if you break these terms, if your account is inactive for an
            extended period, if we have a legal reason to, or if we decide to stop offering the
            service.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            When your account ends, your content is deleted within 30 days. Anything you&apos;ve
            paid for that you haven&apos;t used — we&apos;ll refund in good faith.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            12. Changes to these terms
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            If we change these terms in a way that matters, we&apos;ll email active users and post
            a notice on this page at least 14 days before the change takes effect. If you keep
            using Waytico after the change, you&apos;ve accepted the new terms.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            13. Governing law
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            These terms are governed by the laws of the Province of British Columbia and the
            federal laws of Canada applicable there, without regard to conflict-of-laws principles.
            Disputes go to the courts of British Columbia, located in the City of Vancouver, and
            you agree to that jurisdiction.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            If you&apos;re a consumer somewhere this clause doesn&apos;t fly under local law, the
            local law wins.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            14. Miscellaneous
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Entire agreement.</strong> These
              terms, plus the{' '}
              <Link href="/privacy" className="text-primary hover:underline underline-offset-2">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/cookies" className="text-primary hover:underline underline-offset-2">
                Cookie Policy
              </Link>
              , are the whole agreement between us.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Severability.</strong> If one part
              of these terms is held unenforceable, the rest still apply.
            </li>
            <li>
              <strong className="font-semibold text-foreground">No waiver.</strong> If we
              don&apos;t enforce something right away, we haven&apos;t given up the right to
              enforce it later.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Assignment.</strong> You can&apos;t
              transfer your account to someone else without our permission. We can transfer our
              rights under these terms — for example, in an acquisition.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Contact</h2>
          <p className="text-foreground/80 leading-relaxed">
            Questions about these terms:{' '}
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
