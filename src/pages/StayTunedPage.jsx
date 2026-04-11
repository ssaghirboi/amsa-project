import { EventBranding } from '../components/EventBranding'

/**
 * Shown for doesgodexist.ca (see App.jsx) and at /stay-tuned for preview on the main domain.
 */
export default function StayTunedPage() {
  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-[#010101] px-5 py-12 text-center text-slate-100">
      <EventBranding variant="presentationHero" centered className="w-full max-w-[min(92vw,40rem)]" />
      <p className="mt-10 max-w-xl text-balance text-lg leading-relaxed text-slate-300 sm:mt-12 sm:text-xl md:text-2xl">
        Stay tuned for more from the Ahmadiyya Muslim Students&apos; Association at UofC &amp; MRU.
      </p>
    </div>
  )
}
