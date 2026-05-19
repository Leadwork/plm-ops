'use client'

import { useTransition } from 'react'
import { completeTask } from '@/lib/actions/projects'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckSquare, Calendar, FolderKanban } from 'lucide-react'
import { toast } from 'sonner'

type TaskRow = {
  id: string; title: string; status: string; priority: string
  dueDate: string | null; projectId: string | null; projectName: string | null
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

interface Props { tasks: TaskRow[]; workspaceId: string }

export function MyTasksClient({ tasks }: Props) {
  const [, startTransition] = useTransition()

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date())
  const dueToday = tasks.filter(t => {
    if (!t.dueDate) return false
    return new Date(t.dueDate).toDateString() === new Date().toDateString()
  })
  const upcoming = tasks.filter(t => !t.dueDate || new Date(t.dueDate) >= new Date())

  function handleComplete(id: string) {
    startTransition(async () => {
      try { await completeTask(id); toast.success('Task marked done') }
      catch { toast.error('Failed to update task') }
    })
  }

  function TaskItem({ task }: { task: TaskRow }) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-accent/30">
        <Checkbox onCheckedChange={() => handleComplete(task.id)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {task.projectName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />{task.projectName}
            </p>
          )}
        </div>
        <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${priorityColors[task.priority] ?? ''}`}>{task.priority}</Badge>
        {task.dueDate && (
          <span className={`text-xs flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
            <Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <CheckSquare className="h-12 w-12 mb-3 opacity-30" />
        <p>No tasks assigned to you. You&apos;re all caught up!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-500">Overdue ({overdue.length})</h2>
          {overdue.map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {dueToday.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Due Today ({dueToday.length})</h2>
          {dueToday.map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Upcoming ({upcoming.length})</h2>
          {upcoming.map(t => <TaskItem key={t.id} task={t} />)}
        </div>
      )}
    </div>
  )
}
