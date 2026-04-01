/** Shown on /ask and on the Q&A end title card on /screen when Q&A slideshow is active (slide 0). */
export const QA_SLIDESHOW_TITLE = 'Audience Q&A'

/** Q&A end slideshow: slide 1 — title card defaults (overridden by DB `qa_slideshow_slides`). */
export const QA_EJAZ_TITLE = 'Ejaz Arshad'
export const QA_EJAZ_SUBTITLE = 'Moderator'

/** Slide layout hints for /screen and /ask (merged with DB copy). */
export const QA_SLIDE_KIND = {
  /** Audience title + Does God Exist QR */
  AUDIENCE_QR: 'audience-qr',
  /** Title + subtitle card */
  TITLE_CARD: 'title-card',
  /** Club line + Humanity First QR asset */
  HUMANITY_QR: 'humanity-qr',
  /** Large logo + “Thank you” headline */
  HERO_THANKS: 'hero-thanks',
}

/** Number of slides in the Q&A end deck. */
export const QA_SLIDE_COUNT = 4

export function clampQaSlideIndex(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(QA_SLIDE_COUNT - 1, n))
}

function extractQaSlidesArrayForMerge(raw) {
  if (raw == null) return null
  let v = raw
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object' && Array.isArray(v.slides)) return v.slides
  return null
}

/**
 * When `qa_slideshow_slides` is stored as `{ slides, index }`, read slide index.
 * Prefer this over `qa_slideshow_index` when that column is boolean/mis-typed (only 0–1 work).
 */
export function extractEmbeddedQaSlideIndex(raw) {
  if (raw == null) return null
  let v = raw
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (v && typeof v === 'object' && !Array.isArray(v) && 'index' in v) {
    const n = Math.floor(Number(v.index))
    if (Number.isFinite(n)) return clampQaSlideIndex(n)
  }
  return null
}

const DEFAULT_SLIDES = [
  { kind: QA_SLIDE_KIND.AUDIENCE_QR, title: QA_SLIDESHOW_TITLE },
  {
    kind: QA_SLIDE_KIND.TITLE_CARD,
    title: QA_EJAZ_TITLE,
    subtitle: QA_EJAZ_SUBTITLE,
  },
  {
    kind: QA_SLIDE_KIND.HUMANITY_QR,
    title: 'Humanity First club at UCalgary',
  },
  { kind: QA_SLIDE_KIND.HERO_THANKS, title: 'Thank You' },
]

/**
 * Merge DB-stored Q&A slide copy with defaults (same idea as `presentation_slides`).
 */
export function mergeQaSlidesFromRemote(raw) {
  const defaults = DEFAULT_SLIDES.map((s) => ({ ...s }))
  const arr = extractQaSlidesArrayForMerge(raw)
  if (arr == null) {
    return defaults
  }

  return defaults.map((def, i) => {
    const partial = arr[i]
    if (!partial || typeof partial !== 'object') return { ...def }
    const next = { ...def }
    if (partial.kind != null) next.kind = String(partial.kind)
    if (partial.title != null) next.title = String(partial.title)
    if (partial.subtitle != null) next.subtitle = String(partial.subtitle)
    return next
  })
}
