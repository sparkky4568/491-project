import type { ReactNode } from 'react'
import { Card, SectionTitle } from '../../components/ui'
import { formatCost, formatTimestamp } from '../../lib/format'
import { CLIENT_TALK_INFO, CODE_INFO, GROUP_STYLE, PROVENANCE_COPY, SOURCE_COPY } from '../../lib/miti'
import { CODES, type ScoredSession } from '../../lib/schema'

/** Counts and how this conversation was scored, so any number can be traced back. */
export function Details({ session }: { session: ScoredSession }) {
  const q = session.question_counts
  return (
    <div className="space-y-10">
      <section aria-labelledby="counts-title">
        <SectionTitle
          id="counts-title"
          hint="How many coded coach volleys carried each code. Excluded and safety-node volleys are not counted."
        >
          What the coach did
        </SectionTitle>
        <Card className="grid gap-x-8 p-5 sm:grid-cols-2">
          {CODES.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between gap-3 border-b border-navy-100 py-2.5 last:border-0 sm:[&:nth-last-child(2)]:border-0"
            >
              <span className="flex min-w-0 items-center gap-2 text-navy-800">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${GROUP_STYLE[CODE_INFO[code].group].dot}`} />
                {CODE_INFO[code].label}
                <span className="font-mono text-xs text-navy-500">{code}</span>
              </span>
              <span className="text-lg font-bold text-navy-900 tabular-nums">{session.counts[code] ?? 0}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-sm text-navy-500 tabular-nums">
          Questions by kind: {q.open ?? 0} open, {q.closed ?? 0} closed, {q.unknown ?? 0} unclear.
        </p>
      </section>

      <section aria-labelledby="caller-title">
        <SectionTitle id="caller-title">What the caller said</SectionTitle>
        <Card className="grid grid-cols-3 divide-x divide-navy-100 p-2">
          {(['change', 'sustain', 'neutral'] as const).map((k) => (
            <div key={k} className="p-3 text-center sm:p-4">
              <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{session.client_talk_counts[k] ?? 0}</p>
              <p className="mt-1 text-sm text-navy-500">{CLIENT_TALK_INFO[k].label}</p>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="run-title">
        <SectionTitle
          id="run-title"
          hint="Where this conversation came from and exactly how it was scored. These are the stamps the issue log carries."
        >
          How this was scored
        </SectionTitle>
        <Card className="p-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row label="Session" mono>
              {session.session_id}
            </Row>
            <Row label="Type">
              {PROVENANCE_COPY[session.provenance]}
              {session.is_mock && ' (practice score)'}
            </Row>
            <Row label="Source">{SOURCE_COPY[session.source]}</Row>
            <Row label="Aven version">{session.aven_version ?? 'n/a'}</Row>
            <Row label="Scored">{formatTimestamp(session.scorer.scored_at)}</Row>
            <Row label="Model" mono>
              {session.scorer.model}
            </Row>
            {Object.entries(session.scorer.prompt_versions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, version]) => (
                <Row key={name} label={`Prompt: ${name.replace(/_/g, ' ')}`} mono>
                  {version}
                </Row>
              ))}
            <Row label="Run" mono>
              {session.scorer.run_id}
            </Row>
            <Row label="Cost to score">{formatCost(session.scorer.cost_usd)}</Row>
            <Row label="Data format" mono>
              v{session.schema_version}
            </Row>
          </dl>
        </Card>
      </section>
    </div>
  )
}

function Row({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-navy-100 pb-2">
      <dt className="shrink-0 text-navy-500">{label}</dt>
      <dd className={`min-w-0 text-right text-navy-900 ${mono ? 'font-mono text-sm break-all' : ''}`}>{children}</dd>
    </div>
  )
}
