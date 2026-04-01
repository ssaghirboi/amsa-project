import { useEffect, useState } from 'react'
import { EventBranding } from '../components/EventBranding'
import { supabase } from '../supabaseClient'
import {
  fetchCurrentEventState,
  subscribeToEventState,
} from '../supabase/eventState'
import { mergeQaSlidesFromRemote } from '../constants/qaSlideshow'

export default function PromptPage() {
  const [prompt, setPrompt] = useState('')
  const [qaSlideshowActive, setQaSlideshowActive] = useState(false)
  const [qaSlideshowIndex, setQaSlideshowIndex] = useState(0)
  const [qaSlideshowSlides, setQaSlideshowSlides] = useState(() =>
    mergeQaSlidesFromRemote(null),
  )

  useEffect(() => {
    let unsubscribe = null

    ;(async () => {
      const current = await fetchCurrentEventState(supabase).catch(() => null)
      if (current) {
        setPrompt(current.prompt ?? '')
        setQaSlideshowActive(Boolean(current.qaSlideshowActive))
        setQaSlideshowIndex(current.qaSlideshowIndex ?? 0)
        setQaSlideshowSlides(mergeQaSlidesFromRemote(current.qaSlideshowSlides ?? null))
      }
    })()

    unsubscribe = subscribeToEventState(supabase, (next) => {
      setPrompt(next.prompt ?? '')
      setQaSlideshowActive(Boolean(next.qaSlideshowActive))
      setQaSlideshowIndex(next.qaSlideshowIndex ?? 0)
      setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
    })

    const pollMs = 2500
    const pollId = setInterval(() => {
      fetchCurrentEventState(supabase)
        .then((next) => {
          if (next) {
            setPrompt(next.prompt ?? '')
            setQaSlideshowActive(Boolean(next.qaSlideshowActive))
            setQaSlideshowIndex(next.qaSlideshowIndex ?? 0)
            setQaSlideshowSlides(mergeQaSlidesFromRemote(next.qaSlideshowSlides ?? null))
          }
        })
        .catch(() => {})
    }, pollMs)

    return () => {
      if (unsubscribe) unsubscribe()
      clearInterval(pollId)
    }
  }, [])

  const debateText = prompt?.trim()
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
        {qaSlideshowActive && qaSlideshowIndex === 1 ? (
          <div className="w-full max-w-[min(100%,92vw)] space-y-6 text-center lg:max-w-[min(100%,85rem)]">
            <p className="text-balance text-[clamp(2.75rem,11vw,8rem)] font-semibold leading-[1.06] tracking-tight text-slate-50">
              {qaSlideshowSlides[1]?.title ?? ''}
            </p>
            <p className="text-balance text-[clamp(1.25rem,4vw,2.5rem)] font-medium leading-snug text-slate-400">
              {qaSlideshowSlides[1]?.subtitle ?? ''}
            </p>
          </div>
        ) : qaSlideshowActive && qaSlideshowIndex === 2 ? (
          <p className="w-full max-w-[min(100%,92vw)] text-balance text-center text-[clamp(2.25rem,9vw,6.5rem)] font-semibold leading-[1.08] tracking-tight text-slate-50 lg:max-w-[min(100%,85rem)]">
            {qaSlideshowSlides[2]?.title ?? ''}
          </p>
        ) : qaSlideshowActive && qaSlideshowIndex === 3 ? (
          <div className="flex w-full max-w-[min(100%,92vw)] flex-col items-center gap-10 text-center lg:max-w-[min(100%,85rem)]">
            <EventBranding variant="presentationHero" centered className="w-full max-w-[min(85vw,20rem)]" />
            <p className="text-balance text-[clamp(2.75rem,11vw,8rem)] font-semibold leading-[1.06] tracking-tight text-slate-50">
              {qaSlideshowSlides[3]?.title ?? ''}
            </p>
          </div>
        ) : (
          <p className="w-full max-w-[min(100%,92vw)] text-balance text-center text-[clamp(2.75rem,11vw,8rem)] font-semibold leading-[1.06] tracking-tight text-slate-50 lg:max-w-[min(100%,85rem)]">
            {qaSlideshowActive ? qaSlideshowSlides[0]?.title ?? '' : debateText}
          </p>
        )}
      </main>
    </div>
  )
}
