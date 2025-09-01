'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench, Search, Database, Code, Calculator } from 'lucide-react';

export function DevTools() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resultsCount, setResultsCount] = useState(5);
  const [queryTime, setQueryTime] = useState<{ total: number; search: number } | null>(null);

  const handleFieldSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setQueryTime(null);
    const clientStartTime = Date.now();
    
    try {
      const response = await fetch('/api/field-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: resultsCount
        })
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      const clientTotalTime = Date.now() - clientStartTime;
      
      setSearchResults(data.results || []);
      setQueryTime({
        total: clientTotalTime,
        search: data.timing?.search || 0
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setQueryTime(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto gap-2"
          >
            <Wrench size={16} />
            Dev Tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Development Tools</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsSearchOpen(true)}>
            <Search className="mr-2 h-4 w-4" />
            Field Search Test
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => window.location.href = '/formula-builder'}>
            <Calculator className="mr-2 h-4 w-4" />
            Formula Builder
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => window.open('/api/chat', '_blank')}>
            <Code className="mr-2 h-4 w-4" />
            API Explorer
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => {
              const url = process.env.NEXT_PUBLIC_QDRANT_URL || 'https://localhost:6333/dashboard';
              window.open(`${url.replace(/\/$/, '')}/dashboard`, '_blank');
            }}
          >
            <Database className="mr-2 h-4 w-4" />
            Qdrant Dashboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Field Search Test</DialogTitle>
            <DialogDescription>
              Test the semantic search functionality for financial fields
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="query">Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="query"
                  placeholder="e.g., revenue growth, profit margin, debt coverage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFieldSearch()}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="5"
                  value={resultsCount}
                  onChange={(e) => setResultsCount(Number.parseInt(e.target.value) || 5)}
                  className="w-20"
                  min={1}
                  max={10}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleFieldSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="flex-1"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                Clear
              </Button>
            </div>
            
            {/* Example queries */}
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Example queries:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  'revenue growth',
                  'profit margin',
                  'R&D investment',
                  'debt coverage',
                  'cash generation',
                  'tax efficiency',
                  '营收增长',
                  '利润率'
                ].map((example) => (
                  <Button
                    key={example}
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs"
                    onClick={() => setSearchQuery(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Results ({searchResults.length})</h3>
                  {queryTime && (
                    <div className="text-sm text-muted-foreground">
                      Total: {queryTime.total}ms | Embed+Search: {queryTime.search}ms
                    </div>
                  )}
                </div>
                {searchResults.map((field, index) => (
                  <div key={field.field} className="border-l-2 border-blue-500 pl-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {field.field}
                      </code>
                      <span className="text-sm font-medium">{field.name}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {field.description}
                    </p>
                    
                    {field.useCases && field.useCases.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold">Use cases:</span>
                        <ul className="list-disc list-inside mt-1">
                          {field.useCases.map((useCase: string, i: number) => (
                            <li key={i}>{useCase}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {field.aliases && field.aliases.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold">Aliases:</span>{' '}
                        <span className="text-muted-foreground">
                          {field.aliases.slice(0, 5).join(', ')}
                          {field.aliases.length > 5 && '...'}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Tool: <code className="px-1 py-0.5 bg-muted rounded">{field.tool}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}