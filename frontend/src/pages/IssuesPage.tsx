import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { MockBanner } from '../components/MockBanner'
import { SortHeader, cellClass, compareValues, rowClass, tableClass, theadClass, useSort } from '../components/SortableTable'
import {
  ErrorPanel,
  FilterSelect,
  IssueTypeBadge,
  Loading,
  MockTag,
  PageContainer,
  PageTitle,
  ProvenanceBadge,
  buttonClass,
  linkClass,
} from '../components/ui'
import { downloadCsv, toCsv } from '../lib/csv'
import { listIssues, listSessions } from '../lib/data'
import { formatTimestamp } from '../lib/format'
import { useAsync, useDataVersion } from '../lib/hooks'
import { ISSUE_TYPE_LABELS, MEASURE_LABELS, PROVENANCE_LABELS } from '../lib/miti'
import { ISSUE_TYPES, PROVENANCES, type Issue } from '../lib/schema'

const NONE = '__none__'

type Column = 'id' | 'session' | 'type' | 'title' | 'node' | 'provenance' | 'aven' | 'created'
const SORT_VALUE: Record<Column, (i: Issue) => string | null> = {
  id: (i) => i.issue_id,
  session: (i) => i.session_id,
  type: (i) => ISSUE_TYPE_LABELS[i.type],
  title: (i) => i.title,
  node: (i) => i.node,
  provenance: (i) => PROVENANCE_LABELS[i.provenance],
  aven: (i) => i.aven_version,
  created: (i) => i.created_at,
}

const sessionLink = (issue: Issue, turn = issue.turns[0]) =>
  `/sessions/${encodeURIComponent(issue.session_id)}${turn ? `#turn-${turn}` : ''}`

export function IssuesPage() {
  const version = useDataVersion()
  const state = useAsync(() => Promise.all([listIssues(), listSessions()]), [version])
  const [params, setParams] = useSearchParams()
  const { sort, toggle } = useSort<Column>('id')

  const filters = {
    type: params.get('type') ?? '',
    node: params.get('node') ?? '',
    aven: params.get('aven') ?? '',
    provenance: params.get('provenance') ?? '',
    session: params.get('session') ?? '',
  }
  const setFilter = (key: keyof typeof filters, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const [issues, sessions] = state.status === 'ready' ? state.data : [[], []]
  const mockSessionIds = useMemo(() => new Set(sessions.filter((s) => s.is_mock).map((s) => s.session_id)), [sessions])
  const nodes = [...new Set(issues.map((i) => i.node).filter((n): n is string => n !== null))].sort()
  const avenVersions = [...new Set(issues.map((i) => i.aven_version).filter((v): v is string => v !== null))].sort()

  const matches = (value: string | null, filter: string) => !filter || (filter === NONE ? value === null : value === filter)
  const rows = issues
    .filter((i) => !filters.type || i.type === filters.type)
    .filter((i) => matches(i.node, filters.node))
    .filter((i) => matches(i.aven_version, filters.aven))
    .filter((i) => !filters.provenance || i.provenance === filters.provenance)
    .filter((i) => !filters.session || i.session_id === filters.session)
    .sort((a, b) => compareValues(SORT_VALUE[sort.key](a), SORT_VALUE[sort.key](b), sort.dir))

  const mockOnScreen = rows.some((i) => mockSessionIds.has(i.session_id))
  const anyFilter = Object.values(filters).some(Boolean)

  function exportCsv() {
    const headers = [
      'issue_id',
      'session_id',
      'session_is_mock',
      'type',
      'title',
      'detail',
      'measure_id',
      'node',
      'turns',
      'evidence_quote',
      'provenance',
      'aven_version',
      'coder_prompt_version',
      'model',
      'created_at',
    ]
    const csv = toCsv(
      headers,
      rows.map((i) => [
        i.issue_id,
        i.session_id,
        mockSessionIds.has(i.session_id),
        i.type,
        i.title,
        i.detail,
        i.measure_id,
        i.node,
        i.turns.join(';'),
        i.evidence_quote,
        i.provenance,
        i.aven_version,
        i.coder_prompt_version,
        i.model,
        i.created_at,
      ]),
    )
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`aven-issues${mockOnScreen ? '-MOCK' : ''}-${today}.csv`, csv)
  }

  return (
    <>
      {mockOnScreen && (
        <MockBanner detail="These issues come from invented sessions. They are not findings about real conversations." />
      )}
      <PageContainer>
        <PageTitle title="Issue log">
          Every problem the scorer found across the loaded sessions, with evidence. Click an issue to open its session at that
          turn.
        </PageTitle>

        {state.status === 'loading' && <Loading what="issues" />}
        {state.status === 'error' && (
          <ErrorPanel title="Couldn't load issues" message={state.error.message} details={state.error.details} />
        )}

        {state.status === 'ready' && (
          <>
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filter issues">
                <FilterSelect label="Type" value={filters.type} onChange={(v) => setFilter('type', v)}>
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ISSUE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Node" value={filters.node} onChange={(v) => setFilter('node', v)}>
                  <option value={NONE}>(no node)</option>
                  {nodes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Aven version" value={filters.aven} onChange={(v) => setFilter('aven', v)}>
                  <option value={NONE}>(none)</option>
                  {avenVersions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Provenance" value={filters.provenance} onChange={(v) => setFilter('provenance', v)}>
                  {PROVENANCES.map((p) => (
                    <option key={p} value={p}>
                      {PROVENANCE_LABELS[p]}
                    </option>
                  ))}
                </FilterSelect>
                {filters.session && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm dark:border-slate-600">
                    Session <code className="font-mono">{filters.session}</code>
                    <button type="button" onClick={() => setFilter('session', '')} aria-label="Remove session filter">
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {anyFilter && (
                  <button
                    type="button"
                    onClick={() => setParams({}, { replace: true })}
                    className={`${linkClass} pb-1.5 text-sm`}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={rows.length === 0}
                className={`${buttonClass} disabled:opacity-50`}
              >
                <Icon name="download" />
                Export CSV ({rows.length} row{rows.length === 1 ? '' : 's'})
              </button>
            </div>

            <p className="mb-2 text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
              Showing {rows.length} of {issues.length} issues. The CSV has every field, plus session_is_mock.
            </p>

            <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className={tableClass}>
                <caption className="sr-only">Issue log. Column headers with buttons sort the table.</caption>
                <thead className={theadClass}>
                  <tr>
                    <SortHeader
                      label="Issue"
                      column="id"
                      sort={sort}
                      onSort={toggle}
                      className="sticky left-0 bg-slate-50 dark:bg-slate-900"
                    />
                    <SortHeader label="Session" column="session" sort={sort} onSort={toggle} />
                    <SortHeader label="Type" column="type" sort={sort} onSort={toggle} />
                    <SortHeader label="Title" column="title" sort={sort} onSort={toggle} />
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Detail
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Measure
                    </th>
                    <SortHeader label="Node" column="node" sort={sort} onSort={toggle} />
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Turns
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Evidence
                    </th>
                    <SortHeader label="Provenance" column="provenance" sort={sort} onSort={toggle} />
                    <SortHeader label="Aven ver." column="aven" sort={sort} onSort={toggle} />
                    <th scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      Coder prompt
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Model
                    </th>
                    <SortHeader label="Created" column="created" sort={sort} onSort={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-3 py-8 text-center text-slate-600 dark:text-slate-400">
                        {issues.length === 0 ? 'No issues in the loaded sessions.' : 'No issues match these filters.'}
                      </td>
                    </tr>
                  )}
                  {rows.map((i) => (
                    <tr key={i.issue_id} className={rowClass}>
                      <th
                        scope="row"
                        className={`${cellClass} sticky left-0 bg-white text-left font-normal whitespace-nowrap dark:bg-slate-900`}
                      >
                        <Link to={sessionLink(i)} className={`${linkClass} font-mono`}>
                          {i.issue_id}
                        </Link>
                      </th>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <Link to={`/sessions/${encodeURIComponent(i.session_id)}`} className={`${linkClass} font-mono text-xs`}>
                          {i.session_id}
                        </Link>
                        {mockSessionIds.has(i.session_id) && (
                          <span className="ml-1.5">
                            <MockTag />
                          </span>
                        )}
                      </td>
                      <td className={cellClass}>
                        <IssueTypeBadge type={i.type} />
                      </td>
                      <td className={`${cellClass} min-w-48 font-medium`}>{i.title}</td>
                      <td className={`${cellClass} min-w-64 text-slate-700 dark:text-slate-300`}>{i.detail}</td>
                      <td className={`${cellClass} text-xs whitespace-nowrap`}>
                        {i.measure_id ? (
                          (MEASURE_LABELS[i.measure_id] ?? i.measure_id)
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className={`${cellClass} font-mono text-xs whitespace-nowrap`}>
                        {i.node ?? <span className="text-slate-500">—</span>}
                      </td>
                      <td className={`${cellClass} min-w-36`}>
                        <span className="flex flex-wrap gap-x-2 gap-y-1">
                          {i.turns.map((t) => (
                            <Link
                              key={t}
                              to={sessionLink(i, t)}
                              className={`${linkClass} font-mono text-xs`}
                              aria-label={`${i.session_id} turn ${t}`}
                            >
                              T{t}
                            </Link>
                          ))}
                        </span>
                      </td>
                      <td className={`${cellClass} min-w-56 text-slate-700 italic dark:text-slate-300`}>
                        {i.evidence_quote ? `“${i.evidence_quote}”` : <span className="text-slate-500 not-italic">—</span>}
                      </td>
                      <td className={cellClass}>
                        <ProvenanceBadge provenance={i.provenance} />
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        {i.aven_version ?? <span className="text-slate-500">—</span>}
                      </td>
                      <td className={`${cellClass} font-mono text-xs whitespace-nowrap`}>{i.coder_prompt_version}</td>
                      <td className={`${cellClass} font-mono text-xs whitespace-nowrap`}>{i.model}</td>
                      <td className={`${cellClass} text-xs whitespace-nowrap`}>{formatTimestamp(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageContainer>
    </>
  )
}
