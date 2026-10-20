import { Fragment } from 'react'
import { Icon } from '../components/Icon'
import { ErrorPanel, Loading, PageContainer, PageTitle, Panel, PlaceholderTag } from '../components/ui'
import { getThresholds } from '../lib/data'
import { formatThreshold } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { MEASURE_LABELS } from '../lib/miti'

const STEPS = [
  { title: 'Transcript', body: 'A coaching conversation in the TranscriptIn shape.', owner: 'Backend', kind: 'data' },
  {
    title: 'Turn coding (LLM)',
    body: 'Every practitioner turn gets MITI 4.2.1 codes, each with a verbatim quote. Client turns are tagged change, sustain or neutral.',
    owner: 'AI',
    kind: 'llm',
  },
  {
    title: 'Exclusions + measures',
    body: "Plain code applies the sponsor's exclusion rules, then counts codes and computes the measures. No LLM.",
    owner: 'Backend',
    kind: 'code',
  },
  {
    title: 'Global ratings (LLM)',
    body: 'A separate pass rates the four globals, 1–5, each citing the turns behind it.',
    owner: 'AI',
    kind: 'llm',
  },
  {
    title: 'Flags + issue log',
    body: 'Thresholds, Table C flags and Table D behaviors become issues with evidence.',
    owner: 'Backend',
    kind: 'code',
  },
  {
    title: 'Review console',
    body: 'This app. It reads the JSON output and shows each code, why it was given and what was flagged.',
    owner: 'Frontend/UX',
    kind: 'ui',
  },
] as const

const KIND_STYLES = {
  data: 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900',
  llm: 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950',
  code: 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950',
  ui: 'border-slate-900 bg-white dark:border-slate-100 dark:bg-slate-900',
}

const RULES = [
  [
    'No real member data or PHI, ever.',
    'Every conversation in this prototype is invented. None of the text comes from AnnoMI, CASAA or any real transcript.',
  ],
  [
    'Mock data has to look like mock data.',
    'Every mock file says "is_mock": true, and the console shows a "MOCK DATA — not real scores" banner whenever mock data is on screen.',
  ],
  [
    'Provenance on everything.',
    'Each session, score and issue shows whether it is real, simulated, reference corpus or internal test data, plus the scorer prompt version and the model id.',
  ],
  [
    'Thresholds belong to the sponsor.',
    'They live in one config file and the console only displays them. They are marked as placeholders until the sponsor confirms them.',
  ],
  [
    'Global ratings are advisory.',
    'The four global ratings, and the Relational and Technical scores built from them, are advisory until the scorer is validated against expert coders.',
  ],
  [
    'The LLM never does the math.',
    'Counts and measures come from plain pipeline code. The console displays them and shows each formula, but never recomputes or "fixes" them.',
  ],
] as const

export function AboutPage() {
  const thresholds = useAsync(() => getThresholds(), [])
  return (
    <PageContainer>
      <PageTitle title="About the AVEN Scorer">
        A batch pipeline that scores health-coaching transcripts against MITI 4.2.1, the standard Motivational Interviewing
        fidelity coding system, so a physician no longer has to read every transcript by hand. Every score comes with the evidence
        behind it, and the scorer is checked against expert human coders.
      </PageTitle>

      <section aria-labelledby="pipeline-title" className="mb-8">
        <h2 id="pipeline-title" className="mb-3 text-lg font-semibold">
          How it works
        </h2>
        <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch">
          {STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <li className={`flex-1 rounded-lg border-2 p-3 ${KIND_STYLES[step.kind]}`}>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Step {i + 1}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{step.body}</p>
                <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">Owner: {step.owner}</p>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden="true" className="flex items-center justify-center text-slate-400">
                  <Icon name="arrowDown" className="h-5 w-5 lg:hidden" />
                  <Icon name="arrowRight" className="hidden h-5 w-5 lg:block" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
        <div className="mt-3 rounded-lg border-2 border-dashed border-sky-400 bg-sky-50 p-3 dark:border-sky-600 dark:bg-sky-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Alongside: validation</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            The scorer's codes and measures are compared with expert human coders on a dev split and a held-out split, along with
            repeat-run reliability and a contamination check. Owner: Validation/QA.
          </p>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-violet-300 bg-violet-50" /> LLM step
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border-2 border-teal-300 bg-teal-50" /> Plain code, no LLM
          </span>
        </p>
      </section>

      <section aria-labelledby="rules-title" className="mb-8">
        <h2 id="rules-title" className="mb-3 text-lg font-semibold">
          The rules this console follows
        </h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {RULES.map(([title, body], i) => (
            <li
              key={title}
              className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Panel
        id="thresholds"
        title="Thresholds (read-only)"
        description="From shared/config/thresholds.json. The sponsor sets these; the console never edits them."
      >
        {thresholds.status === 'loading' && <Loading what="thresholds" />}
        {thresholds.status === 'error' && (
          <ErrorPanel title="Couldn't load thresholds" message={thresholds.error.message} details={thresholds.error.details} />
        )}
        {thresholds.status === 'ready' && (
          <>
            <p
              className={`mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                thresholds.data.isPlaceholder
                  ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
                  : 'border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Icon name="info" className="mt-0.5" />
              <span className="min-w-0">{thresholds.data.status}</span>
            </p>
            <div className="relative overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Measure / flag
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Rule
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {thresholds.data.items.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                      <th scope="row" className="py-2 pr-4 text-left font-medium whitespace-nowrap">
                        {MEASURE_LABELS[t.id] ?? t.id}
                      </th>
                      <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {formatThreshold(t.id, t)}
                          {thresholds.data.isPlaceholder && <PlaceholderTag />}
                        </span>
                      </td>
                      <td className="min-w-64 py-2 text-slate-700 dark:text-slate-300">{t.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </PageContainer>
  )
}
