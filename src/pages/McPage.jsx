import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import {
  DEFAULT_PROMPT_SEQUENCE,
  fetchCurrentEventState,
  subscribeToEventState,
  writeEventState,
} from '../supabase/eventState'
import { clampPresentationSlideIndex } from '../constants/presentationSlides'

function normalizePrompt(s) {
  return String(s ?? '').trim().toLowerCase()
}

function emptyMcQuestions(nextPrompt, options = {}) {
  const base = {
    prompt: String(nextPrompt ?? ''),
    panelists: {
      'Panelist 1': null,
      'Panelist 2': null,
      'Panelist 3': null,
      'Panelist 4': null,
    },
  }
  if (options.skipDebateIntro) {
    base.skipDebateIntro = true
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

function getPrevPrompt(current, sequence) {
  const seq = Array.isArray(sequence) && sequence.length > 0 ? sequence : DEFAULT_PROMPT_SEQUENCE
  if (seq.length === 0) return { prev: '', prevIndex: -1, total: 0, seq }
  const cur = normalizePrompt(current)
  const idx = seq.findIndex((p) => normalizePrompt(p) === cur)
  const prevIndex = idx >= 0 ? (idx - 1 + seq.length) % seq.length : seq.length - 1
  return { prev: String(seq[prevIndex] ?? ''), prevIndex, total: seq.length, seq }
}

const PANELISTS = [
  { key: 'Panelist 1', title: 'Panelist 1' },
  { key: 'Panelist 2', title: 'Panelist 2' },
  { key: 'Panelist 3', title: 'Panelist 3' },
  { key: 'Panelist 4', title: 'Panelist 4' },
]

export default function McPage() {
  const [prompt, setPrompt] = useState('')
  const [panelists, setPanelists] = useState([3, 3, 3, 3])
  const [panelistIcons, setPanelistIcons] = useState([null, null, null, null])
  const [promptSequence, setPromptSequence] = useState(DEFAULT_PROMPT_SEQUENCE)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [presentationSlides, setPresentationSlides] = useState([])
  const [status, setStatus] = useState('Connecting…')
  const [error, setError] = useState('')
  const [mcQuestions, setMcQuestions] = useState(null)
  const [mcQuestionsStatus, setMcQuestionsStatus] = useState('—')

  useEffect(() => {
    let unsubscribe = null
    let pollId = null

    const apply = (next) => {
      // If prompt changed, auto-clear pushed MC questions.
      const nextPrompt = next.prompt ?? ''
      const incomingMc = next.mcQuestions ?? null
      const incomingPrompt = String(incomingMc?.prompt ?? '')
      const promptMismatch =
        incomingMc && normalizePrompt(incomingPrompt) !== normalizePrompt(nextPrompt)

      setPrompt(next.prompt ?? '')
      setPanelists(next.panelists ?? [3, 3, 3, 3])
      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setPromptSequence(next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE)
      setSlideshowActive(Boolean(next.slideshowActive))
      setSlideshowIndex(next.slideshowIndex ?? 0)
      setPresentationSlides(next.presentationSlides ?? [])
      setMcQuestions(incomingMc)
      setMcQuestionsStatus(
        incomingMc
          ? promptMismatch
            ? 'Resetting…'
            : 'Pushed'
          : '—',
      )
      setStatus('Live')
      setError('')

      if (promptMismatch) {
        // Fire-and-forget reset; avoid blocking the MC view.
        writeEventState(supabase, {
          prompt: nextPrompt,
          panelists: next.panelists ?? [3, 3, 3, 3],
          panelistIcons: next.panelistIcons ?? [null, null, null, null],
          promptSequence: next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
          presentationSlides: next.presentationSlides ?? [],
          slideshowActive: Boolean(next.slideshowActive),
          slideshowIndex: next.slideshowIndex ?? 0,
          mcQuestions: emptyMcQuestions(nextPrompt),
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
      if (current) apply(current)
      else setStatus('Waiting for event state…')
    })()

    unsubscribe = subscribeToEventState(supabase, apply)

    pollId = setInterval(() => {
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) apply(next)
        })
        .catch(() => {})
    }, 2500)

    return () => {
      if (unsubscribe) unsubscribe()
      if (pollId) clearInterval(pollId)
    }
  }, [])

  const nextInfo = useMemo(() => getNextPrompt(prompt, promptSequence), [prompt, promptSequence])
  const prevInfo = useMemo(() => getPrevPrompt(prompt, promptSequence), [prompt, promptSequence])
  const currentSlide = useMemo(() => {
    if (!Array.isArray(presentationSlides) || presentationSlides.length === 0) return null
    const idx = clampPresentationSlideIndex(slideshowIndex)
    return presentationSlides[idx] ?? presentationSlides[0] ?? null
  }, [presentationSlides, slideshowIndex])

  const goNextPrompt = async () => {
    if (slideshowActive) return
    const nextPrompt = nextInfo.next
    if (!nextPrompt) return

    setStatus('Updating…')
    setError('')
    const resetPanelists = [3, 3, 3, 3]
    try {
      await writeEventState(supabase, {
        prompt: nextPrompt,
        panelists: resetPanelists,
        panelistIcons,
        promptSequence: nextInfo.seq,
        presentationSlides,
        slideshowActive: false,
        slideshowIndex,
        mcQuestions: emptyMcQuestions(nextPrompt),
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const goFirstPrompt = async () => {
    if (slideshowActive) return
    const firstPrompt = promptSequence?.[0]
    if (!firstPrompt) return

    setStatus('Updating…')
    setError('')
    const resetPanelists = [3, 3, 3, 3]
    try {
      await writeEventState(supabase, {
        prompt: firstPrompt,
        panelists: resetPanelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        slideshowActive: false,
        slideshowIndex,
        mcQuestions: emptyMcQuestions(firstPrompt, { skipDebateIntro: true }),
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const goPrevPrompt = async () => {
    if (slideshowActive) return
    const prevPromptText = prevInfo.prev
    if (!prevPromptText) return

    setStatus('Updating…')
    setError('')
    const resetPanelists = [3, 3, 3, 3]
    try {
      await writeEventState(supabase, {
        prompt: prevPromptText,
        panelists: resetPanelists,
        panelistIcons,
        promptSequence: prevInfo.seq,
        presentationSlides,
        slideshowActive: false,
        slideshowIndex,
        mcQuestions: emptyMcQuestions(prevPromptText, { skipDebateIntro: true }),
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const nextPromptDisabled = status === 'Updating…' || !nextInfo.next
  const prevPromptDisabled = status === 'Updating…' || !prevInfo.prev
  const firstPromptDisabled = status === 'Updating…' || !promptSequence?.[0]

  return (
    <div className="relative flex min-h-[100dvh] min-h-screen flex-col bg-[#010101] text-slate-100">
      <div className="flex min-h-0 w-full flex-1 flex-col px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-8 lg:px-8 lg:pb-10">
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
                {slideshowActive ? (
                  <span className="ml-2 text-amber-200/90">• Slideshow ON</span>
                ) : (
                  <span className="ml-2 text-slate-400">• Slideshow OFF</span>
                )}
              </div>
            </div>

            {!slideshowActive ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={goPrevPrompt}
                  disabled={prevPromptDisabled}
                  className="min-h-[3.25rem] min-w-[10.5rem] touch-manipulation rounded-2xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[3.5rem] sm:px-10 sm:text-lg"
                >
                  Previous prompt
                </button>
                <button
                  type="button"
                  onClick={goFirstPrompt}
                  disabled={firstPromptDisabled}
                  className="min-h-[3.25rem] min-w-[8.5rem] touch-manipulation rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[3.5rem] sm:px-8 sm:text-lg"
                >
                  Reset to first
                </button>
                <button
                  type="button"
                  onClick={goNextPrompt}
                  disabled={nextPromptDisabled}
                  className="min-h-[3.25rem] min-w-[10.5rem] touch-manipulation rounded-2xl bg-indigo-500 px-8 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[3.5rem] sm:px-10 sm:text-lg"
                >
                  Next prompt
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-4 shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95 sm:mt-5">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:mt-8 lg:grid lg:min-h-0 lg:grid-cols-[minmax(18rem,28vw)_1fr] lg:items-stretch lg:gap-8">
          <aside className="flex min-h-[18rem] shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur sm:min-h-[20rem] sm:p-7 lg:min-h-0 lg:h-full lg:max-h-none">
            <div className="flex shrink-0 items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300/90">
                Panelist questions
              </h2>
              <span className="text-xs text-slate-500">{mcQuestionsStatus}</span>
            </div>

            <div className="mt-5 grid min-h-0 flex-1 grid-rows-4 gap-3 overflow-y-auto pr-1 sm:gap-4 lg:min-h-[12rem]">
              {PANELISTS.map((p) => {
                const q = mcQuestions?.panelists?.[p.key] ?? null
                return (
                  <div
                    key={p.key}
                    className="flex min-h-0 flex-col justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:py-4"
                  >
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                      {p.title}
                    </div>
                    <div
                      className={`mt-2 min-h-0 leading-snug sm:leading-normal ${
                        q?.question_text
                          ? 'text-[clamp(1rem,2.4vw,1.75rem)] font-semibold text-slate-50'
                          : 'text-[clamp(0.95rem,2vw,1.125rem)] font-normal text-slate-500'
                      }`}
                    >
                      {q?.question_text ? q.question_text : 'No question yet.'}
                    </div>
                    {q?.created_at ? (
                      <div className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-600">
                        {new Date(q.created_at).toLocaleTimeString()}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col lg:min-h-0">
            {slideshowActive ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur sm:p-10 lg:p-12">
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                  <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Current slide
                  </div>

                  {currentSlide?.kind === 'hero' ? (
                    <p className="mt-6 text-balance text-[clamp(2.25rem,7vw,5.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
                      {currentSlide.tagline || ' '}
                    </p>
                  ) : (
                    <div className="mt-6 min-h-0 w-full max-w-[min(100%,72rem)]">
                      <h1 className="text-balance text-[clamp(2.25rem,7vw,5.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
                        {currentSlide?.title || ' '}
                      </h1>
                      <p className="mt-5 text-balance text-[clamp(1.15rem,2.8vw,2.25rem)] text-slate-300/95">
                        {currentSlide?.subtitle || ' '}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur sm:p-10 lg:p-12">
                <div className="flex shrink-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 sm:pt-1">
                    Current prompt
                  </div>
                  <button
                    type="button"
                    onClick={goNextPrompt}
                    disabled={nextPromptDisabled}
                    title={nextPromptDisabled ? 'Cannot advance right now' : 'Go to next prompt'}
                    className="w-full max-w-none touch-manipulation rounded-2xl border border-white/15 bg-black/30 px-5 py-4 text-left transition hover:border-white/25 hover:bg-black/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[min(100%,44rem)] sm:px-6 sm:py-5 lg:ml-auto"
                  >
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-slate-400 sm:text-[0.75rem]">
                      Next prompt
                    </div>
                    <div className="mt-2 text-pretty break-words text-base font-medium leading-snug text-slate-100 sm:mt-2.5 sm:text-lg md:text-xl">
                      {nextInfo.next || 'None'}
                    </div>
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 py-6 text-center sm:px-3 sm:py-8 lg:py-10">
                  <p className="w-full max-w-[min(100%,80vw)] text-balance break-words text-pretty text-[clamp(1.75rem,4.5vw,3.4rem)] font-semibold leading-[1.12] tracking-tight text-slate-50 [overflow-wrap:anywhere]">
                    {prompt?.trim() ? prompt.trim() : 'Waiting for the current prompt…'}
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

