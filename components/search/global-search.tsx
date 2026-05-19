'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, TrendingUp, FolderKanban, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchResults = {
  contacts: { id: string; firstName: string; lastName: string; email: string | null; status: string }[]
  deals: { id: string; title: string; value: string | null; status: string }[]
  projects: { id: string; name: string; status: string }[]
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50) }
    else { setQuery(''); setResults(null); setActiveIdx(-1) }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  const allItems = results ? [
    ...results.contacts.map(c => ({ type: 'contact' as const, id: c.id, label: `${c.firstName} ${c.lastName}`, sub: c.email ?? '', href: `/contacts/${c.id}` })),
    ...results.deals.map(d => ({ type: 'deal' as const, id: d.id, label: d.title, sub: d.value ? `$${Number(d.value).toLocaleString()}` : '', href: `/pipeline` })),
    ...results.projects.map(p => ({ type: 'project' as const, id: p.id, label: p.name, sub: p.status, href: `/projects/${p.id}` })),
  ] : []

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0 && allItems[activeIdx]) navigate(allItems[activeIdx].href)
  }

  const iconMap = { contact: Users, deal: TrendingUp, project: FolderKanban }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border bg-muted/40 text-sm text-muted-foreground hover:bg-muted transition-colors min-w-[180px]"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] bg-background border rounded px-1 py-0.5 font-mono">⌃K</kbd>
      </button>

      {/* Mobile icon */}
      <button onClick={() => setOpen(true)} className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors">
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Palette overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl border bg-background shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              {loading ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" /> : <Search className="h-4 w-4 text-muted-foreground shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
                onKeyDown={handleKey}
                placeholder="Search contacts, deals, projects..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults(null) }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {query.length < 2 && (
                <p className="text-xs text-muted-foreground text-center py-8">Type at least 2 characters to search</p>
              )}

              {query.length >= 2 && !loading && results && allItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No results for "{query}"</p>
              )}

              {results && allItems.length > 0 && (() => {
                let globalIdx = -1
                const sections = [
                  { key: 'contact', label: 'Contacts', items: results.contacts },
                  { key: 'deal', label: 'Deals', items: results.deals },
                  { key: 'project', label: 'Projects', items: results.projects },
                ] as const

                return sections.map(section => {
                  if (!section.items.length) return null
                  const Icon = iconMap[section.key]
                  return (
                    <div key={section.key} className="py-2">
                      <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon className="h-3 w-3" /> {section.label}
                      </p>
                      {section.items.map(item => {
                        globalIdx++
                        const idx = globalIdx
                        const href = section.key === 'contact' ? `/contacts/${item.id}`
                          : section.key === 'project' ? `/projects/${item.id}`
                          : '/pipeline'
                        const label = section.key === 'contact'
                          ? `${'firstName' in item ? item.firstName : ''} ${'lastName' in item ? item.lastName : ''}`
                          : 'title' in item ? item.title : 'name' in item ? item.name : ''
                        const sub = section.key === 'contact' && 'email' in item ? (item.email ?? '')
                          : section.key === 'deal' && 'value' in item ? (item.value ? `$${Number(item.value).toLocaleString()}` : '')
                          : 'status' in item ? item.status : ''

                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(href)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              activeIdx === idx ? 'bg-accent' : 'hover:bg-accent/60'
                            )}
                          >
                            <div className="h-7 w-7 rounded-full brand-gradient flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{label}</p>
                              {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </div>

            <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span><kbd className="border rounded px-1 font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="border rounded px-1 font-mono">↵</kbd> open</span>
              <span><kbd className="border rounded px-1 font-mono">esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
