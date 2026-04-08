/** Big-screen countdown started from Admin (synced via `event_state.screen_timer_end_ms`). */
export const SCREEN_TIMER_DURATION_MS = 120_000

/**
 * Timer + QR rail on `/screen` (debate mode). Capped so the fixed column stays beside the table, not over it.
 * Keep in sync with `BIG_SCREEN_DEBATE_RAIL_PADDING_CLASS` in BigScreen.
 */
export const BIG_SCREEN_TIMER_QR_WIDTH_CLASS =
  'w-[min(24rem,min(36vw,calc(100vw-2rem)))] max-w-full'

/** Debate main column `padding-right` on md+ — must clear the fixed rail width + a comfortable gap. */
export const BIG_SCREEN_DEBATE_RAIL_PADDING_CLASS =
  'md:pr-[min(27rem,calc(38vw+2rem))]'

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
