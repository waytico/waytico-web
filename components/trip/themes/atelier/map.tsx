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

type AtelierMapProps = {
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

/**
 * Atelier — Map ("04 / The route").
 *
 * Sage-coloured section with a paper-coloured map card inside. Light
 * grid lines, solid coral path between coral-filled circles labelled
 * with the day number. Below: location chip-cards in a responsive grid.
 */
export function AtelierMap({ locations }: AtelierMapProps) {
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
  const padLng = Math.max(lngRange * 0.15, 0.1)
  const padLat = Math.max(latRange * 0.15, 0.05)
  const boxMinLng = minLng - padLng
  const boxMaxLng = maxLng + padLng
  const boxMinLat = minLat - padLat
  const boxMaxLat = maxLat + padLat
  const W = 1328
  const H = 600
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
      className="px-4 md:px-14 py-16 md:py-24"
      style={{ background: 'var(--a-sage)' }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 mb-12 md:mb-14">
        <div>
          <div className="a-eyebrow mb-5" style={{ color: 'var(--a-teal)' }}>
            04 / The route
          </div>
          <h2
            className="a-display"
            style={{
              fontSize: 'clamp(2.75rem, 7vw, 6rem)',
              lineHeight: 0.92,
              margin: 0,
              letterSpacing: '-0.03em',
              color: 'var(--a-teal)',
            }}
          >
            {ordered.length} place{ordered.length === 1 ? '' : 's'},{' '}
            <span className="a-italic">1 circuit</span>.
          </h2>
        </div>
      </div>

      <div
        className="p-4 md:p-8"
        style={{ background: 'var(--a-paper)', borderRadius: 16 }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={(W / 12) * i}
              y1={0}
              x2={(W / 12) * i}
              y2={H}
              stroke="rgba(15,61,62,0.05)"
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
              stroke="rgba(15,61,62,0.05)"
              strokeWidth={0.5}
            />
          ))}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--a-coral)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
          {ordered.map((l, i) => {
            const lng = toNum(l.longitude) as number
            const lat = toNum(l.latitude) as number
            return (
              <g key={l.id} transform={`translate(${toX(lng)}, ${toY(lat)})`}>
                <circle r={22} fill="var(--a-coral)" />
                <text
                  textAnchor="middle"
                  dy={5}
                  fontSize={14}
                  fill="white"
                  fontStyle="italic"
                  fontWeight={500}
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  {l.day_number ?? i + 1}
                </text>
                <text
                  y={-32}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={500}
                  fill="var(--a-teal)"
                  style={{ fontFamily: 'var(--font-display), serif' }}
                >
                  {l.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div
        className="mt-8 grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
        }}
      >
        {ordered.map((l) => (
          <div
            key={l.id}
            className="px-4 py-3.5"
            style={{ background: 'var(--a-paper)', borderRadius: 12 }}
          >
            <div className="a-mono mb-1.5" style={{ color: 'var(--a-coral)' }}>
              {l.day_number ? `Day ${l.day_number}` : 'Stop'}
            </div>
            <div
              className="a-display"
              style={{ fontSize: 16, color: 'var(--a-teal)' }}
            >
              {l.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
