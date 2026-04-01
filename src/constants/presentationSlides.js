/** Pre-event slides on /screen (slideshow mode). Index clamped in eventState to this length. */
export const PRESENTATION_SLIDES = [
  /** Slide 1 — hero logo */
  { kind: 'hero', tagline: 'Inspired by Jubilee' },
  /** Slide 2 — title card: Does God Exist? */
  {
    kind: 'segment',
    id: 'post-recitation-title',
    title: 'Does God Exist?',
    subtitle: 'A conversation across perspectives',
  },
  /** Slide 3 — Recitation of the Holy Quran */
  {
    kind: 'segment',
    id: 'quran-recitation',
    title: 'Recitation of the Holy Quran',
    subtitle: 'John Doe',
  },
  /** Slide 4 — Speaker 2 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-2',
    title: 'Speaker 2',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 5 — Speaker 3 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-3',
    title: 'Speaker 3',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 6 — Speaker 4 introduction (filler text for now). */
  {
    kind: 'segment',
    id: 'speaker-4',
    title: 'Speaker 4',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
  /** Slide 7 — Saghir Saeed intro */
  {
    kind: 'segment',
    id: 'saghir-saeed',
    title: 'Saghir Saeed',
    subtitle:
      "President of the Ahmadiyya Muslim Students' Association",
  },
  /** Slide 8 — name + role */
  {
    kind: 'segment',
    id: 'saghir-president-line',
    title: 'Saghir Saeed',
    subtitle: 'President of AMSA',
  },
  /** Slide 9 — same hero layout + tagline as slide 1 */
  { kind: 'hero', tagline: 'Inspired by Jubilee' },
]

export const PRESENTATION_SLIDE_COUNT = PRESENTATION_SLIDES.length

/** Ignore stale `slideshow_index` from realtime/poll for this long after a local slide step (ms). */
export const PRESENTATION_SLIDE_STALE_ECHO_MS = 4500

/**
 * Same bounds as eventState `slideshow_index` (0 … slideCount − 1).
 * Pass `slideCount` from the merged deck (e.g. after `mergePresentationSlidesFromRemote`) so
 * the max index matches the deck you are actually showing, not only the built-in array length.
 */
export function clampPresentationSlideIndex(raw, slideCount = PRESENTATION_SLIDE_COUNT) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 0
  const count = Math.max(1, Math.floor(Number(slideCount)) || PRESENTATION_SLIDE_COUNT)
  const maxIdx = count - 1
  return Math.max(0, Math.min(maxIdx, n))
}

/**
 * While `echoUntilMs` is in the future (recent local "Next slide" / navigation), do not
 * accept a remote index more than one step ahead of `applied`. Prevents skipping a slide
 * when the DB briefly reports +2 (double write, batched realtime, or duplicate events).
 */
export function capPresentationSlideIndexNoForwardSkip(si, applied, echoUntilMs) {
  const s = Math.floor(Number(si))
  const a = Math.floor(Number(applied))
  if (!Number.isFinite(s) || !Number.isFinite(a)) return si
  if (Date.now() >= echoUntilMs) return s
  if (s <= a + 1) return s
  return a + 1
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

  const byId = new Map()
  for (const item of arr) {
    if (item && typeof item === 'object' && item.id != null && item.id !== '') {
      byId.set(String(item.id), item)
    }
  }

  return defaults.map((def, i) => {
    let patch = null
    if (def.kind === 'segment' && def.id) {
      patch = byId.get(String(def.id)) ?? null
      if (!patch) {
        return { ...def }
      }
    } else {
      patch = i < arr.length ? arr[i] : null
    }
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
