'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, Trash2, Plus, Loader2, Search, FolderPlus, MoreHorizontal, Edit2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Watchlist, WatchlistGroup } from '@/lib/db/schema/watchlist'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export function WatchlistPanel() {
  const t = useTranslations('watchlist')
  const [groups, setGroups] = useState<(WatchlistGroup & { item_count: number })[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [watchlist, setWatchlist] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [addSymbols, setAddSymbols] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create group dialog
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Rename group dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null)
  const [renameGroupName, setRenameGroupName] = useState('')
  const [renamingGroup, setRenamingGroup] = useState(false)

  // Load groups and watchlist
  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      fetchWatchlist(selectedGroupId)
    }
  }, [selectedGroupId])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/watchlist-groups')
      const data = await response.json()
      setGroups(data.groups || [])

      // Auto-select default group or first group
      if (data.groups && data.groups.length > 0) {
        const defaultGroup = data.groups.find((g: any) => g.is_default)
        setSelectedGroupId(defaultGroup?.id || data.groups[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWatchlist = async (groupId?: string) => {
    try {
      const url = groupId ? `/api/watchlist?groupId=${groupId}` : '/api/watchlist'
      const response = await fetch(url)
      const data = await response.json()
      setWatchlist(data.watchlist || [])
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      setCreatingGroup(true)
      const response = await fetch('/api/watchlist-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined
        })
      })

      if (response.ok) {
        setNewGroupName('')
        setNewGroupDescription('')
        setShowCreateGroupDialog(false)
        await fetchGroups()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Failed to create group:', error)
      alert('Failed to create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleRenameGroup = async () => {
    if (!renameGroupName.trim() || !renameGroupId) return

    try {
      setRenamingGroup(true)
      const response = await fetch(`/api/watchlist-groups/${renameGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: renameGroupName.trim()
        })
      })

      if (response.ok) {
        setShowRenameDialog(false)
        setRenameGroupId(null)
        setRenameGroupName('')
        await fetchGroups()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to rename group')
      }
    } catch (error) {
      console.error('Failed to rename group:', error)
      alert('Failed to rename group')
    } finally {
      setRenamingGroup(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    if (!confirm(`Delete "${group.name}" and all its items?`)) return

    try {
      const response = await fetch(`/api/watchlist-groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Switch to default group
        const defaultGroup = groups.find(g => g.is_default && g.id !== groupId)
        if (defaultGroup) {
          setSelectedGroupId(defaultGroup.id)
        }
        await fetchGroups()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete group')
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert('Failed to delete group')
    }
  }

  const handleAdd = async () => {
    if (!addSymbols.trim() || !selectedGroupId) return

    try {
      setAdding(true)

      // Parse symbols - split by space, comma, or both
      const symbolsArray = addSymbols
        .split(/[\s,]+/)
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0)

      if (symbolsArray.length === 0) {
        return
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbolsArray,
          asset_type: 'stock',
          group_id: selectedGroupId
        })
      })

      if (response.ok) {
        const result = await response.json()
        setAddSymbols('')
        await fetchWatchlist(selectedGroupId)
        await fetchGroups() // Refresh group counts

        // Show feedback
        if (result.inserted > 0 && result.skipped > 0) {
          alert(`Added ${result.inserted} symbol(s). ${result.skipped} already in this group: ${result.skipped_symbols.join(', ')}`)
        } else if (result.skipped > 0) {
          alert(`All symbols already in this group: ${result.skipped_symbols.join(', ')}`)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add symbols')
      }
    } catch (error) {
      console.error('Failed to add symbols:', error)
      alert('Failed to add symbols')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (symbol: string, groupId?: string) => {
    if (!confirm(`Remove ${symbol} from this group?`)) return

    try {
      const url = groupId
        ? `/api/watchlist?symbol=${symbol}&groupId=${groupId}`
        : `/api/watchlist?symbol=${symbol}`

      await fetch(url, { method: 'DELETE' })
      await fetchWatchlist(selectedGroupId || undefined)
      await fetchGroups() // Refresh group counts
    } catch (error) {
      console.error('Failed to remove symbol:', error)
    }
  }

  // Filter watchlist by search query
  const filteredWatchlist = watchlist.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

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
        </div>

        {/* Group Tabs */}
        {groups.length > 0 && (
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-1">
                <Button
                  variant={selectedGroupId === group.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="whitespace-nowrap"
                >
                  {group.name}
                  <Badge
                    variant={selectedGroupId === group.id ? 'secondary' : 'outline'}
                    className="ml-2"
                  >
                    {group.item_count}
                  </Badge>
                </Button>

                {!group.is_default && selectedGroupId === group.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameGroupId(group.id)
                          setRenameGroupName(group.name)
                          setShowRenameDialog(true)
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateGroupDialog(true)}
              className="whitespace-nowrap"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              New Group
            </Button>
          </div>
        )}

        {/* Add New Symbols */}
        {selectedGroupId && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Symbols (e.g., AAPL MSFT GOOGL or AAPL,MSFT,GOOGL)"
                value={addSymbols}
                onChange={(e) => setAddSymbols(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1"
              />
              <Button
                onClick={handleAdd}
                disabled={!addSymbols.trim() || adding}
                size="sm"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
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
          </>
        )}
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!selectedGroupId ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <FolderPlus className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No watchlist groups</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateGroupDialog(true)}
              className="mt-4"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Star className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">
              {searchQuery ? 'No matching symbols' : `No symbols in ${selectedGroup?.name}`}
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
                  onClick={() => handleRemove(item.symbol, item.group_id || undefined)}
                  className="ml-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Watchlist Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Tech Stocks, Dividend Portfolio"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Brief description of this group"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateGroupDialog(false)
                setNewGroupName('')
                setNewGroupDescription('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || creatingGroup}
            >
              {creatingGroup ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Group Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Watchlist Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="New group name"
                value={renameGroupName}
                onChange={(e) => setRenameGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false)
                setRenameGroupId(null)
                setRenameGroupName('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameGroup}
              disabled={!renameGroupName.trim() || renamingGroup}
            >
              {renamingGroup ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
