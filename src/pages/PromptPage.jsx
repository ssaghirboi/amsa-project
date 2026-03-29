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

      <main className="flex min-h-[100dvh] min-h-screen w-full items-center justify-center px-3 pb-16 pt-[clamp(8rem,22vh,14rem)] sm:px-5 sm:pb-20 md:px-8 lg:px-12">
        <p className="w-full max-w-[min(100%,92vw)] text-balance text-center text-[clamp(2.75rem,11vw,8rem)] font-semibold leading-[1.06] tracking-tight text-slate-50 lg:max-w-[min(100%,85rem)]">
          {text}
        </p>
      </main>
    </div>
  )
}
