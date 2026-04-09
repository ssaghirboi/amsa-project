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

/**
 * Whole seconds left, floored — never show above the configured round length (avoids 2:01/2:02
 * at start when `endMs` is a few ms late or ceil would round up an extra second).
 */
export function formatScreenTimer(remainingMs) {
  const capped = Math.min(Math.max(0, remainingMs), SCREEN_TIMER_DURATION_MS)
  const totalSec = Math.floor(capped / 1000)
  const m = Math.floor(totalSec / 60)
  const r = totalSec % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Idle / reset display matches full round length (e.g. "2:00"). */
export function formatScreenTimerFullDuration() {
  return formatScreenTimer(SCREEN_TIMER_DURATION_MS)
}

/** 0 = white (full time left), 1 = full gold glow (times up). Linear over the whole round length. */
export function screenTimerGlowT(remainingMs) {
  if (remainingMs <= 0) return 1
  const capped = Math.min(remainingMs, SCREEN_TIMER_DURATION_MS)
  const t = 1 - capped / SCREEN_TIMER_DURATION_MS
  return Math.max(0, Math.min(1, t))
}
