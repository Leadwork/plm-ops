'use client'

import { useState, useTransition } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createTaskList, deleteTaskList, createTask, updateTask, deleteTask, addTaskComment, moveTaskStatus } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Pencil, Calendar, User, MessageSquare, List, Kanban, GanttChart, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Project, TaskList, Task } from '@/lib/db/schema'

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-t-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { id: 'done', label: 'Done', color: 'border-t-green-500' },
]

type Member = { userId: string; name: string | null }
type CommentRow = { id: string; content: string; createdAt: Date | null; userId: string; userName: string | null }

// ─── Task Form ───────────────────────────────────────────────────────────────

function TaskForm({ workspaceId, projectId, taskLists, members, task, defaultListId, onClose }: {
  workspaceId: string; projectId: string; taskLists: TaskList[]
  members: Member[]; task?: Task; defaultListId?: string; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [listId, setListId] = useState(task?.taskListId ?? defaultListId ?? taskLists[0]?.id ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = form.get('title') as string
    if (!title.trim()) { setErrors({ title: 'Title is required' }); return }
    const data = {
      taskListId: listId || undefined, title,
      description: (form.get('description') as string) || undefined,
      priority, assigneeId: assigneeId || undefined,
      dueDate: (form.get('due_date') as string) || undefined,
    }
    startTransition(async () => {
      try {
        if (task) await updateTask(task.id, projectId, data)
        else await createTask({ workspaceId, projectId, ...data })
        toast.success(task ? 'Task updated' : 'Task created')
        onClose()
      } catch { toast.error('Failed to save task') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input name="title" defaultValue={task?.title} required />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={task?.description ?? ''} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={v => { if (v) setPriority(v) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input name="due_date" type="date" defaultValue={task?.dueDate?.slice(0, 10) ?? ''} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>List</Label>
        <Select value={listId} onValueChange={v => setListId(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="No list" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">No list</SelectItem>
            {taskLists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Assignee</Label>
        <Select value={assigneeId} onValueChange={v => setAssigneeId(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {members.map(m => <SelectItem key={m.userId} value={m.userId}>{m.name ?? m.userId.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

// ─── Comments ────────────────────────────────────────────────────────────────

function CommentsSection({ task, projectId, initialComments }: {
  task: Task; projectId: string; initialComments: CommentRow[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [commentText, setCommentText] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAddComment() {
    if (!commentText.trim()) return
    startTransition(async () => {
      try {
        await addTaskComment(task.id, projectId, commentText.trim())
        setComments(prev => [...prev, {
          id: crypto.randomUUID(), content: commentText.trim(),
          createdAt: new Date(), userId: '', userName: 'You',
        }])
        setCommentText('')
      } catch { toast.error('Failed to add comment') }
    })
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />Comments ({comments.length})
      </div>
      {comments.map(c => (
        <div key={c.id} className="text-sm bg-muted/40 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-xs">{c.userName ?? 'User'}</span>
            {c.createdAt && <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>}
          </div>
          <p>{c.content}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={commentText} onChange={e => setCommentText(e.target.value)}
          placeholder="Add a comment…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }} />
        <Button size="sm" onClick={handleAddComment} disabled={pending || !commentText.trim()}>Post</Button>
      </div>
    </div>
  )
}

// ─── Task Row (List view) ─────────────────────────────────────────────────────

function TaskRow({ task, members, onEdit, onDelete, onToggle }: {
  task: Task; members: Member[]; onEdit: () => void; onDelete: () => void; onToggle: () => void
}) {
  const assignee = members.find(m => m.userId === task.assigneeId)
  const isDone = task.status === 'done'
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date()
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 group text-sm">
      <Checkbox checked={isDone} onCheckedChange={onToggle} />
      <span className={`flex-1 ${isDone ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
      {task.priority !== 'medium' && (
        <Badge variant="secondary" className={`text-xs capitalize ${priorityColors[task.priority] ?? ''}`}>{task.priority}</Badge>
      )}
      {assignee && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />{assignee.name ?? assignee.userId.slice(0, 8)}
        </span>
      )}
      {task.dueDate && (
        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
          <Calendar className="h-3 w-3" />{format(new Date(task.dueDate), 'MMM d')}
        </span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
      </div>
    </div>
  )
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({ task, members, onEdit }: { task: Task; members: Member[]; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const assignee = members.find(m => m.userId === task.assigneeId)
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

  return (
    <div ref={setNodeRef} style={style}
      className="bg-background border rounded-lg p-3 shadow-sm group cursor-default select-none">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] capitalize ${priorityColors[task.priority] ?? ''}`}>
              {task.priority}
            </Badge>
            {assignee && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <User className="h-2.5 w-2.5" />{assignee.name?.split(' ')[0]}
              </span>
            )}
            {task.dueDate && (
              <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                <Calendar className="h-2.5 w-2.5" />{format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Gantt Row ────────────────────────────────────────────────────────────────

function GanttView({ tasks, taskLists, members }: { tasks: Task[]; taskLists: TaskList[]; members: Member[] }) {
  const tasksWithDates = tasks.filter(t => t.dueDate)
  if (!tasksWithDates.length) {
    return <div className="text-center py-16 text-muted-foreground text-sm">No tasks with due dates to display on timeline.</div>
  }

  const allDates = tasksWithDates.map(t => new Date(t.dueDate!))
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  minDate.setDate(minDate.getDate() - 3)
  maxDate.setDate(maxDate.getDate() + 3)
  const totalDays = differenceInDays(maxDate, minDate) + 1
  const today = new Date()

  function dayPct(date: Date) {
    return (differenceInDays(date, minDate) / totalDays) * 100
  }

  // Build week headers
  const weekLabels: { label: string; left: number }[] = []
  const cur = new Date(minDate)
  while (cur <= maxDate) {
    weekLabels.push({ label: format(cur, 'MMM d'), left: dayPct(cur) })
    cur.setDate(cur.getDate() + 7)
  }

  const groups: { list: TaskList | null; tasks: Task[] }[] = [
    ...taskLists.map(l => ({ list: l, tasks: tasks.filter(t => t.taskListId === l.id && t.dueDate) })),
    { list: null, tasks: tasks.filter(t => !t.taskListId && t.dueDate) },
  ].filter(g => g.tasks.length > 0)

  const todayPct = dayPct(today)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Timeline header */}
        <div className="flex border-b mb-2 pb-1 relative" style={{ marginLeft: '180px' }}>
          {weekLabels.map((w, i) => (
            <div key={i} className="absolute text-xs text-muted-foreground" style={{ left: `${w.left}%` }}>
              {w.label}
            </div>
          ))}
          <div className="h-4" />
        </div>

        {groups.map(group => (
          <div key={group.list?.id ?? 'unlisted'} className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.list?.name ?? 'Unlisted'}
            </p>
            {group.tasks.map(task => {
              const assignee = members.find(m => m.userId === task.assigneeId)
              const taskDate = new Date(task.dueDate!)
              const pct = dayPct(taskDate)
              const isDone = task.status === 'done'
              const isOverdue = !isDone && taskDate < today

              return (
                <div key={task.id} className="flex items-center mb-1.5 group">
                  <div className="w-44 shrink-0 pr-3 text-xs truncate text-right text-muted-foreground" title={task.title}>
                    {task.title}
                  </div>
                  <div className="flex-1 relative h-6">
                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    {/* Task bar — point marker since tasks have single due date */}
                    <div className="absolute top-1 h-4 flex items-center" style={{ left: `${Math.max(0, pct - 0.5)}%` }}>
                      <div className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold',
                        isDone ? 'bg-green-500 border-green-600 text-white' :
                          isOverdue ? 'bg-red-500 border-red-600 text-white' :
                            task.priority === 'high' ? 'bg-red-100 border-red-400' :
                              'bg-violet-100 border-violet-400'
                      )} title={`${task.title} — due ${format(taskDate, 'MMM d')}`}>
                        {isDone ? '✓' : isOverdue ? '!' : ''}
                      </div>
                      <div className="ml-1.5 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {format(taskDate, 'MMM d')}
                        {assignee && ` · ${assignee.name?.split(' ')[0]}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] shrink-0 capitalize ${priorityColors[task.priority] ?? ''}`}>
                    {task.priority}
                  </Badge>
                </div>
              )
            })}
          </div>
        ))}

        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block" /> Done</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500 inline-block" /> Overdue</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-violet-100 border border-violet-400 inline-block" /> Upcoming</span>
          <span className="flex items-center gap-1"><span className="h-3 w-px bg-red-400 inline-block" /> Today</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────────────

interface Props {
  project: Project; taskLists: TaskList[]; tasks: Task[]
  members: Member[]; workspaceId: string
  taskComments: Record<string, CommentRow[]>
}

type ViewMode = 'list' | 'kanban' | 'gantt'

export function ProjectTaskBoard({ project, taskLists, tasks: initialTasks, members, workspaceId, taskComments }: Props) {
  const [, startTransition] = useTransition()
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<ViewMode>('list')
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [defaultListId, setDefaultListId] = useState<string | undefined>()
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function openAddTask(listId?: string) {
    setEditingTask(undefined); setDefaultListId(listId); setTaskDialogOpen(true)
  }

  function handleToggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      try { await updateTask(task.id, project.id, { status: newStatus }) }
      catch { toast.error('Failed to update task') }
    })
  }

  function handleDeleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    startTransition(async () => {
      try { await deleteTask(id, project.id); setTasks(prev => prev.filter(t => t.id !== id)); toast.success('Task deleted') }
      catch { toast.error('Failed to delete') }
    })
  }

  function handleAddList() {
    if (!newListName.trim()) return
    startTransition(async () => {
      try { await createTaskList(project.id, newListName.trim(), taskLists.length); setNewListName(''); setAddingList(false) }
      catch { toast.error('Failed to create list') }
    })
  }

  function handleDeleteList(id: string) {
    if (!confirm('Delete this list and all its tasks?')) return
    startTransition(async () => {
      try { await deleteTaskList(id, project.id); toast.success('List deleted') }
      catch { toast.error('Failed to delete list') }
    })
  }

  // Kanban DnD
  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return
    const newStatus = STATUS_COLUMNS.find(c => c.id === over.id)?.id
      ?? tasks.find(t => t.id === over.id)?.status
    if (!newStatus || newStatus === draggedTask.status) return
    setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      try { await moveTaskStatus(draggedTask.id, newStatus, workspaceId) }
      catch { toast.error('Failed to move task') }
    })
  }

  const activeDragTask = activeId ? tasks.find(t => t.id === activeId) : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto space-y-4">
      {/* View toggle + Add buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {([['list', List, 'List'], ['kanban', Kanban, 'Kanban'], ['gantt', GanttChart, 'Timeline']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {view === 'list' && (
            <Button variant="outline" size="sm" onClick={() => setAddingList(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add list
            </Button>
          )}
          <Button size="sm" onClick={() => openAddTask()}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add task
          </Button>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="space-y-4">
          {taskLists.map(list => {
            const listTasks = tasks.filter(t => t.taskListId === list.id)
            const done = listTasks.filter(t => t.status === 'done').length
            return (
              <div key={list.id} className="rounded-lg border bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{list.name}</span>
                    <Badge variant="secondary" className="text-xs">{done}/{listTasks.length}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openAddTask(list.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add task
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteList(list.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="p-2 space-y-0.5">
                  {listTasks.length === 0 && <p className="text-xs text-muted-foreground px-2 py-2">No tasks yet.</p>}
                  {listTasks.map(task => (
                    <TaskRow key={task.id} task={task} members={members}
                      onEdit={() => { setEditingTask(task); setTaskDialogOpen(true) }}
                      onDelete={() => handleDeleteTask(task.id)}
                      onToggle={() => handleToggleTask(task)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {tasks.filter(t => !t.taskListId).length > 0 && (
            <div className="rounded-lg border bg-background">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm text-muted-foreground">Unlisted</span>
                <Button size="sm" variant="ghost" onClick={() => openAddTask()}><Plus className="h-3.5 w-3.5 mr-1" />Add task</Button>
              </div>
              <div className="p-2 space-y-0.5">
                {tasks.filter(t => !t.taskListId).map(task => (
                  <TaskRow key={task.id} task={task} members={members}
                    onEdit={() => { setEditingTask(task); setTaskDialogOpen(true) }}
                    onDelete={() => handleDeleteTask(task.id)}
                    onToggle={() => handleToggleTask(task)}
                  />
                ))}
              </div>
            </div>
          )}

          {addingList && (
            <div className="flex items-center gap-2">
              <Input value={newListName} onChange={e => setNewListName(e.target.value)}
                placeholder="List name…" className="max-w-xs" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false) }}
              />
              <Button size="sm" onClick={handleAddList}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}

      {/* ── KANBAN VIEW ───────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id)
              return (
                <div key={col.id} className="flex flex-col min-w-[280px] max-w-[280px]">
                  <div className={`rounded-t-lg border-t-4 ${col.color} bg-muted/40 px-3 pt-3 pb-2 flex items-center justify-between`}>
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                  </div>
                  <div className="flex-1 bg-muted/40 rounded-b-lg p-2 space-y-2 min-h-[300px]" id={col.id}>
                    <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map(task => (
                        <KanbanCard key={task.id} task={task} members={members}
                          onEdit={() => { setEditingTask(task); setTaskDialogOpen(true) }}
                        />
                      ))}
                    </SortableContext>
                    {colTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center pt-4">Drop tasks here</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeDragTask && (
              <div className="bg-background border rounded-lg p-3 shadow-xl rotate-1 w-[272px] opacity-95">
                <p className="text-sm font-medium">{activeDragTask.title}</p>
                <Badge variant="secondary" className={`text-xs capitalize mt-1 ${priorityColors[activeDragTask.priority] ?? ''}`}>
                  {activeDragTask.priority}
                </Badge>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── GANTT VIEW ────────────────────────────────────────────────────── */}
      {view === 'gantt' && (
        <div className="rounded-lg border bg-background p-4">
          <GanttView tasks={tasks} taskLists={taskLists} members={members} />
        </div>
      )}

      {/* Task dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <TaskForm workspaceId={workspaceId} projectId={project.id} taskLists={taskLists}
            members={members} task={editingTask} defaultListId={defaultListId}
            onClose={() => setTaskDialogOpen(false)} />
          {editingTask && (
            <CommentsSection task={editingTask} projectId={project.id}
              initialComments={taskComments[editingTask.id] ?? []} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
