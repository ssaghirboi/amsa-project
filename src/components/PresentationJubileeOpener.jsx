import { JUBILEE_OPENER_SIGNS } from '../constants/jubileeOpenerAssets'

/**
 * Jubilee-style title slide (reference): AMSA line, INSPIRED BY + script Jubilee,
 * DOES GOD EXIST with GOD emphasis, five signs framing center.
 */
export function PresentationJubileeOpener({ slide }) {
  const presenterLine =
    slide?.presenterLine ??
    'THE AHMADIYYA MUSLIM STUDENTS ASSOCIATION PRESENTS'
  const inspiredPrefix = slide?.inspiredPrefix ?? 'INSPIRED BY'
  const inspiredHighlight = slide?.inspiredHighlight ?? 'Jubilee'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="relative z-20 shrink-0 px-3 pt-1 text-center sm:px-6">
        <p className="mx-auto max-w-4xl text-[0.58rem] font-medium uppercase leading-snug tracking-[0.2em] text-slate-300/95 sm:text-[0.7rem] md:text-xs md:tracking-[0.22em]">
          {presenterLine}
        </p>
        <p className="mt-2.5 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0 sm:mt-4 md:mt-5">
          <span className="text-[0.7rem] font-normal uppercase tracking-[0.28em] text-white/95 sm:text-xs md:text-sm">
            {inspiredPrefix}
          </span>
          <span
            className="bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500 bg-clip-text pl-1 font-['Brush_Script_MT','Segoe_Script','Snell_Roundhand','URW_Chancery_L',cursive] text-[clamp(1.65rem,4.2vw,2.85rem)] font-normal leading-none text-transparent drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)] [-webkit-background-clip:text]"
          >
            {inspiredHighlight}
          </span>
        </p>
      </header>

      <div
        className="relative mt-1 min-h-[min(58vh,440px)] flex-1 overflow-hidden rounded-none sm:mt-2 md:min-h-[min(60vh,500px)]"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(30, 41, 59, 0.35) 0%, transparent 55%), radial-gradient(ellipse 100% 100% at 50% 100%, #020617 0%, transparent 42%)',
        }}
      >
        {/* Center: DOES / EXIST sans; GOD serif + soft halo (reference) */}
        <div
          className="pointer-events-none absolute left-1/2 top-[48%] z-40 w-[min(94vw,42rem)] -translate-x-1/2 -translate-y-1/2 px-2 text-center sm:top-1/2"
          aria-hidden
        >
          <p className="inline-block font-sans text-[clamp(1.35rem,4.8vw,2.5rem)] font-bold uppercase leading-[1.12] tracking-[0.06em] text-white [text-shadow:0_0_20px_rgba(255,255,255,0.25),0_2px_24px_rgba(0,0,0,0.45)]">
            <span className="align-middle">DOES </span>
            <span className="relative inline-block align-middle px-1">
              <span
                className="absolute inset-[-0.15em_-0.08em] -z-10 rounded-full bg-white/25 opacity-90 blur-xl"
                aria-hidden
              />
              <span
                className="relative font-serif text-[clamp(2rem,9vw,5.25rem)] font-bold capitalize not-italic leading-none tracking-normal text-white"
                style={{
                  textShadow:
                    '0 0 28px rgba(255,255,255,0.85), 0 0 52px rgba(255,255,255,0.45), 0 0 80px rgba(255,255,255,0.2)',
                }}
              >
                GOD
              </span>
            </span>
            <span className="align-middle"> EXIST</span>
          </p>
        </div>

        {JUBILEE_OPENER_SIGNS.map((s) => (
          <img
            key={s.key}
            src={s.src}
            alt={s.label}
            className={`pointer-events-none absolute max-w-none select-none ${s.className}`}
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}
