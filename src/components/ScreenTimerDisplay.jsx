import { useEffect, useRef, useState } from 'react'
import {
  BIG_SCREEN_TIMER_QR_WIDTH_CLASS,
  formatScreenTimer,
  formatScreenTimerFullDuration,
  screenTimerGlowT,
} from '../constants/screenTimer'
import timerFinishSoundUrl from '../assets/Kids Cheering - Sound Effect (HD) - Gaming Sound FX (youtube).mp3'

/**
 * Live countdown from `endMs` (epoch ms). White when idle or while running outside the last 10s;
 * in the last 10s ramps to gold (color + glow). When `endMs` is null, shows idle time above the QR.
 * `playFinishSound`: only the event `/screen` should pass true so the finish MP3 plays there only.
 */
export function ScreenTimerDisplay({ endMs, playFinishSound = false }) {
  const [, setTick] = useState(0)
  const finishSoundPlayedForEndMs = useRef(null)

  useEffect(() => {
    if (endMs == null) {
      finishSoundPlayedForEndMs.current = null
      return undefined
    }
    if (!playFinishSound) {
      return undefined
    }
    const tryPlayFinish = () => {
      if (Date.now() < endMs) return
      if (finishSoundPlayedForEndMs.current === endMs) return
      finishSoundPlayedForEndMs.current = endMs
      try {
        const audio = new Audio(timerFinishSoundUrl)
        audio.volume = 0.85
        void audio.play().catch(() => {})
      } catch {
        /* ignore */
      }
    }
    tryPlayFinish()
    const id = window.setInterval(tryPlayFinish, 200)
    return () => window.clearInterval(id)
  }, [endMs, playFinishSound])

  useEffect(() => {
    if (endMs == null) return undefined
    const id = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [endMs])

  if (endMs == null) {
    const idleLabel = formatScreenTimerFullDuration()
    return (
      <div
        className={`${BIG_SCREEN_TIMER_QR_WIDTH_CLASS} max-w-full pointer-events-none select-none rounded-2xl border border-slate-600/50 bg-slate-900/90 px-4 py-3 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-slate-500/20 sm:px-5 sm:py-4`}
        role="status"
        aria-label={`Timer idle — ${idleLabel}`}
      >
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-white/75 sm:text-[0.75rem]">
          Time
        </div>
        <div
          className="mt-1.5 text-4xl font-bold tabular-nums text-white sm:text-5xl md:text-6xl"
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
  const white = [255, 255, 255]
  const gold = [251, 191, 36] // amber-400
  const r = Math.round(white[0] + (gold[0] - white[0]) * glow)
  const g = Math.round(white[1] + (gold[1] - white[1]) * glow)
  const b = Math.round(white[2] + (gold[2] - white[2]) * glow)
  const color = `rgb(${r},${g},${b})`
  const shadowBlur = 6 + glow * 22
  const shadowAlpha = 0.15 + glow * 0.55

  return (
    <div
      className={`${BIG_SCREEN_TIMER_QR_WIDTH_CLASS} max-w-full pointer-events-none select-none rounded-2xl border border-slate-600/50 bg-slate-900/90 px-4 py-3 text-center tabular-nums tracking-tight shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-slate-500/20 transition-[color,box-shadow,text-shadow] duration-300 ease-out sm:px-5 sm:py-4`}
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
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.26em] opacity-[0.85] sm:text-[0.75rem]">
        Time
      </div>
      <div
        className="mt-1.5 text-4xl font-bold tabular-nums sm:text-5xl md:text-6xl"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </div>
    </div>
  )
}
