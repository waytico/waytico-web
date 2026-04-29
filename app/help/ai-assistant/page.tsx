import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'AI assistant — Waytico',
  description:
    'A friendly guide to the AI assistant on your quote page. What it can change, what it leaves alone, and how to talk to it.',
}

export default function AiAssistantGuidePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <header className="space-y-3 pb-4">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-mono">
              Editing your quote
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Your AI assistant
            </h1>
            <p className="text-lg text-foreground/60 leading-relaxed">
              At the bottom of every quote page there&apos;s a chat bar.
              Type whatever you want changed — in plain words, like
              you&apos;d ask a colleague — and it just happens. Here&apos;s
              what it can do for you, with examples.
            </p>
          </header>

          <p className="text-foreground/70 leading-relaxed">
            This guide covers the assistant on the <em>quote</em> phase —
            i.e. before your client confirms. Once a trip goes active,
            the assistant gets more powers (tasks, documents, client
            info, reminders) — we&apos;ll write that up properly when
            it&apos;s ready.
          </p>

          <Section title="The headline stuff">
            <p>
              All the top-of-page fields are fair game. Title, region,
              country, dates, group size, activity type, price (per
              person or for the group), currency, what&apos;s included
              and not included, your terms.
            </p>
            <p>
              Plus the two dates in the corner of the hero:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-1.5 text-foreground/80 marker:text-foreground/40">
              <li>
                <strong className="font-semibold">Issued</strong> — when
                you sent this proposal
              </li>
              <li>
                <strong className="font-semibold">Valid until</strong> —
                how long the price holds
              </li>
            </ul>
            <p>
              And the <strong className="font-semibold">tagline</strong>{' '}
              right under the title — a short poetic line, five to
              twelve words, the mood of the trip in one breath.
            </p>
            <Examples
              items={[
                'Rename it to "Vancouver Family Escape"',
                'Set the group to 4 and bump the price to 9000 CAD',
                'Write a tagline like "Ocean cliffs and old-growth forest, in five unhurried days"',
                'Issued today, valid until July 15',
                'Add ferries and entry tickets to Included; put personal expenses under Not included',
              ]}
            />
            <Aside>
              <strong>Heads up:</strong> the assistant doesn&apos;t change
              the visual theme (Classic / Cinematic / Clean) — that&apos;s
              the dropdown in the action bar above the page. If you ask,
              it&apos;ll just point you there.
            </Aside>
          </Section>

          <Section title="The day-by-day plan">
            <p>
              Add days, remove them, swap their order, rewrite the
              description, change the title or the date. Each day is
              just a title, a date, and a paragraph — the specifics
              (flight numbers, hotel names, times, addresses) live as
              flowing prose inside that paragraph, not in separate
              fields.
            </p>
            <Examples
              items={[
                'Rewrite Day 3 shorter — keep the main idea',
                'Add Day 6 — transfer back to YVR after 11 a.m.',
                'Swap Day 2 and Day 3',
                'On Day 4, mention a stop at Brandywine Falls along the way',
                'Delete Day 5',
              ]}
            />
            <Aside>
              <strong>Good to know:</strong> photos you&apos;ve uploaded
              for a particular day stay attached to that day even if
              you reorder things or insert a new day in the middle.
              Nothing gets shuffled out from under you.
            </Aside>
          </Section>

          <Section title="Hotels, lodges, camps">
            <p>
              The Accommodations section is its own block on the page —
              cards with a name, an optional one-to-three-sentence
              description, and an optional photo. Add, edit, delete,
              reorder.
            </p>
            <Examples
              items={[
                'Add a card for Fairmont Pacific Rim, one line about the harbour view',
                'Drop the hostel card — we&apos;re not using it',
                'On Wickaninnish Inn, mention the storm-watching season',
                'Move Sonora Resort to the top',
              ]}
            />
            <p>
              Photos for these cards: drop one onto the card directly.
              You can ask the assistant to make the card first and add
              the photo yourself afterwards — just remember the
              assistant itself doesn&apos;t accept photos in chat, you
              place them on the card.
            </p>
            <Aside>
              <strong>One subtle thing:</strong> a hotel card on this
              section is different from <em>mentioning</em> the same
              hotel in a day&apos;s description. The assistant will
              write the mention for you when it makes sense, but a card
              is a separate request.
            </Aside>
          </Section>

          <Section title="How to talk to it">
            <p className="font-semibold text-foreground">
              What it&apos;s careful about:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-1.5 text-foreground/80 marker:text-foreground/40">
              <li>
                Doesn&apos;t make up prices, dates, hotel names, or phone
                numbers. If you didn&apos;t say it, it asks or leaves
                the field empty.
              </li>
              <li>
                Doesn&apos;t touch what you didn&apos;t ask about. Tell
                it to fix Day 3 and Days 1, 2, 4, 5 stay exactly as
                they were.
              </li>
              <li>
                Replies short — a sentence or two — in the trip&apos;s
                language.
              </li>
              <li>
                If something&apos;s ambiguous, it asks one quick
                question instead of guessing.
              </li>
            </ul>

            <p className="font-semibold text-foreground mt-6">
              What it doesn&apos;t do:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-1.5 text-foreground/80 marker:text-foreground/40">
              <li>Switch the visual theme — that&apos;s the action bar.</li>
              <li>Activate the trip or charge anyone — that&apos;s a manual step.</li>
              <li>Email your client.</li>
              <li>Touch any other trips — only the one you&apos;re on.</li>
            </ul>

            <p className="text-foreground/80 leading-relaxed mt-6">
              You can stack things in one message:{' '}
              <em>
                &quot;add two days at the end, set the price to 8500,
                tighten the tagline&quot;
              </em>{' '}
              — that&apos;s one message, three things done.
            </p>
          </Section>

          <Section title="If something doesn&apos;t click">
            <p>
              Try being a touch more specific. <em>&quot;On Day 2,
              swap Capilano for Lynn Canyon&quot;</em> works better
              than <em>&quot;make Day 2 more interesting&quot;</em> —
              not because the assistant is bossy, but because specific
              edits give it something concrete to do.
            </p>
            <p className="text-foreground/70">
              Still stuck? Email{' '}
              <a
                href="mailto:hello@waytico.com"
                className="text-primary hover:underline underline-offset-2"
              >
                hello@waytico.com
              </a>{' '}
              and tell us what you tried — we read every one.
            </p>
          </Section>

          <hr className="border-border/60 my-12" />

          <p className="text-sm text-foreground/50 italic">
            More features unlock once your client confirms the trip and
            you activate the page — task lists, document parsing,
            reminders, the client&apos;s own contact card. We&apos;ll
            write a separate guide for that.{' '}
            <Link href="/help" className="text-primary hover:underline underline-offset-2 not-italic">
              Back to Help
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 pt-6">
      <h2 className="text-2xl md:text-3xl font-serif font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-4 text-foreground/80 leading-relaxed">{children}</div>
    </section>
  )
}

function Examples({ items }: { items: string[] }) {
  return (
    <div className="my-2 rounded-xl border border-border/70 bg-secondary/40 px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-foreground/50 font-mono mb-3">
        Try saying
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-foreground/80 leading-relaxed before:content-['“'] before:text-foreground/40 before:mr-0.5 after:content-['”'] after:text-foreground/40 after:ml-0.5"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-foreground/65 leading-relaxed border-l-2 border-primary/30 pl-4 italic">
      {children}
    </p>
  )
}
