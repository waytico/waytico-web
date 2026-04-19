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
            page with an itinerary, overview, locations on a map, and terms. You get a private link
            to share with your client. If they book, you activate the page and it turns into their
            trip dashboard.
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

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">How long does generation take?</h3>
          <p className="text-foreground/80 leading-relaxed">
            About 20 to 40 seconds. You&apos;ll see sections populate as they&apos;re ready — hero,
            itinerary, overview, map locations.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Creating and editing trips
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I edit the generated proposal?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. On the trip page, use the command bar at the bottom to describe changes in plain
            language — &ldquo;add a rest day after day 3,&rdquo; &ldquo;change the hotel in Arusha
            to Gran Meliá,&rdquo; &ldquo;make this a private departure for two guests.&rdquo;
            Waytico makes the edit and updates the page.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I upload documents?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes — PDFs, images, Word docs, and spreadsheets. Drop them into the chat on the home
            page or the command bar on a trip page. Waytico reads them and pulls out relevant
            details (flight info, hotel confirmations, itineraries).
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I upload photos?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. On any trip page you own, you can add photos per day or to the hero. Clients see
            them in the trip page gallery.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I hide things from the client?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Tasks and photos have a &ldquo;visible to client&rdquo; toggle. Use it for internal
            notes, backup plans, or logistics your client doesn&apos;t need to see.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            How do I share a proposal with a client?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            On any quoted trip page, tap <strong className="font-semibold text-foreground">Share</strong>.
            You can send it via email, WhatsApp, Telegram, or copy the link.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Pricing and activation
          </h2>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">How much does Waytico cost?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Creating and editing quotes is free. Unlimited. You pay only when you activate a trip
            page for a booked client — a one-time fee per page. No subscription.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">What&apos;s included when I activate?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Activation unlocks the operational side of the page: a &ldquo;what to bring&rdquo;
            checklist generated for your trip, preparation tasks with deadlines for your client,
            and a place to attach booking documents the client can download. Your client gets a
            live dashboard, not just a proposal.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I activate a page later?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Yes. Quotes don&apos;t expire for registered users. Activate whenever your client
            confirms.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">Can I refund an activation?</h3>
          <p className="text-foreground/80 leading-relaxed">
            Write us at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>{' '}
            within 7 days. If the page hasn&apos;t been shared with a paying client yet, we&apos;ll
            refund it.
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
            Before activation: the proposal — hero image, overview, day-by-day itinerary,
            what&apos;s included and not included, map locations, terms. After activation: all of
            that, plus their prep tasks and any documents you&apos;ve attached.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Can I customize the page with my branding?
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            Branding is on our roadmap. Today, trip pages carry a small Waytico mark in the footer.
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
