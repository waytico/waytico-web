'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

/**
 * Desktop-only 4-frame storyboard for signed-out home.
 *
 * Default state (no `playing`) = final frame of every animation, so users on
 * slow connections / reduced motion / no-JS see a coherent picture.
 * IntersectionObserver toggles `playing` once the strip enters viewport
 * (threshold 0.3). `prefers-reduced-motion: reduce` blocks autoplay; replay
 * button forces it.
 *
 * Tooling:
 *   - All 4 PNG assets live in /public/storyboard/
 *   - All animations are pure CSS @keyframes with absolute timeline delays
 *     anchored at t=0 (when `data-playing="true"` flips on)
 *   - `key={playKey}` re-mounts the whole strip → animations restart cleanly
 */
export default function HomeStoryboard() {
  const [playKey, setPlayKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Trigger playback when strip enters viewport, unless user prefers reduced motion
  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return // replay button still works manually

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setIsPlaying(true)
            obs.disconnect() // play once per mount
            break
          }
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [playKey])

  const replay = () => {
    setIsPlaying(false)
    // next tick: re-mount via playKey, then mark as playing
    setPlayKey((k) => k + 1)
    requestAnimationFrame(() => setIsPlaying(true))
  }

  return (
    <div className="hidden md:block pt-8" aria-hidden>
      <div
        key={playKey}
        ref={rootRef}
        data-playing={isPlaying ? 'true' : 'false'}
        className="storyboard mx-auto w-full max-w-5xl"
      >
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_0.5fr] items-start gap-3 lg:gap-4">
          {/* Frame 1 */}
          <Figure caption="Describe the trip">
            <BrowserFrame url="waytico.com">
              <Frame1Input />
            </BrowserFrame>
          </Figure>

          <Arrow index={1} />

          {/* Frame 2 */}
          <Figure caption="Get a webpage">
            <BrowserFrame url="waytico.com/t/paris-weekend-getaway">
              <Frame2Scroll />
            </BrowserFrame>
          </Figure>

          <Arrow index={2} />

          {/* Frame 3 */}
          <Figure caption="Send the link to the client">
            <BrowserFrame url="waytico.com/t/paris-weekend-getaway">
              <Frame3Editor />
            </BrowserFrame>
          </Figure>

          <Arrow index={3} />

          {/* Frame 4 */}
          <Figure quote='"Wow, looks great!"'>
            <PhoneFrame>
              <Frame4MobileScroll />
            </PhoneFrame>
          </Figure>
        </div>

        {/* Replay */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-2 text-foreground/55 hover:text-foreground/85 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
            <span className="font-serif italic text-[13px]">Watch again</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        /* ===================== Figure / browser & phone chrome ===================== */
        .storyboard :global(.figure) {
          display: flex;
          flex-direction: column;
        }
        .storyboard :global(.figure-caption) {
          margin-top: 10px;
          font-family: var(--font-cormorant, Georgia, serif);
          font-style: italic;
          font-size: 13px;
          line-height: 1.4;
          text-align: center;
          color: hsl(var(--foreground) / 0.7);
        }
        .storyboard :global(.figure-quote) {
          margin-top: 10px;
          font-family: var(--font-cormorant, Georgia, serif);
          font-style: italic;
          font-size: 13px;
          line-height: 1.4;
          text-align: center;
          color: hsl(var(--accent));
        }

        /* Browser frame — 16/10 */
        .storyboard :global(.browser) {
          width: 100%;
          aspect-ratio: 16 / 10;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 6px 24px -10px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(0, 0, 0, 0.04);
          border: 1px solid hsl(var(--border) / 0.6);
          display: flex;
          flex-direction: column;
        }
        .storyboard :global(.browser-bar) {
          flex-shrink: 0;
          height: 22px;
          background: hsl(var(--secondary) / 0.5);
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          display: flex;
          align-items: center;
          padding: 0 8px;
          gap: 6px;
        }
        .storyboard :global(.browser-dots) {
          display: flex;
          gap: 4px;
        }
        .storyboard :global(.browser-dots span) {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: hsl(var(--foreground) / 0.18);
        }
        .storyboard :global(.browser-url) {
          flex: 1;
          font-size: 9px;
          font-family: var(--font-mono, ui-monospace, monospace);
          color: hsl(var(--foreground) / 0.5);
          background: hsl(var(--background));
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .storyboard :global(.browser-body) {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #f5efe1;
        }

        /* Phone frame — same height as browser frame, narrow */
        .storyboard :global(.phone-wrap) {
          width: 100%;
          aspect-ratio: 16 / 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .storyboard :global(.phone) {
          height: 100%;
          aspect-ratio: 393 / 852;
          background: #1a1612;
          border-radius: 14px;
          padding: 4px;
          box-shadow: 0 6px 24px -10px rgba(0, 0, 0, 0.35);
        }
        .storyboard :global(.phone-screen) {
          width: 100%;
          height: 100%;
          background: #f5efe1;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        /* ===================== Frame 1 — input ===================== */
        .storyboard :global(.f1-textarea) {
          padding: 14px 16px;
          font-size: 12px;
          line-height: 1.5;
          color: hsl(var(--foreground));
          font-family: var(--font-dm-sans, system-ui, sans-serif);
          text-align: left;
          height: 100%;
          background: #ffffff;
        }
        .storyboard :global(.f1-line) {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        .storyboard :global(.f1-cursor) {
          display: inline-block;
          width: 1px;
          background: currentColor;
          height: 1em;
          vertical-align: text-bottom;
          margin-left: 2px;
          animation: f1-blink 1s step-end infinite;
        }
        @keyframes f1-blink {
          50% { opacity: 0; }
        }
        /* Default (no playing): all lines fully visible (final state) */
        /* Playing state: typewriter reveal each line in sequence (0..2.5s total) */
        .storyboard[data-playing='true'] :global(.f1-line-1) {
          width: 0;
          animation: f1-type 0.55s steps(28, end) forwards;
          animation-delay: 0ms;
        }
        .storyboard[data-playing='true'] :global(.f1-line-2) {
          width: 0;
          animation: f1-type 0.55s steps(26, end) forwards;
          animation-delay: 550ms;
        }
        .storyboard[data-playing='true'] :global(.f1-line-3) {
          width: 0;
          animation: f1-type 0.5s steps(24, end) forwards;
          animation-delay: 1100ms;
        }
        .storyboard[data-playing='true'] :global(.f1-line-4) {
          width: 0;
          animation: f1-type 0.5s steps(22, end) forwards;
          animation-delay: 1600ms;
        }
        @keyframes f1-type {
          from { width: 0; }
          to { width: 100%; }
        }

        /* ===================== Frame 2 — scroll PNG ===================== */
        .storyboard :global(.f2-img) {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          display: block;
          /* Final state: scrolled to Day 1 */
          transform: translateY(-50%);
        }
        /* Playing: enter (fade) → hold at top → scroll to Day 1 */
        .storyboard[data-playing='true'] :global(.f2-frame) {
          opacity: 0;
          animation: f2-fadein 0.5s ease-out forwards;
          animation-delay: 700ms;
        }
        @keyframes f2-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .storyboard[data-playing='true'] :global(.f2-img) {
          /* From t=700ms (frame fades in) to t=2700 hold at top, then scroll to -50% by t=4700 */
          transform: translateY(0);
          animation: f2-scroll 4s ease-in-out forwards;
          animation-delay: 700ms;
        }
        @keyframes f2-scroll {
          0% { transform: translateY(0); }                 /* 700ms */
          50% { transform: translateY(0); }                /* 2700ms — hold */
          100% { transform: translateY(-50%); }            /* 4700ms */
        }
        .storyboard :global(.f2-frame) {
          position: absolute;
          inset: 0;
          opacity: 1; /* final state */
        }

        /* ===================== Frame 3 — empty hero → photo drops in → pencil underline ===================== */
        .storyboard :global(.f3-frame) {
          position: absolute;
          inset: 0;
          opacity: 1;
        }
        .storyboard[data-playing='true'] :global(.f3-frame) {
          opacity: 0;
          animation: f3-fadein 0.5s ease-out forwards;
          animation-delay: 4700ms;
        }
        @keyframes f3-fadein {
          to { opacity: 1; }
        }
        .storyboard :global(.f3-empty) {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .storyboard :global(.f3-photo) {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          /* Final: photo dropped in */
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .storyboard[data-playing='true'] :global(.f3-photo) {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
          animation: f3-drop 1s ease-out forwards;
          animation-delay: 5200ms;
        }
        @keyframes f3-drop {
          0% { opacity: 0; transform: translateY(-30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Pencil underline */
        .storyboard :global(.f3-underline) {
          position: absolute;
          left: 6%;
          right: 50%;
          bottom: 18%;
          height: 8px;
          pointer-events: none;
        }
        .storyboard :global(.f3-underline svg) {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .storyboard :global(.f3-underline line) {
          stroke: hsl(var(--accent));
          stroke-width: 2;
          stroke-linecap: round;
          stroke-dasharray: 200;
          stroke-dashoffset: 0; /* final */
          opacity: 0.85;
        }
        .storyboard[data-playing='true'] :global(.f3-underline line) {
          stroke-dashoffset: 200;
          animation: f3-underline 1s ease-out forwards;
          animation-delay: 6200ms;
        }
        @keyframes f3-underline {
          to { stroke-dashoffset: 0; }
        }

        /* ===================== Frame 4 — mobile scroll ===================== */
        .storyboard :global(.f4-frame) {
          position: absolute;
          inset: 0;
          opacity: 1;
        }
        .storyboard[data-playing='true'] :global(.f4-frame) {
          opacity: 0;
          animation: f4-fadein 0.5s ease-out forwards;
          animation-delay: 7200ms;
        }
        @keyframes f4-fadein {
          to { opacity: 1; }
        }
        .storyboard :global(.f4-img) {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: auto;
          display: block;
          /* Final: scrolled to contacts (~92% of total height) */
          transform: translateY(-92%);
        }
        .storyboard[data-playing='true'] :global(.f4-img) {
          transform: translateY(0);
          animation: f4-scroll 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 7700ms;
        }
        @keyframes f4-scroll {
          0%   { transform: translateY(0); }
          18%  { transform: translateY(-12%); }
          35%  { transform: translateY(-30%); }
          50%  { transform: translateY(-50%); }
          58%  { transform: translateY(-65%); }
          62%  { transform: translateY(-65%); }   /* hold on price */
          80%  { transform: translateY(-88%); }
          100% { transform: translateY(-92%); }
        }

        /* Quote fade-in for frame 4 caption */
        .storyboard :global(.figure-quote) {
          opacity: 1;
        }
        .storyboard[data-playing='true'] :global(.figure-quote) {
          opacity: 0;
          animation: q-fadein 0.4s ease-out forwards;
          animation-delay: 9700ms;
        }
        @keyframes q-fadein {
          to { opacity: 1; }
        }

        /* ===================== Arrows ===================== */
        .storyboard :global(.arrow) {
          align-self: center;
          width: 18px;
          height: 14px;
          color: hsl(var(--foreground) / 0.35);
        }
        .storyboard :global(.arrow path) {
          stroke-dasharray: 24;
          stroke-dashoffset: 0; /* final visible */
        }
        .storyboard[data-playing='true'] :global(.arrow path) {
          stroke-dashoffset: 24;
          animation: arr-draw 0.2s ease-out forwards;
        }
        .storyboard[data-playing='true'] :global(.arrow-1 path) { animation-delay: 500ms; }
        .storyboard[data-playing='true'] :global(.arrow-2 path) { animation-delay: 4500ms; }
        .storyboard[data-playing='true'] :global(.arrow-3 path) { animation-delay: 7000ms; }
        @keyframes arr-draw {
          to { stroke-dashoffset: 0; }
        }

        /* Reduced motion: defeat all entry animations, jump to final state */
        @media (prefers-reduced-motion: reduce) {
          .storyboard[data-playing='true'] :global(*),
          .storyboard[data-playing='true'] :global(*::before),
          .storyboard[data-playing='true'] :global(*::after) {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ============================== Subcomponents ============================== */

function Figure({
  caption,
  quote,
  children,
}: {
  caption?: string
  quote?: string
  children: React.ReactNode
}) {
  return (
    <figure className="figure">
      {children}
      {caption ? <figcaption className="figure-caption">{caption}</figcaption> : null}
      {quote ? <figcaption className="figure-quote">{quote}</figcaption> : null}
    </figure>
  )
}

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="browser-url">{url}</div>
      </div>
      <div className="browser-body">{children}</div>
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="phone-screen">{children}</div>
      </div>
    </div>
  )
}

function Frame1Input() {
  return (
    <div className="f1-textarea">
      <span className="f1-line f1-line-1">3 days in Paris for a couple,</span>
      <span className="f1-line f1-line-2">late June. Hôtel des Deux</span>
      <span className="f1-line f1-line-3">Pavillons in the Marais.</span>
      <span className="f1-line f1-line-4">
        Day 1 Marais and Seine
        <span className="f1-cursor" aria-hidden />
      </span>
    </div>
  )
}

function Frame2Scroll() {
  return (
    <div className="f2-frame">
      <img className="f2-img" src="/storyboard/frame-2-no-photo.png" alt="" />
    </div>
  )
}

function Frame3Editor() {
  return (
    <div className="f3-frame">
      {/* empty hero with drop-zone visible (always there) */}
      <img className="f3-empty" src="/storyboard/frame-3-no-photo.png" alt="" />
      {/* photo that drops in on top */}
      <img className="f3-photo" src="/storyboard/frame-3-photo.png" alt="" />
      {/* pencil underline */}
      <span className="f3-underline" aria-hidden>
        <svg viewBox="0 0 200 8" preserveAspectRatio="none">
          <line x1="0" y1="4" x2="200" y2="4" />
        </svg>
      </span>
    </div>
  )
}

function Frame4MobileScroll() {
  return (
    <div className="f4-frame">
      <img className="f4-img" src="/storyboard/frame-4-mobile-full.png" alt="" />
    </div>
  )
}

function Arrow({ index }: { index: 1 | 2 | 3 }) {
  return (
    <svg
      className={`arrow arrow-${index}`}
      viewBox="0 0 18 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 7 L14 7 M10 3 L14 7 L10 11" />
    </svg>
  )
}
