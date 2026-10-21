/**
 * Plain-English names for everything the scorer outputs.
 * Each entry keeps the official MITI 4.2.1 name too, so the sponsor can still match terms.
 * Display text only: no scoring logic lives here.
 */
import type { ClientTalk, Code, IssueType, MeasureStatus, Provenance, Source } from './schema'

export type CodeGroup = 'question' | 'listening' | 'information' | 'supportive' | 'pushy'

export interface CodeInfo {
  label: string
  explain: string
  miti: string
  group: CodeGroup
}

export const CODE_INFO: Record<Code, CodeInfo> = {
  Q: { label: 'Question', explain: 'The coach asks something.', miti: 'Question (Q)', group: 'question' },
  SR: {
    label: 'Repeats back',
    explain: "The coach repeats what the person said, close to the person's own words.",
    miti: 'Simple Reflection (SR)',
    group: 'listening',
  },
  CR: {
    label: 'Reflects meaning',
    explain: 'The coach reflects what the person said and adds meaning or feeling. Good coaching has lots of these.',
    miti: 'Complex Reflection (CR)',
    group: 'listening',
  },
  GI: {
    label: 'Gives information',
    explain: 'The coach shares facts or information.',
    miti: 'Giving Information (GI)',
    group: 'information',
  },
  PERSUADE: {
    label: 'Pushes advice',
    explain: 'The coach tells the person what to do, or tries to change their mind, without asking first.',
    miti: 'Persuade (PERSUADE)',
    group: 'pushy',
  },
  PERSUADE_WP: {
    label: 'Advice with permission',
    explain: 'The coach offers advice after asking whether the person wants it.',
    miti: 'Persuade with Permission (PERSUADE_WP)',
    group: 'information',
  },
  AF: {
    label: 'Encourages',
    explain: 'The coach points out a real strength or effort.',
    miti: 'Affirm (AF)',
    group: 'supportive',
  },
  SEEK: {
    label: 'Invites input',
    explain: 'The coach shares control, for example by asking what the person wants to talk about.',
    miti: 'Seeking Collaboration (SEEK)',
    group: 'supportive',
  },
  EMPHASIZE: {
    label: 'Respects choice',
    explain: 'The coach makes it clear the decision belongs to the person.',
    miti: 'Emphasizing Autonomy (EMPHASIZE)',
    group: 'supportive',
  },
  CONFRONT: {
    label: 'Argues',
    explain: 'The coach disagrees with, corrects or criticizes the person.',
    miti: 'Confront (CONFRONT)',
    group: 'pushy',
  },
}

/** One color family per kind of behavior. Tags always carry words, so color is never the only signal. */
export const GROUP_STYLE: Record<CodeGroup, { label: string; tag: string; dot: string }> = {
  question: { label: 'Questions', tag: 'bg-sky-50 text-sky-900 ring-sky-200', dot: 'bg-sky-500' },
  listening: { label: 'Listening', tag: 'bg-violet-50 text-violet-900 ring-violet-200', dot: 'bg-violet-500' },
  information: { label: 'Information', tag: 'bg-slate-100 text-slate-800 ring-slate-200', dot: 'bg-slate-400' },
  supportive: { label: 'Supportive', tag: 'bg-teal-50 text-teal-900 ring-teal-200', dot: 'bg-teal-500' },
  pushy: { label: 'Pushy', tag: 'bg-red-600 text-white ring-red-700', dot: 'bg-red-600' },
}

export const CLIENT_TALK_INFO: Record<ClientTalk, { label: string; explain: string; miti: string }> = {
  change: {
    label: 'Wants to change',
    explain: 'The person gives a reason, wish or plan to change.',
    miti: 'Change talk',
  },
  sustain: {
    label: 'Holding back',
    explain: 'The person gives a reason to keep things the way they are.',
    miti: 'Sustain talk',
  },
  neutral: { label: 'Neutral', explain: 'Neither for nor against change.', miti: 'Neutral' },
}

export interface MeasureCopy {
  label: string
  explain: string
  /** How to show the value, e.g. "82%", "2.2 per question", "4.5 / 5". */
  unit: 'percent' | 'perQuestion' | 'count' | 'outOf5'
  miti: string
}

export const MEASURE_COPY: Record<string, MeasureCopy> = {
  pct_complex_reflections: {
    label: 'Reflections that add meaning',
    explain: "Of the coach's reflections, the share that add meaning instead of just repeating back.",
    unit: 'percent',
    miti: '% Complex Reflections = CR / (SR + CR)',
  },
  reflection_to_question: {
    label: 'Listening vs. asking',
    explain: 'Reflections for every question asked. Good coaching listens more than it asks.',
    unit: 'perQuestion',
    miti: 'Reflection-to-Question ratio = (SR + CR) / Q',
  },
  total_mia: {
    label: 'Supportive moments',
    explain: "Times the coach encouraged, invited input or respected the person's choice.",
    unit: 'count',
    miti: 'Total MI-Adherent = AF + SEEK + EMPHASIZE',
  },
  total_mina: {
    label: 'Pushy moments',
    explain: 'Times the coach pushed advice or argued. This should be zero.',
    unit: 'count',
    miti: 'Total MI Non-Adherent = PERSUADE + CONFRONT',
  },
  relational: {
    label: 'Relationship',
    explain: 'How well the coach partnered with the person and showed understanding.',
    unit: 'outOf5',
    miti: 'Relational = (Partnership + Empathy) / 2',
  },
  technical: {
    label: 'Technique',
    explain: "How well the coach drew out change talk and softened sustain talk (the person's reasons not to change).",
    unit: 'outOf5',
    miti: 'Technical = (Cultivating Change Talk + Softening Sustain Talk) / 2',
  },
}

/** The order key scores appear in. Relationship and Technique come from the overall ratings. */
export const KEY_MEASURES = [
  'pct_complex_reflections',
  'reflection_to_question',
  'total_mina',
  'total_mia',
  'relational',
  'technical',
]

export const GLOBAL_COPY: Record<string, { label: string; miti: string }> = {
  cultivating_change_talk: { label: 'Draws out reasons to change', miti: 'Cultivating Change Talk' },
  softening_sustain_talk: { label: 'Softens sustain talk', miti: 'Softening Sustain Talk' },
  partnership: { label: 'Works as a partner', miti: 'Partnership' },
  empathy: { label: 'Shows understanding', miti: 'Empathy' },
}

export const STATUS_COPY: Record<MeasureStatus, string> = {
  pass: 'Meets threshold',
  fail: 'Below threshold',
  no_threshold: 'Threshold pending',
  insufficient_data: 'Not enough data',
}

export const ISSUE_TYPE_COPY: Record<IssueType, { label: string; explain: string }> = {
  measure_below_threshold: { label: 'Below threshold', explain: "A measure fell short of the sponsor's threshold." },
  table_c_flag: {
    label: 'Reflection balance flag',
    explain: 'Too many reflections in a row, or reflections and questions out of balance (Table C, not part of MITI).',
  },
  table_d_behavior: {
    label: 'Prohibited behavior',
    explain: 'Something Aven must never do (Table D). Clinical items go to clinician review, not a ticket.',
  },
}

/**
 * Problems about the whole conversation (a ratio or an overall rating) aren't tied to one moment,
 * so they don't get a "Show me" link or a marker on individual messages.
 */
export const isMomentProblem = (issue: { type: IssueType; measure_id: string | null }) =>
  issue.type !== 'measure_below_threshold' || issue.measure_id === 'total_mina'

export const PROVENANCE_COPY: Record<Provenance, string> = {
  real: 'Real call',
  simulated: 'Simulated call',
  reference_corpus: 'Example conversation',
  internal_test: 'Team test',
}

export const SOURCE_COPY: Record<Source, string> = {
  aven: 'Aven',
  annomi: 'AnnoMI-style',
  casaa: 'CASAA-style',
  other: 'Other',
}

/** "evoke_change_talk" → "Evoke change talk" */
export function nodeLabel(node: string): string {
  const words = node.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** "cutting back on soda" → "Cutting back on soda" */
export function topicLabel(topic: string): string {
  return topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'Untitled conversation'
}
