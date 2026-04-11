import { EventBranding } from '../components/EventBranding'

/**
 * Shown for doesgodexist.ca (see App.jsx) and at /stay-tuned for preview on the main domain.
 */
export default function StayTunedPage() {
  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-[#010101] px-5 py-12 text-slate-100">
      <div className="flex w-full max-w-lg flex-col items-center gap-10 text-center sm:max-w-xl sm:gap-12">
        <div className="flex w-full justify-center">
          <EventBranding
            variant="presentationHero"
            centered
            className="w-full max-w-[min(92vw,36rem)] sm:max-w-[40rem]"
          />
        </div>

        <div className="flex w-full flex-col items-center gap-6 text-balance sm:gap-8">
          <p className="text-lg font-medium text-slate-100 sm:text-xl md:text-2xl">
            Thank you for joining us.
          </p>
          <div className="flex flex-col items-center gap-1 text-base leading-relaxed text-slate-300 sm:gap-1.5 sm:text-lg md:text-xl">
            <p>Stay tuned for more from the</p>
            <p className="font-medium text-slate-100">
              Ahmadiyya Muslim Students Association
            </p>
            <p>at UofC and MRU.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
