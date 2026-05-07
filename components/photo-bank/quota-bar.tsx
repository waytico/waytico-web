'use client'

/**
 * Photo Bank — quota bar (TZ §7.1, paid-only).
 *
 * Stub: shown only when `plan === 'paid'`. Free users never see this
 * component; gating happens in the page client.
 */

export interface QuotaBarProps {
  usedBytes: number
  limitBytes: number
  photoCount: number
  processingCount?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function QuotaBar(props: QuotaBarProps) {
  const { usedBytes, limitBytes, photoCount, processingCount } = props
  const pct =
    limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0
  const overQuota = limitBytes > 0 && usedBytes > limitBytes
  return (
    <div className="mb-3 rounded border border-zinc-200 bg-white p-3 text-sm">
      <div className="flex items-center justify-between text-zinc-700">
        <span>
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)} · {photoCount} photos
          {processingCount ? ` · ${processingCount} processing` : ''}
        </span>
        {overQuota && (
          <span className="text-xs text-red-600">
            Over quota — suggest engine paused for new trips
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-zinc-100">
        <div
          className={overQuota ? 'h-full bg-red-500' : 'h-full bg-emerald-500'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
