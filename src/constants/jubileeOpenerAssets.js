/**
 * Five opinion paddles — order must match reference:
 * Left: Strongly Agree (green), Neutral (yellow), Disagree (red/orange)
 * Right: Agree (light green), Strongly Disagree (red)
 * Swap `import` lines if a file’s artwork doesn’t match its label.
 */
import signStronglyAgree from '../assets/IS GOD REAL (Business Card US Portrait).svg?url'
import signDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (1).svg?url'
import signNeutral from '../assets/IS GOD REAL (Business Card US Portrait) (2).svg?url'
import signAgree from '../assets/IS GOD REAL (Business Card US Portrait) (3).svg?url'
import signStronglyDisagree from '../assets/IS GOD REAL (Business Card US Portrait) (4).svg?url'

/** Vertical centers at ~22% / 50% / 78% (left), ~22% / 78% (right); arms past viewport. */
export const JUBILEE_OPENER_SIGNS = [
  {
    key: 'strongly-agree',
    label: 'Strongly Agree',
    src: signStronglyAgree,
    className:
      'origin-center left-[-6%] top-[22%] z-[12] w-[min(34vw,16rem)] -translate-y-1/2 rotate-[16deg] sm:left-[-4%] sm:w-[min(32vw,17rem)] md:w-[min(30vw,18rem)]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'origin-center left-[-16%] top-1/2 z-[12] w-[min(33vw,15.5rem)] -translate-y-1/2 rotate-[4deg] sm:left-[-12%] sm:w-[min(31vw,16.5rem)] md:left-[-9%] md:w-[min(29vw,17.5rem)]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'origin-center left-[-8%] top-[78%] z-[12] w-[min(34vw,16rem)] -translate-y-1/2 -rotate-[14deg] sm:left-[-5%] sm:w-[min(32vw,17rem)] md:w-[min(30vw,18rem)]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'origin-center right-[-6%] top-[22%] z-[12] w-[min(33vw,15.5rem)] -translate-y-1/2 -rotate-[14deg] sm:right-[-4%] sm:w-[min(31vw,16.5rem)] md:w-[min(29vw,17.5rem)]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'origin-center right-[-14%] top-[78%] z-[12] w-[min(34vw,16rem)] -translate-y-1/2 rotate-[14deg] sm:right-[-10%] sm:w-[min(32vw,17rem)] md:right-[-7%] md:w-[min(30vw,18rem)]',
  },
]
