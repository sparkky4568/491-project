import { useContext } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TurnNavContext } from './turnNav'

interface Point {
  end_turn: number
  rq: number | null
}

const COLORS = { line: '#102f4d', grid: '#e4edf6', axis: '#4c6886', goal: '#b3570c', surface: '#ffffff' }

/** "Listening vs. asking" over the course of the call, as computed by the pipeline. */
export function WindowedRqChart({ points, windowSize, goal }: { points: Point[]; windowSize: number; goal: number | null }) {
  const focusTurn = useContext(TurnNavContext)
  return (
    <div
      className="h-52 w-full"
      role="img"
      aria-label={`Line chart with ${points.length} points. Use "Show the numbers" for the values.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 16, right: 16, bottom: 0, left: -14 }}
          onClick={(state) => {
            const index = Number(state?.activeTooltipIndex)
            const point = Number.isInteger(index) ? points[index] : undefined
            if (point) focusTurn(point.end_turn)
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="end_turn"
            tick={{ fontSize: 12, fill: COLORS.axis }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            tickFormatter={(t: number) => `#${t}`}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 12, fill: COLORS.axis }} tickLine={false} axisLine={false} domain={[0, 'auto']} width={44} />
          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke={COLORS.goal}
              strokeDasharray="5 4"
              label={{ value: `goal ${goal}*`, position: 'insideTopRight', fontSize: 11, fill: COLORS.goal }}
            />
          )}
          <Tooltip
            cursor={{ stroke: COLORS.grid }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined
              if (!active || !point) return null
              return (
                <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-navy-900/10">
                  <div className="font-semibold text-navy-900">
                    Messages {Math.max(1, point.end_turn - windowSize + 1)}–{point.end_turn}
                  </div>
                  <div className="text-navy-600">
                    {point.rq === null ? 'No questions in this stretch' : `${point.rq.toFixed(2)} reflections per question`}
                  </div>
                </div>
              )
            }}
          />
          <Line
            type="linear"
            dataKey="rq"
            stroke={COLORS.line}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS.line, stroke: COLORS.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: COLORS.goal, stroke: COLORS.surface, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
