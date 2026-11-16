/**
 * Data contract v0.2 as Zod schemas + TypeScript types.
 *
 * Follows Sponsor Deliverables v1.2 (29 Oct 2026) and Scope Letter Amendment 1:
 * - TranscriptIn is the sponsor's canonical transcript schema 1.0 (deliv s8): raw turns,
 *   agent / caller, millisecond timings, change goal and node events.
 * - ScoredSession codes volleys, not turns (deliv s4): consecutive agent turns, and agent turns
 *   split only by a caller back-channel ("yeah", "mm"), are one volley.
 * - There is no pass / fail gate (Amendment 1 s1). A session has a scoreability state (deliv s5),
 *   measures are compared with the sponsor's thresholds, and `issues` are the issue-log rows
 *   (deliv s10): exactly the 16 sponsor columns, no severity, ranking or recommendation.
 *
 * Mirrors shared/schema/*.schema.json and docs/DATA_CONTRACT.md. If you change a field, bump
 * schema_version and update the JSON Schema, this file and the sample data in the same PR.
 *
 * These schemas are a little more lenient than the JSON Schemas on purpose: unknown fields are
 * ignored (so newer pipeline output still opens), and measure / global ids are free strings.
 */
import { z } from 'zod'

/** ScoredSession version this page reads. */
export const SUPPORTED_SCHEMA_VERSION = '0.2'
/** The sponsor's canonical transcript version (deliv s8). */
export const TRANSCRIPT_SCHEMA_VERSION = '1.0'

export const PROVENANCES = ['real', 'simulated', 'reference_corpus', 'internal_test'] as const
/** deliv s8 names three sources; `other` is ours, for text pasted into the page. */
export const SOURCES = ['aven_staff_call', 'annomi', 'casaa', 'other'] as const
export const SPEAKERS = ['agent', 'caller'] as const
export const CHANNELS = ['voice', 'text'] as const
export const CHANGE_GOAL_STATES = ['behavior', 'no_goal_reached', 'decision'] as const
export const EVENT_TYPES = ['node_transition', 'tool_call'] as const

/** MITI 4.2.1 behavior codes, spelled as the scorer writes them. */
export const CODES = ['Q', 'SR', 'CR', 'GI', 'AF', 'SEEK', 'EMPH', 'PWP', 'PERSUADE', 'CONFRONT'] as const
export const QUESTION_SUBTYPES = ['open', 'closed', 'unknown'] as const
export const CLIENT_TALK = ['change', 'sustain', 'neutral'] as const

/** deliv s5. `not_scoreable` sessions carry no measures, flags or issues. */
export const SCOREABILITY = ['full', 'counts_only', 'outside_instrument', 'not_scoreable'] as const
/**
 * meets / below: compared with a sponsor threshold.
 * reported: the sponsor set no threshold (R:Q, caller change-talk ratio, MI-Adherent).
 * insufficient_data: too little to compute (for example under 10 agent volleys).
 * not_rated: not rated for this scoreability state (technical global on counts_only, text calls).
 */
export const MEASURE_STATUSES = ['meets', 'below', 'reported', 'insufficient_data', 'not_rated'] as const
export const THRESHOLD_OPS = ['>=', '<=', '==', '>', '<'] as const

/** deliv s7, Table D. */
export const TABLE_D_CODES = [
  'D1_clinical_advice',
  'D2_health_prescription',
  'D3_fabrication',
  'D4_identity',
  'D5_professional_advice',
  'D6_promises',
  'D7_privacy',
] as const

/** deliv s10: an entry is raised for exactly these three things. */
export const ENTRY_TYPES = ['MEASURE', 'TABLE_C', 'TABLE_D'] as const
/** deliv s10: a not_scoreable session never produces an entry, so it is not a column value. */
export const ENTRY_SCOREABILITY = ['full', 'counts_only', 'outside_instrument'] as const

export type Provenance = (typeof PROVENANCES)[number]
export type Source = (typeof SOURCES)[number]
export type Speaker = (typeof SPEAKERS)[number]
export type Code = (typeof CODES)[number]
export type QuestionSubtype = (typeof QUESTION_SUBTYPES)[number]
export type ClientTalk = (typeof CLIENT_TALK)[number]
export type Scoreability = (typeof SCOREABILITY)[number]
export type MeasureStatus = (typeof MEASURE_STATUSES)[number]
export type TableDCode = (typeof TABLE_D_CODES)[number]
export type EntryType = (typeof ENTRY_TYPES)[number]

const count = z.number().int().min(0)
const turnNumber = z.number().int().min(1)
const volleyNumber = z.number().int().min(1)
const ms = z.number().min(0).nullable()

// ---------------------------------------------------------------- TranscriptIn (canonical 1.0)

export const ChangeGoalSchema = z.object({
  text: z.string().nullable(),
  state: z.enum(CHANGE_GOAL_STATES),
})

export const TranscriptTurnSchema = z.object({
  turn: turnNumber,
  speaker: z.enum(SPEAKERS),
  text: z.string(),
  start_ms: ms,
  end_ms: ms,
  node: z.string().nullable(),
})

/** Node transitions and tool calls: metadata, never coded (deliv s8). */
export const TranscriptEventSchema = z.object({
  before_turn: turnNumber,
  type: z.enum(EVENT_TYPES),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
})

const sessionTop = {
  session_id: z.string().min(1),
  /** Team field, not in the sponsor schema: true on every invented file. */
  is_mock: z.boolean().default(false),
  provenance: z.enum(PROVENANCES),
  source: z.enum(SOURCES),
  aven_version: z.string().nullable(),
  channel: z.enum(CHANNELS),
  duration_sec: z.number().min(0).nullable(),
  change_goal: ChangeGoalSchema,
  target_behavior: z.string().nullable(),
}

export const TranscriptInSchema = z.object({
  schema_version: z.string(),
  ...sessionTop,
  turns: z.array(TranscriptTurnSchema).min(1),
  events: z.array(TranscriptEventSchema).default([]),
})

// ---------------------------------------------------------------- ScoredSession

export const CodeAssignmentSchema = z.object({
  code: z.enum(CODES),
  /** Set for Q only; null for every other code. */
  question_subtype: z.enum(QUESTION_SUBTYPES).nullable(),
  /** Must be an exact substring of the volley text. */
  evidence_quote: z.string(),
  rationale: z.string(),
  /** false when the quote is not found verbatim in the volley; the page asks a person to check it. */
  evidence_valid: z.boolean(),
})

/** A raw turn as transcribed, with the volley it belongs to. */
export const ScoredTurnSchema = TranscriptTurnSchema.extend({
  volley: volleyNumber,
  /** A caller back-channel folded into the surrounding agent volley (deliv s4). */
  back_channel: z.boolean(),
})

export const VolleySchema = z.object({
  volley: volleyNumber,
  speaker: z.enum(SPEAKERS),
  turn_start: turnNumber,
  turn_end: turnNumber,
  /** Caller back-channel turns inside this agent volley. They are shown, never coded. */
  absorbed_turns: z.array(turnNumber),
  /** The volley's own turns joined with a space; absorbed back-channels are not in it. */
  text: z.string(),
  /** Every node live during the volley, first-seen order; [] for corpora. */
  nodes: z.array(z.string()),
  excluded: z.boolean(),
  /** Why it was not coded, e.g. "Greeting" or "Safety node (safety_response)". */
  exclusion_reason: z.string().nullable(),
  /** Agent volleys; [] for caller volleys and excluded volleys. */
  codes: z.array(CodeAssignmentSchema),
  /** Caller volleys; null for agent volleys and excluded volleys. */
  client_talk: z.enum(CLIENT_TALK).nullable(),
  client_evidence_quote: z.string().nullable(),
})

export const ThresholdSchema = z.object({
  op: z.enum(THRESHOLD_OPS),
  value: z.number(),
  source: z.string(),
})

export const MeasureSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number().nullable(),
  n: count,
  formula: z.string(),
  threshold: ThresholdSchema.nullable(),
  status: z.enum(MEASURE_STATUSES),
  /** Short plain-English note, e.g. "Can fail a session on review; never passes one." */
  note: z.string().nullable(),
})

export const GlobalRatingSchema = z.object({
  id: z.string(),
  score: z.number().int().min(1).max(5),
  cited_turns: z.array(turnNumber),
  rationale: z.string(),
})

/** A span of agent volleys used by the Table C flags. */
export const VolleySpanSchema = z.object({
  start_volley: volleyNumber,
  end_volley: volleyNumber,
  turn_start: turnNumber,
  turn_end: turnNumber,
  nodes: z.array(z.string()),
})

export const RqWindowSchema = VolleySpanSchema.extend({
  reflections: count,
  questions: count,
  /** null when the window has no questions. */
  rq: z.number().nullable(),
})

/** deliv s6. Computed by code from the volley codes; no model judgment. */
export const TableCSchema = z.object({
  /** C1: longest run of reflective agent volleys with no question. */
  c1_reflection_run: z.object({
    length: count,
    cap: count,
    /** null when the session has no reflections. */
    span: VolleySpanSchema.nullable(),
    breach: z.boolean(),
  }),
  /** C2: R:Q over a rolling window of agent volleys. */
  c2_windowed_rq: z.object({
    window_size: z.number().int().min(1),
    windows: z.array(RqWindowSchema),
    /** Highest R:Q (a window with no questions counts as highest). */
    worst_over_following: RqWindowSchema.nullable(),
    /** Lowest R:Q (a window with no reflections counts as lowest). */
    worst_interrogation: RqWindowSchema.nullable(),
    breach_no_questions: z.boolean(),
    breach_no_reflections: z.boolean(),
  }),
})

/** One Table D hit (deliv s7). Every hit is also an issue-log row. */
export const TableDHitSchema = z.object({
  code: z.enum(TABLE_D_CODES),
  volley: volleyNumber,
  turn_start: turnNumber,
  turn_end: turnNumber,
  node: z.string().nullable(),
  evidence_quote: z.string(),
  rationale: z.string(),
  /** D1 and D7 always; D3 when the invented fact is clinical. Each is read individually. */
  clinician_review: z.boolean(),
})

/** One issue-log row: exactly the sponsor's 16 columns (deliv s10), in order. */
export const IssueLogEntrySchema = z.object({
  entry_id: z.string().min(1),
  run_id: z.string().min(1),
  session_id: z.string().min(1),
  provenance: z.enum(PROVENANCES),
  aven_version: z.string().nullable(),
  scorer_prompt_version: z.string(),
  scorer_model: z.string(),
  entry_type: z.enum(ENTRY_TYPES),
  /** The measure id, flag (C1_reflection_run, C2_window_no_questions, C2_window_no_reflections) or Table D code. */
  item: z.string().min(1),
  /** Empty (null) for TABLE_D. */
  observed: z.string().nullable(),
  threshold: z.string().nullable(),
  scoreability: z.enum(ENTRY_SCOREABILITY),
  /** An entry without turn numbers is not accepted (deliv s10). */
  turn_start: turnNumber,
  turn_end: turnNumber,
  /** Nodes live across the span, ";"-joined; null for corpora. */
  node_active: z.string().nullable(),
  /** The agent words, quoted verbatim. */
  evidence: z.string(),
})

/** The column order the CSV download uses. */
export const ISSUE_LOG_COLUMNS = [
  'entry_id',
  'run_id',
  'session_id',
  'provenance',
  'aven_version',
  'scorer_prompt_version',
  'scorer_model',
  'entry_type',
  'item',
  'observed',
  'threshold',
  'scoreability',
  'turn_start',
  'turn_end',
  'node_active',
  'evidence',
] as const

export const ScorerSchema = z.object({
  run_id: z.string(),
  scored_at: z.string(),
  /** e.g. { volley_coder: "volley-coder-v0.5", globals: "...", prohibited: "..." } */
  prompt_versions: z.record(z.string(), z.string()),
  model: z.string(),
  cost_usd: z.number().min(0),
})

export const ScoredSessionSchema = z.object({
  schema_version: z.string(),
  ...sessionTop,
  scorer: ScorerSchema,
  scoreability: z.object({
    state: z.enum(SCOREABILITY),
    reason: z.string(),
    agent_volleys: count,
  }),
  turns: z.array(ScoredTurnSchema).min(1),
  volleys: z.array(VolleySchema).min(1),
  /** Codes counted over coded (non-excluded) agent volleys. */
  counts: z.record(z.enum(CODES), count),
  question_counts: z.record(z.enum(QUESTION_SUBTYPES), count),
  client_talk_counts: z.record(z.enum(CLIENT_TALK), count),
  measures: z.array(MeasureSchema),
  /** [] when the globals are not rated (text calls, outside_instrument, not_scoreable). */
  globals: z.array(GlobalRatingSchema),
  /** null on not_scoreable sessions. */
  table_c: TableCSchema.nullable(),
  table_d: z.array(TableDHitSchema),
  /** Agent volleys spoken in safety_response: excluded from every count, listed here (deliv s4). */
  safety_volleys: z.array(volleyNumber),
  /** The issue-log rows for this session. */
  issues: z.array(IssueLogEntrySchema),
})

// ------------------------------------------------------------ ValidationReport

const agreementRow = {
  metric: z.string(),
  scorer_vs_human: z.number().nullable(),
  human_vs_human: z.number().nullable(),
  n: count,
}

export const ValidationReportSchema = z.object({
  schema_version: z.string(),
  is_mock: z.boolean(),
  run_id: z.string(),
  generated_at: z.string().optional(),
  split: z.enum(['dev', 'heldout']),
  n_sessions: count,
  code_agreement: z.array(z.object({ code: z.enum(CODES), ...agreementRow })),
  measure_agreement: z.array(z.object({ measure: z.string(), ...agreementRow })),
  discriminant: z.object({
    description: z.string(),
    high_mi_mean: z.number().nullable(),
    low_mi_mean: z.number().nullable(),
    p_value: z.number().nullable(),
  }),
  repeat_run: z.object({ n_runs: count, agreement: z.number().nullable() }),
  contamination_check: z.object({
    status: z.enum(['not_run', 'pass', 'concern']),
    notes: z.string(),
  }),
})

// ------------------------------------------------------------------ Thresholds

export const ThresholdsFileSchema = z.object({ _status: z.string() }).catchall(ThresholdSchema)

// ----------------------------------------------------------------------- Types

export type ChangeGoal = z.infer<typeof ChangeGoalSchema>
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>
export type TranscriptEvent = z.infer<typeof TranscriptEventSchema>
export type TranscriptIn = z.infer<typeof TranscriptInSchema>
export type CodeAssignment = z.infer<typeof CodeAssignmentSchema>
export type ScoredTurn = z.infer<typeof ScoredTurnSchema>
export type Volley = z.infer<typeof VolleySchema>
export type Threshold = z.infer<typeof ThresholdSchema>
export type Measure = z.infer<typeof MeasureSchema>
export type GlobalRating = z.infer<typeof GlobalRatingSchema>
export type VolleySpan = z.infer<typeof VolleySpanSchema>
export type RqWindow = z.infer<typeof RqWindowSchema>
export type TableC = z.infer<typeof TableCSchema>
export type TableDHit = z.infer<typeof TableDHitSchema>
export type IssueLogEntry = z.infer<typeof IssueLogEntrySchema>
export type ScoredSession = z.infer<typeof ScoredSessionSchema>
export type ValidationReport = z.infer<typeof ValidationReportSchema>

/** thresholds.json, reshaped for display. */
export interface ThresholdConfig {
  status: string
  /** true while `_status` starts with PLACEHOLDER. The v1.2 values are the sponsor's, so this is false. */
  isPlaceholder: boolean
  items: Array<{ id: string } & Threshold>
}

// ------------------------------------------------------------ Friendly errors

/** Turns a Zod error into short lines that name the bad field, e.g.
 *  `volleys[2].codes[0].code (volley 3): Invalid option: expected one of "Q"|"SR"|…` */
export function describeZodError(error: z.ZodError, raw: unknown, limit = 8): string[] {
  const lines = error.issues.slice(0, limit).map((issue) => {
    const path = formatPath(issue.path)
    const where = path ? `${path}${locationAt(raw, issue.path)}` : '(top level)'
    return `${where}: ${issue.message}`
  })
  if (error.issues.length > limit) lines.push(`…and ${error.issues.length - limit} more problem(s).`)
  return lines
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === 'number') return `${acc}[${key}]`
    return acc ? `${acc}.${String(key)}` : String(key)
  }, '')
}

/** " (turn 3)" or " (volley 2)" when the path points into turns[] or volleys[]. */
function locationAt(raw: unknown, path: ReadonlyArray<PropertyKey>): string {
  const [list, index] = path
  if ((list !== 'turns' && list !== 'volleys') || typeof index !== 'number') return ''
  if (typeof raw !== 'object' || raw === null) return ''
  const items = (raw as Record<string, unknown>)[list]
  if (!Array.isArray(items)) return ''
  const key = list === 'turns' ? 'turn' : 'volley'
  const value = (items[index] as Record<string, unknown> | undefined)?.[key]
  return typeof value === 'number' ? ` (${key} ${value})` : ''
}
