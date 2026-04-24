import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  DM_Sans,
  JetBrains_Mono,
  Fraunces,
  Inter,
  Inter_Tight,
  Archivo,
} from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

// ------------------------------------------------------------------
// Fonts
// ------------------------------------------------------------------
// Default / Journal theme fonts — preloaded (most trips use Journal).
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

// Theme-specific fonts — not preloaded; loaded on-demand when a page uses
// them. This keeps first-paint payload small (Journal-only ≈ 3 fonts).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-inter-tight',
  display: 'swap',
  preload: false,
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
  preload: false,
})

const fontVars = [
  cormorant.variable,
  dmSans.variable,
  jetbrainsMono.variable,
  fraunces.variable,
  inter.variable,
  interTight.variable,
  archivo.variable,
].join(' ')

export const metadata: Metadata = {
  title: 'Waytico — AI Trip Proposal Pages',
  description: 'Create beautiful trip proposal pages in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#C4622D',
          colorBackground: '#FAF8F5',
          colorInputBackground: '#FFFFFE',
          colorText: '#2C2420',
          colorTextSecondary: '#8B7F78',
          colorDanger: '#B54848',
          colorSuccess: '#6B8E5A',
          colorNeutral: '#2C2420',
          colorShimmer: '#F0E4DA',
          borderRadius: '0.625rem',
          fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
          fontFamilyButtons: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
          fontSize: '0.9375rem',
        },
        elements: {
          rootBox: 'mx-auto',
          card: 'bg-card border border-border shadow-sm',
          headerTitle: 'font-serif text-2xl text-foreground',
          headerSubtitle: 'text-muted-foreground',
          formButtonPrimary:
            'bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-none normal-case',
          formFieldLabel: 'text-foreground/80 text-sm font-medium',
          formFieldInput:
            'bg-input border border-border text-foreground focus:border-accent focus:ring-2 focus:ring-accent/30',
          socialButtonsBlockButton:
            'border border-border hover:bg-highlight text-foreground',
          socialButtonsBlockButtonText: 'font-medium',
          footerActionLink: 'text-accent hover:text-accent/80',
          identityPreviewEditButton: 'text-accent hover:text-accent/80',
        },
      }}
    >
      <html lang="en" className={fontVars}>
        <body className="font-sans antialiased">
          {children}
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  )
}
