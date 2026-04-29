import Link from 'next/link'
import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Help & FAQ — Waytico',
  description:
    'Learn how Waytico works, how pricing works, and how to get the most out of your trip pages.',
}

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Help Center
            </h1>
            <p className="text-lg text-foreground/60">
              Everything you need to know. If something&apos;s missing, email us at{' '}
              <a
                href="mailto:hello@waytico.com"
                className="text-primary hover:underline underline-offset-2"
              >
                hello@waytico.com
              </a>{' '}
              — we reply fast.
            </p>
          </header>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Getting started
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">How does Waytico work?</h3>
          <p className="text-foreground/80 leading-relaxed">
            You describe a trip in the chat on the home page — where it&apos;s going, how long, who
            it&apos;s for, anything specific the client has asked for. Waytico generates a proposal
            page with a hero, an overview, a day-by-day itinerary, what&apos;s included, your
            terms, and your contact details. You get a private link to share with your client.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Do I need to sign up to try it?</h3>
          <p className="text-foreground/80 leading-relaxed">
            No. You can create your first trip without an account. After it&apos;s generated,
            you&apos;ll be invited to save it — that&apos;s when we ask you to register. Anything
            you created while anonymous gets linked to your account automatically.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            What kinds of trips does it work for?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Multi-day tours, guided experiences, lodge stays, fishing and hunting trips, adventure
            and wildlife itineraries, custom private travel. If it involves a guide or operator
            planning something for a client, it fits. Single-day experiences work too — the format
            scales down.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Does it work in other languages?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Describe a trip in Spanish, Russian, French, or any other language and the whole
            page renders in that language — itinerary, overview, terms, every section. The
            briefing chat picks up the language from your first message and the AI assistant on
            the trip page replies in it too.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">How long does generation take?</h3>
          <p className="text-foreground/80 leading-relaxed">
            About 20 to 40 seconds. You&apos;ll see sections populate as they&apos;re ready — hero,
            itinerary, overview.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Creating and editing trips
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I edit the generated proposal?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes — three ways. Click any field on the page (title, dates, prices, day descriptions,
            terms…) and edit it inline. Drag day cards to reorder them. Or use the AI assistant at
            the bottom of the page to describe changes in plain language —{' '}
            &ldquo;add a rest day after day 3,&rdquo; &ldquo;polish the description for day 2,&rdquo;
            &ldquo;swap days 4 and 5.&rdquo;
          </p>
          <p className="text-foreground/80 leading-relaxed">
            For more on what the assistant can and can&apos;t do, see the{' '}
            <Link href="/help/ai-assistant" className="text-primary hover:underline underline-offset-2">
              AI assistant guide
            </Link>
            .
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I upload documents?</h3>
          <p className="text-foreground/80 leading-relaxed">
            On the home page, yes — drop a PDF, image, Word doc, or spreadsheet into the chat and
            Waytico will read it and pull out the details (flight info, hotel confirmations,
            existing itineraries) when generating the trip.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            On a trip page, document attachments and parsing become available once the
            operational view launches (see{' '}
            <a href="#whats-coming" className="text-primary hover:underline underline-offset-2">
              What&apos;s coming
            </a>
            ).
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I upload photos?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. On any trip page you own, you can add photos to the hero, to individual days, and
            to accommodation cards. Clients see them in the trip page.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            How do I share a proposal with a client?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            On any quoted trip page, tap <strong className="font-semibold text-foreground">Share with client</strong>.
            You can send it via email, WhatsApp, Telegram, or copy the link. Same link your client
            keeps, even if you keep editing the page after.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Branding
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I customize the page with my branding?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. In your dashboard, the Profile card lets you upload a logo, set your business
            name, write a short tagline, and add the contact channels you want clients to reach
            you on (email, phone, WhatsApp, Telegram, Instagram, website, address, and more). Your
            logo and contacts appear on every trip page you create — Waytico fades into the
            background, your brand is what the client sees.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I set default Terms for all my trips?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Profile → Default trip terms. Whatever you write there auto-fills onto every new
            quote you create. You can still tweak the Terms on a single trip; the per-trip edit
            doesn&apos;t change your default. New accounts come pre-filled with a sensible
            starter paragraph (booking, cancellation, insurance, force majeure, liability) — edit
            it or replace it.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I pick a visual style for the page?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Three themes are available today: Classic (warm, editorial), Cinematic (dark,
            full-bleed photography), and Clean (bright, structured). Switch on a single trip from
            the action bar at the top, or set a default for all new trips in Preferences on your
            dashboard. A custom theme builder is on the roadmap.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Pricing and payment
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">How much does Waytico cost?</h3>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Right now, every feature is free.</strong>{' '}
            Unlimited quotes, unlimited edits, unlimited shares. No card on file. See the{' '}
            <Link href="/pricing" className="text-primary hover:underline underline-offset-2">
              pricing page
            </Link>
            {' '}for what paid plans will look like when they launch.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2" id="whats-coming">
            What&apos;s coming after a client says yes?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;re working on the operational side of the page — once a client confirms,
            you&apos;ll be able to turn the same proposal link into a live trip dashboard with a
            packing checklist, pre-trip tasks with deadlines, document attachments, and automatic
            email reminders to the client as deadlines approach. We&apos;ll announce when it ships.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Clients and sharing
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Do my clients need an account?</h3>
          <p className="text-foreground/80 leading-relaxed">
            No. They open the link and see the trip. No login, no app download.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">What does the client actually see?</h3>
          <p className="text-foreground/80 leading-relaxed">
            A clean public page with your branding: hero image, tagline, dates, prices, overview,
            day-by-day itinerary, accommodations, what&apos;s included and not, your terms, and
            your contact details. They don&apos;t see your internal notes, hidden photos, or any
            owner-only chrome.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Account and data</h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Where is my data stored?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Waytico is a Canadian company based in Vancouver, British Columbia. Your data lives on
            secure servers in the United States (Render and AWS). Your trip content, client data,
            and uploaded files belong to you.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I delete my account?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            and we&apos;ll delete your account and everything in it within 30 days. See our{' '}
            <Link href="/privacy" className="text-primary hover:underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            for details.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I export my trips?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Not yet in-app. If you need your data, email us and we&apos;ll send it as JSON.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            What happens to anonymous trips if I don&apos;t sign up?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Trips created without an account expire after 3 days. Sign up before then and
            they&apos;re yours forever.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Still stuck?</h2>
          <p className="text-foreground/80 leading-relaxed">
            Email{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            . We reply within one business day, usually much faster.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
