/**
 * Opinion-hand SVGs — left: Strongly Agree → Neutral → Disagree; right: Agree → Strongly Disagree.
 * Swap import lines if colors don’t match labels.
 */
import signStronglyAgree from '../assets/IS GOD REAL (Business Card US Portrait).svg?url'
import signDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (1).svg?url'
import signNeutral from '../assets/IS GOD REAL (Business Card US Portrait) (2).svg?url'
import signAgree from '../assets/IS GOD REAL (Business Card US Portrait) (3).svg?url'
import signStronglyDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (4).svg?url'

/**
 * Reference layout: three evenly stepped on the left, two on the right (top / bottom),
 * arms past the viewport edge; slight arc framing the center title.
 */
export const JUBILEE_OPENER_SIGNS = [
  {
    key: 'strongly-agree',
    label: 'Strongly Agree',
    src: signStronglyAgree,
    className:
      'z-[15] left-[-12%] top-[6%] w-[min(36vw,17rem)] sm:left-[-8%] sm:top-[8%] sm:w-[min(34vw,18rem)] md:left-[-6%] md:w-[min(32vw,19rem)] rotate-[14deg]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'z-[15] left-[-22%] top-[38%] w-[min(35vw,16.5rem)] sm:left-[-18%] sm:top-[40%] sm:w-[min(33vw,17.5rem)] md:left-[-14%] md:w-[min(31vw,18.5rem)] rotate-[2deg]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'z-[15] left-[-14%] top-[68%] w-[min(36vw,17rem)] sm:left-[-10%] sm:top-[70%] sm:w-[min(34vw,18rem)] md:left-[-7%] md:w-[min(32vw,19rem)] -rotate-[11deg]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'z-[15] right-[-12%] top-[8%] w-[min(35vw,16.5rem)] sm:right-[-8%] sm:top-[10%] sm:w-[min(33vw,17.5rem)] md:right-[-6%] md:w-[min(31vw,18.5rem)] -rotate-[12deg]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'z-[15] right-[-20%] top-[64%] w-[min(36vw,17rem)] sm:right-[-14%] sm:top-[66%] sm:w-[min(34vw,18rem)] md:right-[-10%] md:w-[min(32vw,19rem)] rotate-[12deg]',
  },
]
