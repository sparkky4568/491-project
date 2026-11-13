import { useConnection } from '../lib/connection'
import { SourceDot } from './ui'

/** Top-bar pill: Live (scorer API answers), Demo (no VITE_API_URL, practice scorer) or Offline. Never color alone. */
export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const { connection, apiUrl } = useConnection()
  const { tone, label, short, title } = (() => {
    switch (connection.kind) {
      case 'live': {
        const h = connection.health
        return {
          tone: 'live' as const,
          label: h.backend === 'fake' ? 'Live: scorer API (fake backend)' : 'Live: scorer API',
          short: 'Live',
          title: `${apiUrl}, aven-scorer ${h.version}, backend ${h.backend}, model ${h.model}${
            h.is_mock ? '. Results are marked is_mock.' : ''
          }`,
        }
      }
      case 'checking':
        return { tone: 'offline' as const, label: 'Checking the scorer API...', short: 'Checking', title: apiUrl }
      case 'offline':
        return { tone: 'offline' as const, label: 'Scorer API unreachable', short: 'Offline', title: connection.message }
      case 'demo':
        return {
          tone: 'demo' as const,
          label: 'Demo: practice scorer',
          short: 'Demo',
          title: 'VITE_API_URL is not set, so scores come from keyword rules in this browser.',
        }
    }
  })()
  if (compact)
    return (
      <span role="status" title={title} className="inline-flex items-center gap-1.5 type-label text-white">
        <SourceDot tone={tone} />
        {short}
        <span className="sr-only">: {label}</span>
      </span>
    )
  return (
    <span
      role="status"
      title={title}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 type-label text-ink"
    >
      <SourceDot tone={tone} />
      {label}
    </span>
  )
}
