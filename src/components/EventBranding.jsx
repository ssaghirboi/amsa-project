import eventLogoSvg from '../assets/IS GOD REAL (Print Flyer).svg?url'

/**
 * Official event logo (SVG). Height-capped so it never dominates the viewport.
 * - default: admin, audience, debate screen (compact header strip)
 * - presentation: pre-event slides header size (debate screen when not hero)
 * - presentationHero: slideshow — large centered logo
 * - presentationCorner: slideshow — small logo (top-left corner)
 */
export function EventBranding({
  className = '',
  centered = false,
  variant = 'default',
}) {
  const sizeClass =
    variant === 'presentationHero'
      ? // Slideshow: dominant center logo
        'max-h-[min(52vh,20rem)] max-w-[min(96vw,40rem)] sm:max-h-[min(48vh,24rem)] sm:max-w-[44rem] md:max-h-[min(45vh,26rem)]'
      : variant === 'presentationCorner'
        ? // Slideshow: compact corner mark
          'max-h-[min(14vh,5.5rem)] max-w-[min(52vw,11rem)] sm:max-h-[6.5rem] sm:max-w-[13rem] md:max-h-[7rem] md:max-w-[14rem]'
        : variant === 'presentation'
          ? // Event screen header: readable at distance
            'max-h-[min(24vh,10rem)] max-w-[min(94vw,22rem)] sm:max-h-[min(30vh,12rem)] sm:max-w-[26rem] md:max-h-[min(28vh,13rem)]'
          : // Admin + Ask + compact
            'max-h-[min(20vh,7.25rem)] max-w-[min(94vw,17rem)] sm:max-h-[min(16vh,8.25rem)] sm:max-w-[18.5rem] md:max-h-[8.75rem] md:max-w-[19.5rem]'

  const isCentered =
    centered || variant === 'presentationHero'

  return (
    <div
      className={`select-none leading-none ${
        isCentered ? 'flex w-full flex-col items-center' : 'flex w-fit max-w-full flex-col'
      } ${className}`}
    >
      <img
        src={eventLogoSvg}
        alt="Event logo"
        className={`block h-auto w-auto object-contain object-top ${sizeClass}`}
        decoding="async"
        fetchPriority="high"
        width={736}
        height={442}
      />
    </div>
  )
}
