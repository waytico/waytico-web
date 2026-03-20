import Image from "next/image"

interface PhotoBandProps {
  src?: string | null
  alt?: string
  overlayText?: string
  overlaySubtext?: string
  variant?: "dark" | "warm" | "teal"
}

const overlayVariants = {
  dark: "from-navy/80 via-navy/40 to-navy/80",
  warm: "from-[#3D1A0A]/70 via-[#3D1A0A]/30 to-[#3D1A0A]/70",
  teal: "from-navy/70 via-transparent to-navy/70",
}

const gradientBg = {
  dark: "bg-gradient-to-r from-navy via-navy-light to-navy",
  warm: "bg-gradient-to-r from-[#3D1A0A] via-coral/30 to-[#3D1A0A]",
  teal: "bg-gradient-to-r from-navy via-seafoam/20 to-navy",
}

export function PhotoBand({
  src,
  alt = "",
  overlayText,
  overlaySubtext,
  variant = "dark",
}: PhotoBandProps) {
  return (
    <section className="relative h-[30vh] min-h-[200px] overflow-hidden" aria-hidden={!overlayText}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill className="object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-r ${overlayVariants[variant]}`} />
        </>
      ) : (
        <div className={`absolute inset-0 ${gradientBg[variant]}`} />
      )}
      {overlayText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="font-serif text-[28px] font-semibold leading-[1.23] tracking-tight text-offwhite md:text-[42px] text-balance">
            {overlayText}
          </p>
          {overlaySubtext && (
            <p className="mt-2 text-[11px] font-medium tracking-[0.2em] text-offwhite/50 uppercase">
              {overlaySubtext}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
