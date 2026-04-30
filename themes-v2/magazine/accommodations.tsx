/**
 * Magazine — Accommodations section.
 *
 * Source: magazine-trip.jsx lines 225–283. Vertical stack of cards, each
 * with a 4:3 photo + STAY NN eyebrow + name + 1-line description.
 *
 * Per MAGAZINE-SPEC §J.3 we omit the source's static italic-em headline
 * ("Three houses, *each its own world.*") and use the standard
 * UI.sectionLabels.accommodations label instead — content model for
 * those headlines is deferred to a later round.
 *
 * Empty state: if there are no accommodations → section is hidden.
 * Cards without an image_url just render the text block with no <img>.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { body, CREAM, display, eyebrow, Hairline, MUTED } from './styles'

export function Accommodations({ data }: ThemePropsV2) {
  const stays = data.accommodations ?? []
  if (stays.length === 0) return null

  return (
    <section style={{ background: CREAM, padding: '40px 0 56px' }}>
      <Hairline />
      <div style={{ padding: '40px 24px 28px' }}>
        <div style={{ ...eyebrow, marginBottom: 18 }}>
          {UI.sectionLabels.accommodations.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {stays.map((s, i) => (
          <div key={s.id} style={{ padding: '0 24px' }}>
            {s.image_url && (
              <img
                src={s.image_url}
                alt={s.name}
                style={{
                  width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                  display: 'block', borderRadius: 0,
                }}
              />
            )}
            <div style={{ paddingTop: s.image_url ? 14 : 0 }}>
              <div style={{ ...eyebrow, fontSize: 10, color: MUTED, marginBottom: 6 }}>
                STAY {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ ...display, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>
                {s.name}
              </div>
              {s.description && (
                <div style={{ ...body, color: MUTED, fontSize: 13.5 }}>
                  {s.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
