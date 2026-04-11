import { EventBranding } from '../components/EventBranding'

/**
 * Shown for doesgodexist.ca (see App.jsx) and at /stay-tuned for preview on the main domain.
 */
export default function StayTunedPage() {
  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-[#010101] px-5 py-12 text-slate-100">
      {/* Single column so logo + copy share one horizontal center (same max width). */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-10 text-center sm:gap-12">
        <div className="flex w-full justify-center">
          <EventBranding
            variant="presentationHero"
            centered
            className="w-full max-w-[min(92vw,36rem)] sm:max-w-[40rem]"
          />
        </div>
        <p className="w-full max-w-[min(92vw,36rem)] text-balance text-lg leading-relaxed text-slate-300 sm:max-w-[40rem] sm:text-xl md:text-2xl">
          Stay tuned for more from the Ahmadiyya Muslim Students&apos; Association at UofC &amp; MRU.
        </p>
      </div>
    </div>
  )
}
