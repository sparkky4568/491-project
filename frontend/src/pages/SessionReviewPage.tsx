import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { MockBanner } from '../components/MockBanner'
import { ErrorPanel, Loading, PageContainer, linkClass } from '../components/ui'
import { getSession, getThresholds } from '../lib/data'
import { useAsync, useDataVersion, usePrefersReducedMotion } from '../lib/hooks'
import type { Issue, ScoredSession, ThresholdConfig } from '../lib/schema'
import { SHOW_ALL, TranscriptFilters, matchesFilter, type TurnFilter } from './session/filters'
import { FlagsPanel, GlobalsPanel, IssuesPanel, MeasuresPanel } from './session/panels'
import { SessionHeader } from './session/SessionHeader'
import { TranscriptTurn, type EvidenceKey } from './session/TranscriptTurn'
import { TurnNavContext } from './session/turnNav'

/** Route wrapper: a fresh page (and fresh filter/highlight state) per session id. */
export function SessionReviewRoute() {
  const { id = '' } = useParams()
  return <SessionReviewPage key={id} id={id} />
}

function SessionReviewPage({ id }: { id: string }) {
  const version = useDataVersion()
  const session = useAsync(() => getSession(id), [id, version])
  const thresholds = useAsync(() => getThresholds(), [])

  if (session.status === 'loading') return <Loading what="session" />
  if (session.status === 'error') {
    return (
      <PageContainer>
        <ErrorPanel title="Couldn't load this session" message={session.error.message} details={session.error.details} />
      </PageContainer>
    )
  }
  if (!session.data) {
    return (
      <PageContainer>
        <h1 className="text-xl font-semibold">Session not found</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          There is no session with id <code className="font-mono">{id}</code>. Sessions loaded from a file are cleared when the
          page reloads.{' '}
          <Link to="/" className={linkClass}>
            Back to sessions
          </Link>
        </p>
      </PageContainer>
    )
  }
  return <SessionReview session={session.data} thresholds={thresholds.status === 'ready' ? thresholds.data : null} />
}

function SessionReview({ session, thresholds }: { session: ScoredSession; thresholds: ThresholdConfig | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()

  const [filter, setFilter] = useState<TurnFilter>(SHOW_ALL)
  const [open, setOpen] = useState<{ turn: number; key: EvidenceKey } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ turn: number; nonce: number } | null>(null)
  const [flashTurn, setFlashTurn] = useState<number | null>(null)

  const issuesByTurn = useMemo(() => {
    const map = new Map<number, Issue[]>()
    for (const issue of session.issues) {
      for (const t of issue.turns) map.set(t, [...(map.get(t) ?? []), issue])
    }
    return map
  }, [session])
  const issueTurns = useMemo(() => new Set(issuesByTurn.keys()), [issuesByTurn])
  const visibleTurns = session.turns.filter((t) => matchesFilter(t, filter, issueTurns))

  /** Scroll to a turn, flash it and move focus there. Clears the filter if it hides the turn. */
  const focusTurn = useCallback(
    (turnNumber: number) => {
      const turn = session.turns.find((t) => t.turn === turnNumber)
      if (!turn) return
      setFilter((current) => (matchesFilter(turn, current, issueTurns) ? current : SHOW_ALL))
      setFocusRequest({ turn: turnNumber, nonce: Date.now() })
      navigate({ hash: `turn-${turnNumber}` }, { replace: true, preventScrollReset: true })
    },
    [session, issueTurns, navigate],
  )

  useEffect(() => {
    if (!focusRequest) return
    const el = document.getElementById(`turn-${focusRequest.turn}`)
    if (!el) return
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    setFlashTurn(focusRequest.turn)
    const timer = window.setTimeout(() => setFlashTurn(null), 1800)
    return () => window.clearTimeout(timer)
  }, [focusRequest, reducedMotion])

  // Deep links like /sessions/MOCK-AVEN-003#turn-7 (from the issue log) land on the turn.
  const initialHash = useRef(location.hash)
  useEffect(() => {
    const match = /^#turn-(\d+)$/.exec(initialHash.current)
    if (match) focusTurn(Number(match[1]))
    initialHash.current = ''
  }, [focusTurn])

  const toggleEvidence = useCallback((turn: number, key: EvidenceKey) => {
    setOpen((current) => (current && current.turn === turn && current.key === key ? null : { turn, key }))
  }, [])

  const showIssue = useCallback(
    (issueId: string) => {
      const el = document.getElementById(`issue-${issueId}`)
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    },
    [reducedMotion],
  )

  // Show "… n turns hidden" markers between visible turns when a filter is on.
  const rows: Array<{ kind: 'turn'; index: number } | { kind: 'gap'; count: number; key: string }> = []
  let lastIndex = -1
  session.turns.forEach((turn, index) => {
    if (!visibleTurns.includes(turn)) return
    if (index - lastIndex > 1) rows.push({ kind: 'gap', count: index - lastIndex - 1, key: `gap-${index}` })
    rows.push({ kind: 'turn', index })
    lastIndex = index
  })
  if (filter.kind !== 'all' && session.turns.length - 1 > lastIndex) {
    rows.push({ kind: 'gap', count: session.turns.length - 1 - lastIndex, key: 'gap-end' })
  }

  return (
    <TurnNavContext.Provider value={focusTurn}>
      {session.is_mock && <MockBanner />}
      <PageContainer>
        <SessionHeader session={session} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section aria-labelledby="transcript-title" className="min-w-0">
            <h2 id="transcript-title" className="sr-only">
              Transcript
            </h2>
            <TranscriptFilters
              turns={session.turns}
              filter={filter}
              onChange={setFilter}
              issueTurns={issueTurns}
              visibleCount={visibleTurns.length}
            />
            <ol className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {rows.map((row) =>
                row.kind === 'gap' ? (
                  <li
                    key={row.key}
                    className="border-y border-dashed border-slate-200 bg-slate-50 px-4 py-1 text-center text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                  >
                    ⋯ {row.count} turn{row.count === 1 ? '' : 's'} hidden by filter
                  </li>
                ) : (
                  <TranscriptTurn
                    key={session.turns[row.index].turn}
                    turn={session.turns[row.index]}
                    openKey={open && open.turn === session.turns[row.index].turn ? open.key : null}
                    onToggle={toggleEvidence}
                    flashing={flashTurn === session.turns[row.index].turn}
                    issues={issuesByTurn.get(session.turns[row.index].turn) ?? []}
                    onIssueClick={showIssue}
                  />
                ),
              )}
            </ol>
          </section>

          <aside id="scores" aria-label="Scores, flags and issues" className="min-w-0 scroll-mt-16">
            <div className="space-y-4 lg:sticky lg:top-14 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto lg:pr-1 lg:pb-4">
              <MeasuresPanel session={session} thresholds={thresholds} />
              <GlobalsPanel session={session} thresholds={thresholds} />
              <FlagsPanel session={session} thresholds={thresholds} />
              <IssuesPanel session={session} />
            </div>
          </aside>
        </div>
      </PageContainer>
    </TurnNavContext.Provider>
  )
}
