import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Card, ENTRY_ICONS, Pill, ScoreabilityChip, SectionTitle, StatusPill, TONE, focusRing } from '../../components/ui'
import { formatMeasureValue, measureUnit } from '../../lib/format'
import {
  ENTRY_TYPE_COPY,
  GLOBAL_MEASURES,
  GLOBAL_MEASURE_NOTE,
  MEASURE_COPY,
  REPORTED_MEASURES,
  THRESHOLD_MEASURES,
  canonicalMeasureId,
  coachWords,
  itemLabel,
  nodeLabel,
} from '../../lib/miti'
import type { SessionTab } from '../../lib/router'
import type { EntryType, Measure, ScoredSession, Threshold } from '../../lib/schema'
import { sessionTopic } from '../../lib/sessionStats'
import { withheldMeasures, withheldReason } from '../../lib/withheld'
import { TurnSpanLink, linkClass } from './turnNav'

/** "at least 50%", "exactly 0", "at most 2". */
export function thresholdWords(id: string, t: Pick<Threshold, 'op' | 'value'>): string {
  const value = measureUnit(id) === 'percent' ? formatMeasureValue(id, t.value) : String(Number(t.value.toFixed(2)))
  switch (t.op) {
    case '>=':
      return `at least ${value}`
    case '<=':
      return `at most ${value}`
    case '>':
      return `more than ${value}`
    case '<':
      return `under ${value}`
    case '==':
      return `exactly ${value}`
  }
}

function byCanonical(session: ScoredSession) {
  const map = new Map<string, Measure>()
  for (const m of session.measures) map.set(canonicalMeasureId(m.id), m)
  return map
}

function splitMeasures(session: ScoredSession) {
  const measures = byCanonical(session)
  const known = new Set([...THRESHOLD_MEASURES, ...REPORTED_MEASURES])
  const extra = [...measures.entries()].filter(([id]) => !known.has(id))
  const compared = [
    ...THRESHOLD_MEASURES.map((id) => measures.get(id)),
    ...extra.filter(([, m]) => m.threshold !== null).map(([, m]) => m),
  ].filter((m): m is Measure => !!m)
  const reported = [
    ...REPORTED_MEASURES.map((id) => measures.get(id)),
    ...extra.filter(([, m]) => m.threshold === null).map(([, m]) => m),
  ].filter((m): m is Measure => !!m)
  return { compared, reported }
}

const rated = (m: Measure) => m.value !== null && (m.status === 'meets' || m.status === 'below')

// --------------------------------------------------------------------- Tab

export function Summary({
  session,
  onShowIssues,
  onShowTab,
}: {
  session: ScoredSession
  onShowIssues: (type: EntryType) => void
  onShowTab: (tab: SessionTab) => void
}) {
  if (session.scoreability.state === 'not_scoreable')
    return (
      <div className="space-y-6">
        <NotScoreableCard session={session} onView={() => onShowTab('transcript')} />
        <SafetyVolleys session={session} />
      </div>
    )
  return (
    <div className="space-y-6">
      <Found session={session} onShowIssues={onShowIssues} />
      {session.scoreability.state === 'outside_instrument' && (
        <p className={`flex items-start gap-2 rounded-md border px-4 py-3 type-small ${TONE.insufficient}`}>
          <Icon name="info" className="mt-0.5" />
          The goal in this call was a decision, which MITI does not cover, so the measures are counted, not rated.
        </p>
      )}
      <MeasuresCard session={session} />
      <ReportedCard session={session} />
      <WithheldList session={session} />
      <SafetyNote session={session} />
      <SafetyVolleys session={session} />
    </div>
  )
}

// ------------------------------------------------------------- Found tiles

function Found({ session, onShowIssues }: { session: ScoredSession; onShowIssues: (type: EntryType) => void }) {
  const rows = (type: EntryType) => session.issues.filter((i) => i.entry_type === type)
  const uniqueLabels = (type: EntryType) => [...new Set(rows(type).map((i) => itemLabel(type, i.item).label))]
  const measureItems = new Set(rows('MEASURE').map((i) => i.item))
  const clinician = session.table_d.filter((h) => h.clinician_review).length
  const tiles: Array<{ type: EntryType; count: number; detail: string }> = [
    { type: 'MEASURE', count: measureItems.size, detail: uniqueLabels('MEASURE').join(', ') },
    { type: 'TABLE_C', count: rows('TABLE_C').length, detail: uniqueLabels('TABLE_C').join('; ') },
    {
      type: 'TABLE_D',
      count: rows('TABLE_D').length,
      detail:
        clinician > 0 ? `${clinician} need${clinician === 1 ? 's' : ''} clinician review` : uniqueLabels('TABLE_D').join(', '),
    },
  ]
  return (
    <section aria-labelledby="found-title">
      <h2 id="found-title" className="mb-3 type-h3 text-ink">
        What the scorer found
      </h2>
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {tiles.map(({ type, count, detail }) => {
          const label = type === 'TABLE_D' ? ENTRY_TYPE_COPY.TABLE_D.label : ENTRY_TYPE_COPY[type].plural
          const body = (
            <>
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subtle text-ink-2"
              >
                <Icon name={ENTRY_ICONS[type]} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3 md:block">
                <span className="block type-number text-ink max-md:text-[22px] max-md:leading-7">{count}</span>
                <span className="block min-w-0">
                  <span className="block type-small-strong text-ink md:mt-1">{label}</span>
                  {count > 0 && detail && <span className="mt-0.5 block type-caption text-ink-2">{detail}</span>}
                </span>
              </span>
              {count > 0 && <Icon name="arrowRight" className="self-center text-link" />}
            </>
          )
          return (
            <li key={type}>
              {count > 0 ? (
                <button
                  type="button"
                  onClick={() => onShowIssues(type)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-card transition hover:bg-info-bg md:items-start ${focusRing}`}
                >
                  {body}
                  <span className="sr-only">, show in the issue log</span>
                </button>
              ) : (
                <div className="flex min-h-14 w-full items-start gap-3 rounded-lg border border-line bg-surface p-4">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- Measures

function measureLabel(m: Measure) {
  return MEASURE_COPY[canonicalMeasureId(m.id)]?.label ?? m.label
}

function measureSub(m: Measure): string {
  const id = canonicalMeasureId(m.id)
  if (GLOBAL_MEASURES.has(id)) return GLOBAL_MEASURE_NOTE
  return MEASURE_COPY[id]?.miti ?? `${m.label} = ${m.formula}`
}

function basedOn(m: Measure): string {
  return `${m.n} ${MEASURE_COPY[canonicalMeasureId(m.id)]?.nLabel ?? 'items'}`
}

function ValueText({ m, className = 'type-h3' }: { m: Measure; className?: string }) {
  const id = canonicalMeasureId(m.id)
  if (!rated(m))
    return (
      <span className={`${className} text-muted`}>
        n/a<span className="sr-only"> (not available)</span>
      </span>
    )
  return <span className={`${className} text-ink tabular-nums`}>{formatMeasureValue(id, m.value)}</span>
}

function MeasuresCard({ session }: { session: ScoredSession }) {
  const { compared } = splitMeasures(session)
  const title = (
    <div className="p-5 sm:p-6">
      <h2 className="type-h2 text-ink">Measures against sponsor thresholds</h2>
      <p className="mt-1 max-w-3xl type-small text-ink-2">
        Thresholds are fixed by Sponsor Deliverables v1.2 for the whole project. Each measure is shown next to its threshold; no
        overall verdict is given.
      </p>
    </div>
  )
  if (compared.length === 0)
    return (
      <Card>
        {title}
        <p className="px-6 pb-6 type-small text-ink-2">The scorer returned no measures for this call.</p>
      </Card>
    )
  return (
    <Card className="overflow-hidden">
      {title}
      {/* Wide screens: a table. */}
      <table className="hidden w-full text-left type-small md:table">
        <caption className="sr-only">Measures against sponsor thresholds</caption>
        <thead className="bg-subtle type-caption text-muted">
          <tr>
            <th scope="col" className="px-6 py-2.5 font-medium">
              Measure
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Value
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Sponsor threshold
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2.5 pr-6 font-medium">
              Based on
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {compared.map((m) => {
            const id = canonicalMeasureId(m.id)
            const why = withheldReason(m, session)
            return (
              <tr key={m.id} className="align-top">
                <th scope="row" className="px-6 py-3.5 text-left font-normal">
                  <span className="block type-small-strong text-ink">
                    {measureLabel(m)}
                    {GLOBAL_MEASURES.has(id) && ' (global, 1 to 5)'}
                  </span>
                  <span className="mt-0.5 block type-caption text-muted">{measureSub(m)}</span>
                  {why && <span className="mt-1 block type-caption text-ink-2">{why}</span>}
                </th>
                <td className="px-4 py-3.5">
                  <ValueText m={m} />
                </td>
                <td className="px-4 py-3.5 text-ink">{m.threshold ? thresholdWords(id, m.threshold) : 'none set'}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={m.status} mock={session.is_mock} />
                </td>
                <td className="px-4 py-3.5 pr-6 text-ink tabular-nums">{basedOn(m)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* Phones: a stacked list. */}
      <ul className="divide-y divide-divider border-t border-divider md:hidden">
        {compared.map((m) => {
          const id = canonicalMeasureId(m.id)
          const why = withheldReason(m, session)
          return (
            <li key={m.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="type-small-strong text-ink">
                  {measureLabel(m)}
                  {GLOBAL_MEASURES.has(id) && ' (global)'}
                </p>
                <StatusPill status={m.status} mock={session.is_mock} />
              </div>
              <p className="mt-1 flex items-baseline gap-2">
                <ValueText m={m} className="type-h2" />
                <span className="type-small text-ink-2">
                  threshold {m.threshold ? thresholdWords(id, m.threshold) : 'none set'}
                </span>
              </p>
              <p className="mt-0.5 type-caption text-muted">
                {GLOBAL_MEASURES.has(id) ? 'can flag for review, never passes' : basedOn(m)}
              </p>
              {why && <p className="mt-1 type-caption text-ink-2">{why}</p>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ReportedCard({ session }: { session: ScoredSession }) {
  const { reported } = splitMeasures(session)
  if (reported.length === 0) return null
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="type-h2 text-ink">Reported only</h2>
        <StatusPill status="reported" />
      </div>
      <p className="mt-2 type-small text-ink-2">
        The sponsor set no threshold for these. They are shown for context and never compared or flagged.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
        {reported.map((m) => {
          const id = canonicalMeasureId(m.id)
          const copy = MEASURE_COPY[id]
          const shown = m.value !== null && m.status === 'reported'
          const why = withheldReason(m, session)
          return (
            <li key={m.id} className="rounded-md bg-subtle p-4">
              <p className="type-small-strong text-ink">{measureLabel(m)}</p>
              <p className="mt-1">
                {shown ? (
                  <span className="type-number text-ink">{formatMeasureValue(id, m.value)}</span>
                ) : (
                  <span className="type-number text-muted">
                    n/a<span className="sr-only"> (not available)</span>
                  </span>
                )}
              </p>
              <p className="mt-1 type-mono text-muted">{copy?.miti.split(' = ')[1] ?? m.formula}</p>
              <p className="mt-1 type-caption text-ink-2">{why ?? basedOn(m)}</p>
              {id === 'caller_change_talk_ratio' && (
                <p className="mt-0.5 type-caption text-ink-2">Depends on the caller as much as the coach.</p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Every measure and rating not reported for this session, each with its reason, in one list. */
function WithheldList({ session }: { session: ScoredSession }) {
  const items = withheldMeasures(session)
  if (items.length === 0) return null
  return (
    <Card as="section" className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 id="withheld-measures" className="type-h3 text-ink">
          Not reported for this session
        </h2>
        <p className="mt-1 type-small text-ink-2">
          Withheld because of the session's scoreability or too little data. None of these is a finding.
        </p>
      </div>
      <ul className="divide-y divide-divider border-t border-divider">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:px-6">
            <div className="min-w-0 sm:w-1/3">
              <p className="type-small-strong text-ink">{item.label}</p>
              <p className="type-mono break-all text-muted">{item.code}</p>
            </div>
            <p className="type-small text-ink-2 sm:flex-1">{item.reason}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ------------------------------------------------------------ Not scoreable

export function NotScoreableCard({ session, onView }: { session: ScoredSession; onView: () => void }) {
  const volleys = session.scoreability.agent_volleys
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <ScoreabilityChip state="not_scoreable" />
        <p className="type-h3 text-ink">
          <span className="type-mono">{session.session_id}</span> {sessionTopic(session)}
        </p>
      </div>
      <p className="mt-3 type-small text-ink-2">
        {volleys < 5
          ? `This conversation has ${volleys} coach volley${volleys === 1 ? '' : 's'}; the sponsor needs at least 5.`
          : 'None of the coach volleys could be coded (greetings, sign-offs and similar).'}{' '}
        No measures, flags or issue-log rows are produced; the scorer refuses rather than estimating. The conversation is still
        shown as received.
        {session.scoreability.reason && <> Reason given: {coachWords(session.scoreability.reason)}</>}
      </p>
      <button type="button" onClick={onView} className={`mt-3 ${linkClass}`}>
        View conversation
      </button>
    </Card>
  )
}

// ------------------------------------------------------------ Safety node

function SafetyNote({ session }: { session: ScoredSession }) {
  const n = session.safety_volleys.length
  if (n === 0) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-5 py-4">
      <Icon name="shield" className="mt-0.5 text-ink-2" />
      <p className="type-small text-ink">
        {n} volley{n === 1 ? ' was' : 's were'} spoken in the safety node (volley{n === 1 ? '' : 's'}{' '}
        {session.safety_volleys.join(', ')}). By sponsor rule {n === 1 ? 'it is' : 'they are'} left out of every count, rating and
        flag.{' '}
        <button
          type="button"
          className={linkClass}
          onClick={() => {
            const el = document.getElementById('safety-volleys')
            el?.scrollIntoView({ block: 'start' })
            el?.focus({ preventScroll: true })
          }}
        >
          See the list
        </button>
      </p>
    </div>
  )
}

/**
 * deliv v1.2 s4: volleys spoken in safety_response are excluded from coding and listed separately,
 * apart from the transcript. The issue log never quotes them.
 */
export function SafetyVolleys({ session }: { session: ScoredSession }) {
  if (session.safety_volleys.length === 0) return null
  const byNumber = new Map(session.volleys.map((v) => [v.volley, v]))
  return (
    <Card as="section" className="scroll-mt-24 overflow-hidden">
      <div id="safety-volleys" tabIndex={-1} className="scroll-mt-24 p-5 outline-none sm:p-6">
        <SectionTitle
          level={3}
          hint="Listed separately by sponsor rule. These volleys are not coded, counted or rated, and the issue log never quotes them. Safety adherence is reviewed by the sponsor."
        >
          Spoken in the safety node
        </SectionTitle>
      </div>
      <ul className="divide-y divide-divider border-t border-divider">
        {session.safety_volleys.map((n) => {
          const v = byNumber.get(n)
          return (
            <li key={n} className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 type-caption text-muted">
                <Pill className={TONE.reported}>
                  <Icon name="shield" className="h-3.5 w-3.5" />
                  Volley {n}
                </Pill>
                {v && <TurnSpanLink start={v.turn_start} end={v.turn_end} />}
                {v && v.nodes.length > 0 && (
                  <span className="type-mono">
                    <span className="sr-only">Node: </span>
                    {v.nodes.map(nodeLabel).join(', ')}
                  </span>
                )}
              </div>
              {v ? (
                <blockquote className="mt-2 rounded-md border-l-[3px] border-line-strong bg-subtle px-4 py-2 type-body break-words text-ink">
                  "{v.text}"
                </blockquote>
              ) : (
                <p className="mt-2 type-small text-ink-2">This volley number is not in the scored volleys.</p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}
