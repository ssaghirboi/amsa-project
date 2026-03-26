import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { PRESENTATION_SLIDE_COUNT } from '../constants/presentationSlides'
import { supabase } from '../supabaseClient'
import {
  DEFAULT_PROMPT_SEQUENCE,
  fetchCurrentEventState,
  shouldPromptSequenceMigrate,
  shouldPanelistIconsMigrate,
  shouldSlideshowMigrate,
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
  const [status, setStatus] = useState('Connecting...')
  const [error, setError] = useState('')
  const [showMigrateBanner, setShowMigrateBanner] = useState(false)
  const [showSlideshowMigrateBanner, setShowSlideshowMigrateBanner] = useState(false)
  const [showPanelistIconsMigrateBanner, setShowPanelistIconsMigrateBanner] = useState(false)

  const PANELIST_ICON_BUCKET = 'panelist-icons'

  const uploadPanelistIcon = async (panelIndex, file) => {
    if (!file) return
    const i = panelIndex
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'png'
    const path = `${i + 1}.${safeExt}`

    setStatus('Uploading icon...')
    setError('')
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
        slideshowActive,
        slideshowIndex,
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
      } catch (e) {
        setStatus('Live (with local defaults)')
        setError(e?.message || String(e))
        setShowMigrateBanner(false)
        setShowSlideshowMigrateBanner(false)
        setShowPanelistIconsMigrateBanner(false)
      }
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt)
      setPanelists(next.panelists)
      setPanelistIcons(next.panelistIcons ?? [null, null, null, null])
      setSlideshowActive(Boolean(next.slideshowActive))
      setSlideshowIndex(next.slideshowIndex ?? 0)
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
    }
  }, [])

  const commit = async (
    nextPrompt,
    nextPanelists,
    sequenceToSave = promptSequence,
    nextPanelistIcons = panelistIcons,
  ) => {
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt: nextPrompt,
        panelists: nextPanelists,
        panelistIcons: nextPanelistIcons,
        promptSequence: sequenceToSave,
        slideshowActive,
        slideshowIndex,
      })
      setStatus('Live')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
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
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence: next,
        slideshowActive,
        slideshowIndex,
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
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        slideshowActive: next,
        slideshowIndex: idx,
      })
      setSlideshowActive(next)
      setSlideshowIndex(idx)
      setStatus('Live')
      setShowSlideshowMigrateBanner(shouldSlideshowMigrate())
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('Live (write failed)')
    }
  }

  const handlePresentationSlide = async (delta) => {
    if (!slideshowActive) return
    const len = PRESENTATION_SLIDE_COUNT
    const next = (slideshowIndex + delta + len) % len
    setStatus('Updating...')
    try {
      await writeEventState(supabase, {
        prompt,
        panelists,
        panelistIcons,
        promptSequence,
        slideshowActive: true,
        slideshowIndex: next,
      })
      setSlideshowIndex(next)
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
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <EventBranding className="mb-4 sm:mb-6" />
        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin Control Deck
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Debate state sync: <span className="text-indigo-300">{status}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Event prompt & panel weights</div>
              <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
                Real-time via Supabase
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-sm text-slate-300">
              Prompt {activePromptIndex >= 0 ? activePromptIndex + 1 : '-'} of{' '}
              {promptSequence.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetPrompts}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Reset to first prompt
              </button>
              <button
                type="button"
                onClick={handlePreviousPrompt}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Previous Prompt
              </button>
              <button
                type="button"
                onClick={handleNextPrompt}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-400"
              >
                Next Prompt
              </button>
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

        <div className="mb-6 rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-slate-200">Event screen — presentation</h2>
              <p className="mt-1 text-xs text-slate-400">
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
                  : 'rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60'
              }
            >
              {slideshowActive ? 'Slideshow ON' : 'Slideshow OFF'}
            </button>
          </div>
          {slideshowActive ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
              <span className="text-sm text-slate-300">
                Slide {slideshowIndex + 1} of {PRESENTATION_SLIDE_COUNT}
              </span>
              <button
                type="button"
                onClick={() => handlePresentationSlide(-1)}
                disabled={status === 'Updating...'}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
              >
                Previous slide
              </button>
              <button
                type="button"
                onClick={() => handlePresentationSlide(1)}
                disabled={status === 'Updating...'}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-indigo-400 disabled:opacity-60"
              >
                Next slide
              </button>
            </div>
          ) : null}
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
            <label className="block text-sm font-medium text-slate-200">
              Current Prompt
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Enter the debate prompt..."
              value={prompt}
              onChange={(e) => {
                const next = e.target.value
                setPrompt(next)
                commit(next, panelists)
              }}
            />
            <div className="mt-3 text-xs text-slate-400">
              Tip: changes save to Supabase immediately. Prompt list uses Update below.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-200">Panelist Sliders</h2>
              <div className="text-xs text-slate-400">Range: 1 (low) to 5 (high)</div>
            </div>

            <div className="mt-4 space-y-5">
              {panelists.map((value, i) => (
                <div key={panelLabels[i]} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-200">{panelLabels[i]}</div>
                    <div className="text-sm font-semibold text-indigo-200">{value}</div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={value}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value)
                      const next = [...panelists]
                      next[i] = nextVal
                      setPanelists(next)
                      commit(prompt, next)
                    }}
                    className="h-2 w-full cursor-pointer accent-indigo-400"
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">
                      Icon URL
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-white/5 file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        uploadPanelistIcon(i, file).finally(() => {
                          // Allow re-selecting same file
                          e.target.value = ''
                        })
                      }}
                    />
                    {panelistIcons[i] ? (
                      <img
                        src={panelistIcons[i]}
                        alt={`${panelLabels[i]} icon`}
                        className="h-10 w-10 rounded-full border border-white/10 bg-black/20 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md border border-dashed border-white/10 bg-black/10" />
                    )}
                    <input
                      type="text"
                      value={panelistIcons[i] ?? ''}
                      placeholder="https://.../icon.png"
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                      onChange={(e) => {
                        const next = [...panelistIcons]
                        next[i] = e.target.value || null
                        setPanelistIcons(next)
                        commit(prompt, panelists, promptSequence, next)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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
        </div>
      </div>
    </div>
  )
}

