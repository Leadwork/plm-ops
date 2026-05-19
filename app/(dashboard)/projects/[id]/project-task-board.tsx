'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { createTaskList, deleteTaskList, createTask, updateTask, deleteTask, addTaskComment } from '@/lib/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Pencil, Calendar, User, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, TaskList, Task } from '@/lib/db/schema'

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

type Member = { userId: string; name: string | null }
type CommentRow = { id: string; content: string; createdAt: Date | null; userId: string; userName: string | null }

interface TaskFormProps {
  workspaceId: string; projectId: string; taskLists: TaskList[]
  members: Member[]; task?: Task; defaultListId?: string; onClose: () => void
}

function TaskForm({ workspaceId, projectId, taskLists, members, task, defaultListId, onClose }: TaskFormProps) {
  const [pending, startTransition] = useTransition()
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [listId, setListId] = useState(task?.taskListId ?? defaultListId ?? taskLists[0]?.id ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(title: string) {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = form.get('title') as string
    if (!validate(title)) return
    const data = {
      taskListId: listId || undefined,
      title,
      description: (form.get('description') as string) || undefined,
      priority,
      assigneeId: assigneeId || undefined,
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
            {members.map(m => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.name ?? m.userId.slice(0, 8)}
              </SelectItem>
            ))}
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
          id: crypto.randomUUID(),
          content: commentText.trim(),
          createdAt: new Date(),
          userId: '',
          userName: 'You',
        }])
        setCommentText('')
        toast.success('Comment added')
      } catch { toast.error('Failed to add comment') }
    })
  }

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />Comments ({comments.length})
      </div>
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map(c => (
            <li key={c.id} className="text-sm bg-muted/40 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">{c.userName ?? 'User'}</span>
                {c.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.createdAt), 'MMM d, h:mm a')}
                  </span>
                )}
              </div>
              <p>{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Add a comment…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
        />
        <Button size="sm" onClick={handleAddComment} disabled={pending || !commentText.trim()}>Post</Button>
      </div>
    </div>
  )
}

function TaskRow({ task, members, onEdit, onDelete, onToggle }: {
  task: Task; members: Member[]
  onEdit: () => void; onDelete: () => void; onToggle: () => void
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

interface Props {
  project: Project; taskLists: TaskList[]; tasks: Task[]
  members: Member[]; workspaceId: string
  taskComments: Record<string, CommentRow[]>
}

export function ProjectTaskBoard({ project, taskLists, tasks, members, workspaceId, taskComments }: Props) {
  const [, startTransition] = useTransition()
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [defaultListId, setDefaultListId] = useState<string | undefined>()
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)

  const unlistedTasks = tasks.filter(t => !t.taskListId)

  function handleAddList() {
    if (!newListName.trim()) return
    startTransition(async () => {
      try {
        await createTaskList(project.id, newListName.trim(), taskLists.length)
        setNewListName('')
        setAddingList(false)
      } catch { toast.error('Failed to create list') }
    })
  }

  function handleDeleteList(id: string) {
    if (!confirm('Delete this list and all its tasks?')) return
    startTransition(async () => {
      try { await deleteTaskList(id, project.id); toast.success('List deleted') }
      catch { toast.error('Failed to delete list') }
    })
  }

  function handleDeleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    startTransition(async () => {
      try { await deleteTask(id, project.id); toast.success('Task deleted') }
      catch { toast.error('Failed to delete task') }
    })
  }

  function handleToggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    startTransition(async () => {
      try { await updateTask(task.id, project.id, { status: newStatus }) }
      catch { toast.error('Failed to update task') }
    })
  }

  function openAddTask(listId?: string) {
    setEditingTask(undefined)
    setDefaultListId(listId)
    setTaskDialogOpen(true)
  }

  return (
    <div className="flex-1 overflow-auto space-y-6">
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
              {listTasks.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">No tasks. Add one above.</p>
              )}
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

      {unlistedTasks.length > 0 && (
        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-muted-foreground">Unlisted</span>
            <Button size="sm" variant="ghost" onClick={() => openAddTask()}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add task
            </Button>
          </div>
          <div className="p-2 space-y-0.5">
            {unlistedTasks.map(task => (
              <TaskRow key={task.id} task={task} members={members}
                onEdit={() => { setEditingTask(task); setTaskDialogOpen(true) }}
                onDelete={() => handleDeleteTask(task.id)}
                onToggle={() => handleToggleTask(task)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {addingList ? (
          <>
            <Input value={newListName} onChange={e => setNewListName(e.target.value)}
              placeholder="List name…" className="max-w-xs" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setAddingList(false) }}
            />
            <Button size="sm" onClick={handleAddList}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}>Cancel</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAddingList(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add list
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => openAddTask()}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add task
        </Button>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <TaskForm
            workspaceId={workspaceId}
            projectId={project.id}
            taskLists={taskLists}
            members={members}
            task={editingTask}
            defaultListId={defaultListId}
            onClose={() => setTaskDialogOpen(false)}
          />
          {editingTask && (
            <CommentsSection
              task={editingTask}
              projectId={project.id}
              initialComments={taskComments[editingTask.id] ?? []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
