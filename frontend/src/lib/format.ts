/** Display formatting only. Values come from the scorer; nothing here recomputes a score. */
import { MEASURE_COPY, canonicalMeasureId, type MeasureUnit } from './miti'
import { ISSUE_LOG_COLUMNS, type IssueLogEntry, type Measure, type Threshold } from './schema'

export function measureUnit(id: string): MeasureUnit {
  return MEASURE_COPY[canonicalMeasureId(id)]?.unit ?? 'ratio'
}

/** Percent measures arrive as a share (0.42). Anything above 1 is taken as already in percent. */
const asPercent = (value: number) => (Math.abs(value) <= 1 ? value * 100 : value)

/** "42%", "1.50", "3", "3.5". Returns "n/a" for null. */
export function formatMeasureValue(id: string, value: number | null): string {
  if (value === null) return 'n/a'
  switch (measureUnit(id)) {
    case 'percent':
      return `${Math.round(asPercent(value))}%`
    case 'ratio':
      return value.toFixed(2)
    case 'outOf5':
      return Number.isInteger(value) ? String(value) : value.toFixed(1)
    case 'count':
      return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
}

/** A threshold in plain words: "50% or more", "4 or more", "0 (none allowed)". */
export function formatThreshold(id: string, threshold: Pick<Threshold, 'op' | 'value'>): string {
  const unit = measureUnit(id)
  const value = unit === 'percent' ? formatMeasureValue(id, threshold.value) : String(Number(threshold.value.toFixed(2)))
  switch (threshold.op) {
    case '>=':
      return `${value} or more`
    case '<=':
      return `${value} or fewer`
    case '>':
      return `more than ${value}`
    case '<':
      return `under ${value}`
    case '==':
      return threshold.value === 0 ? '0 (none allowed)' : `exactly ${value}`
  }
}

/** "12 min 31 s". */
export function formatDuration(sec: number | null): string | null {
  if (sec === null) return null
  const whole = Math.round(sec)
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return m === 0 ? `${s} s` : `${m} min ${s} s`
}

/** Milliseconds from the start of the call as "3:07". */
export function formatClock(ms: number | null): string | null {
  if (ms === null) return null
  const whole = Math.floor(ms / 1000)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** "Turn 4" or "Turns 4 to 9". */
export function formatTurnSpan(start: number, end: number): string {
  return start === end ? `Turn ${start}` : `Turns ${start} to ${end}`
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})
export const formatCost = (value: number) => usd.format(value)

/** "2026-10-20T18:00:00Z" → "2026-10-20 18:00 UTC". Leaves anything else untouched. */
export function formatTimestamp(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?Z$/.exec(iso)
  return match ? `${match[1]} ${match[2]} UTC` : iso
}

// ------------------------------------------------------------------ Issue log

/** "reflections=4;questions=0;window=5" → { reflections: 4, questions: 0, window: 5 } */
function parsePairs(text: string): Record<string, number> | null {
  const out: Record<string, number> = {}
  for (const part of text.split(';')) {
    const [k, v] = part.split('=')
    if (!k || v === undefined || Number.isNaN(Number(v))) return null
    out[k.trim()] = Number(v)
  }
  return out
}

/** The observed value and threshold of an issue-log row, in plain words. Raw text when unsure. */
export function formatObserved(entry: IssueLogEntry, measures: Measure[]): { observed: string; threshold: string } | null {
  if (entry.entry_type === 'TABLE_D') return null
  const observed = entry.observed ?? ''
  const threshold = entry.threshold ?? ''
  if (entry.entry_type === 'TABLE_C') {
    if (entry.item === 'C1_reflection_run')
      return { observed: `${observed} in a row`, threshold: threshold ? `cap is ${threshold}` : '' }
    const pairs = parsePairs(observed)
    if (pairs && 'reflections' in pairs && 'questions' in pairs) {
      const r = pairs.reflections
      const q = pairs.questions
      return {
        observed: `${r} reflection${r === 1 ? '' : 's'}, ${q} question${q === 1 ? '' : 's'}`,
        threshold: entry.item === 'C2_window_no_reflections' ? 'at least 1 reflection' : 'at least 1 question',
      }
    }
    return { observed, threshold }
  }
  const id = canonicalMeasureId(entry.item)
  const num = Number(observed)
  const measure = measures.find((m) => canonicalMeasureId(m.id) === id)
  return {
    observed: observed !== '' && !Number.isNaN(num) ? formatMeasureValue(id, num) : observed,
    threshold: measure?.threshold ? formatThreshold(id, measure.threshold) : threshold,
  }
}

/**
 * Splits an issue-log evidence cell into quotes. Current scorer output (aven-scorer issue_log.py) holds
 * verbatim agent text only, one quote per line. Older output prefixed each quote "[turn N]" and joined
 * them with " || "; that form still parses, and its turn number is kept.
 */
export function splitEvidence(evidence: string): Array<{ turn: number | null; text: string }> {
  return evidence
    .split(/\r?\n| \|\| /)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^\[turns? (\d+)(?:-\d+)?\]\s*(.*)$/s.exec(part)
      return match ? { turn: Number(match[1]), text: match[2] } : { turn: null, text: part }
    })
}

/** RFC 4180 quoting: wrap in quotes when needed, double any quote inside. */
function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** The issue log as CSV: exactly the 16 sponsor columns, in order, with a header row. */
export function issuesToCsv(issues: IssueLogEntry[]): string {
  const rows = [ISSUE_LOG_COLUMNS.join(',')]
  for (const issue of issues) rows.push(ISSUE_LOG_COLUMNS.map((col) => csvCell(issue[col])).join(','))
  return `${rows.join('\r\n')}\r\n`
}

/** The issue log as JSONL: one JSON object per line, the same 16 columns in the same order. */
export function issuesToJsonl(issues: IssueLogEntry[]): string {
  return issues
    .map((issue) => `${JSON.stringify(Object.fromEntries(ISSUE_LOG_COLUMNS.map((col) => [col, issue[col]])))}\n`)
    .join('')
}

/** issue_log_<run_id>.csv (or .jsonl), with characters a file name can't hold replaced. */
export function issueLogFileName(runId: string, ext: 'csv' | 'jsonl' = 'csv'): string {
  return `issue_log_${runId.replace(/[^A-Za-z0-9._-]/g, '_')}.${ext}`
}
