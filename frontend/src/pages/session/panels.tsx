import { useState } from 'react'
import { Icon } from '../../components/Icon'
import {
  AdvisoryNote,
  IssueTypeBadge,
  Panel,
  PlaceholderTag,
  ProvenanceBadge,
  ProvenanceLine,
  StatusBadge,
} from '../../components/ui'
import { formatTimestamp } from '../../lib/format'
import { CODE_GROUP_ORDER, CODE_INFO, GLOBAL_DERIVED_MEASURES, GLOBAL_LABELS, GROUP_INFO } from '../../lib/miti'
import { CODES, type ScoredSession, type ThresholdConfig } from '../../lib/schema'
import { MeasureRow } from './MeasureRow'
import { TurnLinks } from './turnNav'
import { WindowedRqChart } from './WindowedRqChart'

interface PanelProps {
  session: ScoredSession
  thresholds: ThresholdConfig | null
}

// ---------------------------------------------------------------- Measures

export function MeasuresPanel({ session, thresholds }: PanelProps) {
  const measures = session.measures.filter((m) => !GLOBAL_DERIVED_MEASURES.includes(m.id))
  const codesByGroup = CODE_GROUP_ORDER.map((group) => ({ group, codes: CODES.filter((c) => CODE_INFO[c].group === group) }))

  return (
    <Panel
      id="measures"
      title="Measures"
      description="Computed by the pipeline from non-excluded turns. Hover a name for its formula."
    >
      {measures.length === 0 ? (
        <p className="text-sm text-slate-600">No measures in this file.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {measures.map((m) => (
            <MeasureRow key={m.id} measure={m} config={thresholds} />
          ))}
        </ul>
      )}

      <h3 className="mt-3 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">Behavior counts</h3>
      <dl className="mt-1.5 grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-6 gap-y-1 text-sm">
        {codesByGroup.flatMap(({ group, codes }) =>
          codes.map((code) => (
            <div key={code} className="flex items-center justify-between gap-2" title={CODE_INFO[code].name}>
              <dt className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${GROUP_INFO[group].swatch}`} />
                {code}
                <span className="sr-only"> ({CODE_INFO[code].name})</span>
              </dt>
              <dd className="tabular-nums">{session.counts[code]}</dd>
            </div>
          )),
        )}
      </dl>
      <h3 className="mt-3 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">Client talk</h3>
      <dl className="mt-1.5 flex gap-4 text-sm">
        {(['change', 'sustain', 'neutral'] as const).map((k) => (
          <div key={k} className="flex gap-1.5">
            <dt className="text-slate-700 capitalize dark:text-slate-300">{k}</dt>
            <dd className="font-medium tabular-nums">{session.client_talk_counts[k]}</dd>
          </div>
        ))}
      </dl>

      <ProvenanceLine
        items={[
          ['Coder prompt', session.scorer.coder_prompt_version],
          ['Model', session.scorer.model],
          ['Run', session.scorer.run_id],
        ]}
      />
    </Panel>
  )
}

// ------------------------------------------------------------------ Globals

export function GlobalsPanel({ session, thresholds }: PanelProps) {
  const derived = session.measures.filter((m) => GLOBAL_DERIVED_MEASURES.includes(m.id))
  return (
    <Panel
      id="globals"
      title="Global ratings"
      description="A separate LLM pass rates the whole conversation 1–5 and cites the turns behind each rating."
    >
      <AdvisoryNote />
      {session.globals.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No global ratings in this file.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {session.globals.map((g) => (
            <li key={g.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{GLOBAL_LABELS[g.id] ?? g.id}</span>
                <ScoreMeter score={g.score} />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{g.rationale}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                Cited turns: <TurnLinks turns={g.cited_turns} />
              </p>
            </li>
          ))}
        </ul>
      )}
      {derived.length > 0 && (
        <>
          <h3 className="mt-2 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
            Summary scores (from the ratings above)
          </h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {derived.map((m) => (
              <MeasureRow key={m.id} measure={m} config={thresholds} />
            ))}
          </ul>
        </>
      )}
      <ProvenanceLine
        items={[
          ['Globals prompt', session.scorer.globals_prompt_version],
          ['Model', session.scorer.model],
        ]}
      />
    </Panel>
  )
}

function ScoreMeter({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-4 rounded-sm ${i <= score ? 'bg-slate-700 dark:bg-slate-200' : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {score}
        <span className="font-normal text-slate-500 dark:text-slate-400">/5</span>
        <span className="sr-only"> out of 5</span>
      </span>
    </span>
  )
}

// ---------------------------------------------------------------- Table C

export function FlagsPanel({ session, thresholds }: PanelProps) {
  const run = session.flags.longest_reflection_run
  const windowed = session.flags.windowed_rq
  const rq = session.measures.find((m) => m.id === 'reflection_to_question')
  const [showTable, setShowTable] = useState(false)
  return (
    <Panel id="flags" title="Table C flags" description="The sponsor's conversation-flow flags, as computed by the pipeline.">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Longest reflection run</span>
        <span className="text-lg font-semibold tabular-nums">
          {run.length}
          <span className="text-sm font-normal text-slate-600 dark:text-slate-400"> in a row</span>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          Design cap ≤ {run.cap} {thresholds?.isPlaceholder !== false && <PlaceholderTag />}
        </span>
        <span className="ml-auto">
          <StatusBadge status={run.exceeds_cap ? 'fail' : 'pass'} label={run.exceeds_cap ? 'Exceeds cap' : 'Within cap'} />
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        Turns: <TurnLinks turns={run.turns} />
      </p>

      <h3 className="mt-4 text-sm font-medium">Windowed R:Q</h3>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Reflections ÷ questions over each {windowed.window_size}-turn window, plotted at the window's last turn. Gaps mean the
        window had no questions. Click a point to jump to that turn.
      </p>
      {windowed.points.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">Session is shorter than one window.</p>
      ) : (
        <>
          <WindowedRqChart points={windowed.points} windowSize={windowed.window_size} threshold={rq?.threshold?.value ?? null} />
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
            className="mt-1 text-xs font-medium text-blue-700 underline dark:text-blue-300"
          >
            {showTable ? 'Hide table' : 'Show as table'}
          </button>
          {showTable && (
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-400">
                  <th className="py-1 font-medium">Window (turns)</th>
                  <th className="py-1 text-right font-medium">R:Q</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {windowed.points.map((p) => (
                  <tr key={p.end_turn} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1">
                      {p.end_turn - windowed.window_size + 1}–{p.end_turn}
                    </td>
                    <td className="py-1 text-right">{p.rq === null ? 'no questions' : p.rq.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Panel>
  )
}

// ------------------------------------------------------------------- Issues

export function IssuesPanel({ session }: { session: ScoredSession }) {
  return (
    <Panel
      id="session-issues"
      title={
        <span className="flex items-center gap-2">
          Issues{' '}
          <span className="rounded-full bg-slate-100 px-2 text-xs tabular-nums dark:bg-slate-800">{session.issues.length}</span>
        </span>
      }
      description="Everything the scorer flagged in this session, with evidence."
    >
      {session.issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Icon name="check" className="h-4 w-4 text-green-700 dark:text-green-400" /> No issues for this session.
        </p>
      ) : (
        <ul className="space-y-3">
          {session.issues.map((issue) => (
            <li
              key={issue.issue_id}
              id={`issue-${issue.issue_id}`}
              tabIndex={-1}
              className="scroll-mt-16 rounded-md border border-slate-200 p-3 outline-none dark:border-slate-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <IssueTypeBadge type={issue.type} />
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{issue.issue_id}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium">{issue.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{issue.detail}</p>
              {issue.evidence_quote && (
                <blockquote className="mt-1.5 border-l-2 border-slate-300 pl-2 text-sm text-slate-700 italic dark:border-slate-600 dark:text-slate-300">
                  “{issue.evidence_quote}”
                </blockquote>
              )}
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                Turns: <TurnLinks turns={issue.turns} />
                {issue.node && (
                  <>
                    <span aria-hidden="true">·</span> Node <code className="font-mono">{issue.node}</code>
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <ProvenanceBadge provenance={issue.provenance} />
                <span>
                  Coder prompt <code className="font-mono text-slate-800 dark:text-slate-200">{issue.coder_prompt_version}</code>
                </span>
                <span>
                  Model <code className="font-mono text-slate-800 dark:text-slate-200">{issue.model}</code>
                </span>
                <span>{formatTimestamp(issue.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
