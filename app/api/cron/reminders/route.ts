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

// Returns HH:MM for a date offset by N minutes
function offsetTime(date: Date, minutes: number): string {
  const d = new Date(date.getTime() + minutes * 60 * 1000)
  return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = offsetTime(now, 0)

  // Windows for matching (±1 min tolerance for cron drift)
  const window15Start = offsetTime(now, 14)  // 14 min from now
  const window15End   = offsetTime(now, 16)  // 16 min from now
  const windowExactStart = offsetTime(now, -1) // 1 min ago
  const windowExactEnd   = offsetTime(now, 1)  // 1 min ahead

  const channels = await db.select().from(notificationChannels)
    .where(eq(notificationChannels.enabled, true))

  let sent = 0

  for (const channel of channels) {
    if (channel.channelType !== 'telegram') continue
    const config: Record<string, string> = JSON.parse(channel.config)

    // Get all pending timed tasks for this user due today
    const allTodayTasks = await db.select().from(tasks).where(
      and(
        eq(tasks.workspaceId, channel.workspaceId),
        eq(tasks.assigneeId, channel.userId),
        ne(tasks.status, 'done'),
        eq(tasks.dueDate, today),
      )
    ).then(rows => rows.filter(t => t.dueTime)) // only tasks with a specific time

    // ── Message 2: 15-minute warning ─────────────────────────────────────────
    const fifteenMinTasks = allTodayTasks.filter(t =>
      t.dueTime! >= window15Start &&
      t.dueTime! <= window15End &&
      !t.reminderSentAt
    )

    for (const task of fifteenMinTasks) {
      const text =
        `⚠️ <b>Follow-up in 15 Minutes!</b>\n\n` +
        `📋 ${task.title}\n` +
        `🕐 At <b>${task.dueTime}</b> today` +
        `${task.description ? `\n📝 ${task.description}` : ''}\n\n` +
        `Get ready! <a href="https://app.proleadmaker.com/tasks">Open Tasks →</a>`

      const ok = await sendTelegram(config.botToken, config.chatId, text)
      if (ok) {
        await db.update(tasks).set({ reminderSentAt: new Date() }).where(eq(tasks.id, task.id))
        sent++
      }
    }

    // ── Message 3: Exact time ─────────────────────────────────────────────────
    const exactTasks = allTodayTasks.filter(t =>
      t.dueTime! >= windowExactStart &&
      t.dueTime! <= windowExactEnd &&
      !t.reminderExactSentAt
    )

    for (const task of exactTasks) {
      const text =
        `🔔 <b>Follow-up Time!</b>\n\n` +
        `📋 ${task.title}\n` +
        `🕐 Right now — <b>${task.dueTime}</b>` +
        `${task.description ? `\n📝 ${task.description}` : ''}\n\n` +
        `Time to act! <a href="https://app.proleadmaker.com/tasks">Open Tasks →</a>`

      const ok = await sendTelegram(config.botToken, config.chatId, text)
      if (ok) {
        await db.update(tasks).set({ reminderExactSentAt: new Date() }).where(eq(tasks.id, task.id))
        sent++
      }
    }

    // ── Daily digest: 8 AM UTC for tasks with no specific time ────────────────
    const isEightAM = now.getUTCHours() === 8 && now.getUTCMinutes() < 2
    if (isEightAM) {
      const digestTasks = await db.select().from(tasks).where(
        and(
          eq(tasks.workspaceId, channel.workspaceId),
          eq(tasks.assigneeId, channel.userId),
          ne(tasks.status, 'done'),
          lte(tasks.dueDate, today),
          isNull(tasks.reminderSentAt),
        )
      ).then(rows => rows.filter(t => !t.dueTime))

      const dueToday = digestTasks.filter(t => t.dueDate === today)
      const overdue  = digestTasks.filter(t => t.dueDate! < today)

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
        if (ok) {
          for (const t of digestTasks) {
            await db.update(tasks).set({ reminderSentAt: new Date() }).where(eq(tasks.id, t.id))
          }
          sent++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, time: currentTime, date: today })
}
