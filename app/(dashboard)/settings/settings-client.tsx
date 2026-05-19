'use client'

import { useState, useTransition } from 'react'
import { updateWorkspaceName, inviteMember, createStage, updateStage, deleteStage } from '@/lib/actions/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Crown, User, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Workspace, Stage } from '@/lib/db/schema'

interface Props {
  workspace: Workspace | null
  members: { userId: string; role: string; name: string | null }[]
  stages: Stage[]
  pipelineId: string
  currentUserId: string
}

export function SettingsClient({ workspace, members, stages: initialStages, pipelineId, currentUserId }: Props) {
  const [, startTransition] = useTransition()
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? '')
  const [inviteEmail, setInviteEmail] = useState('')
  const [stages, setStages] = useState(initialStages)
  const [stageDialog, setStageDialog] = useState(false)
  const [editingStage, setEditingStage] = useState<Stage | undefined>()
  const [stagePending, startStageTransition] = useTransition()

  function handleSaveWorkspace() {
    if (!workspace || !workspaceName.trim()) return
    startTransition(async () => {
      try { await updateWorkspaceName(workspace.id, workspaceName); toast.success('Workspace name updated') }
      catch { toast.error('Failed to update workspace name') }
    })
  }

  function handleInvite() {
    if (!inviteEmail.trim() || !workspace) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) { toast.error('Enter a valid email address'); return }
    startTransition(async () => {
      try {
        await inviteMember(workspace.id, inviteEmail.trim())
        toast.success(`${inviteEmail} added to workspace`)
        setInviteEmail('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to invite member')
      }
    })
  }

  function handleStageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name') as string
    const probability = Number(form.get('probability'))
    if (!name.trim()) { toast.error('Stage name is required'); return }

    startStageTransition(async () => {
      try {
        if (editingStage) {
          await updateStage(editingStage.id, { name, probability })
          setStages(prev => prev.map(s => s.id === editingStage.id ? { ...s, name, probability } : s))
          toast.success('Stage updated')
        } else {
          await createStage(pipelineId, name, probability, stages.length)
          toast.success('Stage created')
        }
        setStageDialog(false)
        setEditingStage(undefined)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save stage')
      }
    })
  }

  function handleDeleteStage(id: string) {
    if (!confirm('Delete this stage? Deals in this stage cannot be deleted if any exist.')) return
    startStageTransition(async () => {
      try {
        await deleteStage(id)
        setStages(prev => prev.filter(s => s.id !== id))
        toast.success('Stage deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Cannot delete stage — it may have deals assigned')
      }
    })
  }

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Manage your workspace name and settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Workspace name</Label>
            <div className="flex gap-2">
              <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveWorkspace() }} />
              <Button onClick={handleSaveWorkspace}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Invite teammates by their registered email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.userId} className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1">{m.name ?? m.userId.slice(0, 8)}</span>
                {m.userId === currentUserId && <Badge variant="secondary">You</Badge>}
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  {m.role === 'admin' && <Crown className="h-3 w-3" />}
                  {m.role}
                </Badge>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="space-y-1.5">
            <Label>Add member by email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
              />
              <Button onClick={handleInvite}>Add</Button>
            </div>
            <p className="text-xs text-muted-foreground">The user must already have an account.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>Customize your sales pipeline stages.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setEditingStage(undefined); setStageDialog(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Stage
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent/50 group">
                <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="text-muted-foreground text-xs">{s.probability}% probability</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => { setEditingStage(s); setStageDialog(true) }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => handleDeleteStage(s.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
            {stages.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No stages yet. Add your first stage above.</p>
            )}
          </ol>
        </CardContent>
      </Card>

      <Dialog open={stageDialog} onOpenChange={setStageDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStage ? 'Edit Stage' : 'New Stage'}</DialogTitle></DialogHeader>
          <form onSubmit={handleStageSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="stage_name">Stage name</Label>
              <Input id="stage_name" name="name" defaultValue={editingStage?.name} required placeholder="e.g. Proposal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="probability">Win probability (%)</Label>
              <Input id="probability" name="probability" type="number" min="0" max="100"
                defaultValue={editingStage?.probability ?? 50} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStageDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={stagePending}>{stagePending ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
