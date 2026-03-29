import { useEffect, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import {
  fetchCurrentEventState,
  subscribeToEventState,
} from '../supabase/eventState'

export default function PromptPage() {
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      const current = await fetchCurrentEventState(supabase).catch(() => null)
      if (current) setPrompt(current.prompt ?? '')
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt ?? '')
    })

    const pollMs = 2500
    const pollId = setInterval(() => {
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) setPrompt(next.prompt ?? '')
        })
        .catch(() => {})
    }, pollMs)

    return () => {
      if (unsubscribe) unsubscribe()
      clearInterval(pollId)
    }
  }, [])

  const text = prompt?.trim()
    ? prompt.trim()
    : 'Waiting for the current prompt…'

  return (
    <div className="relative min-h-[100dvh] min-h-screen bg-[#010101] text-slate-100">
      <div
        className="pointer-events-none fixed z-20 left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))]"
        aria-hidden
      >
        <EventBranding variant="presentationCorner" className="shrink-0" />
      </div>

      <main className="flex min-h-[100dvh] min-h-screen items-center justify-center px-6 pb-16 pt-[clamp(8rem,22vh,14rem)] sm:px-10 sm:pb-20">
        <p className="max-w-5xl text-balance text-center text-4xl font-semibold leading-snug tracking-tight text-slate-50 sm:text-5xl md:text-6xl lg:text-[clamp(2.75rem,6vw,4.25rem)] lg:leading-[1.12]">
          {text}
        </p>
      </main>
    </div>
  )
}
