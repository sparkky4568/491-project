/** Shared building blocks: cards, pills, buttons and page headers. */
import type { ReactNode } from 'react'
import { ISSUE_TYPE_COPY, PROVENANCE_COPY, STATUS_COPY } from '../lib/miti'
import type { IssueType, MeasureStatus, Provenance } from '../lib/schema'
import { Icon, type IconName } from './Icon'

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-navy-950 shadow-[0_6px_16px_-6px_rgba(242,138,36,0.7)] transition hover:bg-brand-400'

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 ring-1 ring-navy-200 transition hover:bg-navy-50 disabled:opacity-50'

export const textLink =
  'font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-600'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,47,77,0.05),0_12px_32px_-16px_rgba(16,47,77,0.18)] ring-1 ring-navy-900/5 ${className}`}
    >
      {children}
    </div>
  )
}

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 pb-16 sm:px-6 ${narrow ? 'max-w-4xl' : 'max-w-6xl'}`}>{children}</div>
}

/** Big Alvera-style headline: navy text with one phrase in orange. */
export function PageHero({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string
  title: string
  accent?: string
  children?: ReactNode
}) {
  return (
    <header className="pt-10 pb-8 sm:pt-14">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] text-navy-900 sm:text-6xl">
        {title} {accent && <span className="text-brand-700">{accent}</span>}
      </h1>
      {children && <div className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-600">{children}</div>}
    </header>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-brand-700 uppercase ring-1 ring-navy-900/5">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {children}
    </p>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold tracking-tight text-navy-900">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-navy-500">{hint}</p>}
    </div>
  )
}

// ------------------------------------------------------------------- Pills

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}

export function ProvenancePill({ provenance }: { provenance: Provenance }) {
  const tone = provenance === 'real' ? 'bg-navy-900 text-white' : 'bg-navy-100 text-navy-800'
  return (
    <Pill className={tone}>
      <span className="sr-only">Source type: </span>
      {PROVENANCE_COPY[provenance]}
    </Pill>
  )
}

export function DemoPill() {
  return <Pill className="bg-brand-100 text-brand-800">Demo data</Pill>
}

const STATUS_STYLE: Record<MeasureStatus, { className: string; icon: IconName }> = {
  pass: { className: 'bg-green-50 text-green-800 ring-1 ring-green-200', icon: 'check' },
  fail: { className: 'bg-red-50 text-red-800 ring-1 ring-red-200', icon: 'x' },
  no_threshold: { className: 'bg-navy-50 text-navy-600 ring-1 ring-navy-200', icon: 'minus' },
  insufficient_data: { className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', icon: 'dots' },
}

export function StatusPill({ status, label }: { status: MeasureStatus; label?: string }) {
  const style = STATUS_STYLE[status]
  return (
    <Pill className={style.className}>
      <Icon name={style.icon} className="h-3.5 w-3.5" />
      {label ?? STATUS_COPY[status]}
    </Pill>
  )
}

const ISSUE_ICONS: Record<IssueType, IconName> = {
  measure_below_threshold: 'target',
  table_c_flag: 'flag',
  table_d_behavior: 'ban',
}

export function IssueTypePill({ type }: { type: IssueType }) {
  const tone =
    type === 'table_d_behavior'
      ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
      : 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
  return (
    <Pill className={tone}>
      <Icon name={ISSUE_ICONS[type]} className="h-3.5 w-3.5" />
      {ISSUE_TYPE_COPY[type].label}
    </Pill>
  )
}

// ------------------------------------------------------------------ Controls

/** A row of pill buttons where one is selected. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string; count?: number }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 ring-1 ring-navy-900/5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition ${
              active ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`ml-1.5 tabular-nums ${active ? 'text-navy-200' : 'text-navy-500'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Click-to-open explanation, used instead of on-screen jargon. */
export function Explainer({ summary = 'What is this?', children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="group mt-2 text-sm">
      <summary className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-navy-900">
        <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
        {summary}
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed text-navy-600">{children}</div>
    </details>
  )
}

// ---------------------------------------------------------------- States

export function Loading({ what }: { what: string }) {
  return (
    <p role="status" className="py-16 text-center text-navy-500">
      Loading {what}…
    </p>
  )
}

export function ErrorPanel({ title, message, details = [] }: { title: string; message: string; details?: string[] }) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-950 ring-1 ring-red-200">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="alert" /> <span>{title}</span>
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
