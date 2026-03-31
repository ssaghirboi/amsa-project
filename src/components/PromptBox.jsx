import { forwardRef } from 'react'

/**
 * Shared “Prompt” card — used on BigScreen (intro + debate) so layout and refs match.
 * `cardRef` targets the fly/FLIP layer (blur + card); use for getBoundingClientRect handoff.
 */
export const PromptBox = forwardRef(function PromptBox(
  {
    children,
    className = '',
    style,
    /** Ref on the visual prompt shell (blur halo + card) — not the outer width wrapper */
    cardRef,
    cardClassName = '',
    cardStyle,
    innerClassName = '',
    bodyClassName = '',
    maxWidthClass = 'max-w-6xl',
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`relative w-full ${maxWidthClass} ${className}`}
      style={style}
    >
      <div
        ref={cardRef}
        className={`relative w-full ${cardClassName}`}
        style={cardStyle}
      >
        <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-sky-200/70 via-indigo-200/50 to-violet-200/70 opacity-90 blur-md" />
        <div
          className={`relative rounded-[1.75rem] border border-slate-200/90 bg-white/95 px-8 py-7 text-center shadow-[0_8px_40px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md sm:px-12 sm:py-9 md:px-16 md:py-10 ${innerClassName}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-sky-700/90 sm:text-sm">
            Prompt
          </p>
          <div
            className={`mt-4 whitespace-pre-wrap text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-800 sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.15] ${bodyClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})
