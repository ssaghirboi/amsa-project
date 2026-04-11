import { EventBranding } from '../components/EventBranding'

/**
 * Shown for doesgodexist.ca (see App.jsx) and at /stay-tuned for preview on the main domain.
 */
export default function StayTunedPage() {
  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-[#010101] px-5 py-12 text-slate-100">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10 text-center sm:max-w-3xl sm:gap-12">
        <EventBranding
          variant="presentationHero"
          centered
          className="w-full [&_img]:!max-h-[min(68vh,32rem)] [&_img]:!max-w-[min(96vw,48rem)] sm:[&_img]:!max-h-[min(64vh,36rem)] sm:[&_img]:!max-w-[48rem] md:[&_img]:!max-h-[min(58vh,40rem)] md:[&_img]:!max-w-[52rem]"
        />

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
