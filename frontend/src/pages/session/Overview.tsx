import { Icon } from '../../components/Icon'
import { Card, Explainer, IssueTypePill, SectionTitle, StatusPill, textLink } from '../../components/ui'
import { formatGoal, formatMeasureValue } from '../../lib/format'
import { GLOBAL_COPY, ISSUE_TYPE_COPY, KEY_MEASURES, MEASURE_COPY } from '../../lib/miti'
import type { Measure, ScoredSession, ThresholdConfig } from '../../lib/schema'
import { TurnLink, TurnLinks } from './turnNav'

/** The summary tab: verdict, problems, key scores and overall ratings. */
export function Overview({ session, thresholds }: { session: ScoredSession; thresholds: ThresholdConfig | null }) {
  const measures = KEY_MEASURES.map((id) => session.measures.find((m) => m.id === id)).filter((m): m is Measure => !!m)
  const goalsArePlaceholders = thresholds?.isPlaceholder !== false
  return (
    <div className="space-y-10">
      <Verdict session={session} />
      {session.issues.length > 0 && <Problems session={session} />}

      <section aria-labelledby="scores-title">
        <SectionTitle hint="Calculated by the scoring pipeline from the coded conversation.">
          <span id="scores-title">Key scores</span>
        </SectionTitle>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {measures.map((m) => (
            <li key={m.id}>
              <ScoreTile measure={m} placeholder={goalsArePlaceholders} />
            </li>
          ))}
        </ul>
        {goalsArePlaceholders && (
          <p className="mt-3 text-sm text-navy-500">* Goals are placeholders until the sponsor confirms them.</p>
        )}
      </section>

      <OverallRatings session={session} />
    </div>
  )
}

function Verdict({ session }: { session: ScoredSession }) {
  const n = session.issues.length
  return (
    <Card className="flex items-center gap-5 p-6 sm:p-8">
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${n === 0 ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-700'}`}
      >
        <Icon name={n === 0 ? 'check' : 'alert'} className="h-7 w-7" />
      </span>
      <div>
        <p className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {n === 0 ? 'No problems found' : `${n} problem${n === 1 ? '' : 's'} found`}
        </p>
        <p className="mt-1 text-navy-600">
          {n === 0
            ? 'Nothing in this conversation missed a goal or broke a rule.'
            : 'Each one is listed below. Click "Show me" to jump to that moment in the conversation.'}
        </p>
      </div>
    </Card>
  )
}

function Problems({ session }: { session: ScoredSession }) {
  return (
    <section aria-labelledby="problems-title">
      <SectionTitle>
        <span id="problems-title">Problems</span>
      </SectionTitle>
      <ul className="space-y-3">
        {session.issues.map((issue) => (
          <li key={issue.issue_id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <IssueTypePill type={issue.type} />
                  <p className="mt-2 text-lg font-semibold text-navy-900">{issue.title}</p>
                  <p className="mt-0.5 text-navy-600">{issue.detail}</p>
                  {issue.evidence_quote && (
                    <p className="mt-2 border-l-2 border-brand-300 pl-3 text-navy-700 italic">“{issue.evidence_quote}”</p>
                  )}
                </div>
                {issue.turns.length > 0 && (
                  <TurnLink
                    turn={issue.turns[0]}
                    className={`${textLink} inline-flex items-center gap-1 text-sm whitespace-nowrap`}
                  >
                    Show me <Icon name="arrowRight" className="h-4 w-4" />
                  </TurnLink>
                )}
              </div>
              <p className="mt-3 text-xs text-navy-500">
                {ISSUE_TYPE_COPY[issue.type].explain} · {issue.issue_id}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

const N_LABEL: Record<string, string> = {
  pct_complex_reflections: 'reflections',
  reflection_to_question: 'reflections and questions',
  total_mia: 'coach messages',
  total_mina: 'coach messages',
  relational: 'messages',
  technical: 'messages',
}

function ScoreTile({ measure, placeholder }: { measure: Measure; placeholder: boolean }) {
  const copy = MEASURE_COPY[measure.id]
  const value = formatMeasureValue(measure.id, measure.value)
  const suffix =
    measure.value === null ? '' : copy?.unit === 'outOf5' ? ' / 5' : copy?.unit === 'perQuestion' ? ' per question' : ''
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-navy-900">{copy?.label ?? measure.label}</h3>
        <StatusPill status={measure.status} />
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900">
        {measure.value === null ? 'n/a' : value}
        <span className="text-base font-semibold text-navy-500">{suffix}</span>
      </p>
      <p className="mt-1 text-sm text-navy-500">
        {measure.threshold ? `Goal: ${formatGoal(measure.id, measure.threshold)}${placeholder ? '*' : ''}` : 'No goal set'}
      </p>
      <div className="mt-auto">
        <Explainer>
          {copy && <p>{copy.explain}</p>}
          <p>
            Based on {measure.n} {N_LABEL[measure.id] ?? 'items'}.
            {measure.status === 'insufficient_data' && ' That is too few to give a reliable number.'}
          </p>
          <p className="text-xs text-navy-500">Official measure: {copy?.miti ?? `${measure.label} = ${measure.formula}`}</p>
        </Explainer>
      </div>
    </Card>
  )
}

function OverallRatings({ session }: { session: ScoredSession }) {
  return (
    <section aria-labelledby="ratings-title">
      <SectionTitle hint="A separate AI pass rates the whole conversation from 1 to 5 and points to the messages behind each rating.">
        <span id="ratings-title">Overall impressions</span>
      </SectionTitle>
      <p className="mb-3 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-200">
        <Icon name="info" className="mt-0.5" />
        <span>These ratings haven't been checked against expert reviewers yet, so treat them as a rough guide.</span>
      </p>
      {session.globals.length === 0 ? (
        <Card className="p-6 text-navy-500">No overall ratings for this conversation.</Card>
      ) : (
        <Card className="divide-y divide-navy-100">
          {session.globals.map((g) => (
            <div key={g.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-navy-900">
                  {GLOBAL_COPY[g.id]?.label ?? g.id}
                  {GLOBAL_COPY[g.id] && <span className="ml-2 text-xs font-medium text-navy-500">{GLOBAL_COPY[g.id].miti}</span>}
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
      )}
    </section>
  )
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= score ? 'bg-brand-500' : 'bg-navy-100'}`} />
        ))}
      </span>
      <span className="font-bold text-navy-900">
        {score}
        <span className="font-medium text-navy-500"> / 5</span>
      </span>
    </span>
  )
}
