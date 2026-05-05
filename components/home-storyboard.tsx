'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

const TYPEWRITER_LINES = [
  '3 days in Paris for a couple,',
  'late June. Hôtel des Deux',
  'Pavillons in the Marais.',
  'Day 1 Marais and Seine',
]

export default function HomeStoryboard() {
  const [playKey, setPlayKey] = useState(0)
  const [userInitiated, setUserInitiated] = useState(false)

  const replay = () => {
    setUserInitiated(true)
    setPlayKey((k) => k + 1)
  }

  return (
    <div className="hidden md:block py-10">
      {/* Breakout from parent's max-w-2xl so the 4-frame row has room to breathe */}
      <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[1400px] mx-auto px-6">
        <Storyboard key={playKey} userInitiated={userInitiated} />
        <div className="sb-replay-wrap">
          <button onClick={replay} type="button" className="sb-replay" aria-label="Watch again">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Watch again</span>
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: STORYBOARD_CSS }} />
    </div>
  )
}

function Storyboard({ userInitiated }: { userInitiated: boolean }) {
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reduced motion: don't autoplay. Replay click overrides via userInitiated.
    if (reduced && !userInitiated) return

    setReady(true)

    if (userInitiated) {
      // Replay path — skip IO, start immediately
      const t = window.setTimeout(() => setPlaying(true), 30)
      return () => window.clearTimeout(t)
    }

    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPlaying(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [userInitiated])

  const cls = ['sb-root', ready ? 'sb-ready' : '', playing ? 'sb-playing' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={cls}>
      <div className="sb-row">
        {/* Frame 1 — typewriter input */}
        <figure className="sb-frame sb-frame-1">
          <div className="sb-browser">
            <BrowserChrome url="waytico.com" />
            <div className="sb-input-mock">
              {TYPEWRITER_LINES.map((line, i) => (
                <span key={i} className={`sb-typewriter sb-tw-${i + 1}`}>
                  {line}
                </span>
              ))}
              <span className="sb-cursor" aria-hidden="true">|</span>
            </div>
          </div>
          <figcaption className="sb-caption">Describe the trip</figcaption>
        </figure>

        <Arrow n={1} />

        {/* Frame 2 — generated webpage (no photo), inner scroll */}
        <figure className="sb-frame sb-frame-2">
          <div className="sb-browser">
            <BrowserChrome url="waytico.com/t/paris-weekend-getaway" />
            <div className="sb-screen sb-screen-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/storyboard/frame-2-no-photo.png" alt="" draggable={false} />
            </div>
          </div>
          <figcaption className="sb-caption">Get a webpage</figcaption>
        </figure>

        <Arrow n={2} />

        {/* Frame 3 — owner editor, photo drop + pencil underline */}
        <figure className="sb-frame sb-frame-3">
          <div className="sb-browser">
            <BrowserChrome url="waytico.com/t/paris-weekend-getaway" />
            <div className="sb-screen sb-screen-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/storyboard/frame-3-no-photo.png" alt="" className="sb-base" draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/storyboard/frame-3-photo.png" alt="" className="sb-photo-drop" draggable={false} />
              <svg
                className="sb-pencil-underline"
                viewBox="0 0 100 4"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="2"
                  x2="100"
                  y2="2"
                  stroke="currentColor"
                  strokeWidth="2"
                  pathLength="100"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <figcaption className="sb-caption">Send the link to the client</figcaption>
        </figure>

        <Arrow n={3} />

        {/* Frame 4 — phone with full mobile screenshot */}
        <figure className="sb-frame sb-frame-4">
          <div className="sb-phone">
            <div className="sb-phone-notch" aria-hidden="true" />
            <div className="sb-screen sb-screen-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/storyboard/frame-4-mobile-full.png" alt="" draggable={false} />
            </div>
          </div>
          <figcaption className="sb-caption sb-quote">&ldquo;Wow, looks great!&rdquo;</figcaption>
        </figure>
      </div>
    </div>
  )
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="sb-browser-chrome">
      <span className="sb-dot" />
      <span className="sb-dot" />
      <span className="sb-dot" />
      <div className="sb-url">{url}</div>
    </div>
  )
}

function Arrow({ n }: { n: 1 | 2 | 3 }) {
  return (
    <div className={`sb-arrow sb-arrow-${n}`} aria-hidden="true">
      <svg viewBox="0 0 60 12" preserveAspectRatio="none">
        <line x1="2" y1="6" x2="50" y2="6" stroke="currentColor" strokeWidth="1.2" pathLength="100" />
        <polyline
          points="46,2 54,6 46,10"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
          pathLength="100"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   STYLES
   Default state (no class) renders frames in their FINAL state — graceful
   degradation for no-JS / slow connection. `sb-ready` resets to start,
   `sb-playing` triggers animations. Reduced-motion path simply never sets
   `sb-ready`, so frames stay in final state; replay click forces both flags.
   ────────────────────────────────────────────────────────────────────────── */

const STORYBOARD_CSS = `
.sb-root {
  --sb-bg-chrome: #f4eee0;
  --sb-bg-screen: #f4eee0;
  --sb-text-mute: rgba(28, 25, 23, 0.55);
  --sb-arrow: rgba(28, 25, 23, 0.28);
}

.sb-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 14px;
}

.sb-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0;
  flex-shrink: 0;
}

/* Browser frame */
.sb-browser {
  width: 280px;
  height: 175px;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8px 28px -12px rgba(0, 0, 0, 0.18), 0 2px 6px -2px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.sb-browser-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--sb-bg-chrome);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.sb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.16);
  flex-shrink: 0;
}
.sb-url {
  flex: 1;
  text-align: center;
  font-size: 9px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 6px;
}
.sb-screen {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--sb-bg-screen);
}
.sb-screen img {
  display: block;
  width: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

/* Frame 1 — typewriter */
.sb-input-mock {
  flex: 1;
  padding: 12px 14px;
  text-align: left;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(0, 0, 0, 0.78);
  font-style: italic;
  background: #fff;
}
.sb-typewriter {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  width: 100%; /* default — final state */
}
.sb-cursor {
  display: inline-block;
  margin-left: 1px;
  font-style: normal;
  color: rgba(0, 0, 0, 0.4);
  /* default (no JS / no playing) — invisible to avoid a stale cursor */
  opacity: 0;
}

/* Frame 2 — scrolls to show Day 1 area */
.sb-screen-2 img {
  width: 100%;
  /* default — final scrolled state */
  transform: translateY(-50%);
}

/* Frame 3 — photo drop & pencil underline */
.sb-screen-3 .sb-base {
  width: 100%;
}
.sb-screen-3 .sb-photo-drop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* default — final, photo dropped in */
  opacity: 1;
  transform: translateY(0) scale(1);
}
.sb-pencil-underline {
  position: absolute;
  bottom: 22%;
  left: 8%;
  width: 56%;
  height: 3px;
  color: #fff;
  pointer-events: none;
  /* default — final */
  opacity: 1;
}
.sb-pencil-underline line {
  /* default — fully drawn */
  stroke-dashoffset: 0;
}

/* Frame 4 — phone */
.sb-phone {
  width: 92px;
  height: 195px;
  border-radius: 18px;
  background: #1a1814;
  padding: 4px;
  box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.32), 0 2px 6px -2px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  flex-direction: column;
}
.sb-phone-notch {
  position: absolute;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 4px;
  background: #000;
  border-radius: 2px;
  z-index: 2;
}
.sb-phone .sb-screen {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: var(--sb-bg-screen);
}
.sb-screen-4 img {
  width: 100%;
  /* default — final scrolled near bottom */
  transform: translateY(-92%);
}

/* Arrows */
.sb-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  align-self: center;
  margin-top: 80px;
  color: var(--sb-arrow);
  flex-shrink: 0;
}
.sb-arrow svg {
  width: 100%;
  height: 12px;
  display: block;
}
.sb-arrow svg line,
.sb-arrow svg polyline {
  /* default — fully drawn */
  stroke-dasharray: 100;
  stroke-dashoffset: 0;
}

/* Captions */
.sb-caption {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 13px;
  line-height: 1.4;
  color: var(--sb-text-mute);
  text-align: center;
  margin: 0;
  max-width: 280px;
}
.sb-quote {
  color: var(--accent, #cf6b39);
  /* default — final */
  opacity: 1;
}

/* Replay button */
.sb-replay-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.sb-replay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: 0;
  color: rgba(28, 25, 23, 0.5);
  cursor: pointer;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 13px;
  transition: color 0.15s;
  border-radius: 999px;
}
.sb-replay:hover {
  color: rgba(28, 25, 23, 0.85);
}

/* ─── sb-ready: reset to START state (only when JS runs and motion not reduced) */
.sb-ready .sb-frame {
  opacity: 0;
}
.sb-ready .sb-typewriter {
  width: 0;
}
.sb-ready .sb-cursor {
  opacity: 1;
}
.sb-ready .sb-screen-2 img {
  transform: translateY(0);
}
.sb-ready .sb-screen-3 .sb-photo-drop {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}
.sb-ready .sb-pencil-underline {
  opacity: 0;
}
.sb-ready .sb-pencil-underline line {
  stroke-dashoffset: 100;
}
.sb-ready .sb-screen-4 img {
  transform: translateY(0);
}
.sb-ready .sb-arrow svg line,
.sb-ready .sb-arrow svg polyline {
  stroke-dashoffset: 100;
}
.sb-ready .sb-quote {
  opacity: 0;
}

/* ─── sb-playing: animate from start to final */

/* Frame fades */
.sb-playing .sb-frame-1 { animation: sb-fade-in 500ms ease-out 0ms forwards; }
.sb-playing .sb-frame-2 { animation: sb-fade-in 500ms ease-out 700ms forwards; }
.sb-playing .sb-frame-3 { animation: sb-fade-in 500ms ease-out 4700ms forwards; }
.sb-playing .sb-frame-4 { animation: sb-fade-in 500ms ease-out 7200ms forwards; }
@keyframes sb-fade-in {
  to { opacity: 1; }
}

/* Frame 1 typewriter — 4 lines, 600ms each, sequential */
.sb-playing .sb-tw-1 { animation: sb-type 600ms steps(28, end) 0ms forwards; }
.sb-playing .sb-tw-2 { animation: sb-type 600ms steps(28, end) 600ms forwards; }
.sb-playing .sb-tw-3 { animation: sb-type 600ms steps(28, end) 1200ms forwards; }
.sb-playing .sb-tw-4 { animation: sb-type 600ms steps(28, end) 1800ms forwards; }
@keyframes sb-type {
  to { width: 100%; }
}
.sb-playing .sb-cursor {
  animation: sb-blink 0.8s step-end infinite;
}
@keyframes sb-blink {
  50% { opacity: 0; }
}

/* Frame 2 — hold then scroll down to Day 1 area */
.sb-playing .sb-screen-2 img {
  animation: sb-scroll-2 4000ms ease-in-out 1200ms forwards;
}
@keyframes sb-scroll-2 {
  0%, 30% { transform: translateY(0); }      /* hold on hero (1500ms) */
  100%    { transform: translateY(-50%); }   /* scroll to Day 1 */
}

/* Frame 3 — photo drops in */
.sb-playing .sb-screen-3 .sb-photo-drop {
  animation: sb-photo-drop 1000ms ease-out 5200ms forwards;
}
@keyframes sb-photo-drop {
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Frame 3 — pencil underline draws */
.sb-playing .sb-pencil-underline {
  animation: sb-pencil-fade 1000ms 6200ms forwards;
}
.sb-playing .sb-pencil-underline line {
  animation: sb-pencil-draw 1000ms ease-out 6200ms forwards;
}
@keyframes sb-pencil-fade {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes sb-pencil-draw {
  to { stroke-dashoffset: 0; }
}

/* Frame 4 — variable-speed mobile scroll */
.sb-playing .sb-screen-4 img {
  animation: sb-scroll-mobile 3200ms cubic-bezier(0.4, 0, 0.2, 1) 7700ms forwards;
}
@keyframes sb-scroll-mobile {
  0%   { transform: translateY(0); }
  18%  { transform: translateY(-12%); }
  35%  { transform: translateY(-30%); }
  50%  { transform: translateY(-50%); }
  58%  { transform: translateY(-65%); }
  62%  { transform: translateY(-65%); }
  80%  { transform: translateY(-88%); }
  100% { transform: translateY(-92%); }
}

/* Arrows draw between frame fade-ins */
.sb-playing .sb-arrow-1 svg line,
.sb-playing .sb-arrow-1 svg polyline {
  animation: sb-arrow-draw 200ms ease-out 500ms forwards;
}
.sb-playing .sb-arrow-2 svg line,
.sb-playing .sb-arrow-2 svg polyline {
  animation: sb-arrow-draw 200ms ease-out 4500ms forwards;
}
.sb-playing .sb-arrow-3 svg line,
.sb-playing .sb-arrow-3 svg polyline {
  animation: sb-arrow-draw 200ms ease-out 7000ms forwards;
}
@keyframes sb-arrow-draw {
  to { stroke-dashoffset: 0; }
}

/* Frame 4 quote fade-in at end */
.sb-playing .sb-quote {
  animation: sb-fade-in 300ms ease-out 9700ms forwards;
}
`
