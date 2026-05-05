import type { Metadata } from 'next'
import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'
import HomeDemoModal from '@/components/home-demo-modal'

export const metadata: Metadata = {
  title: 'Demo — Waytico',
  robots: { index: false, follow: false },
}

/**
 * Staging copy of the home page with the demo modal trigger in place of the
 * subtitle/Example block. Trigger is shown to all visitors here (signed-out
 * AND signed-in) so we can test from a logged-in account too.
 *
 * Once approved, the diff lands in `app/page.tsx` wrapped in <SignedOut>
 * and this directory is removed.
 */
export default function DevHome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.1] text-balance">
            The quote tool for travel pros.
          </h1>
          <HomeDemoModal />
          <ChatFlow />
        </div>
      </main>
      <Footer />
    </div>
  )
}
