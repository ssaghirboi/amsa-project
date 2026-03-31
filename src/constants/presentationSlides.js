/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Slide 1: big centered logo + “We will begin shortly” */
  { kind: 'hero', tagline: 'We will begin shortly' },
  /** Slide 2: same hero logo; no subtext */
  { kind: 'hero', tagline: 'Text inspired by Jubilee' },
  /** Slide 3: pure logo beat, no text (title slide) */
  { kind: 'hero', tagline: null },
  /** Slide 4 — dedicated segment slide (logo → top-left, title + subtitle). */
  {
    kind: 'segment',
    id: 'quran-recitation',
    title: 'Recitation of the Holy Quran',
    subtitle: 'John Doe',
  },
  /** Slide 5 — title card between recitation and speaker 1. */
  {
    kind: 'segment',
    id: 'post-recitation-title',
    title: 'Does God Exist?',
    subtitle: 'A conversation across perspectives',
  },
  /** Slide 6 — Speaker 1 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-1',
    title: 'Speaker 1',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 7 — Speaker 2 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-2',
    title: 'Speaker 2',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 8 — Speaker 3 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-3',
    title: 'Speaker 3',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 9 — Speaker 4 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-4',
    title: 'Speaker 4',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 10 — Saghir Saeed intro */
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

/**
 * Merge DB-stored slide text with built-in defaults (structure: kind, id, slide order).
 * `raw` may be null, a JSON string, or an array of partial slide objects.
 */
export function mergePresentationSlidesFromRemote(raw) {
  const defaults = PRESENTATION_SLIDES
  let arr = raw
  if (raw == null) {
    return defaults.map((s) => ({ ...s }))
  }
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return defaults.map((s) => ({ ...s }))
    }
  }
  if (!Array.isArray(arr)) {
    return defaults.map((s) => ({ ...s }))
  }

  return defaults.map((def, i) => {
    const patch = arr[i]
    if (!patch || typeof patch !== 'object') {
      return { ...def }
    }
    if (def.kind === 'hero') {
      const tagline =
        patch.tagline !== undefined ? patch.tagline : def.tagline
      return {
        ...def,
        tagline:
          tagline === '' || tagline === undefined ? null : String(tagline),
      }
    }
    return {
      ...def,
      title:
        patch.title !== undefined ? String(patch.title) : def.title,
      subtitle:
        patch.subtitle !== undefined
          ? String(patch.subtitle)
          : def.subtitle,
    }
  })
}
