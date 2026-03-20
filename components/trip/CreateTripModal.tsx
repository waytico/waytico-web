"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Plus } from "lucide-react"
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Scout {
  recordId: string;
  title: string;
  status: string;
  tags: string;
  messageCount: number;
  createdAt: string;
}

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoutId?: string;
}

function ScoutSelector({
  onSelectScout,
  onStartNew,
  onNoScouts,
}: {
  onSelectScout: (scoutId: string) => void;
  onStartNew: () => void;
  onNoScouts: () => void;
}) {
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scouts", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        const loaded = data.scouts || [];
        setScouts(loaded);
        if (loaded.length === 0) {
          onNoScouts();
        }
      })
      .catch(() => {
        onNoScouts();
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // If no scouts, parent handles via onNoScouts — don't render selector
  if (scouts.length === 0) return null;

  return (
    <div className="px-6 py-4 space-y-4">
      <p className="text-sm text-gray-600">
        Start from a previous conversation or create a new trip.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          From a scout conversation
        </p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {scouts.map((s) => (
            <button
              key={s.recordId}
              onClick={() => onSelectScout(s.recordId)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 truncate">
                {s.title || "Untitled Scout"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.messageCount} messages
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onStartNew}
          className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Create new trip
        </button>
      </div>
    </div>
  );
}

const WELCOME_MESSAGE = "Hi! Let's plan your fishing trip. Already have an itinerary or booking details? Upload it with the **+** button. Or just tell me where you want to go — I'll help plan everything.";

export function CreateTripModal({ isOpen, onClose, scoutId }: CreateTripModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeScoutId, setActiveScoutId] = useState<string | undefined>(scoutId);
  const [showSelector, setShowSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const ALLOWED_MIMES = [
    'application/pdf', 'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function handleFileSelect(file: File | null) {
    if (!file) return;
    if (!ALLOWED_MIMES.includes(file.type)) {
      alert('Unsupported file type. Use PDF, JPEG, DOCX or XLSX');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large (max 10MB)');
      return;
    }
    setSelectedFile(file);
  }

  function getFileIcon(type: string): string {
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('image/')) return '🖼';
    if (type.includes('wordprocessingml')) return '📝';
    if (type.includes('spreadsheetml')) return '📊';
    return '📎';
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput("");
      setSessionId(undefined);
      setLoading(false);
      setGenerating(false);
      setActiveScoutId(scoutId);
      // Show selector only when opened without scoutId
      setShowSelector(!scoutId);
      setSelectedFile(null);
      setIsParsing(false);
      setIsDragging(false);
    }
  }, [isOpen, scoutId]);

  // Start chat after scoutId is resolved (either passed in or selected)
  useEffect(() => {
    if (isOpen && activeScoutId && messages.length === 0 && !showSelector) {
      sendMessage("Please show me the trip brief from my conversation.");
    }
  }, [isOpen, activeScoutId, showSelector]);

  const handleSelectScout = (selectedScoutId: string) => {
    setActiveScoutId(selectedScoutId);
    setShowSelector(false);
  };

  /** Enter chat mode with welcome message (no API call) */
  const startChat = () => {
    setActiveScoutId(undefined);
    setShowSelector(false);
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  };

  async function sendMessage(text: string) {
    if (!text.trim() && !selectedFile) return;

    const userMsg: Message = { role: "user", content: text || "Process this document" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    if (selectedFile) setIsParsing(true);

    const currentFile = selectedFile;
    setSelectedFile(null);

    try {
      let res: globalThis.Response;

      if (currentFile) {
        const formData = new FormData();
        formData.append("message", text || "Process this document");
        formData.append("file", currentFile);
        if (sessionId) formData.append("sessionId", sessionId);
        if (messages.length === 0 && activeScoutId) formData.append("scoutId", activeScoutId);

        res = await fetch("/api/trip-chat", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/trip-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            scoutId: messages.length === 0 ? activeScoutId : undefined,
          }),
        });
      }

      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || "Sorry, something went wrong.",
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If brief confirmed, generate trip
      if (data.briefConfirmed && data.brief) {
        setGenerating(true);
        try {
          const createRes = await fetch("/api/create-trip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brief: JSON.stringify(data.brief),
              scoutId: activeScoutId,
            }),
          });
          const createData = await createRes.json();
          if (createData.slug) {
            window.location.href = createData.tripUrl || `/trip/${createData.slug}`;
          } else if (createData.error === "trip_limit_reached") {
            setGenerating(false);
            const max = createData.maxActiveTrips ?? "your plan's";
            const current = createData.currentCount ?? max;
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `Your plan allows **${max}** active trip${max === 1 ? "" : "s"}. You currently have **${current}** active. To create a new trip, archive an existing one from the **My Trips** menu, or upgrade your plan.` },
            ]);
          } else {
            setGenerating(false);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Failed to generate trip plan. Please try again." },
            ]);
          }
        } catch {
          setGenerating(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Failed to generate trip plan. Please try again." },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setIsParsing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {generating ? "Generating Your Trip..." : "Plan Your Trip"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scout selector screen */}
        {showSelector && !generating && (
          <ScoutSelector
            onSelectScout={handleSelectScout}
            onStartNew={startChat}
            onNoScouts={startChat}
          />
        )}

        {/* Messages */}
        {!showSelector && (
          <div
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-xl">
                <p className="text-blue-600 font-medium">Drop file here</p>
              </div>
            )}
            {generating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Generating your trip plan...</span>
              </div>
            )}
            {!generating &&
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="ml-1">{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            {isParsing && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2 bg-gray-100 text-gray-900 text-sm">
                  🔄 Parsing document...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!generating && !showSelector && (
          <div className="px-6 py-4 border-t">
            {/* File preview chip */}
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-700">
                  <span>{getFileIcon(selectedFile.type)}</span>
                  <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="ml-1 text-blue-400 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                title="Attach file"
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || (!input.trim() && !selectedFile)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl p-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
