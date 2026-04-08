/** Big-screen countdown started from Admin (synced via `event_state.screen_timer_end_ms`). */
export const SCREEN_TIMER_DURATION_MS = 120_000

/** Tailwind width classes: compact right rail on `/screen` so it does not cover the debate table. */
export const BIG_SCREEN_TIMER_QR_WIDTH_CLASS =
  'w-[min(14rem,22vw)] max-w-[min(14rem,calc(100vw-2rem))]'

/** Last 10s: text transitions from white to gold glow. */
export const SCREEN_TIMER_GLOW_LAST_MS = 10_000

export function formatScreenTimer(remainingMs) {
  const s = Math.max(0, Math.ceil(remainingMs / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Idle / reset display matches full round length (e.g. "2:00"). */
export function formatScreenTimerFullDuration() {
  return formatScreenTimer(SCREEN_TIMER_DURATION_MS)
}

/** 0 = no glow (white text), 1 = full gold glow (at or below 0s remaining). */
export function screenTimerGlowT(remainingMs) {
  if (remainingMs <= 0) return 1
  if (remainingMs >= SCREEN_TIMER_GLOW_LAST_MS) return 0
  return 1 - remainingMs / SCREEN_TIMER_GLOW_LAST_MS
}
