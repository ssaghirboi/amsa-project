import { useMemo } from 'react'
import { PANELIST_DISPLAY_NAMES } from '../constants/panelists'
import { PromptBox } from './PromptBox'

const DEFAULT_ROW_LABELS = PANELIST_DISPLAY_NAMES

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
const HEADER_LABEL_CLASS_LIGHT =
  'text-lg font-semibold uppercase leading-tight tracking-[0.12em] text-slate-800 sm:text-xl md:text-2xl sm:tracking-[0.11em]'
const HEADER_LABEL_CLASS_DARK =
  'text-lg font-semibold uppercase leading-tight tracking-[0.12em] text-slate-100 sm:text-xl md:text-2xl sm:tracking-[0.11em]'

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
    bar: 'from-red-400 via-red-300 to-red-200',
    edge: 'border-rose-500/90',
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

function SliderRow({ value, rowLabel, showBorderBottom = true, theme = 'light' }) {
  const thumbLeftPct = valueToThumbPercent(value)
  const isDark = theme === 'dark'

  return (
    <div className="group relative min-h-[7.5rem] w-full sm:min-h-[8.25rem]">
      <div
        className={`relative flex min-h-[7.5rem] w-full items-center sm:min-h-[8.25rem] ${
          showBorderBottom ? (isDark ? 'border-b border-slate-600/70' : 'border-b border-slate-500/75') : ''
        }`}
      >
        {/* Mobile: centered above track (desktop labels sit in left margin beside table) */}
        <div className="pointer-events-none absolute left-0 right-0 top-1.5 z-20 flex justify-center md:hidden">
          <span
            className={`text-lg font-semibold uppercase tracking-[0.14em] sm:text-xl ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
            style={
              isDark
                ? { textShadow: '0 1px 3px rgba(0,0,0,0.85)' }
                : { textShadow: '0 1px 0 rgba(255,255,255,0.8)' }
            }
          >
            {rowLabel}
          </span>
        </div>

        {/* Five column washes — full width */}
        <div className="absolute inset-0 flex w-full">
          {SCALE_COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`relative flex-1 bg-gradient-to-b ${col.bar} ${col.edge} border-r last:border-r-0 ${
                isDark ? 'border-slate-700/75' : 'border-slate-500/65'
              }`}
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
        <div className="relative z-10 w-full pb-1.5 pt-9 md:pb-2.5 md:pt-2.5">
          <div className="relative mx-auto h-14 w-full max-w-full md:h-[4rem]">
            {/* Tick marks at column centers: (i + ½) / 5 */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="pointer-events-none absolute top-1/2 z-[5] h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700/90 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                style={{ left: `${((i + 0.5) / 5) * 100}%` }}
                aria-hidden
              />
            ))}

            {/* Horizontal rail */}
            <div className="absolute left-0 right-0 top-1/2 z-[6] h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-slate-400/70 via-slate-500/85 to-slate-400/70 shadow-[0_0_8px_rgba(15,23,42,0.08)]" />

            {/* Thumb — same % as ticks for each discrete value */}
            <div
              className="absolute top-1/2 z-[35] -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
              style={{ left: `${thumbLeftPct}%` }}
              aria-label={`${rowLabel} position ${value} of 5`}
            >
              <div className="box-border h-9 w-9 rounded-full border-[3px] border-black bg-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] sm:h-10 sm:w-10" />
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
  rowLabels = DEFAULT_ROW_LABELS,
  error,
  /** Ref on the prompt shell (blur + card) for FLIP handoff on BigScreen */
  promptBoxCardRef,
  /** Hide in-flow prompt (e.g. BigScreen intro overlay shows it) while keeping layout for measurement */
  promptBoxHidden = false,
  /** Fade sliders + labels + error after intro (0 … 1) */
  tableOpacity = 1,
  /** Match BigScreen intro PromptBox sizing for FLIP alignment (e.g. fullscreen clamp classes) */
  promptInnerClassName = '',
  promptBodyClassName = '',
  /** BigScreen auditorium display */
  theme = 'light',
}) {
  const isDark = theme === 'dark'
  const headerLabelClass = isDark ? HEADER_LABEL_CLASS_DARK : HEADER_LABEL_CLASS_LIGHT

  const labels = useMemo(() => {
    return panelists.map((_, i) => rowLabels[i] ?? `Panel ${i + 1}`)
  }, [panelists, rowLabels])

  return (
    <div className="mx-auto w-full max-w-[min(100%,90rem)]">
      {/* Prompt — large, centered */}
      <div
        className={`mb-10 flex w-full justify-center px-2 sm:px-4 ${
          promptBoxHidden ? 'pointer-events-none opacity-0' : ''
        }`}
        aria-hidden={promptBoxHidden}
      >
        <PromptBox
          cardRef={promptBoxCardRef}
          maxWidthClass="w-full max-w-[min(100%,85rem)]"
          innerClassName={prompt?.trim() ? promptInnerClassName : ''}
          bodyClassName={prompt?.trim() ? promptBodyClassName : ''}
          variant={isDark ? 'dark' : 'light'}
        >
          {prompt?.trim() ? prompt : (
            <span
              className={`text-xl font-normal md:text-2xl ${
                isDark ? 'text-slate-400' : 'text-slate-500/95'
              }`}
            >
              Waiting for the next prompt…
            </span>
          )}
        </PromptBox>
      </div>

      <div
        className="transition-opacity duration-700 ease-out"
        style={{ opacity: tableOpacity }}
      >
      {error ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            isDark
              ? 'border-red-500/45 bg-red-950/55 text-red-200'
              : 'border-red-300/60 bg-red-50 text-red-800'
          }`}
        >
          {error}
        </div>
      ) : null}

      {/* Table — centered, labels outside the card */}
      <div className="flex w-full justify-center px-2 sm:px-4">
        <div className="relative w-full max-w-[min(100%,90rem)]">
          {/* Desktop row labels in the left margin (not part of the table card) */}
          <div className="pointer-events-none absolute bottom-0 right-full top-0 z-10 mr-2 hidden w-[17rem] flex-col items-end md:flex lg:mr-6 lg:w-[19rem]">
            {/* Spacer matches the table header row height (incl. two-line “Strongly / Agree”) */}
            <div className="min-h-[7.25rem] shrink-0 sm:min-h-[8rem]" aria-hidden />
            {labels.map((label, i) => (
              <div
                key={PANEL_VISUALS[i].key}
                className="flex min-h-[7.5rem] items-center justify-end sm:min-h-[8.25rem]"
              >
                <span
                  className={`text-right text-lg font-semibold uppercase leading-tight tracking-[0.12em] sm:text-xl md:text-2xl sm:tracking-[0.11em] ${
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Rounded table card only (no labels inside) */}
          <div
            className={`w-full overflow-hidden rounded-2xl border shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
              isDark
                ? 'border-slate-600/75 bg-slate-950/90 [box-shadow:0_24px_80px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'border-slate-400/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
            }`}
          >
            <div
              className={`relative grid grid-cols-5 gap-0 border-b ${
                isDark ? 'border-slate-600/70 bg-slate-800/95' : 'border-slate-500/70 bg-slate-100/95'
              }`}
            >
              {SCALE_COLUMNS.map((col) => (
                <div
                  key={col.id}
                  className={`relative flex min-h-[7.25rem] flex-col items-center justify-center border-r px-1.5 py-3.5 text-center last:border-r-0 sm:min-h-[8rem] sm:px-3 sm:py-5 ${
                    isDark ? 'border-slate-600/70' : 'border-slate-400/80'
                  }`}
                >
                  {col.headerLines ? (
                    <span className={`block w-full text-balance ${headerLabelClass}`}>
                      {col.headerLines[0]}
                      <br />
                      {col.headerLines[1]}
                    </span>
                  ) : (
                    <span className={`block w-full max-w-[min(100%,11rem)] text-balance ${headerLabelClass}`}>
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
                  rowLabel={labels[i]}
                  showBorderBottom={i < panelists.length - 1}
                  theme={theme}
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
