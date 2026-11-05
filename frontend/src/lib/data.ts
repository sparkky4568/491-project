/**
 * data.ts: the ONE place the scorer page gets data from. Data contract v0.2 (schema.ts), which
 * follows Sponsor Deliverables v1.2: transcripts are the sponsor's canonical 1.0 schema, scored
 * sessions carry a scoreability state, measures against the sponsor thresholds, Table C and
 * Table D, and issue-log rows. There is no pass / fail verdict.
 *
 * TODAY: VITE_API_URL is empty.
 *   scoreConversation() uses demoScorer.ts, a keyword-rule practice scorer that follows the
 *   same v1.2 rules. Its results are marked is_mock and every rationale starts with
 *   "Practice rule:", so the page labels them as practice scores. Nothing leaves the browser.
 *
 * LATER: set VITE_API_URL (repo-root .env, or Vercel, Settings, Environment Variables; https
 *   only) to the Python scorer, for example VITE_API_URL=https://aven-scorer-api.example.edu.
 *   Then the same functions call:
 *     POST {VITE_API_URL}/score       canonical 1.0 TranscriptIn, returns a v0.2 ScoredSession
 *     GET  {VITE_API_URL}/thresholds  the thresholds.json contents
 *   Restart `npm run dev` (or redeploy) after changing it.
 *
 * Every response is checked with the Zod schemas in schema.ts. Thresholds and the example
 * transcripts are bundled from shared/ (the single source of truth for config and sample data).
 */
import { z } from 'zod'
import { demoScore } from './demoScorer'
import {
  ScoredSessionSchema,
  ThresholdsFileSchema,
  TranscriptInSchema,
  describeZodError,
  type ScoredSession,
  type ThresholdConfig,
  type TranscriptIn,
} from './schema'

const API_URL: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** true when scores come from the real scorer instead of the keyword-rule stand-in. */
export const usingRealScorer = API_URL !== ''

export class DataError extends Error {
  readonly details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'DataError'
    this.details = details
  }
}

const thresholdFiles = import.meta.glob<unknown>('@shared/config/thresholds.json', { eager: true, import: 'default' })
const exampleFiles = import.meta.glob<unknown>('@shared/sample_data/transcripts/*.json', { eager: true, import: 'default' })

async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers: { Accept: 'application/json', ...init?.headers } })
  } catch {
    throw new DataError(`Couldn't reach the scorer at ${API_URL}. Is it running?`)
  }
  if (!response.ok) throw new DataError(`The scorer returned an error (${response.status}).`)
  const raw: unknown = await response.json()
  const parsed = schema.safeParse(raw)
  if (!parsed.success)
    throw new DataError("The scorer's reply isn't in the expected format.", describeZodError(parsed.error, raw))
  return parsed.data
}

export async function getThresholds(): Promise<ThresholdConfig> {
  let file: z.infer<typeof ThresholdsFileSchema>
  if (API_URL) {
    file = await requestJson('/thresholds', ThresholdsFileSchema)
  } else {
    const raw = Object.values(thresholdFiles)[0]
    const parsed = ThresholdsFileSchema.safeParse(raw)
    if (!parsed.success) throw new DataError('shared/config/thresholds.json is invalid.', describeZodError(parsed.error, raw))
    file = parsed.data
  }
  const { _status, ...rest } = file
  return {
    status: _status,
    isPlaceholder: _status.trim().toUpperCase().startsWith('PLACEHOLDER'),
    items: Object.entries(rest).map(([id, t]) => ({ id, ...t })),
  }
}

/** Scores one conversation: the real scorer when VITE_API_URL is set, otherwise the practice stand-in. */
export async function scoreConversation(transcript: TranscriptIn): Promise<ScoredSession> {
  if (API_URL) {
    return requestJson('/score', ScoredSessionSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcript),
    })
  }
  return demoScore(transcript, await getThresholds())
}

/** The invented example conversations in shared/sample_data/transcripts (canonical 1.0), for the "Try an example" buttons.
 *  A file that does not parse is left out. */
export function listExamples(): TranscriptIn[] {
  return Object.values(exampleFiles)
    .flatMap((raw) => {
      const parsed = TranscriptInSchema.safeParse(raw)
      return parsed.success ? [parsed.data] : []
    })
    .sort((a, b) => a.session_id.localeCompare(b.session_id))
}
