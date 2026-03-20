"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { ChatInput } from "@/components/ChatInput"
import { ChatArea } from "@/components/ChatArea"
import { HeroSearch } from "@/components/HeroSearch"
import { ValueProps } from "@/components/ValueProps"
import { Coverage } from "@/components/Coverage"
import { GuestBanner } from "@/components/GuestBanner"
import { LimitBanner } from "@/components/LimitBanner"
import { Sidebar } from "@/components/Sidebar"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { CreateTripModal } from "@/components/trip/CreateTripModal"

interface Message {
  role: "user" | "assistant"
  content: string
}

const exampleQueries = [
  "Halibut in Alaska",
  "Salmon near Vancouver",
  "Deep sea Florida Keys",
  "Fly fishing Montana",
  "Marlin Costa Rica",
]

function HomeContent() {
  const { isSignedIn } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [scoutId, setScoutId] = useState<string | null>(null)
  const [scoutBrief, setScoutBrief] = useState<string | null>(null)
  const [scoutTags, setScoutTags] = useState<string>("")
  const [scoutEntities, setScoutEntities] = useState<string>("")
  const [scoutStatus, setScoutStatus] = useState<string>("active")
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)

  // Trip modal state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false)
  const [tripModalScoutId, setTripModalScoutId] = useState<string | undefined>(undefined)

  // isGuest from API (null = not yet known, use Clerk as initial guess)
  const [isGuestFromApi, setIsGuestFromApi] = useState<boolean | null>(null)
  const isGuest = isGuestFromApi !== null ? isGuestFromApi : !isSignedIn

  // Fetch plan info when auth state changes
  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/plan-info", { method: "POST" })
        .then(res => res.json())
        .then(data => {
          setRemainingMessages(data.remainingMessages ?? null)
          setLimitReached(data.limitReached || false)
          if (data.isGuest !== undefined) {
            setIsGuestFromApi(data.isGuest)
          }
        })
        .catch(() => {})
      // C-07: Restore pending message after registration
      try {
        const pending = localStorage.getItem("bitescout_pending_message")
        if (pending) {
          localStorage.removeItem("bitescout_pending_message")
          setInputValue(pending)
        }
      } catch {}
    } else {
      // Not signed in → definitely guest
      setIsGuestFromApi(true)
    }
  }, [isSignedIn])

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || limitReached) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setHasStartedChat(true)
    setScoutBrief(null)
    setScoutStatus("active")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, sessionId, chatId, scoutId }),
      })

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
      
      if (data.sessionId) setSessionId(data.sessionId)
      if (data.chatId) setChatId(data.chatId)
      if (data.scoutId) setScoutId(data.scoutId)
      if (data.remainingMessages !== null && data.remainingMessages !== undefined) {
        setRemainingMessages(data.remainingMessages)
      }
      if (data.isGuest !== undefined) {
        setIsGuestFromApi(data.isGuest)
      }
      if (data.limitReached) {
        setLimitReached(true)
        // C-07: Save the message so it can be restored after registration
        try { localStorage.setItem("bitescout_pending_message", userMessage) } catch {}
      }

      // Refresh sidebar after first message (new scout appears in list)
      if (!scoutId && data.scoutId) {
        setSidebarRefresh((n) => n + 1)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (query: string) => {
    setInputValue(query)
  }

  const handleNewScout = async () => {
    // Tell backend to complete current active scout
    if (isSignedIn) {
      try {
        await fetch("/api/new-scout", { method: "POST" })
      } catch {
        // Non-critical
      }
    }

    setMessages([])
    setSessionId(null)
    setChatId(null)
    setScoutId(null)
    setScoutBrief(null)
    setScoutTags("")
    setScoutEntities("")
    setScoutStatus("active")
    setHasStartedChat(false)
    setLimitReached(false)
    setSidebarRefresh((n) => n + 1)
  }

  const handleScoutDeleted = (deletedScoutId: string) => {
    if (scoutId === deletedScoutId) {
      setMessages([])
      setSessionId(null)
      setChatId(null)
      setScoutId(null)
      setScoutBrief(null)
      setScoutTags("")
      setScoutEntities("")
      setScoutStatus("active")
      setHasStartedChat(false)
    }
  }

  const handleSelectScout = async (selectedScoutId: string) => {
    setScoutId(selectedScoutId)
    setSessionId(null)
    setChatId(null)
    setHasStartedChat(true)
    setMessages([])
    setScoutBrief(null)
    setScoutTags("")
    setScoutEntities("")
    setScoutStatus("active")
    setIsLoadingMessages(true)

    try {
      const res = await fetch("/api/scout-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoutId: selectedScoutId }),
      })
      const data = await res.json()

      if (data.type === "brief") {
        // Completed/archived scout — show brief card
        setScoutBrief(data.briefUser || data.brief || "")
        setScoutTags(data.tags || "")
        setScoutEntities(data.entities || "")
        setScoutStatus(data.status || "completed")
        setMessages([])
      } else {
        // Active scout — show raw messages
        setScoutBrief(null)
        const msgs: Message[] = (data.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
        setMessages(msgs)
      }
    } catch {
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Open trip modal from ChatArea (with scoutId) or Header (without)
  const handleOpenTripModal = (modalScoutId?: string) => {
    setTripModalScoutId(modalScoutId)
    setIsTripModalOpen(true)
  }

  return (
    <div className={hasStartedChat ? "h-screen flex flex-col" : "min-h-screen flex flex-col"}>
      <div className="shrink-0">
        <Header
          onLogoClick={handleNewScout}
          onCreateTrip={() => handleOpenTripModal()}
        />
      </div>

      <div className={`flex-1 flex${hasStartedChat ? " min-h-0" : ""}`}>
        {/* Sidebar for logged-in users with confirmed account */}
        {isSignedIn && !isGuest && (
          <Sidebar
            activeScoutId={scoutId}
            onSelectScout={handleSelectScout}
            onNewScout={handleNewScout}
            onScoutDeleted={handleScoutDeleted}
            refreshTrigger={sidebarRefresh}
          />
        )}

        {hasStartedChat ? (
          /* Chat mode — sticky input layout */
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 px-4 md:px-6 pt-6 pb-4">
              <div className="max-w-[600px] mx-auto w-full flex-1 flex flex-col min-h-0">
                <ChatArea
                  messages={messages}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  isLoadingMessages={isLoadingMessages}
                  disabled={limitReached}
                  scoutBrief={scoutBrief}
                  scoutTags={scoutTags}
                  scoutEntities={scoutEntities}
                  scoutId={scoutId}
                  onCreateTrip={(sid) => handleOpenTripModal(sid)}
                />

                {/* Remaining messages indicator */}
                {remainingMessages !== null && !limitReached && (
                  <p className="text-xs text-muted-foreground text-center shrink-0 pt-2">
                    {remainingMessages} message{remainingMessages !== 1 ? "s" : ""} remaining today
                  </p>
                )}

                {/* Limit reached banner */}
                {limitReached && (
                  <div className="shrink-0 pt-2">
                    <LimitBanner isGuest={isGuest} />
                  </div>
                )}

                {/* Guest banner - show after first exchange */}
                {isGuest && !limitReached && messages.length >= 2 && (
                  <div className="shrink-0 pt-2">
                    <GuestBanner />
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : (
          /* Hero mode — normal scroll layout */
          <main className="flex-1 min-w-0">
            <section className="relative pt-20 md:pt-28 pb-16 md:pb-20 px-4 md:px-6 bg-gradient-to-br from-[#0B1D3A] via-[#1E3A5F] to-[#145374] overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)" }} />

              <div className="relative max-w-[800px] mx-auto text-center space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-balance leading-tight">
                  From idea to itinerary in one conversation
                </h1>
                <p className="text-lg md:text-xl text-white/70 max-w-[600px] mx-auto">
                  Our AI builds your fishing trip from a curated database of thousands of charters, guides &amp; lodges.
                </p>

                <div className="pt-2">
                  <HeroSearch
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                  />
                </div>

                {/* Example queries as pills */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {exampleQueries.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleExampleClick(query)}
                      className="px-4 py-1.5 rounded-full text-sm text-white/80 bg-white/10 border border-white/15 hover:bg-white/20 hover:text-white transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <ValueProps />
            <Coverage onAskScout={handleExampleClick} />
          </main>
        )}
      </div>

      <div className="shrink-0">
        <Footer />
      </div>

      {/* Trip creation modal */}
      <CreateTripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        scoutId={tripModalScoutId}
      />
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  )
}