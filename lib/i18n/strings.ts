/**
 * Magazine i18n dictionary.
 *
 * Source of truth for all client-facing UI strings on trip pages.
 * The `StringSet` shape is enforced by TypeScript — every language
 * MUST have all keys filled, otherwise the build fails. This is the
 * guard against accidentally shipping a half-translated page.
 *
 * To add a new language: add a new key to `LANGUAGES`, then add the
 * matching object under `STRINGS`. Don't forget `bcp47Locale` for
 * OpenGraph metadata — it lives inside the dictionary itself so adding
 * a language is a single-file, single-key change.
 *
 * Owner UI (action bar, command bar, edit pencils, drop-zone hints,
 * upload tosts, etc.) is intentionally NOT in this dictionary — it
 * stays English for the operator across all locales.
 */

export const LANGUAGES = ['en', 'ru'] as const
export type LanguageId = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: LanguageId = 'en'

export type StringSet = {
  /** BCP-47 locale code used for OpenGraph og:locale and similar metadata. */
  bcp47Locale: string

  sectionLabels: {
    overview: string
    itinerary: string
    accommodations: string
    included: string
    price: string
    terms: string
    contacts: string
  }

  // Single words / short copy
  day: string
  days: string
  traveler: string
  travelers: string
  group: string
  included: string
  notIncluded: string
  perTraveler: string
  forTheGroup: string
  totalPrice: string
  proposal: string
  validUntil: string
  expired: string
  bookCta: string
  contactsHeading: string
  contactsSubheading: string
  emptyList: string

  /** Magazine-only label for the combined "what's included / not included"
   *  section eyebrow. Reads as "DETAILS" (CSS uppercase). Distinct from
   *  `sectionLabels.included` which is the editorial section title. */
  magazineDetailsEyebrow: string

  // Internal status (operator-facing, but mirrored here so the shim
  // stays type-equivalent to the legacy UI export).
  status: Record<string, string>

  // Public-facing status pill (client-visible)
  publicStatus: {
    quote: string
    active: string
    completed: string
  }

  // Itinerary segment type labels
  segType: Record<string, string>

  // Hero
  hero: {
    tripHighlightsAria: string
  }

  // Contact agent CTA
  contactAgent: {
    defaultLabel: string
    inquireLabel: string
    /** Prefix used when the operator has set a contact handle/name
     *  (`owner.contact_label`) — final label = `${namedPrefix} ${handle}`.
     *  EN: "Contact Vadim". RU: "Напиши Вадим". */
    namedPrefix: string
  }

  // Terms section
  terms: {
    showLess: string
    readFull: string
  }

  // Contact channel labels (used in aria-label + tooltip on icons)
  contacts: {
    email: string
    phone: string
    whatsapp: string
    telegram: string
    instagram: string
    facebook: string
    youtube: string
    tiktok: string
    website: string
  }

  // ARIA labels for landmarks / regions
  a11y: {
    magazineSections: string
    shareTrip: string
    shareAndContact: string
  }

  // Share menu labels + toasts
  share: {
    email: string
    whatsapp: string
    telegram: string
    copyLink: string
    linkCopied: string
    couldNotCopy: string
  }
}

export const STRINGS: Record<LanguageId, StringSet> = {
  en: {
    bcp47Locale: 'en_US',
    sectionLabels: {
      overview: 'Overview',
      itinerary: 'Itinerary',
      accommodations: 'Accommodations',
      included: "What's included",
      price: 'Price',
      terms: 'Terms',
      contacts: 'Contacts',
    },
    day: 'Day',
    days: 'days',
    traveler: 'traveler',
    travelers: 'travelers',
    group: 'Group',
    included: 'Included',
    notIncluded: 'Not included',
    perTraveler: 'per traveler',
    forTheGroup: 'for the group',
    totalPrice: 'Total',
    proposal: 'Issued',
    validUntil: 'Valid until',
    expired: 'Expired',
    bookCta: 'Reserve dates',
    contactsHeading: 'Questions about this trip?',
    contactsSubheading: "Reach out — I'd love to hear from you.",
    emptyList: 'Nothing listed.',
    magazineDetailsEyebrow: 'Details',
    status: {
      draft: 'Draft',
      quoted: 'Quoted',
      active: 'Active',
      completed: 'Completed',
      archived: 'Archived',
    },
    publicStatus: {
      quote: 'Quote',
      active: 'Active',
      completed: 'Completed',
    },
    segType: {
      transport: 'Transport',
      activity: 'Activity',
      meal: 'Meal',
      accommodation: 'Accommodation',
      free_time: 'Free time',
      other: 'Note',
    },
    hero: {
      tripHighlightsAria: 'Trip highlights',
    },
    contactAgent: {
      defaultLabel: 'Contact agent',
      inquireLabel: 'Inquire',
      namedPrefix: 'Contact',
    },
    terms: {
      showLess: 'Show less',
      readFull: 'Read full terms',
    },
    contacts: {
      email: 'Email',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      website: 'Website',
    },
    a11y: {
      magazineSections: 'Magazine sections',
      shareTrip: 'Share trip',
      shareAndContact: 'Share and contact',
    },
    share: {
      email: 'Email',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      copyLink: 'Copy link',
      linkCopied: 'Link copied',
      couldNotCopy: 'Could not copy',
    },
  },

  ru: {
    bcp47Locale: 'ru_RU',
    sectionLabels: {
      overview: 'Описание',
      itinerary: 'Маршрут',
      accommodations: 'Размещение',
      included: 'Включено',
      price: 'Цена',
      terms: 'Условия',
      contacts: 'Контакты',
    },
    day: 'День',
    days: 'дней',
    traveler: 'человек',
    travelers: 'человек',
    group: 'Группа',
    included: 'Включено',
    notIncluded: 'Не включено',
    perTraveler: 'с человека',
    forTheGroup: 'за группу',
    totalPrice: 'Всего',
    proposal: 'Создано',
    validUntil: 'Действует до',
    expired: 'Истекло',
    bookCta: 'Забронировать',
    contactsHeading: 'Есть вопросы?',
    contactsSubheading: 'Напишите в любой удобный мессенджер',
    emptyList: 'Ничего не указано.',
    magazineDetailsEyebrow: 'Детали',
    status: {
      draft: 'Черновик',
      quoted: 'Предложение',
      active: 'Активно',
      completed: 'Завершено',
      archived: 'В архиве',
    },
    publicStatus: {
      quote: 'Предложение',
      active: 'Активно',
      completed: 'Завершено',
    },
    segType: {
      transport: 'Транспорт',
      activity: 'Активность',
      meal: 'Питание',
      accommodation: 'Проживание',
      free_time: 'Свободное время',
      other: 'Примечание',
    },
    hero: {
      tripHighlightsAria: 'Ключевые места',
    },
    contactAgent: {
      defaultLabel: 'Связаться с агентом',
      inquireLabel: 'Запросить',
      namedPrefix: 'Напиши',
    },
    terms: {
      showLess: 'Свернуть',
      readFull: 'Читать условия',
    },
    contacts: {
      email: 'Email',
      phone: 'Телефон',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      instagram: 'Instagram',
      facebook: 'Facebook',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      website: 'Сайт',
    },
    a11y: {
      magazineSections: 'Разделы страницы',
      shareTrip: 'Поделиться',
      shareAndContact: 'Поделиться и связаться',
    },
    share: {
      email: 'Email',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      copyLink: 'Скопировать ссылку',
      linkCopied: 'Ссылка скопирована',
      couldNotCopy: 'Не удалось скопировать',
    },
  },
}

/** Normalise any incoming language code to a known LanguageId.
 *  Accepts `null`, `undefined`, casing variants, BCP-47 with region
 *  ("en-US" → "en"). Unknown values fall back to DEFAULT_LANGUAGE. */
export function resolveLanguage(
  value: string | null | undefined,
): LanguageId {
  if (!value) return DEFAULT_LANGUAGE
  const head = value.toLowerCase().split(/[-_]/)[0]
  return (LANGUAGES as readonly string[]).includes(head)
    ? (head as LanguageId)
    : DEFAULT_LANGUAGE
}

/** Get the string dictionary for a given language. Safe to call from
 *  server components — pure synchronous lookup. */
export function getStrings(
  language: string | null | undefined,
): StringSet {
  return STRINGS[resolveLanguage(language)]
}
