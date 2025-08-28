'use client';

import { cn } from '@/lib/utils';
import { Search, Database, TrendingUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.2 }}
      className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300",
      "backdrop-blur-sm",
      status === 'running' && [
        "bg-blue-50/50 dark:bg-blue-950/20",
        "border border-blue-200/60 dark:border-blue-800/40",
        "shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)]",
        "dark:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.1)]",
        "animate-pulse-subtle"
      ],
      status === 'completed' && [
        "bg-gray-50/50 dark:bg-gray-900/20", 
        "border border-gray-200/40 dark:border-gray-700/30",
        "opacity-75"
      ],
      status === 'pending' && [
        "bg-gray-50/30 dark:bg-gray-900/10", 
        "border border-gray-200/20 dark:border-gray-700/20",
        "opacity-60"
      ]
    )}>
      {/* Status Icon - vertically centered */}
      <div className="flex-shrink-0">
        {status === 'running' ? (
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 rounded-full bg-blue-400/20 dark:bg-blue-400/10" />
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 dark:border-blue-400 animate-spin" />
          </div>
        ) : status === 'completed' ? (
          <div className="w-2 h-2 rounded-full bg-green-400/40 dark:bg-green-400/20" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-300/40 dark:bg-gray-600/20" />
        )}
      </div>
      
      {/* Status Text */}
      <span className={cn(
        "text-[10px] leading-tight tracking-wide",
        status === 'running' && "text-blue-600 dark:text-blue-300 font-medium",
        status === 'completed' && "text-gray-500 dark:text-gray-400",
        status === 'pending' && "text-gray-400 dark:text-gray-500"
      )}>
        {action}
      </span>
      {status === 'completed' && displayResult && (
        <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1 opacity-80">
          • {displayResult}
        </span>
      )}
    </motion.div>
  );
}

// Tool status list component for multiple tools
export function ToolStatusList({ tools }: { tools: ToolStatusProps[] }) {
  if (tools.length === 0) return null;
  
  return (
    <AnimatePresence mode="popLayout">
      <div className="inline-flex flex-wrap gap-1.5 my-2">
        {tools.map((tool, index) => (
          <ToolStatus key={`${tool.name}-${index}`} {...tool} />
        ))}
      </div>
    </AnimatePresence>
  );
}