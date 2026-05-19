import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { getWorkspaceId, getCalendarData } from '@/lib/db/queries'
import { CalendarGrid } from '@/components/calendar/calendar-grid'

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { tasks, deals } = await getCalendarData(workspaceId, year, month)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Calendar" />
      <div className="flex-1 p-6 flex flex-col min-h-0">
        <CalendarGrid
          initialTasks={tasks}
          initialDeals={deals}
          initialYear={year}
          initialMonth={month}
        />
      </div>
    </div>
  )
}
