import { useState, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Card, Pill, SectionTitle } from '../../components/ui'
import { nodeLabel } from '../../lib/miti'
import type { RqWindow, TableC } from '../../lib/schema'
import { TurnSpanLink } from './turnNav'
import { WindowedRqChart } from './WindowedRqChart'

function FlagPill({ flagged, children }: { flagged: boolean; children: ReactNode }) {
  return flagged ? (
    <Pill className="bg-brand-50 text-brand-800 ring-1 ring-brand-300">
      <Icon name="flag" className="h-3.5 w-3.5" />
      {children}
    </Pill>
  ) : (
    <Pill className="bg-navy-50 text-navy-600 ring-1 ring-navy-200">
      <Icon name="minus" className="h-3.5 w-3.5" />
      {children}
    </Pill>
  )
}

/** Table C (deliv s6): computed by code from the volley codes. */
export function FlowFlags({ tableC }: { tableC: TableC }) {
  const run = tableC.c1_reflection_run
  const c2 = tableC.c2_windowed_rq
  const [showNumbers, setShowNumbers] = useState(false)

  return (
    <section aria-labelledby="flow-title">
      <SectionTitle id="flow-title" hint="The sponsor's conversation-flow flags (Table C), counted over coded coach volleys.">
        Flow flags
      </SectionTitle>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-navy-900">Reflections in a row</h3>
              <p className="font-mono text-xs text-navy-500">C1 Longest reflection run</p>
            </div>
            <FlagPill flagged={run.breach}>{run.breach ? 'Flagged' : 'Not flagged'}</FlagPill>
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-navy-900 tabular-nums">
            {run.length} <span className="text-base font-semibold text-navy-500">in a row</span>
          </p>
          <p className="mt-1 text-sm text-navy-500">
            Longest run of reflective coach volleys with no question. The design cap is{' '}
            <span className="tabular-nums">{run.cap}</span>; three or more is flagged.
          </p>
          {run.span ? (
            <div className="mt-4 space-y-1.5">
              <TurnSpanLink start={run.span.turn_start} end={run.span.turn_end} />
              {run.span.nodes.length > 0 && <p className="text-xs text-navy-500">{run.span.nodes.map(nodeLabel).join(', ')}</p>}
            </div>
          ) : (
            <p className="mt-4 text-sm text-navy-500">No reflections in this call.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-navy-900">Reflections per question, window by window</h3>
              <p className="font-mono text-xs text-navy-500">C2 Windowed R:Q</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FlagPill flagged={c2.breach_no_questions}>
                {c2.breach_no_questions ? 'No-question window' : 'Every window has a question'}
              </FlagPill>
              <FlagPill flagged={c2.breach_no_reflections}>
                {c2.breach_no_reflections ? 'No-reflection window' : 'Every window has a reflection'}
              </FlagPill>
            </div>
          </div>
          <p className="mt-2 text-sm text-navy-500">
            Each window is <span className="tabular-nums">{c2.window_size}</span> coded coach volleys. A window with no questions
            or no reflections is flagged. Click a point, or use the numbers table, to jump there.
          </p>

          {c2.windows.length === 0 ? (
            <p className="mt-4 text-sm text-navy-500">No coded coach volleys to window.</p>
          ) : (
            <>
              <div className="mt-3">
                <WindowedRqChart windows={c2.windows} />
              </div>
              <ChartKey />
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <WorstWindow title="Highest R:Q (over-following side)" window={c2.worst_over_following} />
                <WorstWindow title="Lowest R:Q (interrogation side)" window={c2.worst_interrogation} />
              </dl>
              <button
                type="button"
                aria-expanded={showNumbers}
                onClick={() => setShowNumbers((s) => !s)}
                className="mt-4 text-sm font-semibold text-brand-700 underline underline-offset-4"
              >
                {showNumbers ? 'Hide the numbers' : 'Show the numbers'}
              </button>
              {showNumbers && <WindowTable windows={c2.windows} />}
            </>
          )}
        </Card>
      </div>
    </section>
  )
}

function ChartKey() {
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-500">
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="#102f4d" />
        </svg>
        R:Q for a window
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
          <rect width="10" height="10" fill="#b3570c" />
        </svg>
        Flagged: no reflections
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="12" height="10" viewBox="0 0 12 10">
          <path d="M6 10 L0 0 L12 0 Z" fill="#b3570c" />
        </svg>
        Flagged: no questions (shown at the top)
      </span>
    </p>
  )
}

function describe(w: RqWindow): string {
  const rq = w.rq === null ? 'no questions' : `R:Q ${w.rq.toFixed(2)}`
  return `${w.reflections} reflections, ${w.questions} questions, ${rq}`
}

function WorstWindow({ title, window }: { title: string; window: RqWindow | null }) {
  return (
    <div className="rounded-xl bg-navy-50/70 p-3 ring-1 ring-navy-100">
      <dt className="text-xs font-semibold text-navy-600">{title}</dt>
      {window ? (
        <dd className="mt-1.5 space-y-1.5 text-sm text-navy-800">
          <p className="tabular-nums">{describe(window)}</p>
          <TurnSpanLink start={window.turn_start} end={window.turn_end} />
        </dd>
      ) : (
        <dd className="mt-1.5 text-sm text-navy-500">None</dd>
      )}
    </div>
  )
}

function WindowTable({ windows }: { windows: RqWindow[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <caption className="sr-only">Every window with its counts</caption>
        <thead>
          <tr className="text-left text-xs font-semibold tracking-wide text-navy-500 uppercase">
            <th scope="col" className="py-2 pr-3">
              Turns
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Refl.
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Qs
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              R:Q
            </th>
            <th scope="col" className="py-2">
              Flag
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {windows.map((w) => (
            <tr key={`${w.start_volley}-${w.end_volley}`} className="border-t border-navy-100">
              <td className="py-1.5 pr-3">
                <TurnSpanLink start={w.turn_start} end={w.turn_end} />
              </td>
              <td className="py-1.5 pr-3 text-right">{w.reflections}</td>
              <td className="py-1.5 pr-3 text-right">{w.questions}</td>
              <td className="py-1.5 pr-3 text-right">{w.rq === null ? 'n/a' : w.rq.toFixed(2)}</td>
              <td className="py-1.5 text-brand-800">
                {[w.questions === 0 && 'No questions', w.reflections === 0 && 'No reflections'].filter(Boolean).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
