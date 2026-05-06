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
        </div>
      </main>
      <Footer />
    </div>
  )
}
