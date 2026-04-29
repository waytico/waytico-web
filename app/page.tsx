import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SignedOut } from '@clerk/nextjs'
import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.1] text-balance">
            A trip quote your client will actually open.
          </h1>
          <p className="text-base md:text-lg text-foreground/70 leading-relaxed text-balance max-w-xl mx-auto">
            Describe the trip. Get a webpage. Send the link. In a minute.
          </p>
          <ChatFlow />

          {/* ── Example preview block ──────────────────────────────
              Only shown to visitors who aren't signed in. For signed-in
              operators this is just visual noise — they already know
              the product, the page is their workspace.

              Visually styled as a browser preview window (URL bar at
              the top, traffic-light dots) so it reads as "here's the
              page that comes out", not as "another textarea". The body
              is a quoted prompt + a CTA pointing to the live demo
              trip. */}
          <SignedOut>
            <div className="pt-6 max-w-2xl mx-auto text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/40 mb-3 text-center">
                Example — what you type → the page it makes
              </p>
              <div className="rounded-2xl border border-foreground/10 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden bg-background">
                {/* Faux browser chrome — three dots + URL bar. Tells
                    the visitor at a glance "this is the rendered page,
                    not a form to fill in". */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/8 bg-foreground/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                  </div>
                  <div className="flex-1 ml-3 px-3 py-1 rounded-md bg-foreground/[0.04] text-xs text-foreground/40 font-mono truncate">
                    waytico.com/t/paris-weekend-getaway
                  </div>
                </div>
                {/* Body — the quoted prompt that generated the page. */}
                <div className="p-6 sm:p-7">
                  <div className="border-l-2 border-accent/60 pl-5 italic font-serif text-foreground/80 text-base leading-relaxed">
                    <p>3 days in Paris for a couple, late June. Hôtel des Deux Pavillons in the Marais.</p>
                    <p>Day 1 Marais and Seine,</p>
                    <p>Day 2 Louvre and Saint-Germain with a Sainte-Chapelle concert,</p>
                    <p>Day 3 Montmartre and a farewell brunch.</p>
                    <p>€1,800 total, private transfers included.</p>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Link
                      href="/t/paris-weekend-getaway"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      See the page it makes
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SignedOut>
        </div>
      </main>
      <Footer />
    </div>
  )
}
