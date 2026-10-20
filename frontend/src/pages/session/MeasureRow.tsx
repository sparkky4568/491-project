import { PlaceholderTag, StatusBadge, Tooltip } from '../../components/ui'
import { formatMeasureValue, formatThreshold } from '../../lib/format'
import type { Measure, ThresholdConfig } from '../../lib/schema'

/**
 * One pipeline-computed measure: value, n, threshold and status, with the formula on hover.
 * Displays the numbers exactly as the pipeline wrote them; nothing is recomputed.
 */
export function MeasureRow({ measure, config }: { measure: Measure; config: ThresholdConfig | null }) {
  const current = config?.items.find((t) => t.id === measure.id)
  const placeholder = measure.threshold?.source === 'placeholder' || config?.isPlaceholder
  const changedSince =
    measure.threshold && current && (current.op !== measure.threshold.op || current.value !== measure.threshold.value)

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <Tooltip text={`Formula: ${measure.formula}`} align="start">
          <span
            tabIndex={0}
            className="cursor-help rounded text-sm font-medium text-slate-900 underline decoration-slate-400 decoration-dotted underline-offset-4 dark:text-slate-100"
          >
            {measure.label}
            <span className="sr-only">. Formula: {measure.formula}</span>
          </span>
        </Tooltip>
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {formatMeasureValue(measure.id, measure.value)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="tabular-nums">n = {measure.n}</span>
        <span aria-hidden="true">·</span>
        {measure.threshold ? (
          <span className="inline-flex items-center gap-1.5">
            Threshold {formatThreshold(measure.id, measure.threshold)}
            {placeholder && <PlaceholderTag />}
          </span>
        ) : (
          <span>No threshold set</span>
        )}
        <span className="ml-auto">
          <StatusBadge status={measure.status} />
        </span>
      </div>
      {changedSince && current && (
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
          thresholds.json now says {formatThreshold(measure.id, current)}; this run was scored against{' '}
          {formatThreshold(measure.id, measure.threshold!)}. Re-run the pipeline to update the status.
        </p>
      )}
    </li>
  )
}
