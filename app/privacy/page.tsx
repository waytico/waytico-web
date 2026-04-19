import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Waytico',
  description: 'How Waytico collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-foreground/60">Effective date: April 19, 2026</p>
          </header>

          <p className="text-foreground/80 leading-relaxed">
            This policy explains what information Waytico collects, why we collect it, and what we
            do with it. It&apos;s written to be read, not to be skipped. If anything is unclear,
            email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            .
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Who we are</h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is a software service for travel professionals. When we say &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;Waytico,&rdquo; we mean the team behind Waytico. When we
            say &ldquo;you,&rdquo; we mean whoever is using the service — typically a travel
            operator, guide, or their client viewing a trip page.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">What we collect</h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Information you give us directly.
            </strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              Your name, email address, and business name when you create an account (via Clerk,
              our authentication provider)
            </li>
            <li>
              Content you create in Waytico: trip descriptions, itineraries, prices, client-facing
              text, tasks, and notes
            </li>
            <li>Files you upload: photos, PDFs, Word documents, and spreadsheets</li>
            <li>Messages you send to our AI chat (briefing and editor)</li>
            <li>
              Payment details when you activate a trip page (handled by Stripe — we never see full
              card numbers)
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Information we collect automatically.
            </strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>Basic usage data: which pages you visit, when, and from what kind of device</li>
            <li>
              Technical data: IP address, browser type, and session identifiers needed to keep you
              logged in
            </li>
            <li>Error logs when something breaks, so we can fix it</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Information from third parties.</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>Authentication data from Clerk (verified email, sign-in status)</li>
            <li>Payment status from Stripe (whether a charge succeeded, not card details)</li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Why we collect it
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">To run the service.</strong>{' '}
              Generating trip pages, saving your work, sending you emails you&apos;ve asked for.
            </li>
            <li>
              <strong className="font-semibold text-foreground">To bill correctly.</strong>{' '}
              Processing activation payments through Stripe.
            </li>
            <li>
              <strong className="font-semibold text-foreground">To improve the product.</strong>{' '}
              Aggregated, anonymized usage data helps us see what works and what doesn&apos;t.
            </li>
            <li>
              <strong className="font-semibold text-foreground">To keep you safe.</strong> Detecting
              abuse, fraud, and security issues.
            </li>
            <li>
              <strong className="font-semibold text-foreground">To talk to you.</strong> Responding
              when you email us, sending account notifications.
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            We don&apos;t sell your data. Ever. We don&apos;t show you ads. We don&apos;t share your
            content with other Waytico users.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Who we share it with
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            We use a small number of trusted companies to run Waytico. Each one gets only what they
            need:
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="border border-border px-4 py-2 font-semibold">Company</th>
                  <th className="border border-border px-4 py-2 font-semibold">What they do</th>
                  <th className="border border-border px-4 py-2 font-semibold">What they see</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr>
                  <td className="border border-border px-4 py-2">Render</td>
                  <td className="border border-border px-4 py-2">
                    Hosts our application and database
                  </td>
                  <td className="border border-border px-4 py-2">Everything stored in Waytico</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">AWS (Amazon Web Services)</td>
                  <td className="border border-border px-4 py-2">
                    Stores your uploaded photos and documents
                  </td>
                  <td className="border border-border px-4 py-2">The files you upload</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Clerk</td>
                  <td className="border border-border px-4 py-2">
                    Handles sign-in and account management
                  </td>
                  <td className="border border-border px-4 py-2">
                    Your email, name, login activity
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Stripe</td>
                  <td className="border border-border px-4 py-2">Processes payments</td>
                  <td className="border border-border px-4 py-2">
                    Your billing info and payment history
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">OpenAI</td>
                  <td className="border border-border px-4 py-2">
                    Generates trip content from your descriptions
                  </td>
                  <td className="border border-border px-4 py-2">
                    The trip brief and chat messages you send
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Google (Gemini)</td>
                  <td className="border border-border px-4 py-2">
                    Parses documents you upload
                  </td>
                  <td className="border border-border px-4 py-2">The contents of uploaded files</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Resend</td>
                  <td className="border border-border px-4 py-2">Sends transactional email</td>
                  <td className="border border-border px-4 py-2">
                    Your email address, message content
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-foreground/80 leading-relaxed">
            Each of these companies has its own privacy policy and security practices. We review
            them before connecting, and we only send them the minimum they need.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Beyond that, we share information only if we have to — for example, to comply with a
            valid legal request, or to protect someone&apos;s safety.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            How long we keep your data
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Account data:</strong> as long as
              your account exists. Delete your account and we delete it within 30 days.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Anonymous trips:</strong> 3 days
              from creation. After that, they&apos;re removed automatically.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Chat editor sessions:</strong> 1
              hour after last activity.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Email logs:</strong> 1 year.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Backups:</strong> up to 30 days
              after deletion, then fully removed.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Your rights</h2>
          <p className="text-foreground/80 leading-relaxed">You can:</p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">See what we have on you.</strong>{' '}
              Email us and we&apos;ll send it.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Correct it.</strong> Most of it you
              can edit yourself in your account. For anything else, email us.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Delete it.</strong> Request account
              deletion and we&apos;ll wipe everything within 30 days.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Take it with you.</strong>{' '}
              We&apos;ll export your data as JSON on request.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Object or restrict.</strong> If
              you&apos;re in the EU, UK, Canada, or California, you have extra rights. See{' '}
              <Link
                href="/personal-information"
                className="text-primary hover:underline underline-offset-2"
              >
                Personal Information
              </Link>
              .
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            To exercise any of these rights, email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            from the address on your account. We respond within 30 days.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Security</h2>
          <p className="text-foreground/80 leading-relaxed">
            We use industry-standard practices: encrypted connections (HTTPS everywhere), encrypted
            storage, scoped credentials, and regular reviews of who has access to what. No system
            is perfectly secure, but we treat your data like it&apos;s ours — because if something
            goes wrong, it&apos;s on us.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            If we ever have a breach that affects you, we&apos;ll tell you promptly and explain
            what happened.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Children</h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is not for children under 16. We don&apos;t knowingly collect data from anyone
            under 16. If you believe a child has given us information, email us and we&apos;ll
            remove it.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            International transfers
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is operated from Vancouver, British Columbia, Canada. Our servers — where your
            data actually lives — are in the United States (hosted with Render and AWS,{' '}
            <code className="font-mono text-sm bg-secondary px-1 rounded">us-east-1</code> region).
            That means your data crosses borders: from wherever you are, through our systems, to
            hosting infrastructure in the U.S.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We rely on standard safeguards for these transfers, including our providers&apos;
            data-processing agreements and, where applicable, the European Commission&apos;s
            adequacy decision for Canadian commercial organizations under PIPEDA. If you&apos;re
            using Waytico from the EU, UK, or elsewhere with strict cross-border rules, you&apos;re
            agreeing to this setup when you use the service.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Changes to this policy
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            If we change this policy in a way that matters, we&apos;ll email active users and post
            a notice on this page at least 14 days before the change takes effect. You can always
            see the &ldquo;effective date&rdquo; at the top.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Contact</h2>
          <p className="text-foreground/80 leading-relaxed">
            Privacy questions or requests:{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            . A human reads them.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
