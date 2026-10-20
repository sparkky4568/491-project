import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { ErrorPanel, PageContainer, PageHero, SectionTitle, primaryButton, secondaryButton } from '../components/ui'
import { DataError, getThresholds, listExamples, scoreConversation, usingRealScorer } from '../lib/data'
import { useAsync, usePrefersReducedMotion } from '../lib/hooks'
import { isMomentProblem, topicLabel } from '../lib/miti'
import { parseConversationInput, transcriptToText } from '../lib/parseInput'
import type { Issue, ScoredSession, ThresholdConfig } from '../lib/schema'
import { Details } from './session/Details'
import { KeyScores, OverallRatings, Problems, Verdict } from './session/Summary'
import { Transcript, matchesFilter, type EvidenceKey, type TurnFilter } from './session/Transcript'
import { TurnNavContext } from './session/turnNav'

const PLACEHOLDER = `Coach: What would you like to talk about today?
Person: I want to start walking more, but I never have time.
Coach: Part of you really wants to get moving, and time keeps getting in the way.
Person: Exactly. Maybe I could walk at lunch.`

/** The whole app: paste a conversation, score it, see the results below. */
export function ScorePage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ScoredSession | null>(null)
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const thresholds = useAsync(() => getThresholds(), [])
  const examples = useMemo(() => listExamples(), [])
  const box = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  useDemoNotice(!!result?.is_mock)

  async function score() {
    setError(null)
    const parsed = parseConversationInput(text)
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
    <PageContainer narrow>
      <PageHero eyebrow="Coaching conversation scorer" title="Paste a conversation." accent="Get a score.">
        See how well the coach listened, what they did in each message, and anything that went wrong.
      </PageHero>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void score()
        }}
        className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,47,77,0.05),0_12px_32px_-16px_rgba(16,47,77,0.18)] ring-1 ring-navy-900/5 sm:p-6"
      >
        <label htmlFor="conversation" className="block text-lg font-bold text-navy-900">
          Conversation
        </label>
        <p id="conversation-hint" className="mt-1 text-sm text-navy-500">
          Put each message on its own line, starting with <strong className="text-navy-800">Coach:</strong> or{' '}
          <strong className="text-navy-800">Person:</strong>
        </p>
        <textarea
          id="conversation"
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="conversation-hint"
          placeholder={PLACEHOLDER}
          rows={10}
          spellCheck={false}
          className="mt-3 block w-full resize-y rounded-xl bg-navy-50 px-4 py-3 font-sans text-[15px] leading-7 text-navy-900 ring-1 ring-navy-200 placeholder:text-navy-400 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className={`${primaryButton} px-6 text-base`} disabled={busy}>
            {busy ? 'Scoring…' : 'Score it'}
            {!busy && <Icon name="arrowRight" />}
          </button>
          {text && (
            <button
              type="button"
              className="text-sm font-semibold text-navy-500 hover:text-navy-900"
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
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4 text-sm">
            <span className="text-navy-500">No conversation handy? Try an example:</span>
            {examples.map((ex) => (
              <button
                key={ex.session_id}
                type="button"
                className="rounded-full bg-navy-50 px-3 py-1 font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-brand-50 hover:ring-brand-300"
                onClick={() => {
                  setText(transcriptToText(ex))
                  setResult(null)
                  setError(null)
                }}
              >
                {topicLabel(ex.target_behavior)}
              </button>
            ))}
          </div>
        )}
      </form>

      {!usingRealScorer && (
        <p className="mt-3 flex items-start gap-2 text-sm text-navy-500">
          <Icon name="info" className="mt-0.5" />
          <span>
            Practice mode: scores come from simple keyword rules until the real AI scorer is connected. Nothing you paste leaves
            your browser.
          </span>
        </p>
      )}

      {error && (
        <div className="mt-6">
          <ErrorPanel title="Can't score this yet" message={error.message} details={error.details} />
        </div>
      )}

      {result && (
        <div ref={resultsRef} className="scroll-mt-14 pt-12">
          <Results
            key={`${result.session_id}-${result.scorer.scored_at}`}
            session={result}
            thresholds={thresholds.status === 'ready' ? thresholds.data : null}
            onScoreAnother={scoreAnother}
          />
        </div>
      )}
    </PageContainer>
  )
}

function Results({
  session,
  thresholds,
  onScoreAnother,
}: {
  session: ScoredSession
  thresholds: ThresholdConfig | null
  onScoreAnother: () => void
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [filter, setFilter] = useState<TurnFilter>('all')
  const [open, setOpen] = useState<{ turn: number; key: EvidenceKey } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ turn: number; nonce: number } | null>(null)
  const [flashTurn, setFlashTurn] = useState<number | null>(null)

  const problemsByTurn = useMemo(() => {
    const map = new Map<number, Issue[]>()
    for (const issue of session.issues.filter(isMomentProblem))
      for (const t of issue.turns) map.set(t, [...(map.get(t) ?? []), issue])
    return map
  }, [session])

  /** Scroll to a message and highlight it, clearing a filter that would hide it. */
  const focusTurn = useCallback(
    (turnNumber: number) => {
      const turn = session.turns.find((t) => t.turn === turnNumber)
      if (!turn) return
      const problemTurns = new Set(problemsByTurn.keys())
      setFilter((f) => (matchesFilter(turn, f, problemTurns) ? f : 'all'))
      setFocusRequest({ turn: turnNumber, nonce: Date.now() })
    },
    [session, problemsByTurn],
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

  const toggleEvidence = useCallback((turn: number, key: EvidenceKey) => {
    setOpen((cur) => (cur && cur.turn === turn && cur.key === key ? null : { turn, key }))
  }, [])

  return (
    <TurnNavContext.Provider value={focusTurn}>
      <div className="space-y-10">
        <h2 className="sr-only">Results</h2>
        <Verdict
          session={session}
          action={
            <button type="button" onClick={onScoreAnother} className={secondaryButton}>
              Score another
            </button>
          }
        />
        {session.issues.length > 0 && <Problems session={session} />}
        <KeyScores session={session} thresholds={thresholds} />

        <section aria-labelledby="conversation-title">
          <SectionTitle hint="Each coach message is tagged with what the coach did. Click a tag to see why.">
            <span id="conversation-title">The conversation</span>
          </SectionTitle>
          <Transcript
            turns={session.turns}
            filter={filter}
            onFilter={setFilter}
            problemsByTurn={problemsByTurn}
            open={open}
            onToggle={toggleEvidence}
            flashTurn={flashTurn}
          />
        </section>

        <details className="group">
          <summary className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
            <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
            More detail
          </summary>
          <div className="mt-8 space-y-10">
            <OverallRatings session={session} />
            <Details session={session} />
          </div>
        </details>
      </div>
    </TurnNavContext.Provider>
  )
}
