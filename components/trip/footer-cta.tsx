import Image from "next/image"

interface FooterCTAProps {
  src?: string | null
  title?: string
}

export function FooterCTA({ src, title }: FooterCTAProps) {
  if (!src) return null

  return (
    <section className="relative h-[50vh] min-h-[300px] overflow-hidden">
      <Image src={src} alt={title || "Your adventure awaits"} fill className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/40 to-navy/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-[28px] font-semibold leading-[1.23] tracking-tight text-offwhite md:text-[42px] text-balance">
          Ready for Your Adventure?
        </p>
        <p className="mt-3 text-[14px] text-offwhite/60 max-w-md">
          {title ? `Your ${title} trip is waiting` : "Your fishing trip is waiting"}
        </p>
        <a
          href="https://bitescout.com"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-seafoam px-6 py-3 text-sm font-bold text-offwhite shadow-lg shadow-seafoam/20 transition-all hover:bg-seafoam-light hover:shadow-xl hover:shadow-seafoam/30"
        >
          Plan with BiteScout
        </a>
      </div>
    </section>
  )
}
