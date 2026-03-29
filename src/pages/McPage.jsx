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

function getNextPrompt(current, sequence) {
  const seq = Array.isArray(sequence) && sequence.length > 0 ? sequence : DEFAULT_PROMPT_SEQUENCE
  const cur = normalizePrompt(current)
  const idx = seq.findIndex((p) => normalizePrompt(p) === cur)
  const nextIndex = idx >= 0 ? (idx + 1) % seq.length : 0
  return { next: String(seq[nextIndex] ?? ''), nextIndex, total: seq.length, seq }
}

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

  useEffect(() => {
    let unsubscribe = null
    let pollId = null

    const apply = (next) => {
      setPrompt(next.prompt ?? '')
      setPanelists(next.panelists ?? [3, 3, 3, 3])
      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setPromptSequence(next.promptSequence ?? DEFAULT_PROMPT_SEQUENCE)
      setSlideshowActive(Boolean(next.slideshowActive))
      setSlideshowIndex(next.slideshowIndex ?? 0)
      setPresentationSlides(next.presentationSlides ?? [])
      setStatus('Live')
      setError('')
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
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  return (
    <div className="relative min-h-[100dvh] min-h-screen bg-[#010101] text-slate-100">
      <div
        className="pointer-events-none fixed z-20 left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))]"
        aria-hidden
      >
        <EventBranding variant="presentationCorner" className="shrink-0" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-[max(6.5rem,12vh)] sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/35 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
              MC Control
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Status: <span className="text-indigo-300">{status}</span>
              {slideshowActive ? (
                <span className="ml-2 text-amber-200/90">• Slideshow ON</span>
              ) : (
                <span className="ml-2 text-slate-400">• Slideshow OFF</span>
              )}
            </div>
          </div>

          {!slideshowActive ? (
            <button
              type="button"
              onClick={goNextPrompt}
              disabled={status === 'Updating…' || !nextInfo.next}
              className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next prompt
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
            {error}
          </div>
        ) : null}

        {slideshowActive ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-8 backdrop-blur sm:p-10">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Current slide
              </div>

              {currentSlide?.kind === 'hero' ? (
                <p className="mt-4 text-balance text-[clamp(2rem,5.5vw,4rem)] font-semibold leading-tight tracking-tight text-slate-50">
                  {currentSlide.tagline || ' '}
                </p>
              ) : (
                <>
                  <h1 className="mt-4 text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
                    {currentSlide?.title || ' '}
                  </h1>
                  <p className="mt-4 text-balance text-[clamp(1.1rem,2.6vw,2rem)] text-slate-300/95">
                    {currentSlide?.subtitle || ' '}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-8 backdrop-blur sm:p-10">
            <div className="absolute right-5 top-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Next prompt
              </div>
              <div className="mt-2 max-w-[26rem] text-sm text-slate-200/95">
                {nextInfo.next || 'None'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Current prompt
              </div>
              <p className="mt-6 text-balance text-[clamp(2.4rem,6.5vw,5rem)] font-semibold leading-[1.06] tracking-tight text-slate-50">
                {prompt?.trim() ? prompt.trim() : 'Waiting for the current prompt…'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

