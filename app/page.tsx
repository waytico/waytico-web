import { SignedOut } from '@clerk/nextjs'
import { Sparkles } from 'lucide-react'
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
                Tell us about a tour below — we&apos;ll turn it into a shareable proposal page you can send to clients. No signup needed to try.
              </p>
            </div>
          </SignedOut>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-tight text-balance">
            Your tour in.
            <br />
            Quote page out.
          </h1>
          <ChatFlow />
        </div>
      </main>
      <Footer />
    </div>
  )
}

