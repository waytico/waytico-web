import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Pricing — Waytico',
  description:
    'Right now Waytico is free. When paid plans arrive, the model will be honest: pay per trip you run, plus an optional Pro subscription for advanced quote-building features.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Pricing
            </h1>
            <p className="text-lg text-foreground/60">
              Free today. Honest tomorrow.
            </p>
          </header>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Today
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Every feature available today is <strong className="font-semibold text-foreground">free</strong>.
            Unlimited quotes, AI editing, drag-and-drop, themes, sharing, branding,
            multi-language — all of it. No card on file, no trial timer.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;ll keep it that way for as long as we can. When that changes,
            you&apos;ll know well in advance.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What&apos;s coming
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Two ways to pay, both straightforward.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Per trip
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            When a client says yes and you turn the proposal into their live trip
            page — the place that actually runs the trip, with packing lists,
            deadlines, document uploads — you&apos;ll pay once, per page. One
            charge, one trip. No subscription required for this.
          </p>

          <h3 className="text-xl font-serif font-semibold mt-8 mb-2">
            Pro subscription
          </h3>
          <p className="text-foreground/80 leading-relaxed">
            For operators who want extra muscle while building proposals — we&apos;ll
            offer a monthly plan with advanced editing, custom branding,
            and other power features. Optional, in addition to per-trip pricing,
            and only worth paying for if you&apos;re running enough volume to feel it.
          </p>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            What we promise
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80 leading-relaxed">
            <li>
              <strong className="font-semibold text-foreground">No surprise bills.</strong>{' '}
              Real prices will be announced openly, on this page, with notice.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Quote-building stays free.</strong>{' '}
              Creating, editing, sharing proposals will not require a paid plan.
              Subscription is for advanced features, not basic ones.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Existing users get warning.</strong>{' '}
              If you&apos;re already on Waytico when paid plans launch, we&apos;ll
              email you, give you time to decide, and grandfather what we can.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-serif font-semibold mt-12 mb-3">
            Questions
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            We&apos;re a small team and a human reads every message. Write us at{' '}
            <a
              href="mailto:hello@waytico.com"
              className="text-primary hover:underline underline-offset-2"
            >
              hello@waytico.com
            </a>
            .
          </p>

          <p className="text-foreground/80 leading-relaxed pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 font-medium"
            >
              Try Waytico →
            </Link>{' '}
            <span className="text-foreground/60">— no account needed to start.</span>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
