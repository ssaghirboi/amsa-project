/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Slide 1: big centered logo + “We will begin shortly” */
  { kind: 'hero', tagline: 'We will begin shortly' },
  /** Slide 2: same hero logo; no subtext */
  { kind: 'hero', tagline: 'Text inspired by Jubilee' },
  /** Slide 3 — dedicated segment slide (logo → top-left, title + subtitle). */
  {
    kind: 'segment',
    id: 'quran-recitation',
    title: 'Recitation of the Holy Quran',
    subtitle: 'John Doe',
  },
  /** Slide 4 — logo-only beat between recitation and speaker 1. */
  { kind: 'hero', tagline: null },
  /** Slide 5 — Speaker 1 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-1',
    title: 'Speaker 1',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 6 — Speaker 2 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-2',
    title: 'Speaker 2',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 7 — Speaker 3 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-3',
    title: 'Speaker 3',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 8 — Speaker 4 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-4',
    title: 'Speaker 4',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 9 — Saghir Saeed intro */
  {
    kind: 'segment',
    id: 'saghir-saeed',
    title: 'Saghir Saeed',
    subtitle:
      "President of the Ahmadiyya Muslim Students' Association",
  },
]

export const PRESENTATION_SLIDE_COUNT = PRESENTATION_SLIDES.length

/** Same bounds as eventState `slideshow_index` (0 … slideCount − 1). */
export function clampPresentationSlideIndex(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(PRESENTATION_SLIDE_COUNT - 1, n))
}
