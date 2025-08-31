'use client';

import { cn } from '@/lib/utils';
import { Search, Database, TrendingUp, FileText, ChevronDown, AlertTriangle, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export interface ToolStatusProps {
  name: string;
  status: 'pending' | 'running' | 'completed';
  displayAction?: string;
  displayResult?: string;
  formattedData?: any; // Add this for the complete tool result data
}

// Map tool names to user-friendly descriptions and icons
const toolConfig: Record<string, { label: string; icon: React.ElementType }> = {
  financialFieldsAgent: { 
    label: 'Analyzing financial fields', 
    icon: Search 
  },
  getFinancialData: { 
    label: 'Retrieving financial data', 
    icon: TrendingUp 
  },
  // Legacy tools (for backwards compatibility)
  getIncomeStatement: { 
    label: 'Retrieving income statement', 
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
  getFinancialRatios: { 
    label: 'Computing financial ratios', 
    icon: Database 
  },
  getKeyMetrics: { 
    label: 'Fetching key metrics', 
    icon: TrendingUp 
  },
  // SEC Filing tools
  extractMDA: {
    label: 'Extracting MD&A from SEC filings',
    icon: FileText
  },
  extractRiskFactors: {
    label: 'Extracting risk factors from 10-K',
    icon: AlertTriangle
  },
  extractBusinessOverview: {
    label: 'Extracting business overview',
    icon: Briefcase
  },
};

export function ToolStatus({ name, status, displayAction, displayResult, formattedData }: ToolStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = toolConfig[name] || { label: name, icon: Database };
  const Icon = config.icon;
  
  // Use displayAction if provided, otherwise use default label
  const action = displayAction || config.label;
  
  // Check if there's data to show when expanded
  const hasExpandableData = formattedData && status === 'completed' && 
    typeof formattedData === 'string' && formattedData.trim().length > 0;
  
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.2 }}
      className={cn(
      "inline-flex flex-col rounded-lg transition-all duration-300 min-w-0",
      "backdrop-blur-sm border",
      // Add cursor-pointer and hover states for expandable items
      hasExpandableData && "cursor-pointer hover:shadow-md",
      status === 'running' && [
        "bg-blue-50/50 dark:bg-blue-950/20",
        "border-blue-200/60 dark:border-blue-800/40",
        "shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)]",
        "dark:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.1)]",
        "animate-pulse-subtle"
      ],
      status === 'completed' && [
        "bg-gray-50/50 dark:bg-gray-900/20", 
        "border-gray-200/40 dark:border-gray-700/30",
        hasExpandableData ? "opacity-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/30" : "opacity-75"
      ],
      status === 'pending' && [
        "bg-gray-50/30 dark:bg-gray-900/10", 
        "border-gray-200/20 dark:border-gray-700/20",
        "opacity-60"
      ]
    )}
    onClick={hasExpandableData ? () => setIsExpanded(!isExpanded) : undefined}>
      {/* Main tool status header */}
      <div className="flex items-center gap-3 px-3 py-2 min-h-[40px] w-full">
        {/* Tool Icon with status color and animation */}
        <div className="relative flex-shrink-0">
          <Icon className={cn(
            "w-5 h-5",
            status === 'running' && "text-blue-500 dark:text-blue-400",
            status === 'completed' && "text-green-500 dark:text-green-400", 
            status === 'pending' && "text-gray-400 dark:text-gray-500"
          )} />
          {status === 'running' && (
            <div className="absolute -inset-1 border-2 border-blue-500/30 rounded-full animate-ping" />
          )}
        </div>
        
        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-xs font-medium block truncate",
            status === 'running' && "text-blue-600 dark:text-blue-300",
            status === 'completed' && "text-gray-600 dark:text-gray-300",
            status === 'pending' && "text-gray-400 dark:text-gray-500"
          )}>
            {action}
          </span>
          {status === 'completed' && displayResult && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 block truncate mt-0.5">
              {displayResult}
            </span>
          )}
        </div>
        
        {/* Expand/Collapse Icon */}
        {hasExpandableData && (
          <div className="flex-shrink-0 ml-1 transition-transform duration-200">
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200", 
              isExpanded && "rotate-180"
            )} />
          </div>
        )}
      </div>
      
      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && hasExpandableData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-200/40 dark:border-gray-700/30">
              <div className="mt-2 max-h-40 overflow-y-auto">
                <div className="whitespace-pre-wrap bg-gray-50/40 dark:bg-gray-800/40 rounded p-3 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400 opacity-75 font-mono font-medium italic">
                  {typeof formattedData === 'string' 
                    ? formattedData 
                    : JSON.stringify(formattedData, null, 2)
                  }
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Tool status list component for multiple tools
export function ToolStatusList({ tools }: { tools: ToolStatusProps[] }) {
  if (tools.length === 0) return null;
  
  return (
    <AnimatePresence mode="popLayout">
      <div className="flex flex-col gap-2 my-3 max-w-md">
        {tools.map((tool, index) => (
          <ToolStatus key={`${tool.name}-${index}`} {...tool} />
        ))}
      </div>
    </AnimatePresence>
  );
}