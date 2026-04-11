import eventLogoDefault from '../assets/IS GOD REAL (Business Card US Portrait).png'

/**
 * Official event logo. Height-capped so it never dominates the viewport.
 * - default: admin, audience, debate screen (compact header strip)
 * - presentation: pre-event slides header size (debate screen when not hero)
 * - presentationHero: slideshow — large centered logo
 * - presentationCorner: slideshow — top-left mark (large)
 * - mc: MC dashboard — top-left logo sized to clear control row (no overlap)
 *
 * @param {string} [logoSrc] — optional asset URL; defaults to Business Card portrait PNG. BigScreen may pass the same.
 */
export function EventBranding({
  className = '',
  centered = false,
  variant = 'default',
  logoSrc,
}) {
  const src = logoSrc ?? eventLogoDefault
  const sizeClass =
    variant === 'presentationHero'
      ? // Slideshow: dominant center logo
        'max-h-[min(62vh,28rem)] max-w-[min(96vw,48rem)] sm:max-h-[min(58vh,32rem)] sm:max-w-[48rem] md:max-h-[min(54vh,36rem)] md:max-w-[52rem]'
      : variant === 'mc'
        ? // MC page: visible but short so status line never tucks under the mark
          'max-h-[6rem] max-w-[min(92vw,16rem)] sm:max-h-[6.75rem] sm:max-w-[17rem] md:max-h-[7.25rem] md:max-w-[18rem]'
        : variant === 'presentationCorner'
        ? // Slideshow: prominent top-left logo
          'max-h-[min(32vh,14rem)] max-w-[min(92vw,28rem)] sm:max-h-[min(30vh,15rem)] sm:max-w-[30rem] md:max-h-[16rem] md:max-w-[32rem]'
        : variant === 'presentation'
          ? // Event screen header: readable at distance
            'max-h-[min(24vh,10rem)] max-w-[min(94vw,22rem)] sm:max-h-[min(30vh,12rem)] sm:max-w-[26rem] md:max-h-[min(28vh,13rem)]'
          : // Admin + Ask + compact
            'max-h-[min(20vh,7.25rem)] max-w-[min(94vw,17rem)] sm:max-h-[min(16vh,8.25rem)] sm:max-w-[18.5rem] md:max-h-[8.75rem] md:max-w-[19.5rem]'

  const isCentered =
    centered || variant === 'presentationHero'

  /** Centered layouts: object-center + mx-auto so the graphic isn’t biased up/left vs the tagline */
  const imgAlignClass = isCentered
    ? 'mx-auto object-contain object-center'
    : 'object-contain object-top'

  return (
    <div
      className={`select-none leading-none ${
        isCentered
          ? 'flex w-full flex-col items-center justify-center'
          : 'flex w-fit max-w-full flex-col'
      } ${className}`}
    >
      <img
        src={src}
        alt="Event logo"
        className={`block h-auto w-auto max-w-full ${imgAlignClass} ${sizeClass}`}
        decoding="async"
        fetchPriority="high"
        {...(!logoSrc ? { width: 180, height: 108 } : {})}
      />
    </div>
  )
}
