import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DebateSliderGrid } from '../components/DebateSliderGrid'
import { PromptBox } from '../components/PromptBox'
import { EventBranding } from '../components/EventBranding'
import qrDoesGodExist from '../assets/qr-doesgodexist.png'
import qrHumanityFirstUcalgary from '../assets/qr-humanity-first-ucalgary.png'
import {
  clampPresentationSlideIndex,
  mergePresentationSlidesFromRemote,
} from '../constants/presentationSlides'
import {
  QA_SLIDE_COUNT,
  mergeQaSlidesFromRemote,
} from '../constants/qaSlideshow'
import { supabase } from '../supabaseClient'
import { fetchCurrentEventState, subscribeToEventState } from '../supabase/eventState'

/** FLIP handoff: fullscreen intro card → in-flow prompt anchor (shared with admin Reveal step). */
function computeFlyTo(introEl, targetEl) {
  if (!introEl || !targetEl) {
    return { dx: 0, dy: -120, s: 0.45 }
  }
  const a = introEl.getBoundingClientRect()
  const b = targetEl.getBoundingClientRect()
  const sx = b.width / Math.max(a.width, 1)
  const sy = b.height / Math.max(a.height, 1)
  const s = Math.min(sx, sy)
  const scaledW = a.width * s
  const scaledH = a.height * s
  const destLeft = b.left + (b.width - scaledW) / 2
  const destTop = b.top + (b.height - scaledH) / 2
  return {
    dx: Math.round(destLeft - a.left),
    dy: Math.round(destTop - a.top),
    s: Math.round(s * 10000) / 10000,
  }
}

/** Per-character delay during overlay typewriter (higher = slower). */
const TYPE_MS = 58
/** Matches `bigscreen-prompt-handoff` duration in index.css */
const HANDOFF_MS = 1150

/** Full prompt layout with characters revealed in place (stable wrapping while typing). */
function RevealPromptChars({ text, visibleCount, className = '' }) {
  const chars = useMemo(() => Array.from(text), [text])
  return (
    <span className={`block ${className}`}>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className={i < visibleCount ? 'text-slate-900' : 'text-transparent'}
          aria-hidden={i >= visibleCount}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

const FULLSCREEN_PROMPT_BODY =
  '!text-[clamp(1.8rem,4.3vw,2.9rem)] sm:!text-[clamp(2rem,4.7vw,3.35rem)] md:!text-[clamp(2.1rem,5vw,3.75rem)] lg:!text-[clamp(2.25rem,5.4vw,4rem)] !leading-[1.12]'
// Final debate-screen prompt above sliders: static, smaller box (no scroll).
const DEBATE_PROMPT_BODY =
  '!text-[clamp(1.3rem,2.6vw,2rem)] sm:!text-[clamp(1.45rem,2.8vw,2.15rem)] md:!text-[clamp(1.6rem,3vw,2.3rem)] lg:!text-[clamp(1.7rem,3.2vw,2.45rem)] !leading-[1.16]'
const FULLSCREEN_PROMPT_INNER =
  '!flex !min-h-0 !flex-col !justify-center !px-6 !py-10 sm:!px-10 sm:!py-14 md:!px-14 md:!py-16'

export default function BigScreen() {
  const [prompt, setPrompt] = useState('')
  const [debateRevealAck, setDebateRevealAck] = useState(false)
  const [panelists, setPanelists] = useState([1, 1, 1, 1])
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [qaSlideshowActive, setQaSlideshowActive] = useState(false)
  const [qaSlideshowIndex, setQaSlideshowIndex] = useState(0)
  const [presentationSlides, setPresentationSlides] = useState(() =>
    mergePresentationSlidesFromRemote(null),
  )
  const [qaSlideshowSlides, setQaSlideshowSlides] = useState(() =>
    mergeQaSlidesFromRemote(null),
  )
  // When turning slideshow OFF, keep the logo identical (no jump),
  // then fade in the rest of the debate UI.
  const [presentationOffTransition, setPresentationOffTransition] = useState(false)
  const [presentationOffFade, setPresentationOffFade] = useState(1)
  const presentationOffTimeoutRef = useRef(null)
  const wasSlideshowActiveRef = useRef(false)
  const [presentationOffLogoLayout, setPresentationOffLogoLayout] = useState('corner') // 'hero' | 'corner'
  /** Measured target `top` (px) when animating hero logo → top-centre header strip */
  const [eventHeaderLogoPos, setEventHeaderLogoPos] = useState(null)
  const eventHeaderLogoMeasureRef = useRef(null)
  const [textSlideIndex, setTextSlideIndex] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)
  const textFadeTimeoutRef = useRef(null)
  const textSlideIndexRef = useRef(0)
  const [error, setError] = useState('')

  useEffect(() => {
    textSlideIndexRef.current = textSlideIndex
  }, [textSlideIndex])

  /** Intro: typewriter → await admin Reveal → shrink to anchor; idle = normal layout */
  const [introPhase, setIntroPhase] = useState('idle') // 'idle' | 'typing' | 'awaitingReveal' | 'shrinking'
  const [revealedCount, setRevealedCount] = useState(0)
  /** Sliders + labels fade in after intro prompt lands (prompt stays visible). */
  const [debateTableOpacity, setDebateTableOpacity] = useState(1)
  /** FLIP target: fly fullscreen intro PromptBox down to DebateSliderGrid prompt anchor */
  const [flyTo, setFlyTo] = useState(null)
  /** FLIP: measure the prompt shell (blur + card), not a tall min-height wrapper */
  const introCardRef = useRef(null)
  const promptAnchorCardRef = useRef(null)
  const prevPromptRef = useRef('')
  const hasSeededRef = useRef(false)
  /** Set when MC navigates to previous prompt — skip typewriter + FLIP on BigScreen */
  const skipDebateIntroRef = useRef(false)

  function applyEventStateFromRemote(next) {
    if (next.mcQuestions?.skipDebateIntro === true) {
      skipDebateIntroRef.current = true
    }
    setPrompt(next.prompt)
    setDebateRevealAck(Boolean(next.debateRevealAck))
    setPanelists(next.panelists)
    setSlideshowActive(Boolean(next.slideshowActive))
    setSlideshowIndex(next.slideshowIndex ?? 0)
    setQaSlideshowActive(Boolean(next.qaSlideshowActive))
    setQaSlideshowIndex(next.qaSlideshowIndex ?? 0)
    setPresentationSlides(
      mergePresentationSlidesFromRemote(next.presentationSlides ?? null),
    )
    setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
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
    if (qaSlideshowActive) {
      if (presentationOffTimeoutRef.current) {
        clearTimeout(presentationOffTimeoutRef.current)
        presentationOffTimeoutRef.current = null
      }
      queueMicrotask(() => {
        setPresentationOffTransition(false)
        setPresentationOffFade(1)
      })
      return
    }

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
      // Logo already top-centre: fade debate in.
      presentationOffTimeoutRef.current = setTimeout(() => {
        setPresentationOffFade(1)
        setPresentationOffTransition(false)
        presentationOffTimeoutRef.current = null
      }, 420)
    } else {
      // Hero slide: animate logo from centre to measured top-centre strip, then fade debate in.
      requestAnimationFrame(() => {
        const rect = eventHeaderLogoMeasureRef.current?.getBoundingClientRect()
        if (rect) setEventHeaderLogoPos({ top: rect.top })
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
  }, [slideshowActive, slideshowIndex, qaSlideshowActive])

  /**
   * When the debate prompt changes: run large typewriter on the overlay. Shrink-to-table runs
   * only after Admin presses Reveal (`debate_reveal_ack` in DB).
   */
  useEffect(() => {
    if (slideshowActive || qaSlideshowActive) return

    const next = (prompt ?? '').trim()
    const prev = (prevPromptRef.current ?? '').trim()

    if (!hasSeededRef.current) {
      prevPromptRef.current = prompt
      if (next.length > 0) hasSeededRef.current = true
      return
    }

    if (skipDebateIntroRef.current) {
      skipDebateIntroRef.current = false
      prevPromptRef.current = prompt
      queueMicrotask(() => {
        setIntroPhase('idle')
        setFlyTo(null)
        setRevealedCount(0)
        setDebateTableOpacity(1)
      })
      return
    }

    if (next === prev) return
    if (!next) {
      prevPromptRef.current = prompt
      return
    }

    prevPromptRef.current = prompt

    queueMicrotask(() => {
      setFlyTo(null)
      setRevealedCount(0)
      setDebateTableOpacity(0)
      setIntroPhase('typing')
    })
  }, [prompt, slideshowActive, qaSlideshowActive])

  /** Cancel debate intro when presentation mode is on */
  useEffect(() => {
    if (!slideshowActive && !qaSlideshowActive) return
    queueMicrotask(() => {
      setIntroPhase('idle')
      setFlyTo(null)
      setRevealedCount(0)
      setDebateTableOpacity(1)
    })
  }, [slideshowActive, qaSlideshowActive])

  /** Typewriter: reveal characters in stable final layout; then optional FLIP handoff */
  useEffect(() => {
    if (slideshowActive || qaSlideshowActive) return
    if (introPhase !== 'typing') return

    const full = prompt ?? ''
    if (!full) {
      queueMicrotask(() => {
        setIntroPhase('idle')
        setDebateTableOpacity(1)
      })
      return
    }

    let i = 0
    const id = setInterval(() => {
      i += 1
      setRevealedCount(i)
      if (i >= full.length) {
        clearInterval(id)
        queueMicrotask(() => {
          setIntroPhase('awaitingReveal')
        })
      }
    }, TYPE_MS)

    return () => clearInterval(id)
  }, [introPhase, prompt, slideshowActive, qaSlideshowActive])

  /** After admin Reveal: FLIP shrink from fullscreen prompt to the in-flow prompt anchor. */
  useEffect(() => {
    if (slideshowActive || qaSlideshowActive) return
    if (!debateRevealAck) return
    if (introPhase !== 'awaitingReveal') return

    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const intro = introCardRef.current
          const target = promptAnchorCardRef.current
          const nextFly = computeFlyTo(intro, target)
          const noMotion =
            nextFly &&
            Math.abs(nextFly.dx) < 2 &&
            Math.abs(nextFly.dy) < 2 &&
            Math.abs(nextFly.s - 1) < 0.03
          if (noMotion) {
            setFlyTo(null)
            setIntroPhase('idle')
            setRevealedCount(0)
            setDebateTableOpacity(1)
          } else {
            setFlyTo(nextFly)
            setIntroPhase('shrinking')
          }
        })
      })
    })
  }, [debateRevealAck, introPhase, slideshowActive, qaSlideshowActive])

  /** After shrink animation: drop overlay, keep prompt visible, fade in sliders */
  useEffect(() => {
    if (introPhase !== 'shrinking') return
    const t = setTimeout(() => {
      setIntroPhase('idle')
      setFlyTo(null)
      setRevealedCount(0)
      queueMicrotask(() => {
        requestAnimationFrame(() => setDebateTableOpacity(1))
      })
    }, HANDOFF_MS)
    return () => clearTimeout(t)
  }, [introPhase])

  const showOverlay =
    !slideshowActive &&
    !qaSlideshowActive &&
    (introPhase === 'typing' ||
      introPhase === 'awaitingReveal' ||
      introPhase === 'shrinking')

  const logoSlide =
    presentationSlides[clampPresentationSlideIndex(slideshowIndex)] ??
    presentationSlides[0]
  const textSlide =
    presentationSlides[clampPresentationSlideIndex(textSlideIndex)] ??
    presentationSlides[0]
  const cornerLayout =
    logoSlide.kind === 'segment' ||
    (logoSlide.title != null && logoSlide.subtitle != null)

  // Debate / slideshow “strip” layout: same top-centre slot + size (not top-left).
  // Slideshow hero: large logo centred in viewport while presentation is on.
  const logoUsesCornerSlot =
    !slideshowActive || presentationOffLogoLayout === 'corner'

  const fixedLogoPos = logoUsesCornerSlot
    ? {
        left: '50%',
        top:
          eventHeaderLogoPos?.top != null
            ? `${eventHeaderLogoPos.top}px`
            : 'max(1rem, env(safe-area-inset-top))',
        transform: 'translate(-50%, 0)',
      }
    : {
        left: '50%',
        top: '38vh',
        transform: 'translate(-50%, -50%)',
      }

  const fixedLogo = (
    <div
      className="presentation-logo-shell presentation-branding-transition fixed z-20 flex pointer-events-none drop-shadow-[0_2px_14px_rgba(15,23,42,0.08)]"
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

  const qaSlideshowContent = (
    <div className="relative flex min-h-[100dvh] min-h-screen flex-col pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-800">
      {qaSlideshowIndex !== QA_SLIDE_COUNT - 1 ? (
        <div className="pointer-events-none fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-20 -translate-x-1/2 drop-shadow-[0_2px_14px_rgba(15,23,42,0.08)]">
          <EventBranding variant="presentationCorner" className="shrink-0" />
        </div>
      ) : null}
      {qaSlideshowIndex === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6 pt-[clamp(6.5rem,18vh,11rem)]">
          <div className="flex flex-col items-center gap-10 sm:gap-12">
            <h1 className="max-w-4xl text-balance text-center text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              {qaSlideshowSlides[0]?.title ?? ''}
            </h1>
            <img
              src={qrDoesGodExist}
              alt=""
              className="h-[min(58vmin,26rem)] w-[min(58vmin,26rem)] max-w-[92vw] rounded-2xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/10"
              draggable={false}
            />
          </div>
        </div>
      ) : qaSlideshowIndex === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-[clamp(6.5rem,18vh,11rem)] text-center">
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
            {qaSlideshowSlides[1]?.title ?? ''}
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-slate-600 sm:mt-7 sm:text-2xl md:text-3xl lg:text-4xl">
            {qaSlideshowSlides[1]?.subtitle ?? ''}
          </p>
        </div>
      ) : qaSlideshowIndex === 2 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-[clamp(6.5rem,18vh,11rem)]">
          <div className="flex flex-col items-center gap-8 sm:gap-10">
            <h1 className="max-w-4xl text-balance text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">
              {qaSlideshowSlides[2]?.title ?? ''}
            </h1>
            <img
              src={qrHumanityFirstUcalgary}
              alt=""
              className="h-[min(52vmin,24rem)] w-[min(52vmin,24rem)] max-w-[92vw] rounded-2xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/10"
              draggable={false}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-12">
          <div className="flex max-w-[min(96vw,48rem)] flex-col items-center">
            <EventBranding variant="presentationHero" centered className="w-full shrink-0" />
            <p className="mt-6 max-w-2xl text-balance text-center text-xl font-medium tracking-wide text-slate-600 sm:mt-8 sm:text-2xl md:text-3xl lg:text-4xl">
              {qaSlideshowSlides[3]?.title ?? ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const slideshowContent = (
    <div className="relative flex min-h-[100dvh] min-h-screen flex-col pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-800">
      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
        {!cornerLayout ? (
          <div
            className="presentation-hero-text absolute left-1/2 top-[calc(38vh+min(10rem,18vh))] z-10 w-full max-w-3xl -translate-x-1/2 px-4 text-center sm:top-[calc(38vh+min(11rem,20vh))]"
            aria-hidden={!textSlide.tagline}
            style={{ opacity: textOpacity }}
          >
            {textSlide.tagline ? (
              <p className="text-2xl font-medium tracking-wide text-slate-600 sm:text-3xl md:text-4xl lg:text-5xl">
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
            <h1 className="max-w-[min(100%,96vw)] whitespace-nowrap text-[clamp(1.15rem,min(5.5vw,6vh),3.75rem)] font-semibold leading-tight tracking-tight text-slate-900">
              {textSlide.title}
            </h1>
            <p className="mt-5 max-w-[min(100%,96vw)] whitespace-nowrap text-[clamp(0.95rem,min(3.2vw,4vh),2.25rem)] text-slate-600 sm:mt-6 md:mt-7">
              {textSlide.subtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const debateContent = (
    <>
      <div className="relative min-h-screen text-slate-800">
        {/* Invisible twin for hero→strip transition; matches on-screen top-centre logo slot */}
        <div
          ref={eventHeaderLogoMeasureRef}
          className="pointer-events-none fixed z-[15] left-1/2 top-[max(1rem,env(safe-area-inset-top))] -translate-x-1/2 opacity-0"
          aria-hidden
        >
          <EventBranding variant="presentationCorner" className="shrink-0" />
        </div>
        <div
          className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 pb-10 pt-[clamp(8rem,22vh,13rem)] transition-opacity duration-400 ease-in-out sm:px-6 lg:px-10"
          style={{
            opacity: presentationOffFade,
            pointerEvents: showOverlay || presentationOffTransition ? 'none' : undefined,
          }}
        >
          <DebateSliderGrid
            prompt={prompt}
            panelists={panelists}
            error={error}
            promptBoxCardRef={promptAnchorCardRef}
            promptBoxHidden={showOverlay}
            tableOpacity={debateTableOpacity}
            promptInnerClassName={FULLSCREEN_PROMPT_INNER}
            promptBodyClassName={DEBATE_PROMPT_BODY}
          />
        </div>

      {showOverlay ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-100/90 backdrop-blur-sm"
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-0 z-[51] flex min-h-0 flex-col items-stretch justify-stretch p-2 pt-[max(4.5rem,env(safe-area-inset-top))] pb-5 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-6 sm:pt-24 sm:pb-10"
            aria-live="polite"
            aria-busy={introPhase === 'typing' || introPhase === 'awaitingReveal'}
          >
            <div className="flex min-h-0 w-full flex-1 flex-col justify-center min-h-[min(88dvh,920px)]">
            <PromptBox
              key={prompt}
              cardRef={introCardRef}
              maxWidthClass="max-w-none"
              innerClassName={FULLSCREEN_PROMPT_INNER}
              bodyClassName={
                introPhase === 'typing' ||
                introPhase === 'awaitingReveal' ||
                introPhase === 'shrinking'
                  ? FULLSCREEN_PROMPT_BODY
                  : ''
              }
              cardClassName={
                introPhase === 'shrinking' && flyTo ? 'bigscreen-prompt-fly-to-target' : ''
              }
              cardStyle={
                introPhase === 'shrinking' && flyTo
                  ? {
                      '--fly-dx': `${flyTo.dx}px`,
                      '--fly-dy': `${flyTo.dy}px`,
                      '--fly-s': String(flyTo.s),
                    }
                  : undefined
              }
              className="relative flex w-full max-w-none flex-col justify-center"
            >
              {introPhase === 'typing' ? (
                <RevealPromptChars
                  text={prompt ?? ''}
                  visibleCount={revealedCount}
                />
              ) : (
                prompt
              )}
            </PromptBox>
            </div>
          </div>
        </>
      ) : null}
      </div>
    </>
  );

  return (
    <div
      className="relative min-h-screen text-slate-800"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: `
          radial-gradient(ellipse 110% 55% at 50% 105%, rgba(148, 163, 184, 0.22) 0%, transparent 52%),
          radial-gradient(ellipse 70% 40% at 50% -5%, rgba(203, 213, 225, 0.35) 0%, transparent 48%),
          linear-gradient(180deg, #f8fafc 0%, #f1f5f9 38%, #e8eef5 72%, #f8fafc 100%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >
      {!qaSlideshowActive ? fixedLogo : null}
      {qaSlideshowActive
        ? qaSlideshowContent
        : slideshowActive
          ? slideshowContent
          : debateContent}
      {!slideshowActive && !qaSlideshowActive ? (
        <div
          className="fixed z-[60] bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] pointer-events-none"
          aria-hidden
        >
          <div className="rounded-2xl bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10 p-4">
            <div className="text-center text-sm font-semibold tracking-tight text-slate-900">
              Share your thoughts
            </div>
            <img
              src={qrDoesGodExist}
              alt=""
              className="mt-2.5 h-48 w-48 rounded-xl bg-white sm:h-52 sm:w-52"
              draggable={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
