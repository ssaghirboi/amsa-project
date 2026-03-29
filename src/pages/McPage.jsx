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

function normalizeTarget(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const m = s.match(/panelist\s*(\d)/i) ?? s.match(/^(\d)$/)
  if (!m) return s
  return `Panelist ${m[1]}`
}

function getNextPrompt(current, sequence) {
  const seq = Array.isArray(sequence) && sequence.length > 0 ? sequence : DEFAULT_PROMPT_SEQUENCE
  const cur = normalizePrompt(current)
  const idx = seq.findIndex((p) => normalizePrompt(p) === cur)
  const nextIndex = idx >= 0 ? (idx + 1) % seq.length : 0
  return { next: String(seq[nextIndex] ?? ''), nextIndex, total: seq.length, seq }
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
  const [panelistQuestions, setPanelistQuestions] = useState(() => {
    const base = {}
    for (const p of PANELISTS) base[p.key] = null
    return base
  })

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

  // Panelist questions feed (latest per panelist)
  useEffect(() => {
    let isActive = true
    let unsub = null
    let pollId = null

    const hydrate = async () => {
      try {
        const { data, error: e } = await supabase
          .from('questions')
          .select('id,target_panelist,question_text,created_at')
          .order('created_at', { ascending: false })
          .limit(200)
        if (e) throw e
        if (!isActive) return

        const next = {}
        for (const p of PANELISTS) next[p.key] = null
        for (const q of Array.isArray(data) ? data : []) {
          const key = normalizeTarget(q.target_panelist)
          if (!key || !(key in next)) continue
          if (next[key]) continue
          next[key] = q
        }
        setPanelistQuestions(next)
      } catch {
        // ignore (MC screen should stay usable even if questions table is unavailable)
      }
    }

    hydrate()

    const channel = supabase
      .channel('mc_questions_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        () => {
          hydrate()
        },
      )
      .subscribe()

    unsub = () => supabase.removeChannel(channel)
    pollId = setInterval(hydrate, 2500)

    return () => {
      isActive = false
      if (unsub) unsub()
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

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-[max(10rem,18vh)] sm:px-6 sm:pb-24 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/10 bg-slate-900/35 px-7 py-6 backdrop-blur">
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

        <div className="mt-12 grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
          <aside className="rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur sm:p-7">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300/90">
                Panelist questions
              </h2>
              <span className="text-xs text-slate-500">latest</span>
            </div>

            <div className="mt-5 space-y-4">
              {PANELISTS.map((p) => {
                const q = panelistQuestions[p.key]
                return (
                  <div
                    key={p.key}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                      {p.title}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-100">
                      {q?.question_text ? q.question_text : (
                        <span className="text-slate-500">No question yet.</span>
                      )}
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

          <section>
            {slideshowActive ? (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-10 backdrop-blur sm:p-12">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Current slide
                  </div>

                  {currentSlide?.kind === 'hero' ? (
                    <p className="mt-6 text-balance text-[clamp(2rem,5.5vw,4rem)] font-semibold leading-tight tracking-tight text-slate-50">
                      {currentSlide.tagline || ' '}
                    </p>
                  ) : (
                    <>
                      <h1 className="mt-6 text-balance text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-tight tracking-tight text-slate-50">
                        {currentSlide?.title || ' '}
                      </h1>
                      <p className="mt-5 text-balance text-[clamp(1.1rem,2.6vw,2rem)] text-slate-300/95">
                        {currentSlide?.subtitle || ' '}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-10 backdrop-blur sm:p-12">
                <div className="absolute right-7 top-7 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
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
                  <p className="mt-8 text-balance text-[clamp(2.4rem,6.5vw,5rem)] font-semibold leading-[1.06] tracking-tight text-slate-50">
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

