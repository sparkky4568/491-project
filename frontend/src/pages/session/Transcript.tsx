import { memo } from 'react'
import { Icon } from '../../components/Icon'
import { BehaviorTag, TalkTag } from '../../components/Tags'
import { Card } from '../../components/ui'
import { formatSeconds } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, nodeLabel, type CodeGroup } from '../../lib/miti'
import { CODES, type Code, type Issue, type ScoredTurn } from '../../lib/schema'

// ---------------------------------------------------------------- Filtering

export type TurnFilter = 'all' | 'problems' | 'change' | 'sustain' | Code

export function matchesFilter(turn: ScoredTurn, filter: TurnFilter, problemTurns: ReadonlySet<number>): boolean {
  if (filter === 'all') return true
  if (filter === 'problems') return problemTurns.has(turn.turn)
  if (filter === 'change' || filter === 'sustain') return turn.speaker === 'client' && turn.client_talk === filter
  return turn.speaker === 'practitioner' && turn.codes.some((c) => c.code === filter)
}

/** Which piece of evidence is open on a message: a coach tag by index, or the person's tag. */
export type EvidenceKey = number | 'client'

interface Props {
  turns: ScoredTurn[]
  filter: TurnFilter
  onFilter: (f: TurnFilter) => void
  problemsByTurn: Map<number, Issue[]>
  open: { turn: number; key: EvidenceKey } | null
  onToggle: (turn: number, key: EvidenceKey) => void
  flashTurn: number | null
}

export function Transcript({ turns, filter, onFilter, problemsByTurn, open, onToggle, flashTurn }: Props) {
  const problemTurns = new Set(problemsByTurn.keys())
  const count = (f: TurnFilter) => turns.filter((t) => matchesFilter(t, f, problemTurns)).length
  const visible = new Set(turns.filter((t) => matchesFilter(t, filter, problemTurns)).map((t) => t.turn))

  // Build rows: messages, "n hidden" gaps when filtering, and a divider whenever the conversation step changes.
  const rows: Array<
    | { kind: 'turn'; turn: ScoredTurn }
    | { kind: 'gap'; count: number; key: string }
    | { kind: 'step'; label: string; key: string }
  > = []
  let hidden = 0
  let lastNode: string | null = null
  for (const turn of turns) {
    if (!visible.has(turn.turn)) {
      hidden++
      continue
    }
    if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: `gap-${turn.turn}` })
    hidden = 0
    if (turn.node && turn.node !== lastNode) rows.push({ kind: 'step', label: nodeLabel(turn.node), key: `step-${turn.turn}` })
    lastNode = turn.node
    rows.push({ kind: 'turn', turn })
  }
  if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: 'gap-end' })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-700">
          Show
          <select
            value={filter}
            onChange={(e) => onFilter(e.target.value as TurnFilter)}
            className="max-w-[16rem] rounded-xl bg-white px-3 py-2 text-sm font-medium text-navy-900 ring-1 ring-navy-200"
          >
            <option value="all">All messages ({turns.length})</option>
            <option value="problems" disabled={count('problems') === 0}>
              Only messages with problems ({count('problems')})
            </option>
            <optgroup label="The person">
              <option value="change" disabled={count('change') === 0}>
                {CLIENT_TALK_INFO.change.label} ({count('change')})
              </option>
              <option value="sustain" disabled={count('sustain') === 0}>
                {CLIENT_TALK_INFO.sustain.label} ({count('sustain')})
              </option>
            </optgroup>
            <optgroup label="The coach">
              {CODES.map((code) => (
                <option key={code} value={code} disabled={count(code) === 0}>
                  {CODE_INFO[code].label} ({count(code)})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => onFilter('all')}
            className="text-sm font-semibold text-brand-700 underline underline-offset-4"
          >
            Show all
          </button>
        )}
        <Legend />
      </div>

      <ol className="space-y-5">
        {rows.map((row) =>
          row.kind === 'gap' ? (
            <li key={row.key} className="text-center text-xs font-medium text-navy-500">
              · · · {row.count} message{row.count === 1 ? '' : 's'} hidden · · ·
            </li>
          ) : row.kind === 'step' ? (
            <li
              key={row.key}
              className="flex items-center gap-3 pt-2 text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase"
            >
              <span className="h-px flex-1 bg-navy-200" />
              {row.label}
              <span className="h-px flex-1 bg-navy-200" />
            </li>
          ) : (
            <Message
              key={row.turn.turn}
              turn={row.turn}
              openKey={open?.turn === row.turn.turn ? open.key : null}
              onToggle={onToggle}
              flashing={flashTurn === row.turn.turn}
              problems={problemsByTurn.get(row.turn.turn) ?? []}
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
      <span>· Click a tag to see why</span>
    </p>
  )
}

// ---------------------------------------------------------------- A message

const Message = memo(function Message({
  turn,
  openKey,
  onToggle,
  flashing,
  problems,
}: {
  turn: ScoredTurn
  openKey: EvidenceKey | null
  onToggle: (turn: number, key: EvidenceKey) => void
  flashing: boolean
  problems: Issue[]
}) {
  const coach = turn.speaker === 'practitioner'
  const calloutId = `why-${turn.turn}`
  const quote =
    openKey === null
      ? null
      : turn.speaker === 'practitioner'
        ? typeof openKey === 'number'
          ? turn.codes[openKey]?.evidence_quote
          : null
        : turn.client_evidence_quote
  const pushy = coach && turn.speaker === 'practitioner' && turn.codes.some((c) => CODE_INFO[c.code].group === 'pushy')

  const bubble = turn.excluded
    ? 'not-scored border border-dashed border-navy-300 bg-white text-navy-500'
    : coach
      ? `bg-white text-navy-900 shadow-[0_6px_20px_-12px_rgba(16,47,77,0.25)] ${pushy ? 'ring-2 ring-red-400' : 'ring-1 ring-navy-900/5'}`
      : 'bg-navy-900 text-white'

  return (
    <li
      id={`turn-${turn.turn}`}
      tabIndex={-1}
      aria-label={`Message ${turn.turn}, ${coach ? 'coach' : 'person'}${turn.excluded ? ', not scored' : ''}`}
      className={`flex scroll-mt-28 outline-none ${coach ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex w-full max-w-[min(42rem,92%)] flex-col ${coach ? 'items-start' : 'items-end'}`}>
        <p className="mb-1.5 flex items-center gap-2 text-xs text-navy-500">
          <span className="font-semibold text-navy-700">{coach ? 'Coach' : 'Person'}</span>
          <span>#{turn.turn}</span>
          {turn.start_sec !== null && <span>{formatSeconds(turn.start_sec)}</span>}
        </p>

        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-7 ${coach ? 'rounded-tl-md' : 'rounded-tr-md'} ${bubble} ${flashing ? 'turn-flash' : ''}`}
        >
          <Highlighted text={turn.text} quote={quote ?? null} onDark={!coach && !turn.excluded} />
        </div>

        {turn.excluded && (
          <p className="mt-1.5 text-xs font-medium text-navy-500">Not scored: {turn.exclusion_reason ?? 'excluded by a rule'}</p>
        )}

        <div className={`mt-2 flex flex-wrap gap-1.5 ${coach ? '' : 'justify-end'}`}>
          {turn.speaker === 'practitioner' ? (
            turn.codes.map((c, i) => (
              <BehaviorTag
                key={i}
                code={c.code}
                evidenceValid={c.evidence_valid}
                active={openKey === i}
                controls={calloutId}
                onToggle={() => onToggle(turn.turn, i)}
              />
            ))
          ) : (
            <TalkTag
              talk={turn.client_talk}
              hasQuote={turn.client_evidence_quote !== null}
              active={openKey === 'client'}
              controls={calloutId}
              onToggle={() => onToggle(turn.turn, 'client')}
            />
          )}
        </div>

        <div id={calloutId} className="w-full">
          {openKey !== null && <Why turn={turn} openKey={openKey} />}
        </div>

        {problems.map((p) => (
          <p key={p.issue_id} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <Icon name="flag" className="h-4 w-4" /> Problem: {p.title}
          </p>
        ))}
      </div>
    </li>
  )
})

function Highlighted({ text, quote, onDark }: { text: string; quote: string | null; onDark: boolean }) {
  const start = quote ? text.indexOf(quote) : -1
  if (!quote || start < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, start)}
      <mark
        className={`rounded px-0.5 ${onDark ? 'bg-brand-300 text-navy-950' : 'bg-brand-100 text-navy-950 ring-1 ring-brand-300'}`}
      >
        {quote}
      </mark>
      {text.slice(start + quote.length)}
    </>
  )
}

/** The explanation shown when a tag is clicked: what the tag means, why it was given, and the exact words. */
function Why({ turn, openKey }: { turn: ScoredTurn; openKey: EvidenceKey }) {
  if (turn.speaker === 'client') {
    const info = CLIENT_TALK_INFO[turn.client_talk]
    return (
      <Card className="mt-2 p-4 text-sm">
        <p className="font-semibold text-navy-900">{info.label}</p>
        <p className="mt-0.5 text-navy-600">{info.explain}</p>
        {turn.client_evidence_quote && (
          <p className="mt-2 text-navy-700">The words: “{turn.client_evidence_quote}” (highlighted above)</p>
        )}
        <p className="mt-2 text-xs text-navy-500">Official term: {info.miti}</p>
      </Card>
    )
  }
  const tag = typeof openKey === 'number' ? turn.codes[openKey] : undefined
  if (!tag) return null
  const info = CODE_INFO[tag.code]
  const found = turn.text.includes(tag.evidence_quote)
  return (
    <Card className="mt-2 p-4 text-sm">
      <p className="font-semibold text-navy-900">{info.label}</p>
      <p className="mt-0.5 text-navy-600">{info.explain}</p>
      <p className="mt-2 text-navy-800">
        <span className="font-semibold">Why here:</span> {tag.rationale}
      </p>
      {tag.evidence_valid ? (
        <p className="mt-1 text-navy-700">
          The words: “{tag.evidence_quote}”{found ? ' (highlighted above)' : ''}
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-950 ring-1 ring-amber-200">
          <Icon name="alert" className="mt-0.5" />
          <span>
            <strong>Double-check this tag.</strong> The AI quoted words that aren't actually in this message: “
            {tag.evidence_quote}”
          </span>
        </p>
      )}
      <p className="mt-2 text-xs text-navy-500">Official code: {info.miti}</p>
    </Card>
  )
}
