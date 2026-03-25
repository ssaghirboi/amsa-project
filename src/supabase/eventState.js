const DEFAULT_SCHEMA = 'public'

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
  const { data, error } = await supabase
    .from('event_state')
    .select(
      'id,current_prompt,panelist_1_pos,panelist_2_pos,panelist_3_pos,panelist_4_pos,prompt_sequence',
    )
    .eq('id', EVENT_STATE_ID)
    .maybeSingle()

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
    prompt_sequence: sequence,
  }

  const { error } = await supabase
    .from('event_state')
    .upsert(payload, { onConflict: 'id' })

  if (error) throw error
}

