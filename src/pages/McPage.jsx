import { useEffect, useMemo, useRef, useState } from 'react'
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
  GENERAL_TARGET_KEY,
  audienceQueueItemsMatch,
  displayNameForMcTarget,
  getEmptyMcQuestionSlots,
  normalizeQaAudienceQueue,
} from '../constants/panelists'
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

const MC_NOTES_BY_SLIDE_KEY = 'amsa-mc-notes-by-slide'
const MC_NOTES_LEGACY_KEY = 'amsa-mc-page-notes'

function loadNotesBySlideFromStorage() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(MC_NOTES_BY_SLIDE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
    }
    const legacy = localStorage.getItem(MC_NOTES_LEGACY_KEY)
    if (legacy) {
      const map = { 'presentation:0': legacy }
      localStorage.setItem(MC_NOTES_BY_SLIDE_KEY, JSON.stringify(map))
      return map
    }
  } catch {
    /* ignore */
  }
  return {}
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
  const [notesRemoteEnabled, setNotesRemoteEnabled] = useState(false)
  const [notesBySlide, setNotesBySlide] = useState(loadNotesBySlideFromStorage)
  const mcNotesAreaFocusedRef = useRef(false)
  const writeCtxRef = useRef({})
  /** Latest indices for step handlers (avoids stale state if realtime lags). */
  const slideshowIndexRef = useRef(0)
  const qaSlideshowIndexRef = useRef(0)
  /** Expected `current_prompt` after a prompt write; ignore stale realtime rows until this matches. */
  const mcPromptPendingRef = useRef(null)
  const applyLatestRef = useRef(null)

  useEffect(() => {
    slideshowIndexRef.current = slideshowIndex
  }, [slideshowIndex])
  useEffect(() => {
    qaSlideshowIndexRef.current = qaSlideshowIndex
  }, [qaSlideshowIndex])

  writeCtxRef.current = {
    prompt,
    panelists,
    panelistIcons,
    promptSequence,
    presentationSlides,
    qaSlideshowSlides,
    slideshowActive,
    slideshowIndex,
    qaSlideshowActive,
    qaSlideshowIndex,
    mcQuestions,
    debateRevealAck,
  }

  useEffect(() => {
    if (notesRemoteEnabled || qaSlideshowActive) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(MC_NOTES_BY_SLIDE_KEY, JSON.stringify(notesBySlide))
      } catch {
        /* ignore */
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [notesBySlide, notesRemoteEnabled, qaSlideshowActive])

  useEffect(() => {
    if (!notesRemoteEnabled || qaSlideshowActive) return
    const id = window.setTimeout(() => {
      const localNotes = notesBySlide
      ;(async () => {
        const fresh = await fetchCurrentEventState(supabase).catch(() => null)
        const base = fresh ?? writeCtxRef.current
        await writeEventState(supabase, {
          prompt: base.prompt,
          panelists: base.panelists,
          panelistIcons: base.panelistIcons,
          promptSequence: base.promptSequence,
          presentationSlides: base.presentationSlides,
          qaSlideshowSlides: base.qaSlideshowSlides,
          slideshowActive: base.slideshowActive,
          slideshowIndex: base.slideshowIndex,
          qaSlideshowActive: base.qaSlideshowActive,
          qaSlideshowIndex: base.qaSlideshowIndex,
          mcQuestions: base.mcQuestions,
          debateRevealAck: base.debateRevealAck,
          mcSlideNotes: localNotes,
        })
      })().catch(() => {})
    }, 550)
    return () => window.clearTimeout(id)
  }, [notesBySlide, notesRemoteEnabled, qaSlideshowActive])

  useEffect(() => {
    let unsubscribe = null
    let pollId = null

    const apply = (next) => {
      const nextPromptStr = next.prompt ?? ''
      const pending = mcPromptPendingRef.current
      const staleCore =
        pending != null &&
        normalizePrompt(nextPromptStr) !== normalizePrompt(pending)

      const mergeNotesFromRemote = (skipNoteBootstrapWrite) => {
        if (mcNotesAreaFocusedRef.current) return
        if (!next.meta?.mcSlideNotesColumnAvailable) return
        const remoteMap = { ...(next.mcSlideNotes ?? {}) }
        if (Object.keys(remoteMap).length === 0) {
          const local = loadNotesBySlideFromStorage()
          if (Object.keys(local).length > 0) {
            if (!skipNoteBootstrapWrite) {
              setNotesBySlide(local)
              writeEventState(supabase, {
                prompt: next.prompt ?? '',
                panelists: next.panelists ?? [3, 3, 3, 3],
                panelistIcons: next.panelistIcons ?? [null, null, null, null],
                promptSequence: next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
                presentationSlides: mergePresentationSlidesFromRemote(
                  next.presentationSlides ?? null,
                ),
                qaSlideshowSlides: mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null),
                slideshowActive: Boolean(next.slideshowActive),
                slideshowIndex: next.slideshowIndex ?? 0,
                qaSlideshowActive: Boolean(next.qaSlideshowActive),
                qaSlideshowIndex: next.qaSlideshowIndex ?? 0,
                mcQuestions: next.mcQuestions ?? null,
                debateRevealAck: Boolean(next.debateRevealAck),
                mcSlideNotes: local,
              }).catch(() => {})
            }
          } else {
            setNotesBySlide(remoteMap)
          }
        } else {
          setNotesBySlide(remoteMap)
        }
      }

      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setPromptSequence(next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE)
      setSlideshowActive(Boolean(next.slideshowActive))
      setQaSlideshowActive(Boolean(next.qaSlideshowActive))
      const qi = clampQaSlideIndex(next.qaSlideshowIndex ?? 0)
      setQaSlideshowIndex(qi)
      qaSlideshowIndexRef.current = qi
      setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
      const mergedDeck = mergePresentationSlidesFromRemote(next.presentationSlides ?? null)
      setPresentationSlides(mergedDeck)
      const si = clampPresentationSlideIndex(
        next.slideshowIndex ?? 0,
        mergedDeck.length || PRESENTATION_SLIDE_COUNT,
      )
      setSlideshowIndex(si)
      slideshowIndexRef.current = si
      setDebateRevealAck(Boolean(next.debateRevealAck))
      setNotesRemoteEnabled(next.meta?.mcSlideNotesColumnAvailable === true)
      mergeNotesFromRemote(staleCore)

      if (!presentationSlideNavRef.current && !qaSlideNavRef.current) {
        setStatus('Live')
        setError('')
      }

      if (staleCore) {
        return
      }

      if (pending != null && normalizePrompt(nextPromptStr) === normalizePrompt(pending)) {
        mcPromptPendingRef.current = null
      }

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

    applyLatestRef.current = apply

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
        slideshowIndexRef.current = si
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

  const mcSlideNotesKey = useMemo(() => {
    if (qaSlideshowActive) return `qa:${qaSlideshowIndex}`
    return `presentation:${slideshowIndex}`
  }, [qaSlideshowActive, qaSlideshowIndex, slideshowIndex])

  const mcNotesForSlide = notesBySlide[mcSlideNotesKey] ?? ''

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
        mcSlideNotes: notesRemoteEnabled ? notesBySlide : undefined,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#010101] text-slate-100">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-5 lg:px-8 lg:pb-6">
        <div className="flex shrink-0 flex-col gap-4 sm:gap-5">
          <div className="pl-[max(0px,calc(env(safe-area-inset-left)-0.25rem))] pt-1">
            <EventBranding variant="mc" className="shrink-0" />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/35 px-4 py-4 backdrop-blur sm:gap-5 sm:px-7 sm:py-6">
            <div className="min-w-0 pl-0.5">
              <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
                MC Control
              </div>
              <div className="mt-1.5 text-sm text-slate-300 sm:text-[0.9375rem]">
                Status: <span className="text-indigo-300">{status}</span>
                {qaSlideshowActive ? (
                  <span className="ml-2 text-emerald-300/90">• Q&amp;A end ON</span>
                ) : slideshowActive ? (
                  <span className="ml-2 text-amber-200/90">• Slideshow ON</span>
                ) : (
                  <span className="ml-2 text-slate-400">• Presentation off</span>
                )}
              </div>
            </div>

            {qaSlideshowActive ? (
              <div className="w-full border-t border-white/10 pt-3 text-xs text-slate-400">
                Q&amp;A slide {qaSlideshowIndex + 1} of {QA_SLIDE_COUNT} · slides controlled from Admin
              </div>
            ) : slideshowActive ? (
              <div className="w-full border-t border-white/10 pt-3 text-xs text-slate-400">
                Presentation slide {slideshowIndex + 1} of {PRESENTATION_SLIDE_COUNT} · slides controlled from Admin
              </div>
            ) : (
              <p className="max-w-md text-right text-xs text-slate-500">
                Prompt changes: Admin only
              </p>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95 sm:mt-5">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:mt-5 lg:min-h-0">
          <section className="relative flex min-h-0 flex-1 flex-col lg:min-h-0">
            {qaSlideshowActive ? (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 backdrop-blur">
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
                  <div className="shrink-0 pb-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-emerald-300/90 sm:text-xs">
                      Audience Q&amp;A — pushed questions
                    </p>
                    <p className="mt-1 text-sm text-slate-500 sm:text-[0.9375rem]">
                      Queue order · {qaAudienceSorted.length} total
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {qaAudienceSorted.length === 0 ? (
                      <p className="py-3 text-base text-slate-500 sm:text-lg">None pushed yet.</p>
                    ) : (
                      <ul className="space-y-4 sm:space-y-5">
                        {qaAudienceSorted.map((item, idx) => (
                          <li
                            key={
                              item.id != null
                                ? `qa-${item.id}`
                                : `qa-${idx}-${item.created_at}-${item.question_text?.slice(0, 48)}`
                            }
                            className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 sm:px-5 sm:py-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200/95 sm:text-sm sm:px-3 sm:py-1.5">
                                {displayNameForMcTarget(item.target_key)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeQaAudienceItem(item)}
                                disabled={status === 'Updating…'}
                                className="shrink-0 touch-manipulation rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="mt-3 text-pretty text-lg font-medium leading-snug text-slate-100 sm:mt-4 sm:text-xl md:text-2xl md:leading-snug lg:text-[1.75rem]">
                              {item.question_text}
                            </p>
                            {item.created_at ? (
                              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : slideshowActive ? (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 backdrop-blur">
                <div className="shrink-0 border-b border-white/10 px-4 pb-2 pt-3 pr-[min(20rem,58vw)] sm:px-6 sm:pt-4 lg:pr-[min(22rem,50vw)]">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
                    Notes for presentation slide {slideshowIndex + 1}
                    {Array.isArray(presentationSlides) && presentationSlides.length > 0
                      ? ` of ${presentationSlides.length}`
                      : ''}
                  </p>
                  <p className="mt-0.5 text-[0.6rem] text-slate-600 sm:text-[0.65rem]">
                    {notesRemoteEnabled
                      ? 'Saved to this slide in the event state (all devices)'
                      : 'Cloud notes unavailable — saved on this browser only. Run the Admin migration SQL for mc_slide_notes.'}
                  </p>
                </div>
                <label htmlFor="mc-notes-slides" className="sr-only">
                  MC script or notes for this presentation slide
                </label>
                <textarea
                  id="mc-notes-slides"
                  value={mcNotesForSlide}
                  onChange={(e) =>
                    setNotesBySlide((prev) => ({
                      ...prev,
                      [mcSlideNotesKey]: e.target.value,
                    }))
                  }
                  onFocus={() => {
                    mcNotesAreaFocusedRef.current = true
                  }}
                  onBlur={() => {
                    mcNotesAreaFocusedRef.current = false
                  }}
                  spellCheck
                  placeholder="Script or notes for this slide…"
                  className="min-h-0 w-full flex-1 resize-none rounded-3xl border-0 bg-transparent px-4 py-3 text-base leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/25 sm:px-6 sm:py-4 sm:text-[1.05rem]"
                />
                <div
                  className="pointer-events-none absolute bottom-3 right-3 z-10 w-[min(19.5rem,88vw)] max-w-[94%] overflow-hidden rounded-xl border border-white/15 bg-black/70 p-3.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:bottom-4 sm:right-4 sm:w-[min(22rem,54vw)] sm:max-w-[92%] sm:p-4"
                  aria-hidden
                >
                  <div className="text-center text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[0.62rem]">
                    Slide {slideshowIndex + 1}
                    {Array.isArray(presentationSlides) && presentationSlides.length > 0
                      ? ` / ${presentationSlides.length}`
                      : ''}
                  </div>
                  <div className="mt-2 text-center">
                    {currentSlide?.kind === 'hero' ? (
                      <p className="line-clamp-6 text-pretty text-[0.72rem] font-semibold leading-snug text-slate-50 sm:text-[0.82rem]">
                        {currentSlide.tagline || ' '}
                      </p>
                    ) : (
                      <>
                        <h2 className="line-clamp-4 text-pretty text-[0.72rem] font-semibold leading-snug text-slate-50 sm:text-[0.82rem]">
                          {currentSlide?.title || ' '}
                        </h2>
                        <p className="mt-1.5 line-clamp-4 text-pretty text-[0.62rem] text-slate-400 sm:text-[0.7rem]">
                          {currentSlide?.subtitle || ' '}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur sm:p-10 lg:p-12">
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 sm:pt-1">
                    Current prompt
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left sm:max-w-[min(100%,44rem)] lg:ml-auto">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-500 sm:text-[0.75rem]">
                      Next in sequence
                    </div>
                    <div className="mt-1.5 text-pretty break-words text-sm font-medium leading-snug text-slate-300 sm:text-base">
                      {nextInfo.next || '—'}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 py-6 text-center sm:px-3 sm:py-8 lg:py-10">
                  <p className="w-full max-w-[min(100%,80vw)] text-balance break-words text-pretty text-[clamp(1.75rem,4.5vw,3.4rem)] font-semibold leading-[1.12] tracking-tight text-slate-50 [overflow-wrap:anywhere]">
                    {prompt?.trim() ? prompt.trim() : 'Waiting for the next prompt…'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

