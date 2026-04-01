/**
 * Matches `DebateSliderGrid`: stored value 1 = Strongly Agree (right) … 5 = Strongly Disagree (left).
 * Column index left→right on the scale: 0 … 4.
 */
export function clampSliderValue(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(5, n))
}

/** 0 = Strongly Disagree (left) … 4 = Strongly Agree (right) */
export function sliderValueToColumnIndex(value) {
  return 5 - clampSliderValue(value)
}

const STEPS = [
  {
    id: 'strongly-disagree',
    label: 'Strongly Disagree',
    abbr: 'SD',
    boxClass:
      'border border-red-700/60 bg-gradient-to-br from-red-950 via-red-900 to-rose-950 text-red-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  {
    id: 'disagree',
    label: 'Disagree',
    abbr: 'D',
    boxClass:
      'border border-rose-500/50 bg-gradient-to-br from-red-400 via-red-300 to-rose-400 text-red-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    abbr: 'N',
    boxClass:
      'border border-amber-500/60 bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-100 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
  },
  {
    id: 'agree',
    label: 'Agree',
    abbr: 'A',
    boxClass:
      'border border-emerald-600/50 bg-gradient-to-br from-emerald-400 via-emerald-300 to-teal-300 text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
  },
  {
    id: 'strongly-agree',
    label: 'Strongly Agree',
    abbr: 'SA',
    boxClass:
      'border border-emerald-900/50 bg-gradient-to-br from-emerald-800 via-green-800 to-emerald-950 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
]

export function getSliderPositionStep(value) {
  return STEPS[sliderValueToColumnIndex(value)] ?? STEPS[2]
}
