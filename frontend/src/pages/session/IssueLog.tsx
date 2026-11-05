import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Card, EmptyState, EntryTypePill, SectionTitle, chipClass, secondaryButton } from '../../components/ui'
import { formatObserved, issueLogFileName, issuesToCsv, splitEvidence } from '../../lib/format'
import { ENTRY_TYPE_COPY, TABLE_D_INFO, itemLabel, nodeLabel } from '../../lib/miti'
import { ENTRY_TYPES, type EntryType, type IssueLogEntry, type ScoredSession } from '../../lib/schema'
import { TurnLink, TurnSpanLink } from './turnNav'

export type IssueFilter = 'all' | EntryType

function downloadCsv(session: ScoredSession) {
  const blob = new Blob([issuesToCsv(session.issues)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = issueLogFileName(session.scorer.run_id)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** The issue-log rows for this session (deliv s10). Unranked, in the order the scorer wrote them. */
export function IssueLog({
  session,
  filter,
  onFilter,
}: {
  session: ScoredSession
  filter: IssueFilter
  onFilter: (f: IssueFilter) => void
}) {
  const rows = filter === 'all' ? session.issues : session.issues.filter((i) => i.entry_type === filter)
  const count = (type: EntryType) => session.issues.filter((i) => i.entry_type === type).length

  return (
    <section id="issue-log" aria-labelledby="issue-log-title" className="scroll-mt-20">
      <SectionTitle
        id="issue-log-title"
        hint="The log records what was found, not what to change, and nothing in it is ranked."
        action={
          <button type="button" className={secondaryButton} onClick={() => downloadCsv(session)}>
            <Icon name="download" />
            Download CSV
          </button>
        }
      >
        Issue log
      </SectionTitle>

      {session.issues.length === 0 ? (
        <EmptyState title="Nothing reached the issue log.">
          No measure came in below its threshold, no flow flag was raised and no prohibited behavior was found. The CSV still
          downloads with its header row, so the run is on record.
        </EmptyState>
      ) : (
        <>
          <div role="group" aria-label="Filter the issue log by type" className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={filter === 'all'}
              className={chipClass(filter === 'all')}
              onClick={() => onFilter('all')}
            >
              All <span className="tabular-nums opacity-70">{session.issues.length}</span>
            </button>
            {ENTRY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={filter === type}
                disabled={count(type) === 0}
                className={`${chipClass(filter === type)} disabled:opacity-40`}
                onClick={() => onFilter(type)}
              >
                {ENTRY_TYPE_COPY[type].label}
                <span className="tabular-nums opacity-70">{count(type)}</span>
              </button>
            ))}
          </div>

          {/* Wide screens: a table. */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">
                Issue-log rows{filter === 'all' ? '' : `, ${ENTRY_TYPE_COPY[filter].label} only`}
              </caption>
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col />
              </colgroup>
              <thead className="bg-navy-50/70 text-xs font-semibold tracking-wide text-navy-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    What was found
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Observed
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Where
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 align-top">
                {rows.map((entry) => (
                  <tr key={entry.entry_id}>
                    <td className="px-4 py-4">
                      <ItemCell entry={entry} />
                    </td>
                    <td className="px-4 py-4">
                      <ObservedCell entry={entry} session={session} />
                    </td>
                    <td className="px-4 py-4">
                      <WhereCell entry={entry} />
                    </td>
                    <td className="px-4 py-4">
                      <Evidence text={entry.evidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Phones: stacked cards. */}
          <ul className="space-y-3 md:hidden">
            {rows.map((entry) => (
              <li key={entry.entry_id}>
                <Card className="space-y-3 p-4">
                  <ItemCell entry={entry} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Observed</p>
                      <div className="mt-1">
                        <ObservedCell entry={entry} session={session} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Where</p>
                      <div className="mt-1">
                        <WhereCell entry={entry} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-navy-500 uppercase">Evidence</p>
                    <div className="mt-1">
                      <Evidence text={entry.evidence} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function ItemCell({ entry }: { entry: IssueLogEntry }) {
  const { label, code } = itemLabel(entry.entry_type, entry.item)
  return (
    <div className="min-w-0">
      <EntryTypePill type={entry.entry_type} />
      <p className="mt-2 font-semibold text-navy-900">{label}</p>
      <p className="mt-0.5 font-mono text-xs break-all text-navy-500">{code}</p>
    </div>
  )
}

function ObservedCell({ entry, session }: { entry: IssueLogEntry; session: ScoredSession }) {
  const shown = formatObserved(entry, session.measures)
  if (!shown) return <p className="text-navy-500">Not applicable</p>
  return (
    <div className="tabular-nums">
      <p className="font-semibold text-navy-900">{shown.observed || 'n/a'}</p>
      {shown.threshold && <p className="mt-0.5 text-navy-500">Threshold: {shown.threshold}</p>}
    </div>
  )
}

function WhereCell({ entry }: { entry: IssueLogEntry }) {
  const nodes =
    entry.node_active
      ?.split(';')
      .map((n) => n.trim())
      .filter(Boolean) ?? []
  return (
    <div className="space-y-1.5">
      <TurnSpanLink start={entry.turn_start} end={entry.turn_end} />
      {nodes.length > 0 && (
        <p className="text-xs leading-relaxed break-words text-navy-500" title={nodes.map(nodeLabel).join(', ')}>
          <span className="sr-only">Node active: </span>
          {nodes.length <= 3
            ? nodes.map(nodeLabel).join(', ')
            : `${nodeLabel(nodes[0])} to ${nodeLabel(nodes[nodes.length - 1])} (${nodes.length} nodes)`}
        </p>
      )}
    </div>
  )
}

const QUOTES_SHOWN = 2

/** Evidence quotes. Session-level rows carry several, each prefixed "[turn N]". */
function Evidence({ text }: { text: string }) {
  const [all, setAll] = useState(false)
  const quotes = splitEvidence(text)
  if (quotes.length === 0) return <p className="text-navy-500">No quote</p>
  const shown = all ? quotes : quotes.slice(0, QUOTES_SHOWN)
  return (
    <div className="space-y-2">
      {shown.map((q, i) => (
        <blockquote key={i} className="border-l-2 border-brand-300 pl-3 text-sm leading-relaxed break-words text-navy-800">
          {q.turn !== null && (
            <TurnLink
              turn={q.turn}
              className="mr-1.5 text-xs font-semibold text-brand-700 underline underline-offset-2 not-italic"
            >
              Turn {q.turn}
            </TurnLink>
          )}
          <span className="italic">"{q.text}"</span>
        </blockquote>
      ))}
      {quotes.length > QUOTES_SHOWN && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((a) => !a)}
          className="text-xs font-semibold text-brand-700 underline underline-offset-4"
        >
          {all ? 'Show fewer' : `Show ${quotes.length - QUOTES_SHOWN} more`}
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------ Clinician review

/** Table D hits a clinician reads one by one: D1 and D7 always, D3 when the invented fact is clinical. */
export function ClinicianReview({ session }: { session: ScoredSession }) {
  const hits = session.table_d.filter((h) => h.clinician_review)
  if (hits.length === 0) return null
  return (
    <section aria-labelledby="clinician-title">
      <SectionTitle
        id="clinician-title"
        hint="By sponsor rule these are also read individually by a clinician: clinical advice and privacy always, a made-up fact when it is clinical."
      >
        For clinician review
      </SectionTitle>
      <ul className="space-y-3">
        {hits.map((hit) => {
          const info = TABLE_D_INFO[hit.code]
          return (
            <li key={`${hit.code}-${hit.volley}-${hit.turn_start}`}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200"
                    >
                      <Icon name="clipboard" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900">{info.label}</p>
                      <p className="font-mono text-xs text-navy-500">{info.official}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-navy-500">
                    {hit.node && <span>{nodeLabel(hit.node)}</span>}
                    <TurnSpanLink start={hit.turn_start} end={hit.turn_end} />
                  </div>
                </div>
                <blockquote className="mt-3 border-l-2 border-brand-300 pl-3 leading-relaxed break-words text-navy-800 italic">
                  "{hit.evidence_quote}"
                </blockquote>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  <span className="font-semibold text-navy-700">Scorer's reading:</span> {hit.rationale}
                </p>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
