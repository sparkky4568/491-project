import { Icon } from './Icon'

/**
 * Shown whenever mock data is on screen. Sticky, so it stays in every
 * screenshot and screen-share frame. Never hide it while is_mock data is visible.
 */
export function MockBanner({ detail }: { detail?: string }) {
  return (
    <div
      role="note"
      aria-label="Mock data notice"
      className="mock-stripes sticky top-0 z-30 border-y-2 border-amber-500 text-amber-950 dark:border-amber-400 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 sm:px-6">
        <span className="flex items-center gap-2 text-sm font-bold tracking-wide">
          <Icon name="alert" className="h-4 w-4" />
          MOCK DATA — not real scores
        </span>
        <span className="text-xs sm:text-sm">
          {detail ?? 'Invented conversations for demo and testing. These numbers are not results.'}
        </span>
      </div>
    </div>
  )
}
