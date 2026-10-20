import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '../../components/Icon'
import { MockTag, ProvenanceBadge, linkClass } from '../../components/ui'
import { isLoadedFromFile } from '../../lib/data'
import { formatCost, formatTimestamp } from '../../lib/format'
import { SOURCE_LABELS } from '../../lib/miti'
import { SUPPORTED_SCHEMA_VERSION, type ScoredSession } from '../../lib/schema'

export function SessionHeader({ session }: { session: ScoredSession }) {
  const { scorer } = session
  return (
    <header className="mb-5">
      <nav aria-label="Breadcrumb" className="mb-2 text-sm">
        <Link to="/" className={linkClass}>
          Sessions
        </Link>
        <span className="mx-1.5 text-slate-400" aria-hidden="true">
          /
        </span>
        <span aria-current="page" className="font-mono text-slate-700 dark:text-slate-300">
          {session.session_id}
        </span>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {session.session_id}
        </h1>
        <ProvenanceBadge provenance={session.provenance} />
        {session.is_mock && <MockTag />}
        {isLoadedFromFile(session.session_id) && (
          <span className="rounded border border-blue-300 bg-blue-50 px-1.5 text-xs text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
            Loaded from file
          </span>
        )}
      </div>

      {session.schema_version !== SUPPORTED_SCHEMA_VERSION && (
        <p className="mt-2 flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Icon name="alert" className="mt-0.5" />
          <span className="min-w-0">
            This file uses schema {session.schema_version}; the console was built for {SUPPORTED_SCHEMA_VERSION}. Some fields may
            not display.
          </span>
        </p>
      )}

      <div className="mt-3 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <Meta label="Source">{SOURCE_LABELS[session.source]}</Meta>
          <Meta label="Target behavior">{session.target_behavior}</Meta>
          <Meta label="Aven version">{session.aven_version ?? '—'}</Meta>
          <Meta label="Recorded">{session.recorded_at ?? '—'}</Meta>
          <Meta label="Turns">{session.turns.length}</Meta>
        </dl>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <Meta label="Coder prompt" mono>
            {scorer.coder_prompt_version}
          </Meta>
          <Meta label="Globals prompt" mono>
            {scorer.globals_prompt_version}
          </Meta>
          <Meta label="Model" mono>
            {scorer.model}
          </Meta>
          <Meta label="Run" mono>
            {scorer.run_id} · {formatTimestamp(scorer.scored_at)}
          </Meta>
          <Meta label="Cost">{formatCost(scorer.cost_usd)}</Meta>
        </dl>
      </div>
      <a href="#scores" className={`${linkClass} mt-3 inline-block text-sm lg:hidden`}>
        Jump to scores and issues ↓
      </a>
    </header>
  )
}

function Meta({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className={`min-w-0 break-words text-slate-900 dark:text-slate-100 ${mono ? 'font-mono text-[13px]' : ''}`}>
        {children}
      </dd>
    </>
  )
}
