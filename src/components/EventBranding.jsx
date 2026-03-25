/** Event flyer lockup: DOES GOD EXIST + Inspired by Jubilee */
export function EventBranding({ className = '' }) {
  return (
    <div className={`select-none ${className}`}>
      <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-0 leading-none sm:gap-x-3">
        <span className="text-xl font-bold tracking-[0.14em] text-white sm:text-3xl">DOES</span>
        <span
          className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-none text-amber-300 drop-shadow-[0_0_28px_rgba(251,191,36,0.5)]"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          GOD
        </span>
        <span className="text-xl font-bold tracking-[0.14em] text-white sm:text-3xl">EXIST</span>
      </h1>
      <p className="mt-3 text-[11px] font-medium sm:text-xs">
        <span className="tracking-[0.2em] text-white/75">INSPIRED BY</span>{' '}
        <span
          className="rounded-md px-0.5 font-semibold lowercase tracking-wide text-amber-300"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Jubilee
        </span>
      </p>
    </div>
  )
}
