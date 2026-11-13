/**
 * Opens ScoredSession files exported by aven-scorer (data contract v0.2), so the console can show
 * real scorer output. The files are read in this browser and never sent anywhere.
 */
import { ScoredSessionSchema, SUPPORTED_SCHEMA_VERSION, describeZodError, type ScoredSession } from './schema'

export interface LoadedSession {
  fileName: string
  session: ScoredSession
}

export interface LoadError {
  fileName: string
  message: string
  details?: string[]
}

export type LoadResult = { ok: true; loaded: LoadedSession } | { ok: false; error: LoadError }

/** Checks one file's text against the ScoredSession v0.2 shape the page reads. */
export function parseScoredFile(text: string, fileName: string): LoadResult {
  const fail = (message: string, details?: string[]): LoadResult => ({ ok: false, error: { fileName, message, details } })
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail('Not valid JSON.')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return fail('Expected one ScoredSession object, the file aven-scorer writes per session.')
  const obj = raw as Record<string, unknown>
  if (!('scorer' in obj))
    return fail('This is not a scored session (no "scorer" field). To score a transcript, paste it into Score a call instead.')
  if (obj.schema_version !== SUPPORTED_SCHEMA_VERSION)
    return fail(
      `schema_version is ${JSON.stringify(obj.schema_version ?? null)}, but this console reads ScoredSession version ${SUPPORTED_SCHEMA_VERSION}. Export it again with the v${SUPPORTED_SCHEMA_VERSION} contract exporter.`,
    )
  const parsed = ScoredSessionSchema.safeParse(raw)
  if (!parsed.success)
    return fail(
      `Doesn't match the ScoredSession v${SUPPORTED_SCHEMA_VERSION} format in docs/DATA_CONTRACT.md.`,
      describeZodError(parsed.error, raw, 6),
    )
  return { ok: true, loaded: { fileName, session: parsed.data } }
}

/** Reads and checks several files. Good files load even when others fail. */
export async function loadScoredFiles(files: Iterable<File>): Promise<{ loaded: LoadedSession[]; errors: LoadError[] }> {
  const results = await Promise.all(
    [...files].map(async (file): Promise<LoadResult> => {
      try {
        return parseScoredFile(await file.text(), file.name)
      } catch {
        return { ok: false, error: { fileName: file.name, message: "Couldn't read the file." } }
      }
    }),
  )
  return {
    loaded: results.flatMap((r) => (r.ok ? [r.loaded] : [])),
    errors: results.flatMap((r) => (r.ok ? [] : [r.error])),
  }
}
