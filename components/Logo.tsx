"use client"

import Link from "next/link"

interface LogoProps {
  onLogoClick?: () => void
  variant?: "default" | "transparent"
}

export function Logo({ onLogoClick, variant = "default" }: LogoProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onLogoClick) {
      e.preventDefault()
      onLogoClick()
    }
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={
        variant === "transparent"
          ? "text-[11px] font-medium uppercase tracking-[0.3em] text-offwhite/80 hover:text-offwhite transition-colors"
          : "text-xl font-bold text-primary"
      }
    >
      BiteScout
    </Link>
  )
}
