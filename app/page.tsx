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
            The quote tool for travel pros.
          </h1>
          <p className="text-base md:text-lg text-foreground/70 leading-relaxed text-balance max-w-xl mx-auto">
            Describe the trip. Get a webpage. Send the link. In minutes.
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
            <div className="pt-10 max-w-2xl mx-auto text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/40 mb-3 text-center">
                Example
              </p>
              {/* Dark card surface so the example reads as a *product
                  screenshot* rather than another input field. The
                  textarea above is light; the contrast with this dark
                  block is what removes the "two windows" confusion. */}
              <div
                className="rounded-2xl overflow-hidden shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]"
                style={{ background: '#2C2420', color: '#F5EFE8' }}
              >
                {/* Faux browser chrome — traffic-light dots + URL bar.
                    On the dark surface, dots use a desaturated warm
                    tone so they read as "browser controls" without
                    yelling for attention. */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                  </div>
                  <div
                    className="flex-1 ml-3 px-3 py-1 rounded-md text-xs font-mono truncate"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,239,232,0.55)' }}
                  >
                    waytico.com/t/paris-weekend-getaway
                  </div>
                </div>
                {/* Body — quoted prompt + CTA. */}
                <div className="p-6 sm:p-7">
                  <div
                    className="pl-5 italic font-serif text-base leading-relaxed"
                    style={{
                      borderLeft: '2px solid rgba(207,107,57,0.7)',
                      color: 'rgba(245,239,232,0.86)',
                    }}
                  >
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
