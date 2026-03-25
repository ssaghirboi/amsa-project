/** Official event logo (asset) */
export function EventBranding({ className = '', centered = false }) {
  return (
    <div
      className={`select-none ${centered ? 'flex flex-col items-center text-center' : ''} ${className}`}
    >
      <img
        src="/does-god-exist-logo.png"
        alt="DOES GOD EXIST"
        className={`h-auto w-full max-w-[min(100%,22rem)] object-contain sm:max-w-md md:max-w-lg ${
          centered ? 'mx-auto object-center' : 'object-left'
        }`}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  )
}
