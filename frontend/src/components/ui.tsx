/** Shared building blocks (Figma "01 Components"): buttons, chips, cards, pills and states. */
import type { ReactNode } from 'react'
import { ENTRY_TYPE_COPY, SCOREABILITY_COPY, STATUS_COPY } from '../lib/miti'
import type { EntryType, MeasureStatus, Scoreability } from '../lib/schema'
import { Icon, type IconName } from './Icon'

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const buttonBase = `inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2.5 type-small-strong transition disabled:cursor-not-allowed disabled:opacity-50 max-lg:min-h-11 ${focusRing}`

/** Primary: action/primary fill, white text. */
export const primaryButton = `${buttonBase} bg-action text-white enabled:hover:bg-action-hover`
/** Secondary: white, 1px border/strong. */
export const secondaryButton = `${buttonBase} border border-line-strong bg-surface text-ink enabled:hover:bg-canvas`
/** Ghost: no fill, link color. */
export const ghostButton = `${buttonBase} px-2 text-link enabled:hover:underline underline-offset-4`

/** Filter chip: 36 high, pill; active = action/primary fill. */
export function chipClass(active: boolean) {
  return `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 type-label whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed ${focusRing} ${
    active ? 'border-action bg-action text-white' : 'border-line-strong bg-surface text-ink enabled:hover:bg-canvas'
  }`
}

export function Card({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}) {
  const Tag = as
  return <Tag className={`rounded-lg border border-line bg-surface shadow-card ${className}`}>{children}</Tag>
}

export function Overline({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`type-overline text-muted ${className}`}>{children}</p>
}

/** A section header: Heading 2, an optional caption, and an optional action on the right. */
export function SectionTitle({
  id,
  children,
  hint,
  action,
  level = 2,
}: {
  id?: string
  children: ReactNode
  hint?: ReactNode
  action?: ReactNode
  level?: 2 | 3
}) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="max-w-3xl min-w-0">
        <H id={id} className={level === 2 ? 'type-h2 text-ink' : 'type-h3 text-ink'}>
          {children}
        </H>
        {hint && <p className="mt-1 type-small text-ink-2">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

// ------------------------------------------------------------------- Pills

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 type-label whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}

export const TONE = {
  meets: 'border-meets-line bg-meets-bg text-meets-fg',
  below: 'border-below-line bg-below-bg text-below-fg',
  reported: 'border-reported-line bg-reported-bg text-reported-fg',
  insufficient: 'border-insuff-line bg-insuff-bg text-insuff-fg',
  notrated: 'border-notrated-line bg-notrated-bg text-notrated-fg',
  danger: 'border-danger-line bg-danger-bg text-danger-fg',
  info: 'border-info-line bg-info-bg text-info-fg',
} as const

export const STATUS_STYLE: Record<MeasureStatus, { className: string; icon: IconName }> = {
  meets: { className: TONE.meets, icon: 'check' },
  below: { className: TONE.below, icon: 'flag' },
  reported: { className: TONE.reported, icon: 'info' },
  insufficient_data: { className: TONE.insufficient, icon: 'dots' },
  not_rated: { className: TONE.notrated, icon: 'minus' },
}

/** mock: the scores are mock or practice data, so meets and below drop their pass/fail colors. */
export function StatusPill({ status, mock = false }: { status: MeasureStatus; mock?: boolean }) {
  const style = STATUS_STYLE[status]
  const neutral = mock && (status === 'meets' || status === 'below')
  return (
    <Pill className={neutral ? TONE.notrated : style.className}>
      <Icon name={style.icon} className="h-3.5 w-3.5" />
      {STATUS_COPY[status]}
      {neutral && ' (mock)'}
    </Pill>
  )
}

export const ENTRY_ICONS: Record<EntryType, IconName> = { MEASURE: 'target', TABLE_C: 'flag', TABLE_D: 'ban' }

/** Categorical, not severity. */
export function EntryTypePill({ type }: { type: EntryType }) {
  const tone = type === 'TABLE_D' ? TONE.danger : type === 'TABLE_C' ? TONE.below : TONE.reported
  return (
    <Pill className={tone}>
      <Icon name={ENTRY_ICONS[type]} className="h-3.5 w-3.5" />
      {ENTRY_TYPE_COPY[type].label}
    </Pill>
  )
}

const SCOREABILITY_STYLE: Record<Scoreability, { className: string; icon: IconName }> = {
  full: { className: TONE.meets, icon: 'check' },
  counts_only: { className: TONE.info, icon: 'dots' },
  outside_instrument: { className: TONE.insufficient, icon: 'info' },
  not_scoreable: { className: TONE.notrated, icon: 'minus' },
}

/** mock: mock or practice scores, shown without the green "full" color. */
export function ScoreabilityChip({ state, mock = false }: { state: Scoreability; mock?: boolean }) {
  const style = SCOREABILITY_STYLE[state]
  const className = mock && state === 'full' ? TONE.notrated : style.className
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 type-small-strong whitespace-nowrap ${className}`}
    >
      <Icon name={style.icon} className="h-4 w-4" />
      <span>
        <span className="sr-only">Scoreability: </span>
        {SCOREABILITY_COPY[state].label}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------- States

export function ErrorPanel({
  title,
  message,
  details = [],
  children,
}: {
  title: string
  message: ReactNode
  details?: string[]
  children?: ReactNode
}) {
  return (
    <div role="alert" className="flex gap-4 rounded-lg border border-danger-line bg-surface p-5 sm:p-6">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger-bg text-danger-fg"
      >
        <Icon name="alert" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-h3 text-ink">{title}</p>
        <div className="mt-1 type-small text-ink-2">{message}</div>
        {details.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-md bg-subtle p-3 type-mono break-words text-ink">
            {details.map((d, i) => (
              <li key={`${i}-${d}`}>{d}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  )
}

/** A calm "nothing here" card with a dashed border. */
export function EmptyState({
  icon = 'check',
  title,
  children,
  centered = false,
}: {
  icon?: IconName
  title: string
  children?: ReactNode
  centered?: boolean
}) {
  return (
    <div
      className={`flex gap-4 rounded-lg border border-dashed border-line-strong bg-surface p-5 sm:p-6 ${
        centered ? 'flex-col items-center px-6 py-10 text-center' : 'items-start'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-md bg-subtle text-ink-2 ${centered ? 'h-12 w-12' : 'h-9 w-9'}`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className={centered ? 'max-w-md' : ''}>
        <p className="type-h3 text-ink">{title}</p>
        {children && <div className="mt-1 type-small text-ink-2">{children}</div>}
      </div>
    </div>
  )
}

/** Skeleton bars while something loads. */
export function Skeleton({ label }: { label: string }) {
  return (
    <Card className="p-6">
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-6 w-1/2" />
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <p className="type-caption text-muted">{label}</p>
      </div>
    </Card>
  )
}

/** A dot plus words: where the scores came from. Never color alone. */
export function SourceDot({ tone }: { tone: 'live' | 'demo' | 'offline' }) {
  const color = tone === 'live' ? 'bg-live' : tone === 'demo' ? 'bg-demo' : 'bg-offline'
  return <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />
}
