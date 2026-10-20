/** Small inline icon set (24×24 stroke icons). Decorative by default: pair with visible text. */
const PATHS = {
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  minus: 'M6 12h12',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  info: 'M12 16v-5m0-3h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  ban: 'M5.6 5.6l12.8 12.8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  gauge: 'M12 14l4-4M4.9 19a9 9 0 1 1 14.2 0',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  download: 'M12 4v12m0 0-5-5m5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0-6-6m6 6 6-6',
  arrowRight: 'M5 12h14m0 0-6-6m6 6-6 6',
  arrowLeft: 'M19 12H5m0 0 6 6m-6-6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6zm0 0v6h6',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z',
  shield: 'M12 21s7-3.5 7-10V5l-7-3-7 3v6c0 6.5 7 10 7 10z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = '', label }: { name: IconName; className?: string; label?: string }) {
  // Default to 16px unless the caller sets a size (an unsized SVG renders at 300×150).
  const sized = /(^|\s)(h|w|size)-/.test(className) ? className : `h-4 w-4 ${className}`
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${sized}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
