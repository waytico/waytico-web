'use client'

import { MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState, ReactNode } from 'react'

export type ActionItem = {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

type Props = {
  items: ActionItem[]
  ariaLabel?: string
}

export default function ActionMenu({ items, ariaLabel = 'Project actions' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleDown(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-10 min-w-[160px] rounded-md border border-border bg-card shadow-md py-1"
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
                if (!it.disabled) it.onClick()
              }}
              className={
                'w-full text-left px-3 py-1.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
                (it.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-foreground hover:bg-muted/50')
              }
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper to prevent parent Link click when rendering menu inside a Link wrapper
export function StopPropagationWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
