/**
 * data.ts: the ONE place the console gets data from. Data contract v0.2 (schema.ts), which
 * follows Sponsor Deliverables v1.2. There is no pass / fail verdict.
 *
 * VITE_API_URL empty (Demo):
 *   scoreConversation(t, 'practice') uses demoScorer.ts, a keyword-rule practice scorer that
 *   follows the same v1.2 rules. Its results are marked is_mock and labelled as practice scores.
 *   Nothing leaves the browser. Scored files still open with "Load scored files" (loadScored.ts).
 *
 * VITE_API_URL set (Live), e.g. VITE_API_URL=http://127.0.0.1:8787 for `aven-scorer serve`
 * (aven-scorer/src/aven_scorer/api.py). The console calls:
 *   GET  /health          { status, version, backend, model, key_configured, is_mock, ... }
 *   GET  /thresholds      the thresholds.json contents
 *   POST /score           canonical 1.0 TranscriptIn, returns a v0.2 ScoredSession
 *   GET  /sessions        { count, sessions: [summary], unreadable: [file] }
 *   GET  /sessions/{id}   one v0.2 ScoredSession
 *   Errors are { error: { code, message, details } }; the message is shown as is.
 * If the API does not answer, the console says so (Offline). It never falls back to practice
 * scores on its own: the person chooses that.
 *
 * Every response is checked with Zod. Thresholds and the example transcripts are bundled from
 * shared/ (the single source of truth for config and sample data).
 */
import { z } from 'zod'
import { ApiErrorSchema, HealthSchema, SessionListSchema, type Health, type SessionList } from './apiSchemas'
import { demoScore } from './demoScorer'
import {
  SUPPORTED_SCHEMA_VERSION,
  ScoredSessionSchema,
  ThresholdsFileSchema,
  TranscriptInSchema,
  describeZodError,
  type ScoredSession,
  type ThresholdConfig,
  type TranscriptIn,
} from './schema'

const API_URL: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** The scorer API base URL, or '' in demo mode. */
export const apiUrl = API_URL
/** true when a scorer API is configured (VITE_API_URL). Whether it answers is checked by checkHealth(). */
export const usingRealScorer = API_URL !== ''

export class DataError extends Error {
  readonly details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'DataError'
    this.details = details
  }
}

/** A failed API call. `code` is the API's error code, or 'unreachable', 'timeout', 'bad_reply', 'http_error'. */
export class ApiCallError extends DataError {
  readonly code: string
  readonly status: number | null
  constructor(message: string, code: string, status: number | null, details: string[] = []) {
    super(message, details)
    this.name = 'ApiCallError'
    this.code = code
    this.status = status
  }
}

const thresholdFiles = import.meta.glob<unknown>('@shared/config/thresholds.json', { eager: true, import: 'default' })
export type { Health, SessionList, SessionSummary } from './apiSchemas'

const exampleFiles = import.meta.glob<unknown>('@shared/sample_data/transcripts/*.json', { eager: true, import: 'default' })

// ------------------------------------------------------------------- Requests

async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  if (!API_URL) throw new ApiCallError('No scorer API is configured (VITE_API_URL is empty).', 'no_api', null)
  const { timeoutMs = 30_000, ...rest } = init ?? {}
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...rest.headers },
    })
  } catch {
    const timedOut = controller.signal.aborted
    throw new ApiCallError(
      timedOut
        ? `The scorer API at ${API_URL} did not answer (timed out after ${Math.round(timeoutMs / 1000)} s).`
        : `Couldn't reach the scorer API at ${API_URL}. Is aven-scorer serve running?`,
      timedOut ? 'timeout' : 'unreachable',
      null,
    )
  } finally {
    window.clearTimeout(timer)
  }
  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    raw = undefined
  }
  if (!response.ok) {
    const err = ApiErrorSchema.safeParse(raw)
    if (err.success)
      throw new ApiCallError(
        `The scorer API refused this (${response.status}): ${err.data.error.message}`,
        err.data.error.code,
        response.status,
        err.data.error.details,
      )
    throw new ApiCallError(`The scorer API returned an error (${response.status}).`, 'http_error', response.status)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success)
    throw new ApiCallError(
      `The scorer API's reply to ${path} isn't in the expected format.`,
      'bad_reply',
      response.status,
      describeZodError(parsed.error, raw),
    )
  return parsed.data
}

/** GET /health with a short timeout. Drives the connection indicator. */
export function checkHealth(timeoutMs = 5_000): Promise<Health> {
  return requestJson('/health', HealthSchema, { timeoutMs })
}

/** GET /sessions. Resolves to null when the server was started without --sessions-dir. */
export async function listApiSessions(): Promise<SessionList | null> {
  try {
    return await requestJson('/sessions', SessionListSchema)
  } catch (err) {
    if (err instanceof ApiCallError && err.code === 'no_sessions_dir') return null
    throw err
  }
}

/** GET /sessions/{id}: one stored ScoredSession, checked against v0.2. */
export async function getApiSession(sessionId: string): Promise<ScoredSession> {
  const session = await requestJson(`/sessions/${encodeURIComponent(sessionId)}`, ScoredSessionSchema)
  if (session.schema_version !== SUPPORTED_SCHEMA_VERSION)
    throw new ApiCallError(
      `Session ${sessionId} has schema_version ${JSON.stringify(session.schema_version)}, but this console reads ScoredSession version ${SUPPORTED_SCHEMA_VERSION}.`,
      'schema_version',
      200,
    )
  return session
}

// ------------------------------------------------------------------ Thresholds

function bundledThresholds(): z.infer<typeof ThresholdsFileSchema> {
  const raw = Object.values(thresholdFiles)[0]
  const parsed = ThresholdsFileSchema.safeParse(raw)
  if (!parsed.success) throw new DataError('shared/config/thresholds.json is invalid.', describeZodError(parsed.error, raw))
  return parsed.data
}

function toThresholdConfig(file: z.infer<typeof ThresholdsFileSchema>): ThresholdConfig {
  const { _status, ...rest } = file
  return {
    status: _status,
    isPlaceholder: _status.trim().toUpperCase().startsWith('PLACEHOLDER'),
    items: Object.entries(rest).map(([id, t]) => ({ id, ...t })),
  }
}

/** The sponsor thresholds: from the API when one is configured, otherwise the bundled file. */
export async function getThresholds(): Promise<ThresholdConfig> {
  return toThresholdConfig(API_URL ? await requestJson('/thresholds', ThresholdsFileSchema) : bundledThresholds())
}

// --------------------------------------------------------------------- Scoring

/**
 * Scores one conversation. 'api': POST /score at VITE_API_URL (never a silent fallback).
 * 'practice': the keyword-rule stand-in in this browser, used in demo mode or when the person chooses it.
 */
export async function scoreConversation(transcript: TranscriptIn, mode: 'api' | 'practice'): Promise<ScoredSession> {
  if (mode === 'api') {
    const session = await requestJson('/score', ScoredSessionSchema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcript),
      timeoutMs: 600_000,
    })
    if (session.schema_version !== SUPPORTED_SCHEMA_VERSION)
      throw new ApiCallError(
        `The scorer returned schema_version ${JSON.stringify(session.schema_version)}, but this console reads ScoredSession version ${SUPPORTED_SCHEMA_VERSION}.`,
        'schema_version',
        200,
      )
    return session
  }
  // Practice scores use the bundled thresholds, so they work while the API is offline.
  return demoScore(transcript, toThresholdConfig(bundledThresholds()))
}

/** The invented example conversations in shared/sample_data/transcripts (canonical 1.0), for "Try an invented example".
 *  A file that does not parse is left out. */
export function listExamples(): TranscriptIn[] {
  return Object.values(exampleFiles)
    .flatMap((raw) => {
      const parsed = TranscriptInSchema.safeParse(raw)
      return parsed.success ? [parsed.data] : []
    })
    .sort((a, b) => a.session_id.localeCompare(b.session_id))
}
