/** Shown on /ask and on the Q&A end title card on /screen when Q&A slideshow is active (slide 0). */
export const QA_SLIDESHOW_TITLE = 'Audience Q&A'

/** Q&A end slideshow: slide 1 — title card defaults (overridden by DB `qa_slideshow_slides`). */
export const QA_EJAZ_TITLE = 'Ejaz Arshad'
export const QA_EJAZ_SUBTITLE = 'Moderator'

/** Number of slides in the Q&A end deck (Audience Q&A + QR, then title card). */
export const QA_SLIDE_COUNT = 2

export function clampQaSlideIndex(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(QA_SLIDE_COUNT - 1, n))
}

const DEFAULT_SLIDES = [
  { title: QA_SLIDESHOW_TITLE },
  { title: QA_EJAZ_TITLE, subtitle: QA_EJAZ_SUBTITLE },
]

/**
 * Merge DB-stored Q&A slide copy with defaults (same idea as `presentation_slides`).
 */
export function mergeQaSlidesFromRemote(raw) {
  const defaults = DEFAULT_SLIDES.map((s) => ({ ...s }))
  let arr = raw
  if (raw == null) {
    return defaults
  }
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return defaults
    }
  }
  if (!Array.isArray(arr)) return defaults

  return defaults.map((def, i) => {
    const partial = arr[i]
    if (!partial || typeof partial !== 'object') return { ...def }
    return {
      title: partial.title != null ? String(partial.title) : def.title,
      subtitle:
        i === 0
          ? undefined
          : partial.subtitle != null
            ? String(partial.subtitle)
            : def.subtitle,
    }
  })
}
