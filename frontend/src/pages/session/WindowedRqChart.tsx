import { useContext, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { RqWindow } from '../../lib/schema'
import { TurnNavContext } from './turnNav'

/** Token values (index.css) for SVG attributes. */
const C = {
  line: '#1f5a96',
  breach: '#b42318',
  grid: '#e3e8ee',
  muted: '#56687a',
  bandBg: '#fdf0e4',
  bandLine: '#f2c08f',
  bandText: '#7a3a06',
  surface: '#ffffff',
  focus: '#c2620f',
}

const PAD = { left: 44, right: 16, top: 8, bottom: 40 }
const BAND = 34
const PLOT_H = 260

export const windowName = (w: RqWindow, i: number) => `Window ${i + 1}: volleys ${w.start_volley} to ${w.end_volley}`

export function windowCounts(w: RqWindow): string {
  const r = `${w.reflections} reflection${w.reflections === 1 ? '' : 's'}`
  const q = `${w.questions} question${w.questions === 1 ? '' : 's'}`
  return `${r}, ${q}, ${w.rq === null ? 'R:Q undefined' : `R:Q ${w.rq.toFixed(1)}`}`
}

const flagOf = (w: RqWindow) =>
  w.questions === 0 && w.reflections === 0
    ? 'no questions or reflections'
    : w.questions === 0
      ? 'no questions'
      : w.reflections === 0
        ? 'no reflections'
        : null

/**
 * R:Q per window. Windows with no questions (R:Q undefined) sit in the band above the plot as a
 * triangle; windows with no reflections get a diamond on the zero line. Shape and label, never color alone.
 * Points are focusable; arrow keys move between windows; Enter jumps to the window in the transcript.
 */
export function WindowedRqChart({ windows }: { windows: RqWindow[] }) {
  const { focusTurn } = useContext(TurnNavContext)
  const box = useRef<HTMLDivElement>(null)
  const points = useRef<Array<SVGGElement | null>>([])
  const [width, setWidth] = useState(720)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const values = windows.map((w) => w.rq).filter((v): v is number => v !== null)
  const top = Math.max(4, Math.ceil(Math.max(0, ...values)))
  const height = PAD.top + BAND + PLOT_H + PAD.bottom
  const plotTop = PAD.top + BAND + 8
  const plotBottom = PAD.top + BAND + PLOT_H
  const innerW = width - PAD.left - PAD.right
  const x = (i: number) => PAD.left + (windows.length === 1 ? innerW / 2 : (i / (windows.length - 1)) * innerW)
  const y = (v: number) => plotBottom - (v / top) * (plotBottom - plotTop)
  const bandY = PAD.top + BAND / 2

  // Line segments break at windows with no R:Q.
  const segments: string[] = []
  let current: string[] = []
  windows.forEach((w, i) => {
    if (w.rq === null) {
      if (current.length > 0) segments.push(current.join(' '))
      current = []
      return
    }
    current.push(`${current.length === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(w.rq).toFixed(1)}`)
  })
  if (current.length > 0) segments.push(current.join(' '))

  const tickEvery = windows.length <= 8 ? 1 : windows.length <= 20 ? 4 : Math.ceil(windows.length / 6)
  const ticks = windows.map((_, i) => i).filter((i) => i % tickEvery === 0 || i === windows.length - 1)
  const firstNoQ = windows.findIndex((w) => w.rq === null)

  function onKey(e: KeyboardEvent, i: number) {
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? Math.min(windows.length - 1, i + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? Math.max(0, i - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? windows.length - 1
              : null
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      focusTurn(windows[i].turn_start)
      return
    }
    if (next === null) return
    e.preventDefault()
    points.current[next]?.focus()
  }

  const tip = active === null ? null : windows[active]
  const tipX = active === null ? 0 : x(active)
  const tipY = active === null || !tip ? 0 : tip.rq === null ? bandY + 12 : y(tip.rq)

  return (
    <div ref={box} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="group"
        aria-label={`Reflections per question for ${windows.length} windows. Use the arrow keys to move between windows; Enter shows the window in the transcript.`}
        className="block max-w-full overflow-visible"
      >
        {/* Band for windows with no R:Q */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={BAND}
          fill={C.bandBg}
          stroke={C.bandLine}
          strokeDasharray="6 4"
          rx={4}
        />
        <text x={PAD.left + 8} y={bandY + 4} fontSize={12} fill={C.bandText}>
          No questions in window (R:Q undefined)
        </text>

        {/* Y axis */}
        <text x={4} y={bandY + 4} fontSize={12} fill={C.muted}>
          R:Q
        </text>
        {Array.from({ length: top + 1 }, (_, v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={C.grid} />
            <text x={PAD.left - 12} y={y(v) + 4} fontSize={12} fill={C.muted} textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={plotBottom + 20} fontSize={12} fill={C.muted} textAnchor="middle">
            w{i + 1} (v{windows[i].start_volley})
          </text>
        ))}
        <text x={PAD.left + innerW / 2} y={plotBottom + 36} fontSize={12} fill={C.muted} textAnchor="middle">
          Window (first coach volley)
        </text>

        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={C.line} strokeWidth={2} />
        ))}

        {firstNoQ >= 0 && (
          <text
            x={Math.min(x(firstNoQ) + 12, width - PAD.right - 4)}
            y={bandY + 4}
            fontSize={12}
            fontWeight={600}
            fill={C.breach}
            textAnchor={x(firstNoQ) + 220 > width ? 'end' : 'start'}
          >
            Window {firstNoQ + 1} flagged: volleys {windows[firstNoQ].start_volley} to {windows[firstNoQ].end_volley}
          </text>
        )}

        {windows.map((w, i) => {
          const flag = flagOf(w)
          const label = `${windowName(w, i)}. ${windowCounts(w)}${flag ? `. Flagged: ${flag}` : ''}.`
          const cx = x(i)
          const focused = active === i
          return (
            <g
              key={`${w.start_volley}-${w.end_volley}`}
              ref={(el) => {
                points.current[i] = el
              }}
              tabIndex={i === (active ?? 0) ? 0 : -1}
              role="button"
              aria-label={label}
              className="cursor-pointer outline-none"
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onClick={() => focusTurn(w.turn_start)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {/* Larger invisible hit area */}
              <rect x={cx - 10} y={PAD.top} width={20} height={plotBottom - PAD.top} fill="transparent" />
              {w.rq === null ? (
                <path
                  d={`M${cx} ${bandY - 7} L${cx + 7} ${bandY + 6} L${cx - 7} ${bandY + 6} Z`}
                  fill={C.breach}
                  stroke={focused ? C.focus : C.surface}
                  strokeWidth={focused ? 2 : 1}
                />
              ) : w.reflections === 0 ? (
                <path
                  d={`M${cx} ${y(w.rq) - 7} L${cx + 7} ${y(w.rq)} L${cx} ${y(w.rq) + 7} L${cx - 7} ${y(w.rq)} Z`}
                  fill={C.breach}
                  stroke={focused ? C.focus : C.surface}
                  strokeWidth={focused ? 2 : 1}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={y(w.rq)}
                  r={focused ? 6.5 : 5}
                  fill={C.surface}
                  stroke={focused ? C.focus : C.line}
                  strokeWidth={2}
                />
              )}
            </g>
          )
        })}
      </svg>

      {tip && active !== null && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-10 w-max max-w-60 rounded-md bg-sidebar px-3 py-2 text-white shadow-card"
          style={{
            left: Math.min(Math.max(0, tipX + 12), width - 200),
            top: Math.max(0, tipY - 10),
          }}
        >
          <p className="type-label">{windowName(tip, active)}</p>
          <p className="type-caption text-on-dark-muted">{windowCounts(tip)}</p>
          {flagOf(tip) && <p className="type-caption text-brand-soft">Flagged: {flagOf(tip)}</p>}
        </div>
      )}
    </div>
  )
}
