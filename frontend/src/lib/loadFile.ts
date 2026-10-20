/**
 * Parses a results file chosen with "Load results file". Accepts one ScoredSession
 * or an array of them. Nothing is uploaded: the file is read in the browser and
 * kept in memory for this tab only.
 */
import { ScoredSessionSchema, TranscriptInSchema, ValidationReportSchema, describeZodError, type ScoredSession } from './schema'

const MAX_BYTES = 25 * 1024 * 1024

export type LoadResult =
  { ok: true; fileName: string; sessions: ScoredSession[] } | { ok: false; fileName: string; message: string; details: string[] }

export async function parseResultsFile(file: File): Promise<LoadResult> {
  const fail = (message: string, details: string[] = []): LoadResult => ({ ok: false, fileName: file.name, message, details })

  if (file.size > MAX_BYTES) return fail(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 25 MB.`)

  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch (err) {
    return fail("This file isn't valid JSON.", [err instanceof Error ? err.message : String(err)])
  }

  const items = Array.isArray(raw) ? raw : [raw]
  if (items.length === 0) return fail('The file contains an empty array, so there is nothing to load.')

  const sessions: ScoredSession[] = []
  const details: string[] = []
  items.forEach((item, index) => {
    const prefix = Array.isArray(raw) ? `item [${index}] → ` : ''
    const parsed = ScoredSessionSchema.safeParse(item)
    if (parsed.success) {
      sessions.push(parsed.data)
      return
    }
    const has = (key: string) => typeof item === 'object' && item !== null && key in item
    if (!has('scorer') && TranscriptInSchema.safeParse(item).success) {
      details.push(`${prefix}this is an unscored TranscriptIn file. The console needs scored pipeline output (ScoredSession).`)
    } else if (has('code_agreement') && ValidationReportSchema.safeParse(item).success) {
      details.push(`${prefix}this is a validation report, not a scored session.`)
    } else {
      details.push(...describeZodError(parsed.error, item, 6).map((line) => prefix + line))
    }
  })

  if (details.length > 0) {
    return fail("This file doesn't match the ScoredSession shape in docs/DATA_CONTRACT.md. Nothing was loaded.", details)
  }

  const timesSeen = new Map<string, number>()
  for (const s of sessions) timesSeen.set(s.session_id, (timesSeen.get(s.session_id) ?? 0) + 1)
  const dupes = [...timesSeen].filter(([, times]) => times > 1).map(([id]) => id)
  if (dupes.length > 0) {
    return fail('The same session_id appears more than once in this file. Nothing was loaded.', dupes)
  }

  return { ok: true, fileName: file.name, sessions }
}
