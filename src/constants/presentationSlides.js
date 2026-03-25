/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Large centered logo + tagline */
  { logoOnly: false, tagline: 'We will begin shortly' },
  /** Logo only — no text */
  { logoOnly: true },
]

export const PRESENTATION_SLIDE_COUNT = PRESENTATION_SLIDES.length
