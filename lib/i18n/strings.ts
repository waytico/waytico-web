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
  /** Plural-aware day word — selected via pluralize(). Russian needs
   *  three forms: 1 день / 2-4 дня / 5+ дней. English uses one/many. */
  daysOne: string
  daysFew: string
  daysMany: string
  traveler: string
  travelers: string
  /** Plural-aware traveler/person word for the owner-side GROUP editor
   *  ("GROUP · 4 ЧЕЛОВЕКА"). Same shape as days: en uses one/many, ru
   *  uses three forms (1 человек / 2-4 человека / 5+ человек). */
  travelersOne: string
  travelersFew: string
  travelersMany: string
  /** Plural-aware "person/people" word for embedding inside group
   *  suffix templates ("for your group of N people"). In English this
   *  is a different word from "traveler" (person/people vs traveler/
   *  travelers); in Russian both collapse to "человек / человека /
   *  человек". Separate keys keep the en grammar correct. */
  peopleOne: string
  peopleFew: string
  peopleMany: string
  group: string
  included: string
  notIncluded: string
  perTraveler: string
  forTheGroup: string
  /** Public-suffix templates rendered under the Magazine headline price.
   *  {n} is the integer group size, {people} the pluralised person word.
   *  EN: "for your group of 4 people" / "per person in your group of 4 people".
   *  RU: "для вашей группы из 4 человек" / "с человека в группе из 4 человек". */
  forYourGroupOfN: string
  perPersonInGroupOfN: string
  /** Pricing-mode dropdown — "Other" option label + the inline custom-
   *  label editor's placeholder (input) and empty-state hint (span). */
  priceModeOther: string
  priceModeOtherPlaceholder: string
  priceModeOtherClickAdd: string
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

  /**
   *  Link-preview metadata (Open Graph) shown when the trip URL is
   *  pasted into WhatsApp / Telegram / iMessage / Slack etc. Two
   *  variants drive different operator intents:
   *    `newTrip`     — first share or re-share without changes (Send).
   *    `tripUpdated` — re-share after edits (Save & notify).
   *  Both are intentionally label-free: a chat message already carries
   *  the sender's identity in the recipient's chat list, and naming
   *  the operator inline runs into Russian declension issues anyway.
   */
  linkPreview: {
    newTrip: string
    tripUpdated: string
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
    daysOne: 'day',
    daysFew: 'days',
    daysMany: 'days',
    traveler: 'traveler',
    travelers: 'travelers',
    travelersOne: 'traveler',
    travelersFew: 'travelers',
    travelersMany: 'travelers',
    peopleOne: 'person',
    peopleFew: 'people',
    peopleMany: 'people',
    group: 'Group',
    included: 'Included',
    notIncluded: 'Not included',
    perTraveler: 'per traveler',
    forTheGroup: 'for the group',
    forYourGroupOfN: 'for your group of {n} {people}',
    perPersonInGroupOfN: 'per person in your group of {n} {people}',
    priceModeOther: 'Other (custom label)',
    priceModeOtherPlaceholder: 'e.g. for 2 adults + 1 child',
    priceModeOtherClickAdd: 'Click to add a label',
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
    linkPreview: {
      newTrip: 'You got a new trip',
      tripUpdated: 'Trip updated',
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
    daysOne: 'день',
    daysFew: 'дня',
    daysMany: 'дней',
    traveler: 'человек',
    travelers: 'человек',
    travelersOne: 'человек',
    travelersFew: 'человека',
    travelersMany: 'человек',
    peopleOne: 'человека',
    peopleFew: 'человек',
    peopleMany: 'человек',
    group: 'Группа',
    included: 'Включено',
    notIncluded: 'Не включено',
    perTraveler: 'с человека',
    forTheGroup: 'за группу',
    forYourGroupOfN: 'для вашей группы из {n} {people}',
    perPersonInGroupOfN: 'с человека в группе из {n} {people}',
    priceModeOther: 'Другое (своя подпись)',
    priceModeOtherPlaceholder: 'напр., для двоих взрослых и ребёнка',
    priceModeOtherClickAdd: 'Нажмите чтобы ввести подпись',
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
    linkPreview: {
      newTrip: 'Новый тур для вас',
      tripUpdated: 'Тур обновлён',
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
