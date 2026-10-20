/** Small presentational building blocks shared by every page. */
import type { ReactNode } from 'react'
import { ISSUE_TYPE_LABELS, PROVENANCE_LABELS, STATUS_LABELS } from '../lib/miti'
import type { IssueType, MeasureStatus, Provenance } from '../lib/schema'
import { Icon, type IconName } from './Icon'

// ----------------------------------------------------------------- Tooltip

/**
 * Visual tooltip on hover and keyboard focus. It is aria-hidden, so put the same
 * information in the trigger's accessible name (aria-label or sr-only text).
 */
export function Tooltip({
  text,
  children,
  align = 'center',
  hidden = false,
}: {
  text: string
  children: ReactNode
  align?: 'center' | 'start' | 'end'
  hidden?: boolean
}) {
  const position = { center: 'left-1/2 -translate-x-1/2', start: 'left-0', end: 'right-0' }[align]
  return (
    <span className="group/tip relative inline-flex">
      {children}
      {!hidden && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-full z-40 mb-1.5 hidden w-max max-w-64 rounded-md bg-slate-900 px-2 py-1 text-xs leading-snug font-normal whitespace-normal text-white shadow-lg group-focus-within/tip:block group-hover/tip:block dark:bg-slate-100 dark:text-slate-900 ${position}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}

// ------------------------------------------------------------------- Badges

const PROVENANCE_STYLES: Record<Provenance, string> = {
  real: 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900',
  simulated: 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100',
  reference_corpus: 'border-stone-300 bg-stone-100 text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100',
  internal_test:
    'border-dashed border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100',
}

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${PROVENANCE_STYLES[provenance]}`}
    >
      <span className="sr-only">Provenance: </span>
      {PROVENANCE_LABELS[provenance]}
    </span>
  )
}

export function MockTag() {
  return (
    <span className="inline-flex items-center rounded border border-amber-600 bg-amber-100 px-1.5 py-px text-[11px] font-bold tracking-wide text-amber-950 dark:border-amber-400 dark:bg-amber-900 dark:text-amber-50">
      MOCK
    </span>
  )
}

const STATUS_STYLES: Record<MeasureStatus, { className: string; icon: IconName }> = {
  pass: {
    className: 'border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100',
    icon: 'check',
  },
  fail: { className: 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100', icon: 'x' },
  no_threshold: {
    className: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
    icon: 'minus',
  },
  insufficient_data: {
    className: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    icon: 'dots',
  },
}

export function StatusBadge({ status, label }: { status: MeasureStatus; label?: string }) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style.className}`}
    >
      <Icon name={style.icon} className="h-3.5 w-3.5" />
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}

/** Compact pass/fail mark for table cells: icon + sr-only word. */
export function StatusMark({ status }: { status: MeasureStatus }) {
  const color = {
    pass: 'text-green-700 dark:text-green-400',
    fail: 'text-red-700 dark:text-red-400',
    no_threshold: 'text-slate-500',
    insufficient_data: 'text-amber-700 dark:text-amber-400',
  }[status]
  return (
    <span className={color}>
      <Icon name={STATUS_STYLES[status].icon} className="h-3.5 w-3.5" />
      <span className="sr-only">{STATUS_LABELS[status]}</span>
    </span>
  )
}

const ISSUE_TYPE_ICONS: Record<IssueType, IconName> = {
  measure_below_threshold: 'gauge',
  table_c_flag: 'flag',
  table_d_behavior: 'ban',
}

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const tone =
    type === 'table_d_behavior'
      ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100'
      : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      <Icon name={ISSUE_TYPE_ICONS[type]} className="h-3.5 w-3.5" />
      {ISSUE_TYPE_LABELS[type]}
    </span>
  )
}

export function PlaceholderTag() {
  return (
    <span className="inline-flex items-center rounded border border-dashed border-amber-600 px-1 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-400 dark:text-amber-200">
      placeholder
    </span>
  )
}

// ---------------------------------------------------------- Notes and lines

export function AdvisoryNote() {
  return (
    <p className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
      <Icon name="info" className="mt-px h-4 w-4" />
      <span>
        <strong>Advisory only.</strong> Global ratings (and Relational / Technical) aren't validated against expert coders yet.
        Don't base decisions on them.
      </span>
    </p>
  )
}

/** "How was this produced": prompt version + model, shown under every score and issue. */
export function ProvenanceLine({ items }: { items: Array<[label: string, value: string]> }) {
  return (
    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
      {items.map(([label, value]) => (
        <span key={label}>
          {label} <code className="font-mono text-slate-800 dark:text-slate-200">{value}</code>
        </span>
      ))}
    </p>
  )
}

// ------------------------------------------------------------------- Panels

export function Panel({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 id={`${id}-title`} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{description}</p>}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</div>
}

export function PageTitle({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
      {children && <div className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{children}</div>}
    </div>
  )
}

export function Loading({ what }: { what: string }) {
  return (
    <p role="status" className="py-12 text-center text-sm text-slate-600 dark:text-slate-400">
      Loading {what}…
    </p>
  )
}

export function ErrorPanel({ title, message, details = [] }: { title: string; message: string; details?: string[] }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="alert" /> <span className="min-w-0">{title}</span>
      </p>
      <p className="mt-1">{message}</p>
      {details.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const selectClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export const buttonClass =
  'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'

export const linkClass =
  'text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:decoration-blue-700 dark:text-blue-300 dark:decoration-blue-300/40'

/** Labeled <select> with an "Any" option, used by the list pages' filter bars. */
export function FilterSelect({
  label,
  value,
  onChange,
  children,
  anyLabel = 'Any',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
  anyLabel?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        {children}
      </select>
    </label>
  )
}
