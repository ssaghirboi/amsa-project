/** Official event logo (asset) + Inspired by Jubilee */
export function EventBranding({ className = '' }) {
  return (
    <div className={`select-none ${className}`}>
      <img
        src="/does-god-exist-logo.png"
        alt="DOES GOD EXIST"
        className="h-auto w-full max-w-[min(100%,22rem)] object-contain object-left sm:max-w-md md:max-w-lg"
        decoding="async"
        fetchPriority="high"
      />
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
