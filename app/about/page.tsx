import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'About Waytico',
  description:
    'Waytico helps small travel businesses turn a conversation into a client-ready proposal — then run the trip from the same page.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              About Waytico
            </h1>
            <p className="text-lg text-foreground/60">
              Built for the people actually running trips.
            </p>
          </header>

          <p className="text-foreground/80 leading-relaxed">
            Most travel software is built for big operators with big teams. That leaves the people
            doing the real work — independent guides, small tour operators, family-run lodges —
            juggling spreadsheets, PDFs, and messaging apps to do something software should have
            solved years ago.
          </p>
          <p className="text-foreground/80 leading-relaxed">Waytico is the tool we wish they had.</p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">What we do</h2>
          <p className="text-foreground/80 leading-relaxed">
            You describe a trip in plain language. Waytico turns it into a beautiful, shareable
            proposal page your client can open on any device. You can refine it endlessly — drag
            days around, change prices, edit any line of copy, add photos, talk to an AI assistant
            that does the boring parts for you.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            One link your client always opens to the latest version, however many times you tweak it.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Who we&apos;re for</h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              Independent guides who win clients on WhatsApp and want to look professional without
              hiring a designer
            </li>
            <li>Small tour operators who spend their evenings rewriting the same itinerary in Word</li>
            <li>
              Lodges and outfitters who&apos;ve outgrown email threads but can&apos;t justify enterprise
              software
            </li>
            <li>
              Anyone who sells experiences and wants their clients to feel taken care of from the
              first reply
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">What we believe</h2>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Your expertise is the product.</strong>{' '}
            You know your region, your routes, your people. Waytico doesn&apos;t replace that — it
            gets the boring parts out of your way so you can spend your time on the craft.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">Simple beats feature-rich.</strong>{' '}
            Every feature earns its place. If it doesn&apos;t help you sell more trips or run them
            better, it doesn&apos;t ship.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            <strong className="font-semibold text-foreground">
              Honest pricing, no surprise bills.
            </strong>{' '}
            Right now everything is free. When paid plans launch, the model will be straightforward:
            pay per trip you actually run, plus an optional subscription for power-user
            quote-building features. See the{' '}
            <a
              href="/pricing"
              className="text-primary hover:underline underline-offset-2"
            >
              pricing page
            </a>
            {' '}for what we&apos;ve committed to.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Where we&apos;re going
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Today, Waytico covers the part operators feel daily: writing a beautiful proposal and
            keeping it current as the conversation with the client evolves. Multi-language quotes
            already work — describe a trip in Spanish or Russian, the page renders in that
            language.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Coming next: turning a confirmed proposal into a full operational page — packing
            checklists, prep tasks with deadlines, document attachments, automatic client
            reminders. Same link your client already has, just more useful once they&apos;ve booked.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;re a small team and we ship things that matter.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">Get in touch</h2>
          <p className="text-foreground/80 leading-relaxed">
            Questions, feature ideas, or just want to say hi? Write us at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            . A human reads every message.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
