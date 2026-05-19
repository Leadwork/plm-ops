import { auth } from '@/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export async function Header({ title }: { title: string }) {
  const session = await auth()
  const initials = session?.user?.name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs text-white brand-gradient">
          {initials}
        </AvatarFallback>
      </Avatar>
    </header>
  )
}
