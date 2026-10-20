import { useContext } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useIsDark } from '../../components/Layout'
import { TurnNavContext } from './turnNav'

interface Point {
  end_turn: number
  rq: number | null
}

/** Single-series line of the pipeline's windowed R:Q, with the session threshold as a dashed reference. */
export function WindowedRqChart({
  points,
  windowSize,
  threshold,
}: {
  points: Point[]
  windowSize: number
  threshold: number | null
}) {
  const dark = useIsDark()
  const focusTurn = useContext(TurnNavContext)
  const colors = dark
    ? { line: '#cbd5e1', grid: '#1e293b', axis: '#94a3b8', ref: '#fbbf24', surface: '#0f172a' }
    : { line: '#334155', grid: '#e2e8f0', axis: '#64748b', ref: '#b45309', surface: '#ffffff' }

  return (
    <div
      className="mt-2 h-44 w-full"
      role="img"
      aria-label={`Line chart of windowed R:Q at ${points.length} points. Use "Show as table" for the values.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 12, right: 12, bottom: 0, left: -18 }}
          onClick={(state) => {
            const index = Number(state?.activeTooltipIndex)
            const point = Number.isInteger(index) ? points[index] : undefined
            if (point) focusTurn(point.end_turn)
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="end_turn"
            tick={{ fontSize: 11, fill: colors.axis }}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            tickFormatter={(t: number) => `T${t}`}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: colors.axis }} tickLine={false} axisLine={false} domain={[0, 'auto']} width={44} />
          {threshold !== null && (
            <ReferenceLine
              y={threshold}
              stroke={colors.ref}
              strokeDasharray="5 4"
              label={{
                value: `threshold ${threshold} (placeholder)`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: colors.axis,
              }}
            />
          )}
          <Tooltip
            cursor={{ stroke: colors.grid }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined
              if (!active || !point) return null
              return (
                <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
                  <div className="font-medium">
                    Turns {Math.max(1, point.end_turn - windowSize + 1)}–{point.end_turn}
                  </div>
                  <div className="tabular-nums">
                    {point.rq === null ? 'No questions in window' : `R:Q ${point.rq.toFixed(2)}`}
                  </div>
                </div>
              )
            }}
          />
          <Line
            type="linear"
            dataKey="rq"
            stroke={colors.line}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: colors.line, stroke: colors.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: colors.line, stroke: colors.surface, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
