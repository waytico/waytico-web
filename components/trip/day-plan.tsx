"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import { Bot, CheckCircle2, AlertCircle, XCircle, Waves, Coffee, Plane, Plus, Calendar, Loader2, BedDouble, ExternalLink, Star } from "lucide-react"
import type { ReactNode } from "react"
import type { DayPlanTask, DayPlanDay, AccommodationInfo } from "@/lib/trip-helpers"

interface DayPlanProps {
  days: DayPlanDay[]
  dayPhotos?: ({ url: string; description?: string } | null)[]
  isOwner?: boolean
  isParticipant?: boolean
  projectId?: string
  onAskBiteScout: (context: string) => void
  onTaskToggle?: (taskId: string, currentStatus: string) => Promise<void>
  onTaskDeadlineUpdate?: (taskId: string, deadline: string | null) => Promise<void>
  onTaskCreate?: (dayNumber: number, title: string, deadline: string | null) => Promise<void>
}

const typeConfig: Record<string, { icon: ReactNode; accentBorder: string; accentDot: string; bg: string; label: string; labelColor: string }> = {
  offshore: {
    icon: <Waves className="h-4 w-4" />,
    accentBorder: "border-l-[#1A3B6E]",
    accentDot: "bg-[#1A3B6E]",
    bg: "bg-card",
    label: "Offshore",
    labelColor: "text-[#1A3B6E]",
  },
  rest: {
    icon: <Coffee className="h-4 w-4" />,
    accentBorder: "border-l-sand",
    accentDot: "bg-sand",
    bg: "bg-card",
    label: "Rest Day",
    labelColor: "text-[#A68B6B]",
  },
  travel: {
    icon: <Plane className="h-4 w-4" />,
    accentBorder: "border-l-muted-foreground/40",
    accentDot: "bg-muted-foreground/50",
    bg: "bg-card",
    label: "Travel",
    labelColor: "text-muted-foreground",
  },
}

const taskStatusConfig = {
  done: { icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-seafoam" />, textClass: "text-muted-foreground line-through" },
  needs_decision: { icon: <AlertCircle className="h-4 w-4 shrink-0 text-coral" />, textClass: "text-foreground font-medium" },
  blocked: { icon: <XCircle className="h-4 w-4 shrink-0 text-coral/60" />, textClass: "text-foreground" },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr.split("T")[0] + "T12:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/* ── Task Item ── */

function TaskItem({
  task,
  canToggle,
  canEditDeadline,
  onToggle,
  onDeadlineUpdate,
}: {
  task: DayPlanTask
  canToggle: boolean
  canEditDeadline: boolean
  onToggle?: () => Promise<void>
  onDeadlineUpdate?: (deadline: string | null) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const taskConfig = taskStatusConfig[task.status]

  const handleToggle = async () => {
    if (!canToggle || !onToggle || loading) return
    setLoading(true)
    try {
      await onToggle()
    } finally {
      setLoading(false)
    }
  }

  const handleDeadlineSave = async (value: string) => {
    setEditingDeadline(false)
    if (!onDeadlineUpdate) return
    const newDeadline = value || null
    if (newDeadline !== task.deadline?.split("T")[0]) {
      setLoading(true)
      try {
        await onDeadlineUpdate(newDeadline)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex items-start gap-2.5 group">
      {canToggle ? (
        <button
          onClick={handleToggle}
          disabled={loading}
          className="shrink-0 mt-0.5 transition-transform hover:scale-110 disabled:opacity-50"
          aria-label={task.status === "done" ? "Mark as pending" : "Mark as done"}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            taskConfig.icon
          )}
        </button>
      ) : (
        <span className="shrink-0 mt-0.5">{taskConfig.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug ${taskConfig.textClass}`}>
          {task.text}
        </span>
        {/* Deadline display/edit */}
        {canEditDeadline ? (
          <div className="mt-1">
            {editingDeadline ? (
              <input
                type="date"
                defaultValue={task.deadline?.split("T")[0] || ""}
                autoFocus
                onBlur={(e) => handleDeadlineSave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDeadlineSave((e.target as HTMLInputElement).value)
                  if (e.key === "Escape") setEditingDeadline(false)
                }}
                className="text-xs bg-transparent border border-border rounded px-2 py-0.5 text-muted-foreground focus:outline-none focus:border-seafoam"
              />
            ) : (
              <button
                onClick={() => setEditingDeadline(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-seafoam transition-colors"
              >
                <Calendar className="h-3 w-3" />
                {task.deadline ? formatDeadline(task.deadline) : "Set deadline"}
              </button>
            )}
          </div>
        ) : task.deadline ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
            <Calendar className="h-3 w-3" />
            {formatDeadline(task.deadline)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── Add Task Form ── */

function AddTaskForm({
  onSubmit,
}: {
  onSubmit: (title: string, deadline: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || loading) return
    setLoading(true)
    try {
      await onSubmit(title.trim(), deadline || null)
      setTitle("")
      setDeadline("")
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50 hover:text-seafoam transition-colors mt-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit()
          if (e.key === "Escape") setOpen(false)
        }}
        className="w-full text-sm bg-transparent border-b border-border/50 pb-1 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-seafoam"
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="text-xs bg-transparent border border-border/50 rounded px-2 py-1 text-muted-foreground focus:outline-none focus:border-seafoam"
        />
        <div className="flex-1" />
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="text-xs font-semibold text-offwhite bg-seafoam hover:bg-seafoam-light disabled:opacity-50 rounded-md px-3 py-1 transition-colors flex items-center gap-1"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Add
        </button>
      </div>
    </div>
  )
}

/* ── Photo Carousel ── */

function PhotoCarousel({ photos }: { photos: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const count = Math.min(photos.length, 5)
  const visiblePhotos = photos.slice(0, count)

  useEffect(() => {
    const container = containerRef.current
    if (!container || count <= 1) return

    const imgs = Array.from(container.children) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = imgs.indexOf(entry.target as HTMLElement)
            if (idx >= 0) setActiveIndex(idx)
          }
        }
      },
      { root: container, threshold: 0.5 }
    )

    imgs.forEach((img) => observer.observe(img))
    return () => observer.disconnect()
  }, [count])

  const scrollTo = (index: number) => {
    const container = containerRef.current
    if (!container) return
    const child = container.children[index] as HTMLElement
    child?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }

  const scrollBy = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(count - 1, activeIndex + dir))
    scrollTo(next)
  }

  return (
    <div className="relative mt-2 rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
      <div
        ref={containerRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {visiblePhotos.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Hotel photo ${i + 1}`}
            loading="lazy"
            className="w-full h-full object-cover shrink-0 snap-center"
          />
        ))}
      </div>
      {count > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              onClick={() => scrollBy(-1)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors hidden md:block"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {activeIndex < count - 1 && (
            <button
              onClick={() => scrollBy(1)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors hidden md:block"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {visiblePhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === activeIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        [class*="snap-x"]::-webkit-scrollbar { display: none; }
      ` }} />
    </div>
  )
}

/* ── Accommodation helpers ── */

function getAccommodationName(acc: string | AccommodationInfo | null): string | null {
  if (!acc) return null
  if (typeof acc === "string") return acc
  return acc.name || null
}

function isFirstNightAtHotel(days: DayPlanDay[], dayIndex: number): boolean {
  const currentName = getAccommodationName(days[dayIndex].accommodation)
  if (!currentName) return false
  if (dayIndex === 0) return true
  const prevName = getAccommodationName(days[dayIndex - 1].accommodation)
  return currentName !== prevName
}

/* ── Main DayPlan ── */

export function DayPlan({
  days,
  dayPhotos,
  isOwner = false,
  isParticipant = false,
  projectId,
  onAskBiteScout,
  onTaskToggle,
  onTaskDeadlineUpdate,
  onTaskCreate,
}: DayPlanProps) {
  const canInteract = isOwner || isParticipant
  const lastDayNum = days.length > 0 ? Math.max(...days.map(d => d.day)) : 0

  return (
    <section className="bg-offwhite">
      <div className="px-6 py-14 md:px-10 md:py-20 max-w-3xl mx-auto">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-coral mb-3">
          Itinerary
        </p>
        <h2 className="font-serif text-[28px] font-semibold leading-[1.23] text-navy text-center md:text-[42px] mb-10 md:mb-14">
          Day by Day
        </h2>

        <div className="space-y-5">
          {days.map((day) => {
            const config = typeConfig[day.type] || typeConfig.offshore
            return (
              <div
                key={day.day}
                className={`rounded-xl border border-border ${config.accentBorder} border-l-4 ${config.bg} p-5 shadow-sm transition-shadow hover:shadow-md md:p-6 overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${config.labelColor}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {day.weekday}, {formatDate(day.date)}
                      </span>
                    </div>
                    <h3 className="font-serif text-[20px] font-semibold leading-[1.23] text-navy uppercase md:text-[28px]">
                      <span className="text-coral/60 mr-1">{String(day.day).padStart(2, '0')}.</span> {day.title}
                    </h3>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.accentDot}`}>
                    <span className={`text-xs font-bold ${day.type === 'offshore' ? 'text-offwhite' : day.type === 'rest' ? 'text-navy' : 'text-offwhite'}`}>
                      D{day.day}
                    </span>
                  </div>
                </div>

                <p className="mt-3 font-serif text-[16px] font-light leading-[1.55] text-foreground/70 md:text-[20px]">
                  {day.description}
                </p>

                {/* Day scenery photo */}
                {(() => {
                  const dayIdx = days.indexOf(day);
                  const photo = dayPhotos?.[dayIdx];
                  if (!photo) return null;
                  const isEven = dayIdx % 2 === 0;
                  return (
                    <div className={`mt-4 ${isEven ? "md:float-right md:ml-5" : "md:float-left md:mr-5"} md:w-[48%] w-full`}>
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <Image
                          src={photo.url}
                          alt={photo.description || day.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Accommodation block — skip on last day (departure) */}
                {day.day !== lastDayNum && (() => {
                  const acc = day.accommodation;
                  const isObj = acc && typeof acc === "object";
                  const name = isObj ? (acc as AccommodationInfo).name : (typeof acc === "string" ? acc : null);
                  const info = isObj ? acc as AccommodationInfo : null;
                  const dayIdx = days.indexOf(day);
                  const showFull = isFirstNightAtHotel(days, dayIdx);

                  return (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-background/60 px-4 py-3">
                      <BedDouble className="h-4 w-4 shrink-0 mt-0.5 text-navy/50" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">
                          Accommodation
                        </p>
                        {name ? (
                          showFull ? (
                            <div>
                              <p className="text-sm font-medium text-navy">{name}</p>
                              {info ? (
                                <>
                                  {info.rating && (
                                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                      {info.rating}
                                    </span>
                                  )}
                                  {info.photos && info.photos.length > 0 && (
                                    <PhotoCarousel photos={info.photos} />
                                  )}
                                  {info.snippet && (
                                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{info.snippet}</p>
                                  )}
                                  {info.url && (
                                    <a
                                      href={info.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-seafoam hover:text-seafoam-light mt-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Website
                                    </a>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground/40 italic mt-0.5">Details loading shortly</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-navy">{name}</p>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic">TBD</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {day.activities.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {day.activities.map((activity, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral/50" />
                        {activity}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => onAskBiteScout(`Tell me about Day ${day.day} (${day.title}). What should we know?`)}
                  className="mt-4 flex items-center gap-2 text-[14px] font-medium text-[#ff8562] transition-colors hover:opacity-70"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Ask BiteScout about this day
                </button>

                {/* Tasks section — visible to owner and participants */}
                {canInteract && day.tasks.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {isOwner ? "Tasks" : "Trip Tasks"}
                    </p>
                    <div className="space-y-2.5">
                      {day.tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          canToggle={isOwner}
                          canEditDeadline={isOwner}
                          onToggle={
                            onTaskToggle
                              ? () => onTaskToggle(task.id, task.originalStatus)
                              : undefined
                          }
                          onDeadlineUpdate={
                            onTaskDeadlineUpdate
                              ? (deadline) => onTaskDeadlineUpdate(task.id, deadline)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    {/* Add task — owner only */}
                    {isOwner && onTaskCreate && (
                      <AddTaskForm
                        onSubmit={(title, deadline) => onTaskCreate(day.day, title, deadline)}
                      />
                    )}
                  </div>
                )}

                {/* Show add task even when no existing tasks — owner only */}
                {isOwner && day.tasks.length === 0 && onTaskCreate && (
                  <div className="mt-5 border-t border-border pt-4">
                    <AddTaskForm
                      onSubmit={(title, deadline) => onTaskCreate(day.day, title, deadline)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
