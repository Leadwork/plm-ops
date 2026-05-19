'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'

interface MonthRow { month: string; status: string; count: number; value: number }

export function DealsBarChart({ data }: { data: MonthRow[] }) {
  // Build last 12 months skeleton
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const chartData = months.map(m => {
    const won = data.find(r => r.month === m && r.status === 'won')
    const lost = data.find(r => r.month === m && r.status === 'lost')
    return {
      month: format(parseISO(`${m}-01`), 'MMM yy'),
      Won: Number(won?.value ?? 0),
      Lost: Number(lost?.value ?? 0),
    }
  })

  if (chartData.every(d => d.Won === 0 && d.Lost === 0)) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No closed deals yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        <Legend />
        <Bar dataKey="Won" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Lost" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
