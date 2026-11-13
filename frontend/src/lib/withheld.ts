/**
 * Measures the scorer did not report for a session, and why. Display only: the statuses and
 * values come from the scorer; nothing here recomputes a score.
 */
import { GLOBAL_COPY, MEASURE_COPY, canonicalMeasureId, coachWords } from './miti'
import type { Measure, ScoredSession, Source } from './schema'

/** deliv v1.2 s4: the "too short for ratios" rule is written for the corpora only. */
export const CORPUS_SOURCES: ReadonlySet<Source> = new Set(['annomi', 'casaa'])
export const MIN_VOLLEYS_FOR_RATIOS = 10

/** Coded coach volleys: agent volleys that are not excluded and not spoken in the safety node. */
export function codedAgentVolleys(session: ScoredSession): number {
  const safety = new Set(session.safety_volleys)
  return session.volleys.filter((v) => v.speaker === 'agent' && !v.excluded && !safety.has(v.volley)).length
}

/** true for an AnnoMI or CASAA session under 10 coded coach volleys, where only counts are reported. */
export function isShortCorpusSession(session: ScoredSession): boolean {
  return CORPUS_SOURCES.has(session.source) && codedAgentVolleys(session) < MIN_VOLLEYS_FOR_RATIOS
}

/** The plain-English reason a measure is insufficient_data or not_rated; null for reported values. */
export function withheldReason(measure: Measure, session: ScoredSession): string | null {
  if (measure.status === 'insufficient_data') {
    if (isShortCorpusSession(session))
      return `Corpus session (${session.source === 'annomi' ? 'AnnoMI' : 'CASAA'}) with ${codedAgentVolleys(session)} coded coach volleys. By sponsor rule, corpus sessions under ${MIN_VOLLEYS_FOR_RATIOS} report counts, not ratios.`
    if (measure.note) return coachWords(measure.note)
    if (measure.n === 0) return 'Nothing to compute it from in this session (its count is 0).'
    return 'Too little data to compute this measure.'
  }
  if (measure.status === 'not_rated') {
    if (measure.note) return coachWords(measure.note)
    const state = session.scoreability.state
    if (state === 'outside_instrument') return 'Counted, not scored: the change goal is a decision.'
    if (session.channel === 'text') return 'Text conversations have no timings, so they get no overall ratings.'
    if (state === 'counts_only' && canonicalMeasureId(measure.id) === 'technical_global')
      return 'Technique is rated only for full sessions (10 minutes or longer, with a behavior goal reached).'
    return 'Not rated for this kind of call.'
  }
  return null
}

export interface WithheldItem {
  key: string
  label: string
  /** The scorer's id, e.g. pct_open_questions, or the global rating names. */
  code: string
  reason: string
}

const TECHNICAL_GLOBALS = ['cultivating_change_talk', 'softening_sustain_talk']
const RELATIONAL_GLOBALS = ['partnership', 'empathy']

function globalsReason(session: ScoredSession, technicalOnly: boolean): string {
  if (session.scoreability.state === 'outside_instrument') return 'Counted, not scored: the change goal is a decision.'
  if (session.channel === 'text') return 'Text conversations have no timings, so they get no overall ratings.'
  if (technicalOnly) return 'Technique is rated only for full sessions (10 minutes or longer, with a behavior goal reached).'
  return 'The scorer gave no overall ratings for this session.'
}

/**
 * One list of everything withheld: measures marked insufficient_data or not_rated, plus the MITI
 * global ratings that were not given. Empty for not_scoreable sessions, where nothing is reported.
 */
export function withheldMeasures(session: ScoredSession): WithheldItem[] {
  if (session.scoreability.state === 'not_scoreable') return []
  const out: WithheldItem[] = []
  for (const m of session.measures) {
    const reason = withheldReason(m, session)
    if (reason === null) continue
    const id = canonicalMeasureId(m.id)
    out.push({ key: `m-${m.id}`, label: MEASURE_COPY[id]?.label ?? m.label, code: m.id, reason })
  }
  const given = new Set(session.globals.map((g) => g.id))
  const missing = (ids: string[]) => ids.filter((id) => !given.has(id))
  const missingTechnical = missing(TECHNICAL_GLOBALS)
  const missingRelational = missing(RELATIONAL_GLOBALS)
  const group = (ids: string[], label: string, technicalOnly: boolean) =>
    out.push({
      key: `g-${ids.join('-')}`,
      label,
      code: ids.map((id) => GLOBAL_COPY[id]?.miti ?? id).join(', '),
      reason: globalsReason(session, technicalOnly),
    })
  if (missingTechnical.length > 0 && missingRelational.length > 0)
    group([...missingTechnical, ...missingRelational], 'Overall ratings', false)
  else if (missingTechnical.length > 0) group(missingTechnical, 'Technique ratings', true)
  else if (missingRelational.length > 0) group(missingRelational, 'Relationship ratings', false)
  return out
}
