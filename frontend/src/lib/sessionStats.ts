/**
 * Counts read off a ScoredSession for the Runs list and the session views. Display only: every
 * number here is a count of what the scorer wrote; nothing is scored or ranked again.
 */
import { splitEvidence } from './format'
import { MOMENT_MEASURES, canonicalMeasureId, topicLabel } from './miti'
import type { IssueLogEntry, ScoredSession, Volley } from './schema'

export const sessionTopic = (s: Pick<ScoredSession, 'change_goal' | 'target_behavior'>) =>
  topicLabel(s.change_goal.text ?? s.target_behavior)

export interface RowStats {
  notScoreable: boolean
  coachVolleys: number
  /** Measures compared with a sponsor threshold (meets or below). */
  compared: number
  below: number
  /** Table C flags raised (C1, C2 no questions, C2 no reflections). */
  flowFlags: number
  tableD: number
  clinician: number
}

export function rowStats(session: ScoredSession): RowStats {
  const compared = session.measures.filter((m) => m.status === 'meets' || m.status === 'below')
  const c = session.table_c
  return {
    notScoreable: session.scoreability.state === 'not_scoreable',
    coachVolleys: session.scoreability.agent_volleys,
    compared: compared.length,
    below: compared.filter((m) => m.status === 'below').length,
    flowFlags: c
      ? [c.c1_reflection_run.breach, c.c2_windowed_rq.breach_no_questions, c.c2_windowed_rq.breach_no_reflections].filter(Boolean)
          .length
      : 0,
    tableD: session.table_d.length,
    clinician: session.table_d.filter((h) => h.clinician_review).length,
  }
}

/** Coded agent volleys: not excluded and not spoken in the safety node. */
export function codedAgentSet(session: ScoredSession): Set<number> {
  const safety = new Set(session.safety_volleys)
  return new Set(
    session.volleys.filter((v) => v.speaker === 'agent' && !v.excluded && !safety.has(v.volley)).map((v) => v.volley),
  )
}

/**
 * Coded agent volleys an issue-log row points at. Single-volley rows (Table D, MI Non-Adherent) point at
 * every coded volley in their span. Every row also points at the volleys its evidence quotes come from:
 * evidence is verbatim agent text, so a quote is matched to the volley whose text contains it (inside the
 * row's span first, then anywhere, since a session-level row can cite a volley outside its span).
 * Older "[turn N]" evidence is matched by turn.
 */
export function issueVolleys(
  issue: IssueLogEntry,
  volleys: Volley[],
  turnToVolley: Map<number, number>,
  coded: Set<number>,
): number[] {
  const out = new Set<number>()
  const codedVolleys = volleys.filter((v) => coded.has(v.volley))
  const singleVolley = issue.entry_type === 'TABLE_D' || MOMENT_MEASURES.has(canonicalMeasureId(issue.item))
  if (singleVolley)
    for (let t = issue.turn_start; t <= issue.turn_end; t++) {
      const v = turnToVolley.get(t)
      if (v !== undefined && coded.has(v)) out.add(v)
    }
  const inSpan = (v: Volley) => v.turn_end >= issue.turn_start && v.turn_start <= issue.turn_end
  for (const q of splitEvidence(issue.evidence)) {
    if (q.turn !== null) {
      const v = turnToVolley.get(q.turn)
      if (v !== undefined && coded.has(v)) out.add(v)
      continue
    }
    const hit =
      codedVolleys.find((v) => inSpan(v) && v.text.includes(q.text)) ?? codedVolleys.find((v) => v.text.includes(q.text))
    if (hit) out.add(hit.volley)
  }
  return [...out]
}

export function issuesByVolley(session: ScoredSession): Map<number, IssueLogEntry[]> {
  const turnToVolley = new Map(session.turns.map((t) => [t.turn, t.volley]))
  const coded = codedAgentSet(session)
  const map = new Map<number, IssueLogEntry[]>()
  for (const issue of session.issues)
    for (const v of issueVolleys(issue, session.volleys, turnToVolley, coded)) map.set(v, [...(map.get(v) ?? []), issue])
  return map
}

/** The first turn of the volley an evidence quote came from, for "go to" links. */
export function quoteTurn(
  session: ScoredSession,
  quote: { turn: number | null; text: string },
  near?: IssueLogEntry,
): number | null {
  if (quote.turn !== null) return quote.turn
  const agent = session.volleys.filter((v) => v.speaker === 'agent')
  const inSpan = (v: Volley) => !near || (v.turn_end >= near.turn_start && v.turn_start <= near.turn_end)
  const hit = agent.find((v) => inSpan(v) && v.text.includes(quote.text)) ?? agent.find((v) => v.text.includes(quote.text))
  return hit ? hit.turn_start : null
}
