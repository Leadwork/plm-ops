'use server'

import { db } from '@/lib/db'
import { activities } from '@/lib/db/schema'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createActivity(data: {
  workspaceId: string
  type: string
  subject: string
  notes?: string
  contactId?: string
  companyId?: string
  dealId?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (!data.subject.trim()) throw new Error('Subject is required')
  await db.insert(activities).values({ ...data, userId: session.user.id })
  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`)
  if (data.companyId) revalidatePath(`/accounts/${data.companyId}`)
  revalidatePath('/dashboard')
}
