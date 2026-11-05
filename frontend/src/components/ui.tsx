/** Shared building blocks: cards, pills, buttons and section headers. */
import type { ReactNode } from 'react'
import { ENTRY_TYPE_COPY, SCOREABILITY_COPY, STATUS_COPY } from '../lib/miti'
import type { EntryType, MeasureStatus, Scoreability } from '../lib/schema'
import { Icon, type IconName } from './Icon'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

export const primaryButton = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-navy-950 shadow-[0_6px_16px_-6px_rgba(242,138,36,0.7)] transition hover:bg-brand-400 disabled:opacity-60 ${focusRing}`

export const secondaryButton = `inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 ring-1 ring-navy-200 transition hover:bg-navy-50 disabled:opacity-50 ${focusRing}`

export const textLink =
  'font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-600'

/** Filter chip: a toggle button with a count. */
export function chipClass(active: boolean) {
  return `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${focusRing} ${
    active ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-navy-800 ring-navy-200 hover:bg-navy-50'
  }`
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,47,77,0.04),0_10px_28px_-18px_rgba(16,47,77,0.22)] ring-1 ring-navy-900/5 ${className}`}
    >
      {children}
    </div>
  )
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">{children}</div>
}

/** Big headline: navy text with one phrase in orange. */
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
      <h1 className="mt-3 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] text-balance text-navy-900 sm:text-6xl">
        {title} {accent && <span className="block text-brand-700">{accent}</span>}
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

/** A section header: title, an optional one-line hint, and an optional action on the right. */
export function SectionTitle({
  id,
  children,
  hint,
  action,
}: {
  id?: string
  children: ReactNode
  hint?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-navy-900/10 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
          {children}
        </h2>
        {hint && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-navy-500">{hint}</p>}
      </div>
      {action}
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

export const STATUS_STYLE: Record<MeasureStatus, { className: string; icon: IconName }> = {
  meets: { className: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200', icon: 'check' },
  below: { className: 'bg-brand-50 text-brand-800 ring-1 ring-brand-300', icon: 'flag' },
  reported: { className: 'bg-navy-50 text-navy-600 ring-1 ring-navy-200', icon: 'info' },
  insufficient_data: { className: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200', icon: 'dots' },
  not_rated: { className: 'bg-navy-50 text-navy-600 ring-1 ring-navy-200', icon: 'minus' },
}

export function StatusPill({ status }: { status: MeasureStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <Pill className={style.className}>
      <Icon name={style.icon} className="h-3.5 w-3.5" />
      {STATUS_COPY[status]}
    </Pill>
  )
}

export const ENTRY_ICONS: Record<EntryType, IconName> = { MEASURE: 'target', TABLE_C: 'flag', TABLE_D: 'ban' }

export function EntryTypePill({ type }: { type: EntryType }) {
  const tone =
    type === 'TABLE_D'
      ? 'bg-red-50 text-red-900 ring-1 ring-red-200'
      : type === 'TABLE_C'
        ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
        : 'bg-navy-50 text-navy-800 ring-1 ring-navy-200'
  return (
    <Pill className={tone}>
      <Icon name={ENTRY_ICONS[type]} className="h-3.5 w-3.5" />
      {ENTRY_TYPE_COPY[type].label}
    </Pill>
  )
}

const SCOREABILITY_STYLE: Record<Scoreability, { className: string; icon: IconName }> = {
  full: { className: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: 'check' },
  counts_only: { className: 'bg-sky-50 text-sky-900 ring-sky-200', icon: 'dots' },
  outside_instrument: { className: 'bg-amber-50 text-amber-900 ring-amber-200', icon: 'info' },
  not_scoreable: { className: 'bg-navy-100 text-navy-800 ring-navy-200', icon: 'minus' },
}

export function ScoreabilityChip({ state }: { state: Scoreability }) {
  const style = SCOREABILITY_STYLE[state]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ring-1 ${style.className}`}
    >
      <Icon name={style.icon} className="h-4 w-4" />
      <span>
        <span className="sr-only">Scoreability: </span>
        {SCOREABILITY_COPY[state].label}
      </span>
    </span>
  )
}

// ------------------------------------------------------------------ Controls

/** Click-to-open explanation, used instead of on-screen jargon. */
export function Explainer({ summary = 'What is this?', children }: { summary?: string; children: ReactNode }) {
  return (
    <details className="group mt-2 text-sm">
      <summary className="inline-flex items-center gap-1 rounded font-semibold text-navy-500 hover:text-navy-900">
        <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180 motion-reduce:transition-none" />
        {summary}
      </summary>
      <div className="mt-2 space-y-1.5 leading-relaxed text-navy-600">{children}</div>
    </details>
  )
}

// ---------------------------------------------------------------- States

export function ErrorPanel({ title, message, details = [] }: { title: string; message: string; details?: string[] }) {
  return (
    <div role="alert" className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-red-200 sm:p-6">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-200"
      >
        <Icon name="alert" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-bold text-navy-900">{title}</p>
        <p className="mt-1 text-navy-700">{message}</p>
        {details.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-navy-50 p-3 font-mono text-xs break-words text-navy-800">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** A calm "nothing here" card. */
export function EmptyState({ icon = 'check', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-navy-200 bg-white/60 p-5 sm:p-6">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600 ring-1 ring-navy-200"
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-navy-900">{title}</p>
        {children && <div className="mt-1 text-sm leading-relaxed text-navy-600">{children}</div>}
      </div>
    </div>
  )
}
