'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { PricingMode, Mutations, OperatorContact, OwnerBrand } from './trip-types'
import type { ThemeId } from '@/lib/themes'
import { fmtPrice, currencyGlyph } from '@/lib/trip-format'
import { ContactAgentMenu } from './contact-agent-menu'

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
  /** Magazine-only narrative subtitle slot under the eyebrow. */
  subtitleSlot?: ReactNode
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
 * Magazine variant — 2-col grid on desktop (left: headline price + suffix,
 * right: fine-print + INQUIRE button), stacked on mobile.
 *
 * Re-uses HeadlineAmountEditor and PriceModeSuffix from the editorial
 * branch so the owner-mode editors (number + currency picker + mode
 * dropdown + custom-label input) all keep their existing behaviour.
 * Only the wrapper markup + typography differ; pricingMode semantics
 * (per_group / per_traveler / other), backend reconcilePricing pairing
 * with priceTotal/pricePerPerson, and the suffix labels are unchanged.
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

  return (
    <section className="tp-mag-section tp-mag-price" id="price">
      <div className="tp-mag-container">
        <header className="tp-mag-price__header">
          <hr className="tp-mag-rule" />
          <p className="tp-mag-eyebrow tp-mag-price__eyebrow">V — INVESTMENT</p>
          {props.subtitleSlot && (
            <h2 className="tp-mag-display tp-mag-section-subtitle">
              {props.subtitleSlot}
            </h2>
          )}
        </header>

        <div className="tp-mag-price__grid">
          <div className="tp-mag-price__left">
            <p className="tp-mag-price__from">FROM</p>
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
            <div className="tp-mag-price__suffix">
              <PriceModeSuffix
                mode={mode}
                pricingLabel={props.pricingLabel}
                editable={props.editable}
                saveProjectPatch={props.saveProjectPatch}
              />
            </div>
            {mode !== 'other' && secondaryFormatted && (
              <p className="tp-mag-price__secondary">
                {secondaryLabel.toUpperCase()} ·{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {secondaryFormatted}
                </span>
                {mode === 'per_traveler' && props.groupSize != null && (
                  <> · {props.groupSize} {UI.travelers.toUpperCase()}</>
                )}
              </p>
            )}
          </div>

          <div className="tp-mag-price__right">
            <p className="tp-mag-price__copy">
              All prices in {props.currency?.toUpperCase() || 'USD'}. Final
              quote depends on dates, group size, and any add-ons. We&rsquo;ll
              tailor the proposal once you reach out.
            </p>
            <div className="tp-mag-price__cta">
              <p className="tp-mag-price__cta-prompt">
                Ready to talk it through?
              </p>
              <div className="tp-mag-price__cta-btn">
                <ContactAgentMenu
                  owner={props.owner ?? null}
                  operatorContact={props.operatorContact ?? null}
                  onPhoto={false}
                  label="Inquire"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
