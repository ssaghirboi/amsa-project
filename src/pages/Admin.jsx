import { useEffect, useMemo, useRef, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import {
  PRESENTATION_SLIDE_COUNT,
  mergePresentationSlidesFromRemote,
} from '../constants/presentationSlides'
import {
  QA_SLIDE_COUNT,
  mergeQaSlidesFromRemote,
} from '../constants/qaSlideshow'
import { PANELIST_DISPLAY_NAMES } from '../constants/panelists'
import { supabase } from '../supabaseClient'
import {
  DEFAULT_PROMPT_SEQUENCE,
  fetchCurrentEventState,
  shouldPromptSequenceMigrate,
  shouldPanelistIconsMigrate,
  shouldPresentationSlidesMigrate,
  shouldSyncPresentationSlidesFromRemote,
  shouldQaSlideshowIndexMigrate,
  shouldQaSlideshowMigrate,
  shouldQaSlideshowSlidesMigrate,
  shouldSlideshowMigrate,
  shouldSyncQaSlidesFromRemote,
  subscribeToEventState,
  writeEventState,
} from '../supabase/eventState'

export default function Admin() {
  const [prompt, setPrompt] = useState('')
  const [panelists, setPanelists] = useState([1, 1, 1, 1])
  const [panelistIcons, setPanelistIcons] = useState([null, null, null, null])
  const [promptSequence, setPromptSequence] = useState(DEFAULT_PROMPT_SEQUENCE)
  const [promptSequenceDraft, setPromptSequenceDraft] = useState(
    () => [...DEFAULT_PROMPT_SEQUENCE],
  )
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
  const [status, setStatus] = useState('Connecting...')
  const [error, setError] = useState('')
  const [showMigrateBanner, setShowMigrateBanner] = useState(false)
  const [showSlideshowMigrateBanner, setShowSlideshowMigrateBanner] = useState(false)
  const [showPanelistIconsMigrateBanner, setShowPanelistIconsMigrateBanner] = useState(false)
  const [showPresentationSlidesMigrateBanner, setShowPresentationSlidesMigrateBanner] =
    useState(false)
  const [showQaSlideshowMigrateBanner, setShowQaSlideshowMigrateBanner] = useState(false)
  const [showQaSlidesCopyMigrateBanner, setShowQaSlidesCopyMigrateBanner] = useState(false)

  const presentationSlidesSaveTimerRef = useRef(null)
  const presentationSlidesLatestRef = useRef(null)
  const qaSlidesSaveTimerRef = useRef(null)
  const qaSlidesLatestRef = useRef(null)
  const writeContextRef = useRef({
    prompt: '',
    panelists: [1, 1, 1, 1],
    panelistIcons: [null, null, null, null],
    promptSequence: DEFAULT_PROMPT_SEQUENCE,
    presentationSlides: mergePresentationSlidesFromRemote(null),
    qaSlideshowSlides: mergeQaSlidesFromRemote(null),
    slideshowActive: false,
    slideshowIndex: 0,
    qaSlideshowActive: false,
    qaSlideshowIndex: 0,
  })

  const PANELIST_ICON_BUCKET = 'panelist-icons'

  useEffect(() => {
    writeContextRef.current = {
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
    }
  })

  const uploadPanelistIcon = async (panelIndex, file) => {
    if (!file) return
    const i = panelIndex
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'png'
    const path = `${i + 1}.${safeExt}`

    setStatus('Uploading icon...')
    setError('')
    cancelPendingPresentationSlideSave()
    try {
      const { error: uploadError } = await supabase.storage
        .from(PANELIST_ICON_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData, error: urlError } = supabase.storage
        .from(PANELIST_ICON_BUCKET)
        .getPublicUrl(path)

      if (urlError) throw urlError

      const nextUrl = publicUrlData?.publicUrl ?? null
      const next = [...panelistIcons]
      next[i] = nextUrl
      setPanelistIcons(next)
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons: next,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive,
        slideshowIndex,
        qaSlideshowActive,
        qaSlideshowIndex,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (upload failed)')
    }
  }

  const panelLabels = useMemo(() => ['P1', 'P2', 'P3', 'P4'], [])

  const sequenceDirty = useMemo(
    () => JSON.stringify(promptSequence) !== JSON.stringify(promptSequenceDraft),
    [promptSequence, promptSequenceDraft],
  )

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      try {
        const current = await fetchCurrentEventState(supabase)
        if (current) {
          setPrompt(current.prompt)
          setPanelists(current.panelists)
          setPanelistIcons(current.panelistIcons ?? [null, null, null, null])
          setSlideshowActive(Boolean(current.slideshowActive))
          setSlideshowIndex(current.slideshowIndex ?? 0)
          setQaSlideshowActive(Boolean(current.qaSlideshowActive))
          setQaSlideshowIndex(current.qaSlideshowIndex ?? 0)
          setPresentationSlides(
            mergePresentationSlidesFromRemote(current.presentationSlides ?? null),
          )
          setQaSlideshowSlides(mergeQaSlidesFromRemote(current.qaSlideshowSlides ?? null))
          if (current.promptSequence?.length) {
            setPromptSequence(current.promptSequence)
            setPromptSequenceDraft([...current.promptSequence])
          }
        }
        setError('')
        setStatus('Live')
        setShowMigrateBanner(shouldPromptSequenceMigrate())
        setShowSlideshowMigrateBanner(shouldSlideshowMigrate())
        setShowPanelistIconsMigrateBanner(shouldPanelistIconsMigrate())
        setShowPresentationSlidesMigrateBanner(shouldPresentationSlidesMigrate())
        setShowQaSlideshowMigrateBanner(
          shouldQaSlideshowMigrate() || shouldQaSlideshowIndexMigrate(),
        )
        setShowQaSlidesCopyMigrateBanner(shouldQaSlideshowSlidesMigrate())
      } catch (e) {
        setStatus('Live (with local defaults)')
        setError(e?.message || String(e))
        setShowMigrateBanner(false)
        setShowSlideshowMigrateBanner(false)
        setShowPanelistIconsMigrateBanner(false)
        setShowPresentationSlidesMigrateBanner(false)
        setShowQaSlideshowMigrateBanner(false)
        setShowQaSlidesCopyMigrateBanner(false)
      }
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt)
      setPanelists(next.panelists)
      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setSlideshowActive(Boolean(next.slideshowActive))
      setSlideshowIndex(next.slideshowIndex ?? 0)
      setQaSlideshowActive(Boolean(next.qaSlideshowActive))
      setQaSlideshowIndex(next.qaSlideshowIndex ?? 0)
      if (shouldSyncPresentationSlidesFromRemote()) {
        setPresentationSlides(
          mergePresentationSlidesFromRemote(next.presentationSlides ?? null),
        )
      }
      if (shouldSyncQaSlidesFromRemote()) {
        setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
      }
      if (!next.promptSequence?.length) return
      const remote = next.promptSequence.map((s) => String(s))
      setPromptSequence((prev) => {
        const same =
          prev.length === remote.length &&
          prev.every((p, i) => p === remote[i])
        if (same) return prev
        setPromptSequenceDraft([...remote])
        return remote
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
      if (presentationSlidesSaveTimerRef.current) {
        clearTimeout(presentationSlidesSaveTimerRef.current)
        presentationSlidesSaveTimerRef.current = null
      }
      if (qaSlidesSaveTimerRef.current) {
        clearTimeout(qaSlidesSaveTimerRef.current)
        qaSlidesSaveTimerRef.current = null
      }
    }
  }, [])

  const commit = async (
    nextPrompt,
    nextPanelists,
    sequenceToSave = promptSequence,
    nextPanelistIcons = panelistIcons,
    nextPresentationSlides = presentationSlides,
    nextQaSlideshowSlides = qaSlideshowSlides,
  ) => {
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt: nextPrompt,
        panelists: nextPanelists,
        panelistIcons: nextPanelistIcons,
        promptSequence: sequenceToSave,
        presentationSlides: nextPresentationSlides,
        qaSlideshowSlides: nextQaSlideshowSlides,
        slideshowActive,
        slideshowIndex,
        qaSlideshowActive,
        qaSlideshowIndex,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const cancelPendingPresentationSlideSave = () => {
    if (presentationSlidesSaveTimerRef.current) {
      clearTimeout(presentationSlidesSaveTimerRef.current)
      presentationSlidesSaveTimerRef.current = null
    }
    presentationSlidesLatestRef.current = null
    if (qaSlidesSaveTimerRef.current) {
      clearTimeout(qaSlidesSaveTimerRef.current)
      qaSlidesSaveTimerRef.current = null
    }
    qaSlidesLatestRef.current = null
  }

  const flushPresentationSlidesSave = () => {
    const slides = presentationSlidesLatestRef.current
    presentationSlidesLatestRef.current = null
    if (!slides) return
    const ctx = writeContextRef.current
    setError('')
    writeEventState(supabase, {
      prompt: ctx.prompt,
      panelists: ctx.panelists,
      panelistIcons: ctx.panelistIcons,
      promptSequence: ctx.promptSequence,
      presentationSlides: slides,
      qaSlideshowSlides: ctx.qaSlideshowSlides,
      slideshowActive: ctx.slideshowActive,
      slideshowIndex: ctx.slideshowIndex,
      qaSlideshowActive: ctx.qaSlideshowActive,
      qaSlideshowIndex: ctx.qaSlideshowIndex,
    }).catch((e) => {
      setError(e?.message || String(e))
    })
  }

  const flushQaSlidesSave = () => {
    const slides = qaSlidesLatestRef.current
    qaSlidesLatestRef.current = null
    if (!slides) return
    const ctx = writeContextRef.current
    setError('')
    writeEventState(supabase, {
      prompt: ctx.prompt,
      panelists: ctx.panelists,
      panelistIcons: ctx.panelistIcons,
      promptSequence: ctx.promptSequence,
      presentationSlides: ctx.presentationSlides,
      qaSlideshowSlides: slides,
      slideshowActive: ctx.slideshowActive,
      slideshowIndex: ctx.slideshowIndex,
      qaSlideshowActive: ctx.qaSlideshowActive,
      qaSlideshowIndex: ctx.qaSlideshowIndex,
    }).catch((e) => {
      setError(e?.message || String(e))
    })
  }

  const patchPresentationSlide = (index, partial) => {
    const next = presentationSlides.map((s, i) =>
      i === index ? { ...s, ...partial } : s,
    )
    const normalized = mergePresentationSlidesFromRemote(next)
    setPresentationSlides(normalized)
    presentationSlidesLatestRef.current = normalized
    if (presentationSlidesSaveTimerRef.current) {
      clearTimeout(presentationSlidesSaveTimerRef.current)
    }
    presentationSlidesSaveTimerRef.current = setTimeout(() => {
      presentationSlidesSaveTimerRef.current = null
      flushPresentationSlidesSave()
    }, 350)
  }

  const patchQaSlide = (index, partial) => {
    const next = qaSlideshowSlides.map((s, i) =>
      i === index ? { ...s, ...partial } : s,
    )
    const normalized = mergeQaSlidesFromRemote(next)
    setQaSlideshowSlides(normalized)
    qaSlidesLatestRef.current = normalized
    if (qaSlidesSaveTimerRef.current) {
      clearTimeout(qaSlidesSaveTimerRef.current)
    }
    qaSlidesSaveTimerRef.current = setTimeout(() => {
      qaSlidesSaveTimerRef.current = null
      flushQaSlidesSave()
    }, 350)
  }

  const handleNextPrompt = () => {
    const currentIndex = promptSequence.findIndex(
      (p) => p.trim().toLowerCase() === prompt.trim().toLowerCase(),
    )
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % promptSequence.length : 0
    const nextPrompt = promptSequence[nextIndex]
    const resetPanelists = [3, 3, 3, 3]

    setPrompt(nextPrompt)
    setPanelists(resetPanelists)
    commit(nextPrompt, resetPanelists)
  }

  const handlePreviousPrompt = () => {
    const len = promptSequence.length
    if (len === 0) return
    const currentIndex = promptSequence.findIndex(
      (p) => p.trim().toLowerCase() === prompt.trim().toLowerCase(),
    )
    const prevIndex =
      currentIndex >= 0
        ? (currentIndex - 1 + len) % len
        : len - 1
    const prevPromptText = promptSequence[prevIndex]
    const resetPanelists = [3, 3, 3, 3]

    setPrompt(prevPromptText)
    setPanelists(resetPanelists)
    commit(prevPromptText, resetPanelists)
  }

  /** Jump back to the first slideshow prompt and reset sliders to neutral (3). */
  const handleResetPrompts = () => {
    const firstPrompt = promptSequence[0]
    const resetPanelists = [3, 3, 3, 3]
    setPrompt(firstPrompt)
    setPanelists(resetPanelists)
    commit(firstPrompt, resetPanelists)
  }

  const updatePromptAt = (index, value) => {
    setPromptSequenceDraft((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addPromptRow = () => {
    setPromptSequenceDraft((prev) => [...prev, ''])
  }

  const removePromptAt = (index) => {
    setPromptSequenceDraft((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleUpdatePromptSequence = async () => {
    const next = promptSequenceDraft.map((s) => String(s))
    setPromptSequence(next)
    setPromptSequenceDraft([...next])
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence: next,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive,
        slideshowIndex,
        qaSlideshowActive,
        qaSlideshowIndex,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const handleToggleSlideshow = async () => {
    const next = !slideshowActive
    const idx = next ? 0 : slideshowIndex
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive: next,
        slideshowIndex: idx,
        qaSlideshowActive: next ? false : qaSlideshowActive,
        qaSlideshowIndex,
      })
      setSlideshowActive(next)
      setSlideshowIndex(idx)
      if (next) setQaSlideshowActive(false)
      setStatus('Live')
      setShowSlideshowMigrateBanner(shouldSlideshowMigrate())
      setShowPresentationSlidesMigrateBanner(shouldPresentationSlidesMigrate())
      setShowQaSlideshowMigrateBanner(
        shouldQaSlideshowMigrate() || shouldQaSlideshowIndexMigrate(),
      )
      setShowQaSlidesCopyMigrateBanner(shouldQaSlideshowSlidesMigrate())
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const handleToggleQaSlideshow = async () => {
    const next = !qaSlideshowActive
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive: next ? false : slideshowActive,
        slideshowIndex,
        qaSlideshowActive: next,
        qaSlideshowIndex: next ? 0 : qaSlideshowIndex,
      })
      if (next) setSlideshowActive(false)
      setQaSlideshowActive(next)
      if (next) setQaSlideshowIndex(0)
      setStatus('Live')
      setShowQaSlideshowMigrateBanner(
        shouldQaSlideshowMigrate() || shouldQaSlideshowIndexMigrate(),
      )
      setShowQaSlidesCopyMigrateBanner(shouldQaSlideshowSlidesMigrate())
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const handlePresentationSlide = async (delta) => {
    if (!slideshowActive) return
    const len = PRESENTATION_SLIDE_COUNT
    const next = (slideshowIndex + delta + len) % len
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive: true,
        slideshowIndex: next,
        qaSlideshowActive,
        qaSlideshowIndex,
      })
      setSlideshowIndex(next)
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const handleQaSlide = async (delta) => {
    if (!qaSlideshowActive) return
    const len = QA_SLIDE_COUNT
    const next = (qaSlideshowIndex + delta + len) % len
    cancelPendingPresentationSlideSave()
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        presentationSlides,
        qaSlideshowSlides,
        slideshowActive,
        slideshowIndex,
        qaSlideshowActive: true,
        qaSlideshowIndex: next,
      })
      setQaSlideshowIndex(next)
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const activePromptIndex = promptSequence.findIndex(
    (p) => p.trim().toLowerCase() === prompt.trim().toLowerCase(),
  )
  const previousPrompt =
    activePromptIndex > 0 ? promptSequence[activePromptIndex - 1] : 'None'
  const nextPrompt =
    activePromptIndex >= 0 && promptSequence.length > 0
      ? promptSequence[(activePromptIndex + 1) % promptSequence.length]
      : promptSequence[0] || 'None'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <EventBranding className="mb-4 sm:mb-6" />
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin Control Deck
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Debate state sync: <span className="font-semibold text-indigo-600">{status}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Admin controls</div>
              <div className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                Real-time via Supabase
              </div>
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {showMigrateBanner ? (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-medium text-amber-50">Slideshow list is not saved to the database yet</p>
              <p className="mt-1 text-amber-100/90">
                In Supabase → SQL Editor, run:{' '}
                <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                  alter table public.event_state add column if not exists prompt_sequence jsonb;
                </code>{' '}
                Then refresh this page. Prompts and sliders still sync; only the custom prompt list needs this
                column.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-slate-900">Event screen — presentation</h2>
              <p className="mt-1 text-xs text-slate-500">
                Toggle to show pre-event slides (intros, housekeeping) on <code className="text-slate-300">/screen</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSlideshow}
              disabled={status === 'Updating...'}
              className={
                slideshowActive
                  ? 'rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.25)] transition hover:bg-amber-400 disabled:opacity-60'
                  : 'rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white disabled:opacity-60'
              }
            >
              {slideshowActive ? 'Slideshow ON' : 'Slideshow OFF'}
            </button>
          </div>

          {slideshowActive ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm text-slate-700">
                Slide {slideshowIndex + 1} of {PRESENTATION_SLIDE_COUNT}
              </span>
              <button
                type="button"
                onClick={() => handlePresentationSlide(-1)}
                disabled={status === 'Updating...'}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Previous slide
              </button>
              <button
                type="button"
                onClick={() => handlePresentationSlide(1)}
                disabled={status === 'Updating...'}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
              >
                Next slide
              </button>
            </div>
          ) : null}

          <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Slideshow text</h3>
              <p className="mt-1 text-xs text-slate-500">
                Edit what appears on each presentation slide on{' '}
                <code className="text-slate-300">/screen</code>. Changes save immediately.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {presentationSlides.map((slide, i) => (
                <div
                  key={`${slide.kind}-${slide.id ?? i}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="mb-2 text-xs font-medium text-slate-600">
                    Slide {i + 1} · {slide.kind === 'hero' ? 'Hero' : 'Title card'}
                  </div>
                  {slide.kind === 'hero' ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Line (optional)</span>
                      <input
                        type="text"
                        value={slide.tagline ?? ''}
                        onChange={(e) =>
                          patchPresentationSlide(i, { tagline: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Leave empty for no line"
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">Title</span>
                        <input
                          type="text"
                          value={slide.title ?? ''}
                          onChange={(e) =>
                            patchPresentationSlide(i, { title: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">Subtitle</span>
                        <input
                          type="text"
                          value={slide.subtitle ?? ''}
                          onChange={(e) =>
                            patchPresentationSlide(i, { subtitle: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showSlideshowMigrateBanner ? (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-medium text-amber-50">Presentation mode is not saved to the database yet</p>
            <p className="mt-1 text-amber-100/90">
              In Supabase → SQL Editor, run:{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                alter table public.event_state add column if not exists slideshow_active boolean default
                false; alter table public.event_state add column if not exists slideshow_index int default 0;
              </code>{' '}
              Then refresh. The toggle will sync to the event screen.
            </p>
          </div>
        ) : null}

        {showPresentationSlidesMigrateBanner ? (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-medium text-amber-50">Slideshow text is not saved to the database yet</p>
            <p className="mt-1 text-amber-100/90">
              In Supabase → SQL Editor, run:{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                alter table public.event_state add column if not exists presentation_slides jsonb default
                null;
              </code>{' '}
              Then refresh. Edited slide copy will sync to the event screen.
            </p>
          </div>
        ) : null}

        {showPanelistIconsMigrateBanner ? (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-medium text-amber-50">Panelist icons are not saved to the database yet</p>
            <p className="mt-1 text-amber-100/90">
              In Supabase → SQL Editor, run:{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">
                alter table public.event_state add column if not exists panelist_1_icon_url text default null;
                alter table public.event_state add column if not exists panelist_2_icon_url text default null;
                alter table public.event_state add column if not exists panelist_3_icon_url text default null;
                alter table public.event_state add column if not exists panelist_4_icon_url text default null;
              </code>{' '}
              Then refresh. Icon URLs will appear on the event screen.
            </p>
          </div>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Panelist positions
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Adjust how each representative is shown on the Strongly Disagree ↔ Strongly Agree scale on the event screen.
            </p>

            <div className="mt-4 space-y-5">
              {panelists.map((storedValue, i) => {
                // Screen uses 1 = Strongly Agree (right), 5 = Strongly Disagree (left).
                // For this admin slider, we show 1 = Strongly Disagree (left) … 5 = Strongly Agree (right),
                // so we invert when reading/writing.
                const uiValue = 6 - storedValue
                return (
                <div
                  key={panelLabels[i]}
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-800">
                      {PANELIST_DISPLAY_NAMES[i]}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {storedValue} / 5
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="text-red-600">Strongly Disagree</span>
                    <span className="text-slate-500">Neutral</span>
                    <span className="text-emerald-600">Strongly Agree</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={uiValue}
                    onChange={(e) => {
                      const nextUiVal = Number(e.target.value)
                      const nextStoredVal = 6 - nextUiVal
                      const next = [...panelists]
                      next[i] = nextStoredVal
                      setPanelists(next)
                      commit(prompt, next)
                    }}
                    className="mt-1 h-2 w-full cursor-pointer accent-indigo-500"
                  />
                </div>
              )})}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-medium text-slate-900">Panelist icons</h2>
            <p className="mt-1 text-xs text-slate-500">
              Optional avatars shown at the ends of each slider on the event screen.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {panelists.map((_, i) => (
                <div key={panelLabels[i]} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                      {PANELIST_DISPLAY_NAMES[i]}
                    </div>
                    {panelistIcons[i] ? (
                      <img
                        src={panelistIcons[i]}
                        alt={`${panelLabels[i]} icon`}
                        className="h-9 w-9 rounded-full border border-slate-300 bg-white object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full border border-dashed border-slate-300 bg-slate-100" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      uploadPanelistIcon(i, file).finally(() => {
                        // Allow re-selecting same file
                        e.target.value = ''
                      })
                    }}
                  />
                  <input
                    type="text"
                    value={panelistIcons[i] ?? ''}
                    placeholder="https://.../icon.png"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                    onChange={(e) => {
                      const next = [...panelistIcons]
                      next[i] = e.target.value || null
                      setPanelistIcons(next)
                      commit(prompt, panelists, promptSequence, next)
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur lg:col-span-2">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-sm font-medium text-slate-200">Prompt Manager</h2>
                {sequenceDirty ? (
                  <span className="text-xs font-medium text-amber-200/90">Unsaved edits</span>
                ) : (
                  <span className="text-xs text-slate-500">Saved</span>
                )}
                <span className="text-xs text-slate-400">One field per slide</span>
              </div>
              <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto sm:justify-start">
                <button
                  type="button"
                  onClick={addPromptRow}
                  className="whitespace-nowrap rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Add prompt
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePromptSequence}
                  disabled={!sequenceDirty}
                  title={
                    sequenceDirty
                      ? 'Save list changes for Next / Previous'
                      : 'Edit a line above to enable'
                  }
                  className="whitespace-nowrap rounded-lg border border-indigo-400/50 bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Update
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-slate-400">Previous</div>
                <div className="mt-1 text-sm text-slate-100">{previousPrompt}</div>
              </div>
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                <div className="text-xs text-indigo-200">Current</div>
                <div className="mt-1 text-sm text-slate-100">{prompt || 'None'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-slate-400">Next</div>
                <div className="mt-1 text-sm text-slate-100">{nextPrompt}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {promptSequenceDraft.map((line, index) => (
                <div key={index} className="flex items-start gap-2">
                  <label className="mt-2 w-8 shrink-0 text-right text-xs font-medium text-slate-500">
                    {index + 1}.
                  </label>
                  <input
                    type="text"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                    value={line}
                    onChange={(e) => updatePromptAt(index, e.target.value)}
                    placeholder={`Prompt ${index + 1}`}
                    aria-label={`Prompt ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removePromptAt(index)}
                    disabled={promptSequenceDraft.length <= 1}
                    className="mt-1 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Remove this prompt"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Edit the list, then click <span className="text-slate-400">Update</span> to save the
              slideshow to the database (survives refresh).
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-slate-900">Event screen — Q&amp;A end slideshow</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Two slides on <code className="text-slate-600">/screen</code>: (1) title above the QR code; (2) title
                  card with subtitle. Control slides here only—the MC cannot change them. Mutually exclusive with the main
                  slideshow.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleQaSlideshow}
                disabled={status === 'Updating...'}
                className={
                  qaSlideshowActive
                    ? 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500 disabled:opacity-60'
                    : 'rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white disabled:opacity-60'
                }
              >
                {qaSlideshowActive ? 'Q&A slideshow ON' : 'Q&A slideshow OFF'}
              </button>
            </div>

            {qaSlideshowActive ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-sm text-slate-700">
                  Q&amp;A slide {qaSlideshowIndex + 1} of {QA_SLIDE_COUNT}
                </span>
                <button
                  type="button"
                  onClick={() => handleQaSlide(-1)}
                  disabled={status === 'Updating...'}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Previous Q&amp;A slide
                </button>
                <button
                  type="button"
                  onClick={() => handleQaSlide(1)}
                  disabled={status === 'Updating...'}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  Next Q&amp;A slide
                </button>
              </div>
            ) : null}

            {showQaSlideshowMigrateBanner ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
                <p className="font-medium text-amber-950">Q&amp;A slideshow columns are not saved to the database yet</p>
                <p className="mt-1 text-amber-900/90">In Supabase → SQL Editor, run:</p>
                <pre className="mt-2 overflow-x-auto rounded bg-black/10 p-2 text-[0.65rem] leading-relaxed text-amber-950">
                  {`alter table public.event_state add column if not exists qa_slideshow_active boolean default false;
alter table public.event_state add column if not exists qa_slideshow_index int default 0;`}
                </pre>
                <p className="mt-2 text-amber-900/90">Then refresh this page.</p>
              </div>
            ) : null}

            {showQaSlidesCopyMigrateBanner ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
                <p className="font-medium text-amber-950">Q&amp;A slide text is not saved to the database yet</p>
                <p className="mt-1 text-amber-900/90">
                  In Supabase → SQL Editor, run:{' '}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">
                    alter table public.event_state add column if not exists qa_slideshow_slides jsonb default null;
                  </code>{' '}
                  Then refresh. Edited copy syncs to the event screen, /ask, and the MC preview.
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Q&amp;A slideshow text</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Edit what appears on each Q&amp;A end slide on <code className="text-slate-600">/screen</code>. Changes
                  save after a short pause.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Slide 1 · Audience Q&amp;A + QR</div>
                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">Title</span>
                    <input
                      type="text"
                      value={qaSlideshowSlides[0]?.title ?? ''}
                      onChange={(e) => patchQaSlide(0, { title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-medium text-slate-600">Slide 2 · Title card</div>
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Title</span>
                      <input
                        type="text"
                        value={qaSlideshowSlides[1]?.title ?? ''}
                        onChange={(e) => patchQaSlide(1, { title: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Subtitle</span>
                      <input
                        type="text"
                        value={qaSlideshowSlides[1]?.subtitle ?? ''}
                        onChange={(e) => patchQaSlide(1, { subtitle: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

