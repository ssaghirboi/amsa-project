import { useEffect, useMemo, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import {
  QA_SLIDE_KIND,
  clampQaSlideIndex,
  mergeQaSlidesFromRemote,
} from '../constants/qaSlideshow'

/** /ask — Humanity First Q&A slide */
const ASK_HUMANITY_FIRST_FORM_URL = 'https://forms.gle/JnC5ZgCqb8eRMQMV6'
/** /ask — Thank You Q&A slide */
const ASK_THANK_YOU_TALLY_URL = 'https://tally.so/r/XxYG2z'
import { GENERAL_TARGET_KEY, PANELIST_DISPLAY_NAMES } from '../constants/panelists'
import { supabase } from '../supabaseClient'
import { fetchCurrentEventState, subscribeToEventState } from '../supabase/eventState'

function isMissingColumnError(error) {
  if (!error) return false
  if (error.code === '42703') return true
  const msg = String(error.message || '')
  return /does not exist/i.test(msg) && /column/i.test(msg)
}

async function insertQuestion(supabase, { targetPanelist, question, prompt }) {
  // Matches your provided SQL:
  // questions(
  //   target_panelist TEXT, -- 'General', 'Panelist 1' .. 'Panelist 4'
  //   question_text TEXT
  // )

  // Try to include prompt snapshot (enables /questions grouping by prompt if column exists).
  const payload = {
    target_panelist: targetPanelist,
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
  const [qaSlideshowActive, setQaSlideshowActive] = useState(false)
  const [qaSlideshowIndex, setQaSlideshowIndex] = useState(0)
  const [qaSlideshowSlides, setQaSlideshowSlides] = useState(() =>
    mergeQaSlidesFromRemote(null),
  )
  /** `'general'` or panel index `'1'`…`'4'` */
  const [targetPanel, setTargetPanel] = useState('1')
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)

  const panelOptions = useMemo(
    () => [
      ...PANELIST_DISPLAY_NAMES.map((label, i) => ({
        value: String(i + 1),
        label,
      })),
      { value: 'general', label: 'General' },
    ],
    [],
  )

  const qaSlideIndex = useMemo(
    () => clampQaSlideIndex(qaSlideshowIndex),
    [qaSlideshowIndex],
  )
  const qaSlideKind = qaSlideshowSlides[qaSlideIndex]?.kind
  const showHumanityFormOnly =
    qaSlideshowActive &&
    (qaSlideKind === QA_SLIDE_KIND.HUMANITY_QR || qaSlideIndex === 2)
  const showThankYouAndTally =
    qaSlideshowActive &&
    (qaSlideKind === QA_SLIDE_KIND.HERO_THANKS || qaSlideIndex === 3)

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      const current = await fetchCurrentEventState(supabase).catch(() => null)
      if (current) {
        setPrompt(current.prompt)
        setQaSlideshowActive(Boolean(current.qaSlideshowActive))
        setQaSlideshowIndex(current.qaSlideshowIndex ?? 0)
        setQaSlideshowSlides(mergeQaSlidesFromRemote(current.qaSlideshowSlides ?? null))
      }
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt)
      setQaSlideshowActive(Boolean(next.qaSlideshowActive))
      setQaSlideshowIndex(next.qaSlideshowIndex ?? 0)
      setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  /** During Q&A deck, only the first slide (Audience Q&A + first QR) accepts submissions. */
  const questionFormLocked = qaSlideshowActive && qaSlideshowIndex !== 0

  const onSubmit = async (e) => {
    e.preventDefault()
    if (questionFormLocked) return
    const text = question.trim()
    if (!text) return

    setSubmitting(true)
    setNotice('')
    setJustSubmitted(false)

    try {
      const targetPanelist =
        targetPanel === 'general' ? GENERAL_TARGET_KEY : `Panelist ${targetPanel}`
      await insertQuestion(supabase, { targetPanelist, question: text, prompt })
      setQuestion('')
      setJustSubmitted(true)
      setTimeout(() => {
        setJustSubmitted(false)
      }, 3000)
    } catch (e2) {
      setNotice(e2?.message || String(e2))
    } finally {
      setSubmitting(false)
    }
  }

  if (showHumanityFormOnly) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12 text-slate-900">
        <a
          href={ASK_HUMANITY_FIRST_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[3.25rem] min-w-[min(88vw,20rem)] items-center justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-center text-base font-semibold text-white shadow-[0_14px_40px_rgba(79,70,229,0.35)] transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Open form
        </a>
      </div>
    )
  }

  if (showThankYouAndTally) {
    const thanksTitle =
      String(qaSlideshowSlides[qaSlideIndex]?.title ?? 'Thank You').trim() ||
      'Thank You'
    return (
      <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center gap-8 bg-slate-100 px-4 py-12 text-slate-900">
        <h1 className="max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {thanksTitle}
        </h1>
        <a
          href={ASK_THANK_YOU_TALLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[3.25rem] min-w-[min(88vw,20rem)] items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-4 text-center text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Feedback form
        </a>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] min-h-screen bg-slate-100 text-slate-900">
      <main className="flex min-h-[100dvh] min-h-screen w-full items-start justify-center px-3 pb-10 pt-6 sm:px-5 sm:pb-14 sm:pt-8 md:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 text-sm shadow-[0_22px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:gap-7 sm:p-7 md:p-8 lg:max-w-5xl lg:text-base">
          <div className="flex flex-col items-center gap-4 sm:gap-5">
            <EventBranding centered className="w-full max-w-[18rem] sm:max-w-[20rem]" />
          </div>
          <header className="mt-2 w-full space-y-3 border-b border-slate-100 pb-5 md:pb-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">
              Share your thoughts
            </p>
            <div className="mt-1 rounded-2xl border border-slate-300/80 bg-slate-50 px-4 py-4 text-center shadow-inner sm:px-6 sm:py-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600 sm:text-[0.75rem]">
                Prompt
              </h2>
              {qaSlideshowActive ? (
                qaSlideshowIndex === 0 ? (
                  <p className="mt-2 text-balance text-[clamp(1rem,2.2vw,1.45rem)] font-medium leading-snug tracking-tight text-slate-900">
                    {qaSlideshowSlides[0]?.title ?? ''}
                  </p>
                ) : qaSlideshowIndex === 1 ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-balance text-[clamp(1rem,2.2vw,1.45rem)] font-semibold leading-snug tracking-tight text-slate-900">
                      {qaSlideshowSlides[1]?.title ?? ''}
                    </p>
                    <p className="text-balance text-[clamp(0.95rem,1.9vw,1.2rem)] font-medium leading-snug text-slate-600">
                      {qaSlideshowSlides[1]?.subtitle ?? ''}
                    </p>
                  </div>
                ) : qaSlideshowIndex === 2 ? (
                  <p className="mt-2 text-balance text-[clamp(1rem,2.2vw,1.45rem)] font-semibold leading-snug tracking-tight text-slate-900">
                    {qaSlideshowSlides[2]?.title ?? ''}
                  </p>
                ) : (
                  <p className="mt-2 text-balance text-[clamp(1rem,2.2vw,1.45rem)] font-semibold leading-snug tracking-tight text-slate-900">
                    {qaSlideshowSlides[3]?.title ?? ''}
                  </p>
                )
              ) : (
                <p className="mt-2 text-balance text-[clamp(1rem,2.2vw,1.45rem)] font-medium leading-snug tracking-tight text-slate-900">
                  {prompt?.trim() ? prompt.trim() : 'Waiting for the prompt...'}
                </p>
              )}
            </div>
          </header>

          <form
            onSubmit={onSubmit}
            className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start"
          >
            <div className="min-w-0 space-y-3">
              {questionFormLocked ? (
                <p
                  id="ask-form-locked-hint"
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-center text-xs font-medium leading-snug text-slate-600"
                >
                  Questions are paused while this segment is on screen.
                </p>
              ) : null}
              <fieldset
                disabled={questionFormLocked}
                className="min-w-0 space-y-4 border-0 p-0 disabled:pointer-events-none disabled:opacity-45"
                aria-describedby={questionFormLocked ? 'ask-form-locked-hint' : undefined}
              >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Select a panelist to direct your question or comment towards
                </p>
                <select
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-[16px] text-slate-900 outline-none ring-1 ring-slate-200 transition hover:border-slate-400 hover:bg-white focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 enabled:cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 sm:text-[0.95rem]"
                  value={targetPanel}
                  onChange={(e) => setTargetPanel(e.target.value)}
                >
                  {panelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <textarea
                  className={`mt-2 min-h-[130px] w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-500 ring-1 ring-slate-200 transition hover:border-slate-400 hover:bg-white focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 enabled:cursor-text disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 sm:text-[0.95rem] ${
                    justSubmitted ? 'ask-textarea-submitted' : ''
                  }`}
                  placeholder="Type your question or comment..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || questionFormLocked}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-2.75 text-[16px] font-semibold text-white shadow-[0_18px_45px_rgba(79,70,229,0.45)] transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[0.95rem]"
              >
                {submitting ? 'Sending…' : 'Submit question'}
              </button>
              </fieldset>
            </div>

            <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-100 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                What to keep in mind
              </p>
              <ul className="mt-2 space-y-2 text-[0.85rem] leading-relaxed text-slate-700 sm:text-[0.9rem]">
                <li>Keep your question concise and focused on the current prompt.</li>
                <li>Questions may be edited for clarity or length before being asked.</li>
                <li>
                  Our moderators will select questions that best represent the audience&apos;s interests and foster a
                  balanced discussion among the four representatives.
                </li>
                <li>
                  We welcome all questions, but please ensure they are phrased respectfully. This symposium is a space
                  for constructive dialogue and mutual understanding. Questions containing hate speech, personal attacks,
                  or inflammatory language will not be considered.
                </li>
              </ul>

              {notice && !justSubmitted ? (
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

