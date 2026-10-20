import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { LoadResultsButton } from '../components/LoadResultsButton'
import {
  Card,
  DemoPill,
  ErrorPanel,
  Loading,
  PageContainer,
  PageHero,
  ProvenancePill,
  Segmented,
  secondaryButton,
} from '../components/ui'
import { clearLoadedSessions, listDataProblems, listSessions, loadedCount } from '../lib/data'
import { formatMeasureValue } from '../lib/format'
import { useAsync, useDataVersion } from '../lib/hooks'
import { SOURCE_COPY, topicLabel } from '../lib/miti'
import type { ScoredSession } from '../lib/schema'

type Show = 'all' | 'problems' | 'clean'

export function ConversationsPage() {
  const version = useDataVersion()
  const state = useAsync(() => listSessions(), [version])
  const [show, setShow] = useState<Show>('all')

  const sessions = state.status === 'ready' ? state.data : []
  const existingIds = useMemo(() => new Set(sessions.map((s) => s.session_id)), [sessions])
  const anyMock = sessions.some((s) => s.is_mock)
  const mixed = anyMock && sessions.some((s) => !s.is_mock)
  useDemoNotice(anyMock)

  const withProblems = sessions.filter((s) => s.issues.length > 0)
  const visible = (
    show === 'problems' ? withProblems : show === 'clean' ? sessions.filter((s) => s.issues.length === 0) : sessions
  )
    .slice()
    .sort((a, b) => b.issues.length - a.issues.length || a.session_id.localeCompare(b.session_id))
  const problems = listDataProblems()

  return (
    <PageContainer>
      <PageHero eyebrow="Coaching quality review" title="How well did the coach" accent="listen?">
        Each conversation is scored on Motivational Interviewing: does the coach listen, ask good questions, and help people find
        their own reasons to change? Pick one to see what happened and why.
      </PageHero>

      {problems.map((p) => (
        <div key={p.file} className="mb-4">
          <ErrorPanel title={`${p.file} was skipped`} message="It doesn't match the expected format." details={p.details} />
        </div>
      ))}

      {state.status === 'loading' && <Loading what="conversations" />}
      {state.status === 'error' && (
        <ErrorPanel title="Couldn't load conversations" message={state.error.message} details={state.error.details} />
      )}

      {state.status === 'ready' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Segmented<Show>
              label="Show conversations"
              value={show}
              onChange={setShow}
              options={[
                { value: 'all', label: 'All', count: sessions.length },
                { value: 'problems', label: 'Has problems', count: withProblems.length },
                { value: 'clean', label: 'No problems', count: sessions.length - withProblems.length },
              ]}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <LoadResultsButton existingIds={existingIds} />
              {loadedCount() > 0 && (
                <button type="button" className={secondaryButton} onClick={clearLoadedSessions}>
                  Close opened files
                </button>
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <Card className="p-10 text-center text-navy-500">No conversations here.</Card>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {visible.map((s) => (
                <li key={s.session_id}>
                  <ConversationCard session={s} showDemo={mixed && s.is_mock} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  )
}

function ConversationCard({ session, showDemo }: { session: ScoredSession; showDemo: boolean }) {
  const n = session.issues.length
  const measure = (id: string) => session.measures.find((m) => m.id === id)
  const scores = [
    { label: 'Relationship', m: measure('relational'), suffix: ' / 5' },
    { label: 'Technique', m: measure('technical'), suffix: ' / 5' },
    { label: 'Pushy moments', m: measure('total_mina'), suffix: '' },
  ]
  return (
    <Link
      to={`/sessions/${encodeURIComponent(session.session_id)}`}
      className="group block h-full rounded-2xl transition hover:-translate-y-0.5"
      aria-label={`${topicLabel(session.target_behavior)}: ${n === 0 ? 'no problems found' : `${n} problems found`}. Open conversation.`}
    >
      <Card className="flex h-full flex-col p-6 transition group-hover:shadow-[0_18px_40px_-18px_rgba(16,47,77,0.35)]">
        <div className="flex flex-wrap items-center gap-2">
          <ProvenancePill provenance={session.provenance} />
          {showDemo && <DemoPill />}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy-900">{topicLabel(session.target_behavior)}</h2>
        <p className="mt-1 text-sm text-navy-500">
          {SOURCE_COPY[session.source]}
          {session.aven_version && ` ${session.aven_version}`} · {session.turns.length} messages
        </p>

        <p className={`mt-5 flex items-center gap-2 text-base font-semibold ${n === 0 ? 'text-green-700' : 'text-brand-700'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${n === 0 ? 'bg-green-100' : 'bg-brand-100'}`}>
            <Icon name={n === 0 ? 'check' : 'alert'} className="h-3.5 w-3.5" />
          </span>
          {n === 0 ? 'No problems found' : `${n} problem${n === 1 ? '' : 's'} found`}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-navy-100 pt-4">
          {scores.map(({ label, m, suffix }) => (
            <div key={label}>
              <dt className="text-xs text-navy-500">{label}</dt>
              <dd className="mt-0.5 text-lg font-bold text-navy-900">
                {m ? formatMeasureValue(m.id, m.value) : '—'}
                {m && m.value !== null && <span className="text-sm font-medium text-navy-500">{suffix}</span>}
                {m?.status === 'fail' && <span className="sr-only"> (goal missed)</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-auto flex items-center justify-between pt-5 text-sm">
          <span className="font-mono text-xs text-navy-500">{session.session_id}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
            View <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </p>
      </Card>
    </Link>
  )
}
