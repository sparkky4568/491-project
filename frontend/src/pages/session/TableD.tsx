import { Icon } from '../../components/Icon'
import { Card, EmptyState, EntryTypePill, Overline, Pill, TONE } from '../../components/ui'
import { TABLE_D_INFO } from '../../lib/miti'
import { TABLE_D_CODES, type ScoredSession, type TableDCode, type TableDHit } from '../../lib/schema'
import { ShowInTranscript, linkClass } from './turnNav'

/** deliv s7: which codes a clinician always reads, and which only when clinical. */
const CLINICIAN_RULE: Partial<Record<TableDCode, 'always' | 'when clinical'>> = {
  D1_clinical_advice: 'always',
  D3_fabrication: 'when clinical',
  D7_privacy: 'always',
}

const codeShort = (code: TableDCode) => code.split('_')[0]

/** Table D (deliv s7): every hit with the coach words quoted verbatim. This page does not judge severity. */
export function TableD({ session, onOpenIssue }: { session: ScoredSession; onOpenIssue: (entryId: string) => void }) {
  const review = session.table_d.filter((h) => h.clinician_review)
  const other = session.table_d.filter((h) => !h.clinician_review)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2 text-ink">Prohibited behavior (Table D)</h2>
        <p className="mt-1 max-w-4xl type-small text-ink-2">
          Every hit is listed with the coach words quoted verbatim. By sponsor rule clinical advice (D1) and privacy (D7) are
          always read individually by a clinician, and a made-up fact (D3) when it is clinical. This page does not judge severity.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="needs-review">
            <h3 id="needs-review" className="mb-3 flex items-center gap-2 type-h3 text-ink">
              Needs clinician review
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 type-label ${TONE.danger}`}
              >
                {review.length}
              </span>
            </h3>
            {review.length === 0 ? (
              <EmptyState title="Nothing for a clinician to read in this session">
                No clinical advice, privacy hit or clinical made-up fact was found.
              </EmptyState>
            ) : (
              <ul className="space-y-4">
                {review.map((hit) => (
                  <HitCard
                    key={`${hit.code}-${hit.volley}-${hit.turn_start}`}
                    hit={hit}
                    session={session}
                    onOpenIssue={onOpenIssue}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="other-d">
            <h3 id="other-d" className="mb-3 type-h3 text-ink">
              Other prohibited behavior
            </h3>
            {other.length === 0 ? (
              <EmptyState title="No other Table D hits in this session">
                The scorer checked every coded coach volley. Safety-node volleys are reviewed by the sponsor, not here.
              </EmptyState>
            ) : (
              <ul className="space-y-4">
                {other.map((hit) => (
                  <HitCard
                    key={`${hit.code}-${hit.volley}-${hit.turn_start}`}
                    hit={hit}
                    session={session}
                    onOpenIssue={onOpenIssue}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <Card className="p-5">
          <Overline>Table D codes</Overline>
          <ul className="mt-3 divide-y divide-divider">
            {TABLE_D_CODES.map((code) => {
              const rule = CLINICIAN_RULE[code]
              return (
                <li key={code} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 type-mono text-muted">{codeShort(code)}</span>
                  <span className="min-w-0 flex-1 type-small text-ink">{TABLE_D_INFO[code].label}</span>
                  <span className={`type-caption ${rule ? 'text-info-fg' : 'text-muted'}`}>
                    {rule ? `Clinician: ${rule}` : 'No clinician read'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function HitCard({
  hit,
  session,
  onOpenIssue,
}: {
  hit: TableDHit
  session: ScoredSession
  onOpenIssue: (entryId: string) => void
}) {
  const info = TABLE_D_INFO[hit.code]
  const entry = session.issues.find((i) => i.entry_type === 'TABLE_D' && i.item === hit.code && i.turn_start === hit.turn_start)
  return (
    <li className={`rounded-lg border bg-surface p-5 ${hit.clinician_review ? 'border-danger-line' : 'border-line'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <EntryTypePill type="TABLE_D" />
          <span className="type-h3 text-ink">{info.label}</span>
          <span className="type-mono text-muted">{hit.code}</span>
        </div>
        {hit.clinician_review && (
          <Pill className={TONE.info}>
            <Icon name="eye" className="h-3.5 w-3.5" />
            Read by a clinician
          </Pill>
        )}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 type-small">
        <div className="flex gap-1.5">
          <dt className="text-muted">Volley</dt>
          <dd className="font-semibold text-ink tabular-nums">{hit.volley}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Turns</dt>
          <dd className="font-semibold text-ink tabular-nums">
            {hit.turn_start === hit.turn_end ? hit.turn_start : `${hit.turn_start} to ${hit.turn_end}`}
          </dd>
        </div>
        {hit.node && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Node</dt>
            <dd className="type-mono text-ink">{hit.node}</dd>
          </div>
        )}
        {entry && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Entry</dt>
            <dd className="type-mono text-ink">{entry.entry_id}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 rounded-md border-l-[3px] border-danger-fg bg-subtle px-4 py-3">
        <p className="type-caption text-ink-2">Coach words, verbatim (turn {hit.turn_start})</p>
        <p className="mt-1 type-body break-words text-ink">"{hit.evidence_quote}"</p>
      </div>
      <p className="mt-3 type-caption text-muted">Scorer rationale</p>
      <p className="mt-1 type-small text-ink">{hit.rationale}</p>
      <p className="mt-1 type-caption text-ink-2">{info.explain}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        <ShowInTranscript turn={hit.turn_start} />
        {entry && (
          <button type="button" className={linkClass} onClick={() => onOpenIssue(entry.entry_id)}>
            Open issue-log row
          </button>
        )}
      </div>
    </li>
  )
}
