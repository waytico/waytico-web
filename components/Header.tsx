"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Share2, MapPin, ChevronDown } from "lucide-react"
import { Logo } from "./Logo"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { NotificationBell } from "./NotificationBell"

interface TripItem {
  slug: string
  title: string
  status: string
  region?: string
  country?: string
}

interface HeaderProps {
  onLogoClick?: () => void
  onCreateTrip?: () => void
  variant?: "default" | "transparent"
  onShare?: () => void
}

export function Header({ onLogoClick, onCreateTrip, variant = "default", onShare }: HeaderProps) {
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripItem[]>([])
  const [tripsOpen, setTripsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/subscription')
        .then(res => res.json())
        .then(data => {
          setSubscriptionPlan(data.subscription_plan || 'free')
        })
        .catch(err => console.error('Failed to fetch subscription:', err))
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isSignedIn && variant !== "transparent") {
      fetch('/api/trips/list')
        .then(res => res.json())
        .then(data => {
          const projects = Array.isArray(data) ? data : data.projects || []
          setTrips(projects.map((p: any) => ({
            slug: p.slug,
            title: p.title || "Untitled Trip",
            status: p.status,
            region: p.region,
            country: p.country,
          })))
        })
        .catch(() => {})
    }
  }, [isSignedIn, variant])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTripsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isBasic = subscriptionPlan === 'basic'
  const isPro = subscriptionPlan === 'pro'
  const isTransparent = variant === "transparent"

  const headerClassName = isTransparent
    ? "absolute top-0 left-0 right-0 z-20 w-full py-4 px-4 md:px-6"
    : "w-full py-4 px-4 md:px-6"

  const textClassName = isTransparent
    ? "text-offwhite/70 hover:text-offwhite transition-colors"
    : "text-muted-foreground hover:text-foreground transition-colors"

  const buttonClassName = isTransparent
    ? "bg-offwhite/10 text-offwhite border border-offwhite/20 px-4 py-2 rounded-md hover:bg-offwhite/20 transition-colors"
    : "bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-600",
    frozen: "bg-blue-100 text-blue-600",
    completed: "bg-sky-100 text-sky-700",
    cancelled: "bg-red-100 text-red-600",
    archived: "bg-gray-100 text-gray-400",
  }

  const activeTrips = trips.filter(t => t.status !== "archived")
  const archivedTrips = trips.filter(t => t.status === "archived")

  return (
    <header className={headerClassName}>
      <div className={`${isTransparent ? "max-w-6xl" : "max-w-[900px]"} mx-auto flex items-center justify-between`}>
        <Logo onLogoClick={onLogoClick} variant={variant} />
        <nav className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className={textClassName}>
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className={buttonClassName}>
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          
          <SignedIn>
            {onCreateTrip && (
              <button
                onClick={onCreateTrip}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Trip
              </button>
            )}
            {!isTransparent && trips.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                {activeTrips.length === 1 && archivedTrips.length === 0 ? (
                  <Link
                    href={`/trip/${activeTrips[0].slug}`}
                    className={`${textClassName} text-sm font-medium flex items-center gap-1.5`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    My Trip
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setTripsOpen(!tripsOpen)}
                      className={`${textClassName} text-sm font-medium flex items-center gap-1.5`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      My Trips
                      <ChevronDown className={`h-3 w-3 transition-transform ${tripsOpen ? "rotate-180" : ""}`} />
                    </button>
                    {tripsOpen && (
                      <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                        <div className="py-1 max-h-80 overflow-y-auto">
                          {activeTrips.map((trip) => (
                            <Link
                              key={trip.slug}
                              href={`/trip/${trip.slug}`}
                              onClick={() => setTripsOpen(false)}
                              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{trip.title}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {[trip.region, trip.country].filter(Boolean).join(", ")}
                                </p>
                              </div>
                              <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[trip.status] || "bg-gray-100 text-gray-600"}`}>
                                {trip.status}
                              </span>
                            </Link>
                          ))}
                          {archivedTrips.length > 0 && (
                            <>
                              <div className="px-4 py-2 border-t border-gray-100">
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Archived</p>
                              </div>
                              {archivedTrips.map((trip) => (
                                <Link
                                  key={trip.slug}
                                  href={`/trip/${trip.slug}`}
                                  onClick={() => setTripsOpen(false)}
                                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors opacity-60"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-500 truncate">{trip.title}</p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {[trip.region, trip.country].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                  <span className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-400">
                                    archived
                                  </span>
                                </Link>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {isTransparent && onShare && (
              <button
                onClick={onShare}
                className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Trip</span>
              </button>
            )}
            <NotificationBell />
            {!isTransparent && (
              (isBasic || isPro) ? (
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {isPro ? "Pro" : "Basic"}
                </span>
              ) : (
                <Link
                  href="/upgrade"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Upgrade
                </Link>
              )
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  )
}
