import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { ErrorPanel, Eyebrow, Loading, PageContainer, textLink } from '../components/ui'
import { getSession, getThresholds } from '../lib/data'
import { useAsync, useDataVersion, usePrefersReducedMotion } from '../lib/hooks'
import { PROVENANCE_COPY, SOURCE_COPY, topicLabel } from '../lib/miti'
import type { Issue, ScoredSession, ThresholdConfig } from '../lib/schema'
import { Details } from './session/Details'
import { Overview } from './session/Overview'
import { Transcript, matchesFilter, type EvidenceKey, type TurnFilter } from './session/Transcript'
import { TurnNavContext } from './session/turnNav'

/** Route wrapper: fresh state (tab, filter, highlight) for each conversation. */
export function ConversationRoute() {
  const { id = '' } = useParams()
  return <ConversationLoader key={id} id={id} />
}

function ConversationLoader({ id }: { id: string }) {
  const version = useDataVersion()
  const session = useAsync(() => getSession(id), [id, version])
  const thresholds = useAsync(() => getThresholds(), [])
  useDemoNotice(session.status === 'ready' && !!session.data?.is_mock)

  if (session.status === 'loading') return <Loading what="conversation" />
  if (session.status === 'error') {
    return (
      <PageContainer narrow>
        <div className="pt-10">
          <ErrorPanel title="Couldn't load this conversation" message={session.error.message} details={session.error.details} />
        </div>
      </PageContainer>
    )
  }
  if (!session.data) {
    return (
      <PageContainer narrow>
        <h1 className="pt-12 text-3xl font-bold">Conversation not found</h1>
        <p className="mt-2 text-navy-600">
          Nothing matches <code className="font-mono">{id}</code>. Files you opened yourself disappear when the page reloads.{' '}
          <Link to="/" className={textLink}>
            Back to all conversations
          </Link>
        </p>
      </PageContainer>
    )
  }
  return <Conversation session={session.data} thresholds={thresholds.status === 'ready' ? thresholds.data : null} />
}

type Tab = 'overview' | 'conversation' | 'details'

function Conversation({ session, thresholds }: { session: ScoredSession; thresholds: ThresholdConfig | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()
  const initialHash = useRef(location.hash)

  const [tab, setTab] = useState<Tab>(/^#turn-\d+$/.test(location.hash) ? 'conversation' : 'overview')
  const [filter, setFilter] = useState<TurnFilter>('all')
  const [open, setOpen] = useState<{ turn: number; key: EvidenceKey } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ turn: number; nonce: number } | null>(null)
  const [flashTurn, setFlashTurn] = useState<number | null>(null)

  const problemsByTurn = useMemo(() => {
    const map = new Map<number, Issue[]>()
    for (const issue of session.issues) for (const t of issue.turns) map.set(t, [...(map.get(t) ?? []), issue])
    return map
  }, [session])

  /** Open the Conversation tab at a message and highlight it. Clears a filter that would hide it. */
  const focusTurn = useCallback(
    (turnNumber: number) => {
      const turn = session.turns.find((t) => t.turn === turnNumber)
      if (!turn) return
      const problemTurns = new Set(problemsByTurn.keys())
      setTab('conversation')
      setFilter((f) => (matchesFilter(turn, f, problemTurns) ? f : 'all'))
      setFocusRequest({ turn: turnNumber, nonce: Date.now() })
      navigate({ hash: `turn-${turnNumber}` }, { replace: true, preventScrollReset: true })
    },
    [session, problemsByTurn, navigate],
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

  // Links like /sessions/MOCK-AVEN-003#turn-7 (from the Problems page) land on that message.
  useEffect(() => {
    const match = /^#turn-(\d+)$/.exec(initialHash.current)
    if (match) focusTurn(Number(match[1]))
    initialHash.current = ''
  }, [focusTurn])

  const toggleEvidence = useCallback((turn: number, key: EvidenceKey) => {
    setOpen((cur) => (cur && cur.turn === turn && cur.key === key ? null : { turn, key }))
  }, [])

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview', count: session.issues.length || undefined },
    { id: 'conversation', label: 'Conversation', count: session.turns.length },
    { id: 'details', label: 'Details' },
  ]
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    setTab(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <TurnNavContext.Provider value={focusTurn}>
      <PageContainer narrow>
        <header className="pt-8 pb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-navy-900">
            <Icon name="arrowLeft" className="h-4 w-4" /> All conversations
          </Link>
          <div className="mt-5">
            <Eyebrow>
              {PROVENANCE_COPY[session.provenance]} · {SOURCE_COPY[session.source]}
              {session.aven_version ? ` ${session.aven_version}` : ''}
            </Eyebrow>
          </div>
          <h1 className="mt-3 text-4xl leading-tight font-extrabold tracking-[-0.03em] text-navy-900 sm:text-5xl">
            {topicLabel(session.target_behavior)}
          </h1>
          <p className="mt-2 text-sm text-navy-500">
            {session.turns.length} messages · scored by <span className="font-mono">{session.scorer.model}</span> with prompt{' '}
            <span className="font-mono">{session.scorer.coder_prompt_version}</span>
          </p>
        </header>

        <div role="tablist" aria-label="Conversation sections" className="mb-8 flex gap-1 border-b border-navy-200">
          {tabs.map((t, i) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 text-sm font-semibold transition sm:px-4 sm:text-base ${
                  active ? 'border-brand-500 text-navy-900' : 'border-transparent text-navy-500 hover:text-navy-900'
                }`}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.id === 'overview' ? 'bg-brand-100 text-brand-800' : 'bg-navy-100 text-navy-700'
                    }`}
                  >
                    {t.count}
                    {t.id === 'overview' && <span className="sr-only"> problems</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'overview' && <Overview session={session} thresholds={thresholds} />}
          {tab === 'conversation' && (
            <Transcript
              turns={session.turns}
              filter={filter}
              onFilter={setFilter}
              problemsByTurn={problemsByTurn}
              open={open}
              onToggle={toggleEvidence}
              flashTurn={flashTurn}
            />
          )}
          {tab === 'details' && <Details session={session} />}
        </div>
      </PageContainer>
    </TurnNavContext.Provider>
  )
}
