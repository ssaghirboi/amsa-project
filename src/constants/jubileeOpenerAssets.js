/**
 * Opinion-hand SVGs for the first presentation slide (Jubilee opener).
 * Order: left column top→bottom (Strongly Agree, Disagree, Neutral), then right (Agree, Strongly Disagree).
 * Reorder imports if your files don’t match the mockup.
 */
import signStronglyAgree from '../assets/IS GOD REAL (Business Card US Portrait).svg?url'
import signDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (1).svg?url'
import signNeutral from '../assets/IS GOD REAL (Business Card US Portrait) (2).svg?url'
import signAgree from '../assets/IS GOD REAL (Business Card US Portrait) (3).svg?url'
import signStronglyDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (4).svg?url'

/** Larger signs, anchored past the viewport edge so arms/paddles “hang off” the screen. */
export const JUBILEE_OPENER_SIGNS = [
  {
    key: 'strongly-agree',
    label: 'Strongly Agree',
    src: signStronglyAgree,
    className:
      'z-10 left-[-18%] top-[1%] w-[min(78vw,32rem)] sm:left-[-14%] sm:w-[min(72vw,36rem)] md:left-[-10%] md:w-[min(68vw,40rem)] rotate-[13deg]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'z-10 left-[-26%] top-[28%] w-[min(74vw,30rem)] sm:left-[-20%] sm:w-[min(70vw,34rem)] md:left-[-14%] md:w-[min(66vw,38rem)] -rotate-[7deg]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'z-10 left-[-20%] top-[54%] w-[min(76vw,31rem)] sm:left-[-16%] sm:w-[min(72vw,35rem)] md:left-[-11%] md:w-[min(68vw,39rem)] rotate-[5deg]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'z-10 right-[-18%] top-[6%] w-[min(74vw,30rem)] sm:right-[-14%] sm:w-[min(70vw,34rem)] md:right-[-10%] md:w-[min(66vw,38rem)] -rotate-[11deg]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'z-10 right-[-24%] top-[44%] w-[min(78vw,32rem)] sm:right-[-18%] sm:w-[min(74vw,36rem)] md:right-[-12%] md:w-[min(70vw,40rem)] rotate-[11deg]',
  },
]
