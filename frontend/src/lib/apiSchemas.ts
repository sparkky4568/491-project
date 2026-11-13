/**
 * Zod shapes of the scorer API replies (aven-scorer/src/aven_scorer/api.py). The ScoredSession itself
 * is checked with ScoredSessionSchema in schema.ts. Kept apart from data.ts so tests can import them.
 */
import { z } from 'zod'

/** The API's error body. */
export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.array(z.string()).optional().default([]) }),
})

/** GET /health. Extra fields are allowed so a newer API still connects. */
export const HealthSchema = z.looseObject({
  status: z.string().optional(),
  version: z.string(),
  backend: z.string(),
  model: z.string(),
  key_configured: z.boolean(),
  /** true for the fake backend: every result it returns is marked is_mock. */
  is_mock: z.boolean().optional(),
  kill_switch_set: z.boolean().optional(),
  spend_cap_usd: z.number().nullable().optional(),
  spent_usd: z.number().optional(),
  conversations_scored: z.number().optional(),
  sessions_dir_set: z.boolean().optional(),
  team_schema_found: z.boolean().optional(),
})
export type Health = z.infer<typeof HealthSchema>

/** One row of GET /sessions. Fields come straight from the stored file, so most may be null. */
export const SessionSummarySchema = z.looseObject({
  session_id: z.string().min(1),
  file: z.string().nullable().optional(),
  schema_version: z.string().nullable().optional(),
  is_mock: z.boolean().nullable().optional(),
  source: z.string().nullable().optional(),
  provenance: z.string().nullable().optional(),
  aven_version: z.string().nullable().optional(),
  duration_sec: z.number().nullable().optional(),
  scoreability: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  scored_at: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  issues: z.number().nullable().optional(),
})
export type SessionSummary = z.infer<typeof SessionSummarySchema>

export const SessionListSchema = z.looseObject({
  count: z.number().int().min(0),
  sessions: z.array(SessionSummarySchema),
  unreadable: z.array(z.string()).default([]),
})
export type SessionList = z.infer<typeof SessionListSchema>
