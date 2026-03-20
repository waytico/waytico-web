import React from "react"
import type { Metadata } from 'next'
import { Montserrat, Jost } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
})

const jost = Jost({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jost',
})

export const metadata: Metadata = {
  title: 'BiteScout — AI-Powered Trophy Fishing Trip Planner',
  description: 'Find the perfect fishing charter, guide, or lodge with AI-powered search. Compare operators, check availability, and plan your dream fishing trip.',
  keywords: [
    'fishing trip planner',
    'fishing charters',
    'fishing guides',
    'trophy fishing',
    'AI fishing assistant',
    'book fishing trip',
    'fishing lodges',
    'compare fishing charters',
    'fishing trip search engine',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  referrer: 'origin-when-cross-origin',
  icons: {
    icon: '/favicon.svg',
  },
  verification: {},
  openGraph: {
    title: 'BiteScout — AI-Powered Trophy Fishing Trip Planner',
    description: 'Find the perfect fishing charter, guide, or lodge. Verified database of 1,500+ operators with AI-powered search.',
    url: 'https://bitescout.com',
    siteName: 'BiteScout',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'BiteScout — AI-Powered Trophy Fishing Trip Planner',
    description: 'Find the perfect fishing charter, guide, or lodge. Verified database with AI-powered search.',
  },
  alternates: {
    canonical: 'https://bitescout.com',
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bitescout.com/#organization",
      "name": "BiteScout",
      "url": "https://bitescout.com",
      "email": "gofishing@bitescout.com",
      "description": "AI-powered trophy fishing trip planner with the world's largest verified database of fishing charters, guides, and lodges.",
    },
    {
      "@type": "WebSite",
      "@id": "https://bitescout.com/#website",
      "url": "https://bitescout.com",
      "name": "BiteScout",
      "publisher": { "@id": "https://bitescout.com/#organization" },
      "description": "Find and compare fishing charters, guides, and lodges worldwide using AI-powered search.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://bitescout.com/?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": "https://bitescout.com/#app",
      "name": "BiteScout",
      "url": "https://bitescout.com",
      "applicationCategory": "TravelApplication",
      "operatingSystem": "All",
      "description": "AI fishing assistant that searches a verified database of fishing charters, guides, and lodges to help anglers plan and book trophy fishing trips.",
      "provider": { "@id": "https://bitescout.com/#organization" },
      "offers": [
        {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "name": "Free",
          "description": "5 messages per day",
        },
        {
          "@type": "Offer",
          "price": "29",
          "priceCurrency": "USD",
          "name": "Pro",
          "description": "Unlimited messages, saved scouts, priority support",
          "billingDuration": "P1Y",
        },
      ],
      "featureList": [
        "AI-powered fishing trip recommendations",
        "Verified database of fishing operators",
        "Side-by-side charter comparison",
        "Natural language search",
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${montserrat.className} ${montserrat.variable} ${jost.variable} antialiased`}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
