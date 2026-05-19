'use server'

import { db } from '@/lib/db'
import { projects, taskLists, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createProject(data: {
  workspaceId: string; name: string; description?: string
  status?: string; dueDate?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(projects).values({ ...data, ownerId: session.user.id })
  revalidatePath('/projects')
}

export async function updateProject(id: string, data: Partial<typeof projects.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(projects).set(data).where(eq(projects.id, id))
  revalidatePath('/projects')
}

export async function deleteProject(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath('/projects')
}

export async function createTaskList(projectId: string, name: string, position: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(taskLists).values({ projectId, name, position })
  revalidatePath(`/projects/${projectId}`)
}

export async function deleteTaskList(id: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(tasks).where(eq(tasks.taskListId, id))
  await db.delete(taskLists).where(eq(taskLists.id, id))
  revalidatePath(`/projects/${projectId}`)
}

export async function createTask(data: {
  workspaceId: string; projectId: string; taskListId?: string
  title: string; description?: string; priority?: string
  assigneeId?: string; dueDate?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(tasks).values({ ...data, status: 'todo' })
  revalidatePath(`/projects/${data.projectId}`)
}

export async function updateTask(id: string, projectId: string, data: Partial<typeof tasks.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(tasks).set(data).where(eq(tasks.id, id))
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/tasks')
}

export async function deleteTask(id: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(tasks).where(eq(tasks.id, id))
  revalidatePath(`/projects/${projectId}`)
}

export async function completeTask(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(tasks).set({ status: 'done' }).where(eq(tasks.id, id))
  revalidatePath('/tasks')
}
