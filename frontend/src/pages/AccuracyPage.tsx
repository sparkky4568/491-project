import { Icon } from '../components/Icon'
import { useDemoNotice } from '../components/Layout'
import { Card, ErrorPanel, Loading, PageContainer, PageHero, SectionTitle } from '../components/ui'
import { getValidationReport } from '../lib/data'
import { formatScore } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { CODE_INFO, MEASURE_COPY } from '../lib/miti'
import type { ValidationReport } from '../lib/schema'

const CHECKS = [
  ['Does the AI tag behaviors like an expert would?', 'Compare its tags, message by message, with expert human reviewers.'],
  ['Do the scores match the experts?', 'Compare every score with the one the experts calculate.'],
  ['Can it tell good coaching from poor coaching?', 'Strong conversations should clearly score higher than weak ones.'],
  ['Does it give the same answer twice?', 'Score the same conversations several times and compare.'],
] as const

/** Placeholder until Validation/QA runs the real comparison. */
export function AccuracyPage() {
  const state = useAsync(() => getValidationReport(), [])
  const report = state.status === 'ready' ? state.data : null
  useDemoNotice(!!report?.is_mock)

  return (
    <PageContainer narrow>
      <PageHero
        eyebrow="Accuracy check"
        title="Can we trust the scores?"
        accent={report?.is_mock === false ? undefined : 'Not yet.'}
      >
        Before anyone relies on these scores, we'll compare the AI with expert human reviewers. Until that's done, treat every
        score in this tool as unchecked.
      </PageHero>

      {state.status === 'loading' && <Loading what="accuracy report" />}
      {state.status === 'error' && (
        <ErrorPanel title="Couldn't load the report" message={state.error.message} details={state.error.details} />
      )}

      {report && (
        <div className="space-y-10">
          <section>
            <SectionTitle hint="What the accuracy check will answer.">The plan</SectionTitle>
            <ul className="grid gap-4 sm:grid-cols-2">
              {CHECKS.map(([q, how]) => (
                <li key={q}>
                  <Card className="h-full p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                      <Icon name="check" />
                    </span>
                    <p className="mt-3 font-semibold text-navy-900">{q}</p>
                    <p className="mt-1 text-sm text-navy-600">{how}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <details className="group">
            <summary className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
              <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
              {report.is_mock ? 'Preview the report layout (made-up numbers)' : 'Show the full report'}
            </summary>
            <div className="mt-5">
              <ReportPreview report={report} />
            </div>
          </details>
        </div>
      )}
    </PageContainer>
  )
}

function ReportPreview({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-5">
      {report.is_mock && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
          Every number below is invented to show the layout. The real check hasn't run.
        </p>
      )}
      <Card className="p-5">
        <h3 className="font-semibold text-navy-900">Tag-by-tag agreement with experts</h3>
        <p className="mt-1 text-sm text-navy-500">
          Orange bar: AI vs. expert. Dark line: how much two experts agree with each other (the best we can expect). Measured with{' '}
          {report.code_agreement[0]?.metric ?? 'agreement'} on {report.n_sessions} conversations ({report.split} set).
        </p>
        <Bars rows={report.code_agreement.map((r) => ({ key: r.code, label: CODE_INFO[r.code].label, ...r }))} />
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-navy-900">Score agreement with experts</h3>
        <Bars
          rows={report.measure_agreement.map((r) => ({
            key: r.measure,
            label: MEASURE_COPY[r.measure]?.label ?? r.measure,
            ...r,
          }))}
        />
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-navy-500">Good vs. poor coaching (average score)</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">
            {formatScore(report.discriminant.high_mi_mean, 1)} vs. {formatScore(report.discriminant.low_mi_mean, 1)}
          </p>
          <p className="mt-1 text-xs text-navy-500">p = {report.discriminant.p_value ?? '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-navy-500">Same answer when re-run ({report.repeat_run.n_runs} runs)</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{formatScore(report.repeat_run.agreement)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-navy-500">Training-data overlap check</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">
            {{ not_run: 'Not run', pass: 'Passed', concern: 'Concern' }[report.contamination_check.status]}
          </p>
          <p className="mt-1 text-xs text-navy-500">{report.contamination_check.notes}</p>
        </Card>
      </div>
    </div>
  )
}

function Bars({
  rows,
}: {
  rows: Array<{ key: string; label: string; scorer_vs_human: number | null; human_vs_human: number | null }>
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`
  return (
    <table className="mt-4 w-full text-sm">
      <thead className="sr-only">
        <tr>
          <th>Item</th>
          <th>Bar</th>
          <th>AI vs. expert</th>
          <th>Expert vs. expert</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row" className="w-36 py-1.5 pr-3 text-left font-medium text-navy-800 sm:w-48">
              {r.label}
            </th>
            <td className="py-1.5">
              <div className="relative h-3 rounded-full bg-navy-100">
                {r.scorer_vs_human !== null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                    style={{ width: pct(r.scorer_vs_human) }}
                  />
                )}
                {r.human_vs_human !== null && (
                  <div
                    className="absolute -inset-y-1 w-0.5 rounded bg-navy-900"
                    style={{ left: `calc(${pct(r.human_vs_human)} - 1px)` }}
                  />
                )}
              </div>
            </td>
            <td className="w-12 py-1.5 pl-3 text-right font-semibold text-navy-900 tabular-nums">
              {formatScore(r.scorer_vs_human)}
            </td>
            <td className="w-12 py-1.5 pl-1 text-right text-navy-500 tabular-nums">/ {formatScore(r.human_vs_human)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
