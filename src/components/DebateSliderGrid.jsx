import { useMemo } from 'react'
import { PromptBox } from './PromptBox'

const DEFAULT_ROW_LABELS = ['Islam', 'Christianity', 'Atheism', 'Hinduism']

const PANEL_VISUALS = [
  { key: 'P1', dot: 'bg-fuchsia-600', glow: 'shadow-[0_0_32px_rgba(192,38,211,0.5)]' },
  { key: 'P2', dot: 'bg-cyan-600', glow: 'shadow-[0_0_32px_rgba(8,145,178,0.48)]' },
  { key: 'P3', dot: 'bg-amber-600', glow: 'shadow-[0_0_32px_rgba(217,119,6,0.48)]' },
  { key: 'P4', dot: 'bg-lime-600', glow: 'shadow-[0_0_32px_rgba(101,163,13,0.5)]' },
]

/** Left → right matches value 1 → 5 on the event state sliders */
const SCALE_COLUMNS = [
  {
    label: 'Strongly Agree',
    bar: 'from-rose-300 via-rose-200 to-red-200',
    edge: 'border-rose-400/90',
  },
  {
    label: 'Slightly Agree',
    bar: 'from-orange-300 via-amber-200 to-orange-100',
    edge: 'border-orange-400/85',
  },
  {
    label: 'Neutral',
    bar: 'from-slate-300 via-slate-200 to-slate-300',
    edge: 'border-slate-400/90',
  },
  {
    label: 'Slightly Disagree',
    bar: 'from-teal-200 via-emerald-200 to-slate-200',
    edge: 'border-teal-400/85',
  },
  {
    label: 'Strongly Disagree',
    bar: 'from-emerald-300 via-green-200 to-emerald-200',
    edge: 'border-emerald-500/80',
  },
]

/** Snap thumb to horizontal center of each of the five equal columns (10% … 90%). */
function valueToThumbPercent(value) {
  const v = typeof value === 'number' ? value : Number(value)
  const clamped = Number.isFinite(v) ? Math.max(1, Math.min(5, Math.round(v))) : 1
  return ((clamped - 0.5) / 5) * 100
}

function SliderRow({ value, index, iconUrl, rowLabel, showBorderBottom = true }) {
  const visuals = PANEL_VISUALS[index]
  const thumbLeftPct = valueToThumbPercent(value)

  return (
    <div className="group relative min-h-[6rem] w-full sm:min-h-[6.75rem]">
      <div
        className={`relative flex min-h-[6rem] w-full items-center sm:min-h-[6.75rem] ${
          showBorderBottom ? 'border-b border-slate-500/75' : ''
        }`}
      >
        {/* Mobile: centered above track (desktop labels sit in left margin beside table) */}
        <div className="pointer-events-none absolute left-0 right-0 top-1.5 z-20 flex justify-center md:hidden">
          <span
            className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-800"
            style={{
              textShadow: '0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            {rowLabel}
          </span>
        </div>

        {/* Five column washes — full width */}
        <div className="absolute inset-0 flex w-full">
          {SCALE_COLUMNS.map((col) => (
            <div
              key={col.label}
              className={`relative flex-1 bg-gradient-to-b ${col.bar} ${col.edge} border-r border-slate-500/65 last:border-r-0`}
            >
              {/* Fine mesh */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.2]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: '5px 5px',
                }}
                aria-hidden
              />
            </div>
          ))}
        </div>

        {/* Track + ticks — full width (no horizontal padding) so % matches column boxes */}
        <div className="relative z-10 w-full pb-1 pt-8 md:pb-2 md:pt-2">
          <div className="relative mx-auto h-12 w-full max-w-full md:h-[3.25rem]">
            {/* Tick marks at column centers: (i + ½) / 5 */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="pointer-events-none absolute top-1/2 z-[5] h-6 w-px -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${((i + 0.5) / 5) * 100}%` }}
                aria-hidden
              >
                <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-600/55 to-transparent" />
              </div>
            ))}

            {/* Horizontal rail */}
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-slate-400/70 via-slate-500/85 to-slate-400/70 shadow-[0_0_8px_rgba(15,23,42,0.08)]" />

            {/* Thumb — same % as ticks for each discrete value */}
            <div
              className="absolute top-1/2 z-[35] -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
              style={{ left: `${thumbLeftPct}%` }}
              aria-label={`${rowLabel} position ${value} of 5`}
            >
              <div className={`rounded-full ${visuals.glow}`}>
                <div className="relative h-[4.25rem] w-[4.25rem] overflow-hidden rounded-full border border-slate-400/95 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.14)] ring-2 ring-slate-300/90 backdrop-blur-sm sm:h-[4.75rem] sm:w-[4.75rem]">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`h-full w-full ${visuals.dot} opacity-90`} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DebateSliderGrid({
  prompt,
  panelists,
  panelistIcons,
  rowLabels = DEFAULT_ROW_LABELS,
  error,
  promptBoxRef,
  /** Hide in-flow prompt (e.g. BigScreen intro overlay shows it) while keeping layout for measurement */
  promptBoxHidden = false,
  /** Fade sliders + labels + error after intro (0 … 1) */
  tableOpacity = 1,
}) {
  const labels = useMemo(() => {
    return panelists.map((_, i) => rowLabels[i] ?? `Panel ${i + 1}`)
  }, [panelists, rowLabels])

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Prompt — large, centered */}
      <div
        className={`mb-10 flex w-full justify-center px-3 sm:px-4 ${
          promptBoxHidden ? 'pointer-events-none opacity-0' : ''
        }`}
        aria-hidden={promptBoxHidden}
      >
        <PromptBox ref={promptBoxRef}>
          {prompt?.trim() ? prompt : (
            <span className="text-lg font-normal text-slate-500/95 md:text-xl">
              Waiting for the current prompt…
            </span>
          )}
        </PromptBox>
      </div>

      <div
        className="transition-opacity duration-700 ease-out"
        style={{ opacity: tableOpacity }}
      >
      {error ? (
        <div className="mb-6 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* Table — centered, labels outside the card */}
      <div className="flex w-full justify-center px-3 sm:px-4">
        <div className="relative w-full max-w-6xl">
          {/* Desktop row labels in the left margin (not part of the table card) */}
          <div className="pointer-events-none absolute bottom-0 right-full top-0 z-10 mr-3 hidden w-[13rem] flex-col items-end md:flex lg:mr-5 lg:w-[14rem]">
            {/* Spacer matches the table header row height */}
            <div className="min-h-[4.25rem] shrink-0 sm:min-h-[5rem]" aria-hidden />
            {labels.map((label, i) => (
              <div
                key={PANEL_VISUALS[i].key}
                className="flex min-h-[6rem] items-center justify-end sm:min-h-[6.75rem]"
              >
                <span className="text-right text-sm font-semibold uppercase leading-tight tracking-[0.16em] text-slate-800 sm:text-base sm:tracking-[0.14em]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Rounded table card only (no labels inside) */}
          <div className="w-full overflow-hidden rounded-2xl border border-slate-400/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative grid grid-cols-5 gap-0 border-b border-slate-500/70 bg-slate-100/95">
              {SCALE_COLUMNS.map((col) => (
                <div
                  key={col.label}
                  className="border-r border-slate-400/80 px-1 py-3 text-center last:border-r-0 sm:px-2 sm:py-4"
                >
                  <span className="block text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-700 sm:text-[0.65rem] sm:tracking-[0.14em]">
                    {col.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 30%, rgba(251,113,133,0.18) 0%, transparent 45%),
                radial-gradient(circle at 80% 70%, rgba(52,211,153,0.16) 0%, transparent 40%)`,
                }}
                aria-hidden
              />
              {panelists.map((value, i) => (
                <SliderRow
                  key={PANEL_VISUALS[i].key}
                  value={value}
                  index={i}
                  iconUrl={panelistIcons[i]}
                  rowLabel={labels[i]}
                  showBorderBottom={i < panelists.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
