import { useRef, type KeyboardEvent } from 'react'
import { focusRing } from '../../components/ui'
import type { SessionTab } from '../../lib/router'

export const TAB_LABELS: Record<SessionTab, string> = {
  summary: 'Summary',
  transcript: 'Transcript',
  flow: 'Flow flags',
  clinician: 'Clinician review',
  issues: 'Issue log',
  details: 'Details',
}

export const tabId = (tab: SessionTab) => `tab-${tab}`
export const panelId = (tab: SessionTab) => `panel-${tab}`

/** Roving-tabindex tabs: arrow keys move, Home / End jump. Scrolls sideways on phones, never the page. */
export function SessionTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: SessionTab[]
  active: SessionTab
  onSelect: (tab: SessionTab) => void
}) {
  const refs = useRef(new Map<SessionTab, HTMLButtonElement>())
  function onKey(e: KeyboardEvent) {
    const i = tabs.indexOf(active)
    const next =
      e.key === 'ArrowRight'
        ? tabs[(i + 1) % tabs.length]
        : e.key === 'ArrowLeft'
          ? tabs[(i - 1 + tabs.length) % tabs.length]
          : e.key === 'Home'
            ? tabs[0]
            : e.key === 'End'
              ? tabs[tabs.length - 1]
              : null
    if (!next) return
    e.preventDefault()
    onSelect(next)
    refs.current.get(next)?.focus()
  }
  return (
    <div className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-divider px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="Session views" className="flex gap-7" onKeyDown={onKey}>
        {tabs.map((tab) => {
          const selected = tab === active
          return (
            <button
              key={tab}
              ref={(el) => {
                if (el) refs.current.set(tab, el)
                else refs.current.delete(tab)
              }}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={selected}
              aria-controls={panelId(tab)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab)}
              className={`-mb-px shrink-0 border-b-[3px] pt-2.5 pb-2.5 type-small-strong whitespace-nowrap ${focusRing} ${
                selected ? 'border-brand-strong text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
