import { useMemo } from 'react'

const DEFAULT_ROW_LABELS = ['Islam', 'Christianity', 'Atheism', 'Hinduism']

const PANEL_VISUALS = [
  { key: 'P1', dot: 'bg-fuchsia-500', glow: 'shadow-[0_0_28px_rgba(232,121,249,0.45)]' },
  { key: 'P2', dot: 'bg-cyan-400', glow: 'shadow-[0_0_28px_rgba(34,211,238,0.4)]' },
  { key: 'P3', dot: 'bg-amber-400', glow: 'shadow-[0_0_28px_rgba(251,191,36,0.4)]' },
  { key: 'P4', dot: 'bg-lime-400', glow: 'shadow-[0_0_28px_rgba(163,230,53,0.45)]' },
]

/** Left → right matches value 1 → 5 on the event state sliders */
const SCALE_COLUMNS = [
  {
    label: 'Strongly Agree',
    bar: 'from-[#3a0a0c] via-[#5c1218] to-[#2a080a]',
    edge: 'border-rose-900/40',
  },
  {
    label: 'Slightly Agree',
    bar: 'from-[#2a1818] via-[#3d2420] to-[#221818]',
    edge: 'border-orange-900/25',
  },
  {
    label: 'Neutral',
    bar: 'from-[#1f1a14] via-[#2d2618] to-[#18140f]',
    edge: 'border-amber-900/20',
  },
  {
    label: 'Slightly Disagree',
    bar: 'from-[#0f1a14] via-[#142820] to-[#0c1510]',
    edge: 'border-emerald-900/25',
  },
  {
    label: 'Strongly Disagree',
    bar: 'from-[#061a10] via-[#0c2818] to-[#041208]',
    edge: 'border-emerald-800/35',
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
    <div className="group relative min-h-[5.5rem] w-full sm:min-h-[6.25rem]">
      <div
        className={`relative flex min-h-[5.5rem] w-full items-center sm:min-h-[6.25rem] ${
          showBorderBottom ? 'border-b border-white/[0.06]' : ''
        }`}
      >
        {/* Mobile: centered above track (desktop labels sit in left margin beside table) */}
        <div className="pointer-events-none absolute left-0 right-0 top-2 z-20 flex justify-center md:hidden">
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-100/90"
            style={{
              textShadow:
                '0 0 24px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.85)',
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
              className={`relative flex-1 bg-gradient-to-b ${col.bar} ${col.edge} border-r border-black/20 last:border-r-0`}
            >
              {/* Fine mesh */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '5px 5px',
                }}
                aria-hidden
              />
            </div>
          ))}
        </div>

        {/* Track + ticks — full width (no horizontal padding) so % matches column boxes */}
        <div className="relative z-10 w-full pb-1 pt-7 md:pb-2 md:pt-2">
          <div className="relative mx-auto h-11 w-full max-w-full md:h-12">
            {/* Tick marks at column centers: (i + ½) / 5 */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="pointer-events-none absolute top-1/2 z-[5] h-6 w-px -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${((i + 0.5) / 5) * 100}%` }}
                aria-hidden
              >
                <div className="h-full w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />
              </div>
            ))}

            {/* Horizontal rail */}
            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-white/5 via-white/25 to-white/5 shadow-[0_0_12px_rgba(255,255,255,0.06)]" />

            {/* Thumb — same % as ticks for each discrete value */}
            <div
              className="absolute top-1/2 z-[35] -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
              style={{ left: `${thumbLeftPct}%` }}
              aria-label={`${rowLabel} position ${value} of 5`}
            >
              <div className={`rounded-full ${visuals.glow}`}>
                <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/25 bg-[#0a0a0a]/90 shadow-[0_8px_32px_rgba(0,0,0,0.65)] ring-1 ring-white/10 backdrop-blur-sm sm:h-16 sm:w-16">
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
}) {
  const labels = useMemo(() => {
    return panelists.map((_, i) => rowLabels[i] ?? `Panel ${i + 1}`)
  }, [panelists, rowLabels])

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Prompt — large, centered */}
      <div className="mb-10 flex w-full justify-center px-3 sm:px-4">
        <div className="relative w-full max-w-6xl">
          <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-white/12 via-indigo-500/10 to-white/12 opacity-90 blur-md" />
          <div className="relative rounded-[1.75rem] border border-white/20 bg-black/55 px-8 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:px-12 sm:py-9 md:px-16 md:py-10">
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-sky-300/90 sm:text-sm">
              Prompt
            </p>
            <p className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {prompt?.trim() ? prompt : (
                <span className="text-lg font-normal text-slate-500 md:text-xl">
                  Waiting for the current prompt…
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          {error}
        </div>
      ) : null}

      {/* Table stays full width of max-w-7xl (same as before); labels sit in the margin via right-full */}
      <div className="relative w-full">
        <div className="pointer-events-none absolute bottom-0 right-full top-0 z-10 mr-2 hidden w-[min(10.5rem,26vw)] flex-col items-end sm:mr-3 md:flex lg:mr-4">
          {/* Match header row height so row labels align with slider rows (not below center) */}
          <div className="min-h-[4.25rem] shrink-0 sm:min-h-[5rem]" aria-hidden />
          {labels.map((label, i) => (
            <div
              key={PANEL_VISUALS[i].key}
              className="flex min-h-[5.5rem] items-center justify-end sm:min-h-[6.25rem]"
            >
              <span className="text-right text-[0.65rem] font-semibold uppercase leading-snug tracking-[0.2em] text-slate-300 sm:text-xs">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505] shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="relative grid grid-cols-5 gap-0 border-b border-white/[0.07] bg-black/40">
            {SCALE_COLUMNS.map((col) => (
              <div
                key={col.label}
                className="border-r border-white/[0.05] px-1 py-3 text-center last:border-r-0 sm:px-2 sm:py-4"
              >
                <span className="block text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-400/95 sm:text-[0.65rem] sm:tracking-[0.14em]">
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, rgba(120,40,40,0.15) 0%, transparent 45%),
                radial-gradient(circle at 80% 70%, rgba(20,80,50,0.12) 0%, transparent 40%)`,
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
  )
}
