import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import {
  Card,
  ErrorPanel,
  IssueTypePill,
  Loading,
  PageContainer,
  PageHero,
  ProvenancePill,
  Segmented,
  secondaryButton,
} from '../components/ui'
import { downloadCsv, toCsv } from '../lib/csv'
import { listIssues, listSessions } from '../lib/data'
import { useAsync, useDataVersion } from '../lib/hooks'
import { ISSUE_TYPE_COPY, topicLabel } from '../lib/miti'
import { ISSUE_TYPES, type Issue, type IssueType } from '../lib/schema'

type Show = 'all' | IssueType

const CSV_FIELDS = [
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

export function ProblemsPage() {
  const version = useDataVersion()
  const state = useAsync(() => Promise.all([listIssues(), listSessions()]), [version])
  const [show, setShow] = useState<Show>('all')

  const [issues, sessions] = state.status === 'ready' ? state.data : [[], []]
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.session_id, s])), [sessions])
  const rows = show === 'all' ? issues : issues.filter((i) => i.type === show)
  const isMock = (i: Issue) => sessionById.get(i.session_id)?.is_mock ?? false
  useDemoNotice(issues.some(isMock))

  function exportCsv() {
    const csv = toCsv(
      CSV_FIELDS,
      rows.map((i) => [
        i.issue_id,
        i.session_id,
        isMock(i),
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
    downloadCsv(`aven-problems${rows.some(isMock) ? '-DEMO' : ''}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <PageContainer>
      <PageHero eyebrow="Problems" title="Everything that needs" accent="a look.">
        Every problem the scorer found, across all conversations. Open one to see the exact moment it happened.
      </PageHero>

      {state.status === 'loading' && <Loading what="problems" />}
      {state.status === 'error' && (
        <ErrorPanel title="Couldn't load problems" message={state.error.message} details={state.error.details} />
      )}

      {state.status === 'ready' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Segmented<Show>
              label="Problem type"
              value={show}
              onChange={setShow}
              options={[
                { value: 'all', label: 'All', count: issues.length },
                ...ISSUE_TYPES.map((t) => ({
                  value: t,
                  label: ISSUE_TYPE_COPY[t].label,
                  count: issues.filter((i) => i.type === t).length,
                })),
              ]}
            />
            <button type="button" onClick={exportCsv} disabled={rows.length === 0} className={`${secondaryButton} ml-auto`}>
              <Icon name="download" /> Download spreadsheet
            </button>
          </div>

          {rows.length === 0 ? (
            <Card className="p-10 text-center text-navy-500">
              {issues.length === 0 ? 'No problems found. Nice.' : 'None of this type.'}
            </Card>
          ) : (
            <ul className="space-y-3">
              {rows.map((issue) => {
                const session = sessionById.get(issue.session_id)
                return (
                  <li key={issue.issue_id}>
                    <Card className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <IssueTypePill type={issue.type} />
                            <span className="text-sm text-navy-500">
                              in{' '}
                              <strong className="font-semibold text-navy-800">
                                {session ? topicLabel(session.target_behavior) : issue.session_id}
                              </strong>
                            </span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-navy-900">{issue.title}</p>
                          <p className="mt-0.5 text-navy-600">{issue.detail}</p>
                          {issue.evidence_quote && (
                            <p className="mt-2 border-l-2 border-brand-300 pl-3 text-navy-700 italic">“{issue.evidence_quote}”</p>
                          )}
                        </div>
                        <Link
                          to={`/sessions/${encodeURIComponent(issue.session_id)}${issue.turns[0] ? `#turn-${issue.turns[0]}` : ''}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-navy-800"
                        >
                          Show me <Icon name="arrowRight" className="h-4 w-4" />
                        </Link>
                      </div>
                      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
                        <ProvenancePill provenance={issue.provenance} />
                        <span className="font-mono">{issue.issue_id}</span>
                        <span>
                          {issue.model} · {issue.coder_prompt_version}
                        </span>
                      </p>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  )
}
