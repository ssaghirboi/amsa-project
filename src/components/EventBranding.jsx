import eventLogoSvg from '../assets/IS GOD REAL (Print Flyer).svg?url'

/** Official event logo (SVG asset) — intrinsic width, no extra letterboxing */
export function EventBranding({ className = '', centered = false }) {
  return (
    <div
      className={`select-none leading-none ${
        centered ? 'flex w-full flex-col items-center' : 'inline-block w-fit max-w-full'
      } ${className}`}
    >
      <img
        src={eventLogoSvg}
        alt="Event logo"
        className="block h-auto w-auto max-w-[min(100vw-2rem,20rem)] sm:max-w-md md:max-w-2xl"
        decoding="async"
        fetchPriority="high"
        width={736}
        height={442}
      />
    </div>
  )
}
