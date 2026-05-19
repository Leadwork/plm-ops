'use client'

import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip } from 'recharts'

interface StageData {
  stageName: string | null
  count: number
  value: number
  probability: number | null
}

const COLORS = ['#7c3aed', '#8b3de8', '#9b3adf', '#b026d3', '#c026c8', '#d01eb5', '#e01ea0', '#e91e8c']

export function PipelineFunnel({ data }: { data: StageData[] }) {
  const chartData = data.map((s, i) => ({
    name: s.stageName ?? 'Unknown',
    value: Number(s.count),
    dollarValue: Number(s.value),
    fill: COLORS[i % COLORS.length],
  }))

  if (!chartData.length) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No open deals in pipeline</div>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <FunnelChart>
        <Tooltip
          formatter={(value, name, props) => [
            `${value} deals · $${Number(props.payload.dollarValue).toLocaleString()}`,
            props.payload.name,
          ]}
        />
        <Funnel dataKey="value" data={chartData} isAnimationActive>
          <LabelList position="center" fill="#fff" stroke="none" dataKey="name" style={{ fontSize: 12, fontWeight: 600 }} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}
