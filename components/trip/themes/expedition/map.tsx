'use client'

type LocationLike = {
  id: string
  name: string
  latitude?: string | number | null
  longitude?: string | number | null
  day_number?: number | null
  sort_order?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

type ExpeditionMapProps = {
  locations: LocationLike[]
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function orderForPath(locations: LocationLike[]): LocationLike[] {
  return [...locations]
    .map((loc, idx) => ({ loc, idx }))
    .sort((a, b) => {
      const aDay = a.loc.day_number ?? null
      const bDay = b.loc.day_number ?? null
      if (aDay !== null && bDay !== null && aDay !== bDay) return aDay - bDay
      if (aDay !== null && bDay === null) return -1
      if (aDay === null && bDay !== null) return 1
      const aSort = a.loc.sort_order ?? 0
      const bSort = b.loc.sort_order ?? 0
      if (aSort !== bSort) return aSort - bSort
      return a.idx - b.idx
    })
    .map((x) => x.loc)
}

function fmtBounds(min: number, max: number, posLetter: string, negLetter: string): string {
  const minDeg = Math.abs(min)
  const maxDeg = Math.abs(max)
  return `${minDeg.toFixed(2)}°${min >= 0 ? posLetter : negLetter} → ${maxDeg.toFixed(2)}°${max >= 0 ? posLetter : negLetter}`
}

/**
 * Expedition — Map ("§ 04 — CARTOGRAPHY").
 *
 * Topo-grid SVG on dark panel: thin grid lines, faint ochre concentric
 * contour ellipses for atmosphere, ochre solid path between waypoints.
 * Each waypoint is a hollow ochre circle with a tiny "D{n}" badge above
 * (drawn via SVG <rect> + <text>) and the location name below.
 *
 * Bottom: a 7-up grid of WP.NN cards.
 */
export function ExpeditionMap({ locations }: ExpeditionMapProps) {
  const ordered = orderForPath(locations || []).filter(
    (l) => toNum(l.latitude) !== null && toNum(l.longitude) !== null,
  )
  if (ordered.length === 0) return null

  const lngs = ordered.map((l) => toNum(l.longitude) as number)
  const lats = ordered.map((l) => toNum(l.latitude) as number)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngRange = Math.max(maxLng - minLng, 0.001)
  const latRange = Math.max(maxLat - minLat, 0.001)
  const padLng = Math.max(lngRange * 0.2, 0.1)
  const padLat = Math.max(latRange * 0.15, 0.05)
  const boxMinLng = minLng - padLng
  const boxMaxLng = maxLng + padLng
  const boxMinLat = minLat - padLat
  const boxMaxLat = maxLat + padLat
  const W = 1328
  const H = 680
  const toX = (lng: number) =>
    ((lng - boxMinLng) / (boxMaxLng - boxMinLng)) * W
  const toY = (lat: number) =>
    H - ((lat - boxMinLat) / (boxMaxLat - boxMinLat)) * H
  const pathD =
    ordered.length > 1
      ? ordered
          .map(
            (l, i) =>
              `${i === 0 ? 'M' : 'L'} ${toX(toNum(l.longitude) as number)} ${toY(toNum(l.latitude) as number)}`,
          )
          .join(' ')
      : null

  return (
    <section
      id="map"
      className="px-4 md:px-14 py-20 md:py-32"
      style={{
        background: 'var(--e-bg-deep)',
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-5 mb-12 md:mb-16">
        <div>
          <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
            § 04 — CARTOGRAPHY
          </div>
          <h2
            className="e-display"
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              lineHeight: 0.88,
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            TERRAIN
            <br />
            <span style={{ color: 'var(--e-ochre)' }}>MAPPED.</span>
          </h2>
        </div>
        <div
          className="e-mono md:text-right whitespace-pre-line"
          style={{ color: 'var(--e-cream-mute)' }}
        >
          {`BOUNDS ${fmtBounds(minLat, maxLat, 'N', 'S')}\n       ${fmtBounds(minLng, maxLng, 'E', 'W')}`}
        </div>
      </div>

      <div
        className="relative p-4 md:p-6"
        style={{
          background: 'var(--e-panel)',
          border: '1px solid var(--e-rule-2)',
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* topo grid */}
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(W / 14) * i}
              y1={0}
              x2={(W / 14) * i}
              y2={H}
              stroke="rgba(232,223,207,0.06)"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={(H / 7) * i}
              x2={W}
              y2={(H / 7) * i}
              stroke="rgba(232,223,207,0.06)"
              strokeWidth={0.5}
            />
          ))}

          {/* contour ellipses */}
          {[0.18, 0.3, 0.45, 0.6, 0.75].map((r, i) => (
            <ellipse
              key={i}
              cx={W * 0.5}
              cy={H * 0.5}
              rx={W * r * 0.5}
              ry={H * r * 0.5}
              fill="none"
              stroke="rgba(212,138,63,0.08)"
              strokeWidth={0.6}
            />
          ))}

          {pathD && (
            <path d={pathD} fill="none" stroke="#d48a3f" strokeWidth={1.5} />
          )}

          {ordered.map((l, i) => {
            const lng = toNum(l.longitude) as number
            const lat = toNum(l.latitude) as number
            return (
              <g key={l.id} transform={`translate(${toX(lng)}, ${toY(lat)})`}>
                <circle r={20} fill="var(--e-bg-deep)" stroke="#d48a3f" strokeWidth={1.5} />
                <circle r={5} fill="#d48a3f" />
                <g transform="translate(0, -36)">
                  <rect
                    x={-50}
                    y={-18}
                    width={100}
                    height={24}
                    fill="var(--e-bg-deep)"
                    stroke="rgba(212,138,63,0.4)"
                    strokeWidth={0.5}
                  />
                  <text
                    textAnchor="middle"
                    dy={-2}
                    fontSize={10}
                    fill="#d48a3f"
                    letterSpacing={1.5}
                    style={{ fontFamily: 'var(--font-mono), monospace' }}
                  >
                    D{l.day_number ?? i + 1}
                  </text>
                </g>
                <text
                  y={46}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#e8dfcf"
                  fontWeight={700}
                  letterSpacing={1}
                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                >
                  {l.name.toUpperCase()}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div
        className="mt-10 grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
        }}
      >
        {ordered.map((l, i) => (
          <div
            key={l.id}
            className="p-5"
            style={{ border: '1px solid var(--e-rule-2)' }}
          >
            <div className="e-mono mb-2.5" style={{ color: 'var(--e-ochre)' }}>
              WP.{String(i + 1).padStart(2, '0')}
            </div>
            <div className="e-headline" style={{ fontSize: 15 }}>
              {l.name.toUpperCase()}
            </div>
            <div
              className="e-mono mt-2"
              style={{ color: 'var(--e-ink-dim)', fontSize: 9 }}
            >
              DAY {l.day_number ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
