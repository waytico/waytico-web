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
          <div className="pt-1 flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-foreground/50">Or just look:</span>
            <Link
              href="/t/paris-weekend-getaway"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-accent/30 text-sm text-accent hover:bg-accent/5 hover:border-accent/50 transition-colors group"
            >
              3 days in Paris
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
