import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Your Personal Information — Waytico',
  description: 'Your rights over your personal data at Waytico and how to exercise them.',
}

export default function PersonalInformationPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Your Personal Information
            </h1>
            <p className="text-sm text-foreground/60">Effective date: April 19, 2026</p>
          </header>

          <p className="text-foreground/80 leading-relaxed">
            Your data belongs to you. This page explains what rights you have, where they come
            from, and how to use them. For the full picture, read our{' '}
            <Link href="/privacy" className="text-primary hover:underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Your rights — at a glance
          </h2>
          <p className="text-foreground/80 leading-relaxed">No matter where you live, you can:</p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">See it.</strong> Get a copy of the
              personal information we have about you.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Fix it.</strong> Correct anything
              that&apos;s wrong.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Take it.</strong> Export your data
              in a format you can use elsewhere.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Erase it.</strong> Have it deleted,
              usually within 30 days.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Object.</strong> Tell us to stop
              processing your data for specific purposes.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Withdraw consent.</strong> Any
              consent you&apos;ve given, you can take back.
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            To use any of these, email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            from the address on your account. We&apos;ll verify it&apos;s you and respond within 30
            days. No charge.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            If you&apos;re in the European Union, United Kingdom, or EEA (GDPR)
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Under the General Data Protection Regulation, you have:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Right of access</strong> — ask for
              a copy of your data
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to rectification</strong> —
              fix inaccurate data
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to erasure</strong>{' '}
              (&ldquo;right to be forgotten&rdquo;) — have your data deleted
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to restrict processing</strong>{' '}
              — tell us to pause certain uses of your data
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to data portability</strong>{' '}
              — get your data in a machine-readable format
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to object</strong> — object
              to certain types of processing
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to withdraw consent</strong>{' '}
              — any time, for any consent-based processing
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to lodge a complaint</strong>{' '}
              — with your local data protection authority if you&apos;re unhappy with how
              we&apos;ve handled things
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Our legal basis for processing your data:
            </strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Contract</strong> — we need your
              data to deliver the service you signed up for
            </li>
            <li>
              <strong className="font-semibold text-foreground">Legitimate interests</strong> —
              running, improving, and securing Waytico
            </li>
            <li>
              <strong className="font-semibold text-foreground">Consent</strong> — for things that
              need explicit permission, like marketing emails (which we don&apos;t currently send)
            </li>
            <li>
              <strong className="font-semibold text-foreground">Legal obligation</strong> — where a
              law requires us to keep something
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Data Protection Officer.</strong> We
            don&apos;t have one appointed — we&apos;re not required to. For any privacy matter,
            email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            and the team will handle it.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            If you&apos;re in Canada
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is based in Vancouver, British Columbia, so if you&apos;re in Canada, this is
            your home law as much as ours. Under the Personal Information Protection and Electronic
            Documents Act (PIPEDA) and, for British Columbia residents, the BC Personal Information
            Protection Act (PIPA), you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>Know what personal information we hold about you and what we do with it</li>
            <li>See and get a copy of it</li>
            <li>Ask us to correct anything inaccurate</li>
            <li>
              Withdraw consent for any processing that isn&apos;t strictly required to deliver the
              service you signed up for
            </li>
            <li>File a complaint with a regulator if you&apos;re unhappy with how we&apos;ve handled things</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Regulators.</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              For most of Canada: Office of the Privacy Commissioner of Canada —{' '}
              <a
                href="https://priv.gc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                priv.gc.ca
              </a>
            </li>
            <li>
              For British Columbia residents: Office of the Information and Privacy Commissioner
              for BC —{' '}
              <a
                href="https://oipc.bc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                oipc.bc.ca
              </a>
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            Please write to us first at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            — we want to make it right directly before it gets to a regulator.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            If you&apos;re in California (CCPA / CPRA)
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Under the California Consumer Privacy Act (as amended by CPRA), you have:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Right to know</strong> — what
              personal information we collect, where it comes from, why we collect it, who we
              share it with
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to delete</strong> — have
              your personal information deleted
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to correct</strong> — fix
              inaccurate personal information
            </li>
            <li>
              <strong className="font-semibold text-foreground">
                Right to opt out of sale or sharing
              </strong>{' '}
              — we don&apos;t sell or share your personal information for cross-context behavioral
              advertising, so there&apos;s nothing to opt out of, but you always have the right
            </li>
            <li>
              <strong className="font-semibold text-foreground">
                Right to limit use of sensitive personal information
              </strong>{' '}
              — we don&apos;t use sensitive personal information for inferring characteristics, so
              again, nothing to limit
            </li>
            <li>
              <strong className="font-semibold text-foreground">Right to non-discrimination</strong>{' '}
              — we won&apos;t treat you worse for exercising any of these rights
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Categories of information we collect, and why:
            </strong>
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="border border-border px-4 py-2 font-semibold">Category</th>
                  <th className="border border-border px-4 py-2 font-semibold">Examples</th>
                  <th className="border border-border px-4 py-2 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr>
                  <td className="border border-border px-4 py-2">Identifiers</td>
                  <td className="border border-border px-4 py-2">Name, email, account ID</td>
                  <td className="border border-border px-4 py-2">Run your account</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Commercial information</td>
                  <td className="border border-border px-4 py-2">
                    Payment status, activation history
                  </td>
                  <td className="border border-border px-4 py-2">Bill you correctly</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Internet activity</td>
                  <td className="border border-border px-4 py-2">
                    Pages visited, device type, IP
                  </td>
                  <td className="border border-border px-4 py-2">
                    Run the service, detect abuse
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Content you create</td>
                  <td className="border border-border px-4 py-2">
                    Trip descriptions, photos, documents
                  </td>
                  <td className="border border-border px-4 py-2">
                    Deliver the service you signed up for
                  </td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Inferences</td>
                  <td className="border border-border px-4 py-2">
                    What features you use most
                  </td>
                  <td className="border border-border px-4 py-2">Improve the product</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              We do not sell your personal information.
            </strong>{' '}
            We do not share it for cross-context behavioral advertising.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Shine the Light (California Civil Code § 1798.83).
            </strong>{' '}
            If you&apos;re a California resident, you can ask us for a list of third parties
            we&apos;ve shared your personal information with for their direct marketing purposes.
            We don&apos;t share for that purpose, so the answer is: nobody.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Authorized agents.</strong> You can
            ask someone to exercise these rights for you. We&apos;ll need to verify both of you.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            If you&apos;re somewhere else
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Many other places — Brazil, Australia, Japan, South Korea, and others — have privacy
            laws that give you similar rights. Whatever the law says where you are, write us at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            and we&apos;ll handle your request.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What &ldquo;personal information&rdquo; means here
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            It means information that identifies you or could reasonably be linked to you: your
            name, email, IP address, account activity, trip content tied to your account, payment
            history, and anything else that ties back to you personally.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            It doesn&apos;t include fully anonymized or aggregated data — numbers like &ldquo;42%
            of our users create trips on mobile,&rdquo; where no individual can be identified.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            How to make a request
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>What you want (see, correct, delete, export, etc.)</li>
            <li>The email address on your Waytico account</li>
            <li>Enough context that we can find the right records</li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            We may ask you to verify your identity — usually by confirming from the account&apos;s
            email address. Once we&apos;ve verified, we respond within 30 days (45 for complex
            requests, and we&apos;ll tell you if we need the extra time).
          </p>
          <p className="text-foreground/80 leading-relaxed">
            If we can&apos;t do what you&apos;re asking — for example, if we have a legal
            obligation to keep something — we&apos;ll tell you why.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Complaints</h2>
          <p className="text-foreground/80 leading-relaxed">
            If you think we&apos;ve mishandled your data and we haven&apos;t resolved it to your
            satisfaction, you can file a complaint with the data protection authority where you
            live:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">Canada:</strong> Office of the
              Privacy Commissioner of Canada (
              <a
                href="https://priv.gc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                priv.gc.ca
              </a>
              )
            </li>
            <li>
              <strong className="font-semibold text-foreground">British Columbia:</strong> Office
              of the Information and Privacy Commissioner for BC (
              <a
                href="https://oipc.bc.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                oipc.bc.ca
              </a>
              )
            </li>
            <li>
              <strong className="font-semibold text-foreground">EU / EEA:</strong> the supervisory
              authority in your country of residence
            </li>
            <li>
              <strong className="font-semibold text-foreground">United Kingdom:</strong> the
              Information Commissioner&apos;s Office (
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                ico.org.uk
              </a>
              )
            </li>
            <li>
              <strong className="font-semibold text-foreground">California:</strong> California
              Privacy Protection Agency (
              <a
                href="https://cppa.ca.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                cppa.ca.gov
              </a>
              )
            </li>
          </ul>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;d prefer to hear from you first so we can make it right.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Contact</h2>
          <p className="text-foreground/80 leading-relaxed">
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
