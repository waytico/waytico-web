'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Pause, Play, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './demo-modal.module.css'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Called when user clicks "Make my own quote" — host page can use this
   * to focus the chat textarea so the visitor lands ready to type.
   */
  onMakeMyOwn?: () => void
}

type Phase = 'closed' | 'opening' | 'playing' | 'ended' | 'closing'

const HOME_TEXT_LINES = [
  'Paris, 2 people, from June 28',
  'Day 1 — Marais and Seine',
  'Day 2 — Louvre and Saint-Germain',
  'Day 3 — Montmartre and farewell brunch',
  'Hôtel des Deux Pavillons',
]
const HOME_TEXT_FULL = HOME_TEXT_LINES.join('\n')
const PRICE_FINAL = '1,800'

/**
 * Home demo modal — single-flow product walkthrough.
 *
 * 21.5s animation timeline (phases 1-5) then end-state with controls.
 * Most timing is CSS @keyframes with `animation-delay` measured from when
 * `.playing` is added; JS only drives state machine, JS-typing for the two
 * typewriter blocks (home textarea, price overlay), and Skip/Replay/close.
 */
export default function DemoModal({ isOpen, onClose, onMakeMyOwn }: DemoModalProps) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('closed')
  const [paused, setPaused] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const [typedHome, setTypedHome] = useState('')
  const [typedPrice, setTypedPrice] = useState('')

  // Track whether we already opened to avoid re-running open animation if
  // parent re-renders with the same isOpen=true.
  const openedRef = useRef(false)

  // Wall-clock timestamps used to make all JS timers pause-aware. CSS
  // animations are paused via `animation-play-state` on the .paused class;
  // JS timers (overall 21.5s, price typewriter, home typewriter) recompute
  // their `setTimeout` delays from `playStartRef` so a pause/resume slides
  // the whole timeline forward by the pause duration.
  const playStartRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open coordination
  useEffect(() => {
    if (isOpen && !openedRef.current) {
      openedRef.current = true
      setPhase('opening')
      const t = setTimeout(() => setPhase('playing'), 220)
      return () => clearTimeout(t)
    }
    if (!isOpen && openedRef.current) {
      openedRef.current = false
      setPhase('closed')
      setPlayKey(0)
      setTypedHome('')
      setTypedPrice('')
    }
  }, [isOpen])

  // 21.5s playing → ended timer (pause-aware via playStartRef)
  useEffect(() => {
    if (phase !== 'playing' || paused) return
    if (playStartRef.current === null) {
      playStartRef.current = Date.now()
    }
    const elapsed = Date.now() - playStartRef.current
    const remaining = Math.max(0, 22000 - elapsed)
    const t = setTimeout(() => setPhase('ended'), remaining)
    return () => clearTimeout(t)
  }, [phase, paused, playKey])

  // Reset playStart whenever we leave playing (close, ended, replay re-mount)
  useEffect(() => {
    if (phase !== 'playing') {
      playStartRef.current = null
      pausedAtRef.current = null
    }
  }, [phase, playKey])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Body scroll lock while open
  useEffect(() => {
    if (!isOpen) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [isOpen])

  // Phase-1 typewriter (home textarea). Resumes from current `typedHome`
  // length on unpause — JS-driven so pause is just a clean cancel.
  useEffect(() => {
    if (phase !== 'playing' || paused) {
      if (phase !== 'playing') setTypedHome('')
      return
    }
    let cancelled = false
    let chars = typedHome.length
    const tick = () => {
      if (cancelled || chars >= HOME_TEXT_FULL.length) return
      chars++
      setTypedHome(HOME_TEXT_FULL.slice(0, chars))
      const next = HOME_TEXT_FULL[chars - 1] === '\n' ? 150 : 24
      setTimeout(tick, next)
    }
    // 200ms initial pause only on first start (typedHome empty), zero on resume
    const initialDelay = chars === 0 ? 200 : 0
    const start = setTimeout(tick, initialDelay)
    return () => {
      cancelled = true
      clearTimeout(start)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, playKey])

  // Phase-4 price typewriter — fires at absolute offsets from `playStartRef`.
  // Pause/resume recomputes offsets so price types at the right moment
  // relative to the rest of the (also-paused) animation.
  useEffect(() => {
    if (phase !== 'playing' || paused) {
      if (phase !== 'playing') setTypedPrice('')
      return
    }
    if (playStartRef.current === null) return
    const targets: Array<[number, string]> = [
      [16500, '1'],
      [16850, '18'],
      [17200, '180'],
      [17550, PRICE_FINAL],
    ]
    const elapsed = Date.now() - playStartRef.current
    // Snap any past targets immediately (handles late resume)
    const passed = targets.filter(([t]) => t <= elapsed)
    if (passed.length) setTypedPrice(passed[passed.length - 1][1])
    const future = targets.filter(([t]) => t > elapsed)
    const timers = future.map(([t, val]) =>
      setTimeout(() => setTypedPrice(val), t - elapsed),
    )
    return () => timers.forEach(clearTimeout)
  }, [phase, paused, playKey])

  function handleClose() {
    setPhase('closing')
    setTimeout(() => {
      setPhase('closed')
      setPlayKey(0)
      setTypedHome('')
      setTypedPrice('')
      setPaused(false)
      openedRef.current = false
      onClose()
    }, 200)
  }

  function handleSkip() {
    // Snap all final-state values, jump to ended
    setTypedHome(HOME_TEXT_FULL)
    setTypedPrice(PRICE_FINAL)
    setPaused(false)
    setPhase('ended')
  }

  function handleReplay() {
    setTypedHome('')
    setTypedPrice('')
    setPaused(false)
    pausedAtRef.current = null
    playStartRef.current = null
    setPlayKey((k) => k + 1)
    setPhase('playing')
  }

  function togglePause() {
    if (phase !== 'playing') return
    setPaused((prev) => {
      const next = !prev
      if (next) {
        // Pausing — record when, so resume can shift the timeline forward
        pausedAtRef.current = Date.now()
      } else if (
        pausedAtRef.current !== null &&
        playStartRef.current !== null
      ) {
        // Resuming — slide playStart by the pause duration so all elapsed
        // calculations remain accurate.
        playStartRef.current += Date.now() - pausedAtRef.current
        pausedAtRef.current = null
      }
      return next
    })
  }

  function handleMakeMyOwn() {
    onMakeMyOwn?.()
    handleClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose()
  }

  if (!mounted || (!isOpen && phase === 'closed')) return null

  const stageClass = cn(
    styles.stage,
    phase === 'playing' && styles.playing,
    phase === 'ended' && styles.ended,
    paused && styles.paused,
  )
  const modalBoxClass = cn(
    styles.modalBox,
    phase === 'playing' && styles.playing,
    phase === 'ended' && styles.ended,
  )

  return createPortal(
    <div
      className={cn(styles.overlay, phase === 'closing' && styles.closing)}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Product demo"
    >
      {/* Re-mount the box on Replay so all CSS animations restart together */}
      <div key={playKey} className={modalBoxClass}>
        <button
          type="button"
          onClick={handleClose}
          className={styles.closeBtn}
          aria-label="Close demo"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={togglePause}
          disabled={phase !== 'playing'}
          className={styles.pauseBtn}
          aria-label={paused ? 'Resume demo' : 'Pause demo'}
        >
          {paused ? (
            <Play className="w-4 h-4 fill-current" strokeWidth={0} />
          ) : (
            <Pause className="w-4 h-4 fill-current" strokeWidth={0} />
          )}
        </button>
        <button type="button" onClick={handleSkip} className={styles.skipBtn}>
          Skip →
        </button>

        {/* Stage = top region of modal (chrome + content viewport). Caption,
            end controls, and progress bar live OUTSIDE so they never overlap
            screenshot content. */}
        <div className={stageClass}>
          {/* Browser chrome (phases 1-4 desktop) */}
          <div className={styles.browserChrome}>
            <div className={styles.dots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <div className={styles.urlBar}>
              <span className={cn(styles.urlText, styles.urlTextHome)}>
                waytico.com
              </span>
              <span className={cn(styles.urlText, styles.urlTextTrip)}>
                waytico.com/t/paris-weekend-getaway
              </span>
            </div>
          </div>

          {/* Phase 1+2: home mockup (real screenshot + typed-text overlay).
              The Create-quote pill in the screenshot stays as is (greyed
              disabled state) — the cursor lands on it and a ripple sells
              the click. No HTML pill overlay. */}
          <div className={styles.homeMockup}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/demo-modal/home-page.jpg"
              className={styles.homeBase}
              alt=""
            />
            <span className={styles.typedText}>{typedHome}</span>
          </div>
          <CursorIcon className={styles.cursorPhase1} />
          <span className={styles.clickRipplePhase1} />

          {/* Phase 2: spinner */}
          <div className={styles.spinner}>
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerLabel}>Generating…</div>
          </div>

          {/* Phase 3-4: trip page */}
          <div className={styles.tripPage}>
            <div className={styles.tripScrollWrap}>
              <div className={styles.tripScroll}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo-modal/desktop-page.jpg"
                  className={styles.tripBase}
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo-modal/day-1-photo.jpg"
                  className={cn(styles.dayPhoto, styles.day1Photo)}
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo-modal/day-2-photo.jpg"
                  className={cn(styles.dayPhoto, styles.day2Photo)}
                  alt=""
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/demo-modal/day-3-photo.jpg"
                  className={cn(styles.dayPhoto, styles.day3Photo)}
                  alt=""
                />
                <span className={styles.priceOverlay}>
                  <span className={styles.priceText}>{typedPrice}</span>
                </span>
              </div>
            </div>
            {/* Sticky strip — first 42px of the screenshot fixed on top */}
            <div className={styles.tripStickyStrip} />
            {/* Phase-4 cursor + ripples (over .tripPage so they don't scroll) */}
            <CursorIcon className={styles.cursorPhase4} />
            <span className={styles.clickRipplePhase4Price} />
            <span className={styles.clickRipplePhase4Share} />
          </div>

          {/* Phase 5: phone */}
          <div className={styles.phoneFrame}>
            <div className={styles.phoneScreen}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/demo-modal/phone-page-screenshot.jpg"
                className={styles.phoneScreenshot}
                alt=""
              />
            </div>
          </div>
        </div>

        {/* Caption row — outside stage so it never overlaps screenshot footer */}
        <div className={styles.captionRow}>
          <div className={cn(styles.caption, styles.captionDescribe)}>
            Describe the trip
          </div>
          <div className={cn(styles.caption, styles.captionMagic)}>
            Magic! A quote webpage!
          </div>
          <div className={cn(styles.caption, styles.captionDetails)}>
            Add the details
          </div>
          <div className={cn(styles.caption, styles.captionClient)}>
            Minutes later — your client opens it
          </div>
        </div>

        {/* End-state controls — replace the caption row when ended */}
        <div className={styles.endControls}>
          <button
            type="button"
            onClick={handleReplay}
            className={styles.watchAgainBtn}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Watch again
          </button>
          <button
            type="button"
            onClick={handleMakeMyOwn}
            className={styles.ctaBtn}
          >
            Make my own quote
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar at the very bottom of the modal */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ----- Inline cursor SVG (used for phase-1 and phase-4 cursors) ----- */
function CursorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 2L2 17L6 13L9 19L11.5 18L8.5 12L14 12L2 2Z"
        fill="#FFFFFE"
        stroke="#2C2420"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
