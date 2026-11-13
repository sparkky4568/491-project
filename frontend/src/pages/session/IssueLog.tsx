import { Fragment, useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Card, EmptyState, EntryTypePill, chipClass, focusRing, secondaryButton } from '../../components/ui'
import { downloadIssueLog } from '../../lib/download'
import { formatObserved, splitEvidence } from '../../lib/format'
import { ENTRY_TYPE_COPY, itemLabel } from '../../lib/miti'
import { ENTRY_TYPES, ISSUE_LOG_COLUMNS, type EntryType, type IssueLogEntry, type ScoredSession } from '../../lib/schema'
import { TurnLink } from './turnNav'

export type IssueFilter = 'all' | EntryType

const rowDomId = (entryId: string) => `issue-${entryId}`

/** The issue-log rows for this session (deliv s10): exactly the sponsor's 16 columns. Unranked, in entry_id order. */
export function IssueLog({
  session,
  filter,
  onFilter,
  expandEntry = null,
}: {
  session: ScoredSession
  filter: IssueFilter
  onFilter: (f: IssueFilter) => void
  /** An entry to open and scroll to (from "Open issue-log row"). */
  expandEntry?: string | null
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(expandEntry ? [expandEntry] : []))
  const issues = [...session.issues].sort((a, b) => a.entry_id.localeCompare(b.entry_id, undefined, { numeric: true }))
  const rows = filter === 'all' ? issues : issues.filter((i) => i.entry_type === filter)
  const count = (type: EntryType) => issues.filter((i) => i.entry_type === type).length
  const toggle = (id: string) =>
    setExpanded((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  useEffect(() => {
    if (!expandEntry) return
    document.getElementById(rowDomId(expandEntry))?.scrollIntoView({ block: 'center' })
  }, [expandEntry])

  const download = (format: 'csv' | 'jsonl') => downloadIssueLog(session.issues, session.scorer.run_id, format)

  return (
    <section aria-labelledby="issue-log-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="issue-log-title" className="type-h2 text-ink">
            Issue log
          </h2>
          <p className="mt-1 type-small text-ink-2">
            Exactly the sponsor's 16 columns (deliv s10). It records what was found, not what to change; nothing is ranked and
            there is no severity.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button type="button" className={secondaryButton} onClick={() => download('csv')}>
            <Icon name="download" />
            Download CSV
          </button>
          <button type="button" className={secondaryButton} onClick={() => download('jsonl')}>
            <Icon name="download" />
            Download JSONL
          </button>
        </div>
      </div>

      {issues.length === 0 ? (
        <EmptyState title="Nothing for the issue log">
          Every measure meets its threshold and no flow flag or Table D hit was found. Downloads still produce a header-only CSV
          and an empty JSONL file, so the run is on record.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Filter the issue log by type" className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={filter === 'all'}
                className={chipClass(filter === 'all')}
                onClick={() => onFilter('all')}
              >
                All <span className="tabular-nums">{issues.length}</span>
              </button>
              {ENTRY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={filter === type}
                  disabled={count(type) === 0}
                  className={chipClass(filter === type)}
                  onClick={() => onFilter(type)}
                >
                  {ENTRY_TYPE_COPY[type].label} <span className="tabular-nums">{count(type)}</span>
                </button>
              ))}
            </div>
            <p className="type-caption text-muted lg:ml-auto">
              Shown in entry_id order. 8 of 16 columns in the table; expand a row for all 16.
            </p>
          </div>

          {/* Wide screens: a table with expandable rows. */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[880px] text-left type-small">
              <caption className="sr-only">
                Issue-log rows{filter === 'all' ? '' : `, ${ENTRY_TYPE_COPY[filter].label} only`}, in entry_id order
              </caption>
              <thead className="bg-subtle type-caption text-muted">
                <tr>
                  <th scope="col" className="w-10 py-2.5 pl-4">
                    <span className="sr-only">Expand</span>
                  </th>
                  {['entry_id', 'entry_type', 'item', 'observed', 'threshold', 'turns', 'evidence'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {rows.map((entry) => {
                  const open = expanded.has(entry.entry_id)
                  const shown = formatObserved(entry, session.measures)
                  return (
                    <Fragment key={entry.entry_id}>
                      <tr id={rowDomId(entry.entry_id)} className={`align-top ${open ? 'bg-info-bg' : ''}`}>
                        <td className="py-3 pl-4">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`${rowDomId(entry.entry_id)}-all`}
                            onClick={() => toggle(entry.entry_id)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md text-ink-2 hover:bg-subtle ${focusRing}`}
                          >
                            <Icon name={open ? 'chevronDown' : 'chevronRight'} />
                            <span className="sr-only">
                              {open ? 'Hide' : 'Show'} all 16 columns for {entry.entry_id}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 type-mono whitespace-nowrap text-ink">{entry.entry_id}</td>
                        <td className="px-3 py-3">
                          <EntryTypePill type={entry.entry_type} />
                        </td>
                        <td className="px-3 py-3 text-ink">{itemLabel(entry.entry_type, entry.item).label}</td>
                        <td className="px-3 py-3 text-ink tabular-nums">
                          {shown ? shown.observed || entry.observed : <NotApplicable />}
                        </td>
                        <td className="px-3 py-3 text-ink tabular-nums">
                          {shown ? shown.threshold || entry.threshold : <NotApplicable />}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <TurnLink
                            turn={entry.turn_start}
                            className={`type-mono text-link hover:underline ${focusRing} rounded-sm`}
                          >
                            {entry.turn_start}-{entry.turn_end}
                            <span className="sr-only">, go to the conversation</span>
                          </TurnLink>
                        </td>
                        <td className="max-w-[22rem] px-3 py-3 pr-5">
                          <EvidencePreview text={entry.evidence} />
                        </td>
                      </tr>
                      {open && (
                        <tr id={`${rowDomId(entry.entry_id)}-all`} className="bg-subtle">
                          <td />
                          <td colSpan={7} className="px-3 py-4 pr-5">
                            <AllColumns entry={entry} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </Card>

          {/* Phones: stacked cards. */}
          <ul className="space-y-3 md:hidden">
            {rows.map((entry) => {
              const open = expanded.has(entry.entry_id)
              const shown = formatObserved(entry, session.measures)
              return (
                <li key={entry.entry_id} className="rounded-lg border border-line bg-surface p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-mono text-ink">{entry.entry_id}</span>
                    <EntryTypePill type={entry.entry_type} />
                  </div>
                  <p className="mt-2 type-h3 text-ink">{itemLabel(entry.entry_type, entry.item).label}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-3 type-small">
                    <div>
                      <dt className="type-caption text-muted">observed</dt>
                      <dd className="text-ink">{shown ? shown.observed || entry.observed : <NotApplicable />}</dd>
                    </div>
                    <div>
                      <dt className="type-caption text-muted">threshold</dt>
                      <dd className="text-ink">{shown ? shown.threshold || entry.threshold : <NotApplicable />}</dd>
                    </div>
                    <div>
                      <dt className="type-caption text-muted">turns</dt>
                      <dd>
                        <TurnLink turn={entry.turn_start} className={`type-mono text-link ${focusRing} rounded-sm`}>
                          {entry.turn_start}-{entry.turn_end}
                        </TurnLink>
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <EvidencePreview text={entry.evidence} />
                  </div>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(entry.entry_id)}
                    className={`mt-3 inline-flex min-h-11 items-center gap-1 type-small-strong text-link ${focusRing} rounded-sm`}
                  >
                    <Icon name={open ? 'chevronDown' : 'chevronRight'} />
                    {open ? 'Hide' : 'Show'} all 16 columns
                  </button>
                  {open && (
                    <div className="mt-2 rounded-md bg-subtle p-3">
                      <AllColumns entry={entry} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {issues.some((i) => i.entry_type === 'TABLE_D') && (
            <p className="type-caption text-muted">
              Table D rows have no observed or threshold value (deliv s10). The table shows "n/a" (read as "not applicable"); the
              CSV leaves the cells blank.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function NotApplicable() {
  return (
    <span className="text-muted" aria-label="not applicable">
      n/a
    </span>
  )
}

function EvidencePreview({ text }: { text: string }) {
  const quotes = splitEvidence(text)
  if (quotes.length === 0) return <span className="text-muted">No quote</span>
  const first = quotes[0].text
  return (
    <p className="text-ink">
      <span className="line-clamp-3">"{first}"</span>
      {quotes.length > 1 && (
        <span className="type-caption text-muted">
          {' '}
          and {quotes.length - 1} more quote{quotes.length === 2 ? '' : 's'}
        </span>
      )}
    </p>
  )
}

/** All 16 columns, verbatim, in ISSUE_LOG_COLUMNS order. */
function AllColumns({ entry }: { entry: IssueLogEntry }) {
  return (
    <div>
      <p className="type-overline text-muted">All 16 columns</p>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {ISSUE_LOG_COLUMNS.map((col) => {
          const value = entry[col]
          return (
            <div key={col} className={col === 'evidence' ? 'sm:col-span-2 lg:col-span-4' : ''}>
              <dt className="type-mono text-muted">{col}</dt>
              <dd className="mt-0.5 type-small break-words whitespace-pre-wrap text-ink">
                {value === null || value === '' ? <span className="text-muted">(blank)</span> : String(value)}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
