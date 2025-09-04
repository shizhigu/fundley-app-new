'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Eye, Copy, Search, Filter } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface MetricsListProps {
  onEditMetric: (metricId: string) => void;
  onCreateNew: () => void;
}

export function MetricsList({ onEditMetric, onCreateNew }: MetricsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [includePublic, setIncludePublic] = useState(true);

  // Fetch metrics from Convex
  const metrics = useQuery(api.metrics.getByUser, {
    includePublic: includePublic,
  });

  // Filter metrics based on search and category
  const filteredMetrics = metrics?.filter(metric => {
    const matchesSearch = !searchQuery || 
      metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metric.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || metric.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Get unique categories for filter
  const categories = [...new Set(metrics?.map(m => m.category) || [])];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'profitability': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'liquidity': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'leverage': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'efficiency': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'growth': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'valuation': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  if (!metrics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-full h-10 bg-muted rounded-md animate-pulse pl-10" />
          </div>
          <div className="w-32 h-10 bg-muted rounded-md animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border rounded-lg p-6">
              <div className="space-y-3">
                <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
                <div className="w-full h-4 bg-muted rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-muted rounded animate-pulse" />
                <div className="flex justify-between items-center">
                  <div className="w-16 h-6 bg-muted rounded-full animate-pulse" />
                  <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search metrics by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
              All Categories
            </DropdownMenuItem>
            {categories.map(category => (
              <DropdownMenuItem 
                key={category} 
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={() => setIncludePublic(!includePublic)}
        >
          {includePublic ? 'Hide Public' : 'Show Public'}
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredMetrics.length === 0 ? (
          'No metrics found'
        ) : (
          `${filteredMetrics.length} metric${filteredMetrics.length === 1 ? '' : 's'} found`
        )}
      </div>

      {/* Metrics Grid */}
      {filteredMetrics.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {metrics.length === 0 ? 'No metrics yet' : 'No matching metrics'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {metrics.length === 0 
              ? 'Create your first custom financial metric to get started.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {metrics.length === 0 && (
            <Button onClick={onCreateNew}>Create Your First Metric</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map((metric) => (
            <Card key={metric._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{metric.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {metric.description}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditMetric(metric._id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Category Badge */}
                  <Badge variant="secondary" className={getCategoryColor(metric.category)}>
                    {metric.category}
                  </Badge>
                  
                  {/* Formula Preview */}
                  <div className="bg-muted/50 rounded p-3 text-sm font-mono">
                    <div className="text-xs text-muted-foreground mb-1">Formula:</div>
                    <div className="truncate">
                      {metric.formula ? JSON.stringify(metric.formula).slice(0, 50) + '...' : 'No formula'}
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {metric.isPublic && (
                        <Badge variant="outline" className="text-xs">Public</Badge>
                      )}
                      <span>
                        Updated {formatDistance(new Date(metric.updatedAt), new Date(), { addSuffix: true })}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditMetric(metric._id)}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}