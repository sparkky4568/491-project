import type { ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { MockBanner } from '../components/MockBanner'
import { ErrorPanel, Loading, PageContainer, PageTitle, Panel, StatusBadge } from '../components/ui'
import { getValidationReport } from '../lib/data'
import { formatScore, formatTimestamp } from '../lib/format'
import { useAsync } from '../lib/hooks'
import { CODE_INFO, MEASURE_LABELS } from '../lib/miti'
import type { ValidationReport } from '../lib/schema'

/** Placeholder page for Validation/QA (Joel). Reads the report as-is and displays it. */
export function ValidationPage() {
  const state = useAsync(() => getValidationReport(), [])
  return (
    <>
      {state.status === 'ready' && state.data.is_mock && (
        <MockBanner detail="Validation hasn't been run. Every number on this page is invented." />
      )}
      <PageContainer>
        <PageTitle title="Validation">
          How closely the scorer agrees with expert human coders, measured against how closely the humans agree with each other.
        </PageTitle>
        {state.status === 'loading' && <Loading what="validation report" />}
        {state.status === 'error' && (
          <ErrorPanel title="Couldn't load the validation report" message={state.error.message} details={state.error.details} />
        )}
        {state.status === 'ready' && <Report report={state.data} />}
      </PageContainer>
    </>
  )
}

function Report({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-5">
      {report.is_mock && (
        <div className="mock-stripes rounded-lg border-2 border-amber-500 p-5 text-amber-950 dark:text-amber-50">
          <p className="flex items-center gap-2 text-xl font-bold">
            <Icon name="alert" className="h-6 w-6" /> <span>Not run yet: mock numbers</span>
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed">
            The scorer hasn't been validated against expert coders. This page shows the layout Validation/QA will fill in, using
            invented values. Until the real report lands, treat every score in this console as unvalidated.
          </p>
        </div>
      )}

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
        <Meta label="Run">
          <code className="font-mono">{report.run_id}</code>
        </Meta>
        <Meta label="Split">{report.split === 'heldout' ? 'Held-out' : 'Dev'}</Meta>
        <Meta label="Sessions">{report.n_sessions}</Meta>
        {report.generated_at && <Meta label="Generated">{formatTimestamp(report.generated_at)}</Meta>}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          id="code-agreement"
          title="Per-code agreement"
          description="Scorer vs. human, with the human-vs-human ceiling marked on each bar."
        >
          <AgreementBars
            rows={report.code_agreement.map((r) => ({ key: r.code, label: r.code, sublabel: CODE_INFO[r.code].name, ...r }))}
          />
        </Panel>
        <Panel id="measure-agreement" title="Measure agreement" description="Agreement on the session-level summary measures.">
          <AgreementBars
            rows={report.measure_agreement.map((r) => ({ key: r.measure, label: MEASURE_LABELS[r.measure] ?? r.measure, ...r }))}
          />
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Panel id="discriminant" title="Discriminant test" description={report.discriminant.description}>
          <div className="grid grid-cols-2 gap-3">
            <Figure label="High-quality MI mean" value={formatScore(report.discriminant.high_mi_mean, 1)} />
            <Figure label="Low-quality MI mean" value={formatScore(report.discriminant.low_mi_mean, 1)} />
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            p = {report.discriminant.p_value === null ? '—' : report.discriminant.p_value}
          </p>
        </Panel>
        <Panel id="repeat-run" title="Repeat-run reliability" description="Same transcripts scored several times.">
          <Figure label={`Agreement across ${report.repeat_run.n_runs} runs`} value={formatScore(report.repeat_run.agreement)} />
        </Panel>
        <Panel
          id="contamination"
          title="Contamination check"
          description="Could the model have seen the reference corpus in training?"
        >
          <StatusBadge
            status={
              { not_run: 'no_threshold', pass: 'pass', concern: 'fail' }[report.contamination_check.status] as
                'no_threshold' | 'pass' | 'fail'
            }
            label={{ not_run: 'Not run', pass: 'Pass', concern: 'Concern' }[report.contamination_check.status]}
          />
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{report.contamination_check.notes}</p>
        </Panel>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        Owner: Validation/QA (Joel). The report shape is v0 and will change; see{' '}
        <code className="font-mono">docs/DATA_CONTRACT.md</code>.
      </p>
    </div>
  )
}

interface AgreementRow {
  key: string
  label: string
  sublabel?: string
  metric: string
  scorer_vs_human: number | null
  human_vs_human: number | null
  n: number
}

/** Horizontal bars on a 0–1 scale. The bar is scorer-vs-human; the dark tick is the human-vs-human ceiling. */
function AgreementBars({ rows }: { rows: AgreementRow[] }) {
  const metrics = [...new Set(rows.map((r) => r.metric))].join(', ')
  return (
    <div>
      <div
        className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300"
        aria-hidden="true"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-blue-600 dark:bg-blue-400" /> Scorer vs. human
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-0.5 bg-slate-900 dark:bg-slate-100" /> Human vs. human (ceiling)
        </span>
        <span className="text-slate-500 dark:text-slate-400">Metric: {metrics}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Item</th>
            <th>Agreement bar</th>
            <th>Scorer vs. human</th>
            <th>Human vs. human</th>
            <th>n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="align-middle">
              <th scope="row" className="w-28 py-1.5 pr-3 text-left font-normal">
                <span className="block text-xs font-medium text-slate-900 dark:text-slate-100" title={r.sublabel}>
                  <span className={r.sublabel ? 'font-mono' : ''}>{r.label}</span>
                </span>
              </th>
              <td className="py-1.5">
                <div className="relative h-4 rounded-sm bg-slate-100 dark:bg-slate-800">
                  {r.scorer_vs_human !== null && (
                    <div
                      className="absolute inset-y-0.5 left-0 rounded-r bg-blue-600 dark:bg-blue-400"
                      style={{ width: `${Math.max(0, Math.min(1, r.scorer_vs_human)) * 100}%` }}
                    />
                  )}
                  {r.human_vs_human !== null && (
                    <div
                      className="absolute -inset-y-0.5 w-0.5 bg-slate-900 dark:bg-slate-100"
                      style={{ left: `calc(${Math.max(0, Math.min(1, r.human_vs_human)) * 100}% - 1px)` }}
                    />
                  )}
                </div>
              </td>
              <td className="w-12 py-1.5 pl-3 text-right text-xs font-medium tabular-nums">{formatScore(r.scorer_vs_human)}</td>
              <td className="w-12 py-1.5 pl-1 text-right text-xs text-slate-600 tabular-nums dark:text-slate-400">
                / {formatScore(r.human_vs_human)}
              </td>
              <td className="hidden w-14 py-1.5 pl-2 text-right text-xs text-slate-500 tabular-nums sm:table-cell dark:text-slate-400">
                n {r.n}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot aria-hidden="true">
          <tr>
            <td />
            <td className="pt-1">
              <div className="flex justify-between text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                <span>0</span>
                <span>0.5</span>
                <span>1</span>
              </div>
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
