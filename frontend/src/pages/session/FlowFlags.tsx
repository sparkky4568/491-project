import { useState, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Card, EmptyState, Pill, TONE, focusRing } from '../../components/ui'
import type { RqWindow, ScoredSession, VolleySpan } from '../../lib/schema'
import { ShowInTranscript, TurnSpanLink } from './turnNav'
import { WindowedRqChart } from './WindowedRqChart'

function FlagState({ raised }: { raised: boolean }) {
  return raised ? (
    <Pill className={TONE.below}>
      <Icon name="flag" className="h-3.5 w-3.5" />
      Flag raised
    </Pill>
  ) : (
    <Pill className={TONE.meets}>
      <Icon name="check" className="h-3.5 w-3.5" />
      No flag
    </Pill>
  )
}

function spanSentence(prefix: string, span: VolleySpan): string {
  const volleys =
    span.start_volley === span.end_volley ? `volley ${span.start_volley}` : `volleys ${span.start_volley} to ${span.end_volley}`
  const turns = span.turn_start === span.turn_end ? `turn ${span.turn_start}` : `turns ${span.turn_start} to ${span.turn_end}`
  const nodes = span.nodes.length > 0 ? `, node${span.nodes.length === 1 ? '' : 's'} ${span.nodes.join('; ')}` : ''
  return `${prefix}coach ${volleys} (${turns})${nodes}.`
}

function FlagCard({
  title,
  official,
  raised,
  number,
  explain,
  children,
}: {
  title: string
  official: string
  raised: boolean
  number: string
  explain: string
  children?: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-h3 text-ink">{title}</h3>
          <p className="type-mono text-muted">{official}</p>
        </div>
        <FlagState raised={raised} />
      </div>
      <p className="mt-4 type-number text-ink">{number}</p>
      <p className="mt-1 type-small text-ink-2">{explain}</p>
      {children && <div className="mt-3 space-y-3 type-small text-ink">{children}</div>}
    </Card>
  )
}

/** Table C (deliv s6): computed by code from the volley codes, over coded coach volleys only. */
export function FlowFlags({ session }: { session: ScoredSession }) {
  const tableC = session.table_c
  const [view, setView] = useState<'chart' | 'table'>('chart')
  if (!tableC)
    return (
      <EmptyState icon="flag" title="No flow flags for this session">
        The scorer computed no Table C for it.
      </EmptyState>
    )
  const run = tableC.c1_reflection_run
  const c2 = tableC.c2_windowed_rq
  const total = c2.windows.length
  const indexed = c2.windows.map((w, i) => ({ w, i }))
  const noQ = indexed.filter(({ w }) => w.questions === 0)
  const noR = indexed.filter(({ w }) => w.reflections === 0)
  const lowest = c2.worst_interrogation
  const lowestIndex = lowest ? c2.windows.findIndex((w) => w.start_volley === lowest.start_volley) : -1
  const windowsWord = (n: number) => `${n} window${n === 1 ? '' : 's'}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2 text-ink">Conversation-flow flags (Table C)</h2>
        <p className="mt-1 type-small text-ink-2">
          Computed by code from the volley codes, over coded coach volleys only. Safety-node and excluded volleys are skipped.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FlagCard
          title="Reflections in a row"
          official="C1 Longest reflection run"
          raised={run.breach}
          number={String(run.length)}
          explain={`longest run; design cap ${run.cap}, more than ${run.cap} in a row is flagged`}
        >
          {run.span ? (
            <>
              <p>{spanSentence('', run.span).replace(/^c/, 'C')}</p>
              <ShowInTranscript turn={run.span.turn_start} />
            </>
          ) : (
            <p className="text-ink-2">No reflections in this call.</p>
          )}
        </FlagCard>

        <FlagCard
          title="Stretch with no questions"
          official="C2 Windowed R:Q, no questions"
          raised={c2.breach_no_questions}
          number={windowsWord(noQ.length)}
          explain={`of ${total} had no question`}
        >
          {noQ.length > 0 && (
            <>
              <p>{spanSentence(`Window ${noQ[0].i + 1}: `, noQ[0].w)}</p>
              {noQ.length > 1 && <p className="text-ink-2">{noQ.length - 1} more listed in the table view.</p>}
              <ShowInTranscript turn={noQ[0].w.turn_start} />
            </>
          )}
        </FlagCard>

        <FlagCard
          title="Stretch with no reflections"
          official="C2 Windowed R:Q, no reflections"
          raised={c2.breach_no_reflections}
          number={windowsWord(noR.length)}
          explain={`of ${total} had no reflection`}
        >
          {noR.length > 0 ? (
            <>
              <p>{spanSentence(`Window ${noR[0].i + 1}: `, noR[0].w)}</p>
              <ShowInTranscript turn={noR[0].w.turn_start} />
            </>
          ) : (
            lowest &&
            lowest.rq !== null && (
              <p className="text-ink-2">
                Lowest R:Q, window {lowestIndex + 1}: {lowest.rq.toFixed(2)} (volleys {lowest.start_volley} to {lowest.end_volley}
                ).
              </p>
            )
          )}
        </FlagCard>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl min-w-0">
            <h3 className="type-h3 text-ink">Reflections per question, window by window</h3>
            <p className="mt-1 type-small text-ink-2">
              Rolling window of {c2.window_size} coded coach volleys (sponsor Table C2). Each point is one window; R:Q is
              reported, not compared with a threshold.
            </p>
          </div>
          <div role="group" aria-label="Chart or table" className="inline-flex rounded-md bg-subtle p-1">
            {(['chart', 'table'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`min-h-9 rounded-md px-3.5 type-small-strong ${focusRing} ${
                  view === v ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {v === 'chart' ? 'Chart' : 'Table'}
              </button>
            ))}
          </div>
        </div>

        {total === 0 ? (
          <p className="mt-4 type-small text-ink-2">No coded coach volleys to window.</p>
        ) : view === 'chart' ? (
          <>
            <div className="mt-6">
              <WindowedRqChart windows={c2.windows} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 type-caption text-ink-2">
              <li className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                  <circle cx="6" cy="6" r="4" fill="#fff" stroke="#1f5a96" strokeWidth="2" />
                </svg>
                Window R:Q
              </li>
              <li className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                  <path d="M6 1 L11 11 L1 11 Z" fill="#b42318" />
                </svg>
                Flagged: no questions (shape and label, not color alone)
              </li>
              <li className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                  <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="#b42318" />
                </svg>
                Flagged: no reflections
              </li>
              <li>Points are focusable; arrow keys move between windows. "Table" shows every window with its counts.</li>
            </ul>
          </>
        ) : (
          <WindowTable windows={c2.windows} />
        )}
      </Card>
    </div>
  )
}

function WindowTable({ windows }: { windows: RqWindow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left type-small">
        <caption className="sr-only">Every window with its counts</caption>
        <thead className="bg-subtle type-caption text-muted">
          <tr>
            {['Window', 'Turns', 'Reflections', 'Questions', 'R:Q', 'Flag'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider tabular-nums">
          {windows.map((w, i) => {
            const flags = [w.questions === 0 && 'No questions', w.reflections === 0 && 'No reflections'].filter(Boolean)
            return (
              <tr key={`${w.start_volley}-${w.end_volley}`}>
                <td className="px-4 py-2">
                  w{i + 1}{' '}
                  <span className="text-muted">
                    (volleys {w.start_volley} to {w.end_volley})
                  </span>
                </td>
                <td className="px-4 py-2">
                  <TurnSpanLink start={w.turn_start} end={w.turn_end} />
                </td>
                <td className="px-4 py-2">{w.reflections}</td>
                <td className="px-4 py-2">{w.questions}</td>
                <td className="px-4 py-2">{w.rq === null ? 'undefined' : w.rq.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {flags.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-below-fg">
                      <Icon name="flag" className="h-3.5 w-3.5" />
                      {flags.join(', ')}
                    </span>
                  ) : (
                    <span className="text-muted">none</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
