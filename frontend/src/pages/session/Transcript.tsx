import { memo, useEffect, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { BehaviorTag, GroupSample, StaticCodeTag, TalkTag, talkTone } from '../../components/Tags'
import { Card, Overline, Pill, TONE, chipClass, focusRing } from '../../components/ui'
import { formatClock } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, ENTRY_TYPE_COPY, GROUP_STYLE, SAFETY_NODE, itemLabel, type CodeGroup } from '../../lib/miti'
import type { EntryType, IssueLogEntry, ScoredSession, ScoredTurn, Volley } from '../../lib/schema'
import { volleyDomId } from './turnNav'

// ---------------------------------------------------------------- Filtering

export type VolleyFilter = 'all' | 'coach' | 'caller' | 'issues' | 'nonadherent' | 'talk'

const FILTERS: Array<{ id: VolleyFilter; label: string }> = [
  { id: 'all', label: 'All volleys' },
  { id: 'coach', label: 'Coach' },
  { id: 'caller', label: 'Caller' },
  { id: 'issues', label: 'In the issue log' },
  { id: 'nonadherent', label: 'Non-adherent' },
  { id: 'talk', label: 'Change or sustain talk' },
]

export const isSafetyVolley = (v: Volley, safety: ReadonlySet<number>) => safety.has(v.volley) || v.nodes.includes(SAFETY_NODE)

export function matchesFilter(
  volley: Volley,
  filter: VolleyFilter,
  issueVolleys: ReadonlySet<number>,
  safety: ReadonlySet<number>,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'coach':
      return volley.speaker === 'agent'
    case 'caller':
      return volley.speaker === 'caller'
    case 'issues':
      return issueVolleys.has(volley.volley)
    case 'nonadherent':
      return (
        volley.speaker === 'agent' &&
        !volley.excluded &&
        !isSafetyVolley(volley, safety) &&
        volley.codes.some((c) => CODE_INFO[c.code].group === 'pushy')
      )
    case 'talk':
      return volley.speaker === 'caller' && (volley.client_talk === 'change' || volley.client_talk === 'sustain')
  }
}

/** Which piece of evidence is open on a volley: a coach tag by index, or the caller's tag. */
export type EvidenceKey = number | 'caller'

const PANEL_ID = 'evidence-panel'

interface Props {
  session: ScoredSession
  safetyVolleys: ReadonlySet<number>
  filter: VolleyFilter
  onFilter: (f: VolleyFilter) => void
  issuesByVolley: Map<number, IssueLogEntry[]>
  open: { volley: number; key: EvidenceKey } | null
  onToggle: (volley: number, key: EvidenceKey) => void
  onClose: () => void
  flashVolley: number | null
  onShowIssues: (type: EntryType) => void
}

export function Transcript({
  session,
  safetyVolleys,
  filter,
  onFilter,
  issuesByVolley,
  open,
  onToggle,
  onClose,
  flashVolley,
  onShowIssues,
}: Props) {
  const volleys = session.volleys
  const notScoreable = session.scoreability.state === 'not_scoreable'
  const issueVolleys = new Set(issuesByVolley.keys())
  const count = (f: VolleyFilter) => volleys.filter((v) => matchesFilter(v, f, issueVolleys, safetyVolleys)).length
  const turnsByVolley = new Map<number, ScoredTurn[]>()
  for (const t of session.turns) turnsByVolley.set(t.volley, [...(turnsByVolley.get(t.volley) ?? []), t])
  const openVolley = open ? volleys.find((v) => v.volley === open.volley) : undefined

  // Esc closes the evidence and returns focus to the tag that opened it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const tag = document.querySelector<HTMLElement>(`[aria-expanded="true"][aria-controls~="${PANEL_ID}"]`)
      onClose()
      tag?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const rows: Array<{ kind: 'volley'; volley: Volley } | { kind: 'gap'; count: number; key: string }> = []
  let hidden = 0
  for (const v of volleys) {
    if (!matchesFilter(v, filter, issueVolleys, safetyVolleys)) {
      hidden++
      continue
    }
    if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: `gap-${v.volley}` })
    hidden = 0
    rows.push({ kind: 'volley', volley: v })
  }
  if (hidden > 0) rows.push({ kind: 'gap', count: hidden, key: 'gap-end' })

  return (
    <div className="space-y-5">
      {notScoreable ? (
        <p className="type-small text-ink-2">The conversation as received. Nothing was coded.</p>
      ) : (
        <div role="group" aria-label="Show volleys" className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="mr-1 type-small-strong text-ink-2">
            Show
          </span>
          {FILTERS.map((f) => {
            const n = count(f.id)
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                disabled={n === 0 && f.id !== 'all'}
                className={chipClass(filter === f.id)}
                onClick={() => onFilter(f.id)}
              >
                {f.label} <span className="tabular-nums">{n}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <ol className="min-w-0 space-y-3">
          {rows.map((row) =>
            row.kind === 'gap' ? (
              <li key={row.key} className="py-1 text-center type-caption text-muted">
                {row.count} volley{row.count === 1 ? '' : 's'} hidden by the filter
              </li>
            ) : (
              <VolleyCard
                key={row.volley.volley}
                volley={row.volley}
                turns={turnsByVolley.get(row.volley.volley) ?? []}
                safety={isSafetyVolley(row.volley, safetyVolleys)}
                openKey={open?.volley === row.volley.volley ? open.key : null}
                onToggle={onToggle}
                flashing={flashVolley === row.volley.volley}
                issues={issuesByVolley.get(row.volley.volley) ?? []}
                onShowIssues={onShowIssues}
              />
            ),
          )}
        </ol>

        {!notScoreable && (
          <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
            <Card className="p-5">
              <div id={PANEL_ID} aria-live="polite">
                {openVolley && open ? (
                  <Evidence volley={openVolley} openKey={open.key} />
                ) : (
                  <>
                    <Overline>Evidence</Overline>
                    <p className="mt-2 type-small text-ink-2">
                      Click a tag on a volley to see its quote and the scorer's reason here.
                    </p>
                  </>
                )}
              </div>
            </Card>
            <Legend />
          </aside>
        )}
      </div>
    </div>
  )
}

function Legend() {
  const groups: CodeGroup[] = ['question', 'listening', 'information', 'supportive', 'pushy']
  return (
    <Card className="p-5">
      <Overline>Tag colors</Overline>
      <ul className="mt-3 space-y-2.5">
        {groups.map((g) => (
          <li key={g} className="flex items-center gap-3">
            <GroupSample group={g} />
            <span className="type-caption text-ink-2">
              {GROUP_STYLE[g].label}
              {g === 'pushy' && ', also marked with an alert icon'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 type-caption text-ink-2">
        Every tag carries its words and code, so color is never the only signal. Click a tag to open its evidence; Esc closes.
      </p>
    </Card>
  )
}

// ---------------------------------------------------------------- A volley

const VolleyCard = memo(function VolleyCard({
  volley,
  turns,
  safety,
  openKey,
  onToggle,
  flashing,
  issues,
  onShowIssues,
}: {
  volley: Volley
  turns: ScoredTurn[]
  safety: boolean
  openKey: EvidenceKey | null
  onToggle: (volley: number, key: EvidenceKey) => void
  flashing: boolean
  issues: IssueLogEntry[]
  onShowIssues: (type: EntryType) => void
}) {
  const coach = volley.speaker === 'agent'
  const excluded = volley.excluded || safety
  const inlineId = `why-${volley.volley}`
  const controls = `${PANEL_ID} ${inlineId}`
  const quote =
    openKey === null
      ? null
      : coach
        ? typeof openKey === 'number'
          ? (volley.codes[openKey]?.evidence_quote ?? null)
          : null
        : volley.client_evidence_quote
  const own = turns.filter((t) => !t.back_channel)
  const backChannels = turns.filter((t) => t.back_channel)
  const time = formatClock(own[0]?.start_ms ?? turns[0]?.start_ms ?? null)
  const turnText =
    volley.turn_start === volley.turn_end ? `Turn ${volley.turn_start}` : `Turns ${volley.turn_start}-${volley.turn_end}`
  const unverified = coach && !excluded && volley.codes.some((c) => !c.evidence_valid)
  const uniqueIssues = [...new Map(issues.map((i) => [`${i.entry_type}-${i.item}`, i])).values()]

  return (
    <li
      id={volleyDomId(volley.volley)}
      tabIndex={-1}
      className={`scroll-mt-28 rounded-lg p-4 outline-none ${
        excluded
          ? 'border border-line bg-subtle'
          : openKey !== null
            ? 'border-2 border-action bg-surface'
            : 'border border-line bg-surface'
      } ${flashing ? 'turn-flash' : ''}`}
    >
      <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:block sm:space-y-0.5">
          <p className="flex items-center gap-1.5 type-small-strong text-ink">
            <Icon name={coach ? 'coach' : 'user'} />
            {coach ? 'Coach' : 'Caller'}
          </p>
          <p className="type-caption text-ink-2">Volley {volley.volley}</p>
          <p className="type-caption text-ink-2 tabular-nums">
            {turnText}
            {time && `, ${time}`}
          </p>
          {volley.nodes.length > 0 && (
            <p className="flex flex-wrap gap-1 sm:pt-1">
              <span className="sr-only">Node: </span>
              {volley.nodes.map((n) => (
                <span key={n} className="rounded-sm bg-subtle px-1.5 py-0.5 type-mono text-ink">
                  {n}
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-2.5">
          <p className={`type-body break-words ${excluded ? 'text-ink-2' : 'text-ink'}`}>
            <Highlighted text={volley.text} quote={quote} />
          </p>

          {backChannels.map((t) => (
            <p key={t.turn} className="flex items-start gap-1.5 type-caption text-ink-2">
              <Icon name="minus" className="mt-px h-3.5 w-3.5" />
              Turn {t.turn} caller back-channel "{t.text.trim() || '(no words)'}" folded into this volley, not coded
            </p>
          ))}

          {excluded &&
            (safety ? (
              <p className="flex items-start gap-1.5 type-small-strong text-ink-2">
                <Icon name="shield" className="mt-0.5" />
                Safety node (safety_response): not coded, counted, rated or quoted in the issue log
              </p>
            ) : (
              <p className="flex items-start gap-1.5 type-small-strong text-ink-2">
                <Icon name="minus" className="mt-0.5" />
                Not coded: {volley.exclusion_reason ?? 'excluded by a rule'}
              </p>
            ))}

          {!excluded && (coach ? volley.codes.length > 0 : volley.client_talk && volley.client_talk !== 'neutral') && (
            <div className="flex flex-wrap gap-2">
              {coach ? (
                volley.codes.map((c, i) => (
                  <BehaviorTag
                    key={i}
                    code={c.code}
                    subtype={c.question_subtype}
                    evidenceValid={c.evidence_valid}
                    active={openKey === i}
                    controls={controls}
                    onToggle={() => onToggle(volley.volley, i)}
                  />
                ))
              ) : (
                <TalkTag
                  talk={volley.client_talk}
                  hasQuote={volley.client_evidence_quote !== null}
                  active={openKey === 'caller'}
                  controls={controls}
                  onToggle={() => onToggle(volley.volley, 'caller')}
                />
              )}
            </div>
          )}

          {uniqueIssues.map((issue) => (
            <p
              key={`${issue.entry_type}-${issue.item}`}
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-1.5 type-label ${TONE.below}`}
            >
              <Icon name="flag" className="h-3.5 w-3.5" />
              <span>
                {ENTRY_TYPE_COPY[issue.entry_type].label}: {itemLabel(issue.entry_type, issue.item).label}
              </span>
              <button
                type="button"
                className={`type-label text-link hover:underline ${focusRing} rounded-sm`}
                onClick={() => onShowIssues(issue.entry_type)}
              >
                Open in issue log
              </button>
            </p>
          ))}

          {unverified && (
            <p className={`flex items-center gap-2 rounded-md border px-3 py-1.5 type-label ${TONE.insufficient}`}>
              <Icon name="alert" className="h-3.5 w-3.5" />
              Quote not found verbatim. A person should check this code.
            </p>
          )}

          {/* Below 1024px the evidence opens here instead of the side panel. */}
          <div id={inlineId} className="lg:hidden">
            {openKey !== null && !excluded && (
              <div className="mt-1 rounded-md border border-line bg-surface p-4">
                <Evidence volley={volley} openKey={openKey} />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
})

function Highlighted({ text, quote }: { text: string; quote: string | null }) {
  const i = quote ? text.indexOf(quote) : -1
  if (!quote || i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-info-bg px-0.5 text-ink ring-1 ring-info-line">{text.slice(i, i + quote.length)}</mark>
      {text.slice(i + quote.length)}
    </>
  )
}

function QuoteBlock({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="rounded-md border-l-[3px] border-chart-line bg-subtle px-4 py-3">
      <p className="type-caption text-ink-2">{caption}</p>
      <p className="mt-1 type-body break-words text-ink">{children}</p>
    </div>
  )
}

/** What a tag means, the quote behind it, why it was given, and whether the quote was found verbatim. */
function Evidence({ volley, openKey }: { volley: Volley; openKey: EvidenceKey }) {
  if (volley.speaker === 'caller') {
    if (!volley.client_talk || volley.client_talk === 'neutral') return null
    const info = CLIENT_TALK_INFO[volley.client_talk]
    return (
      <div className="space-y-3">
        <Overline>Evidence</Overline>
        <Pill className={`border-line ${talkTone(volley.client_talk)}`}>
          <Icon name={volley.client_talk === 'change' ? 'arrowUp' : 'arrowDown'} className="h-3.5 w-3.5" />
          {info.label}
        </Pill>
        <p className="type-small-strong text-ink">
          {info.miti}, volley {volley.volley}
        </p>
        <p className="type-small text-ink-2">{info.explain}</p>
        {volley.client_evidence_quote && (
          <QuoteBlock caption={`Quote (turn ${volley.turn_start})`}>"{volley.client_evidence_quote}"</QuoteBlock>
        )}
      </div>
    )
  }
  const tag = typeof openKey === 'number' ? volley.codes[openKey] : undefined
  if (!tag) return null
  const info = CODE_INFO[tag.code]
  return (
    <div className="space-y-3">
      <Overline>Evidence</Overline>
      <StaticCodeTag code={tag.code} subtype={tag.question_subtype} />
      <p className="type-small-strong text-ink">
        {info.miti}
        {tag.question_subtype && tag.question_subtype !== 'unknown' && `, ${tag.question_subtype}`}, volley {volley.volley}
      </p>
      <QuoteBlock caption={`Quote (turn ${volley.turn_start})`}>"{tag.evidence_quote}"</QuoteBlock>
      <div>
        <p className="type-caption text-muted">Why</p>
        <p className="mt-1 type-small text-ink">{tag.rationale}</p>
      </div>
      {tag.evidence_valid ? (
        <p className="flex items-center gap-1.5 type-small-strong text-meets-fg">
          <Icon name="check" />
          Quote found verbatim in the volley
        </p>
      ) : (
        <p className={`flex items-start gap-2 rounded-md border px-3 py-2 type-label ${TONE.insufficient}`}>
          <Icon name="alert" className="mt-px h-3.5 w-3.5" />
          Quote not found verbatim. A person should check this code.
        </p>
      )}
      <p className="type-caption text-ink-2">{info.explain}</p>
    </div>
  )
}
