'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8 w-8" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Sun className="h-4 w-4 text-muted-foreground" />
        : <Moon className="h-4 w-4 text-muted-foreground" />
      }
    </button>
  )
}
