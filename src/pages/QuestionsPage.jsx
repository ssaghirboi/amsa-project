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
  GENERAL_TARGET_KEY,
  PANELIST_DISPLAY_NAMES,
  getEmptyMcQuestionSlots,
} from '../constants/panelists'

const PANELISTS = [
  { key: GENERAL_TARGET_KEY, title: 'General' },
  ...[1, 2, 3, 4].map((n, i) => ({
    key: `Panelist ${n}`,
    title: PANELIST_DISPLAY_NAMES[i],
  })),
]

function normalizeTarget(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (/^general$/i.test(s)) return GENERAL_TARGET_KEY
  // Accept either “Panelist 1” or just “1”
  const m = s.match(/panelist\s*(\d)/i) ?? s.match(/^(\d)$/)
  if (!m) return s
  return `Panelist ${m[1]}`
}

function sortByNewest(a, b) {
  const ta = Date.parse(a.created_at ?? '') || 0
  const tb = Date.parse(b.created_at ?? '') || 0
  return tb - ta
}

function isMissingColumnError(error) {
  if (!error) return false
  if (error.code === '42703') return true
  const msg = String(error.message || '')
  return /does not exist/i.test(msg) && /column/i.test(msg)
}

function promptKeyFromQuestion(q) {
  const key =
    q.prompt ??
    q.prompt_text ??
    q.prompt_snapshot ??
    q.current_prompt ??
    q.currentPrompt ??
    null
  const s = String(key ?? '').trim()
  return s || 'Unknown prompt'
}

function normalizePrompt(raw) {
  return String(raw ?? '').trim().toLowerCase()
}

function hasPromptSnapshot(q) {
  return q?.prompt != null && String(q.prompt).trim().length > 0
}

function isSameId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

function emptyMcQuestions(nextPrompt) {
  return {
    prompt: String(nextPrompt ?? ''),
    panelists: getEmptyMcQuestionSlots(),
  }
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasPromptColumn, setHasPromptColumn] = useState(true)
  const [eventPrompt, setEventPrompt] = useState('')
  const [eventState, setEventState] = useState(null)
  const [pushError, setPushError] = useState('')
  const [pushStatus, setPushStatus] = useState('')
  const [clearStatus, setClearStatus] = useState('')
  const [lastPromptSeen, setLastPromptSeen] = useState('')

  useEffect(() => {
    let unsub = null
    let pollId = null
    let isActive = true

    async function load() {
      setError('')
      try {
        // Prefer including a prompt snapshot column if present.
        let result = await supabase
          .from('questions')
          .select('id,target_panelist,question_text,created_at,prompt')
          .order('created_at', { ascending: false })
          .limit(400)
        if (result.error && isMissingColumnError(result.error)) {
          setHasPromptColumn(false)
          result = await supabase
            .from('questions')
            .select('id,target_panelist,question_text,created_at')
            .order('created_at', { ascending: false })
            .limit(400)
        } else {
          setHasPromptColumn(true)
        }
        if (result.error) throw result.error
        if (!isActive) return
        setQuestions(Array.isArray(result.data) ? result.data : [])
      } catch (e2) {
        if (!isActive) return
        setError(e2?.message || String(e2))
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('questions_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        () => {
          load()
        },
      )
      .subscribe()

    unsub = () => {
      supabase.removeChannel(channel)
    }

    pollId = setInterval(load, 2500)

    return () => {
      isActive = false
      if (unsub) unsub()
      if (pollId) clearInterval(pollId)
    }
  }, [])

  // Track current prompt + pushed MC selections
  useEffect(() => {
    let unsubscribe = null
    let pollId = null

    const apply = (next) => {
      setEventPrompt(next.prompt ?? '')
      setEventState(next)
    }

    ;(async () => {
      const current = await fetchCurrentEventState(supabase).catch(() => null)
      if (current) apply(current)
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

  const pushed = eventState?.mcQuestions ?? null
  const pushedFor = (panelKey) => pushed?.panelists?.[panelKey] ?? null

  const activePromptKey = normalizePrompt(eventPrompt)

  const clearAllQuestions = async () => {
    setClearStatus('Clearing…')
    setError('')
    try {
      // Best-effort: requires Supabase RLS/policies to permit delete.
      const { error: e } = await supabase.from('questions').delete().neq('id', -1)
      if (e) throw e
      setQuestions([])
      setClearStatus('Cleared')
      setTimeout(() => setClearStatus(''), 1200)
    } catch (e2) {
      setClearStatus('')
      setError(e2?.message || String(e2))
    }
  }

  const clearQuestionsForPromptTransition = async (nextPrompt) => {
    setClearStatus('Clearing…')
    setError('')
    try {
      const nextPromptText = String(nextPrompt ?? '').trim()
      if (hasPromptColumn && nextPromptText) {
        const { error: e } = await supabase
          .from('questions')
          .delete()
          .neq('prompt', nextPromptText)
        if (e && isMissingColumnError(e)) {
          setHasPromptColumn(false)
        } else if (e) {
          throw e
        } else {
          setQuestions((prev) =>
            prev.filter((q) => normalizePrompt(q.prompt) === normalizePrompt(nextPromptText)),
          )
          setClearStatus('')
          return
        }
      }

      // Fallback: no prompt snapshot column — clear everything on prompt change.
      const { error: e2 } = await supabase.from('questions').delete().neq('id', -1)
      if (e2) throw e2
      setQuestions([])
      setClearStatus('')
    } catch (e3) {
      setClearStatus('')
      setError(e3?.message || String(e3))
    }
  }

  // Clear previous prompt's questions when the event moves to a new prompt.
  // Do NOT clear on first load/refresh; only when we detect an actual transition.
  useEffect(() => {
    const key = 'questions:lastPromptSeen'
    const current = String(eventPrompt ?? '').trim()
    if (!current) return

    const stored = localStorage.getItem(key) ?? ''
    if (!stored) {
      localStorage.setItem(key, current)
      setLastPromptSeen(current)
      return
    }

    if (stored === current) {
      setLastPromptSeen(current)
      return
    }

    localStorage.setItem(key, current)
    setLastPromptSeen(current)
    clearQuestionsForPromptTransition(current).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventPrompt, hasPromptColumn])

  const pushToMc = async (panelKey, q) => {
    if (!eventState) return
    setPushError('')
    setPushStatus('Pushing…')
    try {
      const nextMc = pushed && typeof pushed === 'object'
        ? {
            prompt: String(eventState.prompt ?? ''),
            panelists: {
              [GENERAL_TARGET_KEY]: pushed?.panelists?.[GENERAL_TARGET_KEY] ?? null,
              'Panelist 1': pushed?.panelists?.['Panelist 1'] ?? null,
              'Panelist 2': pushed?.panelists?.['Panelist 2'] ?? null,
              'Panelist 3': pushed?.panelists?.['Panelist 3'] ?? null,
              'Panelist 4': pushed?.panelists?.['Panelist 4'] ?? null,
            },
          }
        : emptyMcQuestions(eventState.prompt ?? '')

      nextMc.panelists[panelKey] = {
        id: q.id ?? null,
        question_text: q.question_text ?? '',
        created_at: q.created_at ?? null,
        prompt: q.prompt ?? null,
      }

      await writeEventState(supabase, {
        prompt: eventState.prompt ?? '',
        panelists: eventState.panelists ?? [3, 3, 3, 3],
        panelistIcons: eventState.panelistIcons ?? [null, null, null, null],
        promptSequence: eventState.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
        presentationSlides: eventState.presentationSlides ?? [],
        slideshowActive: Boolean(eventState.slideshowActive),
        slideshowIndex: eventState.slideshowIndex ?? 0,
        qaSlideshowActive: Boolean(eventState.qaSlideshowActive),
        mcQuestions: nextMc,
      })

      // Verify the write actually persisted (mc_questions column must exist).
      const refreshed = await fetchCurrentEventState(supabase).catch(() => null)
      const persistedId =
        refreshed?.mcQuestions?.panelists?.[panelKey]?.id ?? null
      if (!isSameId(persistedId, q.id ?? null)) {
        throw new Error(
          "Couldn't persist the MC push. In Supabase, add `mc_questions` to `event_state`:\n\n" +
            "alter table public.event_state add column if not exists mc_questions jsonb default null;\n",
        )
      }

      setPushStatus('Pushed')
      setTimeout(() => setPushStatus(''), 900)
    } catch (e) {
      setPushError(e?.message || String(e))
      setPushStatus('')
    }
  }

  const clearPushedFromMc = async (panelKey) => {
    if (!eventState || !pushed) return
    setPushError('')
    setPushStatus('Updating…')
    try {
      const nextMc = {
        prompt: String(eventState.prompt ?? ''),
        panelists: {
          [GENERAL_TARGET_KEY]: pushed.panelists?.[GENERAL_TARGET_KEY] ?? null,
          'Panelist 1': pushed.panelists?.['Panelist 1'] ?? null,
          'Panelist 2': pushed.panelists?.['Panelist 2'] ?? null,
          'Panelist 3': pushed.panelists?.['Panelist 3'] ?? null,
          'Panelist 4': pushed.panelists?.['Panelist 4'] ?? null,
        },
      }
      nextMc.panelists[panelKey] = null

      await writeEventState(supabase, {
        prompt: eventState.prompt ?? '',
        panelists: eventState.panelists ?? [3, 3, 3, 3],
        panelistIcons: eventState.panelistIcons ?? [null, null, null, null],
        promptSequence: eventState.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
        presentationSlides: eventState.presentationSlides ?? [],
        slideshowActive: Boolean(eventState.slideshowActive),
        slideshowIndex: eventState.slideshowIndex ?? 0,
        qaSlideshowActive: Boolean(eventState.qaSlideshowActive),
        mcQuestions: nextMc,
      })

      setPushStatus('Updated')
      setTimeout(() => setPushStatus(''), 900)
    } catch (e) {
      setPushError(e?.message || String(e))
      setPushStatus('')
    }
  }

  const grouped = useMemo(() => {
    // If prompt snapshot exists and at least one question is tagged for the current prompt,
    // show only those. Otherwise, keep showing untagged questions (prevents “flash then disappear”).
    const currentTagged =
      hasPromptColumn && activePromptKey
        ? questions.filter((q) => normalizePrompt(q.prompt) === activePromptKey)
        : []
    const filtered =
      hasPromptColumn && activePromptKey && currentTagged.length > 0
        ? currentTagged
        : questions

    // Map<panelistKey, Map<promptKey, questions[]>>
    const panelMap = new Map()
    for (const p of PANELISTS) panelMap.set(p.key, new Map())

    for (const q of filtered) {
      const panelKey = normalizeTarget(q.target_panelist) ?? 'Unassigned'
      if (!panelMap.has(panelKey)) panelMap.set(panelKey, new Map())
      const byPrompt = panelMap.get(panelKey)
      const promptKey = promptKeyFromQuestion(q)
      if (!byPrompt.has(promptKey)) byPrompt.set(promptKey, [])
      byPrompt.get(promptKey).push(q)
    }

    // Sort within each prompt group, and order prompt groups by newest question inside them.
    for (const [, byPrompt] of panelMap.entries()) {
      for (const [pk, arr] of byPrompt.entries()) {
        byPrompt.set(pk, [...arr].sort(sortByNewest))
      }
    }

    return panelMap
  }, [questions, hasPromptColumn, activePromptKey])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8 lg:px-10">
        <EventBranding centered className="mx-auto mb-4 w-full max-w-[18rem] sm:mb-5 sm:max-w-[20rem]" />
        <div className="sticky top-[max(0,env(safe-area-inset-top))] z-20 pb-4">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="min-w-0 text-balance text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem]">
                {eventPrompt?.trim() ? eventPrompt.trim() : 'Waiting for the current prompt…'}
              </h1>
              <div className="shrink-0 text-right">
                <button
                  type="button"
                  onClick={clearAllQuestions}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={clearStatus === 'Clearing…'}
                  title="Clear all questions"
                >
                  {clearStatus ? clearStatus : 'Clear'}
                </button>
                {pushStatus ? (
                  <div className="mt-2 text-xs font-medium text-indigo-600">• {pushStatus}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        {pushError ? (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
            {pushError}
          </div>
        ) : null}

        {/* MC dashboard (pushed questions) */}
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm sm:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600">
              Panelist questions
            </h2>
            <span className="text-xs text-slate-500">pushed to MC</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PANELISTS.map((p) => {
              const q = pushedFor(p.key)
              return (
                <div
                  key={p.key}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {p.title}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-900">
                    {q?.question_text ? q.question_text : <span className="text-slate-500">No question yet.</span>}
                  </div>
                  {q?.created_at ? (
                    <div className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-slate-500">
                      {new Date(q.created_at).toLocaleTimeString()}
                    </div>
                  ) : null}
                  {q?.question_text ? (
                    <button
                      type="button"
                      onClick={() => clearPushedFromMc(p.key)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-slate-50"
                    >
                      Remove from MC
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {PANELISTS.map((p) => {
            const byPrompt = grouped.get(p.key) ?? new Map()
            const total = Array.from(byPrompt.values()).reduce((acc, arr) => acc + arr.length, 0)
            const promptGroups = Array.from(byPrompt.entries()).sort((a, b) => {
              const ta = Date.parse(a[1]?.[0]?.created_at ?? '') || 0
              const tb = Date.parse(b[1]?.[0]?.created_at ?? '') || 0
              return tb - ta
            })
            const pushedQ = pushedFor(p.key)
            return (
              <section
                key={p.key}
                className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-700">
                    {p.title}
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    {total}
                  </span>
                </div>

                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Currently pushed to MC
                  </div>
                  <div className="mt-2 text-sm text-slate-900">
                    {pushedQ?.question_text ? pushedQ.question_text : (
                      <span className="text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div className="max-h-[55vh] overflow-auto px-5 py-4">
                  {loading ? (
                    <div className="text-sm text-slate-400">Loading…</div>
                  ) : total === 0 ? (
                    <div className="text-sm text-slate-400">No questions yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {promptGroups.flatMap(([, items]) =>
                        items.map((q) => (
                          <div
                            key={q.id ?? `${q.created_at}-${q.question_text}`}
                            className={`rounded-xl border bg-slate-50 px-4 py-3 ${
                              pushedQ?.id != null &&
                              q.id != null &&
                              String(pushedQ.id) === String(q.id)
                                ? 'border-indigo-400/60'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="text-sm leading-relaxed text-slate-900">
                              {q.question_text}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => pushToMc(p.key, q)}
                                disabled={
                                  !eventState ||
                                  (hasPromptColumn &&
                                    activePromptKey &&
                                    hasPromptSnapshot(q) &&
                                    normalizePrompt(q.prompt) !== activePromptKey)
                                }
                                title={
                                  !eventState
                                    ? 'Connecting to event state…'
                                    : hasPromptColumn &&
                                        activePromptKey &&
                                        hasPromptSnapshot(q) &&
                                        normalizePrompt(q.prompt) !== activePromptKey
                                      ? 'This question was submitted under a different prompt.'
                                      : 'Push this question to the MC screen'
                                }
                                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Push to MC
                              </button>
                              {q.created_at ? (
                                <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                                  {new Date(q.created_at).toLocaleString()}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )),
                      )}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

