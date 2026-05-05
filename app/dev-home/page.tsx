import type { Metadata } from 'next'
import { SignedOut } from '@clerk/nextjs'
import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'
import HomeStoryboard from '@/components/home-storyboard'

// Staging route — keep out of search index until storyboard is approved
// and merged into app/page.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DevHome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.1] text-balance">
            The quote tool for travel pros.
          </h1>

          <SignedOut>
            <HomeStoryboard />
          </SignedOut>

          <ChatFlow />
        </div>
      </main>
      <Footer />
    </div>
  )
}
