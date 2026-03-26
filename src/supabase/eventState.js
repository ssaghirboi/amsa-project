import { clampPresentationSlideIndex } from '../constants/presentationSlides.js'

const DEFAULT_SCHEMA = 'public'

/** Set after fetch: DB has `prompt_sequence` column. */
let promptSequenceColumnAvailable = null
/** Set after fetch: DB has slideshow columns. */
let slideshowColumnsAvailable = null
/** Set after fetch: DB has panelist icon URL columns. */
let panelistIconsColumnsAvailable = null

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
  // With panelist icon URL columns
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence,slideshow_active,slideshow_index`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},prompt_sequence`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT},slideshow_active,slideshow_index`,
  `${SELECT_BASE},${PANELIST_ICON_COLUMNS_SELECT}`,
  // Without panelist icon URL columns (backwards compatible)
  `${SELECT_BASE},prompt_sequence,slideshow_active,slideshow_index`,
  `${SELECT_BASE},prompt_sequence`,
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

export function deriveEventStateFromRow(row) {
  if (!row) return null

  const prompt = row.current_prompt ?? ''
  const panelists = PANEL_POS_COLUMNS.map((col) => clampPos(row[col]))
  const panelistIcons = PANELIST_ICON_COLUMNS.map((col) => row[col] ?? null)
  const fromDb = normalizePromptSequence(row.prompt_sequence)
  const promptSequence = fromDb ?? DEFAULT_PROMPT_SEQUENCE

  const slideshowActive = row.slideshow_active === true
  const slideshowIndex = clampPresentationSlideIndex(row.slideshow_index ?? 0)

  return {
    prompt: String(prompt),
    panelists,
    panelistIcons,
    promptSequence,
    slideshowActive,
    slideshowIndex,
    meta: {
      id: row.id,
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

      const row = Array.isArray(data) ? data[0] : data
      return (
        deriveEventStateFromRow(row) ?? {
          prompt: '',
          panelists: [3, 3, 3, 3],
            panelistIcons: [null, null, null, null],
          promptSequence: DEFAULT_PROMPT_SEQUENCE,
          slideshowActive: false,
          slideshowIndex: 0,
          meta: { id: EVENT_STATE_ID },
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
  { prompt, panelists, panelistIcons, promptSequence, slideshowActive = false, slideshowIndex = 0 },
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

  if (error) throw error
}
