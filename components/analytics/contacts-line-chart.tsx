'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts'
import { format, parseISO } from 'date-fns'

interface MonthRow { month: string; count: number }

export function ContactsLineChart({ data }: { data: MonthRow[] }) {
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  let running = 0
  const chartData = months.map(m => {
    const row = data.find(r => r.month === m)
    running += Number(row?.count ?? 0)
    return {
      month: format(parseISO(`${m}-01`), 'MMM yy'),
      New: Number(row?.count ?? 0),
      Total: running,
    }
  })

  if (chartData.every(d => d.New === 0)) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No contacts added in last 12 months</div>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
        <Tooltip />
        <Area type="monotone" dataKey="New" stroke="#7c3aed" fill="url(#gradNew)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Total" stroke="#e91e8c" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
