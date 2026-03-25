/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Same layout as slide 2: big centered logo + optional tagline */
  { kind: 'hero', tagline: 'We will begin shortly' },
  { kind: 'hero', tagline: null },
]

export const PRESENTATION_SLIDE_COUNT = PRESENTATION_SLIDES.length
