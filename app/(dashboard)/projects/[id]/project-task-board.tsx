'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Pencil, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, TaskList, Task } from '@/lib/types'

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

interface Member { user_id: string; profiles: { full_name: string | null } | null }

interface TaskFormProps {
  workspaceId: string; projectId: string; taskLists: TaskList[]
  members: Member[]; task?: Task; defaultListId?: string; onClose: () => void
}

function TaskForm({ workspaceId, projectId, taskLists, members, task, defaultListId, onClose }: TaskFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [listId, setListId] = useState(task?.task_list_id ?? defaultListId ?? taskLists[0]?.id ?? '')

  function handlePriorityChange(v: string | null) { if (v) setPriority(v as Task['priority']) }
  function handleAssigneeChange(v: string | null) { setAssigneeId(v ?? '') }
  function handleListChange(v: string | null) { setListId(v ?? '') }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const commonFields = {
      task_list_id: listId || null,
      title: form.get('title') as string,
      description: (form.get('description') as string) || null,
      priority,
      assignee_id: assigneeId || null,
      due_date: (form.get('due_date') as string) || null,
    }
    const { error } = task
      ? await supabase.from('tasks').update(commonFields).eq('id', task.id)
      : await supabase.from('tasks').insert({
          ...commonFields,
          workspace_id: workspaceId,
          project_id: projectId,
          status: 'todo' as Task['status'],
        })
    if (error) toast.error(error.message)
    else { toast.success(task ? 'Task updated' : 'Task created'); router.refresh(); onClose() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input name="title" defaultValue={task?.title} required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={task?.description ?? ''} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={handlePriorityChange}>
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
          <Input name="due_date" type="date" defaultValue={task?.due_date?.slice(0, 10) ?? ''} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>List</Label>
        <Select value={listId} onValueChange={handleListChange}>
          <SelectTrigger><SelectValue placeholder="No list" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">No list</SelectItem>
            {taskLists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Assignee</Label>
        <Select value={assigneeId} onValueChange={handleAssigneeChange}>
          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {members.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name ?? m.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

function TaskRow({ task, members, onEdit, onDelete, onToggle }: {
  task: Task; members: Member[]
  onEdit: () => void; onDelete: () => void; onToggle: () => void
}) {
  const assignee = members.find(m => m.user_id === task.assignee_id)
  const isDone = task.status === 'done'
  const isOverdue = task.due_date && !isDone && new Date(task.due_date) < new Date()

  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 group text-sm">
      <Checkbox checked={isDone} onCheckedChange={onToggle} />
      <span className={`flex-1 ${isDone ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
      {task.priority !== 'medium' && (
        <Badge variant="secondary" className={`text-xs capitalize ${priorityColors[task.priority]}`}>{task.priority}</Badge>
      )}
      {assignee && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" />{assignee.profiles?.full_name?.split(' ')[0]}
        </span>
      )}
      {task.due_date && (
        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
          <Calendar className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString()}
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
}

export function ProjectTaskBoard({ project, taskLists, tasks, members, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [defaultListId, setDefaultListId] = useState<string | undefined>()
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)

  const unlistedTasks = tasks.filter(t => !t.task_list_id)

  async function addList() {
    if (!newListName.trim()) return
    const { error } = await supabase.from('task_lists').insert({
      project_id: project.id,
      name: newListName.trim(),
      position: taskLists.length,
    })
    if (error) toast.error(error.message)
    else { setNewListName(''); setAddingList(false); router.refresh() }
  }

  async function deleteList(id: string) {
    if (!confirm('Delete this list and all its tasks?')) return
    await supabase.from('tasks').delete().eq('task_list_id', id)
    const { error } = await supabase.from('task_lists').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('List deleted'); router.refresh() }
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Task deleted'); router.refresh() }
  }

  async function toggleTask(task: Task) {
    const newStatus: Task['status'] = task.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) toast.error(error.message)
    else router.refresh()
  }

  function openAddTask(listId?: string) {
    setEditingTask(undefined)
    setDefaultListId(listId)
    setTaskDialogOpen(true)
  }

  return (
    <div className="flex-1 overflow-auto space-y-6">
      {taskLists.map(list => {
        const listTasks = tasks.filter(t => t.task_list_id === list.id)
        return (
          <div key={list.id} className="rounded-lg border bg-background">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{list.name}</span>
                <Badge variant="secondary" className="text-xs">{listTasks.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openAddTask(list.id)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add task
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteList(list.id)}>
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
                  onDelete={() => deleteTask(task.id)}
                  onToggle={() => toggleTask(task)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {unlistedTasks.length > 0 && (
        <div className="rounded-lg border bg-background">
          <div className="px-4 py-3 border-b">
            <span className="font-semibold text-sm text-muted-foreground">Unlisted</span>
          </div>
          <div className="p-2 space-y-0.5">
            {unlistedTasks.map(task => (
              <TaskRow key={task.id} task={task} members={members}
                onEdit={() => { setEditingTask(task); setTaskDialogOpen(true) }}
                onDelete={() => deleteTask(task.id)}
                onToggle={() => toggleTask(task)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {addingList ? (
          <>
            <Input
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="List name…"
              className="max-w-xs"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') setAddingList(false) }}
            />
            <Button size="sm" onClick={addList}>Add</Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            workspaceId={workspaceId}
            projectId={project.id}
            taskLists={taskLists}
            members={members}
            task={editingTask}
            defaultListId={defaultListId}
            onClose={() => setTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
