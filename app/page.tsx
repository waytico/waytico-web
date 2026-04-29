import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
            Travel pros: stop writing
            <br className="hidden sm:block" />
            {' '}proposals in Word.
          </h1>
          <p className="text-base md:text-lg text-foreground/70 leading-relaxed text-balance max-w-xl mx-auto">
            One link your client opens — itinerary, prices, your terms, your brand.
            No signup to try.
          </p>
          <ChatFlow />

          {/* ── Example block ─────────────────────────────────────
              Visually distinct from the textarea card above so visitors
              don't read this as a second input field. No card surface,
              no rounded panel — just a soft accent rule on the left and
              an "Example" label on top. The prompt copy is rendered as
              real prose (italic serif), not monospace, to read as
              quoted-text rather than fillable code. */}
          <div className="pt-6 max-w-2xl mx-auto text-left">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/40">
                Example — what you type → the page it makes
              </p>
            </div>
            <div className="border-l-2 border-accent/60 pl-5 italic font-serif text-foreground/80 text-base leading-relaxed">
              <p>3 days in Paris for a couple, late June. Hôtel des Deux Pavillons in the Marais.</p>
              <p>Day 1 Marais and Seine,</p>
              <p>Day 2 Louvre and Saint-Germain with a Sainte-Chapelle concert,</p>
              <p>Day 3 Montmartre and a farewell brunch.</p>
              <p>€1,800 total, private transfers included.</p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
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
      </main>
      <Footer />
    </div>
  )
}
