/**
 * Data contract v0 as Zod schemas + TypeScript types.
 *
 * Mirrors shared/schema/*.schema.json and docs/DATA_CONTRACT.md. If you change a
 * field, bump schema_version and update the JSON Schema, this file and the
 * sample data in the same PR.
 *
 * These schemas are a little more lenient than the JSON Schemas on purpose:
 * unknown fields are ignored (so newer pipeline output still opens), and
 * measure / global ids are free strings (unknown ones still display).
 */
import { z } from 'zod'

export const SUPPORTED_SCHEMA_VERSION = '0.1'

export const PROVENANCES = ['real', 'simulated', 'reference_corpus', 'internal_test'] as const
export const SOURCES = ['aven', 'annomi', 'casaa', 'other'] as const
export const CODES = ['Q', 'SR', 'CR', 'GI', 'PERSUADE', 'PERSUADE_WP', 'AF', 'SEEK', 'EMPHASIZE', 'CONFRONT'] as const
export const CLIENT_TALK = ['change', 'sustain', 'neutral'] as const
export const MEASURE_STATUSES = ['pass', 'fail', 'no_threshold', 'insufficient_data'] as const
export const ISSUE_TYPES = ['measure_below_threshold', 'table_c_flag', 'table_d_behavior'] as const
export const THRESHOLD_OPS = ['>=', '<=', '==', '>', '<'] as const

export type Provenance = (typeof PROVENANCES)[number]
export type Source = (typeof SOURCES)[number]
export type Code = (typeof CODES)[number]
export type ClientTalk = (typeof CLIENT_TALK)[number]
export type MeasureStatus = (typeof MEASURE_STATUSES)[number]
export type IssueType = (typeof ISSUE_TYPES)[number]

const count = z.number().int().min(0)
const turnNumber = z.number().int().min(1)

// ---------------------------------------------------------------- TranscriptIn

const sessionTop = {
  schema_version: z.string(),
  session_id: z.string().min(1),
  is_mock: z.boolean(),
  provenance: z.enum(PROVENANCES),
  source: z.enum(SOURCES),
  target_behavior: z.string(),
  aven_version: z.string().nullable(),
  recorded_at: z.string().nullable(),
}

const turnBase = {
  turn: turnNumber,
  text: z.string(),
  node: z.string().nullable(),
  start_sec: z.number().min(0).nullable(),
}

export const TranscriptTurnSchema = z.object({
  ...turnBase,
  speaker: z.enum(['practitioner', 'client']),
})

export const TranscriptInSchema = z.object({
  ...sessionTop,
  turns: z.array(TranscriptTurnSchema).min(1),
})

// --------------------------------------------------------------- ScoredSession

export const CodeAssignmentSchema = z.object({
  code: z.enum(CODES),
  evidence_quote: z.string(),
  rationale: z.string(),
  evidence_valid: z.boolean(),
})

const scoredTurnBase = {
  ...turnBase,
  excluded: z.boolean(),
  exclusion_reason: z.string().nullable(),
}

export const PractitionerTurnSchema = z.object({
  ...scoredTurnBase,
  speaker: z.literal('practitioner'),
  codes: z.array(CodeAssignmentSchema),
})

export const ClientTurnSchema = z.object({
  ...scoredTurnBase,
  speaker: z.literal('client'),
  client_talk: z.enum(CLIENT_TALK),
  client_evidence_quote: z.string().nullable(),
})

export const ScoredTurnSchema = z.discriminatedUnion('speaker', [PractitionerTurnSchema, ClientTurnSchema])

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
})

export const GlobalRatingSchema = z.object({
  id: z.string(),
  score: z.number().int().min(1).max(5),
  cited_turns: z.array(turnNumber),
  rationale: z.string(),
})

export const IssueSchema = z.object({
  issue_id: z.string().min(1),
  session_id: z.string().min(1),
  type: z.enum(ISSUE_TYPES),
  title: z.string(),
  detail: z.string(),
  measure_id: z.string().nullable(),
  node: z.string().nullable(),
  turns: z.array(turnNumber),
  evidence_quote: z.string().nullable(),
  provenance: z.enum(PROVENANCES),
  aven_version: z.string().nullable(),
  coder_prompt_version: z.string(),
  model: z.string(),
  created_at: z.string(),
})

export const ScorerSchema = z.object({
  run_id: z.string(),
  scored_at: z.string(),
  coder_prompt_version: z.string(),
  globals_prompt_version: z.string(),
  model: z.string(),
  cost_usd: z.number().min(0),
})

export const ScoredSessionSchema = z.object({
  ...sessionTop,
  scorer: ScorerSchema,
  turns: z.array(ScoredTurnSchema).min(1),
  counts: z.record(z.enum(CODES), count),
  client_talk_counts: z.record(z.enum(CLIENT_TALK), count),
  measures: z.array(MeasureSchema),
  globals: z.array(GlobalRatingSchema),
  flags: z.object({
    longest_reflection_run: z.object({
      length: count,
      turns: z.array(turnNumber),
      cap: count,
      exceeds_cap: z.boolean(),
    }),
    windowed_rq: z.object({
      window_size: z.number().int().min(1),
      points: z.array(z.object({ end_turn: turnNumber, rq: z.number().nullable() })),
    }),
  }),
  issues: z.array(IssueSchema),
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

export type TranscriptIn = z.infer<typeof TranscriptInSchema>
export type CodeAssignment = z.infer<typeof CodeAssignmentSchema>
export type PractitionerTurn = z.infer<typeof PractitionerTurnSchema>
export type ClientTurn = z.infer<typeof ClientTurnSchema>
export type ScoredTurn = z.infer<typeof ScoredTurnSchema>
export type Threshold = z.infer<typeof ThresholdSchema>
export type Measure = z.infer<typeof MeasureSchema>
export type GlobalRating = z.infer<typeof GlobalRatingSchema>
export type Issue = z.infer<typeof IssueSchema>
export type ScoredSession = z.infer<typeof ScoredSessionSchema>
export type ValidationReport = z.infer<typeof ValidationReportSchema>

/** thresholds.json, reshaped for display. */
export interface ThresholdConfig {
  status: string
  isPlaceholder: boolean
  items: Array<{ id: string } & Threshold>
}

// ------------------------------------------------------------ Friendly errors

/** Turns a Zod error into short lines that name the bad field, e.g.
 *  `turns[2].codes[0].code (turn 3): Invalid option: expected one of "Q"|"SR"|…` */
export function describeZodError(error: z.ZodError, raw: unknown, limit = 8): string[] {
  const lines = error.issues.slice(0, limit).map((issue) => {
    const path = formatPath(issue.path)
    const turn = turnNumberAt(raw, issue.path)
    const where = path ? `${path}${turn !== null ? ` (turn ${turn})` : ''}` : '(top level)'
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

function turnNumberAt(raw: unknown, path: ReadonlyArray<PropertyKey>): number | null {
  if (path[0] !== 'turns' || typeof path[1] !== 'number') return null
  if (typeof raw !== 'object' || raw === null) return null
  const turns = (raw as { turns?: unknown }).turns
  if (!Array.isArray(turns)) return null
  const turn = (turns[path[1]] as { turn?: unknown } | undefined)?.turn
  return typeof turn === 'number' ? turn : null
}
