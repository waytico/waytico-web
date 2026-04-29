import Link from 'next/link'
import { ArrowDown } from 'lucide-react'
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

          {/* Example block — concrete prompt → live trip page. Layout
              mirrors the chat-flow above: prompt body left-aligned in a
              card, action pill right-aligned at the bottom. The pill
              copies the visual treatment of the "Create quote →" button
              inside ChatFlow so visitors read both as the same kind of
              CTA. */}
          <div className="pt-2 max-w-2xl mx-auto text-left">
            <p className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
              Example
            </p>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-foreground/75 leading-relaxed font-mono whitespace-pre-line">
{`3 days in Paris for a couple, late June. Hôtel des Deux Pavillons in the Marais.
Day 1 Marais and Seine,
Day 2 Louvre and Saint-Germain with a Sainte-Chapelle concert,
Day 3 Montmartre and a farewell brunch.
€1,800 total, private transfers included.`}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDown className="w-4 h-4" />
                <span>Becomes the page →</span>
              </span>
              <Link
                href="/t/paris-weekend-getaway"
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold inline-flex items-center gap-2 transition-colors"
              >
                See the page it makes →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
