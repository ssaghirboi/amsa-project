import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'

const PANELISTS = [
  { key: 'Panelist 1', title: 'Panelist 1' },
  { key: 'Panelist 2', title: 'Panelist 2' },
  { key: 'Panelist 3', title: 'Panelist 3' },
  { key: 'Panelist 4', title: 'Panelist 4' },
]

function normalizeTarget(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
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

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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
          result = await supabase
            .from('questions')
            .select('id,target_panelist,question_text,created_at')
            .order('created_at', { ascending: false })
            .limit(400)
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

  const grouped = useMemo(() => {
    // Map<panelistKey, Map<promptKey, questions[]>>
    const panelMap = new Map()
    for (const p of PANELISTS) panelMap.set(p.key, new Map())

    for (const q of questions) {
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
  }, [questions])

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <EventBranding centered className="mb-6" />

        <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-5 backdrop-blur">
          <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Questions feed
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
            Incoming audience questions
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Questions are grouped by panelist and by prompt, and update live.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
            {error}
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
                className="rounded-2xl border border-white/10 bg-slate-900/30 backdrop-blur"
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200/90">
                    {p.title}
                  </h2>
                  <span className="text-xs font-medium text-slate-400">
                    {total}
                  </span>
                </div>

                <div className="max-h-[70vh] overflow-auto px-5 py-4">
                  {loading ? (
                    <div className="text-sm text-slate-400">Loading…</div>
                  ) : total === 0 ? (
                    <div className="text-sm text-slate-400">No questions yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {promptGroups.map(([promptKey, items]) => (
                        <div key={promptKey} className="rounded-xl border border-white/10 bg-black/15">
                          <div className="border-b border-white/10 px-4 py-3">
                            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                              Prompt
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-100">
                              {promptKey}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{items.length}</div>
                          </div>
                          <ul className="space-y-3 px-4 py-3">
                            {items.map((q) => (
                              <li
                                key={q.id ?? `${q.created_at}-${q.question_text}`}
                                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                              >
                                <div className="text-sm leading-relaxed text-slate-100">
                                  {q.question_text}
                                </div>
                                {q.created_at ? (
                                  <div className="mt-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                                    {new Date(q.created_at).toLocaleString()}
                                  </div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
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

