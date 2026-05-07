'use client'

/**
 * Photo Bank — sticky upgrade banner for free-tier users (TZ §7).
 *
 * Lives at the top of `/dashboard?view=photos` for any operator whose
 * `users.plan !== 'paid'`. CTA is informational today (no Stripe flow
 * shipped); copy mirrors the wording in TZ §7's mockup.
 */

export function PhotoBankUpgradeBanner() {
  return (
    <div
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4"
      role="region"
      aria-label="Upgrade to Photo Bank"
    >
      <p className="text-sm font-medium text-amber-900">
        Upgrade to upload your own photos
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Build a personal Photo Bank that powers all your trip proposals.
        Uploaded photos get auto-classified and matched to the right day
        in every trip you generate.
      </p>
      <p className="mt-2 text-xs text-amber-700">
        Below is a read-only preview of the global pool that powers free-tier matching.
      </p>
    </div>
  )
}
