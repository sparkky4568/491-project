import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { DropZone, LoadErrors, goToOpened } from '../components/LoadFiles'
import { Card, ErrorPanel, TONE, chipClass, ghostButton, primaryButton, secondaryButton } from '../components/ui'
import { useConnection } from '../lib/connection'
import { DataError, listExamples, scoreConversation } from '../lib/data'
import { topicLabel } from '../lib/miti'
import { parseConversationInput, transcriptToText } from '../lib/parseInput'
import { navigate } from '../lib/router'
import { useRuns, type SessionOrigin } from '../lib/runs'
import type { TranscriptIn } from '../lib/schema'

const PLACEHOLDER = `Coach: What would you like to talk about today?
Caller: I keep meaning to cook at home more, but by evening I'm too tired.
Coach: Part of you wants home-cooked dinners, and the end of the day leaves nothing in the tank.
Caller: Yeah. Maybe weekends would be easier to start with.`

type StepState = 'done' | 'active' | 'waiting'
interface Progress {
  mode: 'api' | 'practice'
  volleys: number
  step: number
  started: number
}

/** Paste a conversation and score it, or open files the scorer already produced. */
export function ScorePage() {
  const { connection, recheck, apiUrl } = useConnection()
  const runs = useRuns()
  const [text, setText] = useState('')
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null)
  const [offline, setOffline] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const examples = useMemo(() => listExamples(), [])
  const [example, setExample] = useState<TranscriptIn | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const demo = connection.kind === 'demo'
  useDemoNotice(demo ? 'practice' : null)

  function parse() {
    // An untouched example is scored from its file, so it keeps its topic, timings, nodes and goal.
    return example && text === transcriptToText(example)
      ? { kind: 'transcript' as const, transcript: example }
      : parseConversationInput(text)
  }

  async function score(forcePractice = false) {
    if (progress) return
    setError(null)
    setOffline(null)
    const parsed = parse()
    if (parsed.kind === 'error') {
      setError(parsed)
      return
    }
    if (parsed.kind === 'scored') {
      runs.add([{ session: parsed.session, origin: 'pasted' }])
      navigate({ page: 'session', sessionId: parsed.session.session_id, tab: 'summary' })
      return
    }
    let mode: 'api' | 'practice' = 'practice'
    if (!demo && !forcePractice) {
      // Re-check before each score. Offline never falls back to practice on its own.
      const now = await recheck()
      if (now.kind !== 'live') {
        setOffline(now.kind === 'offline' ? now.message : 'The scorer API is not answering.')
        return
      }
      mode = 'api'
    }
    const agentTurns = parsed.transcript.turns.filter((t) => t.speaker === 'agent').length
    const started = Date.now()
    setProgress({ mode, volleys: agentTurns, step: 1, started })
    try {
      const session = await scoreConversation(parsed.transcript, mode)
      setProgress({ mode, volleys: agentTurns, step: 3, started })
      const origin: SessionOrigin = mode === 'api' ? 'api' : 'practice'
      runs.add([{ session, origin }])
      navigate({ page: 'session', sessionId: session.session_id, tab: 'summary' })
    } catch (err) {
      setError(err instanceof DataError ? err : { message: err instanceof Error ? err.message : String(err) })
      setProgress(null)
    }
  }

  const scoreLabel = demo ? 'Score it (practice)' : 'Score it'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="type-h1 text-ink">Score a call</h1>
        <p className="mt-1 type-body text-ink-2">Paste a conversation, or load files the scorer already produced.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void score()
              }}
            >
              <label htmlFor="conversation" className="block type-h3 text-ink">
                Conversation
              </label>
              <p id={hintId} className="mt-2 type-small text-ink-2">
                One message per line, starting with Coach: or Caller:. Transcript JSON (schema 1.0) or ScoredSession JSON also
                works.
              </p>
              <textarea
                id="conversation"
                ref={box}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    void score()
                  }
                }}
                aria-describedby={demo ? `${hintId} practice-warning` : hintId}
                placeholder={PLACEHOLDER}
                rows={9}
                spellCheck={false}
                className="mt-4 block min-h-[220px] w-full resize-y rounded-md border border-line-strong bg-subtle px-4 py-3.5 type-body text-ink placeholder:text-muted focus:border-focus focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-focus"
              />

              {demo && (
                <div
                  id="practice-warning"
                  className={`mt-4 flex items-start gap-3 rounded-md border px-4 py-3 type-small ${TONE.insufficient}`}
                >
                  <Icon name="alert" className="mt-0.5 h-5 w-5" />
                  <p>
                    "Score it" gives practice scores while no scorer API is connected (VITE_API_URL is empty). They come from
                    keyword rules and can be wrong. Nothing you paste is saved or sent anywhere.
                  </p>
                </div>
              )}
              {connection.kind === 'live' && connection.health.backend === 'fake' && (
                <p className={`mt-4 flex items-start gap-3 rounded-md border px-4 py-3 type-small ${TONE.insufficient}`}>
                  <Icon name="alert" className="mt-0.5 h-5 w-5" />
                  The scorer API is running its fake backend, so its results are marked is_mock and shown as mock data.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="submit" className={primaryButton} disabled={progress !== null}>
                  <Icon name="arrowRight" />
                  {progress ? 'Scoring...' : scoreLabel}
                </button>
                <button
                  type="button"
                  className={ghostButton}
                  disabled={progress !== null || text === ''}
                  onClick={() => {
                    setText('')
                    setExample(null)
                    setError(null)
                    setOffline(null)
                    box.current?.focus()
                  }}
                >
                  Clear
                </button>
                <span className="ml-auto type-caption text-muted max-sm:hidden">Ctrl + Enter scores</span>
              </div>

              {examples.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="type-small text-ink-2">Try an invented example:</span>
                  {examples.map((ex) => (
                    <button
                      key={ex.session_id}
                      type="button"
                      className={chipClass(false)}
                      onClick={() => {
                        setText(transcriptToText(ex))
                        setExample(ex)
                        setError(null)
                        setOffline(null)
                      }}
                    >
                      {topicLabel(ex.change_goal.text ?? ex.target_behavior)}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </Card>

          {offline && (
            <Card className="p-5 sm:p-6">
              <div role="alert" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 type-label text-ink">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-offline" />
                    Scorer API unreachable
                  </span>
                  <button type="button" className={secondaryButton} onClick={() => void score()}>
                    <Icon name="refresh" />
                    Retry
                  </button>
                </div>
                <p className="type-small text-ink-2">
                  {offline} Your text is still in the box. You can retry, load scored files, or use practice scores, which are
                  clearly labelled as practice.
                </p>
                <button type="button" className={ghostButton} onClick={() => void score(true)}>
                  Use practice scores instead
                </button>
              </div>
            </Card>
          )}

          {error && <ErrorPanel title="Can't score this yet" message={error.message} details={error.details} />}
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="type-h3 text-ink">Load scored files</h2>
            <div className="mt-4">
              <DropZone onOpened={goToOpened} />
            </div>
            <p className="mt-3 type-caption text-muted">
              Real scorer output. Files are read in this browser only and open as a run in Runs.
            </p>
          </Card>
          <LoadErrors errors={runs.loadErrors} openedCount={runs.entries.length} onDismiss={runs.clearLoadErrors} />
          {progress && <ProgressCard progress={progress} apiUrl={apiUrl} />}
        </div>
      </div>
    </div>
  )
}

function ProgressCard({ progress, apiUrl }: { progress: Progress; apiUrl: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const seconds = Math.max(0, Math.round((now - progress.started) / 1000))
  const steps: Array<{ label: string; detail: string }> =
    progress.mode === 'practice'
      ? [{ label: 'Scoring with practice rules', detail: 'In this browser' }]
      : [
          { label: 'Parse and group into turns', detail: `${progress.volleys} coach turns` },
          { label: 'Score with the scorer API', detail: `${seconds} s` },
          { label: 'Open the session', detail: '' },
        ]
  const stateOf = (i: number): StepState =>
    progress.mode === 'practice' ? 'active' : i < progress.step ? 'done' : i === progress.step ? 'active' : 'waiting'
  const done = steps.filter((_, i) => stateOf(i) === 'done').length
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="type-h3 text-ink">Scoring progress</h2>
      <ol aria-live="polite" className="mt-4 space-y-3">
        {steps.map((s, i) => {
          const state = stateOf(i)
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  state === 'done' ? TONE.meets : state === 'active' ? TONE.info : TONE.notrated
                }`}
              >
                <Icon name={state === 'done' ? 'check' : state === 'active' ? 'refresh' : 'minus'} className="h-3.5 w-3.5" />
              </span>
              <span className={`type-small ${state === 'active' ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                {s.label}
                <span className="sr-only">: {state === 'done' ? 'done' : state === 'active' ? 'in progress' : 'waiting'}</span>
              </span>
              <span className="ml-auto type-caption text-muted tabular-nums">
                {state === 'done' ? 'Done' : state === 'waiting' ? 'Waiting' : s.detail}
              </span>
            </li>
          )
        })}
      </ol>
      <div
        aria-hidden="true"
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-subtle"
        title={progress.mode === 'api' ? apiUrl : undefined}
      >
        <div
          className="h-full rounded-full bg-chart-line transition-all"
          style={{ width: `${Math.max(10, ((done + 0.5) / steps.length) * 100)}%` }}
        />
      </div>
      <p className="mt-3 type-caption text-muted">
        {progress.mode === 'api'
          ? 'The scorer API sends the whole result at once, so there is no per-volley count. Long calls can take a few minutes.'
          : 'Practice scores take a moment.'}
      </p>
    </Card>
  )
}
