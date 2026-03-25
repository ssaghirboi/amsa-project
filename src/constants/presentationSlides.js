/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Slide 1: big centered logo + “We will begin shortly” */
  { kind: 'hero', tagline: 'We will begin shortly' },
  /** Slide 2: same hero logo; no subtext */
  { kind: 'hero', tagline: null },
]

export const PRESENTATION_SLIDE_COUNT = PRESENTATION_SLIDES.length
