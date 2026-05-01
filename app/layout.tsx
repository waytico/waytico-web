import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  DM_Sans,
  DM_Mono,
  Archivo_Black,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Playfair_Display,
} from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

// Default trip-page typography (editorial theme + global brand chrome)
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
  preload: false,
})

// Expedition theme typography
const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-archivo-black',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
})

// Compact theme typography
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter-tight',
  display: 'swap',
  preload: false,
})

// Serene theme display typography (used only inside [data-theme="serene"])
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Waytico — AI Trip Proposal Pages',
  description: 'Create beautiful trip proposal pages in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    cormorant.variable,
    dmSans.variable,
    dmMono.variable,
    archivoBlack.variable,
    inter.variable,
    interTight.variable,
    jetbrainsMono.variable,
    playfair.variable,
  ].join(' ')

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
