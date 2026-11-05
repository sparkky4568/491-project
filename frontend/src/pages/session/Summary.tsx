import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Card, ENTRY_ICONS, Explainer, ScoreabilityChip, SectionTitle, StatusPill } from '../../components/ui'
import { formatDuration, formatMeasureValue, formatThreshold, measureUnit } from '../../lib/format'
import {
  ENTRY_TYPE_COPY,
  GLOBAL_COPY,
  GLOBAL_MEASURES,
  GLOBAL_MEASURE_NOTE,
  MEASURE_COPY,
  PROVENANCE_COPY,
  REPORTED_MEASURES,
  SCOREABILITY_COPY,
  SOURCE_COPY,
  THRESHOLD_MEASURES,
  canonicalMeasureId,
  coachWords,
  topicLabel,
} from '../../lib/miti'
import type { EntryType, Measure, ScoredSession } from '../../lib/schema'
import { TurnLinks } from './turnNav'

export const sessionTopic = (s: Pick<ScoredSession, 'change_goal' | 'target_behavior'>) =>
  topicLabel(s.change_goal.text ?? s.target_behavior)

function channelLine(session: ScoredSession): string {
  const length = formatDuration(session.duration_sec)
  if (session.channel === 'text') return 'Text conversation, no timings'
  return length ? `Voice call, ${length}` : 'Voice call'
}

// ------------------------------------------------------------ Session header

/** Neutral summary of the session: what it was about, whether it could be scored, and what was found. */
export function SessionHeader({
  session,
  action,
  onShowIssues,
}: {
  session: ScoredSession
  action?: ReactNode
  onShowIssues: (type: EntryType) => void
}) {
  const state = session.scoreability.state
  const measureRows = session.issues.filter((i) => i.entry_type === 'MEASURE')
  const measureItems = new Set(measureRows.map((i) => i.item))
  // Measures are counted once each; MI Non-Adherent writes one row per volley, so the row count can be higher.
  const found: Array<{ type: EntryType; count: number; rows: number }> = [
    { type: 'MEASURE', count: measureItems.size, rows: measureRows.length },
    ...(['TABLE_C', 'TABLE_D'] as const).map((type) => {
      const rows = session.issues.filter((i) => i.entry_type === type).length
      return { type, count: rows, rows }
    }),
  ]
  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.12em] text-navy-500 uppercase">
              Session <span className="font-mono tracking-normal normal-case">{session.session_id}</span>
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-balance text-navy-900 sm:text-3xl">
              {sessionTopic(session)}
            </h2>
          </div>
          {action}
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Meta label="Channel">{channelLine(session)}</Meta>
          <Meta label="Coach volleys">
            <span className="tabular-nums">{session.scoreability.agent_volleys}</span>
          </Meta>
          <Meta label="Type">{PROVENANCE_COPY[session.provenance]}</Meta>
          <Meta label="Source">{SOURCE_COPY[session.source]}</Meta>
        </dl>

        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-navy-50/70 p-4 ring-1 ring-navy-100 sm:flex-row sm:items-start">
          <ScoreabilityChip state={state} />
          <div className="text-sm leading-relaxed text-navy-700">
            <p>{SCOREABILITY_COPY[state].explain}</p>
            {session.scoreability.reason && (
              <p className="mt-1 text-navy-500">
                <span className="font-semibold text-navy-700">Reason given:</span> {coachWords(session.scoreability.reason)}
              </p>
            )}
          </div>
        </div>

        {session.safety_volleys.length > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm text-navy-600">
            <Icon name="shield" className="mt-0.5 text-navy-500" />
            <span>
              {session.safety_volleys.length} volley{session.safety_volleys.length === 1 ? ' was' : 's were'} spoken in the safety
              node. By sponsor rule {session.safety_volleys.length === 1 ? 'it is' : 'they are'} left out of every count, rating
              and flag.
            </span>
          </p>
        )}
      </div>

      <div className="border-t border-navy-100 bg-navy-50/40 px-5 py-4 sm:px-7">
        <h3 className="text-sm font-semibold text-navy-700">What the scorer found</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {found.map(({ type, count, rows }) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => onShowIssues(type)}
                disabled={count === 0}
                className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-navy-200 transition enabled:hover:ring-brand-300 disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    count > 0
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                      : 'bg-navy-50 text-navy-400 ring-1 ring-navy-100'
                  }`}
                >
                  <Icon name={ENTRY_ICONS[type]} />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xl leading-none font-extrabold text-navy-900 tabular-nums">{count}</span>
                  <span className="mt-1 block text-sm text-navy-600">{ENTRY_TYPE_COPY[type].plural}</span>
                  {rows !== count && (
                    <span className="block text-xs text-navy-500">
                      <span className="tabular-nums">{rows}</span> rows in the issue log
                    </span>
                  )}
                </span>
                {count > 0 && (
                  <span className="ml-auto text-navy-400">
                    <Icon name="arrowRight" />
                    <span className="sr-only">, show in the issue log</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-navy-500">{label}</dt>
      <dd className="font-semibold text-navy-900">{children}</dd>
    </div>
  )
}

/** A not_scoreable session: say so calmly, and show nothing but the conversation. */
export function NotScoreableCard({ session, action }: { session: ScoredSession; action?: ReactNode }) {
  const volleys = session.scoreability.agent_volleys
  const tooShort = volleys < 5
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-navy-500 uppercase">
            Session <span className="font-mono tracking-normal normal-case">{session.session_id}</span>
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{sessionTopic(session)}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-dashed border-navy-200 bg-navy-50/60 p-4 sm:flex-row sm:gap-4 sm:p-5">
        <ScoreabilityChip state="not_scoreable" />
        <div className="text-sm leading-relaxed text-navy-700">
          {tooShort ? (
            <>
              <p className="font-semibold text-navy-900">This conversation is too short to score.</p>
              <p className="mt-1">
                It has {volleys} coach volley{volleys === 1 ? '' : 's'}, and the sponsor needs at least 5. The scorer refuses
                rather than estimating, so there are no scores or issue-log rows.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-navy-900">There is nothing here to score.</p>
              <p className="mt-1">
                None of the coach volleys could be coded (greetings, sign-offs and similar), so there are no scores or issue-log
                rows.
              </p>
            </>
          )}
          {session.scoreability.reason && (
            <p className="mt-1 text-navy-500">Reason given: {coachWords(session.scoreability.reason)}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------- Scores

function byCanonical(session: ScoredSession) {
  const map = new Map<string, Measure>()
  for (const m of session.measures) map.set(canonicalMeasureId(m.id), m)
  return map
}

export function Scores({ session }: { session: ScoredSession }) {
  const measures = byCanonical(session)
  const known = new Set([...THRESHOLD_MEASURES, ...REPORTED_MEASURES])
  const extra = [...measures.entries()].filter(([id]) => !known.has(id))
  const main = [
    ...THRESHOLD_MEASURES.map((id) => measures.get(id)),
    ...extra.filter(([, m]) => m.threshold !== null).map(([, m]) => m),
  ].filter((m): m is Measure => !!m)
  const reported = [
    ...REPORTED_MEASURES.map((id) => measures.get(id)),
    ...extra.filter(([, m]) => m.threshold === null).map(([, m]) => m),
  ].filter((m): m is Measure => !!m)
  const outside = session.scoreability.state === 'outside_instrument'

  return (
    <section aria-labelledby="scores-title">
      <SectionTitle id="scores-title" hint="Each measure next to the sponsor's threshold. Thresholds are fixed for the project.">
        Scores
      </SectionTitle>
      {outside && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <Icon name="info" className="mt-0.5" />
          <span>The goal in this call was a decision, which MITI does not cover, so the measures are not rated.</span>
        </p>
      )}
      {main.length === 0 ? (
        <p className="text-navy-500">The scorer returned no measures for this call.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {main.map((m) => (
            <li key={m.id}>
              <MeasureTile measure={m} />
            </li>
          ))}
        </ul>
      )}

      {reported.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-navy-700">Reported only</h3>
          <p className="mt-0.5 text-sm text-navy-500">The sponsor set no threshold for these. They are shown for context.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {reported.map((m) => (
              <li key={m.id}>
                <ReportedTile measure={m} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function unitSuffix(id: string): string {
  switch (measureUnit(id)) {
    case 'outOf5':
      return ' / 5'
    case 'ratio':
      return ' per question'
    default:
      return ''
  }
}

/** The scorer's own note, or a plain one for statuses that need it. Globals use GLOBAL_MEASURE_NOTE instead. */
function statusNote(measure: Measure): string | null {
  const rated = measure.status === 'meets' || measure.status === 'below'
  if (measure.note && (!rated || !GLOBAL_MEASURES.has(canonicalMeasureId(measure.id)))) return coachWords(measure.note)
  if (measure.status === 'insufficient_data') return 'Fewer than 10 coded coach volleys, so this is not reported.'
  if (measure.status === 'not_rated') return 'Not rated for this kind of call.'
  return null
}

function MeasureTile({ measure }: { measure: Measure }) {
  const id = canonicalMeasureId(measure.id)
  const copy = MEASURE_COPY[id]
  const hasValue = measure.value !== null && (measure.status === 'meets' || measure.status === 'below')
  const note = statusNote(measure)
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-navy-900">{copy?.label ?? measure.label}</h3>
        <StatusPill status={measure.status} />
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900 tabular-nums">
        {hasValue ? formatMeasureValue(id, measure.value) : <span className="text-navy-500">n/a</span>}
        {hasValue && <span className="text-base font-semibold text-navy-500">{unitSuffix(id)}</span>}
      </p>
      <Meter measure={measure} />
      <p className="mt-2 text-sm text-navy-500">
        Threshold: {measure.threshold ? formatThreshold(id, measure.threshold) : 'none set'}
      </p>
      {note && <p className="mt-2 text-xs leading-relaxed text-navy-500">{note}</p>}
      {GLOBAL_MEASURES.has(id) && <p className="mt-2 text-xs leading-relaxed text-navy-500">{GLOBAL_MEASURE_NOTE}</p>}
      <div className="mt-auto pt-1">
        <Explainer>
          {copy && <p>{copy.explain}</p>}
          <p>
            Based on <span className="tabular-nums">{measure.n}</span> {copy?.nLabel ?? 'items'}.
          </p>
          {measure.threshold && <p className="text-xs text-navy-500">Threshold source: {measure.threshold.source}</p>}
          <p className="text-xs text-navy-500">Official measure: {copy?.miti ?? `${measure.label} = ${measure.formula}`}</p>
        </Explainer>
      </div>
    </Card>
  )
}

/** A small bar: the value against the threshold marker. Words above carry the meaning; this is a picture of it. */
function Meter({ measure }: { measure: Measure }) {
  const id = canonicalMeasureId(measure.id)
  const unit = measureUnit(id)
  const t = measure.threshold
  const rated = measure.value !== null && (measure.status === 'meets' || measure.status === 'below')
  const toScale = (v: number) => (unit === 'percent' ? (Math.abs(v) <= 1 ? v * 100 : v) : v)
  const value = rated ? toScale(measure.value as number) : null
  const thresholdValue = t ? toScale(t.value) : null
  const max = unit === 'percent' ? 100 : unit === 'outOf5' ? 5 : Math.max(4, value ?? 0, thresholdValue ?? 0)
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`
  const fill = measure.status === 'below' ? 'bg-brand-500' : 'bg-navy-700'
  return (
    <div aria-hidden="true" className="relative mt-4 h-2.5 rounded-full bg-navy-100">
      {value !== null && <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: pct(value) }} />}
      {value === null && <div className="absolute inset-0 rounded-full border border-dashed border-navy-300 bg-white" />}
      {thresholdValue !== null && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-navy-900"
          style={{ left: thresholdValue === 0 ? '2px' : pct(thresholdValue) }}
        />
      )}
    </div>
  )
}

function ReportedTile({ measure }: { measure: Measure }) {
  const id = canonicalMeasureId(measure.id)
  const copy = MEASURE_COPY[id]
  const shown = measure.value !== null && measure.status === 'reported'
  const note = statusNote(measure)
  return (
    <div className="h-full rounded-2xl bg-white/70 p-4 ring-1 ring-navy-900/5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-navy-800">{copy?.label ?? measure.label}</h4>
        <StatusPill status={measure.status} />
      </div>
      <p className="mt-2 text-2xl font-bold text-navy-900 tabular-nums">
        {shown ? formatMeasureValue(id, measure.value) : <span className="text-navy-500">n/a</span>}
        {shown && <span className="text-sm font-semibold text-navy-500">{unitSuffix(id)}</span>}
      </p>
      {note && measure.status !== 'reported' && <p className="mt-1 text-xs text-navy-500">{note}</p>}
      <Explainer>
        {copy && <p>{copy.explain}</p>}
        <p>
          Based on <span className="tabular-nums">{measure.n}</span> {copy?.nLabel ?? 'items'}.
        </p>
        <p className="text-xs text-navy-500">Official measure: {copy?.miti ?? `${measure.label} = ${measure.formula}`}</p>
      </Explainer>
    </div>
  )
}

// ------------------------------------------------------------------ Globals

const TECHNICAL_GLOBALS = ['cultivating_change_talk', 'softening_sustain_talk']

export function OverallRatings({ session }: { session: ScoredSession }) {
  const technicalRated = TECHNICAL_GLOBALS.every((id) => session.globals.some((g) => g.id === id))
  return (
    <section aria-labelledby="ratings-title">
      <SectionTitle id="ratings-title" hint="The four MITI global ratings, 1 to 5, with the turns behind each one.">
        Overall ratings
      </SectionTitle>
      <p className="mb-3 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-200">
        <Icon name="info" className="mt-0.5" />
        <span>{GLOBAL_MEASURE_NOTE}</span>
      </p>
      {session.globals.length === 0 ? (
        <p className="rounded-2xl bg-white/70 p-5 text-sm text-navy-600 ring-1 ring-navy-900/5">
          Not rated for this call. Text conversations and calls whose goal was a decision get no overall ratings.
        </p>
      ) : (
        <>
          {!technicalRated && (
            <p className="mb-3 text-sm text-navy-600">
              Technique ratings are given only for full sessions (10 minutes or longer, with a behavior goal reached).
            </p>
          )}
          <Card className="divide-y divide-navy-100">
            {session.globals.map((g) => (
              <div key={g.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-navy-900">
                    {GLOBAL_COPY[g.id]?.label ?? g.id}
                    {GLOBAL_COPY[g.id] && (
                      <span className="ml-2 text-xs font-medium text-navy-500">{GLOBAL_COPY[g.id].miti}</span>
                    )}
                  </p>
                  <ScoreDots score={g.score} />
                </div>
                <p className="mt-1.5 leading-relaxed text-navy-600">{g.rationale}</p>
                <div className="mt-3">
                  <TurnLinks turns={g.cited_turns} />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </section>
  )
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= score ? 'bg-navy-700' : 'bg-navy-100'}`} />
        ))}
      </span>
      <span className="font-bold text-navy-900 tabular-nums">
        {score}
        <span className="font-medium text-navy-500"> / 5</span>
      </span>
    </span>
  )
}
