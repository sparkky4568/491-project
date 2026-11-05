import { useContext } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTurnSpan } from '../../lib/format'
import type { RqWindow } from '../../lib/schema'
import { TurnNavContext } from './turnNav'

const COLORS = { line: '#102f4d', grid: '#e4edf6', axis: '#4c6886', flag: '#b3570c', surface: '#ffffff' }

interface Row {
  index: number
  label: string
  rq: number | null
  /** Plotted at the top of the chart for windows with no questions (their R:Q has no value). */
  noQuestions: number | null
  /** Plotted at 0 for windows with neither reflections nor questions (no R:Q, so the line has no dot there). */
  noReflections: number | null
  window: RqWindow
}

/** One mark per window: a dot for R:Q, an orange square for "no reflections", an orange triangle at the top for "no questions". */
export function WindowedRqChart({ windows }: { windows: RqWindow[] }) {
  const focusTurn = useContext(TurnNavContext)
  const values = windows.map((w) => w.rq).filter((v): v is number => v !== null)
  const top = Math.max(2, Math.ceil(Math.max(0, ...values) + 0.5))
  const rows: Row[] = windows.map((w, i) => ({
    index: i,
    label: `#${w.turn_start}`,
    rq: w.rq,
    noQuestions: w.questions === 0 ? top : null,
    noReflections: w.reflections === 0 && w.rq === null ? 0 : null,
    window: w,
  }))
  const flagged = windows.filter((w) => w.questions === 0 || w.reflections === 0).length

  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`Chart of ${windows.length} windows, ${flagged} flagged. Use "Show the numbers" for the values.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 12, right: 12, bottom: 0, left: -18 }}
          onClick={(state) => {
            const raw = state?.activeTooltipIndex
            if (raw === null || raw === undefined || raw === '') return
            const index = Number(raw)
            const row = Number.isInteger(index) ? rows[index] : undefined
            if (row) focusTurn(row.window.turn_start)
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12, fill: COLORS.axis }}
            tickLine={false}
            axisLine={false}
            domain={[0, top]}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: COLORS.grid }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Row | undefined
              if (!active || !row) return null
              const w = row.window
              return (
                <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-navy-900/10">
                  <div className="font-semibold text-navy-900">{formatTurnSpan(w.turn_start, w.turn_end)}</div>
                  <div className="text-navy-600 tabular-nums">
                    {w.reflections} reflections, {w.questions} questions
                    {w.rq !== null && `, R:Q ${w.rq.toFixed(2)}`}
                  </div>
                  {w.questions === 0 && <div className="font-semibold text-brand-700">Flagged: no questions</div>}
                  {w.reflections === 0 && <div className="font-semibold text-brand-700">Flagged: no reflections</div>}
                </div>
              )
            }}
          />
          <Line
            type="linear"
            dataKey="rq"
            stroke={COLORS.line}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; payload?: Row; index?: number }) => {
              const { cx, cy, payload, index } = props
              if (cx === undefined || cy === undefined || !payload || payload.rq === null) return <g key={index} />
              if (payload.window.reflections === 0)
                return (
                  <rect
                    key={index}
                    x={cx - 5}
                    y={cy - 5}
                    width={10}
                    height={10}
                    fill={COLORS.flag}
                    stroke={COLORS.surface}
                    strokeWidth={2}
                  />
                )
              return <circle key={index} cx={cx} cy={cy} r={4} fill={COLORS.line} stroke={COLORS.surface} strokeWidth={2} />
            }}
            activeDot={{ r: 6, fill: COLORS.line, stroke: COLORS.surface, strokeWidth: 2 }}
          />
          <Scatter
            dataKey="noQuestions"
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const { cx, cy, payload } = props
              if (cx === undefined || cy === undefined || !payload || payload.noQuestions === null) return <g />
              return (
                <path
                  d={`M${cx} ${cy + 6} L${cx - 6} ${cy - 5} L${cx + 6} ${cy - 5} Z`}
                  fill={COLORS.flag}
                  stroke={COLORS.surface}
                  strokeWidth={1.5}
                />
              )
            }}
          />
          <Scatter
            dataKey="noReflections"
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number; payload?: Row }) => {
              const { cx, cy, payload } = props
              if (cx === undefined || cy === undefined || !payload || payload.noReflections === null) return <g />
              return (
                <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={COLORS.flag} stroke={COLORS.surface} strokeWidth={2} />
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
