import eventLogoSvg from '../assets/IS GOD REAL (Print Flyer).svg?url'

/** Official event logo (SVG asset) */
export function EventBranding({ className = '', centered = false }) {
  return (
    <div
      className={`select-none ${centered ? 'flex flex-col items-center text-center' : ''} ${className}`}
    >
      <img
        src={eventLogoSvg}
        alt="Event logo"
        className={`h-auto w-full max-w-[min(100%,22rem)] object-contain sm:max-w-md md:max-w-lg ${
          centered ? 'mx-auto object-center' : 'object-left'
        }`}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  )
}
