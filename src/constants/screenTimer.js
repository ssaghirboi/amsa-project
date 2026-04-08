/** Big-screen countdown started from Admin (synced via `event_state.screen_timer_end_ms`). */
export const SCREEN_TIMER_DURATION_MS = 120_000
/** Last 10s: text transitions from grey to gold glow. */
export const SCREEN_TIMER_GLOW_LAST_MS = 10_000

export function formatScreenTimer(remainingMs) {
  const s = Math.max(0, Math.ceil(remainingMs / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** 0 = no glow (grey), 1 = full gold glow (at or below 0s remaining). */
export function screenTimerGlowT(remainingMs) {
  if (remainingMs <= 0) return 1
  if (remainingMs >= SCREEN_TIMER_GLOW_LAST_MS) return 0
  return 1 - remainingMs / SCREEN_TIMER_GLOW_LAST_MS
}
