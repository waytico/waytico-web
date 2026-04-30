/**
 * Trip page v2 — skeleton theme.
 *
 * Placeholder for stage 1 of the v2 fork migration. Renders a minimal data
 * dump on a neutral background so the host (`TripHostV2`), chrome copies,
 * and owner-mode detection can be verified end-to-end before any real
 * theme (Magazine, Sanctuary, Frontier...) lands.
 *
 * Real themes live next to this folder under `themes-v2/<name>/` and are
 * registered in `lib/theme-registry-v2.tsx`.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'

export default function SkeletonTheme({ data, mode }: ThemePropsV2) {
  const p = data.project
  return (
    <div
      data-theme="skeleton"
      style={{
        padding: '40px 24px 80px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.6,
        color: '#1A1817',
        background: '#FAF8F5',
        minHeight: '70vh',
      }}
    >
      <h1 style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 600, marginBottom: 24 }}>
        Trip page v2 — skeleton
      </h1>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {[
            ['Theme', p.design_theme ?? 'null (default → editorial)'],
            ['Mode', mode],
            ['Slug', p.slug],
            ['Project ID', p.id],
            ['Title', p.title ?? '—'],
            ['Status', p.status],
            ['Days', String(p.itinerary?.length ?? 0)],
            ['Photos', String(data.media.length)],
            ['Accommodations', String(data.accommodations.length)],
            ['Tasks', String(data.tasks.length)],
            ['Owner brand', data.owner?.brand_name ?? '—'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '4px 24px 4px 0', opacity: 0.6 }}>{k}</td>
              <td style={{ padding: '4px 0' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 32, opacity: 0.5, fontSize: 12 }}>
        v2 fork — stage 1. Real themes land in stage 2.
      </p>
    </div>
  )
}
