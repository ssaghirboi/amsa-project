import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import { fetchCurrentEventState, subscribeToEventState } from '../supabase/eventState'

function isMissingColumnError(error) {
  if (!error) return false
  if (error.code === '42703') return true
  const msg = String(error.message || '')
  return /does not exist/i.test(msg) && /column/i.test(msg)
}

async function insertQuestion(supabase, { panelist, question, prompt }) {
  // Matches your provided SQL:
  // questions(
  //   target_panelist TEXT, -- 'Panelist 1' .. 'Panelist 4'
  //   question_text TEXT
  // )
  const target = `Panelist ${panelist}`

  // Try to include prompt snapshot (enables /questions grouping by prompt if column exists).
  const payload = {
    target_panelist: target,
    question_text: question,
    prompt: prompt ?? null,
  }

  let { error } = await supabase.from('questions').insert(payload)

  // If DB doesn't have a `prompt` column, retry without it.
  if (error && isMissingColumnError(error)) {
    delete payload.prompt
    const second = await supabase.from('questions').insert(payload)
    error = second.error
  }

  if (error) throw error
}

export default function Audience() {
  const [prompt, setPrompt] = useState('')
  const [panelist, setPanelist] = useState(1)
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const panelOptions = useMemo(
    () => [
      { value: 1, label: 'Panelist 1' },
      { value: 2, label: 'Panelist 2' },
      { value: 3, label: 'Panelist 3' },
      { value: 4, label: 'Panelist 4' },
    ],
    [],
  )

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      const current = await fetchCurrentEventState(supabase).catch(() => null)
      if (current) setPrompt(current.prompt)
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    const text = question.trim()
    if (!text) return

    setSubmitting(true)
    setNotice('')

    try {
      await insertQuestion(supabase, { panelist, question: text, prompt })
      setQuestion('')
      setNotice('Question sent.')
    } catch (e2) {
      setNotice(e2?.message || String(e2))
    } finally {
      setSubmitting(false)
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

      <main className="flex min-h-[100dvh] min-h-screen w-full items-center justify-center px-3 pb-16 pt-[clamp(8rem,22vh,14rem)] sm:px-5 sm:pb-20 md:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-3xl border border-white/10 bg-black/40 p-6 text-sm shadow-[0_22px_80px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-8 md:p-10 lg:max-w-5xl lg:text-base">
          <header className="space-y-3 border-b border-white/10 pb-6 md:pb-7">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-400 sm:text-xs">
              Audience Q&A
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-slate-500 sm:text-[0.72rem]">
              Current prompt
            </p>
            <h1 className="mt-1 text-balance text-lg font-semibold leading-snug tracking-tight text-slate-50 sm:text-xl md:text-2xl">
              {prompt?.trim() ? prompt.trim() : 'Waiting for the prompt...'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-[0.95rem]">
              Ask a question and direct it towards any of the four panelists.
            </p>
          </header>

          <form
            onSubmit={onSubmit}
            className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Select a Panelist
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-slate-100 outline-none ring-1 ring-white/5 transition hover:border-white/25 hover:bg-black/50 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/30 sm:text-[0.95rem]"
                  value={panelist}
                  onChange={(e) => setPanelist(Number(e.target.value))}
                >
                  {panelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  Your question
                </label>
                <textarea
                  className="mt-2 min-h-[130px] w-full resize-none rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 ring-1 ring-white/5 transition hover:border-white/25 hover:bg-black/50 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/30 sm:text-[0.95rem]"
                  placeholder="Type your question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-2.75 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(79,70,229,0.55)] transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 sm:text-[0.95rem]"
              >
                {submitting ? 'Sending…' : 'Submit question'}
              </button>
            </div>

            <aside className="space-y-3 rounded-2xl border border-white/12 bg-black/40 p-4 text-sm text-slate-300 ring-1 ring-white/5 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                What to keep in mind
              </p>
              <ul className="mt-2 space-y-2 text-[0.85rem] leading-relaxed text-slate-300 sm:text-[0.9rem]">
                <li>Keep your question concise and focused on the current prompt.</li>
                <li>Choose the panelist you most want to answer.</li>
                <li>Questions may be edited for clarity or length before being asked.</li>
              </ul>

              {notice ? (
                <div
                  className={`mt-3 rounded-xl border px-3.5 py-2.5 text-[0.85rem] ${
                    notice === 'Question sent.'
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                  }`}
                >
                  {notice}
                </div>
              ) : null}
            </aside>
          </form>
        </div>
      </main>
    </div>
  )
}

