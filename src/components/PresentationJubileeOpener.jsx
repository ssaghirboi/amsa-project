import { JUBILEE_OPENER_SIGNS } from '../constants/jubileeOpenerAssets'

const stageBg =
  'radial-gradient(ellipse 75% 65% at 50% 48%, #1a2f4a 0%, #0f1f33 38%, #0a1628 62%, #020617 100%)'

const glowSans =
  '0 0 24px rgba(255,255,255,0.35), 0 0 48px rgba(255,255,255,0.12), 0 2px 20px rgba(0,0,0,0.5)'
const glowGod =
  '0 0 20px rgba(255,255,255,0.9), 0 0 48px rgba(255,255,255,0.45), 0 0 90px rgba(255,255,255,0.2)'

/**
 * Reference slide: top = INSPIRED BY + Jubilee only; center = DOES GOD EXIST;
 * five paddles framing the title. (No extra presenter line — matches reference art.)
 */
export function PresentationJubileeOpener({ slide }) {
  const inspiredPrefix = slide?.inspiredPrefix ?? 'INSPIRED BY'
  const inspiredHighlight = slide?.inspiredHighlight ?? 'Jubilee'

  return (
    <div
      className="flex min-h-0 flex-1 flex-col font-sans text-white"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Top: only “INSPIRED BY” + script Jubilee (reference) */}
      <header className="relative z-30 shrink-0 px-4 pt-3 text-center sm:pt-5 md:pt-6">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-white sm:text-xs md:text-[0.8125rem]"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}
          >
            {inspiredPrefix}
          </span>
          <span
            className="text-[clamp(1.75rem,5vw,3rem)] leading-none text-amber-300"
            style={{
              fontFamily: "'Pacifico', 'Dancing Script', cursive",
              textShadow:
                '0 2px 16px rgba(251,191,36,0.45), 0 0 32px rgba(234,179,8,0.25)',
            }}
          >
            {inspiredHighlight}
          </span>
        </p>
      </header>

      {/* Stage: navy vignette + signs + title */}
      <div
        className="relative mt-3 min-h-[min(62vh,480px)] flex-1 overflow-hidden sm:mt-4 md:min-h-[min(64vh,540px)]"
        style={{ background: stageBg }}
      >
        {JUBILEE_OPENER_SIGNS.map((s) => (
          <img
            key={s.key}
            src={s.src}
            alt=""
            className={`pointer-events-none absolute max-w-none select-none ${s.className}`}
            draggable={false}
          />
        ))}

        {/* Dead-center main title */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <h1
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:gap-x-3 sm:whitespace-nowrap md:gap-x-4"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            <span
              className="text-[clamp(1.1rem,3.8vw,2rem)] font-bold uppercase tracking-[0.14em]"
              style={{ textShadow: glowSans }}
            >
              DOES
            </span>
            <span
              className="px-0.5 text-[clamp(2.4rem,11vw,6.5rem)] font-semibold leading-none tracking-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                textShadow: glowGod,
              }}
            >
              GOD
            </span>
            <span
              className="text-[clamp(1.1rem,3.8vw,2rem)] font-bold uppercase tracking-[0.14em]"
              style={{ textShadow: glowSans }}
            >
              EXIST
            </span>
          </h1>
        </div>
      </div>
    </div>
  )
}
