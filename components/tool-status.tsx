'use client';

import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, Search, Database, TrendingUp, FileText } from 'lucide-react';

export interface ToolStatusProps {
  name: string;
  status: 'pending' | 'running' | 'completed';
  displayAction?: string;
  displayResult?: string;
}

// Map tool names to user-friendly descriptions and icons
const toolConfig: Record<string, { label: string; icon: React.ElementType }> = {
  searchFinancialFields: { 
    label: 'Searching financial metrics', 
    icon: Search 
  },
  getIncomeStatement: { 
    label: 'Retrieving financial statements', 
    icon: FileText 
  },
  getBalanceSheet: { 
    label: 'Fetching balance sheet', 
    icon: Database 
  },
  getCashFlow: { 
    label: 'Analyzing cash flow', 
    icon: TrendingUp 
  },
  // Add more tools as needed
};

export function ToolStatus({ name, status, displayAction, displayResult }: ToolStatusProps) {
  const config = toolConfig[name] || { label: name, icon: Database };
  const Icon = config.icon;
  
  // Use displayAction if provided, otherwise use default label
  const action = displayAction || config.label;
  
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all w-fit",
      "bg-gray-50/50 dark:bg-gray-900/20",
      "border border-gray-200/30 dark:border-gray-800/30",
      status === 'running' && "bg-gray-50/70 dark:bg-gray-900/30"
    )}>
      {/* Status Icon - vertically centered */}
      <div className="flex-shrink-0 self-center">
        {status === 'running' ? (
          <div className="relative w-3.5 h-3.5">
            <div className="absolute inset-0 rounded-full border border-gray-300 dark:border-gray-600" />
            <div className="absolute inset-0 rounded-full border-t border-gray-600 dark:border-gray-400 animate-spin" />
          </div>
        ) : status === 'completed' ? (
          // Subtle green square for completed state
          <div className="w-3.5 h-3.5 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-green-400/40 dark:bg-green-500/30" />
          </div>
        ) : (
          <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      
      {/* Status Text */}
      <div className="text-left">
        <span className="text-xs text-gray-600 dark:text-gray-400">{action}</span>
        {status === 'completed' && displayResult && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 italic">
            {displayResult}
          </p>
        )}
      </div>
    </div>
  );
}

// Tool status list component for multiple tools
export function ToolStatusList({ tools }: { tools: ToolStatusProps[] }) {
  if (tools.length === 0) return null;
  
  return (
    <div className="flex flex-col gap-1 my-2">
      {tools.map((tool, index) => (
        <ToolStatus key={`${tool.name}-${index}`} {...tool} />
      ))}
    </div>
  );
}