const DEFAULT_SCHEMA = 'public'

/** Set after first fetch/write: DB has `prompt_sequence` column (run migration if false). */
let promptSequenceColumnAvailable = null

const SELECT_BASE =
  'id,current_prompt,panelist_1_pos,panelist_2_pos,panelist_3_pos,panelist_4_pos'
const SELECT_FULL = `${SELECT_BASE},prompt_sequence`

function isMissingPromptSequenceColumnError(error) {
  if (!error) return false
  const code = error.code
  if (code === '42703') return true // PostgreSQL undefined_column
  const msg = String(error.message || '')
  return /prompt_sequence/i.test(msg) && /does not exist/i.test(msg)
}

/** `false` after a fetch/write detected no `prompt_sequence` column — run SQL migration to persist the slideshow list. */
export function shouldPromptSequenceMigrate() {
  return promptSequenceColumnAvailable === false
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
  // Your SQL comment says 1..5
  return Math.max(1, Math.min(5, Math.round(n)))
}

export function deriveEventStateFromRow(row) {
  if (!row) return null

  const prompt = row.current_prompt ?? ''
  const panelists = PANEL_POS_COLUMNS.map((col) => clampPos(row[col]))
  const fromDb = normalizePromptSequence(row.prompt_sequence)
  const promptSequence = fromDb ?? DEFAULT_PROMPT_SEQUENCE

  return {
    prompt: String(prompt),
    panelists,
    promptSequence,
    meta: {
      id: row.id,
    },
  }
}

export async function fetchCurrentEventState(supabase) {
  let res = await supabase
    .from('event_state')
    .select(SELECT_FULL)
    .eq('id', EVENT_STATE_ID)
    .maybeSingle()

  if (res.error && isMissingPromptSequenceColumnError(res.error)) {
    promptSequenceColumnAvailable = false
    res = await supabase
      .from('event_state')
      .select(SELECT_BASE)
      .eq('id', EVENT_STATE_ID)
      .maybeSingle()
  } else if (!res.error) {
    promptSequenceColumnAvailable = true
  }

  const { data, error } = res
  if (error) throw error

  // If the row somehow doesn't exist, fall back to defaults.
  const row = Array.isArray(data) ? data[0] : data
  return (
    deriveEventStateFromRow(row) ?? {
      prompt: '',
      panelists: [3, 3, 3, 3],
      promptSequence: DEFAULT_PROMPT_SEQUENCE,
      meta: { id: EVENT_STATE_ID },
    }
  )
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
        // Realtime payloads can return numeric IDs as strings depending on transport.
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

export async function writeEventState(supabase, { prompt, panelists, promptSequence }) {
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

  if (promptSequenceColumnAvailable !== false) {
    payload.prompt_sequence = sequence
  }

  let { error } = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })

  if (error && isMissingPromptSequenceColumnError(error) && promptSequenceColumnAvailable !== false) {
    promptSequenceColumnAvailable = false
    delete payload.prompt_sequence
    const second = await supabase.from('event_state').upsert(payload, { onConflict: 'id' })
    error = second.error
  }

  if (error) throw error
}

