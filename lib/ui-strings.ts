/**
 * Shared trip-page UI strings.
 *
 * Per TZ-6 §2.2: section labels and small invariant copy are IDENTICAL
 * across all three themes. No theme is allowed to invent decorative
 * text ("Chapter I", "§ 01 — BRIEFING", etc.) — anything visible to
 * the reader lives here.
 */

export const UI = {
  sectionLabels: {
    overview: 'Overview',
    itinerary: 'Itinerary',
    accommodations: 'Accommodations',
    included: "What's included",
    price: 'Price',
    terms: 'Terms',
    contacts: 'Contacts',
  },
  perTraveler: 'per traveler',
  forTheGroup: 'for the group',
  travelers: 'travelers',
  traveler: 'traveler',
  days: 'days',
  day: 'day',
  notIncluded: 'Not included',
  included: 'Included',
  proposal: 'Proposal',
  validUntil: 'Valid until',
  totalPrice: 'Total',
  bookCta: 'Reserve dates',
  contactsHeading: 'Questions about this trip?',
  emptyList: 'Nothing listed.',
  segType: {
    transport: 'Transport',
    activity: 'Activity',
    meal: 'Meal',
    accommodation: 'Accommodation',
    free_time: 'Free time',
    other: 'Note',
  } as Record<string, string>,
  status: {
    draft: 'Draft',
    quoted: 'Quoted',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  } as Record<string, string>,
} as const

export type SectionLabel = keyof typeof UI.sectionLabels
