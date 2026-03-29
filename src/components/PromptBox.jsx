import { forwardRef } from 'react'

/**
 * Shared “Prompt” card — used on BigScreen (intro + debate) so layout and refs match.
 */
export const PromptBox = forwardRef(function PromptBox(
  {
    children,
    className = '',
    style,
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
      <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-white/12 via-indigo-500/10 to-white/12 opacity-90 blur-md" />
      <div
        className={`relative rounded-[1.75rem] border border-white/20 bg-black/55 px-8 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:px-12 sm:py-9 md:px-16 md:py-10 ${innerClassName}`}
      >
        <p className="text-xs font-medium uppercase tracking-[0.4em] text-sky-300/90 sm:text-sm">
          Prompt
        </p>
        <div
          className={`mt-4 whitespace-pre-wrap text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.15] ${bodyClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
})
