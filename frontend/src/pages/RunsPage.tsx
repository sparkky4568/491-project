import { useId, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { LoadErrors, LoadFilesButton } from '../components/LoadFiles'
import {
  Card,
  EmptyState,
  ScoreabilityChip,
  SourceDot,
  chipClass,
  focusRing,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { useConnection } from '../lib/connection'
import { SCOREABILITY_COPY } from '../lib/miti'
import { hrefFor, navigate } from '../lib/router'
import { useRuns, type RunEntry } from '../lib/runs'
import { SCOREABILITY, type Scoreability } from '../lib/schema'
import { rowStats, sessionTopic } from '../lib/sessionStats'

/** Where a session's scores came from, as words next to a dot. */
export function originLabel(entry: RunEntry): { tone: 'live' | 'demo' | 'offline'; label: string } {
  if (entry.origin === 'practice') return { tone: 'demo', label: 'Practice' }
  if (entry.session.is_mock) return { tone: 'demo', label: 'Mock data' }
  return { tone: 'live', label: 'Real scorer' }
}

type ScoreFilter = 'all' | Scoreability

export function RunsPage() {
  const runs = useRuns()
  const { connection, recheck } = useConnection()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ScoreFilter>('all')
  const [run, setRun] = useState<string>('all')
  const searchId = useId()

  const runIds = useMemo(() => [...new Set(runs.entries.map((e) => e.session.scorer.run_id))].sort(), [runs.entries])
  const inRun = runs.entries.filter((e) => run === 'all' || e.session.scorer.run_id === run)
  const q = query.trim().toLowerCase()
  const searched = inRun.filter(
    (e) => !q || e.session.session_id.toLowerCase().includes(q) || sessionTopic(e.session).toLowerCase().includes(q),
  )
  const countOf = (state: Scoreability) => searched.filter((e) => e.session.scoreability.state === state).length
  const shown = filter === 'all' ? searched : searched.filter((e) => e.session.scoreability.state === filter)
  const sync = runs.apiSync

  const headline =
    runs.entries.length === 0
      ? 'Nothing is loaded yet.'
      : runIds.length === 1
        ? `Run ${runIds[0]}, ${runs.entries.length} session${runs.entries.length === 1 ? '' : 's'} loaded. Read in this browser only.`
        : `${runs.entries.length} sessions from ${runIds.length} runs loaded. Read in this browser only.`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="type-h1 text-ink">Scored runs</h1>
          <p className="mt-1 type-body text-ink-2">{headline}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LoadFilesButton />
          <a href={hrefFor({ page: 'score' })} className={primaryButton}>
            <Icon name="plus" />
            Score a call
          </a>
        </div>
      </header>

      <ApiStatus />

      <LoadErrors errors={runs.loadErrors} openedCount={runs.entries.length} onDismiss={runs.clearLoadErrors} />

      {runs.entries.length === 0 ? (
        sync.status === 'loading' ? null : (
          <EmptyState icon="file" title="No scored runs loaded" centered>
            <p>
              Load the ScoredSession files from a scorer run (for example all 14 calls at once), or score a single call.
              {connection.kind === 'offline' && ' The scorer API is unreachable, so its stored sessions are not listed.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <LoadFilesButton primary />
              <a href={hrefFor({ page: 'score' })} className={secondaryButton}>
                <Icon name="plus" />
                Score a call
              </a>
              {connection.kind === 'offline' && (
                <button type="button" className={secondaryButton} onClick={() => void recheck()}>
                  <Icon name="refresh" />
                  Retry the API
                </button>
              )}
            </div>
          </EmptyState>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <label htmlFor={searchId} className="sr-only">
                Search session id or topic
              </label>
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search session id or topic"
                className={`h-10 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 type-small text-ink placeholder:text-muted ${focusRing}`}
              />
            </div>
            {runIds.length > 1 && (
              <label className="flex items-center gap-2 type-small text-ink-2">
                Run
                <select
                  value={run}
                  onChange={(e) => setRun(e.target.value)}
                  className={`h-10 rounded-md border border-line-strong bg-surface px-3 type-small text-ink ${focusRing}`}
                >
                  <option value="all">All runs</option>
                  {runIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div role="group" aria-label="Filter by scoreability" className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                className={chipClass(filter === 'all')}
                onClick={() => setFilter('all')}
              >
                All <span className="tabular-nums">{searched.length}</span>
              </button>
              {SCOREABILITY.filter((s) => s !== 'outside_instrument' || countOf(s) > 0).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filter === s}
                  className={chipClass(filter === s)}
                  onClick={() => setFilter(s)}
                >
                  {SCOREABILITY_COPY[s].label} <span className="tabular-nums">{countOf(s)}</span>
                </button>
              ))}
            </div>
            <p className="type-caption text-muted lg:ml-auto">Sorted by session id. Counts, not a ranking.</p>
          </div>

          {shown.length === 0 ? (
            <EmptyState icon="search" title="No session matches">
              Clear the search or pick another filter.
            </EmptyState>
          ) : (
            <>
              <RunsTable entries={shown} />
              <ul className="space-y-3 md:hidden">
                {shown.map((e) => (
                  <RunCard key={e.session.session_id} entry={e} />
                ))}
              </ul>
              <p className="type-caption text-muted">
                "n/a" means not scoreable: no measures or flags are produced. "Below threshold" counts measures compared with a
                sponsor threshold; it is not a verdict.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ApiStatus() {
  const { connection } = useConnection()
  const runs = useRuns()
  const sync = runs.apiSync
  if (connection.kind !== 'live') return null
  if (sync.status === 'loading')
    return (
      <p role="status" aria-live="polite" className="type-small text-ink-2">
        Opening the scorer API's stored sessions
        {sync.total !== null && (
          <span className="tabular-nums">
            {' '}
            ({sync.done} of {sync.total})
          </span>
        )}
        ...
      </p>
    )
  if (sync.status === 'error')
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-danger-line bg-danger-bg px-4 py-3">
        <Icon name="alert" className="text-danger-fg" />
        <p className="type-small text-danger-fg">Couldn't list the scorer API's stored sessions. {sync.message}</p>
        <button type="button" className={`ml-auto ${secondaryButton}`} onClick={() => void runs.syncApi()}>
          <Icon name="refresh" />
          Retry
        </button>
      </div>
    )
  if (sync.status === 'none')
    return (
      <p className="type-small text-ink-2">
        The scorer API is live but has no stored sessions to list (it was started without --sessions-dir).
      </p>
    )
  return null
}

function cells(entry: RunEntry) {
  const s = rowStats(entry.session)
  const na = <span className="text-muted">n/a</span>
  return {
    stats: s,
    below: s.notScoreable ? (
      na
    ) : s.compared === 0 ? (
      <span className="text-muted">none compared</span>
    ) : (
      `${s.below} of ${s.compared}`
    ),
    flags: s.notScoreable ? na : s.flowFlags,
    tableD: s.notScoreable ? na : s.tableD,
    clinician: s.notScoreable ? na : s.clinician > 0 ? `${s.clinician} to read` : 0,
  }
}

function openSession(entry: RunEntry) {
  navigate({ page: 'session', sessionId: entry.session.session_id, tab: 'summary' })
}

function RunsTable({ entries }: { entries: RunEntry[] }) {
  return (
    <Card className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[880px] text-left type-small">
        <caption className="sr-only">Scored sessions, sorted by session id. Counts, not a ranking.</caption>
        <thead className="bg-subtle type-caption text-muted">
          <tr>
            {[
              'Session',
              'Topic',
              'Scores from',
              'Scoreability',
              'Coach volleys',
              'Below threshold',
              'Flow flags',
              'Table D',
              'Clinician review',
            ].map((h) => (
              <th key={h} scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {entries.map((entry) => {
            const c = cells(entry)
            const origin = originLabel(entry)
            const href = hrefFor({ page: 'session', sessionId: entry.session.session_id, tab: 'summary' })
            return (
              <tr
                key={entry.session.session_id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return
                  openSession(entry)
                }}
                className="cursor-pointer text-ink hover:bg-info-bg has-[a:focus-visible]:bg-info-bg"
              >
                <td className="px-3 py-3 first:pl-5 whitespace-nowrap">
                  <a href={href} className={`type-mono text-link hover:underline ${focusRing} rounded-sm`}>
                    {entry.session.session_id}
                  </a>
                </td>
                <td className="min-w-[10rem] px-3 py-3">{sessionTopic(entry.session)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <SourceDot tone={origin.tone} />
                    {origin.label}
                  </span>
                </td>
                <td className="px-3 py-3 first:pl-5 whitespace-nowrap">
                  <ScoreabilityChip state={entry.session.scoreability.state} mock={entry.session.is_mock} />
                </td>
                <td className="px-3 py-3 tabular-nums">{c.stats.coachVolleys}</td>
                <td className="px-3 py-3 whitespace-nowrap tabular-nums">{c.below}</td>
                <td className="px-3 py-3 tabular-nums">{c.flags}</td>
                <td className="px-3 py-3 tabular-nums">{c.tableD}</td>
                <td className="py-3 pr-5 pl-3 whitespace-nowrap tabular-nums">{c.clinician}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function RunCard({ entry }: { entry: RunEntry }) {
  const c = cells(entry)
  const origin = originLabel(entry)
  const href = hrefFor({ page: 'session', sessionId: entry.session.session_id, tab: 'summary' })
  return (
    <li>
      <a href={href} className={`block rounded-lg border border-line bg-surface p-4 shadow-card hover:bg-info-bg ${focusRing}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-mono text-link">{entry.session.session_id}</p>
            <p className="mt-0.5 type-h3 text-ink">{sessionTopic(entry.session)}</p>
          </div>
          <Icon name="chevronRight" className="mt-1 text-link" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ScoreabilityChip state={entry.session.scoreability.state} mock={entry.session.is_mock} />
          <span className="inline-flex items-center gap-2 type-small text-ink-2">
            <SourceDot tone={origin.tone} />
            {origin.label}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 type-small">
          <Stat label="Coach volleys">{c.stats.coachVolleys}</Stat>
          <Stat label="Below threshold">{c.below}</Stat>
          <Stat label="Flow flags">{c.flags}</Stat>
          <Stat label="Table D">{c.tableD}</Stat>
          <Stat label="Clinician review">{c.clinician}</Stat>
        </dl>
      </a>
    </li>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="type-caption text-muted">{label}</dt>
      <dd className="font-semibold text-ink tabular-nums">{children}</dd>
    </div>
  )
}
