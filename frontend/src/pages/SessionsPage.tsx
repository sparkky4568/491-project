import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LoadResultsButton } from '../components/LoadResultsButton'
import { MockBanner } from '../components/MockBanner'
import { SortHeader, cellClass, compareValues, rowClass, tableClass, theadClass, useSort } from '../components/SortableTable'
import {
  ErrorPanel,
  Loading,
  MockTag,
  PageContainer,
  PageTitle,
  ProvenanceBadge,
  StatusMark,
  buttonClass,
  FilterSelect,
  linkClass,
} from '../components/ui'
import { clearLoadedSessions, isLoadedFromFile, listDataProblems, listSessions, loadedCount } from '../lib/data'
import { formatCost, formatMeasureValue } from '../lib/format'
import { useAsync, useDataVersion } from '../lib/hooks'
import { PROVENANCE_LABELS, SOURCE_LABELS } from '../lib/miti'
import { PROVENANCES, SOURCES, type Measure, type ScoredSession } from '../lib/schema'

type Column =
  | 'id'
  | 'provenance'
  | 'source'
  | 'target'
  | 'turns'
  | 'relational'
  | 'technical'
  | 'mina'
  | 'issues'
  | 'prompt'
  | 'model'
  | 'cost'

const measureOf = (s: ScoredSession, id: string) => s.measures.find((m) => m.id === id)

const SORT_VALUE: Record<Column, (s: ScoredSession) => string | number | null> = {
  id: (s) => s.session_id,
  provenance: (s) => PROVENANCE_LABELS[s.provenance],
  source: (s) => SOURCE_LABELS[s.source],
  target: (s) => s.target_behavior,
  turns: (s) => s.turns.length,
  relational: (s) => measureOf(s, 'relational')?.value ?? null,
  technical: (s) => measureOf(s, 'technical')?.value ?? null,
  mina: (s) => measureOf(s, 'total_mina')?.value ?? null,
  issues: (s) => s.issues.length,
  prompt: (s) => s.scorer.coder_prompt_version,
  model: (s) => s.scorer.model,
  cost: (s) => s.scorer.cost_usd,
}

export function SessionsPage() {
  const version = useDataVersion()
  const state = useAsync(() => listSessions(), [version])
  const [provenance, setProvenance] = useState('')
  const [source, setSource] = useState('')
  const [hasIssues, setHasIssues] = useState('')
  const { sort, toggle } = useSort<Column>('id')

  const sessions = state.status === 'ready' ? state.data : []
  const rows = useMemo(
    () =>
      sessions
        .filter((s) => !provenance || s.provenance === provenance)
        .filter((s) => !source || s.source === source)
        .filter((s) => !hasIssues || (hasIssues === 'yes' ? s.issues.length > 0 : s.issues.length === 0))
        .sort((a, b) => compareValues(SORT_VALUE[sort.key](a), SORT_VALUE[sort.key](b), sort.dir)),
    [sessions, provenance, source, hasIssues, sort],
  )
  const existingIds = useMemo(() => new Set(sessions.map((s) => s.session_id)), [sessions])
  const anyMock = sessions.some((s) => s.is_mock)
  const problems = listDataProblems()

  // Summary strip: simple totals of pipeline-reported fields across loaded sessions.
  const totalIssues = sessions.reduce((sum, s) => sum + s.issues.length, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.scorer.cost_usd, 0)

  return (
    <>
      {anyMock && (
        <MockBanner
          detail={
            sessions.every((s) => s.is_mock) ? undefined : 'Rows tagged MOCK are invented. Other rows came from loaded files.'
          }
        />
      )}
      <PageContainer>
        <PageTitle title="Sessions">
          Every scored conversation the console can see. Open one to read the transcript turn by turn, with the code each turn got
          and why.
        </PageTitle>

        {problems.length > 0 && (
          <div className="mb-4 space-y-2">
            {problems.map((p) => (
              <ErrorPanel
                key={p.file}
                title={`${p.file} was skipped`}
                message="It doesn't match the ScoredSession shape."
                details={p.details}
              />
            ))}
          </div>
        )}

        {state.status === 'loading' && <Loading what="sessions" />}
        {state.status === 'error' && (
          <ErrorPanel title="Couldn't load sessions" message={state.error.message} details={state.error.details} />
        )}

        {state.status === 'ready' && (
          <>
            <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Sessions loaded" value={String(sessions.length)} />
              <Stat label="Total issues" value={String(totalIssues)} />
              <Stat label="Total scoring cost" value={formatCost(totalCost)} />
              <Stat
                label="Average cost per conversation"
                value={sessions.length ? formatCost(totalCost / sessions.length) : '—'}
              />
            </dl>

            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filter sessions">
                <FilterSelect label="Provenance" value={provenance} onChange={setProvenance}>
                  {PROVENANCES.map((p) => (
                    <option key={p} value={p}>
                      {PROVENANCE_LABELS[p]}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Source" value={source} onChange={setSource}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Issues" value={hasIssues} onChange={setHasIssues}>
                  <option value="yes">Has issues</option>
                  <option value="no">No issues</option>
                </FilterSelect>
              </div>
              <div className="flex max-w-md flex-col gap-2 lg:items-end">
                <div className="flex flex-wrap gap-2">
                  <LoadResultsButton existingIds={existingIds} />
                  {loadedCount() > 0 && (
                    <button type="button" className={buttonClass} onClick={clearLoadedSessions}>
                      Clear loaded files
                    </button>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-600 lg:text-right dark:text-slate-400">
                  Opens pipeline output (one ScoredSession or an array) in this tab only. Nothing is uploaded, and reloading
                  clears it. Never load real member data or PHI.
                </p>
              </div>
            </div>

            <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className={tableClass}>
                <caption className="sr-only">Scored sessions. Column headers sort the table.</caption>
                <thead className={theadClass}>
                  <tr>
                    <SortHeader
                      label="Session"
                      column="id"
                      sort={sort}
                      onSort={toggle}
                      className="sticky left-0 bg-slate-50 dark:bg-slate-900"
                    />
                    <SortHeader label="Provenance" column="provenance" sort={sort} onSort={toggle} />
                    <SortHeader label="Source" column="source" sort={sort} onSort={toggle} />
                    <SortHeader label="Target behavior" column="target" sort={sort} onSort={toggle} />
                    <SortHeader label="Turns" column="turns" sort={sort} onSort={toggle} align="right" />
                    <SortHeader label="Relational" column="relational" sort={sort} onSort={toggle} align="right" />
                    <SortHeader label="Technical" column="technical" sort={sort} onSort={toggle} align="right" />
                    <SortHeader label="MINA" column="mina" sort={sort} onSort={toggle} align="right" />
                    <SortHeader label="Issues" column="issues" sort={sort} onSort={toggle} align="right" />
                    <SortHeader label="Prompt" column="prompt" sort={sort} onSort={toggle} />
                    <SortHeader label="Model" column="model" sort={sort} onSort={toggle} />
                    <SortHeader label="Cost" column="cost" sort={sort} onSort={toggle} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-slate-600 dark:text-slate-400">
                        No sessions match these filters.
                      </td>
                    </tr>
                  )}
                  {rows.map((s) => (
                    <tr key={s.session_id} className={rowClass}>
                      <th
                        scope="row"
                        className={`${cellClass} sticky left-0 bg-white text-left font-normal whitespace-nowrap dark:bg-slate-900`}
                      >
                        <Link
                          to={`/sessions/${encodeURIComponent(s.session_id)}`}
                          className={`${linkClass} font-mono font-medium`}
                        >
                          {s.session_id}
                        </Link>
                        <span className="ml-2 inline-flex gap-1 align-middle">
                          {s.is_mock && <MockTag />}
                          {isLoadedFromFile(s.session_id) && (
                            <span className="rounded border border-blue-300 px-1 text-[11px] text-blue-900 dark:border-blue-700 dark:text-blue-200">
                              file
                            </span>
                          )}
                        </span>
                      </th>
                      <td className={cellClass}>
                        <ProvenanceBadge provenance={s.provenance} />
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>{SOURCE_LABELS[s.source]}</td>
                      <td className={`${cellClass} min-w-40`}>{s.target_behavior}</td>
                      <td className={`${cellClass} text-right tabular-nums`}>{s.turns.length}</td>
                      <MeasureCell measure={measureOf(s, 'relational')} />
                      <MeasureCell measure={measureOf(s, 'technical')} />
                      <MeasureCell measure={measureOf(s, 'total_mina')} />
                      <td className={`${cellClass} text-right tabular-nums`}>
                        {s.issues.length > 0 ? (
                          <Link to={`/issues?session=${encodeURIComponent(s.session_id)}`} className={linkClass}>
                            {s.issues.length}
                          </Link>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td
                        className={`${cellClass} font-mono text-xs whitespace-nowrap`}
                        title={`Globals prompt: ${s.scorer.globals_prompt_version}`}
                      >
                        {s.scorer.coder_prompt_version}
                      </td>
                      <td className={`${cellClass} font-mono text-xs whitespace-nowrap`}>{s.scorer.model}</td>
                      <td className={`${cellClass} text-right tabular-nums`}>{formatCost(s.scorer.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Relational, Technical and MINA are pipeline values (✓ pass, ✕ fail against placeholder thresholds). Relational and
              Technical are advisory until the scorer is validated.
            </p>
          </>
        )}
      </PageContainer>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</dd>
    </div>
  )
}

function MeasureCell({ measure }: { measure: Measure | undefined }) {
  if (!measure) return <td className={`${cellClass} text-right text-slate-500`}>—</td>
  return (
    <td className={`${cellClass} text-right whitespace-nowrap tabular-nums`}>
      <span className="inline-flex items-center gap-1.5">
        {formatMeasureValue(measure.id, measure.value)}
        <StatusMark status={measure.status} />
      </span>
    </td>
  )
}
