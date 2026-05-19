'use server'

import { db } from '@/lib/db'
import { contacts, tasks, notificationChannels } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {})
}

export async function createContact(data: {
  workspaceId: string; firstName: string; lastName: string
  email?: string; phone?: string; accountId?: string; status?: string
  title?: string; notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(contacts).values({ ...data, ownerId: session.user.id })
  revalidatePath('/contacts')
}

export async function updateContact(id: string, data: Partial<typeof contacts.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(contacts).set(data).where(eq(contacts.id, id))
  revalidatePath('/contacts')
}

export async function deleteContact(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(contacts).where(eq(contacts.id, id))
  revalidatePath('/contacts')
}

export async function scheduleFollowUp(data: {
  workspaceId: string; contactId: string; contactName: string
  type: string; dueDate: string; dueTime?: string; note?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const title = `Follow up with ${data.contactName} — ${data.type}`
  await db.insert(tasks).values({
    workspaceId: data.workspaceId,
    title,
    description: data.note ?? null,
    status: 'todo',
    priority: 'medium',
    assigneeId: session.user.id,
    dueDate: data.dueDate,
    dueTime: data.dueTime || null,
  })

  // Send instant Telegram confirmation to all enabled channels
  const channels = await db.select().from(notificationChannels).where(
    and(eq(notificationChannels.userId, session.user.id), eq(notificationChannels.enabled, true))
  )
  if (channels.length) {
    const when = data.dueTime
      ? `${data.dueDate} at <b>${data.dueTime}</b>`
      : `<b>${data.dueDate}</b>`
    const remindLine = data.dueTime
      ? `\n\n⏰ You'll get reminders 15 min before &amp; at exact time.`
      : `\n\n⏰ You'll get a morning reminder on that day.`
    const text = `✅ <b>Follow-up Scheduled!</b>\n\n📋 ${title}\n📆 ${when}${data.note ? `\n📝 ${data.note}` : ''}${remindLine}\n\n<a href="https://app.proleadmaker.com/tasks">View in ProLeadMaker →</a>`
    for (const ch of channels) {
      if (ch.channelType === 'telegram') {
        const config: Record<string, string> = JSON.parse(ch.config)
        await sendTelegramMessage(config.botToken, config.chatId, text)
      }
    }
  }

  revalidatePath('/tasks')
  revalidatePath('/contacts')
}
