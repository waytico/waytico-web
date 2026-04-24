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

type JournalMapProps = {
  locations: LocationLike[]
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Sort locations in visiting order.
 *
 * Priority:
 *   1. `day_number` ascending (when present on at least one row)
 *   2. `sort_order` ascending as tie-breaker within the same day
 *   3. Original array order as final fallback
 *
 * Per TZ-5 note: the API returns rows by sort_order already, but we verify
 * chronological correctness explicitly so the drawn path isn't a zigzag.
 */
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

/**
 * Journal — Map (Chapter IV · "The circuit").
 *
 * Hand-sketch SVG with grid, compass, scale bar, and a dashed terracotta
 * path connecting the trip's locations in visit order. Falls back to a
 * points-only rendering when there are 0-1 locations (no path drawn).
 *
 * No Mapbox / Leaflet — the visual is intentionally illustrative rather
 * than geographically precise.
 */
export function JournalMap({ locations }: JournalMapProps) {
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

  // Pad by 10-20% of the range, with a floor for single-point cases.
  const lngRange = Math.max(maxLng - minLng, 0.001)
  const latRange = Math.max(maxLat - minLat, 0.001)
  const padLng = Math.max(lngRange * 0.15, 0.1)
  const padLat = Math.max(latRange * 0.15, 0.05)

  const boxMinLng = minLng - padLng
  const boxMaxLng = maxLng + padLng
  const boxMinLat = minLat - padLat
  const boxMaxLat = maxLat + padLat

  const W = 1296
  const H = 620
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
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px] border-t border-b"
      style={{
        background: 'var(--j-paper)',
        borderColor: 'var(--j-rule)',
      }}
    >
      <div className="j-eyebrow">Chapter IV</div>
      <h2
        className="j-serif mb-12 md:mb-20"
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          lineHeight: 0.95,
          margin: '20px 0 60px',
          letterSpacing: '-0.02em',
        }}
      >
        The <em>circuit.</em>
      </h2>

      <div
        className="j-map-sketch relative p-4 md:p-10"
        style={{ border: '1px solid var(--j-rule)' }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(W / 8) * i}
              y1={0}
              x2={(W / 8) * i}
              y2={H}
              stroke="#D8CBAF"
              strokeWidth="0.5"
              strokeDasharray="2 6"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={(H / 5) * i}
              x2={W}
              y2={(H / 5) * i}
              stroke="#D8CBAF"
              strokeWidth="0.5"
              strokeDasharray="2 6"
            />
          ))}

          {/* Compass */}
          <g transform={`translate(${W - 90}, 70)`}>
            <circle r={34} fill="none" stroke="#8A7D6B" strokeWidth="0.8" />
            <text
              y={-38}
              textAnchor="middle"
              fontSize="12"
              fill="#5A4F41"
              fontStyle="italic"
              style={{ fontFamily: 'var(--font-serif), serif' }}
            >
              N
            </text>
            <path d="M 0 -28 L 6 0 L 0 -10 L -6 0 Z" fill="#B85C38" />
          </g>

          {/* Route */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#B85C38"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />
          )}

          {/* Points */}
          {ordered.map((l, i) => {
            const lng = toNum(l.longitude) as number
            const lat = toNum(l.latitude) as number
            return (
              <g key={l.id} transform={`translate(${toX(lng)}, ${toY(lat)})`}>
                <circle r={16} fill="#FAF6EC" stroke="#B85C38" strokeWidth="1.2" />
                <text
                  textAnchor="middle"
                  dy={4}
                  fontSize="12"
                  fill="#B85C38"
                  fontStyle="italic"
                  style={{ fontFamily: 'var(--font-serif), serif' }}
                >
                  {l.day_number ?? i + 1}
                </text>
                <text
                  y={-24}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#1C1813"
                  style={{ fontFamily: 'var(--font-serif), serif' }}
                >
                  {l.name}
                </text>
              </g>
            )
          })}

          {/* Scale bar */}
          <g transform={`translate(60, ${H - 60})`}>
            <line x1={0} y1={0} x2={80} y2={0} stroke="#1C1813" strokeWidth="1" />
            <line x1={0} y1={-5} x2={0} y2={5} stroke="#1C1813" strokeWidth="1" />
            <line x1={80} y1={-5} x2={80} y2={5} stroke="#1C1813" strokeWidth="1" />
            <text
              y={20}
              fontSize="10"
              fill="#5A4F41"
              letterSpacing="2"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              ~
            </text>
          </g>
        </svg>
      </div>

      {/* Legend grid */}
      <div
        className="mt-8 md:mt-10 grid gap-4 md:gap-6"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
        }}
      >
        {ordered.map((l) => (
          <div key={l.id}>
            <div
              className="j-mono mb-1.5"
              style={{ color: 'var(--j-terra)' }}
            >
              {l.day_number ? `Day ${l.day_number}` : 'Stop'}
            </div>
            <div className="j-serif" style={{ fontSize: 18 }}>
              {l.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
