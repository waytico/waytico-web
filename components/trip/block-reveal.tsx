"use client"

import { useEffect, useState, type ReactNode } from "react"

interface BlockRevealProps {
  ready: boolean
  children: ReactNode
  skeleton?: ReactNode
}

/**
 * Progressive reveal wrapper for pipeline-generated blocks.
 * Shows skeleton while block is not ready, fades in content once ready.
 */
export function BlockReveal({ ready, children, skeleton }: BlockRevealProps) {
  const [shown, setShown] = useState(ready)

  useEffect(() => {
    if (ready && !shown) {
      // Small delay to let the DOM paint the skeleton first
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
  }, [ready, shown])

  if (!ready) {
    return skeleton ? <>{skeleton}</> : null
  }

  return (
    <div
      className={`transition-opacity duration-700 ease-out ${shown ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  )
}