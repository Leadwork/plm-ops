'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface ActivityRow { type: string; count: number }

const TYPE_COLORS: Record<string, string> = {
  call: '#7c3aed',
  email: '#c026d3',
  meeting: '#e91e8c',
  note: '#f59e0b',
  task: '#06b6d4',
}

export function ActivityDonut({ data }: { data: ActivityRow[] }) {
  const chartData = data.map(r => ({
    name: r.type.charAt(0).toUpperCase() + r.type.slice(1),
    value: Number(r.count),
    fill: TYPE_COLORS[r.type] ?? '#94a3b8',
  }))

  if (!chartData.length) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No activities logged yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          dataKey="value" paddingAngle={3}>
          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v} activities`]} />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}
