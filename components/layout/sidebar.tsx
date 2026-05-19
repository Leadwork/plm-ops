'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard, Users, Building2, TrendingUp,
  FolderKanban, CheckSquare, Settings, LogOut, ChevronRight, Menu, BarChart3,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const settingsActive = pathname.startsWith('/settings')

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <Image src="/logo-full.png" alt="Pro Lead Maker" width={140} height={24} className="object-contain" priority />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'brand-gradient text-white shadow-sm'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            settingsActive
              ? 'brand-gradient text-white shadow-sm'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-60 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile sidebar trigger — rendered in header area by MobileNav */}
    </>
  )
}

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border">
        <NavContent />
      </SheetContent>
    </Sheet>
  )
}
