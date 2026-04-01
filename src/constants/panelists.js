/**
 * Human-readable names for the four panelist slots.
 * DB / API still use keys "Panelist 1" … "Panelist 4" (see Audience insert, mc_questions).
 */
/** MC console only — shorter legacy labels. */
export const PANELIST_DISPLAY_NAMES_MC = [
  'Logan Johnson (Christian)',
  'Attaul Wahab (Muslim)',
  'Anil Gupta (Hindu)',
  'Roy Alexander (Atheist)',
]

/** Admin, Big Screen, Ask, Audience, etc. */
export const PANELIST_DISPLAY_NAMES = [
  'Logan Johnson (Pentecostal Christian)',
  'Attaul Wahab (Ahmadi Muslim)',
  'Anil Gupta (Advaita Hindu)',
  'Roy Alexander (Atheist/Agnostic)',
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

/** Audience Q&A mode (admin Q&A slideshow on): unlimited queue keyed to General / Panelist N. */
export function normalizeQaAudienceQueue(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const target =
      item.target_key != null && String(item.target_key).trim()
        ? String(item.target_key).trim()
        : GENERAL_TARGET_KEY
    out.push({
      id: item.id ?? null,
      question_text: String(item.question_text ?? ''),
      created_at: item.created_at ?? null,
      prompt: item.prompt ?? null,
      target_key: target,
    })
  }
  return out
}

/** Same question appearing twice in queue only when id matches or full fallback match. */
export function audienceQueueItemsMatch(a, b) {
  if (!a || !b) return false
  if (a.id != null && b.id != null) return String(a.id) === String(b.id)
  if (a.id != null || b.id != null) return false
  return (
    String(a.question_text ?? '') === String(b.question_text ?? '') &&
    String(a.created_at ?? '') === String(b.created_at ?? '') &&
    String(a.target_key ?? '') === String(b.target_key ?? '')
  )
}

export function displayNameForMcTarget(targetKey) {
  const k = String(targetKey ?? '').trim()
  if (k === GENERAL_TARGET_KEY) return 'General'
  const m = k.match(/^Panelist\s*(\d)$/i)
  if (m) {
    const i = Number(m[1]) - 1
    if (i >= 0 && i < PANELIST_DISPLAY_NAMES_MC.length) return PANELIST_DISPLAY_NAMES_MC[i]
  }
  return k || 'General'
}
