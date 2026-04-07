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

export const JUBILEE_OPENER_SIGNS = [
  {
    key: 'strongly-agree',
    label: 'Strongly Agree',
    src: signStronglyAgree,
    className:
      'left-[-6%] top-[4%] w-[min(54vw,21rem)] sm:left-[-4%] sm:w-[min(48vw,23rem)] md:w-[min(44vw,25rem)] rotate-[13deg]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'left-[-14%] top-[30%] w-[min(50vw,19rem)] sm:left-[-10%] sm:w-[min(44vw,21rem)] md:w-[min(40vw,23rem)] -rotate-[7deg]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'left-[-8%] top-[56%] w-[min(52vw,20rem)] sm:left-[-5%] sm:w-[min(46vw,22rem)] md:w-[min(42vw,24rem)] rotate-[5deg]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'right-[-8%] top-[8%] w-[min(48vw,18.5rem)] sm:right-[-5%] sm:w-[min(42vw,20rem)] md:w-[min(38vw,22rem)] -rotate-[11deg]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'right-[-14%] top-[46%] w-[min(54vw,21rem)] sm:right-[-8%] sm:w-[min(48vw,23rem)] md:w-[min(44vw,25rem)] rotate-[11deg]',
  },
]
