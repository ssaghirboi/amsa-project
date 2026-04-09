import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import {
  DEFAULT_PROMPT_SEQUENCE,
  fetchCurrentEventState,
  subscribeToEventState,
  writeEventState,
} from '../supabase/eventState'
import {
  PRESENTATION_SLIDE_COUNT,
  clampPresentationSlideIndex,
  mergePresentationSlidesFromRemote,
} from '../constants/presentationSlides'
import {
  QA_SLIDE_COUNT,
  clampQaSlideIndex,
  mergeQaSlidesFromRemote,
} from '../constants/qaSlideshow'
import {
  getSliderPositionStep,
  sliderValueToThumbPercent,
} from '../constants/debateSliderScale'
import {
  GENERAL_TARGET_KEY,
  PANELIST_DISPLAY_NAMES_MC,
  audienceQueueItemsMatch,
  displayNameForMcTarget,
  getEmptyMcQuestionSlots,
  normalizeQaAudienceQueue,
} from '../constants/panelists'

const PANEL_SPECTRUM_ACCENT = [
  { dot: 'bg-fuchsia-500', ring: 'ring-fuchsia-400/90' },
  { dot: 'bg-cyan-500', ring: 'ring-cyan-400/90' },
  { dot: 'bg-amber-500', ring: 'ring-amber-400/90' },
  { dot: 'bg-lime-500', ring: 'ring-lime-400/90' },
]

function normalizePrompt(s) {
  return String(s ?? '').trim().toLowerCase()
}

function emptyMcQuestions(nextPrompt, options = {}) {
  const base = {
    prompt: String(nextPrompt ?? ''),
    panelists: getEmptyMcQuestionSlots(),
    qaAudienceQueue: [],
  }
  if (options.skipDebateIntro) {
    base.skipDebateIntro = true
  }
  if (typeof options.introRestartToken === 'number') {
    base.introRestartToken = options.introRestartToken
  }
  return base
}

function getNextPrompt(current, sequence) {
  const seq = Array.isArray(sequence) && sequence.length > 0 ? sequence : DEFAULT_PROMPT_SEQUENCE
  const cur = normalizePrompt(current)
  const idx = seq.findIndex((p) => normalizePrompt(p) === cur)
  const nextIndex = idx >= 0 ? (idx + 1) % seq.length : 0
  return { next: String(seq[nextIndex] ?? ''), nextIndex, total: seq.length, seq }
}

function presentationSlideLabel(slide) {
  if (!slide) return '—'
  if (slide.kind === 'hero') return String(slide.tagline ?? '').trim() || 'Hero'
  return String(slide.title ?? '').trim() || '—'
}

function presentationSlideSub(slide) {
  if (!slide || slide.kind === 'hero') return ''
  return String(slide.subtitle ?? '').trim()
}

function QaSlideMain({ slides, index }) {
  const s = slides?.[index]
  if (!s) return <p className="text-slate-500">—</p>
  if (index === 0) {
    return (
      <p className="text-balance text-[clamp(1.5rem,4.2vw,2.75rem)] font-semibold leading-tight text-slate-50">
        {s.title ?? ''}
      </p>
    )
  }
  if (index === 1) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-balance text-[clamp(1.5rem,4.2vw,2.75rem)] font-semibold leading-tight text-slate-50">
          {s.title ?? ''}
        </p>
        <p className="text-balance text-[clamp(1rem,2.5vw,1.5rem)] font-medium text-slate-400">
          {s.subtitle ?? ''}
        </p>
      </div>
    )
  }
  return (
    <p className="text-balance text-[clamp(1.35rem,3.5vw,2.25rem)] font-medium text-slate-300">
      {s.title ?? ''}
    </p>
  )
}

function QaSlidePreview({ slides, index }) {
  const s = slides?.[index]
  if (!s) return <span className="text-slate-500">—</span>
  if (index === 1) {
    return (
      <span className="line-clamp-3">
        {s.title}
        {String(s.subtitle ?? '').trim() ? ` · ${s.subtitle}` : ''}
      </span>
    )
  }
  return <span className="line-clamp-3">{s.title ?? '—'}</span>
}

function McSpectrumSidebar({ panelists }) {
  const values = Array.isArray(panelists) && panelists.length === 4 ? panelists : [3, 3, 3, 3]
  return (
    <aside className="flex w-[min(100%,12.5rem)] shrink-0 flex-col gap-3 overflow-y-auto pr-1 sm:w-[min(100%,14rem)]">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[0.65rem]">
        Stances
      </p>
      {values.map((raw, i) => {
        const step = getSliderPositionStep(raw)
        const pct = sliderValueToThumbPercent(raw)
        const accent = PANEL_SPECTRUM_ACCENT[i] ?? PANEL_SPECTRUM_ACCENT[0]
        return (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-black/40 p-2.5 shadow-inner ring-1 ring-white/5"
          >
            <p className="text-[0.65rem] font-medium leading-snug text-slate-200 sm:text-xs">
              {PANELIST_DISPLAY_NAMES_MC[i]}
            </p>
            <div className="relative mt-2 h-7 w-full overflow-hidden rounded-lg border border-slate-600/50">
              <div className="absolute inset-0 flex">
                <div className="flex-1 bg-gradient-to-b from-red-950 via-red-800 to-rose-900" />
                <div className="flex-1 bg-gradient-to-b from-red-400 via-red-300 to-red-200" />
                <div className="flex-1 bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-100" />
                <div className="flex-1 bg-gradient-to-b from-emerald-400 via-emerald-300 to-teal-200" />
                <div className="flex-1 bg-gradient-to-b from-emerald-800 via-green-800 to-emerald-950" />
              </div>
              <div
                className={`pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-lg ring-2 ${accent.ring} ${accent.dot}`}
                style={{ left: `${pct}%` }}
              />
            </div>
            <p
              className={`mt-1.5 text-center text-[0.62rem] font-semibold uppercase tracking-wide sm:text-[0.68rem] ${step.boxClass}`}
              title={step.label}
            >
              {step.label}
            </p>
          </div>
        )
      })}
    </aside>
  )
}

export default function McPage() {
  const [prompt, setPrompt] = useState('')
  const [panelists, setPanelists] = useState([3, 3, 3, 3])
  const [panelistIcons, setPanelistIcons] = useState([null, null, null, null])
  const [promptSequence, setPromptSequence] = useState(DEFAULT_PROMPT_SEQUENCE)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [qaSlideshowActive, setQaSlideshowActive] = useState(false)
  const [qaSlideshowIndex, setQaSlideshowIndex] = useState(0)
  const [presentationSlides, setPresentationSlides] = useState(() =>
    mergePresentationSlidesFromRemote(null),
  )
  const [status, setStatus] = useState('Connecting…')
  const [error, setError] = useState('')
  const [mcQuestions, setMcQuestions] = useState(null)
  const [qaSlideshowSlides, setQaSlideshowSlides] = useState(() =>
    mergeQaSlidesFromRemote(null),
  )
  const [debateRevealAck, setDebateRevealAck] = useState(false)
  useEffect(() => {
    let unsubscribe = null
    let pollId = null

    const apply = (next) => {
      const nextPromptStr = next.prompt ?? ''

      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setPromptSequence(next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE)
      setSlideshowActive(Boolean(next.slideshowActive))
      setQaSlideshowActive(Boolean(next.qaSlideshowActive))
      const qi = clampQaSlideIndex(next.qaSlideshowIndex ?? 0)
      setQaSlideshowIndex(qi)
      setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
      const mergedDeck = mergePresentationSlidesFromRemote(next.presentationSlides ?? null)
      setPresentationSlides(mergedDeck)
      const si = clampPresentationSlideIndex(
        next.slideshowIndex ?? 0,
        mergedDeck.length || PRESENTATION_SLIDE_COUNT,
      )
      setSlideshowIndex(si)
      setDebateRevealAck(Boolean(next.debateRevealAck))

      setStatus('Live')
      setError('')

      const incomingMc = next.mcQuestions ?? null
      const incomingPrompt = String(incomingMc?.prompt ?? '')
      const promptMismatch =
        incomingMc && normalizePrompt(incomingPrompt) !== normalizePrompt(nextPromptStr)

      setPrompt(nextPromptStr)
      setPanelists(next.panelists ?? [3, 3, 3, 3])

      setMcQuestions(incomingMc)

      if (promptMismatch) {
        writeEventState(supabase, {
          prompt: nextPromptStr,
          panelists: next.panelists ?? [3, 3, 3, 3],
          panelistIcons: next.panelistIcons ?? [null, null, null, null],
          promptSequence: next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
          presentationSlides: mergePresentationSlidesFromRemote(
            next.presentationSlides ?? null,
          ),
          slideshowActive: Boolean(next.slideshowActive),
          slideshowIndex: next.slideshowIndex ?? 0,
          qaSlideshowActive: Boolean(next.qaSlideshowActive),
          qaSlideshowIndex: next.qaSlideshowIndex ?? 0,
          qaSlideshowSlides: mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null),
          mcQuestions: emptyMcQuestions(nextPromptStr),
          debateRevealAck: false,
        }).catch(() => {})
      }
    }

    ;(async () => {
      setStatus('Connecting…')
      setError('')
      const current = await fetchCurrentEventState(supabase).catch((e) => {
        setError(e?.message || String(e))
        return null
      })
      if (current) {
        const mergedDeck = mergePresentationSlidesFromRemote(current.presentationSlides ?? null)
        const si = clampPresentationSlideIndex(
          current.slideshowIndex ?? 0,
          mergedDeck.length || PRESENTATION_SLIDE_COUNT,
        )
        setSlideshowIndex(si)
        apply(current)
      } else setStatus('Waiting for event state…')
    })()

    unsubscribe = subscribeToEventState(supabase, apply)

    pollId = setInterval(() => {
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) apply(next)
        })
        .catch(() => {})
    }, 8000)

    return () => {
      if (unsubscribe) unsubscribe()
      if (pollId) clearInterval(pollId)
    }
  }, [])

  const nextInfo = useMemo(() => getNextPrompt(prompt, promptSequence), [prompt, promptSequence])
  const currentSlide = useMemo(() => {
    if (!Array.isArray(presentationSlides) || presentationSlides.length === 0) return null
    const idx = clampPresentationSlideIndex(
      slideshowIndex,
      presentationSlides.length || PRESENTATION_SLIDE_COUNT,
    )
    return presentationSlides[idx] ?? presentationSlides[0] ?? null
  }, [presentationSlides, slideshowIndex])

  const deckLen = Array.isArray(presentationSlides) ? presentationSlides.length : 0
  const nextPresentationSlide = useMemo(() => {
    if (!deckLen) return null
    const nextIdx = (slideshowIndex + 1) % deckLen
    return presentationSlides[nextIdx] ?? null
  }, [presentationSlides, slideshowIndex, deckLen])

  const nextQaIndex = useMemo(
    () => (qaSlideshowIndex + 1) % QA_SLIDE_COUNT,
    [qaSlideshowIndex],
  )

  const qaAudienceSorted = useMemo(() => {
    return normalizeQaAudienceQueue(mcQuestions?.qaAudienceQueue)
  }, [mcQuestions?.qaAudienceQueue])

  const removeQaAudienceItem = async (item) => {
    if (!qaSlideshowActive || !mcQuestions || !item) return

    setStatus('Updating…')
    setError('')
    try {
      const queue = normalizeQaAudienceQueue(mcQuestions.qaAudienceQueue).filter(
        (x) => !audienceQueueItemsMatch(x, item),
      )
      const nextMc = {
        prompt: String(mcQuestions.prompt ?? prompt ?? ''),
        panelists: {
          [GENERAL_TARGET_KEY]: mcQuestions.panelists?.[GENERAL_TARGET_KEY] ?? null,
          'Panelist 1': mcQuestions.panelists?.['Panelist 1'] ?? null,
          'Panelist 2': mcQuestions.panelists?.['Panelist 2'] ?? null,
          'Panelist 3': mcQuestions.panelists?.['Panelist 3'] ?? null,
          'Panelist 4': mcQuestions.panelists?.['Panelist 4'] ?? null,
        },
        qaAudienceQueue: queue,
      }
      if (mcQuestions.skipDebateIntro === true) nextMc.skipDebateIntro = true

      await writeEventState(supabase, {
        prompt: prompt ?? '',
        panelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive,
        slideshowIndex,
        qaSlideshowActive,
        qaSlideshowIndex,
        mcQuestions: nextMc,
        debateRevealAck,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const mainStage = (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 sm:rounded-3xl sm:p-6 md:p-8">
      <div
        className="pointer-events-none absolute right-2 top-2 z-10 max-w-[min(100%,14rem)] overflow-hidden rounded-xl border border-white/15 bg-black/75 px-3 py-2.5 shadow-xl ring-1 ring-white/10 backdrop-blur-md sm:right-3 sm:top-3 sm:max-w-[min(100%,17rem)] sm:px-3.5 sm:py-3"
        aria-hidden
      >
        <div className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[0.6rem]">
          Next
        </div>
        <div className="mt-1 text-left text-[0.72rem] font-medium leading-snug text-slate-200 sm:text-[0.8rem]">
          {qaSlideshowActive ? (
            <>
              <span className="block text-[0.55rem] uppercase tracking-wider text-slate-500">
                Q&amp;A {nextQaIndex + 1}/{QA_SLIDE_COUNT}
              </span>
              <QaSlidePreview slides={qaSlideshowSlides} index={nextQaIndex} />
            </>
          ) : slideshowActive ? (
            <>
              <span className="block text-[0.55rem] uppercase tracking-wider text-slate-500">
                Slide{' '}
                {deckLen ? ((slideshowIndex + 1) % deckLen) + 1 : '—'}/{deckLen || '—'}
              </span>
              <span className="line-clamp-4 block text-pretty">
                {presentationSlideLabel(nextPresentationSlide)}
                {presentationSlideSub(nextPresentationSlide) ? (
                  <span className="text-slate-400">
                    {' '}
                    · {presentationSlideSub(nextPresentationSlide)}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <>
              <span className="block text-[0.55rem] uppercase tracking-wider text-slate-500">
                Prompt
              </span>
              <span className="line-clamp-5">{nextInfo.next || '—'}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pt-14 text-center sm:px-4 sm:pt-16">
        {qaSlideshowActive ? (
          <QaSlideMain slides={qaSlideshowSlides} index={qaSlideshowIndex} />
        ) : slideshowActive ? (
          currentSlide?.kind === 'hero' ? (
            <p className="max-w-4xl text-balance text-[clamp(1.35rem,3.8vw,2.5rem)] font-medium leading-tight text-slate-200">
              {currentSlide.tagline || ' '}
            </p>
          ) : (
            <div className="max-w-4xl space-y-4">
              <h2 className="text-balance text-[clamp(1.5rem,4vw,2.75rem)] font-semibold leading-tight text-slate-50">
                {currentSlide?.title || ' '}
              </h2>
              {String(currentSlide?.subtitle ?? '').trim() !== '' ? (
                <p className="text-balance text-[clamp(1rem,2.5vw,1.5rem)] font-medium text-slate-400">
                  {currentSlide.subtitle}
                </p>
              ) : null}
            </div>
          )
        ) : (
          <p className="max-w-[min(100%,56rem)] text-balance text-[clamp(1.35rem,3.6vw,2.35rem)] font-semibold leading-[1.15] tracking-tight text-slate-50">
            {prompt?.trim() ? prompt.trim() : 'Waiting for the current prompt…'}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#010101] text-slate-100">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-5 lg:px-8 lg:pb-6">
        <div className="flex shrink-0 flex-col gap-3 sm:gap-4">
          <div className="pl-[max(0px,calc(env(safe-area-inset-left)-0.25rem))] pt-1">
            <EventBranding variant="mc" className="shrink-0" />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/35 px-4 py-3 backdrop-blur sm:gap-4 sm:px-6 sm:py-4">
            <div className="min-w-0 pl-0.5">
              <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
                MC Control
              </div>
              <div className="mt-1 text-sm text-slate-300 sm:text-[0.9375rem]">
                Status: <span className="text-indigo-300">{status}</span>
                {qaSlideshowActive ? (
                  <span className="ml-2 text-emerald-300/90">• Q&amp;A end ON</span>
                ) : slideshowActive ? (
                  <span className="ml-2 text-amber-200/90">• Slideshow ON</span>
                ) : (
                  <span className="ml-2 text-slate-400">• Debate</span>
                )}
              </div>
            </div>

            {qaSlideshowActive ? (
              <div className="text-xs text-slate-400">
                Q&amp;A slide {qaSlideshowIndex + 1} of {QA_SLIDE_COUNT} · Admin controls slides
              </div>
            ) : slideshowActive ? (
              <div className="text-xs text-slate-400">
                Slide {slideshowIndex + 1} of {deckLen || PRESENTATION_SLIDE_COUNT} · Admin controls
              </div>
            ) : (
              <p className="max-w-md text-right text-xs text-slate-500">Prompt: Admin</p>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-3 shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95 sm:mt-4">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:mt-4">
          <div className="flex min-h-0 flex-1 flex-row gap-3 overflow-hidden sm:gap-4">
            <McSpectrumSidebar panelists={panelists} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {qaSlideshowActive ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
                  <div className="flex h-[min(32vh,300px)] min-h-[140px] shrink-0 flex-col overflow-hidden sm:h-[min(34vh,320px)] sm:min-h-[160px]">
                    <div className="min-h-0 flex-1 [&>div]:h-full [&>div]:min-h-0">
                      {mainStage}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    <div className="shrink-0 border-b border-white/10 px-3 py-2 sm:px-4">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-300/90 sm:text-xs">
                        Audience queue · {qaAudienceSorted.length}
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3">
                      {qaAudienceSorted.length === 0 ? (
                        <p className="py-2 text-sm text-slate-500">None pushed yet.</p>
                      ) : (
                        <ul className="space-y-3">
                          {qaAudienceSorted.map((item, idx) => (
                            <li
                              key={
                                item.id != null
                                  ? `qa-${item.id}`
                                  : `qa-${idx}-${item.created_at}-${item.question_text?.slice(0, 48)}`
                              }
                              className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 sm:px-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200/95">
                                  {displayNameForMcTarget(item.target_key)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQaAudienceItem(item)}
                                  disabled={status === 'Updating…'}
                                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[0.65rem] font-semibold uppercase text-slate-300 hover:bg-white/10 disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="mt-2 text-pretty text-sm font-medium leading-snug text-slate-100 sm:text-base">
                                {item.question_text}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                mainStage
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
