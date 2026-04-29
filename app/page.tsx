import { SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-8">
          <SignedOut>
            <div className="inline-flex items-start sm:items-center gap-2 px-4 py-2.5 rounded-full bg-highlight/60 border border-accent/20 text-left">
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm text-foreground/80 leading-snug">
                <span className="font-medium text-foreground">New here?</span>{' '}
                No signup needed to try — see the example below or write your own.
              </p>
            </div>
          </SignedOut>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight text-balance">
              Travel pros:
              <br />
              stop writing proposals in Word.
            </h1>
            <p className="text-lg md:text-xl text-foreground/70 leading-snug max-w-xl mx-auto text-balance">
              One link your client opens — itinerary, prices, your terms, your brand.
            </p>
          </div>
          <ChatFlow />
          <div className="pt-2">
            <Link
              href="/t/paris-weekend-getaway"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-sm font-medium text-foreground/80 hover:text-foreground hover:border-accent transition-colors"
            >
              Or just look — 3 days in Paris
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}


