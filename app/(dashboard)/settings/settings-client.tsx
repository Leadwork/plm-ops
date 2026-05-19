'use client'

import { useState, useTransition } from 'react'
import { updateWorkspaceName, inviteMember } from '@/lib/actions/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Crown, User } from 'lucide-react'
import type { Workspace, Stage } from '@/lib/db/schema'

interface Props {
  workspace: Workspace | null
  members: { userId: string; role: string; name: string | null }[]
  stages: Stage[]
  currentUserId: string
}

export function SettingsClient({ workspace, members, stages, currentUserId }: Props) {
  const [, startTransition] = useTransition()
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? '')
  const [inviteEmail, setInviteEmail] = useState('')

  function handleSaveWorkspace() {
    if (!workspace) return
    startTransition(async () => {
      try { await updateWorkspaceName(workspace.id, workspaceName); toast.success('Workspace name updated') }
      catch { toast.error('Failed to update workspace name') }
    })
  }

  function handleInvite() {
    if (!inviteEmail.trim() || !workspace) return
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
              <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} />
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
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
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
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>Current stages in your default sales pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.probability}%</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
