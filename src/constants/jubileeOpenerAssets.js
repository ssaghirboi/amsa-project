/**
 * Opinion-hand SVGs for the first presentation slide (Jubilee opener).
 * Left column top→bottom: Strongly Agree, Neutral, Disagree (reference layout).
 * Right column: Agree (top), Strongly Disagree (bottom).
 * Reorder imports in this file if assets don’t match labels.
 */
import signStronglyAgree from '../assets/IS GOD REAL (Business Card US Portrait).svg?url'
import signDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (1).svg?url'
import signNeutral from '../assets/IS GOD REAL (Business Card US Portrait) (2).svg?url'
import signAgree from '../assets/IS GOD REAL (Business Card US Portrait) (3).svg?url'
import signStronglyDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (4).svg?url'

/**
 * Positions tuned to reference: signs hang past screen edges; left column staggered
 * (top green most “in”, middle yellow most clipped, bottom red between). Right: top + bottom.
 */
export const JUBILEE_OPENER_SIGNS = [
  {
    key: 'strongly-agree',
    label: 'Strongly Agree',
    src: signStronglyAgree,
    className:
      'z-10 left-[-6%] top-[5%] w-[min(60vw,25rem)] sm:left-[-4%] sm:top-[7%] sm:w-[min(56vw,27rem)] md:left-[-3%] md:w-[min(52vw,29rem)] rotate-[10deg]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'z-10 left-[-24%] top-[36%] w-[min(58vw,24rem)] sm:left-[-20%] sm:top-[38%] sm:w-[min(54vw,26rem)] md:left-[-16%] md:w-[min(50vw,28rem)] -rotate-[5deg]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'z-10 left-[-14%] top-[64%] w-[min(60vw,25rem)] sm:left-[-11%] sm:top-[66%] sm:w-[min(56vw,27rem)] md:left-[-8%] md:w-[min(52vw,29rem)] rotate-[8deg]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'z-10 right-[-10%] top-[7%] w-[min(58vw,24rem)] sm:right-[-7%] sm:top-[9%] sm:w-[min(54vw,26rem)] md:right-[-5%] md:w-[min(50vw,28rem)] -rotate-[9deg]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'z-10 right-[-18%] top-[60%] w-[min(60vw,25rem)] sm:right-[-14%] sm:top-[62%] sm:w-[min(56vw,27rem)] md:right-[-10%] md:w-[min(52vw,29rem)] rotate-[9deg]',
  },
]
