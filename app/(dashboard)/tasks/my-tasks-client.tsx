'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckSquare, Calendar, FolderKanban } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/lib/types'

type TaskWithProject = Task & { projects: { name: string } | null }

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

interface Props { tasks: TaskWithProject[]; workspaceId: string }

export function MyTasksClient({ tasks }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const dueToday = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  const upcoming = tasks.filter(t => !t.due_date || new Date(t.due_date) >= new Date())

  async function toggleTask(task: TaskWithProject) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tasks') as any).update({ status: 'done' }).eq('id', task.id)
    if (error) toast.error(error.message)
    else { toast.success('Task marked done'); router.refresh() }
  }

  function TaskItem({ task }: { task: TaskWithProject }) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-accent/30 group">
        <Checkbox onCheckedChange={() => toggleTask(task)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {task.projects && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />{task.projects.name}
            </p>
          )}
        </div>
        <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${priorityColors[task.priority]}`}>{task.priority}</Badge>
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
            <Calendar className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString()}
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
