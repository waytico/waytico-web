import ChatFlow from '@/components/chat-flow'
import Footer from '@/components/footer'
import Header from '@/components/header'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-8">
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
