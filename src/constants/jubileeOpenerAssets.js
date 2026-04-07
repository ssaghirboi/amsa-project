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
      'left-[2%] top-[4%] w-[min(52vw,20rem)] sm:left-[4%] sm:w-[min(46vw,22rem)] md:left-[5%] md:w-[min(42vw,24rem)] rotate-[13deg]',
  },
  {
    key: 'disagree',
    label: 'Disagree',
    src: signDisagree,
    className:
      'left-[0%] top-[30%] w-[min(48vw,18.5rem)] sm:left-[3%] sm:w-[min(42vw,20rem)] md:left-[4%] md:w-[min(38vw,22rem)] -rotate-[7deg]',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    src: signNeutral,
    className:
      'left-[3%] top-[56%] w-[min(50vw,19.5rem)] sm:left-[5%] sm:w-[min(44vw,21rem)] md:left-[6%] md:w-[min(40vw,23rem)] rotate-[5deg]',
  },
  {
    key: 'agree',
    label: 'Agree',
    src: signAgree,
    className:
      'right-[2%] top-[8%] w-[min(46vw,18rem)] sm:right-[4%] sm:w-[min(40vw,19rem)] md:right-[5%] md:w-[min(36vw,21rem)] -rotate-[11deg]',
  },
  {
    key: 'strongly-disagree',
    label: 'Strongly Disagree',
    src: signStronglyDisagree,
    className:
      'right-[0%] top-[46%] w-[min(50vw,20rem)] sm:right-[3%] sm:w-[min(44vw,22rem)] md:right-[4%] md:w-[min(40vw,24rem)] rotate-[11deg]',
  },
]
