'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, Trash2, Plus, Loader2, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Watchlist } from '@/lib/db/schema/watchlist'

export function WatchlistPanel() {
  const t = useTranslations('watchlist')
  const [watchlist, setWatchlist] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [addSymbol, setAddSymbol] = useState('')
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load watchlist
  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/watchlist')
      const data = await response.json()
      setWatchlist(data.watchlist || [])
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addSymbol.trim()) return

    try {
      setAdding(true)
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: addSymbol.toUpperCase(),
          name: addName || undefined,
          asset_type: 'stock'
        })
      })

      if (response.ok) {
        setAddSymbol('')
        setAddName('')
        await fetchWatchlist()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add symbol')
      }
    } catch (error) {
      console.error('Failed to add symbol:', error)
      alert('Failed to add symbol')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return

    try {
      await fetch(`/api/watchlist?symbol=${symbol}`, {
        method: 'DELETE'
      })
      await fetchWatchlist()
    } catch (error) {
      console.error('Failed to remove symbol:', error)
    }
  }

  // Filter watchlist by search query
  const filteredWatchlist = watchlist.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold">Watchlist</h2>
          <Badge variant="secondary" className="ml-auto">
            {watchlist.length}
          </Badge>
        </div>

        {/* Add New Symbol */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Symbol (e.g., AAPL)"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={!addSymbol.trim() || adding}
              size="sm"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Input
            placeholder="Name (optional)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="text-sm"
          />
        </div>

        {/* Search */}
        {watchlist.length > 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredWatchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Star className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">
              {searchQuery ? 'No matching symbols' : 'Your watchlist is empty'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try a different search' : 'Add symbols to start tracking'}
            </p>
          </div>
        ) : (
          filteredWatchlist.map((item) => (
            <Card
              key={item.id}
              className="p-3 hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{item.symbol}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.asset_type}
                    </Badge>
                  </div>
                  {item.name && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {item.name}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {item.notes}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.symbol)}
                  className="ml-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
