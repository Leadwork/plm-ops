import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, notificationChannels } from '@/lib/db/schema'
import { eq, and, lte, ne } from 'drizzle-orm'

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

  const today = new Date().toISOString().split('T')[0]
  const channels = await db.select().from(notificationChannels)
    .where(eq(notificationChannels.enabled, true))

  let sent = 0

  for (const channel of channels) {
    const dueTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.workspaceId, channel.workspaceId),
        eq(tasks.assigneeId, channel.userId),
        ne(tasks.status, 'done'),
        lte(tasks.dueDate, today),
      )
    )

    if (!dueTasks.length) continue

    const config: Record<string, string> = JSON.parse(channel.config)

    if (channel.channelType === 'telegram') {
      const dueToday = dueTasks.filter(t => t.dueDate === today)
      const overdue = dueTasks.filter(t => t.dueDate! < today)

      let text = `📋 <b>ProLeadMaker — Daily Reminder</b>\n`
      if (dueToday.length) {
        text += `\n<b>Due today (${dueToday.length}):</b>\n`
        dueToday.forEach(t => {
          const time = t.dueTime ? ` at ${t.dueTime}` : ''
          text += `• ${t.title}${time}\n`
        })
      }
      if (overdue.length) {
        text += `\n<b>Overdue (${overdue.length}):</b>\n`
        overdue.forEach(t => {
          text += `• ${t.title} <i>(was due ${t.dueDate})</i>\n`
        })
      }
      text += `\n<a href="https://app.proleadmaker.com/tasks">Open Tasks →</a>`

      const ok = await sendTelegram(config.botToken, config.chatId, text)
      if (ok) sent++
    }
  }

  return NextResponse.json({ ok: true, sent, date: today })
}
