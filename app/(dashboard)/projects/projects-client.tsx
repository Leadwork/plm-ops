'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, FolderKanban, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/lib/types'

const statusConfig = {
  active: { label: 'Active', class: 'bg-green-100 text-green-700' },
  on_hold: { label: 'On Hold', class: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', class: 'bg-gray-100 text-gray-600' },
}

function ProjectForm({ workspaceId, project, onClose }: { workspaceId: string; project?: Project; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<Project['status']>(project?.status ?? 'active')
  function handleStatusChange(v: string | null) { if (v) setStatus(v as Project['status']) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      workspace_id: workspaceId,
      name: form.get('name') as string,
      description: (form.get('description') as string) || null,
      status,
      due_date: (form.get('due_date') as string) || null,
    }
    const { error } = project
      ? await supabase.from('projects').update(payload).eq('id', project.id)
      : await supabase.from('projects').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(project ? 'Project updated' : 'Project created'); router.refresh(); onClose() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Project name</Label>
        <Input name="name" defaultValue={project?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea name="description" defaultValue={project?.description ?? ''} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input name="due_date" type="date" defaultValue={project?.due_date?.slice(0, 10) ?? ''} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

interface Props { projects: Project[]; workspaceId: string }

export function ProjectsClient({ projects, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()

  async function deleteProject(id: string) {
    if (!confirm('Delete this project and all its tasks?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Project deleted'); router.refresh() }
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(p => {
            const sc = statusConfig[p.status]
            return (
              <Card key={p.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      <Link href={`/projects/${p.id}`} className="hover:underline">{p.name}</Link>
                    </CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(p); setDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteProject(p.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`w-fit text-xs ${sc.class}`}>{sc.label}</Badge>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {p.description && <p className="line-clamp-2">{p.description}</p>}
                  {p.due_date && (
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      Due {new Date(p.due_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <ProjectForm workspaceId={workspaceId} project={editing} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
