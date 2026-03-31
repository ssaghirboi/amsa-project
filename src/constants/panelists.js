/**
 * Human-readable names for the four panelist slots.
 * DB / API still use keys "Panelist 1" … "Panelist 4" (see Audience insert, mc_questions).
 */
export const PANELIST_DISPLAY_NAMES = [
  'Logan Johnson (Christian)',
  'Attaul Wahab (Muslim)',
  'Anil Gupta (Hindu)',
  'Roy Alexander (Atheist)',
]

/** Stored in `questions.target_panelist` and `mc_questions.panelists` for non-directed submissions. */
export const GENERAL_TARGET_KEY = 'General'

/** Keys for the four named panelists + General (MC / questions UI). */
export function getEmptyMcQuestionSlots() {
  return {
    [GENERAL_TARGET_KEY]: null,
    'Panelist 1': null,
    'Panelist 2': null,
    'Panelist 3': null,
    'Panelist 4': null,
  }
}
