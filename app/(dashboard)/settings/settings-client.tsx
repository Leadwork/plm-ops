'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Crown, User } from 'lucide-react'
import type { Stage } from '@/lib/types'

interface Props {
  workspace: { id: string; name: string } | null
  members: { user_id: string; role: string; profiles: { full_name: string | null } | null }[]
  stages: Stage[]
  currentUserId: string
}

export function SettingsClient({ workspace, members, stages, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function saveWorkspace() {
    if (!workspace) return
    setSaving(true)
    const { error } = await supabase.from('workspaces').update({ name: workspaceName }).eq('id', workspace.id)
    if (error) toast.error(error.message)
    else { toast.success('Workspace name updated'); router.refresh() }
    setSaving(false)
  }

  async function inviteMember() {
    if (!inviteEmail.trim() || !workspace) return
    setInviting(true)
    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, workspaceId: workspace.id }),
    })
    if (!res.ok) toast.error('Failed to send invite')
    else { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail('') }
    setInviting(false)
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
              <Button onClick={saveWorkspace} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Invite teammates to your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.user_id} className="flex items-center gap-3 text-sm">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1">{m.profiles?.full_name ?? m.user_id.slice(0, 8)}</span>
                {m.user_id === currentUserId && <Badge variant="secondary">You</Badge>}
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  {m.role === 'admin' && <Crown className="h-3 w-3" />}
                  {m.role}
                </Badge>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="space-y-1.5">
            <Label>Invite by email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
              <Button onClick={inviteMember} disabled={inviting}>{inviting ? 'Sending…' : 'Invite'}</Button>
            </div>
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
