/**
 * How each result counts toward the session gate, per the sponsor brief v3.2 (sections 3 and 9).
 * Display logic only: the real gate runs in the pipeline. This file just decides which words to show.
 *
 * - Tier A measures (%CR, R:Q, % open questions, caller change-talk ratio) gate the session.
 * - Tier B (MI-adherent / non-adherent counts) and tier C (global ratings) are advisory until validated.
 * - A Table C flag or a Table D behavior marked "fails the session" fails it regardless of the measures.
 * - "Borderline" and "not scoreable" need sponsor definitions (borderline band, minimum length), so they
 *   are not shown yet.
 */
import type { Issue, ScoredSession } from './schema'

export type Tier = 'A' | 'B' | 'C'

export const MEASURE_TIER: Record<string, Tier> = {
  pct_complex_reflections: 'A',
  reflection_to_question: 'A',
  pct_open_questions: 'A',
  caller_change_talk_ratio: 'A',
  total_mia: 'B',
  total_mina: 'B',
  technical: 'C',
  relational: 'C',
}

export const TIER_COPY: Record<Tier, { label: string; explain: string }> = {
  A: { label: 'Gates the session', explain: 'Tier A: missing this threshold fails the session.' },
  B: {
    label: 'Advisory',
    explain: 'Tier B: reported only. It does not change pass or fail until it is validated (CASAA, n=20).',
  },
  C: {
    label: 'Advisory',
    explain: 'Tier C: global rating, reported only. It does not change pass or fail until it is validated (CASAA, n=20).',
  },
}

/** True when this issue fails the session under the gate rules; false when it is advisory only. */
export function failsSession(issue: Pick<Issue, 'type' | 'measure_id'>): boolean {
  if (issue.type === 'measure_below_threshold') return MEASURE_TIER[issue.measure_id ?? ''] === 'A'
  return true // Table C flags and Table D behaviors fail the session
}

export type GateResult = 'pass' | 'fail'

export function gateResult(session: ScoredSession): { result: GateResult; failing: Issue[]; advisory: Issue[] } {
  const failing = session.issues.filter(failsSession)
  const advisory = session.issues.filter((i) => !failsSession(i))
  return { result: failing.length > 0 ? 'fail' : 'pass', failing, advisory }
}
