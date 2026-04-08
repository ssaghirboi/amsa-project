import { JUBILEE_OPENER_SIGNS } from '../constants/jubileeOpenerAssets'

/**
 * First presentation slide: AMSA header + “Inspired by Jubilee” + opinion signs
 * + centered “DOES GOD EXIST” title (reference layout).
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
        <p className="mx-auto max-w-4xl text-[0.62rem] font-medium uppercase leading-snug tracking-[0.18em] text-slate-300 sm:text-xs md:text-[0.8125rem] md:tracking-[0.2em]">
          {presenterLine}
        </p>
        <p className="mt-3 text-[clamp(1.35rem,4.5vw,2.75rem)] font-medium leading-tight text-slate-100 sm:mt-5 md:mt-6">
          <span>{inspiredPrefix} </span>
          <span className="bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 bg-clip-text font-bold text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
            {inspiredHighlight}
          </span>
        </p>
      </header>

      <div className="relative mt-2 min-h-[min(56vh,420px)] flex-1 overflow-hidden sm:mt-3 md:min-h-[min(58vh,480px)]">
        {/* Center title — reference: DOES / EXIST sans, GOD larger serif + glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-[50%] z-30 w-[min(92vw,40rem)] -translate-x-1/2 -translate-y-1/2 text-center"
          aria-hidden
        >
          <p className="font-sans text-[clamp(1.5rem,5.2vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[0.04em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]">
            <span>DOES </span>
            <span className="inline-block align-baseline font-serif text-[clamp(2.25rem,8.5vw,5rem)] font-bold normal-case tracking-normal text-white drop-shadow-[0_0_32px_rgba(255,255,255,0.55)]">
              GOD
            </span>
            <span> EXIST</span>
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
