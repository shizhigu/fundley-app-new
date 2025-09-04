'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, DollarSign, TrendingUp, Activity, BarChart, Building } from 'lucide-react';
import { incomeStatementFields } from '@/lib/fmp/income-statement-fields';
import { balanceSheetFields } from '@/lib/fmp/balance-sheet-fields';
import { cashFlowFields } from '@/lib/fmp/cash-flow-fields';

// Combine all financial fields from real data
const ALL_FINANCIAL_FIELDS = [
  ...incomeStatementFields.map(field => ({
    id: field.field,
    name: field.name,
    category: field.dataSource?.statement?.toLowerCase().replace(' statement', '').replace(' sheet', '') || 'other',
    description: field.description,
    unit: field.dataFormat.unit,
    aliases: field.aliases,
    originalCategory: field.category
  })),
  ...balanceSheetFields.map(field => ({
    id: field.field,
    name: field.name,
    category: 'balance',
    description: field.description,
    unit: field.dataFormat.unit,
    aliases: field.aliases,
    originalCategory: field.category
  })),
  ...cashFlowFields.map(field => ({
    id: field.field,
    name: field.name,
    category: 'cashflow',
    description: field.description,
    unit: field.dataFormat.unit,
    aliases: field.aliases,
    originalCategory: field.category
  }))
];

const CATEGORY_ICONS = {
  income: DollarSign,
  balance: Building,
  cashflow: TrendingUp,
  cash: Activity,
};

const CATEGORY_COLORS = {
  income: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  balance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  cashflow: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  cash: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function FieldsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter fields based on search and category
  const filteredFields = ALL_FINANCIAL_FIELDS.filter(field => {
    const matchesSearch = !searchQuery || 
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(ALL_FINANCIAL_FIELDS.map(f => f.category))];

  const handleFieldDragStart = (e: React.DragEvent, field: typeof ALL_FINANCIAL_FIELDS[0]) => {
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Financial Fields</CardTitle>
        <CardDescription>
          Drag fields to the canvas to build your formula
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Badge>
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Fields List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {filteredFields.map((field) => {
              const IconComponent = CATEGORY_ICONS[field.category as keyof typeof CATEGORY_ICONS];
              const categoryColor = CATEGORY_COLORS[field.category as keyof typeof CATEGORY_COLORS];
              
              return (
                <Card
                  key={field.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary"
                  draggable
                  onDragStart={(e) => handleFieldDragStart(e, field)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {field.name}
                          </span>
                          <Badge variant="outline" className={`text-xs ${categoryColor}`}>
                            {field.category}
                          </Badge>
                        </div>
                        
                        {field.originalCategory !== field.category && (
                          <div className="text-xs text-muted-foreground mb-1">
                            {field.originalCategory}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {field.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {field.id}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {field.unit}
                          </Badge>
                        </div>
                        
                        {field.aliases.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Aliases:</div>
                            <div className="flex flex-wrap gap-1">
                              {field.aliases.map((alias) => (
                                <Badge key={alias} variant="outline" className="text-xs">
                                  {alias}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {filteredFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No fields match your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}