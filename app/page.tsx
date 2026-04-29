import Link from 'next/link'
import { ArrowRight, ArrowDown } from 'lucide-react'
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

          {/* Example block — shows operator a concrete example of what to type
              and what comes out the other side. The blockquote mirrors the
              textarea above; the pill links to the live demo trip generated
              from a similar prompt. */}
          <div className="pt-2 max-w-2xl mx-auto text-left">
            <p className="text-xs uppercase tracking-wider text-foreground/40 mb-2">
              Example
            </p>
            <blockquote className="text-sm text-foreground/70 italic border-l-2 border-accent/30 pl-3 leading-relaxed">
              &ldquo;3 days in Paris for a couple, late June. Hôtel des Deux Pavillons in
              the Marais. Day 1 Marais and Seine, day 2 Louvre and Saint-Germain
              with a Sainte-Chapelle concert, day 3 Montmartre and a farewell
              brunch. €1,800 total, private transfers included.&rdquo;
            </blockquote>
            <div className="flex flex-col items-center gap-2 mt-4">
              <ArrowDown className="w-4 h-4 text-foreground/40" />
              <Link
                href="/t/paris-weekend-getaway"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity group"
              >
                See the page it makes
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
