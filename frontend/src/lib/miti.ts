/** Display metadata for MITI 4.2.1 codes, measures and labels. No scoring logic lives here. */
import type { ClientTalk, Code, IssueType, MeasureStatus, Provenance, Source } from './schema'

export type CodeGroup = 'question' | 'reflection' | 'information' | 'adherent' | 'non_adherent'

export const CODE_INFO: Record<Code, { name: string; group: CodeGroup }> = {
  Q: { name: 'Question', group: 'question' },
  SR: { name: 'Simple Reflection', group: 'reflection' },
  CR: { name: 'Complex Reflection', group: 'reflection' },
  GI: { name: 'Giving Information', group: 'information' },
  PERSUADE: { name: 'Persuade (without permission)', group: 'non_adherent' },
  PERSUADE_WP: { name: 'Persuade with Permission', group: 'information' },
  AF: { name: 'Affirm', group: 'adherent' },
  SEEK: { name: 'Seeking Collaboration', group: 'adherent' },
  EMPHASIZE: { name: 'Emphasizing Autonomy', group: 'adherent' },
  CONFRONT: { name: 'Confront', group: 'non_adherent' },
}

/** One color family per code group. Chips always carry text, so color is never the only signal. */
export const GROUP_INFO: Record<CodeGroup, { label: string; chip: string; swatch: string }> = {
  question: {
    label: 'Questions',
    chip: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
    swatch: 'bg-sky-500',
  },
  reflection: {
    label: 'Reflections',
    chip: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100',
    swatch: 'bg-violet-500',
  },
  information: {
    label: 'Information',
    chip: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    swatch: 'bg-slate-500',
  },
  adherent: {
    label: 'MI-adherent',
    chip: 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100',
    swatch: 'bg-teal-500',
  },
  non_adherent: {
    label: 'MI non-adherent',
    chip: 'border-red-800 bg-red-700 text-white font-semibold dark:border-red-300 dark:bg-red-600',
    swatch: 'bg-red-700',
  },
}

export const CODE_GROUP_ORDER: CodeGroup[] = ['question', 'reflection', 'information', 'adherent', 'non_adherent']

export const isNonAdherent = (code: Code) => CODE_INFO[code].group === 'non_adherent'

export const CLIENT_TALK_INFO: Record<ClientTalk, { label: string; className: string }> = {
  change: {
    label: 'Change talk',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
  },
  sustain: {
    label: 'Sustain talk',
    className: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100',
  },
  neutral: {
    label: 'Neutral',
    className: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
  },
}

export const GLOBAL_LABELS: Record<string, string> = {
  cultivating_change_talk: 'Cultivating Change Talk',
  softening_sustain_talk: 'Softening Sustain Talk',
  partnership: 'Partnership',
  empathy: 'Empathy',
}

/** Measures derived from the global ratings. They are shown next to the globals. */
export const GLOBAL_DERIVED_MEASURES = ['relational', 'technical']

export const MEASURE_LABELS: Record<string, string> = {
  pct_complex_reflections: '% Complex Reflections',
  reflection_to_question: 'Reflection-to-Question Ratio',
  total_mia: 'Total MI-Adherent',
  total_mina: 'Total MI Non-Adherent',
  relational: 'Relational',
  technical: 'Technical',
  longest_reflection_run: 'Longest reflection run',
}

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  real: 'Real',
  simulated: 'Simulated',
  reference_corpus: 'Reference corpus',
  internal_test: 'Internal test',
}

export const SOURCE_LABELS: Record<Source, string> = {
  aven: 'Aven',
  annomi: 'AnnoMI',
  casaa: 'CASAA',
  other: 'Other',
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  measure_below_threshold: 'Measure below threshold',
  table_c_flag: 'Table C flag',
  table_d_behavior: 'Table D behavior',
}

export const STATUS_LABELS: Record<MeasureStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  no_threshold: 'No threshold',
  insufficient_data: 'Insufficient data',
}
