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
  '3 days in Paris, late June.',
  'Day 1 Marais and Seine,',
  'Day 2 Louvre and Saint-Germain,',
  'Day 3 Montmartre, farewell brunch.',
  'Hôtel des Deux Pavillons.',
]
const HOME_TEXT_FULL = HOME_TEXT_LINES.join('\n')

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

  // Phase-1 overlays (typed text, cursor, ripple) are positioned in JS
  // from the home image's actual rendered rect. CSS-only attempts at
  // aspect-fit + percentages were brittle across viewports (collapsed
  // to 0×0 or shifted with gutters). ResizeObserver gives us the truth.
  const homeMockupRef = useRef<HTMLDivElement>(null)
  const homeImgRef = useRef<HTMLImageElement>(null)
  const [homeImgRect, setHomeImgRect] = useState({
    left: 0, top: 0, width: 0, height: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Measure home image rect inside the mockup so phase-1 overlays
  // (typed text, cursor, ripple) can be positioned in absolute pixels.
  // Re-measures on viewport resize and on image load.
  useEffect(() => {
    if (!isOpen) return
    const img = homeImgRef.current
    const mockup = homeMockupRef.current
    if (!img || !mockup) return

    const update = () => {
      const ir = img.getBoundingClientRect()
      const mr = mockup.getBoundingClientRect()
      if (ir.width === 0 || ir.height === 0) return
      setHomeImgRect({
        left: ir.left - mr.left,
        top: ir.top - mr.top,
        width: ir.width,
        height: ir.height,
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(img)
    ro.observe(mockup)
    img.addEventListener('load', update)
    return () => {
      ro.disconnect()
      img.removeEventListener('load', update)
    }
  }, [isOpen, mounted])

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
  function handleClose() {
    setPhase('closing')
    setTimeout(() => {
      setPhase('closed')
      setPlayKey(0)
      setTypedHome('')
      setPaused(false)
      openedRef.current = false
      onClose()
    }, 200)
  }

  function handleSkip() {
    // Snap all final-state values, jump to ended
    setTypedHome(HOME_TEXT_FULL)
    setPaused(false)
    setPhase('ended')
  }

  function handleReplay() {
    setTypedHome('')
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
          {/* Editorial captions — narrator's указка. Each caption sits NEAR
              the action of its phase, not in a fixed corner. Same typography
              throughout (Cormorant numerals + thin rule + italic title);
              only position and colour change. */}
          <div className={cn(styles.cap, styles.capPh1)}>
            <div className={styles.capNum}>01</div>
            <div className={styles.capRule} />
            <div className={styles.capTitle}>Describe<br />the trip</div>
          </div>
          <div className={cn(styles.cap, styles.capPh2)}>
            <div className={styles.capNum}>02</div>
            <div className={styles.capRule} />
            <div className={styles.capTitle}>Building<br />the page</div>
          </div>
          <div className={cn(styles.cap, styles.capPh3)}>
            <div className={styles.capNum}>03</div>
            <div className={styles.capRule} />
            <div className={styles.capTitle}>Page appears</div>
          </div>
          <div className={cn(styles.cap, styles.capPh4)}>
            <div className={styles.capNum}>04</div>
            <div className={styles.capRule} />
            <div className={styles.capTitle}>Add<br />the details</div>
          </div>
          <div className={cn(styles.cap, styles.capPh5)}>
            <div className={styles.capNum}>05</div>
            <div className={styles.capRule} />
            <div className={styles.capTitle}>Client<br />opens it</div>
          </div>

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

          {/* Phase 1+2: home mockup. Image renders at its natural fit;
              JS measures its bounding rect (homeImgRect) so the typed-
              text overlay, cursor, and ripple can be positioned in
              absolute pixels relative to the actual rendered image.
              Coordinates were measured from /demo-modal/home-page.jpg
              (1999×1524 source):
                placeholder text   ≈ 26% / 30%   (top-left of overlay)
                placeholder area   ≈ 48% / 14%   (width / height)
                pill click centre  ≈ 69% / 54%   (Create-quote button)
                cursor idle        ≈ 50% / 75%   (below textarea, in body)
              These differ from the trip-page coords because home is a
              different layout — the textarea sits lower and the pill is
              on the right side. */}
          <div ref={homeMockupRef} className={styles.homeMockup}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={homeImgRef}
              src="/demo-modal/home-page.jpg"
              className={styles.homeBase}
              width={1999}
              height={1524}
              alt=""
            />
            <span
              className={styles.typedText}
              style={{
                // Placeholder area in home-page.jpg (now painted out):
                // x=517/1999=25.86%, y=445/1524=29.2%, plus generous
                // height for the 5 typed lines.
                left: `${homeImgRect.left + homeImgRect.width * 0.259}px`,
                top: `${homeImgRect.top + homeImgRect.height * 0.292}px`,
                width: `${homeImgRect.width * 0.49}px`,
                height: `${homeImgRect.height * 0.20}px`,
              }}
            >
              {typedHome}
            </span>
            <CursorIcon
              className={styles.cursorPhase1}
              style={
                {
                  // Idle: lower body of the page (between textarea and
                  // footer) — neutral resting position before the click.
                  '--cursor-start-x': `${homeImgRect.left + homeImgRect.width * 0.5}px`,
                  '--cursor-start-y': `${homeImgRect.top + homeImgRect.height * 0.75}px`,
                  // Target: centre of the Create-quote pill in the
                  // screenshot (right side of the textarea card).
                  '--cursor-target-x': `${homeImgRect.left + homeImgRect.width * 0.69}px`,
                  '--cursor-target-y': `${homeImgRect.top + homeImgRect.height * 0.54}px`,
                } as React.CSSProperties
              }
            />
            <span
              className={styles.clickRipplePhase1}
              style={{
                left: `${homeImgRect.left + homeImgRect.width * 0.69}px`,
                top: `${homeImgRect.top + homeImgRect.height * 0.54}px`,
              }}
            />
          </div>

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
                  src="/demo-modal/hero-photo.jpg"
                  className={styles.heroPhoto}
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
              </div>
            </div>
            {/* Sticky strip — first 42px of the screenshot fixed on top */}
            <div className={styles.tripStickyStrip} />
            {/* Phase-4 cursor — travels to Share pill in sticky strip */}
            <CursorIcon className={styles.cursorPhase4} />
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
function CursorIcon({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
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
