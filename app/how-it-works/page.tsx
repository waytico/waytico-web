import type { Metadata } from 'next'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'How Waytico works',
  description:
    'You already plan trips. Waytico turns your plan into a page you can send — and pay only when a client books.',
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              How Waytico works
            </h1>
            <p className="text-lg text-foreground/60">
              You already plan trips. Waytico just turns your plan into a page you can send.
            </p>
          </header>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">The problem</h2>
          <p className="text-foreground/80 leading-relaxed">
            You wrote up a trip for a client. It&apos;s in a Word doc, or a messy email, or scattered
            across WhatsApp. You need to send it as something that looks like a real proposal — not
            an attachment they won&apos;t open.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            So you spend an hour reformatting. Copy into a template. Fix the fonts. Export a PDF.
            Send it. They ask for a change. You do it all again.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What Waytico does
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            You paste your day-by-day plan into the chat. Dates, places, what&apos;s included, the
            price — whatever you&apos;ve already decided. You can also drop in a PDF, Word doc, or
            spreadsheet and Waytico will read the details out of it for you.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            A few seconds later, you get a clean web page with your itinerary, the prices, the
            terms — everything. One link. You send it to the client by WhatsApp, email, Telegram,
            or just copy the URL.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Waytico doesn&apos;t invent the trip.</strong>{' '}
            Your dates, your hotels, your prices, your days — they go in exactly as you wrote them.
            Anything you didn&apos;t specify stays blank. No made-up details, no generic filler.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            When they ask to change something
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            You type the change in plain language — &ldquo;swap the Arusha hotel for Gran
            Meliá,&rdquo; &ldquo;add a rest day after day three,&rdquo; &ldquo;make it a private
            departure.&rdquo; The page updates. Same link, always current.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Or just click any field on the page and edit it directly. Drag a day card to
            reorder it. Drop in your own photos. The whole proposal is yours to shape.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            When the client says yes
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Today, you keep using the same link to keep the proposal current up to the day they
            travel. Quotes don&apos;t expire — once you save one to your account, it&apos;s yours
            until you archive it.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            The next step we&apos;re working on: turning a confirmed proposal into a full
            operational page. Same link your client already has, but with a packing checklist,
            pre-trip tasks with deadlines, document attachments, automatic reminders. We&apos;ll
            announce when it&apos;s ready.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What this replaces
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            One link instead of a Word doc, a PDF, a shared folder, and three WhatsApp threads.
            Free to create, edit, and share as many proposals as you want — see the{' '}
            <a
              href="/pricing"
              className="text-primary hover:underline underline-offset-2"
            >
              pricing page
            </a>
            {' '}for what we&apos;ve committed to about future paid plans.
          </p>

          <div className="pt-8 space-y-4">
            <p className="text-foreground/80 leading-relaxed">
              <a
                href="/"
                className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 font-medium"
              >
                Start a trip →
              </a>{' '}
              <span className="text-foreground/60">— no account needed to try it.</span>
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Questions?{' '}
              <a
                href="mailto:hello@waytico.com"
                className="text-primary hover:underline underline-offset-2"
              >
                hello@waytico.com
              </a>
              .
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
