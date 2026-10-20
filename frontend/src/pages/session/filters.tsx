import { selectClass } from '../../components/ui'
import { CODE_INFO } from '../../lib/miti'
import { CODES, type Code, type ScoredTurn } from '../../lib/schema'

export type TurnFilter =
  { kind: 'all' } | { kind: 'code'; code: Code } | { kind: 'talk'; talk: 'change' | 'sustain' } | { kind: 'issues' }

export const SHOW_ALL: TurnFilter = { kind: 'all' }

export function matchesFilter(turn: ScoredTurn, filter: TurnFilter, issueTurns: ReadonlySet<number>): boolean {
  switch (filter.kind) {
    case 'all':
      return true
    case 'issues':
      return issueTurns.has(turn.turn)
    case 'code':
      return turn.speaker === 'practitioner' && turn.codes.some((c) => c.code === filter.code)
    case 'talk':
      return turn.speaker === 'client' && turn.client_talk === filter.talk
  }
}

/** Filter bar above the transcript. Counts are turns shown, not MITI counts. */
export function TranscriptFilters({
  turns,
  filter,
  onChange,
  issueTurns,
  visibleCount,
}: {
  turns: ScoredTurn[]
  filter: TurnFilter
  onChange: (f: TurnFilter) => void
  issueTurns: ReadonlySet<number>
  visibleCount: number
}) {
  const countFor = (f: TurnFilter) => turns.filter((t) => matchesFilter(t, f, issueTurns)).length
  const quick: Array<{ label: string; filter: TurnFilter }> = [
    { label: 'All turns', filter: SHOW_ALL },
    { label: 'With issues', filter: { kind: 'issues' } },
    { label: 'Change talk', filter: { kind: 'talk', talk: 'change' } },
    { label: 'Sustain talk', filter: { kind: 'talk', talk: 'sustain' } },
  ]
  const same = (a: TurnFilter, b: TurnFilter) => JSON.stringify(a) === JSON.stringify(b)

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter turns">
        {quick.map(({ label, filter: f }) => {
          const n = countFor(f)
          const pressed = same(filter, f)
          return (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              disabled={n === 0 && !pressed}
              onClick={() => onChange(f)}
              className={`rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                pressed
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {label} <span className="tabular-nums opacity-75">({n})</span>
            </button>
          )
        })}
        <label className="flex min-w-0 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <span>Code</span>
          <select
            className={`${selectClass} w-52 max-w-full sm:w-auto`}
            value={filter.kind === 'code' ? filter.code : ''}
            onChange={(e) => onChange(e.target.value ? { kind: 'code', code: e.target.value as Code } : SHOW_ALL)}
          >
            <option value="">Any</option>
            {CODES.map((code) => {
              const n = countFor({ kind: 'code', code })
              return (
                <option key={code} value={code} disabled={n === 0}>
                  {code} · {CODE_INFO[code].name} ({n} turn{n === 1 ? '' : 's'})
                </option>
              )
            })}
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
        Showing {visibleCount} of {turns.length} turns
        {filter.kind !== 'all' && (
          <>
            {' · '}
            <button
              type="button"
              onClick={() => onChange(SHOW_ALL)}
              className="font-medium text-blue-700 underline dark:text-blue-300"
            >
              Clear filter
            </button>
          </>
        )}
      </p>
    </div>
  )
}
