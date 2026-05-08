import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'

type SearchParams = {
  clientId?: string
  clientName?: string
  new?: string
}

export default function Home({ searchParams }: { searchParams?: SearchParams }) {
  // Signed-in operators land on /dashboard. Create-intent paths
  // (?clientId=..., ?new=1) keep / accessible — used by dashboard
  // empty-state CTA and by chat-flow start-over.
  const { userId } = auth()
  const isCreateIntent = !!searchParams?.clientId || searchParams?.new === '1'
  if (userId && !isCreateIntent) {
    redirect('/dashboard')
  }

  const clientId = searchParams?.clientId
  const clientLabel = searchParams?.clientName

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
          <ChatFlow prefilledClientId={clientId} prefilledClientLabel={clientLabel} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
