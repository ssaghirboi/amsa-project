import { useEffect, useState } from 'react'
import {
  BIG_SCREEN_TIMER_QR_WIDTH_CLASS,
  formatScreenTimer,
  formatScreenTimerFullDuration,
  screenTimerGlowT,
} from '../constants/screenTimer'

/**
 * Live countdown from `endMs` (epoch ms). Grey by default; in the last 10s ramps to a gold glow.
 * When `endMs` is null (reset), shows an idle state so the block stays visible above the QR.
 */
export function ScreenTimerDisplay({ endMs }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (endMs == null) return undefined
    const id = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [endMs])

  if (endMs == null) {
    const idleLabel = formatScreenTimerFullDuration()
    return (
      <div
        className={`${BIG_SCREEN_TIMER_QR_WIDTH_CLASS} max-w-full pointer-events-none select-none rounded-2xl border border-slate-600/50 bg-slate-900/90 px-4 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-slate-500/20`}
        role="status"
        aria-label={`Timer idle — ${idleLabel}`}
      >
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Time
        </div>
        <div
          className="mt-1.5 text-5xl font-bold tabular-nums text-slate-500 sm:text-6xl"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {idleLabel}
        </div>
      </div>
    )
  }

  const remaining = Math.max(0, endMs - Date.now())
  const label = formatScreenTimer(remaining)
  const glow = screenTimerGlowT(remaining)
  const grey = [148, 163, 184] // slate-400
  const gold = [251, 191, 36] // amber-400
  const r = Math.round(grey[0] + (gold[0] - grey[0]) * glow)
  const g = Math.round(grey[1] + (gold[1] - grey[1]) * glow)
  const b = Math.round(grey[2] + (gold[2] - grey[2]) * glow)
  const color = `rgb(${r},${g},${b})`
  const shadowBlur = 6 + glow * 22
  const shadowAlpha = 0.15 + glow * 0.55

  return (
    <div
      className={`${BIG_SCREEN_TIMER_QR_WIDTH_CLASS} max-w-full pointer-events-none select-none rounded-2xl border border-slate-600/50 bg-slate-900/90 px-4 py-4 text-center tabular-nums tracking-tight shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-slate-500/20 transition-[color,box-shadow,text-shadow] duration-300 ease-out`}
      style={{
        color,
        textShadow:
          glow > 0.02
            ? `0 0 ${shadowBlur}px rgba(251, 191, 36, ${shadowAlpha}), 0 0 ${Math.round(shadowBlur * 1.4)}px rgba(245, 158, 11, ${shadowAlpha * 0.65})`
            : undefined,
        boxShadow:
          glow > 0.02
            ? `0 0 ${Math.round(12 + glow * 28)}px rgba(245, 158, 11, ${0.12 + glow * 0.2}), inset 0 0 ${Math.round(8 + glow * 12)}px rgba(251, 191, 36, ${0.06 + glow * 0.1})`
            : undefined,
      }}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining ${label}`}
    >
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
        Time
      </div>
      <div
        className="mt-1.5 text-5xl font-bold tabular-nums sm:text-6xl"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </div>
    </div>
  )
}
