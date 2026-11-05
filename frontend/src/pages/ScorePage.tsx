import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { ErrorPanel, PageContainer, PageHero, SectionTitle, primaryButton, secondaryButton } from '../components/ui'
import { DataError, listExamples, scoreConversation, usingRealScorer } from '../lib/data'
import { splitEvidence } from '../lib/format'
import { usePrefersReducedMotion } from '../lib/hooks'
import { MOMENT_MEASURES, canonicalMeasureId, topicLabel } from '../lib/miti'
import { parseConversationInput, transcriptToText } from '../lib/parseInput'
import type { EntryType, IssueLogEntry, ScoredSession, TranscriptIn } from '../lib/schema'
import { Details } from './session/Details'
import { FlowFlags } from './session/FlowFlags'
import { ClinicianReview, IssueLog, type IssueFilter } from './session/IssueLog'
import { NotScoreableCard, OverallRatings, Scores, SessionHeader, sessionTopic } from './session/Summary'
import { Transcript, matchesFilter, type EvidenceKey, type VolleyFilter } from './session/Transcript'
import { TurnNavContext, volleyDomId } from './session/turnNav'

const PLACEHOLDER = `Coach: What would you like to talk about today?
Caller: I keep meaning to cook at home more, but by evening I'm too tired.
Coach: Part of you wants home-cooked dinners, and the end of the day leaves nothing in the tank.
Caller: Yeah. Maybe weekends would be easier to start with.`

/** The whole app: paste a conversation, score it, see the results below. */
export function ScorePage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ScoredSession | null>(null)
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const examples = useMemo(() => listExamples(), [])
  const [example, setExample] = useState<TranscriptIn | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  useDemoNotice(!!result?.is_mock)

  async function score() {
    setError(null)
    // An untouched example is scored from its file, so it keeps its topic, timings, nodes and goal.
    const parsed =
      example && text === transcriptToText(example)
        ? { kind: 'transcript' as const, transcript: example }
        : parseConversationInput(text)
    if (parsed.kind === 'error') {
      setResult(null)
      setError(parsed)
      return
    }
    setBusy(true)
    try {
      setResult(parsed.kind === 'scored' ? parsed.session : await scoreConversation(parsed.transcript))
    } catch (err) {
      setResult(null)
      setError(err instanceof DataError ? err : { message: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  // Bring the results into view as soon as they appear.
  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [result, reducedMotion])

  function scoreAnother() {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    box.current?.focus({ preventScroll: true })
  }

  return (
    <PageContainer>
      <PageHero eyebrow="Coaching conversation scorer" title="Paste a conversation." accent="See what the scorer finds.">
        How the coach listened, what they did in each volley, and anything the sponsor's rules pick up.
      </PageHero>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void score()
        }}
        className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,47,77,0.04),0_10px_28px_-18px_rgba(16,47,77,0.22)] ring-1 ring-navy-900/5 sm:p-7"
      >
        <label htmlFor="conversation" className="block text-lg font-bold text-navy-900">
          Conversation
        </label>
        <p id="conversation-hint" className="mt-1 text-sm text-navy-500">
          Put each message on its own line, starting with <strong className="text-navy-800">Coach:</strong> or{' '}
          <strong className="text-navy-800">Caller:</strong> You can also paste transcript or scored JSON.
        </p>
        <textarea
          id="conversation"
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby={usingRealScorer ? 'conversation-hint' : 'conversation-hint practice-warning'}
          placeholder={PLACEHOLDER}
          rows={10}
          spellCheck={false}
          className="mt-3 block w-full resize-y rounded-xl bg-navy-50 px-4 py-3 font-sans text-[15px] leading-7 text-navy-900 ring-1 ring-navy-200 placeholder:text-navy-400 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
        />

        {!usingRealScorer && (
          <div
            id="practice-warning"
            className="mt-3 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-300"
          >
            <Icon name="alert" className="mt-0.5 h-5 w-5 text-amber-700" />
            <p>
              <strong className="font-semibold">Heads up: these scores are placeholders for now.</strong> The real AI scorer isn't
              connected yet, so the results come from simple keyword rules and can be wrong. Nothing you paste is saved or sent
              anywhere.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className={`${primaryButton} px-6 text-base`} disabled={busy}>
            {busy ? 'Scoring...' : 'Score it'}
            {!busy && <Icon name="arrowRight" />}
          </button>
          {text && (
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-navy-500 hover:text-navy-900"
              onClick={() => {
                setText('')
                setResult(null)
                setError(null)
                box.current?.focus()
              }}
            >
              Clear
            </button>
          )}
        </div>

        {examples.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4 text-sm">
            <span className="text-navy-500">No conversation handy? Try an example:</span>
            {examples.map((ex) => (
              <button
                key={ex.session_id}
                type="button"
                className="rounded-full bg-navy-50 px-3 py-1 font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-brand-50 hover:ring-brand-300"
                onClick={() => {
                  setText(transcriptToText(ex))
                  setExample(ex)
                  setResult(null)
                  setError(null)
                }}
              >
                {topicLabel(ex.change_goal.text ?? ex.target_behavior)}
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="mt-6">
          <ErrorPanel title="Can't score this yet" message={error.message} details={error.details} />
        </div>
      )}

      {result && (
        <div ref={resultsRef} className="scroll-mt-14 pt-12">
          <Results key={`${result.session_id}-${result.scorer.scored_at}`} session={result} onScoreAnother={scoreAnother} />
        </div>
      )}
    </PageContainer>
  )
}

/**
 * Coded agent volleys an issue-log row points at: the volleys its "[turn N]" quotes name, plus its span for
 * single-volley rows (Table D and MI Non-Adherent). Table C runs and windows are tagged only through their quotes,
 * so volleys inside the span that are not part of the run (safety node, greetings, fragments) are never tagged.
 */
function issueVolleys(issue: IssueLogEntry, turnToVolley: Map<number, number>, codedAgent: Set<number>): number[] {
  const out = new Set<number>()
  const singleVolley = issue.entry_type === 'TABLE_D' || MOMENT_MEASURES.has(canonicalMeasureId(issue.item))
  if (singleVolley)
    for (let t = issue.turn_start; t <= issue.turn_end; t++) {
      const v = turnToVolley.get(t)
      if (v !== undefined && codedAgent.has(v)) out.add(v)
    }
  for (const q of splitEvidence(issue.evidence)) {
    const v = q.turn === null ? undefined : turnToVolley.get(q.turn)
    if (v !== undefined && codedAgent.has(v)) out.add(v)
  }
  return [...out]
}

function Results({ session, onScoreAnother }: { session: ScoredSession; onScoreAnother: () => void }) {
  const reducedMotion = usePrefersReducedMotion()
  const [filter, setFilter] = useState<VolleyFilter>('all')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')
  const [open, setOpen] = useState<{ volley: number; key: EvidenceKey } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ volley: number; nonce: number } | null>(null)
  const [flashVolley, setFlashVolley] = useState<number | null>(null)
  const notScoreable = session.scoreability.state === 'not_scoreable'
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the results so screen readers announce them. The page scrolls them into view.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const turnToVolley = useMemo(() => new Map(session.turns.map((t) => [t.turn, t.volley])), [session])
  const safetyVolleys = useMemo(() => new Set(session.safety_volleys), [session])

  const issuesByVolley = useMemo(() => {
    const codedAgent = new Set(
      session.volleys.filter((v) => v.speaker === 'agent' && !v.excluded && !safetyVolleys.has(v.volley)).map((v) => v.volley),
    )
    const map = new Map<number, IssueLogEntry[]>()
    for (const issue of session.issues)
      for (const v of issueVolleys(issue, turnToVolley, codedAgent)) map.set(v, [...(map.get(v) ?? []), issue])
    return map
  }, [session, turnToVolley, safetyVolleys])

  /** Scroll to the volley holding a turn and highlight it, clearing a filter that would hide it. */
  const focusTurn = useCallback(
    (turn: number) => {
      const volleyNumber = turnToVolley.get(turn)
      const volley = session.volleys.find((v) => v.volley === volleyNumber)
      if (!volley) return
      setFilter((f) => (matchesFilter(volley, f, new Set(issuesByVolley.keys())) ? f : 'all'))
      setFocusRequest({ volley: volley.volley, nonce: Date.now() })
    },
    [session, turnToVolley, issuesByVolley],
  )

  useEffect(() => {
    if (!focusRequest) return
    const el = document.getElementById(volleyDomId(focusRequest.volley))
    if (!el) return
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
    setFlashVolley(focusRequest.volley)
    const timer = window.setTimeout(() => setFlashVolley(null), 1800)
    return () => window.clearTimeout(timer)
  }, [focusRequest, reducedMotion])

  const toggleEvidence = useCallback((volley: number, key: EvidenceKey) => {
    setOpen((cur) => (cur && cur.volley === volley && cur.key === key ? null : { volley, key }))
  }, [])

  const showIssues = useCallback(
    (type: EntryType) => {
      setIssueFilter(type)
      document.getElementById('issue-log')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    },
    [reducedMotion],
  )

  const action = (
    <button type="button" onClick={onScoreAnother} className={secondaryButton}>
      Score another
    </button>
  )

  return (
    <TurnNavContext.Provider value={focusTurn}>
      <div className="space-y-12">
        <h2 ref={headingRef} id="results-title" tabIndex={-1} className="sr-only">
          Results for {sessionTopic(session)}
        </h2>
        {notScoreable ? (
          <NotScoreableCard session={session} action={action} />
        ) : (
          <>
            <SessionHeader session={session} action={action} onShowIssues={showIssues} />
            <Scores session={session} />
            <IssueLog session={session} filter={issueFilter} onFilter={setIssueFilter} />
            <ClinicianReview session={session} />
            {session.table_c && <FlowFlags tableC={session.table_c} />}
          </>
        )}

        <section aria-labelledby="conversation-title">
          <SectionTitle
            id="conversation-title"
            hint={
              notScoreable
                ? 'The conversation as received. Nothing was coded.'
                : 'Grouped into volleys. Each coach volley is tagged with what the coach did; click a tag to see why.'
            }
          >
            The conversation
          </SectionTitle>
          <Transcript
            volleys={session.volleys}
            turns={session.turns}
            safetyVolleys={safetyVolleys}
            filter={filter}
            onFilter={setFilter}
            issuesByVolley={issuesByVolley}
            open={open}
            onToggle={toggleEvidence}
            flashVolley={flashVolley}
            showFilters={!notScoreable}
          />
        </section>

        {!notScoreable && (
          <details className="group">
            <summary className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
              <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180 motion-reduce:transition-none" />
              More detail
            </summary>
            <div className="mt-8 space-y-12">
              <OverallRatings session={session} />
              <Details session={session} />
            </div>
          </details>
        )}
      </div>
    </TurnNavContext.Provider>
  )
}
