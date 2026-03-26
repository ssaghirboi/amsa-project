import { useEffect, useMemo, useRef, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import {
  PRESENTATION_SLIDES,
  clampPresentationSlideIndex,
} from '../constants/presentationSlides'
import { supabase } from '../supabaseClient'
import {
  fetchCurrentEventState,
  subscribeToEventState,
} from '../supabase/eventState'

const panelVisuals = [
  {
    key: 'P1',
    dot: 'bg-fuchsia-500',
    glow: 'shadow-[0_0_24px_rgba(232,121,249,0.55)]',
  },
  {
    key: 'P2',
    dot: 'bg-cyan-400',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.45)]',
  },
  {
    key: 'P3',
    dot: 'bg-amber-400',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.45)]',
  },
  {
    key: 'P4',
    dot: 'bg-lime-400',
    glow: 'shadow-[0_0_24px_rgba(163,230,53,0.45)]',
  },
]

const TYPE_MS = 32
const HANDOFF_MS = 1000

function valueToPercent(value) {
  const v = typeof value === 'number' ? value : Number(value)
  const clamped = Number.isFinite(v) ? Math.max(1, Math.min(5, v)) : 1
  return ((clamped - 1) / 4) * 100
}

function PanelSliderIcon({ value, index }) {
  const visuals = panelVisuals[index]
  const left = valueToPercent(value)

  return (
    <div className="relative h-10 w-full">
      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-800" />
      <div
        className="absolute top-1/2 transition-all duration-500 ease-out"
        style={{
          left: `${left}%`,
          transform: 'translate(-50%, -50%)',
        }}
        aria-label={`${visuals.key} value ${value}`}
      >
        <div className={visuals.glow}>
          <div
            className={`relative grid h-10 w-10 place-items-center rounded-full ${visuals.dot}`}
          >
            <div className="text-[11px] font-bold text-slate-950">
              {visuals.key}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BigScreen() {
  const [prompt, setPrompt] = useState('')
  const [panelists, setPanelists] = useState([1, 1, 1, 1])
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [textSlideIndex, setTextSlideIndex] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)
  const textFadeTimeoutRef = useRef(null)
  const textSlideIndexRef = useRef(0)
  textSlideIndexRef.current = textSlideIndex
  const title = useMemo(() => 'Event Screen', [])
  const [error, setError] = useState('')

  /** Intro: full-screen typewriter → shrink toward header; idle = normal layout */
  const [introPhase, setIntroPhase] = useState('idle') // 'idle' | 'typing' | 'shrinking'
  const [introText, setIntroText] = useState('')
  const [handoffActive, setHandoffActive] = useState(false)
  const prevPromptRef = useRef('')
  const hasSeededRef = useRef(false)

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      setError('')
      const current = await fetchCurrentEventState(supabase).catch((e) => {
        setError(e?.message || String(e))
        return null
      })

      if (current) {
        applyEventStateFromRemote(current)
        setError('')
      } else {
        setError('Waiting for the event state...')
      }
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      applyEventStateFromRemote(next)
    })

    const pollMs = 2500
    const pollId = setInterval(() => {
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) applyEventStateFromRemote(next)
        })
        .catch(() => {})
    }, pollMs)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) applyEventStateFromRemote(next)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (unsubscribe) unsubscribe()
      clearInterval(pollId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function applyEventStateFromRemote(next) {
    setPrompt(next.prompt)
    setPanelists(next.panelists)
    setSlideshowActive(Boolean(next.slideshowActive))
    setSlideshowIndex(next.slideshowIndex ?? 0)
  }

  /** Fade only the presentation subtext; keep logo moving immediately with `slideshowIndex`. */
  useEffect(() => {
    if (!slideshowActive) {
      if (textFadeTimeoutRef.current) {
        clearTimeout(textFadeTimeoutRef.current)
        textFadeTimeoutRef.current = null
      }
      setTextSlideIndex(slideshowIndex)
      setTextOpacity(1)
      return
    }

    if (slideshowIndex === textSlideIndexRef.current) return

    setTextOpacity(0)
    if (textFadeTimeoutRef.current) {
      clearTimeout(textFadeTimeoutRef.current)
      textFadeTimeoutRef.current = null
    }

    textFadeTimeoutRef.current = setTimeout(() => {
      setTextSlideIndex(slideshowIndex)
      setTextOpacity(1)
      textFadeTimeoutRef.current = null
    }, 280)

    return () => {
      if (textFadeTimeoutRef.current) {
        clearTimeout(textFadeTimeoutRef.current)
        textFadeTimeoutRef.current = null
      }
    }
  }, [slideshowActive, slideshowIndex])

  /** When prompt changes (after first non-empty sync), run intro sequence */
  useEffect(() => {
    if (slideshowActive) return

    const next = (prompt ?? '').trim()
    const prev = (prevPromptRef.current ?? '').trim()

    if (!hasSeededRef.current) {
      prevPromptRef.current = prompt
      if (next.length > 0) hasSeededRef.current = true
      return
    }

    if (next === prev) return
    if (!next) {
      prevPromptRef.current = prompt
      return
    }

    prevPromptRef.current = prompt
    queueMicrotask(() => {
      setHandoffActive(false)
      setIntroText('')
      setIntroPhase('typing')
    })
  }, [prompt, slideshowActive])

  /** Cancel debate intro when presentation mode is on */
  useEffect(() => {
    if (!slideshowActive) return
    setIntroPhase('idle')
    setHandoffActive(false)
    setIntroText('')
  }, [slideshowActive])

  /** Typewriter */
  useEffect(() => {
    if (slideshowActive) return
    if (introPhase !== 'typing') return

    const full = prompt ?? ''
    if (!full) {
      queueMicrotask(() => setIntroPhase('idle'))
      return
    }

    let i = 0
    const id = setInterval(() => {
      i += 1
      setIntroText(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(id)
        queueMicrotask(() => {
          setHandoffActive(true)
          setIntroPhase('shrinking')
        })
      }
    }, TYPE_MS)

    return () => clearInterval(id)
  }, [introPhase, prompt, slideshowActive])

  /** After shrink animation, return to normal layout */
  useEffect(() => {
    if (introPhase !== 'shrinking') return
    const t = setTimeout(() => {
      setIntroPhase('idle')
      setHandoffActive(false)
      setIntroText('')
    }, HANDOFF_MS)
    return () => clearTimeout(t)
  }, [introPhase])

  const showOverlay =
    !slideshowActive && (introPhase === 'typing' || introPhase === 'shrinking')

  const logoSlide =
    PRESENTATION_SLIDES[clampPresentationSlideIndex(slideshowIndex)] ??
    PRESENTATION_SLIDES[0]
  const textSlide =
    PRESENTATION_SLIDES[clampPresentationSlideIndex(textSlideIndex)] ??
    PRESENTATION_SLIDES[0]
  const cornerLayout =
    logoSlide.kind === 'segment' ||
    (logoSlide.title != null && logoSlide.subtitle != null)

  if (slideshowActive) {
    const dots = (
      <div className="flex justify-center gap-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {PRESENTATION_SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ease-out ${
              i === slideshowIndex
                ? 'scale-110 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                : 'scale-100 bg-white/20'
            }`}
            aria-hidden
          />
        ))}
      </div>
    )

    return (
      <div className="relative flex min-h-[100dvh] min-h-screen flex-col text-slate-100">
        <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
          <div
            className={`presentation-logo-shell presentation-branding-transition absolute z-20 flex ${
              cornerLayout
                ? 'translate-x-0 translate-y-0'
                : 'left-1/2 top-[38vh] w-full max-w-[min(96vw,40rem)] -translate-x-1/2 -translate-y-1/2 justify-center'
            }`}
            style={
              cornerLayout
                ? {
                    left: 'max(1rem, env(safe-area-inset-left))',
                    top: 'max(1rem, env(safe-area-inset-top))',
                  }
                : undefined
            }
          >
            <EventBranding
              centered={!cornerLayout}
              variant={cornerLayout ? 'presentationCorner' : 'presentationHero'}
              className="presentation-branding-transition shrink-0"
            />
          </div>

          {!cornerLayout ? (
            <div
              className="presentation-hero-text absolute left-1/2 top-[calc(38vh+min(10rem,18vh))] z-10 w-full max-w-2xl -translate-x-1/2 px-4 text-center sm:top-[calc(38vh+min(11rem,20vh))]"
              aria-hidden={!textSlide.tagline}
              style={{ opacity: textOpacity }}
            >
              {textSlide.tagline ? (
                <p className="text-xl font-medium tracking-wide text-slate-200/95 sm:text-2xl md:text-3xl">
                  {textSlide.tagline}
                </p>
              ) : null}
            </div>
          ) : (
            <div
              key={`segment-${textSlide.id ?? textSlideIndex}`}
              className="presentation-hero-text relative z-10 flex min-h-[min(50dvh,28rem)] flex-1 flex-col items-center justify-center px-2 pb-8 pt-[clamp(7rem,22vh,12rem)] text-center"
              style={{ opacity: textOpacity }}
            >
              <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
                {textSlide.title}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-300/95 sm:mt-6 sm:text-xl md:text-2xl">
                {textSlide.subtitle}
              </p>
            </div>
          )}
        </div>
        {dots}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <EventBranding className="mb-4 shrink-0 sm:mb-6" />
      </div>
      <div
        className={`mx-auto max-w-6xl px-4 pb-8 transition-opacity duration-200 ${
          showOverlay ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900/35 p-5 backdrop-blur">
          <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
            {title}
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-snug sm:text-4xl">
            {prompt || 'Waiting for the prompt...'}
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-6 backdrop-blur">
          <div className="mt-1 text-xs text-slate-400">Live panel scores:</div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            {panelists.map((value, i) => (
              <div
                key={panelVisuals[i].key}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium text-slate-200">
                    {panelVisuals[i].key}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${panelVisuals[i].dot}`} />
                    <div className="text-sm font-semibold text-indigo-200">{value}</div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Strongly Disagree</span>
                  <span>Strongly Agree</span>
                </div>
                <div className="mt-3">
                  <PanelSliderIcon value={value} index={i} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showOverlay ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030202]/97 px-6 backdrop-blur-md"
          aria-live="polite"
          aria-busy={introPhase === 'typing'}
        >
          <div className="pointer-events-none flex w-full max-w-6xl flex-col items-center justify-center">
            <p
              key={prompt}
              className={`text-center font-semibold leading-tight tracking-tight text-slate-100 drop-shadow-[0_18px_45px_rgba(0,0,0,0.55)] ${
                introPhase === 'typing'
                  ? 'text-[clamp(1.5rem,6vw,4.5rem)]'
                  : introPhase === 'shrinking' && handoffActive
                    ? 'text-[clamp(1.5rem,6vw,4.5rem)] bigscreen-prompt-handoff'
                    : 'text-[clamp(1.5rem,6vw,4.5rem)]'
              }`}
            >
              {introPhase === 'typing' ? introText : prompt}
              {introPhase === 'typing' ? (
                <span className="ml-1 inline-block h-[1em] w-[0.08em] animate-pulse rounded-sm bg-indigo-300/70 align-middle" />
              ) : null}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
