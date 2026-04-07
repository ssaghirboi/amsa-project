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
    /** BigScreen uses dark to match the auditorium display */
    variant = 'light',
  },
  ref,
) {
  const isDark = variant === 'dark'
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
        <div
          className={
            isDark
              ? 'absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-sky-900/55 via-indigo-900/45 to-violet-900/55 opacity-95 blur-md'
              : 'absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-sky-200/70 via-indigo-200/50 to-violet-200/70 opacity-90 blur-md'
          }
        />
        <div
          className={`relative rounded-[1.75rem] px-8 py-7 text-center backdrop-blur-md sm:px-12 sm:py-9 md:px-16 md:py-10 ${
            isDark
              ? 'border border-slate-600/85 bg-slate-900/92 shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'border border-slate-200/90 bg-white/95 shadow-[0_8px_40px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
          } ${innerClassName}`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-[0.4em] sm:text-sm ${
              isDark ? 'text-sky-400/95' : 'text-sky-700/90'
            }`}
          >
            Prompt
          </p>
          <div
            className={`mt-4 whitespace-pre-wrap text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.15] ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            } ${bodyClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})
