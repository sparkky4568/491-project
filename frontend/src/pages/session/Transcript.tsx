import { memo, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { BehaviorTag, TalkTag } from '../../components/Tags'
import { Card } from '../../components/ui'
import { formatClock, formatTurnSpan } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, SAFETY_NODE, itemLabel, nodeLabel, type CodeGroup } from '../../lib/miti'
import { CODES, type Code, type IssueLogEntry, type ScoredTurn, type Volley } from '../../lib/schema'
import { volleyDomId } from './turnNav'

// ---------------------------------------------------------------- Filtering

export type VolleyFilter = 'all' | 'issues' | 'change' | 'sustain' | Code

export function matchesFilter(volley: Volley, filter: VolleyFilter, issueVolleys: ReadonlySet<number>): boolean {
  if (filter === 'all') return true
  if (filter === 'issues') return issueVolleys.has(volley.volley)
  if (filter === 'change' || filter === 'sustain') return volley.speaker === 'caller' && volley.client_talk === filter
  return volley.speaker === 'agent' && volley.codes.some((c) => c.code === filter)
}

/** Which piece of evidence is open on a volley: a coach tag by index, or the caller's tag. */
export type EvidenceKey = number | 'caller'

export const isSafetyVolley = (v: Volley, safety: ReadonlySet<number>) => safety.has(v.volley) || v.nodes.includes(SAFETY_NODE)

interface Props {
  volleys: Volley[]
  turns: ScoredTurn[]
  safetyVolleys: ReadonlySet<number>
  filter: VolleyFilter
  onFilter: (f: VolleyFilter) => void
  issuesByVolley: Map<number, IssueLogEntry[]>
  open: { volley: number; key: EvidenceKey } | null
  onToggle: (volley: number, key: EvidenceKey) => void
  flashVolley: number | null
  /** false on not_scoreable sessions: no codes, so no filters. */
  showFilters: boolean
}

export function Transcript({
  volleys,
  turns,
  safetyVolleys,
  filter,
  onFilter,
  issuesByVolley,
  open,
  onToggle,
  flashVolley,
  showFilters,
}: Props) {
  const issueVolleys = new Set(issuesByVolley.keys())
  const count = (f: VolleyFilter) => volleys.filter((v) => matchesFilter(v, f, issueVolleys)).length
  const turnsByVolley = new Map<number, ScoredTurn[]>()
  for (const t of turns) turnsByVolley.set(t.volley, [...(turnsByVolley.get(t.volley) ?? []), t])

  // Rows: volleys, "n hidden" gaps when filtering, and a divider whenever the node changes.
  const rows: Array<
    | { kind: 'volley'; volley: Volley }
    | { kind: 'gap'; count: number; key: string }
    | { kind: 'node'; label: string; key: string }
  > = []
  let hidden = 0
  let lastNode: string | null = null
  for (const v of volleys) {
    if (!matchesFilter(v, filter, issueVolleys)) {
      hidden++
      continue
    }
    if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: `gap-${v.volley}` })
    hidden = 0
    const first = v.nodes[0] ?? null
    if (first && first !== lastNode) rows.push({ kind: 'node', label: nodeLabel(first), key: `node-${v.volley}` })
    lastNode = v.nodes[v.nodes.length - 1] ?? lastNode
    rows.push({ kind: 'volley', volley: v })
  }
  if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: 'gap-end' })

  return (
    <div>
      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-white/70 p-3 ring-1 ring-navy-900/5">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="volley-filter" className="text-sm font-semibold text-navy-700">
              Show
            </label>
            <select
              id="volley-filter"
              value={filter}
              onChange={(e) => onFilter(e.target.value as VolleyFilter)}
              className="max-w-[min(18rem,70vw)] min-w-0 rounded-xl bg-white px-3 py-2 text-sm font-medium text-navy-900 ring-1 ring-navy-200"
            >
              <option value="all">Everything ({volleys.length} volleys)</option>
              <option value="issues" disabled={count('issues') === 0}>
                Only messages in the issue log ({count('issues')})
              </option>
              <optgroup label="Caller">
                <option value="change" disabled={count('change') === 0}>
                  {CLIENT_TALK_INFO.change.label} ({count('change')})
                </option>
                <option value="sustain" disabled={count('sustain') === 0}>
                  {CLIENT_TALK_INFO.sustain.label} ({count('sustain')})
                </option>
              </optgroup>
              <optgroup label="Coach">
                {CODES.map((code) => (
                  <option key={code} value={code} disabled={count(code) === 0}>
                    {CODE_INFO[code].label}, {code} ({count(code)})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {filter !== 'all' && (
            <button
              type="button"
              onClick={() => onFilter('all')}
              className="text-sm font-semibold text-brand-700 underline underline-offset-4"
            >
              Show everything
            </button>
          )}
          <Legend />
        </div>
      )}

      <ol className="space-y-5">
        {rows.map((row) =>
          row.kind === 'gap' ? (
            <li key={row.key} className="text-center text-xs font-medium text-navy-500">
              {row.count} volley{row.count === 1 ? '' : 's'} hidden by the filter
            </li>
          ) : row.kind === 'node' ? (
            <li
              key={row.key}
              className="flex items-center gap-3 pt-2 text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase"
            >
              <span aria-hidden="true" className="h-px flex-1 bg-navy-200" />
              <span className="sr-only">Node: </span>
              {row.label}
              <span aria-hidden="true" className="h-px flex-1 bg-navy-200" />
            </li>
          ) : (
            <VolleyRow
              key={row.volley.volley}
              volley={row.volley}
              turns={turnsByVolley.get(row.volley.volley) ?? []}
              safety={isSafetyVolley(row.volley, safetyVolleys)}
              openKey={open?.volley === row.volley.volley ? open.key : null}
              onToggle={onToggle}
              flashing={flashVolley === row.volley.volley}
              issues={issuesByVolley.get(row.volley.volley) ?? []}
            />
          ),
        )}
      </ol>
    </div>
  )
}

function Legend() {
  const groups: CodeGroup[] = ['question', 'listening', 'information', 'supportive', 'pushy']
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500 sm:ml-auto">
      {groups.map((g) => (
        <span key={g} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${GROUP_STYLE[g].dot}`} />
          {GROUP_STYLE[g].label}
        </span>
      ))}
    </p>
  )
}

// ---------------------------------------------------------------- A volley

const VolleyRow = memo(function VolleyRow({
  volley,
  turns,
  safety,
  openKey,
  onToggle,
  flashing,
  issues,
}: {
  volley: Volley
  turns: ScoredTurn[]
  safety: boolean
  openKey: EvidenceKey | null
  onToggle: (volley: number, key: EvidenceKey) => void
  flashing: boolean
  issues: IssueLogEntry[]
}) {
  const coach = volley.speaker === 'agent'
  const excluded = volley.excluded || safety
  const calloutId = `why-${volley.volley}`
  const quote =
    openKey === null
      ? null
      : coach
        ? typeof openKey === 'number'
          ? (volley.codes[openKey]?.evidence_quote ?? null)
          : null
        : volley.client_evidence_quote
  const pushy = coach && volley.codes.some((c) => CODE_INFO[c.code].group === 'pushy')
  const time = formatClock(turns[0]?.start_ms ?? null)
  const turnLabel =
    volley.turn_start === volley.turn_end ? `#${volley.turn_start}` : `#${volley.turn_start} to ${volley.turn_end}`

  const bubble = excluded
    ? 'not-scored border border-dashed border-navy-300 bg-white text-navy-500'
    : coach
      ? `bg-white text-navy-900 shadow-[0_6px_20px_-14px_rgba(16,47,77,0.3)] ${pushy ? 'ring-2 ring-red-300' : 'ring-1 ring-navy-900/5'}`
      : 'bg-navy-900 text-white'

  const issueLabels = [...new Map(issues.map((i) => [`${i.entry_type}-${i.item}`, i])).values()]

  return (
    <li
      id={volleyDomId(volley.volley)}
      tabIndex={-1}
      className={`flex scroll-mt-28 outline-none ${coach ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex w-full max-w-[min(42rem,94%)] min-w-0 flex-col ${coach ? 'items-start' : 'items-end'}`}>
        <p className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs text-navy-500">
          <span className="font-semibold text-navy-700">{coach ? 'Coach' : 'Caller'}</span>
          <span className="tabular-nums" aria-hidden="true">
            {turnLabel}
          </span>
          <span className="sr-only">
            , {formatTurnSpan(volley.turn_start, volley.turn_end)}
            {excluded ? ', not coded' : ''}
          </span>
          {time && <span className="tabular-nums">{time}</span>}
          {volley.nodes.length > 1 && <span>{volley.nodes.map(nodeLabel).join(' then ')}</span>}
        </p>

        <div
          className={`max-w-full rounded-2xl px-4 py-3 text-[15px] leading-7 break-words ${coach ? 'rounded-tl-md' : 'rounded-tr-md'} ${bubble} ${
            flashing ? 'turn-flash' : ''
          }`}
        >
          <VolleyText volley={volley} turns={turns} quote={quote} onDark={!coach && !excluded} />
        </div>

        {excluded &&
          (safety ? (
            <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs font-semibold text-navy-700">
              <Icon name="shield" className="mt-px h-3.5 w-3.5" />
              Excluded by sponsor rule: spoken in the safety node. Not coded, counted or rated.
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-medium text-navy-500">
              Not coded: {volley.exclusion_reason ?? 'excluded by a rule'}
            </p>
          ))}

        {!excluded && (
          <div className={`mt-2 flex flex-wrap gap-1.5 ${coach ? '' : 'justify-end'}`}>
            {coach ? (
              volley.codes.map((c, i) => (
                <BehaviorTag
                  key={i}
                  code={c.code}
                  subtype={c.question_subtype}
                  evidenceValid={c.evidence_valid}
                  active={openKey === i}
                  controls={calloutId}
                  onToggle={() => onToggle(volley.volley, i)}
                />
              ))
            ) : (
              <TalkTag
                talk={volley.client_talk}
                hasQuote={volley.client_evidence_quote !== null}
                active={openKey === 'caller'}
                controls={calloutId}
                onToggle={() => onToggle(volley.volley, 'caller')}
              />
            )}
          </div>
        )}

        <div id={calloutId} className="w-full">
          {openKey !== null && !excluded && <Why volley={volley} openKey={openKey} />}
        </div>

        {issueLabels.length > 0 && (
          <p className="mt-2 inline-flex items-start gap-1.5 text-sm font-semibold text-brand-700">
            <Icon name="flag" className="mt-0.5 h-4 w-4" />
            <span>In the issue log: {issueLabels.map((issue) => itemLabel(issue.entry_type, issue.item).label).join(', ')}</span>
          </p>
        )}
      </div>
    </li>
  )
})

/** The volley's own words, turn by turn, with absorbed caller back-channels shown as small inline chips. */
function VolleyText({
  volley,
  turns,
  quote,
  onDark,
}: {
  volley: Volley
  turns: ScoredTurn[]
  quote: string | null
  onDark: boolean
}) {
  const own = turns.filter((t) => !t.back_channel)
  if (turns.length === 0) return <Highlighted text={volley.text} range={rangeOf(volley.text, quote)} onDark={onDark} />

  // The quote is a substring of volley.text, which is the own turns joined with a space.
  const joined = own.map((t) => t.text).join(' ')
  const range = joined === volley.text ? rangeOf(joined, quote) : null
  let offset = 0
  const parts: ReactNode[] = []
  for (const t of turns) {
    if (t.back_channel) {
      parts.push(' ')
      parts.push(
        <span
          key={t.turn}
          className={`mx-1 inline-flex items-center rounded-full px-2 py-0.5 align-[1px] text-xs font-medium whitespace-nowrap ${
            onDark ? 'bg-white/15 text-white' : 'bg-navy-100 text-navy-700'
          }`}
        >
          Caller: {t.text.trim() || '(no words)'}
        </span>,
      )
      continue
    }
    const start = offset
    offset += t.text.length + 1
    const local = range ? clip(range, start, start + t.text.length) : rangeOf(t.text, quote) // fallback: look for the quote inside this turn alone
    parts.push(
      <span key={t.turn}>
        {parts.length > 0 && ' '}
        <Highlighted text={t.text} range={local} onDark={onDark} />
      </span>,
    )
  }
  return <>{parts}</>
}

type Range = [number, number]

function rangeOf(text: string, quote: string | null): Range | null {
  if (!quote) return null
  const i = text.indexOf(quote)
  return i < 0 ? null : [i, i + quote.length]
}

/** The part of a range that falls inside [start, end), shifted to start at 0. */
function clip(range: Range, start: number, end: number): Range | null {
  const a = Math.max(range[0], start)
  const b = Math.min(range[1], end)
  return a < b ? [a - start, b - start] : null
}

function Highlighted({ text, range, onDark }: { text: string; range: Range | null; onDark: boolean }) {
  if (!range) return <>{text}</>
  return (
    <>
      {text.slice(0, range[0])}
      <mark
        className={`rounded px-0.5 ${onDark ? 'bg-brand-300 text-navy-950' : 'bg-brand-100 text-navy-950 ring-1 ring-brand-300'}`}
      >
        {text.slice(range[0], range[1])}
      </mark>
      {text.slice(range[1])}
    </>
  )
}

/** The explanation shown when a tag is clicked: what the tag means, why it was given, and the exact words. */
function Why({ volley, openKey }: { volley: Volley; openKey: EvidenceKey }) {
  if (volley.speaker === 'caller') {
    if (!volley.client_talk) return null
    const info = CLIENT_TALK_INFO[volley.client_talk]
    return (
      <Card className="mt-2 p-4 text-sm">
        <p className="font-semibold text-navy-900">{info.label}</p>
        <p className="mt-0.5 text-navy-600">{info.explain}</p>
        {volley.client_evidence_quote && (
          <p className="mt-2 text-navy-700">The words: "{volley.client_evidence_quote}" (highlighted above)</p>
        )}
      </Card>
    )
  }
  const tag = typeof openKey === 'number' ? volley.codes[openKey] : undefined
  if (!tag) return null
  const info = CODE_INFO[tag.code]
  const found = volley.text.includes(tag.evidence_quote)
  return (
    <Card className="mt-2 p-4 text-sm">
      <p className="font-semibold text-navy-900">
        {info.label}
        {tag.question_subtype && tag.question_subtype !== 'unknown' && (
          <span className="font-medium text-navy-500">, {tag.question_subtype}</span>
        )}
      </p>
      <p className="mt-0.5 text-navy-600">{info.explain}</p>
      <p className="mt-2 text-navy-800">
        <span className="font-semibold">Why here:</span> {tag.rationale}
      </p>
      {tag.evidence_valid ? (
        <p className="mt-1 text-navy-700">
          The words: "{tag.evidence_quote}"{found ? ' (highlighted above)' : ''}
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-950 ring-1 ring-amber-200">
          <Icon name="alert" className="mt-0.5" />
          <span>
            <strong>Double-check this tag.</strong> The quoted words are not in this volley: "{tag.evidence_quote}"
          </span>
        </p>
      )}
      <p className="mt-2 text-xs text-navy-500">Official code: {info.miti}</p>
    </Card>
  )
}
