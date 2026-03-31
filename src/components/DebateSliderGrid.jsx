import { useMemo } from 'react'
import { PromptBox } from './PromptBox'

const DEFAULT_ROW_LABELS = ['Islam', 'Christianity', 'Atheism', 'Hinduism']

const PANEL_VISUALS = [
  { key: 'P1', dot: 'bg-fuchsia-600', glow: 'shadow-[0_0_32px_rgba(192,38,211,0.5)]' },
  { key: 'P2', dot: 'bg-cyan-600', glow: 'shadow-[0_0_32px_rgba(8,145,178,0.48)]' },
  { key: 'P3', dot: 'bg-amber-600', glow: 'shadow-[0_0_32px_rgba(217,119,6,0.48)]' },
  { key: 'P4', dot: 'bg-lime-600', glow: 'shadow-[0_0_32px_rgba(101,163,13,0.5)]' },
]

/**
 * Left → right: Strongly Disagree … Strongly Agree (red → green).
 * Stored values stay 1 = Strongly Agree … 5 = Strongly Disagree; thumb position is mirrored so
 * agree sits on the green side and disagree on the red side.
 */
const HEADER_LABEL_CLASS =
  'text-base font-semibold uppercase leading-tight tracking-[0.14em] text-slate-800 sm:text-lg sm:tracking-[0.12em]'

const SCALE_COLUMNS = [
  {
    id: 'strongly-disagree',
    label: 'Strongly Disagree',
    bar: 'from-red-950 via-red-800 to-rose-900',
    edge: 'border-red-900/95',
  },
  {
    id: 'disagree',
    label: 'Disagree',
    bar: 'from-red-200 via-rose-100 to-red-100',
    edge: 'border-rose-400/90',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    bar: 'from-amber-200 via-yellow-100 to-amber-100',
    edge: 'border-amber-500/80',
  },
  {
    id: 'agree',
    label: 'Agree',
    bar: 'from-emerald-400 via-emerald-300 to-teal-200',
    edge: 'border-emerald-600/75',
  },
  {
    id: 'strongly-agree',
    label: 'Strongly Agree',
    headerLines: ['Strongly', 'Agree'],
    bar: 'from-emerald-800 via-green-800 to-emerald-950',
    edge: 'border-emerald-900/95',
  },
]

/** Snap thumb to column centers (10% … 90%). Value 1 = agree (right / green); 5 = disagree (left / red). */
function valueToThumbPercent(value) {
  const v = typeof value === 'number' ? value : Number(value)
  const clamped = Number.isFinite(v) ? Math.max(1, Math.min(5, Math.round(v))) : 1
  const colFromLeft = 5 - clamped
  return ((colFromLeft + 0.5) / 5) * 100
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
            className="text-base font-semibold uppercase tracking-[0.16em] text-slate-800 sm:text-lg"
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
              key={col.id}
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
  /** Ref on the prompt shell (blur + card) for FLIP handoff on BigScreen */
  promptBoxCardRef,
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
        <PromptBox cardRef={promptBoxCardRef}>
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
          <div className="pointer-events-none absolute bottom-0 right-full top-0 z-10 mr-3 hidden w-[15rem] flex-col items-end md:flex lg:mr-5 lg:w-[17rem]">
            {/* Spacer matches the table header row height (incl. two-line “Strongly / Agree”) */}
            <div className="min-h-[6.25rem] shrink-0 sm:min-h-[6.75rem]" aria-hidden />
            {labels.map((label, i) => (
              <div
                key={PANEL_VISUALS[i].key}
                className="flex min-h-[6rem] items-center justify-end sm:min-h-[6.75rem]"
              >
                <span className="text-right text-base font-semibold uppercase leading-tight tracking-[0.14em] text-slate-800 sm:text-lg sm:tracking-[0.12em]">
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
                  key={col.id}
                  className="relative flex min-h-[6.25rem] flex-col items-center justify-center border-r border-slate-400/80 px-1 py-3 text-center last:border-r-0 sm:min-h-[6.75rem] sm:px-2 sm:py-4"
                >
                  {col.headerLines ? (
                    <span className={`block w-full text-balance ${HEADER_LABEL_CLASS}`}>
                      {col.headerLines[0]}
                      <br />
                      {col.headerLines[1]}
                    </span>
                  ) : (
                    <span className={`block w-full max-w-[min(100%,11rem)] text-balance ${HEADER_LABEL_CLASS}`}>
                      {col.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                  backgroundImage: `radial-gradient(circle at 18% 32%, rgba(127,29,29,0.22) 0%, transparent 46%),
                radial-gradient(circle at 82% 68%, rgba(6,78,59,0.2) 0%, transparent 42%)`,
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
