/** Shown on /ask and on the Q&A end title card on /screen when Q&A slideshow is active (slide 0). */
export const QA_SLIDESHOW_TITLE = 'Audience Q&A'

/** Q&A end slideshow: slide 1 — title card (edit subtext as needed). */
export const QA_EJAZ_TITLE = 'Ejaz Arshad'
export const QA_EJAZ_SUBTITLE = 'Moderator'

/** Number of slides in the Q&A end deck (Audience Q&A + QR, then title card). */
export const QA_SLIDE_COUNT = 2

export function clampQaSlideIndex(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(QA_SLIDE_COUNT - 1, n))
}
