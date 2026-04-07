import eventTitleLogo from '../assets/IS GOD REAL (A4).svg?url'
import { JUBILEE_OPENER_SIGNS } from '../constants/jubileeOpenerAssets'

/**
 * First presentation slide: AMSA header + “Inspired by Jubilee” + large edge-hanging signs
 * + centered white event title graphic (“Does God Exist” / IS GOD REAL artwork).
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

      <div className="relative mt-2 min-h-[min(52vh,400px)] flex-1 overflow-hidden sm:mt-4 md:min-h-[min(56vh,460px)]">
        {/* Center: white event title (IS GOD REAL / Does God Exist artwork) */}
        <div
          className="pointer-events-none absolute left-1/2 top-[48%] z-30 w-[min(82vw,24rem)] -translate-x-1/2 -translate-y-1/2 sm:top-1/2 sm:w-[min(76vw,30rem)] md:w-[min(70vw,36rem)] lg:w-[min(64vw,42rem)]"
          aria-hidden
        >
          <img
            src={eventTitleLogo}
            alt=""
            className="h-auto w-full brightness-0 invert drop-shadow-[0_6px_32px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
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
