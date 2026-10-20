/**
 * data.ts — the ONE place the review console gets data from.
 *
 * Pages and components never import JSON or call fetch() themselves; they call
 * the functions below. That keeps the swap from mock files to a real API in
 * this file only.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MODE 1 (today): VITE_API_URL is empty                                   │
 * │   Reads the mock files in shared/sample_data/ and shared/config/,       │
 * │   bundled by Vite at build time. shared/ is the single source of truth. │
 * │                                                                         │
 * │ MODE 2 (later): set VITE_API_URL in the repo-root .env, e.g.            │
 * │   VITE_API_URL=http://localhost:8000                                    │
 * │   The same functions then call the Python API:                          │
 * │     GET {VITE_API_URL}/sessions            → ScoredSession[]            │
 * │     GET {VITE_API_URL}/sessions/{id}       → ScoredSession              │
 * │     GET {VITE_API_URL}/issues              → Issue[]                    │
 * │     GET {VITE_API_URL}/validation-report   → ValidationReport           │
 * │     GET {VITE_API_URL}/thresholds          → thresholds.json contents   │
 * │   Restart `npm run dev` after editing .env.                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * In both modes every payload is checked with the Zod schemas in schema.ts,
 * and sessions loaded from disk with "Load results file" are merged in
 * (they live in memory only and disappear on reload).
 */
import { z } from 'zod'
import {
  IssueSchema,
  ScoredSessionSchema,
  ThresholdsFileSchema,
  ValidationReportSchema,
  describeZodError,
  type Issue,
  type ScoredSession,
  type ThresholdConfig,
  type ValidationReport,
} from './schema'

const API_URL: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const dataSource = API_URL
  ? { mode: 'api' as const, label: `API · ${API_URL}` }
  : { mode: 'mock' as const, label: 'Mock files · shared/sample_data' }

export class DataError extends Error {
  readonly details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'DataError'
    this.details = details
  }
}

/** A bundled file that failed validation. Shown on the Sessions page so fixture edits fail loudly. */
export interface DataProblem {
  file: string
  details: string[]
}

// ------------------------------------------------------------ Mode 1: mock files

const scoredFiles = import.meta.glob<unknown>('@shared/sample_data/scored/*.json', { eager: true, import: 'default' })
const validationFiles = import.meta.glob<unknown>('@shared/sample_data/validation_report.mock.json', {
  eager: true,
  import: 'default',
})
const thresholdFiles = import.meta.glob<unknown>('@shared/config/thresholds.json', { eager: true, import: 'default' })

const shortName = (path: string) => path.slice(path.indexOf('shared/'))

let mockCache: { sessions: ScoredSession[]; problems: DataProblem[] } | null = null

function mockSessions() {
  if (mockCache) return mockCache
  const sessions: ScoredSession[] = []
  const problems: DataProblem[] = []
  for (const [path, raw] of Object.entries(scoredFiles)) {
    const parsed = ScoredSessionSchema.safeParse(raw)
    if (parsed.success) sessions.push(parsed.data)
    else problems.push({ file: shortName(path), details: describeZodError(parsed.error, raw) })
  }
  sessions.sort((a, b) => a.session_id.localeCompare(b.session_id))
  mockCache = { sessions, problems }
  return mockCache
}

function parseBundled<T>(files: Record<string, unknown>, schema: z.ZodType<T>, what: string): T {
  const [path, raw] = Object.entries(files)[0] ?? []
  if (!path) throw new DataError(`No ${what} file found in shared/.`)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new DataError(`${shortName(path)} doesn't match the data contract.`, describeZodError(parsed.error, raw))
  }
  return parsed.data
}

// -------------------------------------------------------------- Mode 2: the API

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' } })
  } catch {
    throw new DataError(`Couldn't reach the API at ${API_URL}. Is the Python server running?`)
  }
  if (!response.ok) throw new DataError(`The API returned ${response.status} for ${path}.`)
  const raw: unknown = await response.json()
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new DataError(`The API response for ${path} doesn't match the data contract.`, describeZodError(parsed.error, raw))
  }
  return parsed.data
}

// ------------------------------------------------- Sessions loaded from disk

const loaded = new Map<string, ScoredSession>()
const listeners = new Set<() => void>()
let version = 0

/** Adds validated sessions from "Load results file". A session with the same id replaces the old one. */
export function addLoadedSessions(sessions: ScoredSession[]): void {
  for (const s of sessions) loaded.set(s.session_id, s)
  version += 1
  listeners.forEach((listener) => listener())
}

export function clearLoadedSessions(): void {
  loaded.clear()
  version += 1
  listeners.forEach((listener) => listener())
}

export const isLoadedFromFile = (sessionId: string) => loaded.has(sessionId)
export const loadedCount = () => loaded.size

/** For useSyncExternalStore: re-render when loaded files change. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getDataVersion = () => version

function mergeLoaded(base: ScoredSession[]): ScoredSession[] {
  if (loaded.size === 0) return base
  return [...base.filter((s) => !loaded.has(s.session_id)), ...loaded.values()]
}

// ------------------------------------------------------------------ Public API

export async function listSessions(): Promise<ScoredSession[]> {
  const base = API_URL ? await getJson('/sessions', z.array(ScoredSessionSchema)) : mockSessions().sessions
  return mergeLoaded(base)
}

export async function getSession(id: string): Promise<ScoredSession | null> {
  const fromFile = loaded.get(id)
  if (fromFile) return fromFile
  if (API_URL) return getJson(`/sessions/${encodeURIComponent(id)}`, ScoredSessionSchema)
  return mockSessions().sessions.find((s) => s.session_id === id) ?? null
}

/** Every issue across all sessions, ordered by issue_id. */
export async function listIssues(): Promise<Issue[]> {
  const base = API_URL ? await getJson('/issues', z.array(IssueSchema)) : mockSessions().sessions.flatMap((s) => s.issues)
  const fromFiles = [...loaded.values()].flatMap((s) => s.issues)
  return [...base.filter((i) => !loaded.has(i.session_id)), ...fromFiles].sort((a, b) =>
    a.issue_id.localeCompare(b.issue_id, undefined, { numeric: true }),
  )
}

export async function getValidationReport(): Promise<ValidationReport> {
  if (API_URL) return getJson('/validation-report', ValidationReportSchema)
  return parseBundled(validationFiles, ValidationReportSchema, 'validation report')
}

export async function getThresholds(): Promise<ThresholdConfig> {
  const file = API_URL
    ? await getJson('/thresholds', ThresholdsFileSchema)
    : parseBundled(thresholdFiles, ThresholdsFileSchema, 'thresholds')
  const { _status, ...rest } = file
  return {
    status: _status,
    isPlaceholder: _status.trim().toUpperCase().startsWith('PLACEHOLDER'),
    items: Object.entries(rest).map(([id, t]) => ({ id, ...t })),
  }
}

/** Bundled mock files that failed validation (mock mode only). */
export function listDataProblems(): DataProblem[] {
  return API_URL ? [] : mockSessions().problems
}
