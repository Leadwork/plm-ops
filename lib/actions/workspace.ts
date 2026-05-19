'use server'

import { db } from '@/lib/db'
import { workspaces, workspaceMembers, pipelines, stages, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function createUserAndWorkspace(name: string, email: string, password: string) {
  const hash = await bcrypt.hash(password, 10)
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)

  const [user] = await db.insert(users).values({ name, email, password: hash }).returning()
  const [workspace] = await db.insert(workspaces).values({ name: `${name}'s Workspace`, slug }).returning()

  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: 'admin' })

  const [pipeline] = await db.insert(pipelines).values({
    workspaceId: workspace.id, name: 'Sales Pipeline', isDefault: true,
  }).returning()

  await db.insert(stages).values([
    { pipelineId: pipeline.id, name: 'Lead', position: 0, probability: 10 },
    { pipelineId: pipeline.id, name: 'Qualified', position: 1, probability: 25 },
    { pipelineId: pipeline.id, name: 'Proposal', position: 2, probability: 50 },
    { pipelineId: pipeline.id, name: 'Negotiation', position: 3, probability: 75 },
    { pipelineId: pipeline.id, name: 'Won', position: 4, probability: 100 },
  ])

  return user
}

export async function updateWorkspaceName(workspaceId: string, name: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(workspaces).set({ name }).where(eq(workspaces.id, workspaceId))
  revalidatePath('/settings')
}

export async function inviteMember(workspaceId: string, email: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (!user) throw new Error('No account found with that email address')
  const existing = await db.select().from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id))).limit(1)
  if (existing.length) throw new Error('User is already a member')
  await db.insert(workspaceMembers).values({ workspaceId, userId: user.id, role: 'member' })
  revalidatePath('/settings')
}

export async function getWorkspaceId(userId: string) {
  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
  return member?.workspaceId ?? null
}
