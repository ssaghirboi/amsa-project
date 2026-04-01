import {
  clampPresentationSlideIndex,
  mergePresentationSlidesFromRemote,
} from '../constants/presentationSlides.js'
import {
  clampQaSlideIndex,
  mergeQaSlidesFromRemote,
} from '../constants/qaSlideshow.js'

const DEFAULT_SCHEMA = 'public'

/** Set after fetch: DB has `prompt_sequence` column. */
let promptSequenceColumnAvailable = null
/** Set after fetch: DB has slideshow columns. */
let slideshowColumnsAvailable = null
/** Set after fetch: DB has panelist icon URL columns. */
let panelistIconsColumnsAvailable = null
/** Set after fetch: DB has `presentation_slides` column. */
let presentationSlidesColumnsAvailable = null
/** Set after fetch: DB has `mc_questions` column. */
let mcQuestionsColumnsAvailable = null
/** Set after fetch: DB has `qa_slideshow_active` column. */
let qaSlideshowColumnAvailable = null
/** Set after fetch: DB has `qa_slideshow_index` column. */
let qaSlideshowIndexColumnAvailable = null
/** Set after fetch: DB has `qa_slideshow_slides` column. */
let qaSlideshowSlidesColumnAvailable = null
/** Set after fetch: DB has `debate_reveal_ack` (admin pressed Reveal on big screen flow). */
let debateRevealAckColumnAvailable = null
/** Set after fetch: DB has `mc_slide_notes` (MC notes per slide, synced). */
let mcSlideNotesColumnAvailable = null

const SELECT_BASE =
  'id,current_prompt,panelist_1_pos,panelist_2_pos,panelist_3_pos,panelist_4_pos'

const PANELIST_ICON_COLUMNS = [
  'panelist_1_icon_url',
  'panelist_2_icon_url',
  'panelist_3_icon_url',
  'panelist_4_icon_url',
]

const PANELIST_ICON_COLUMNS_SELECT = PANELIST_ICON_COLUMNS.join(',')

const SELECT_VARIANTS = [
  // With MC notes + debate reveal + full Q&A (add columns in Supabase if missing)
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions,qa_slideshow_active,qa_slideshow_index,qa_slideshow_slides,debate_reveal_ack,mc_slide_notes`,
  // With MC + Q&A slideshow + per-slide copy + debate reveal (add columns in Supabase if missing)
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions,qa_slideshow_active,qa_slideshow_index,qa_slideshow_slides,debate_reveal_ack`,
  // With MC + Q&A slideshow columns (add columns in Supabase if missing)
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions,qa_slideshow_active,qa_slideshow_index`,
  // With MC question picks + Q&A slideshow flag (add column in Supabase if missing)
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions,qa_slideshow_active`,
  // With MC question picks
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,mc_questions`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,mc_questions`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},slideshow_active,slideshow_index,presentation_slides,mc_questions`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},slideshow_active,slideshow_index,mc_questions`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},mc_questions`,
  `${SELECT_BASE},prompt_sequence,slideshow_active,slideshow_index,presentation_slides,mc_questions`,
  `${SELECT_BASE},prompt_sequence,slideshow_active,slideshow_index,mc_questions`,
  `${SELECT_BASE},prompt_sequence,mc_questions`,
  `${SELECT_BASE},slideshow_active,slideshow_index,presentation_slides,mc_questions`,
  `${SELECT_BASE},slideshow_active,slideshow_index,mc_questions`,
  `${SELECT_BASE},mc_questions`,
  // With presentation_slides + panelist icons + slideshow
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index,presentation_slides`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},slideshow_active,slideshow_index,presentation_slides`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},slideshow_active,slideshow_index`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT}`,
  `${SELECT_BASE},prompt_sequence,slideshow_active,slideshow_index,presentation_slides`,
  `${SELECT_BASE},prompt_sequence,slideshow_active,slideshow_index`,
  `${SELECT_BASE},prompt_sequence`,
  `${SELECT_BASE},slideshow_active,slideshow_index,presentation_slides`,
  `${SELECT_BASE},slideshow_active,slideshow_index`,
  SELECT_BASE,
]

function isMissingColumnError(error) {
  if (!error) return false
  const code = error.code
  if (code === '42703') return true
  const msg = String(error.message || '')
  return /does not exist/i.test(msg) && /column/i.test(msg)
}

function isMissingPromptSequenceColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /prompt_sequence/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingSlideshowColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /(slideshow_active|slideshow_index)/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingPresentationSlidesColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /presentation_slides/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingMcQuestionsColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /mc_questions/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingQaSlideshowColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /qa_slideshow_active/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingQaSlideshowIndexColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /qa_slideshow_index/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingQaSlideshowSlidesColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /qa_slideshow_slides/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingDebateRevealAckColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /debate_reveal_ack/i.test(msg) && /does not exist/i.test(msg)
}

function isMissingMcSlideNotesColumnError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return /mc_slide_notes/i.test(msg) && /does not exist/i.test(msg)
}

/** `false` after fetch detected no `prompt_sequence` column. */
export function shouldPromptSequenceMigrate() {
  return promptSequenceColumnAvailable === false
}

/** `false` after fetch detected no slideshow columns. */
export function shouldSlideshowMigrate() {
  return slideshowColumnsAvailable === false
}

/** `false` after fetch detected no panelist icon URL columns. */
export function shouldPanelistIconsMigrate() {
  return panelistIconsColumnsAvailable === false
}

/** `false` after fetch detected no `presentation_slides` column. */
export function shouldPresentationSlidesMigrate() {
  return presentationSlidesColumnsAvailable === false
}

/** `false` after fetch detected no `mc_questions` column. */
export function shouldMcQuestionsMigrate() {
  return mcQuestionsColumnsAvailable === false
}

/** `false` after fetch detected no `qa_slideshow_active` column. */
export function shouldQaSlideshowMigrate() {
  return qaSlideshowColumnAvailable === false
}

/** `false` after fetch detected no `qa_slideshow_index` column. */
export function shouldQaSlideshowIndexMigrate() {
  return qaSlideshowIndexColumnAvailable === false
}

/** `false` after fetch detected no `qa_slideshow_slides` column. */
export function shouldQaSlideshowSlidesMigrate() {
  return qaSlideshowSlidesColumnAvailable === false
}

/** `false` after fetch detected no `debate_reveal_ack` column. */
export function shouldDebateRevealAckMigrate() {
  return debateRevealAckColumnAvailable === false
}

/** `false` after fetch detected no `mc_slide_notes` column. */
export function shouldMcSlideNotesMigrate() {
  return mcSlideNotesColumnAvailable === false
}

/** Only merge `presentationSlides` from Supabase when the column exists (avoids wiping local edits). */
export function shouldSyncPresentationSlidesFromRemote() {
  return presentationSlidesColumnsAvailable === true
}

/** Only merge `qaSlideshowSlides` from Supabase when the column exists. */
export function shouldSyncQaSlidesFromRemote() {
  return qaSlideshowSlidesColumnAvailable === true
}

// Matches your provided SQL:
// - event_state has one row with `id = 1`
// - current_prompt column name
// - panelist_{1..4}_pos columns with values 1..5
const EVENT_STATE_ID = 1

const PANEL_POS_COLUMNS = [
  'panelist_1_pos',
  'panelist_2_pos',
  'panelist_3_pos',
  'panelist_4_pos',
]

/** Default slideshow when `prompt_sequence` is null or empty in DB. */
export const DEFAULT_PROMPT_SEQUENCE = [
  'Does God Exist?',
  'Religion is Good.',
  'Faith and reason can coexist.',
  'Morality requires religion.',
]

function normalizePromptSequence(raw) {
  if (raw == null) return null
  let arr = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr.map((s) => String(s))
}

function clampPos(value) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(5, Math.round(n)))
}

function normalizeMcSlideNotes(raw) {
  if (raw == null) return {}
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return {}
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === 'string' && k.length > 0) {
      out[k] = v == null ? '' : String(v)
    }
  }
  return out
}

export function deriveEventStateFromRow(row) {
  if (!row) return null

  const prompt = row.current_prompt ?? ''
  const panelists = PANEL_POS_COLUMNS.map((col) => clampPos(row[col]))
  const panelistIcons = PANELIST_ICON_COLUMNS.map((col) => row[col] ?? null)
  const fromDb = normalizePromptSequence(row.prompt_sequence)
  const promptSequence = fromDb ?? DEFAULT_PROMPT_SEQUENCE

  const slideshowActive = row.slideshow_active === true
  const slideshowIndex = clampPresentationSlideIndex(row.slideshow_index ?? 0)
  const qaSlideshowActive = row.qa_slideshow_active === true
  const qaSlideshowIndex = clampQaSlideIndex(row.qa_slideshow_index ?? 0)
  const presentationSlides = mergePresentationSlidesFromRemote(row.presentation_slides)
  const qaSlideshowSlides = mergeQaSlidesFromRemote(row.qa_slideshow_slides)
  const mcQuestions = row.mc_questions ?? null
  const debateRevealAck = row.debate_reveal_ack === true
  const mcSlideNotes = normalizeMcSlideNotes(row.mc_slide_notes)
  const mcSlideNotesRemote =
    row != null && Object.prototype.hasOwnProperty.call(row, 'mc_slide_notes')

  return {
    prompt: String(prompt),
    panelists,
    panelistIcons,
    promptSequence,
    slideshowActive,
    slideshowIndex,
    qaSlideshowActive,
    qaSlideshowIndex,
    presentationSlides,
    qaSlideshowSlides,
    mcQuestions,
    debateRevealAck,
    mcSlideNotes,
    meta: {
      id: row.id,
      mcSlideNotesColumnAvailable: mcSlideNotesRemote,
    },
  }
}

export async function fetchCurrentEventState(supabase) {
  let lastError = null

  for (const cols of SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from('event_state')
      .select(cols)
      .eq('id', EVENT_STATE_ID)
      .maybeSingle()

    if (!error) {
      promptSequenceColumnAvailable = cols.includes('prompt_sequence')
      slideshowColumnsAvailable = cols.includes('slideshow_active')
      panelistIconsColumnsAvailable = cols.includes('panelist_1_icon_url')
      presentationSlidesColumnsAvailable = cols.includes('presentation_slides')
      mcQuestionsColumnsAvailable = cols.includes('mc_questions')
      qaSlideshowColumnAvailable = cols.includes('qa_slideshow_active')
      qaSlideshowIndexColumnAvailable = cols.includes('qa_slideshow_index')
      qaSlideshowSlidesColumnAvailable = cols.includes('qa_slideshow_slides')
      debateRevealAckColumnAvailable = cols.includes('debate_reveal_ack')
      mcSlideNotesColumnAvailable = cols.includes('mc_slide_notes')

      const row = Array.isArray(data) ? data[0] : data
      return (
        deriveEventStateFromRow(row) ?? {
          prompt: '',
          panelists: [3, 3, 3, 3],
          panelistIcons: [null, null, null, null],
          promptSequence: DEFAULT_PROMPT_SEQUENCE,
          slideshowActive: false,
          slideshowIndex: 0,
          qaSlideshowActive: false,
          qaSlideshowIndex: 0,
          presentationSlides: mergePresentationSlidesFromRemote(null),
          qaSlideshowSlides: mergeQaSlidesFromRemote(null),
          mcQuestions: null,
          debateRevealAck: false,
          mcSlideNotes: {},
          meta: { id: EVENT_STATE_ID, mcSlideNotesColumnAvailable: false },
        }
      )
    }

    if (!isMissingColumnError(error)) throw error
    lastError = error
  }

  throw lastError
}

export function subscribeToEventState(supabase, onUpdate) {
  const channel = supabase
    .channel('event_state_updates')
    .on(
      'postgres_changes',
      { event: '*', schema: DEFAULT_SCHEMA, table: 'event_state' },
      (payload) => {
        const row = payload.new ?? payload.old
        if (!row) return
        if (Number(row.id) !== EVENT_STATE_ID) return

        const derived = deriveEventStateFromRow(row)
        if (derived) onUpdate(derived)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function writeEventState(
  supabase,
  {
    prompt,
    panelists,
    panelistIcons,
    promptSequence,
    presentationSlides,
    qaSlideshowSlides,
    slideshowActive = false,
    slideshowIndex = 0,
    qaSlideshowActive = false,
    qaSlideshowIndex = 0,
    mcQuestions = null,
    /** Omit to leave DB value unchanged; `false` after prompt change; `true` when admin reveals debate table. */
    debateRevealAck,
    /** Omit to leave DB unchanged; object keyed e.g. `presentation:0`, `qa:1`. */
    mcSlideNotes,
  },
) {
  const sequence =
    Array.isArray(promptSequence) && promptSequence.length > 0
      ? promptSequence.map((s) => String(s))
      : DEFAULT_PROMPT_SEQUENCE

  const payload = {
    id: EVENT_STATE_ID,
    current_prompt: prompt,
    panelist_1_pos: panelists?.[0] ?? 3,
    panelist_2_pos: panelists?.[1] ?? 3,
    panelist_3_pos: panelists?.[2] ?? 3,
    panelist_4_pos: panelists?.[3] ?? 3,
  }

  if (panelistIconsColumnsAvailable !== false) {
    payload.panelist_1_icon_url = panelistIcons?.[0] ?? null
    payload.panelist_2_icon_url = panelistIcons?.[1] ?? null
    payload.panelist_3_icon_url = panelistIcons?.[2] ?? null
    payload.panelist_4_icon_url = panelistIcons?.[3] ?? null
  }

  if (promptSequenceColumnAvailable !== false) {
    payload.prompt_sequence = sequence
  }

  if (slideshowColumnsAvailable !== false) {
    payload.slideshow_active = Boolean(slideshowActive)
    payload.slideshow_index = clampPresentationSlideIndex(slideshowIndex)
  }

  if (qaSlideshowColumnAvailable !== false) {
    payload.qa_slideshow_active = Boolean(qaSlideshowActive)
  }

  if (qaSlideshowIndexColumnAvailable !== false) {
    payload.qa_slideshow_index = clampQaSlideIndex(qaSlideshowIndex)
  }

  if (presentationSlidesColumnsAvailable !== false) {
    payload.presentation_slides = mergePresentationSlidesFromRemote(presentationSlides)
  }

  if (qaSlideshowSlidesColumnAvailable !== false) {
    payload.qa_slideshow_slides = mergeQaSlidesFromRemote(qaSlideshowSlides)
  }

  if (mcQuestionsColumnsAvailable !== false) {
    payload.mc_questions = mcQuestions
  }

  if (debateRevealAckColumnAvailable !== false && debateRevealAck !== undefined) {
    payload.debate_reveal_ack = Boolean(debateRevealAck)
  }

  if (mcSlideNotesColumnAvailable !== false && mcSlideNotes !== undefined) {
    payload.mc_slide_notes = normalizeMcSlideNotes(mcSlideNotes)
  }

  let { error } = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })

  if (error && isMissingPromptSequenceColumnError(error) && promptSequenceColumnAvailable !== false) {
    promptSequenceColumnAvailable = false
    delete payload.prompt_sequence
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (error && isMissingSlideshowColumnError(error) && slideshowColumnsAvailable !== false) {
    slideshowColumnsAvailable = false
    delete payload.slideshow_active
    delete payload.slideshow_index
    const third = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = third.error
  }

  if (error && isMissingQaSlideshowColumnError(error) && qaSlideshowColumnAvailable !== false) {
    qaSlideshowColumnAvailable = false
    delete payload.qa_slideshow_active
    const qaRetry = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = qaRetry.error
  }

  if (error && isMissingQaSlideshowIndexColumnError(error) && qaSlideshowIndexColumnAvailable !== false) {
    qaSlideshowIndexColumnAvailable = false
    delete payload.qa_slideshow_index
    const qaIdxRetry = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = qaIdxRetry.error
  }

  if (error && isMissingMcQuestionsColumnError(error) && mcQuestionsColumnsAvailable !== false) {
    mcQuestionsColumnsAvailable = false
    delete payload.mc_questions
    const next = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = next.error
  }

  // If icon columns are missing, retry without them.
  if (
    error &&
    /panelist_[1-4]_icon_url/i.test(String(error.message || '')) &&
    /does not exist/i.test(String(error.message || '')) &&
    panelistIconsColumnsAvailable !== false
  ) {
    panelistIconsColumnsAvailable = false
    delete payload.panelist_1_icon_url
    delete payload.panelist_2_icon_url
    delete payload.panelist_3_icon_url
    delete payload.panelist_4_icon_url
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (
    error &&
    isMissingPresentationSlidesColumnError(error) &&
    presentationSlidesColumnsAvailable !== false
  ) {
    presentationSlidesColumnsAvailable = false
    delete payload.presentation_slides
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (
    error &&
    isMissingQaSlideshowSlidesColumnError(error) &&
    qaSlideshowSlidesColumnAvailable !== false
  ) {
    qaSlideshowSlidesColumnAvailable = false
    delete payload.qa_slideshow_slides
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (
    error &&
    isMissingDebateRevealAckColumnError(error) &&
    debateRevealAckColumnAvailable !== false
  ) {
    debateRevealAckColumnAvailable = false
    delete payload.debate_reveal_ack
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (
    error &&
    isMissingMcSlideNotesColumnError(error) &&
    mcSlideNotesColumnAvailable !== false
  ) {
    mcSlideNotesColumnAvailable = false
    delete payload.mc_slide_notes
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (error) throw error
}
