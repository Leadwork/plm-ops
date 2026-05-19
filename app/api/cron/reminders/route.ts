import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, notificationChannels } from '@/lib/db/schema'
import { eq, and, lte, ne, isNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return res.ok
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  // Current time as HH:MM
  const currentHH = now.getUTCHours().toString().padStart(2, '0')
  const currentMM = now.getUTCMinutes().toString().padStart(2, '0')
  const currentTime = `${currentHH}:${currentMM}`
  // Window: tasks due within the next 20 minutes
  const windowEnd = new Date(now.getTime() + 20 * 60 * 1000)
  const windowHH = windowEnd.getUTCHours().toString().padStart(2, '0')
  const windowMM = windowEnd.getUTCMinutes().toString().padStart(2, '0')
  const windowTime = `${windowHH}:${windowMM}`

  const channels = await db.select().from(notificationChannels)
    .where(eq(notificationChannels.enabled, true))

  let sent = 0

  for (const channel of channels) {
    const config: Record<string, string> = JSON.parse(channel.config)
    if (channel.channelType !== 'telegram') continue

    // Tasks with a specific time: due today, time in [currentTime, windowTime], not yet reminded
    const timedTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.workspaceId, channel.workspaceId),
        eq(tasks.assigneeId, channel.userId),
        ne(tasks.status, 'done'),
        eq(tasks.dueDate, today),
        isNull(tasks.reminderSentAt),
      )
    ).then(rows => rows.filter(t =>
      t.dueTime && t.dueTime >= currentTime && t.dueTime <= windowTime
    ))

    for (const task of timedTasks) {
      const text = `⏰ <b>Follow-up Reminder</b>\n\n<b>${task.title}</b>\nDue at ${task.dueTime} today${task.description ? `\n📝 ${task.description}` : ''}\n\n<a href="https://app.proleadmaker.com/tasks">Open Tasks →</a>`
      const ok = await sendTelegram(config.botToken, config.chatId, text)
      if (ok) {
        await db.update(tasks).set({ reminderSentAt: new Date() })
          .where(eq(tasks.id, task.id))
        sent++
      }
    }

    // Daily digest (runs at 8 AM UTC): tasks due today with no time set, and overdue tasks
    const isEightAM = now.getUTCHours() === 8 && now.getUTCMinutes() < 20
    if (isEightAM) {
      const digestTasks = await db.select().from(tasks).where(
        and(
          eq(tasks.workspaceId, channel.workspaceId),
          eq(tasks.assigneeId, channel.userId),
          ne(tasks.status, 'done'),
          lte(tasks.dueDate, today),
          isNull(tasks.reminderSentAt),
        )
      ).then(rows => rows.filter(t => !t.dueTime)) // only tasks without a specific time

      const overdue = digestTasks.filter(t => t.dueDate! < today)
      const dueToday = digestTasks.filter(t => t.dueDate === today)

      if (digestTasks.length) {
        let text = `📋 <b>ProLeadMaker — Daily Digest</b>\n`
        if (dueToday.length) {
          text += `\n<b>Due today (${dueToday.length}):</b>\n`
          dueToday.forEach(t => { text += `• ${t.title}\n` })
        }
        if (overdue.length) {
          text += `\n<b>Overdue (${overdue.length}):</b>\n`
          overdue.forEach(t => { text += `• ${t.title} <i>(${t.dueDate})</i>\n` })
        }
        text += `\n<a href="https://app.proleadmaker.com/tasks">Open Tasks →</a>`
        const ok = await sendTelegram(config.botToken, config.chatId, text)
        if (ok) sent++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, time: currentTime, date: today })
}
