import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DebateSliderGrid } from '../components/DebateSliderGrid'
import { EventBranding } from '../components/EventBranding'
import {
  clampPresentationSlideIndex,
  mergePresentationSlidesFromRemote,
} from '../constants/presentationSlides'
import { supabase } from '../supabaseClient'
import {
  fetchCurrentEventState,
  subscribeToEventState,
} from '../supabase/eventState'

const TYPE_MS = 32
const HANDOFF_MS = 1000

export default function BigScreen() {
  const [prompt, setPrompt] = useState('')
  const [panelists, setPanelists] = useState([1, 1, 1, 1])
  const [panelistIcons, setPanelistIcons] = useState([null, null, null, null])
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [presentationSlides, setPresentationSlides] = useState(() =>
    mergePresentationSlidesFromRemote(null),
  )
  // When turning slideshow OFF, keep the logo identical (no jump),
  // then fade in the rest of the debate UI.
  const [presentationOffTransition, setPresentationOffTransition] = useState(false)
  const [presentationOffFade, setPresentationOffFade] = useState(1)
  const presentationOffTimeoutRef = useRef(null)
  const wasSlideshowActiveRef = useRef(false)
  const [presentationOffLogoLayout, setPresentationOffLogoLayout] = useState('corner') // 'hero' | 'corner'
  const [eventHeaderLogoPos, setEventHeaderLogoPos] = useState(null) // { left, top } px — corner target during center→corner
  const eventHeaderLogoMeasureRef = useRef(null)
  const [textSlideIndex, setTextSlideIndex] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)
  const textFadeTimeoutRef = useRef(null)
  const textSlideIndexRef = useRef(0)
  const [error, setError] = useState('')

  useEffect(() => {
    textSlideIndexRef.current = textSlideIndex
  }, [textSlideIndex])

  /** Intro: full-screen typewriter → shrink toward header; idle = normal layout */
  const [introPhase, setIntroPhase] = useState('idle') // 'idle' | 'typing' | 'shrinking'
  const [introText, setIntroText] = useState('')
  const [handoffActive, setHandoffActive] = useState(false)
  const prevPromptRef = useRef('')
  const hasSeededRef = useRef(false)

  function applyEventStateFromRemote(next) {
    setPrompt(next.prompt)
    setPanelists(next.panelists)
    setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
    setSlideshowActive(Boolean(next.slideshowActive))
    setSlideshowIndex(next.slideshowIndex ?? 0)
    setPresentationSlides(
      mergePresentationSlidesFromRemote(next.presentationSlides ?? null),
    )
  }

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

  /** Fade only the presentation subtext; keep logo moving immediately with `slideshowIndex`. */
  useEffect(() => {
    if (!slideshowActive) {
      if (textFadeTimeoutRef.current) {
        clearTimeout(textFadeTimeoutRef.current)
        textFadeTimeoutRef.current = null
      }
      queueMicrotask(() => {
        setTextSlideIndex(slideshowIndex)
        setTextOpacity(1)
      })
      return
    }

    if (slideshowIndex === textSlideIndexRef.current) return

    queueMicrotask(() => {
      setTextOpacity(0)
    })
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

  // When switching from slideshow -> debate UI:
  // 1) keep the logo frozen where it was
  // 2) fade in the rest of the debate assets
  // Use `useLayoutEffect` to avoid a flash (blank -> fade) when toggling quickly.
  useLayoutEffect(() => {
    const slide =
      presentationSlides[clampPresentationSlideIndex(slideshowIndex)] ??
      presentationSlides[0]
    const isCornerLayout =
      slide.kind === 'segment' || (slide.title != null && slide.subtitle != null)

    if (slideshowActive) {
      wasSlideshowActiveRef.current = true
      const nextLogoLayout = isCornerLayout ? 'corner' : 'hero'

      if (presentationOffTimeoutRef.current) {
        clearTimeout(presentationOffTimeoutRef.current)
        presentationOffTimeoutRef.current = null
      }
      queueMicrotask(() => {
        setEventHeaderLogoPos(null)
        setPresentationOffLogoLayout(nextLogoLayout)
        setPresentationOffTransition(false)
        setPresentationOffFade(1)
      })
      return
    }

    if (!wasSlideshowActiveRef.current) {
      queueMicrotask(() => {
        setPresentationOffTransition(false)
        setPresentationOffFade(1)
      })
      return
    }

    wasSlideshowActiveRef.current = false
    queueMicrotask(() => {
      setPresentationOffTransition(true)
      setPresentationOffFade(0)
    })

    if (presentationOffTimeoutRef.current) {
      clearTimeout(presentationOffTimeoutRef.current)
      presentationOffTimeoutRef.current = null
    }

    const moveDurationMs = 850
    if (isCornerLayout) {
      // Logo already top-left: fade debate in.
      presentationOffTimeoutRef.current = setTimeout(() => {
        setPresentationOffFade(1)
        setPresentationOffTransition(false)
        presentationOffTimeoutRef.current = null
      }, 420)
    } else {
      // Hero slide: animate logo from center to the measured header corner, then fade debate in.
      requestAnimationFrame(() => {
        const rect = eventHeaderLogoMeasureRef.current?.getBoundingClientRect()
        if (rect) setEventHeaderLogoPos({ left: rect.left, top: rect.top })
        setPresentationOffLogoLayout('corner')

        presentationOffTimeoutRef.current = setTimeout(() => {
          setPresentationOffFade(1)
          setPresentationOffTransition(false)
          presentationOffTimeoutRef.current = null
        }, moveDurationMs)
      })
    }

    return () => {
      if (presentationOffTimeoutRef.current) {
        clearTimeout(presentationOffTimeoutRef.current)
        presentationOffTimeoutRef.current = null
      }
    }
  // Logo layout follows slide index; omit presentationSlides text-only edits from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    queueMicrotask(() => {
      setIntroPhase('idle')
      setHandoffActive(false)
      setIntroText('')
    })
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
    presentationSlides[clampPresentationSlideIndex(slideshowIndex)] ??
    presentationSlides[0]
  const textSlide =
    presentationSlides[clampPresentationSlideIndex(textSlideIndex)] ??
    presentationSlides[0]
  const cornerLayout =
    logoSlide.kind === 'segment' ||
    (logoSlide.title != null && logoSlide.subtitle != null)

  // Debate / main screen: same top-left slot + size as slideshow corner slides.
  // Slideshow hero: centered large logo only while presentation is on.
  const logoUsesCornerSlot =
    !slideshowActive || presentationOffLogoLayout === 'corner'

  const fixedLogoPos = logoUsesCornerSlot
    ? {
        left: eventHeaderLogoPos?.left ?? 'max(1rem, env(safe-area-inset-left))',
        top: eventHeaderLogoPos?.top ?? 'max(1rem, env(safe-area-inset-top))',
        transform: 'translate(0, 0)',
      }
    : {
        left: '50%',
        top: '38vh',
        transform: 'translate(-50%, -50%)',
      }

  const fixedLogo = (
    <div
      className="presentation-logo-shell presentation-branding-transition fixed z-20 flex pointer-events-none"
      style={fixedLogoPos}
    >
      <EventBranding
        centered={!logoUsesCornerSlot}
        variant={
          slideshowActive && presentationOffLogoLayout === 'hero'
            ? 'presentationHero'
            : 'presentationCorner'
        }
        className="presentation-branding-transition shrink-0"
      />
    </div>
  )

  const dots = (
    <div className="flex justify-center gap-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
      {presentationSlides.map((_, i) => (
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

  const slideshowContent = (
    <div className="relative flex min-h-[100dvh] min-h-screen flex-col text-slate-100">
      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
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
            className="presentation-hero-text relative z-10 flex min-h-[min(50dvh,28rem)] flex-1 flex-col items-center justify-center px-2 pb-8 pt-[clamp(6rem,16vh,10rem)] text-center sm:pt-[clamp(6rem,14vh,9rem)]"
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
  );

  const debateContent = (
    <>
      <div className="relative min-h-screen text-slate-100">
      {/* Invisible twin for center→corner transition; matches on-screen corner logo slot */}
      <div
        ref={eventHeaderLogoMeasureRef}
        className="pointer-events-none fixed z-[15] left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] opacity-0"
        aria-hidden
      >
        <EventBranding variant="presentationCorner" className="shrink-0" />
      </div>
      <div
        className="mx-auto max-w-7xl px-3 pb-10 pt-[clamp(10rem,28vh,16rem)] transition-opacity duration-400 ease-in-out sm:px-6 lg:px-10"
        style={{
          opacity: showOverlay ? 0 : presentationOffFade,
          pointerEvents: showOverlay || presentationOffTransition ? 'none' : undefined,
        }}
      >
        <DebateSliderGrid
          prompt={prompt}
          panelists={panelists}
          panelistIcons={panelistIcons}
          error={error}
        />
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
    </>
  );

  return (
    <div className="relative min-h-screen text-slate-100">
      {fixedLogo}
      {slideshowActive ? slideshowContent : debateContent}
    </div>
  )
}
