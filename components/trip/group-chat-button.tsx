"use client"

import { useState, useCallback } from "react"
import { MessageCircle, X, Copy, ExternalLink, Check } from "lucide-react"

interface GroupChatButtonProps {
  projectId: string
  slug: string
  title: string
  dateRange: string
  tripUrl: string
  chatPlatform?: string | null
  chatLink?: string | null
  isOwner: boolean
}

export function GroupChatButton({
  projectId,
  slug,
  title,
  dateRange,
  tripUrl,
  chatPlatform: initialPlatform,
  chatLink: initialLink,
  isOwner,
}: GroupChatButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [chatPlatform, setChatPlatform] = useState(initialPlatform || null)
  const [chatLink, setChatLink] = useState(initialLink || "")
  const [linkInput, setLinkInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOwner) {
    // Participants see the chat link if it exists
    if (!chatLink) return null
    return (
      <a
        href={chatLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Group Chat</span>
      </a>
    )
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🎣 ${title}\n📅 ${dateRange}\n\nJoin our fishing trip! Details & planning:\n${tripUrl}`
    )
    window.open(`https://wa.me/?text=${text}`, "_blank")
    setShowModal(false)
    // Show link input so owner can paste group link back
    setShowLinkInput(true)
  }

  const handleTelegram = () => {
    // Deep link to create group with BiteScout bot
    const botUsername = "rng_base_bot"
    window.open(
      `https://t.me/${botUsername}?startgroup=trip_${slug}`,
      "_blank"
    )
    setShowModal(false)
    // Bot auto-links group. Poll for update.
    const pollForLink = async (attempts: number) => {
      for (let i = 0; i < attempts; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const res = await fetch(`/api/public/trip/${slug}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.project?.chat_platform === "telegram" && data.project?.chat_link) {
            setChatPlatform("telegram")
            setChatLink(data.project.chat_link)
            return
          }
        } catch {}
      }
      // Fallback: show link input
      setShowLinkInput(true)
    }
    pollForLink(6)
  }

  const handleSaveLink = useCallback(async (platform: string, link: string) => {
    if (!link.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/trips/update-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          chatPlatform: platform,
          chatLink: link.trim(),
        }),
      })
      if (res.ok) {
        setChatPlatform(platform)
        setChatLink(link.trim())
        setShowLinkInput(false)
        setLinkInput("")
      }
    } catch (e) {
      console.error("Failed to save chat link", e)
    } finally {
      setSaving(false)
    }
  }, [projectId])

  const handleRemoveChat = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/trips/update-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          chatPlatform: null,
          chatLink: null,
        }),
      })
      if (res.ok) {
        setChatPlatform(null)
        setChatLink("")
      }
    } catch (e) {
      console.error("Failed to remove chat", e)
    } finally {
      setSaving(false)
    }
  }, [projectId])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [chatLink])

  // ── Chat already linked ──
  if (chatLink) {
    return (
      <div className="relative flex items-center gap-1.5">
        <a
          href={chatLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">
            {chatPlatform === "telegram" ? "Telegram" : "WhatsApp"} Chat
          </span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
        <button
          onClick={handleCopy}
          className="rounded-full p-2 text-offwhite/60 hover:text-offwhite hover:bg-offwhite/10 transition-all"
          title="Copy link"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleRemoveChat}
          disabled={saving}
          className="rounded-full p-2 text-offwhite/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Remove chat link"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Group Chat</span>
      </button>

      {/* Platform selection modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a2332] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-offwhite">Create Group Chat</h3>
              <button onClick={() => setShowModal(false)} className="text-offwhite/50 hover:text-offwhite">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-offwhite/60 mb-5">
              Choose a messenger to create a group chat for your trip participants.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center gap-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 px-4 py-3.5 text-left transition-all hover:bg-[#25D366]/20"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <div className="text-sm font-medium text-offwhite">WhatsApp</div>
                  <div className="text-xs text-offwhite/50">Share trip info, create group manually</div>
                </div>
              </button>
              <button
                onClick={handleTelegram}
                className="w-full flex items-center gap-3 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 px-4 py-3.5 text-left transition-all hover:bg-[#229ED9]/20"
              >
                <span className="text-2xl">✈️</span>
                <div>
                  <div className="text-sm font-medium text-offwhite">Telegram</div>
                  <div className="text-xs text-offwhite/50">Create group with BiteScout bot</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link input modal (after creating group) */}
      {showLinkInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-[#1a2332] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-offwhite">Link Your Group</h3>
              <button onClick={() => setShowLinkInput(false)} className="text-offwhite/50 hover:text-offwhite">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-offwhite/60 mb-4">
              Paste the invite link to your group chat so participants can find it on the trip page.
            </p>
            <input
              type="url"
              placeholder="https://chat.whatsapp.com/... or https://t.me/..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-white/20 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowLinkInput(false)}
                className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-offwhite/70 hover:bg-white/10 transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  const platform = linkInput.includes("t.me") ? "telegram" : "whatsapp"
                  handleSaveLink(platform, linkInput)
                }}
                disabled={!linkInput.trim() || saving}
                className="flex-1 rounded-xl bg-[#4A90D9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5A9FE8] transition-all disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
