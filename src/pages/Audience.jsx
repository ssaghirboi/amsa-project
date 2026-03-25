import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import {
  fetchCurrentEventState,
  subscribeToEventState,
} from '../supabase/eventState'

async function insertQuestion(supabase, { panelist, question }) {
  // Matches your provided SQL:
  // questions(
  //   target_panelist TEXT, -- 'Panelist 1' .. 'Panelist 4'
  //   question_text TEXT
  // )
  const target = `Panelist ${panelist}`

  const { error } = await supabase.from('questions').insert({
    target_panelist: target,
    question_text: question,
  })

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
      await insertQuestion(supabase, { panelist, question: text })
      setQuestion('')
      setNotice('Question sent.')
    } catch (e2) {
      setNotice(e2?.message || String(e2))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-md px-4 py-8">
        <EventBranding className="mb-8" />
        <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-5 backdrop-blur">
          <div className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Audience Q&A
          </div>
          <h1 className="mt-2 text-xl font-semibold leading-snug">
            {prompt || 'Waiting for the prompt...'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Ask one panelist a question. It will be stored in the `questions` table.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-5 rounded-2xl border border-white/10 bg-slate-900/35 p-5 backdrop-blur"
        >
          <label className="block text-sm font-medium text-slate-200">Panelist</label>
          <select
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            value={panelist}
            onChange={(e) => setPanelist(Number(e.target.value))}
          >
            {panelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm font-medium text-slate-200">
            Your question
          </label>
          <textarea
            className="mt-2 min-h-[110px] w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Submit Question'}
          </button>

          {notice ? (
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                notice === 'Question sent.'
                  ? 'border-green-500/20 bg-green-500/10 text-green-200'
                  : 'border-red-500/20 bg-red-500/10 text-red-200'
              }`}
            >
              {notice}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}

