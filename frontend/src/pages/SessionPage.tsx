import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDemoNotice } from '../components/Layout'
import { ErrorPanel, Skeleton, secondaryButton } from '../components/ui'
import { useConnection } from '../lib/connection'
import { DataError } from '../lib/data'
import { usePrefersReducedMotion } from '../lib/hooks'
import { hrefFor, navigate, type SessionTab } from '../lib/router'
import { useRuns, type RunEntry } from '../lib/runs'
import type { EntryType } from '../lib/schema'
import { issuesByVolley } from '../lib/sessionStats'
import { Details, OverallRatings } from './session/Details'
import { FlowFlags } from './session/FlowFlags'
import { IssueLog, type IssueFilter } from './session/IssueLog'
import { SessionHeader } from './session/SessionHeader'
import { SessionTabs, panelId, tabId } from './session/SessionTabs'
import { Summary } from './session/Summary'
import { TableD } from './session/TableD'
import { Transcript, matchesFilter, type EvidenceKey, type VolleyFilter } from './session/Transcript'
import { TurnNavContext, volleyDomId } from './session/turnNav'

type Lookup = { status: 'ready'; entry: RunEntry } | { status: 'loading' } | { status: 'missing'; error?: DataError }

/** One session: header card, tabs and the tab's panel. Route: #/session/{id}/{tab}. */
export function SessionPage({ sessionId, tab }: { sessionId: string; tab: SessionTab }) {
  const runs = useRuns()
  const { connection } = useConnection()
  const entry = runs.get(sessionId)
  const [fetchError, setFetchError] = useState<DataError | null>(null)
  const [fetching, setFetching] = useState(false)
  const live = connection.kind === 'live'
  const syncing = runs.apiSync.status === 'loading'

  // A deep link to a session that is not open yet: ask the live API for it.
  useEffect(() => {
    if (entry || !live || syncing || fetchError || fetching) return
    setFetching(true)
    runs
      .fetchStored(sessionId)
      .catch((err: unknown) =>
        setFetchError(err instanceof DataError ? err : new DataError(err instanceof Error ? err.message : String(err))),
      )
      .finally(() => setFetching(false))
  }, [entry, live, syncing, fetchError, fetching, runs, sessionId])

  const lookup: Lookup = entry
    ? { status: 'ready', entry }
    : fetching || syncing || connection.kind === 'checking'
      ? { status: 'loading' }
      : { status: 'missing', error: fetchError ?? undefined }

  if (lookup.status === 'loading') return <Skeleton label={`Opening ${sessionId}...`} />
  if (lookup.status === 'missing')
    return (
      <ErrorPanel
        title={`Session ${sessionId} is not open`}
        message={
          lookup.error
            ? lookup.error.message
            : 'Sessions live in this browser tab only. Load its scored file again, or open it from the scorer API when it is live.'
        }
        details={lookup.error?.details}
      >
        <a href={hrefFor({ page: 'runs' })} className={`mt-4 ${secondaryButton}`}>
          Back to Runs
        </a>
      </ErrorPanel>
    )
  return <SessionView entry={lookup.entry} tab={tab} />
}

function SessionView({ entry, tab }: { entry: RunEntry; tab: SessionTab }) {
  const session = entry.session
  const reducedMotion = usePrefersReducedMotion()
  const notScoreable = session.scoreability.state === 'not_scoreable'
  useDemoNotice(entry.origin === 'practice' ? 'practice' : session.is_mock ? 'mock' : null)

  const tabs: SessionTab[] = notScoreable
    ? ['summary', 'transcript', 'details']
    : ['summary', 'transcript', 'flow', 'clinician', 'issues', 'details']
  const active = tabs.includes(tab) ? tab : 'summary'

  const [filter, setFilter] = useState<VolleyFilter>('all')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')
  const [open, setOpen] = useState<{ volley: number; key: EvidenceKey } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ volley: number; nonce: number } | null>(null)
  const [flashVolley, setFlashVolley] = useState<number | null>(null)

  const turnToVolley = useMemo(() => new Map(session.turns.map((t) => [t.turn, t.volley])), [session])
  const safetyVolleys = useMemo(() => new Set(session.safety_volleys), [session])
  const byVolley = useMemo(() => issuesByVolley(session), [session])

  const goTab = useCallback(
    (next: SessionTab) => navigate({ page: 'session', sessionId: session.session_id, tab: next }),
    [session.session_id],
  )

  const focusTurn = useCallback(
    (turn: number) => {
      const volley = session.volleys.find((v) => v.volley === turnToVolley.get(turn))
      if (!volley) return
      setFilter((f) => (matchesFilter(volley, f, new Set(byVolley.keys()), safetyVolleys) ? f : 'all'))
      setFocusRequest({ volley: volley.volley, nonce: Date.now() })
      if (active !== 'transcript') goTab('transcript')
    },
    [session, turnToVolley, byVolley, safetyVolleys, active, goTab],
  )

  useEffect(() => {
    if (!focusRequest || active !== 'transcript') return
    const el = document.getElementById(volleyDomId(focusRequest.volley))
    if (!el) return
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    setFlashVolley(focusRequest.volley)
    setFocusRequest(null)
    const timer = window.setTimeout(() => setFlashVolley(null), 1800)
    return () => window.clearTimeout(timer)
  }, [focusRequest, active, reducedMotion])

  const toggleEvidence = useCallback((volley: number, key: EvidenceKey) => {
    setOpen((cur) => (cur && cur.volley === volley && cur.key === key ? null : { volley, key }))
  }, [])

  const [expandEntry, setExpandEntry] = useState<string | null>(null)
  const showIssues = useCallback(
    (type: EntryType) => {
      setIssueFilter(type)
      setExpandEntry(null)
      goTab('issues')
    },
    [goTab],
  )
  const openIssue = useCallback(
    (entryId: string) => {
      setIssueFilter('all')
      setExpandEntry(entryId)
      goTab('issues')
    },
    [goTab],
  )

  const navValue = useMemo(
    () => ({ focusTurn, href: hrefFor({ page: 'session', sessionId: session.session_id, tab: 'transcript' }) }),
    [focusTurn, session.session_id],
  )

  return (
    <TurnNavContext.Provider value={navValue}>
      <div className="space-y-6">
        <a href={hrefFor({ page: 'runs' })} className="inline-flex items-center gap-1 type-small-strong text-link lg:hidden">
          <span aria-hidden="true">&lt;</span> Runs
        </a>
        <SessionHeader entry={entry} />
        <SessionTabs tabs={tabs} active={active} onSelect={goTab} />
        <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)} tabIndex={-1} className="outline-none">
          {active === 'summary' && <Summary session={session} onShowIssues={showIssues} onShowTab={goTab} />}
          {active === 'transcript' && (
            <Transcript
              session={session}
              safetyVolleys={safetyVolleys}
              filter={filter}
              onFilter={setFilter}
              issuesByVolley={byVolley}
              open={open}
              onToggle={toggleEvidence}
              onClose={() => setOpen(null)}
              flashVolley={flashVolley}
              onShowIssues={showIssues}
            />
          )}
          {active === 'flow' && <FlowFlags session={session} />}
          {active === 'clinician' && <TableD session={session} onOpenIssue={openIssue} />}
          {active === 'issues' && (
            <IssueLog
              key={expandEntry ?? ''}
              session={session}
              filter={issueFilter}
              onFilter={setIssueFilter}
              expandEntry={expandEntry}
            />
          )}
          {active === 'details' && (
            <div className="space-y-10">
              {!notScoreable && <OverallRatings session={session} />}
              <Details entry={entry} />
            </div>
          )}
        </div>
      </div>
    </TurnNavContext.Provider>
  )
}
