# Atelier theme

Coral + teal + sage. Fraunces display, Inter sans, JetBrains Mono.
Asymmetric layouts with rounded corners, sticker overlays, and bright
accent blocks (coral price, teal CTA, sage map).

## Block order (matches `trip-page-client.tsx` switch)

1. `nav.tsx` — sticky pill nav (desktop only)
2. `hero.tsx` — two-column with rounded image + host overlay card + Activate
3. `overview.tsx` — eyebrow + outsized h2 + side prose
4. `itinerary.tsx` — 2-col card grid, rotating coral/teal/sage accents
5. `included.tsx` — teal include card vs outlined exclude card
6. `map.tsx` — sage section + paper map + coral path + filled circles
7. `gallery.tsx` — rounded asymmetric 12-col grid + white pill captions
8. `price.tsx` — coral block + nested white display-price card + Activate
9. `ratings.tsx` — 4 white cards on paper-2, 5-segment progress strips
10. `host.tsx` — pull-quote bio (only if `host.bio` present; canvas
    embedded host into hero+operator)
11. `operator.tsx` — portrait + name + paper-2 contact tiles
12. `cta.tsx` — teal section, "Shall we hold your dates?" + Share
13. `terms.tsx` — desktop 2-col, mobile +/− accordion
14. `sticky-cta.tsx` — mobile bottom bar, status='quoted' only

## Visibility rules

| Block      | Hidden when                                                    |
| ---------- | -------------------------------------------------------------- |
| Map        | no locations with valid coords                                 |
| Gallery    | photos=0 for clients (owner sees empty state)                  |
| Ratings    | `ratings` is null or all 4 metrics null                        |
| Host       | `host.name` empty, OR `host.bio` empty (Atelier needs the      |
|            | quote to make sense; hero+operator carry name without it)      |
| Operator   | resolver produces no contact at all                            |
| Sticky CTA | `status !== 'quoted'`                                          |

## How Atelier differs structurally from Journal

- No giant double-zero day numbers in itinerary; the day number lives as
  a single italic in the lower-right of each card image instead.
- No SVG hand-sketch map — solid coral path on a light grid card.
- Pull-quote host (only with bio); Journal renders host name + portrait
  unconditionally when `name` exists.
- Mobile sticky CTA is the only persistent control on mobile — no in-page
  command bar specific to Atelier.

## TODOs (handled by later steps, not Atelier-specific)

- Scroll-spy on nav (step 7).
- Theme switcher control (step 7) — until then, `?theme=atelier` query
  param on `/t/[slug]` overrides the DB `design_theme` for preview.
