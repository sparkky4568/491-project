/** Display formatting only. Values come from the pipeline; nothing here recomputes them. */
import type { Threshold } from './schema'

export function formatMeasureValue(id: string, value: number | null): string {
  if (value === null) return '—'
  switch (id) {
    case 'pct_complex_reflections':
      return `${(value * 100).toFixed(0)}%`
    case 'reflection_to_question':
      return value.toFixed(2)
    case 'relational':
    case 'technical':
      return value.toFixed(1)
    default:
      return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
}

/** A goal in plain words: "40% or more", "2 or more", "none". */
export function formatGoal(id: string, threshold: Pick<Threshold, 'op' | 'value'>): string {
  // Goals read better without trailing zeros: "2 or more", not "2.00 or more".
  const value =
    id === 'pct_complex_reflections' ? formatMeasureValue(id, threshold.value) : String(Number(threshold.value.toFixed(2)))
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
      return threshold.value === 0 ? 'none' : `exactly ${value}`
  }
}

export function formatSeconds(sec: number | null): string {
  if (sec === null) return '—'
  const whole = Math.floor(sec)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
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
