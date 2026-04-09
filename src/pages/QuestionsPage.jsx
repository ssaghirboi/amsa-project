import { useEffect, useMemo, useState } from 'react'
import {
  GENERAL_TARGET_KEY,
  PANELIST_DISPLAY_NAMES,
  audienceQueueItemsMatch,
  displayNameForMcTarget,
  getEmptyMcQuestionSlots,
  normalizeQaAudienceQueue,
} from '../constants/panelists'
import { QA_SLIDESHOW_TITLE } from '../constants/qaSlideshow'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import { mergePresentationSlidesFromRemote } from '../constants/presentationSlides'
import {
  DEFAULT_PROMPT_SEQUENCE,
  fetchCurrentEventState,
  shouldMcQuestionsMigrate,
  subscribeToEventState,
  writeEventState,
} from '../supabase/eventState'
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
    qaAudienceQueue: [],
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
  const [queueWriteBusy, setQueueWriteBusy] = useState(false)
  const [clearStatus, setClearStatus] = useState('')
  const [lastPromptSeen, setLastPromptSeen] = useState('')
  const [mcQuestionsColumnMissing, setMcQuestionsColumnMissing] = useState(false)

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
      setMcQuestionsColumnMissing(shouldMcQuestionsMigrate())
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
  const qaMode = Boolean(eventState?.qaSlideshowActive)
  const qaQueue = useMemo(
    () => normalizeQaAudienceQueue(pushed?.qaAudienceQueue),
    [pushed?.qaAudienceQueue],
  )

  const activePromptKey = normalizePrompt(eventPrompt)

  const mcQuestionsPayloadWithQueue = (nextQueueRaw) => {
    if (!eventState) return null
    const nextQueue = normalizeQaAudienceQueue(nextQueueRaw)
    if (!pushed) {
      return {
        prompt: String(eventState.prompt ?? ''),
        panelists: getEmptyMcQuestionSlots(),
        qaAudienceQueue: nextQueue,
      }
    }
    return {
      prompt: String(eventState.prompt ?? ''),
      panelists: {
        [GENERAL_TARGET_KEY]: pushed.panelists?.[GENERAL_TARGET_KEY] ?? null,
        'Panelist 1': pushed.panelists?.['Panelist 1'] ?? null,
        'Panelist 2': pushed.panelists?.['Panelist 2'] ?? null,
        'Panelist 3': pushed.panelists?.['Panelist 3'] ?? null,
        'Panelist 4': pushed.panelists?.['Panelist 4'] ?? null,
      },
      qaAudienceQueue: nextQueue,
    }
  }

  const persistQaQueue = async (nextQueueRaw) => {
    if (!eventState || mcQuestionsColumnMissing) return
    const payload = mcQuestionsPayloadWithQueue(nextQueueRaw)
    if (!payload) return
    setPushError('')
    setQueueWriteBusy(true)
    try {
      await writeEventState(supabase, {
        prompt: eventState.prompt ?? '',
        panelists: eventState.panelists ?? [3, 3, 3, 3],
        panelistIcons: eventState.panelistIcons ?? [null, null, null, null],
        promptSequence: eventState.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
        presentationSlides: mergePresentationSlidesFromRemote(
          eventState.presentationSlides ?? null,
        ),
        qaSlideshowSlides: eventState.qaSlideshowSlides ?? null,
        slideshowActive: Boolean(eventState.slideshowActive),
        slideshowIndex: eventState.slideshowIndex ?? 0,
        qaSlideshowActive: Boolean(eventState.qaSlideshowActive),
        qaSlideshowIndex: eventState.qaSlideshowIndex ?? 0,
        mcQuestions: payload,
      })
    } catch (e) {
      setPushError(e?.message || String(e))
    } finally {
      setQueueWriteBusy(false)
    }
  }

  const moveQueueSlot = (index, delta) => {
    const list = [...qaQueue]
    const j = index + delta
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    persistQaQueue(list)
  }

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
    if (mcQuestionsColumnMissing) {
      setPushError('Database is missing the mc_questions column — use the setup note at the top of this page.')
      return
    }
    setPushError('')
    try {
      const basePanelists =
        pushed && typeof pushed === 'object'
          ? {
              [GENERAL_TARGET_KEY]: pushed?.panelists?.[GENERAL_TARGET_KEY] ?? null,
              'Panelist 1': pushed?.panelists?.['Panelist 1'] ?? null,
              'Panelist 2': pushed?.panelists?.['Panelist 2'] ?? null,
              'Panelist 3': pushed?.panelists?.['Panelist 3'] ?? null,
              'Panelist 4': pushed?.panelists?.['Panelist 4'] ?? null,
            }
          : getEmptyMcQuestionSlots()

      const nextMc = pushed && typeof pushed === 'object'
        ? {
            prompt: String(eventState.prompt ?? ''),
            panelists: basePanelists,
            qaAudienceQueue: normalizeQaAudienceQueue(pushed.qaAudienceQueue),
          }
        : emptyMcQuestions(eventState.prompt ?? '')

      const entry = {
        id: q.id ?? null,
        question_text: q.question_text ?? '',
        created_at: q.created_at ?? null,
        prompt: q.prompt ?? null,
        target_key: panelKey,
      }

      if (
        nextMc.qaAudienceQueue.some(
          (x) =>
            x.target_key === panelKey &&
            (isSameId(x.id, q.id) || audienceQueueItemsMatch(x, entry)),
        )
      ) {
        return
      }
      nextMc.qaAudienceQueue = [...nextMc.qaAudienceQueue, entry]

      await writeEventState(supabase, {
        prompt: eventState.prompt ?? '',
        panelists: eventState.panelists ?? [3, 3, 3, 3],
        panelistIcons: eventState.panelistIcons ?? [null, null, null, null],
        promptSequence: eventState.promptSequence ?? DEFAULT_PROMPT_SEQUENCE,
        presentationSlides: mergePresentationSlidesFromRemote(
          eventState.presentationSlides ?? null,
        ),
        qaSlideshowSlides: eventState.qaSlideshowSlides ?? null,
        slideshowActive: Boolean(eventState.slideshowActive),
        slideshowIndex: eventState.slideshowIndex ?? 0,
        qaSlideshowActive: Boolean(eventState.qaSlideshowActive),
        qaSlideshowIndex: eventState.qaSlideshowIndex ?? 0,
        mcQuestions: nextMc,
      })

      const refreshed = await fetchCurrentEventState(supabase).catch(() => null)
      const ok = normalizeQaAudienceQueue(refreshed?.mcQuestions?.qaAudienceQueue).some((x) =>
        audienceQueueItemsMatch(x, entry),
      )
      if (!ok) {
        throw new Error(
          "Couldn't persist the MC push. In Supabase, add `mc_questions` to `event_state`:\n\n" +
            "alter table public.event_state add column if not exists mc_questions jsonb default null;\n",
        )
      }
    } catch (e) {
      setPushError(e?.message || String(e))
    }
  }

  const removeQaAudienceFromMc = async (item) => {
    if (!eventState || mcQuestionsColumnMissing) return
    const queue = qaQueue.filter((x) => !audienceQueueItemsMatch(x, item))
    await persistQaQueue(queue)
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

  const isQuestionInQaQueue = (panelKey, q) =>
    qaQueue.some(
      (x) =>
        x.target_key === panelKey &&
        (isSameId(x.id, q.id) ||
          audienceQueueItemsMatch(x, {
            id: q.id,
            question_text: q.question_text,
            created_at: q.created_at,
            prompt: q.prompt,
            target_key: panelKey,
          })),
    )

  const qaQueueItemForQuestion = (panelKey, q) =>
    qaQueue.find(
      (x) =>
        x.target_key === panelKey &&
        (isSameId(x.id, q.id) ||
          audienceQueueItemsMatch(x, {
            id: q.id,
            question_text: q.question_text,
            created_at: q.created_at,
            prompt: q.prompt,
            target_key: panelKey,
          })),
    ) ?? null

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="order-first w-full shrink-0 border-b border-slate-200 bg-white lg:order-none lg:w-[min(22rem,92vw)] lg:border-b-0 lg:border-r lg:border-slate-200">
          <div className="sticky top-0 z-10 max-h-[min(50vh,28rem)] overflow-y-auto px-4 py-5 lg:max-h-[100dvh]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              MC queue
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              Same order as the MC audience queue. Push from the bank, then reorder or remove anytime.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {qaQueue.length === 0
                ? 'Nothing pushed yet'
                : `${qaQueue.length} ${qaQueue.length === 1 ? 'question' : 'questions'} · order matches the MC screen`}
            </p>
            <ul className="mt-4 space-y-2">
              {qaQueue.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                  Push questions from the bank to add them here.
                </li>
              ) : (
                qaQueue.map((item, index) => (
                  <li
                    key={
                      item.id != null
                        ? `mcq-${String(item.id)}-${index}`
                        : `mcq-${index}-${item.created_at}-${String(item.question_text).slice(0, 40)}`
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-w-0 rounded-lg bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-indigo-900">
                        {displayNameForMcTarget(item.target_key)}
                      </span>
                      <span className="text-[0.65rem] font-medium text-slate-400">#{index + 1}</span>
                    </div>
                    <p className="mt-2 line-clamp-4 text-sm leading-snug text-slate-800">
                      {item.question_text}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!eventState || mcQuestionsColumnMissing || queueWriteBusy || index === 0}
                        onClick={() => moveQueueSlot(index, -1)}
                        className="touch-manipulation rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move up in queue"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={
                          !eventState || mcQuestionsColumnMissing || queueWriteBusy || index >= qaQueue.length - 1
                        }
                        onClick={() => moveQueueSlot(index, 1)}
                        className="touch-manipulation rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move down in queue"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        disabled={!eventState || mcQuestionsColumnMissing || queueWriteBusy}
                        onClick={() => removeQaAudienceFromMc(item)}
                        className="touch-manipulation rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8 lg:px-10">
            <EventBranding centered className="mx-auto mb-4 w-full max-w-[18rem] sm:mb-5 sm:max-w-[20rem]" />
            <div className="sticky top-[max(0,env(safe-area-inset-top))] z-20 pb-4">
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-balance text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl md:text-[1.75rem]">
                      {qaMode
                        ? QA_SLIDESHOW_TITLE
                        : eventPrompt?.trim()
                          ? eventPrompt.trim()
                          : 'Waiting for the current prompt…'}
                    </h1>
                    {!qaMode ? (
                      <p className="mt-2 max-w-2xl text-sm text-slate-600">
                        Question bank: newest first, grouped by General and each speaker. Use
                        &quot;Push to MC&quot; anytime to line up the audience queue on the MC screen
                        (including before Q&amp;A goes live).
                      </p>
                    ) : null}
                  </div>
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
                  </div>
                </div>
              </div>
            </div>

        {mcQuestionsColumnMissing ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium text-amber-950">Push to MC needs a Supabase column</p>
            <p className="mt-1 text-amber-900/90">
              Your project&apos;s{' '}
              <code className="rounded bg-black/10 px-1 py-0.5 text-[0.8em] text-amber-950">event_state</code>{' '}
              table must store the audience queue. In Supabase → SQL Editor, run:
            </p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-black/10 px-3 py-2 text-xs text-amber-950">
              alter table public.event_state add column if not exists mc_questions jsonb default null;
            </code>
            <p className="mt-2 text-amber-900/90">Then refresh this page. After that, pushes and the queue will save correctly.</p>
          </div>
        ) : null}

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

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {PANELISTS.map((p) => {
            const byPrompt = grouped.get(p.key) ?? new Map()
            const total = Array.from(byPrompt.values()).reduce((acc, arr) => acc + arr.length, 0)
            const promptGroups = Array.from(byPrompt.entries()).sort((a, b) => {
              const ta = Date.parse(a[1]?.[0]?.created_at ?? '') || 0
              const tb = Date.parse(b[1]?.[0]?.created_at ?? '') || 0
              return tb - ta
            })
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
                              isQuestionInQaQueue(p.key, q)
                                ? 'border-emerald-500/55'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="text-sm leading-relaxed text-slate-900">
                              {q.question_text}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              {isQuestionInQaQueue(p.key, q) ? (
                                <button
                                  type="button"
                                  disabled={queueWriteBusy || !eventState || mcQuestionsColumnMissing}
                                  onClick={() => {
                                    const item = qaQueueItemForQuestion(p.key, q)
                                    if (item) removeQaAudienceFromMc(item)
                                  }}
                                  className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Remove from MC
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => pushToMc(p.key, q)}
                                  disabled={
                                    queueWriteBusy ||
                                    !eventState ||
                                    mcQuestionsColumnMissing ||
                                    (hasPromptColumn &&
                                      activePromptKey &&
                                      hasPromptSnapshot(q) &&
                                      normalizePrompt(q.prompt) !== activePromptKey)
                                  }
                                  title={
                                    mcQuestionsColumnMissing
                                      ? 'Add mc_questions to event_state (see banner above)'
                                      : !eventState
                                        ? 'Connecting to event state…'
                                        : hasPromptColumn &&
                                            activePromptKey &&
                                            hasPromptSnapshot(q) &&
                                            normalizePrompt(q.prompt) !== activePromptKey
                                          ? 'This question was submitted under a different prompt.'
                                          : 'Add this question to the MC Q&A queue'
                                  }
                                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Push to MC
                                </button>
                              )}
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
      </div>
    </div>
  )
}

