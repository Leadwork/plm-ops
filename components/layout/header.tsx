import { auth } from '@/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MobileNav } from '@/components/layout/sidebar'
import { GlobalSearch } from '@/components/search/global-search'
import { NotificationBell } from '@/components/notifications/notification-bell'

export async function Header({ title }: { title: string }) {
  const session = await auth()
  const initials = session?.user?.name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6 gap-3">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <NotificationBell />
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs text-white brand-gradient">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
