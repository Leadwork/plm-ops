import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { SettingsClient } from './settings-client'
import { getWorkspace, getWorkspaceId, getWorkspaceMembers } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { stages, pipelines } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const [workspace, members] = await Promise.all([
    getWorkspace(workspaceId),
    getWorkspaceMembers(workspaceId),
  ])

  const [pipeline] = await db.select().from(pipelines)
    .where(and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.isDefault, true))).limit(1)

  const pipelineStages = pipeline
    ? await db.select().from(stages).where(eq(stages.pipelineId, pipeline.id)).orderBy(asc(stages.position))
    : []

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Settings" />
      <SettingsClient
        workspace={workspace}
        members={members}
        stages={pipelineStages}
        currentUserId={session.user.id}
      />
    </div>
  )
}
