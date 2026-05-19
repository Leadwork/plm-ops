'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CheckSquare, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalTask = {
  id: string; title: string; dueDate: string | null; status: string
  priority: string; projectId: string | null; projectName: string | null
}
type CalDeal = {
  id: string; title: string; value: string | null; closeDate: string | null
  status: string; contactFirstName: string | null; contactLastName: string | null
}

interface Props {
  initialTasks: CalTask[]
  initialDeals: CalDeal[]
  initialYear: number
  initialMonth: number
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarGrid({ initialTasks, initialDeals, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selected, setSelected] = useState<string | null>(null)

  const currentDate = new Date(year, month - 1, 1)
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const startPad = getDay(days[0])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  function itemsForDay(dateStr: string) {
    const tasks = initialTasks.filter(t => t.dueDate === dateStr && isSameMonth(parseISO(dateStr), currentDate))
    const deals = initialDeals.filter(d => d.closeDate === dateStr && isSameMonth(parseISO(dateStr), currentDate))
    return { tasks, deals }
  }

  const selectedItems = selected ? itemsForDay(selected) : null

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-3">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500 inline-block" /> Tasks
            <span className="h-2.5 w-2.5 rounded-sm bg-green-500 inline-block ml-2" /> Deals
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth() + 1); setSelected(null) }}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 rounded-xl border bg-background overflow-hidden">
          {/* Day name headers */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 flex-1">
            {/* Padding cells */}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="border-r border-b bg-muted/20 min-h-[100px]" />
            ))}

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const { tasks: dayTasks, deals: dayDeals } = itemsForDay(dateStr)
              const hasItems = dayTasks.length + dayDeals.length > 0
              const isSelected = selected === dateStr
              const today = isToday(day)

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  className={cn(
                    'border-r border-b min-h-[100px] p-1.5 cursor-pointer transition-colors',
                    isSelected ? 'bg-violet-50 border-violet-200' : 'hover:bg-accent/40',
                    !isSameMonth(day, currentDate) && 'opacity-40'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full',
                      today ? 'brand-gradient text-white' : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasItems && (
                      <span className="text-[10px] text-muted-foreground">{dayTasks.length + dayDeals.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map(t => (
                      <div key={t.id}
                        className={cn('text-[10px] leading-tight px-1 py-0.5 rounded truncate border',
                          t.status === 'done' ? 'line-through opacity-50 bg-gray-50 border-gray-200' :
                            PRIORITY_COLORS[t.priority] ?? 'bg-violet-100 text-violet-700 border-violet-200'
                        )}>
                        {t.title}
                      </div>
                    ))}
                    {dayDeals.slice(0, 2).map(d => (
                      <div key={d.id}
                        className="text-[10px] leading-tight px-1 py-0.5 rounded truncate bg-green-100 text-green-700 border border-green-200">
                        $ {d.title}
                      </div>
                    ))}
                    {(dayTasks.length + dayDeals.length) > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayTasks.length + dayDeals.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-64 shrink-0 rounded-xl border bg-background p-4 overflow-y-auto">
          {!selected ? (
            <div className="text-center text-muted-foreground text-sm mt-8">
              <p>Click a day to see details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{format(parseISO(selected), 'EEEE, MMM d')}</h3>

              {selectedItems && selectedItems.tasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" /> Tasks ({selectedItems.tasks.length})
                  </p>
                  {selectedItems.tasks.map(t => (
                    <div key={t.id} className="text-sm p-2 rounded-lg border bg-violet-50/50">
                      <p className={cn('font-medium', t.status === 'done' && 'line-through text-muted-foreground')}>{t.title}</p>
                      {t.projectName && <p className="text-xs text-muted-foreground mt-0.5">{t.projectName}</p>}
                      <Badge variant="secondary" className={cn('text-[10px] mt-1 capitalize', PRIORITY_COLORS[t.priority] ?? '')}>
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {selectedItems && selectedItems.deals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Deals ({selectedItems.deals.length})
                  </p>
                  {selectedItems.deals.map(d => (
                    <div key={d.id} className="text-sm p-2 rounded-lg border bg-green-50/50">
                      <p className="font-medium">{d.title}</p>
                      {d.contactFirstName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{d.contactFirstName} {d.contactLastName}</p>
                      )}
                      {d.value && (
                        <p className="text-xs font-semibold text-green-600 mt-1">${Number(d.value).toLocaleString()}</p>
                      )}
                      <Badge variant="secondary" className="text-[10px] mt-1 capitalize">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {selectedItems && selectedItems.tasks.length === 0 && selectedItems.deals.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
