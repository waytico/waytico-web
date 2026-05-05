'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { PricingMode, Mutations, OperatorContact, OwnerBrand } from './trip-types'
import type { ThemeId } from '@/lib/themes'
import { fmtPrice, currencyGlyph } from '@/lib/trip-format'
import { EditableField } from '@/components/editable/editable-field'

type PriceProps = {
  pricingMode: PricingMode | null
  pricingLabel: string | null
  pricePerPerson: number | null
  priceTotal: number | null
  currency: string | null
  groupSize: number | null
  /** Owner mode shows the dropdown + inline editable amount + custom-label
   *  field. Public mode shows the resolved headline as plain text. */
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
  /** True when the section should render at all (price > 0 OR owner mode). */
  visible: boolean
  /** When 'magazine', renders the Magazine variant — 2-col layout with
   *  large Cormorant headline on the left and an Inquire CTA on the
   *  right. Other values keep the editorial layout. */
  theme?: ThemeId
  /** Owner brand + per-trip override — Magazine uses these to power
   *  the INQUIRE button via ContactAgentMenu. Editorial ignores them
   *  (it has no in-section CTA). */
  owner?: OwnerBrand
  operatorContact?: OperatorContact
  /** Magazine-only narrative subtitle slot under the eyebrow.
   *  DEPRECATED for price — kept only so editorial branch keeps
   *  compiling if some legacy caller still passes it. Magazine variant
   *  no longer renders subtitle for price; uses `note` instead. */
  subtitleSlot?: ReactNode
  /** Magazine-only operator-written comment that sits below the headline
   *  price. Lives on trip_projects.price_note. Same sparse-by-design
   *  pattern as accommodations.note: public viewer sees it only when
   *  filled; owner sees a placeholder pill when empty. */
  note?: string | null
  /** Owner-mode save callback for `note`. Returns true on success.
   *  Trip-page-client wires this to saveProjectPatch({ priceNote: next }). */
  onNoteChange?: (next: string | null) => Promise<boolean>
  /** Magazine-only — included / not-included copy moves into the right
   *  column of the Price block (replacing the old "Ready to talk it
   *  through?" CTA, which now lives only in the page-level Contacts
   *  section + the in-hero ContactAgentMenu). Owner sees a multi-line
   *  EditableField (one item per line); public sees the lines joined
   *  with commas as inline prose. Trip-page-client wires these from
   *  p.included / p.not_included. Editorial / expedition / compact
   *  themes ignore these — they keep rendering TripIncluded as a
   *  separate section. */
  included?: string | null
  notIncluded?: string | null
  onSaveIncluded?: (next: string) => Promise<boolean>
  onSaveNotIncluded?: (next: string) => Promise<boolean>
}

/**
 * Price block — single source of truth for the price headline + secondary
 * total line + the mode dropdown.
 *
 * Mode semantics (matches reconcilePricing on the backend):
 *   per_group     → headline = priceTotal,        suffix = "for the group"
 *   per_traveler  → headline = pricePerPerson,    suffix = "per traveler"
 *   other         → headline = priceTotal,        suffix = pricing_label
 *
 * Backend keeps both prices in sync, so flipping the mode is just a
 * render switch. In owner mode, editing the headline number PATCHes the
 * appropriate side (price_total for per_group/other, pricePerPerson for
 * per_traveler) and the backend rebuilds the other side.
 */
export function TripPrice(props: PriceProps) {
  if (!props.visible) return null

  if (props.theme === 'magazine') {
    return <PriceMagazine {...props} />
  }

  const mode: PricingMode = props.pricingMode ?? 'per_group'
  const headline =
    mode === 'per_traveler' ? props.pricePerPerson : props.priceTotal
  const headlineFormatted = fmtPrice(headline, props.currency || 'USD')

  const secondary =
    mode === 'per_traveler'
      ? props.priceTotal
      : props.pricePerPerson
  const secondaryFormatted = fmtPrice(secondary, props.currency || 'USD')
  const secondaryLabel =
    mode === 'per_traveler'
      ? UI.totalPrice
      : UI.perTraveler

  return (
    <section className="tp-section" id="price">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.price}</h2>
        </header>
        <div className="tp-price-block">
          {/* Headline row: amount + suffix (suffix is a dropdown in owner mode). */}
          <div className="tp-price-headline">
            {props.editable ? (
              <HeadlineAmountEditor
                value={headline}
                currency={props.currency || 'USD'}
                onSave={async (v) => {
                  if (!props.saveProjectPatch) return false
                  const patch: Record<string, any> =
                    mode === 'per_traveler'
                      ? { pricePerPerson: v }
                      : { priceTotal: v }
                  return props.saveProjectPatch(patch)
                }}
                onSaveCurrency={async (next) => {
                  if (!props.saveProjectPatch) return false
                  return props.saveProjectPatch({ currency: next })
                }}
              />
            ) : (
              <span className="tp-price-amount">
                {headlineFormatted ?? '—'}
              </span>
            )}
            <PriceModeSuffix
              mode={mode}
              pricingLabel={props.pricingLabel}
              editable={props.editable}
              saveProjectPatch={props.saveProjectPatch}
            />
          </div>

          {/* Secondary line: shown only when secondary value exists AND mode
              isn't 'other' (in 'other' the per-traveler split is meaningless
              if the headline isn't a per-group total). Group size annotation
              attaches to the total-side line. */}
          {mode !== 'other' && secondaryFormatted && (
            <p className="tp-price-secondary">
              {secondaryLabel}:{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {secondaryFormatted}
              </span>
              {mode === 'per_traveler' && props.groupSize != null && (
                <> · {props.groupSize} {UI.travelers}</>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Headline amount editor (owner mode only) ── */

function HeadlineAmountEditor({
  value,
  currency,
  onSave,
  onSaveCurrency,
}: {
  value: number | null
  currency: string
  onSave: (v: number | null) => Promise<boolean>
  onSaveCurrency: (next: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  const glyph = currencyGlyph(currency)
  const numberPart = value != null ? value.toLocaleString('en-US') : null

  if (!editing) {
    return (
      <span className="tp-price-amount">
        {/* Glyph is the currency picker. The native <select> sits on
            top of it as a transparent overlay so a click anywhere on
            the glyph opens the OS dropdown — no separate UI element,
            no popover. The visual character (\$, €, …) is the trigger. */}
        <span className="tp-price-currency-trigger">
          <span aria-hidden="true">{glyph}</span>
          <select
            className="tp-price-currency-overlay"
            aria-label="Currency"
            value={currency.toUpperCase()}
            onChange={async (e) => {
              const next = e.target.value
              if (next !== currency.toUpperCase()) {
                await onSaveCurrency(next)
              }
            }}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </span>
        <span
          onClick={() => {
            setDraft(value != null ? String(value) : '')
            setEditing(true)
          }}
          style={{ cursor: 'text' }}
        >
          {numberPart ?? <span style={{ color: 'var(--ink-mute)' }}>Add price</span>}
        </span>
      </span>
    )
  }

  return (
    <span className="tp-price-amount">
      <span aria-hidden="true">{glyph}</span>
      <input
        className="tp-price-input"
        type="number"
        step="1"
        min="0"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={async () => {
          const trimmed = draft.trim()
          const next = trimmed === '' ? null : Number(trimmed)
          if (next !== value && (next === null || !Number.isNaN(next))) {
            await onSave(next)
          }
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(value != null ? String(value) : '')
            setEditing(false)
          }
        }}
      />
    </span>
  )
}

/* ── Mode suffix: dropdown in owner mode, plain text in public ── */

function PriceModeSuffix({
  mode,
  pricingLabel,
  editable,
  saveProjectPatch,
}: {
  mode: PricingMode
  pricingLabel: string | null
  editable: boolean
  saveProjectPatch?: Mutations['saveProjectPatch']
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(pricingLabel || '')

  if (!editable) {
    // Public render — quiet, formatted suffix beneath the headline.
    return (
      <p className="tp-price-meta">
        {mode === 'per_traveler'
          ? UI.perTraveler
          : mode === 'other'
            ? pricingLabel || UI.forTheGroup
            : UI.forTheGroup}
      </p>
    )
  }

  // Owner — dropdown selector. Mode flip is reactive: change → toast →
  // backend reconciles → revalidate. The custom-label input sits below
  // the select and only renders in 'other' mode.
  return (
    <div className="tp-price-mode">
      <select
        className="tp-price-mode-select"
        value={mode}
        onChange={async (e) => {
          if (!saveProjectPatch) return
          const next = e.target.value as PricingMode
          await saveProjectPatch({ pricingMode: next })
        }}
      >
        <option value="per_group">{UI.forTheGroup}</option>
        <option value="per_traveler">{UI.perTraveler}</option>
        <option value="other">Other (custom label)</option>
      </select>

      {mode === 'other' && (
        <div className="tp-price-mode-label">
          {editingLabel ? (
            <input
              className="tp-price-mode-label-input"
              value={labelDraft}
              autoFocus
              placeholder="e.g. for 2 adults + 1 child"
              maxLength={100}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={async () => {
                if (saveProjectPatch) {
                  const v = labelDraft.trim()
                  await saveProjectPatch({ pricingLabel: v || null })
                }
                setEditingLabel(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setLabelDraft(pricingLabel || '')
                  setEditingLabel(false)
                }
              }}
            />
          ) : (
            <span
              onClick={() => {
                setLabelDraft(pricingLabel || '')
                setEditingLabel(true)
              }}
              style={{ cursor: 'text' }}
            >
              {pricingLabel || (
                <span style={{ color: 'var(--ink-mute)' }}>
                  Click to add a label
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Currency choices (used by the headline glyph picker) ── */
//
// Mirrors lib/trip-format.ts:CURRENCY_GLYPH so the formatter and the
// picker stay in lock-step. The glyph itself is the trigger — no
// standalone select component.

const SUPPORTED_CURRENCIES: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD (CA$)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CHF', label: 'CHF' },
]

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine variant — 2-col grid on desktop (left: headline price + suffix
 * + optional operator note, right: fine-print + INQUIRE button), stacked
 * on mobile.
 *
 * Public viewer sees ONLY:
 *   1. headline price
 *   2. suffix line — group-aware ("for your group of N people" /
 *      "per person in your group of N people" / custom label).
 *      When groupSize is null, no suffix is shown — just the price.
 *      Custom-label mode shows the operator's label regardless of groupSize.
 *   3. operator-written `note` if filled (sparse: hidden when empty)
 *
 * Owner mode keeps every existing affordance:
 *   - currency picker glyph + inline number editor
 *   - mode dropdown (per_group / per_traveler / other) + custom-label input
 *   - secondary line (PER TRAVELER · CA$1,171 / TOTAL · CA$4,684)
 *   - GROUP · N TRAVELERS line (editable group size)
 *   - the same `note` field, with placeholder pill when empty
 *
 * Re-uses HeadlineAmountEditor and PriceModeSuffix (owner branch) so the
 * editors keep their existing behaviour.
 */
function PriceMagazine(props: PriceProps) {
  const mode: PricingMode = props.pricingMode ?? 'per_group'
  const headline =
    mode === 'per_traveler' ? props.pricePerPerson : props.priceTotal
  const headlineFormatted = fmtPrice(headline, props.currency || 'USD')

  const secondary =
    mode === 'per_traveler' ? props.priceTotal : props.pricePerPerson
  const secondaryFormatted = fmtPrice(secondary, props.currency || 'USD')
  const secondaryLabel =
    mode === 'per_traveler' ? UI.totalPrice : UI.perTraveler

  // Public-mode suffix copy — group-aware, never shown in owner mode
  // (owner has the dropdown widget instead).
  const publicSuffix: string | null = (() => {
    if (mode === 'other') {
      // Operator's custom label wins regardless of groupSize.
      return props.pricingLabel || null
    }
    if (props.groupSize == null) {
      // No group-size set → just the price, no suffix.
      return null
    }
    if (mode === 'per_traveler') {
      return `per person in your group of ${props.groupSize} people`
    }
    return `for your group of ${props.groupSize} people`
  })()

  return (
    <section className="tp-mag-section tp-mag-price" id="price">
      <div className="tp-mag-container">
        <header className="tp-mag-price__header">
          <hr className="tp-mag-rule" />
          <p className="tp-mag-eyebrow tp-mag-price__eyebrow">PRICE</p>
        </header>

        <div className="tp-mag-price__grid">
          <div className="tp-mag-price__left">
            <div className="tp-mag-price__headline-row">
              {props.editable ? (
                <HeadlineAmountEditor
                  value={headline}
                  currency={props.currency || 'USD'}
                  onSave={async (v) => {
                    if (!props.saveProjectPatch) return false
                    const patch: Record<string, any> =
                      mode === 'per_traveler'
                        ? { pricePerPerson: v }
                        : { priceTotal: v }
                    return props.saveProjectPatch(patch)
                  }}
                  onSaveCurrency={async (next) => {
                    if (!props.saveProjectPatch) return false
                    return props.saveProjectPatch({ currency: next })
                  }}
                />
              ) : (
                <span className="tp-mag-price__headline">
                  {headlineFormatted ?? '—'}
                </span>
              )}
            </div>

            {/* Owner — full mode controls (dropdown + custom-label input).
                Public — single quiet suffix line, group-aware. */}
            {props.editable ? (
              <div className="tp-mag-price__suffix">
                <PriceModeSuffix
                  mode={mode}
                  pricingLabel={props.pricingLabel}
                  editable={props.editable}
                  saveProjectPatch={props.saveProjectPatch}
                />
              </div>
            ) : publicSuffix ? (
              <p className="tp-mag-price__public-suffix">{publicSuffix}</p>
            ) : null}

            {/* Owner-only diagnostic rows: secondary line + GROUP · N TRAVELERS.
                These are NEVER shown to the tourist — public sees only the
                headline + one-line suffix above. */}
            {props.editable && mode !== 'other' && secondaryFormatted && (
              <p className="tp-mag-price__secondary">
                {secondaryLabel.toUpperCase()} ·{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {secondaryFormatted}
                </span>
              </p>
            )}

            {props.editable && (
              <p className="tp-mag-price__group">
                {UI.group.toUpperCase()} ·{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  <EditableField
                    as="number"
                    editable
                    value={props.groupSize}
                    placeholder="0"
                    onSave={async (v) => {
                      if (!props.saveProjectPatch) return false
                      return props.saveProjectPatch({ groupSize: v })
                    }}
                  />
                  {' '}{UI.travelers.toUpperCase()}
                </span>
              </p>
            )}

            {/* Operator-written comment block — sparse-by-design.
                Public viewer sees it only when filled; owner sees a
                placeholder pill when empty. */}
            <PriceBlockNote
              note={props.note ?? null}
              editable={props.editable}
              onNoteChange={props.onNoteChange}
            />
          </div>

          <div className="tp-mag-price__right">
            <PriceDetails
              kind="in"
              source={props.included ?? null}
              editable={props.editable}
              onSave={props.onSaveIncluded}
            />
            <PriceDetails
              kind="out"
              source={props.notIncluded ?? null}
              editable={props.editable}
              onSave={props.onSaveNotIncluded}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Included / Not-included slot inside the Magazine price block's right
 * column. Replaces the old in-section CTA — the contact CTA already
 * lives in the page-level Contacts section, the in-hero ContactAgentMenu,
 * and the mobile MagazineStickyBar; a fourth in the price block was
 * redundant.
 *
 * Single rendering for both viewports and both roles:
 *   Public viewer: <ul> of <li>, one operator-authored line per row,
 *     preserving any "-" / "•" prefixes the operator typed. Hidden
 *     when source is empty (sparse-by-design).
 *   Owner: multi-line EditableField, one item per line. The visible
 *     text on rest matches the public render byte-for-byte so toggling
 *     between owner and preview-as-client is jump-free.
 */
function PriceDetails({
  kind,
  source,
  editable,
  onSave,
}: {
  kind: 'in' | 'out'
  source: string | null
  editable: boolean
  onSave?: (next: string) => Promise<boolean>
}) {
  const heading = kind === 'in' ? 'Included' : 'Not included'

  // Public viewer: single rendering — same structure mobile and desktop
  // — to match the owner-side authoring surface byte-for-byte. Each
  // non-empty source line becomes one <li>; leading "-" / "•" / "·"
  // bullets the operator typed are preserved verbatim because that's
  // exactly what the operator sees in the editor and on the agent
  // screenshot Vadim flagged. We only strip lines that are visually
  // empty (whitespace only) so an accidental blank row doesn't render
  // as a phantom list item.
  if (!editable) {
    if (!source) return null
    const items = source
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
    if (items.length === 0) return null
    return (
      <div className="tp-mag-price__details">
        <p className="tp-mag-price__details-heading">{heading}</p>
        <ul className="tp-mag-price__details-list">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }

  // Owner mode: always render the slot (even when empty) so the
  // operator can click into the EditableField placeholder. Multi-line
  // textarea preserves the per-line input pattern from the old
  // TripIncluded block. Owner sees a single edit surface — viewport
  // doesn't change the authoring shape.
  return (
    <div className="tp-mag-price__details">
      <p className="tp-mag-price__details-heading">{heading}</p>
      <div className="tp-mag-price__details-edit">
        <EditableField
          as="multiline"
          editable
          value={source ?? ''}
          placeholder="One item per line"
          rows={4}
          onSave={async (v) => {
            if (!onSave) return false
            return onSave(v)
          }}
        />
      </div>
    </div>
  )
}

/**
 * Operator-written comment for the Price block — same pattern as
 * BlockNote in accommodations.tsx. Lives on `trip_projects.price_note`.
 *
 * Public viewer with empty value renders nothing (no reserved space).
 * Owner sees the EditableField with placeholder hint when empty.
 */
function PriceBlockNote({
  note,
  editable,
  onNoteChange,
}: {
  note: string | null
  editable: boolean
  onNoteChange?: (next: string | null) => Promise<boolean>
}) {
  if (!editable && !note) return null
  if (!editable) {
    return <p className="tp-mag-price__note">{note}</p>
  }
  return (
    <div className="tp-mag-price__note-slot">
      <EditableField
        as="text"
        value={note ?? ''}
        editable
        placeholder="Add a comment for the price (e.g. Includes a 10% early-bird discount)"
        maxLength={500}
        className="tp-mag-price__note"
        onSave={async (v) => {
          if (!onNoteChange) return false
          const trimmed = v.trim()
          return onNoteChange(trimmed.length > 0 ? trimmed : null)
        }}
      />
    </div>
  )
}
