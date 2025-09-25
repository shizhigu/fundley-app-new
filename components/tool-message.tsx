'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, Search, Database, TrendingUp, FileText, Globe, Calculator, Briefcase, AlertTriangle } from 'lucide-react';
import type { ToolData } from '@/lib/types';

// Map tool names to icons and display names
const toolConfig: Record<string, { label: string; icon: React.ElementType }> = {
  financial_data_agent: { label: 'Financial Analysis', icon: TrendingUp },
  get_financial_data: { label: 'Financial Data', icon: TrendingUp },
  get_company_profile: { label: 'Company Profile', icon: Briefcase },
  get_stock_quote: { label: 'Stock Quote', icon: TrendingUp },
  web_search: { label: 'Web Search', icon: Globe },
  sql_query: { label: 'Database Query', icon: Database },
  extract_mda: { label: 'MD&A Analysis', icon: FileText },
  extract_risk_factors: { label: 'Risk Factors', icon: AlertTriangle },
  extract_business_overview: { label: 'Business Overview', icon: Briefcase },
  calculateMetric: { label: 'Calculate Metric', icon: Calculator },
  searchMetrics: { label: 'Search Metrics', icon: Search },
};

interface ToolMessageProps {
  toolData: ToolData;
  className?: string;
}

export function ToolMessage({ toolData, className }: ToolMessageProps) {
  const config = toolConfig[toolData.toolName] || { label: toolData.toolName, icon: Database };
  const Icon = config.icon;

  const getStatusIcon = () => {
    switch (toolData.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Icon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (toolData.status) {
      case 'running':
        return 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20';
      case 'completed':
        return 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20';
      case 'failed':
        return 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20';
      default:
        return 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/20';
    }
  };

  const hasResult = toolData.status === 'completed' && toolData.result;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col rounded-lg border p-3 my-2 max-w-md",
        "backdrop-blur-sm transition-all duration-200",
        getStatusColor(),
        className
      )}
    >
      {/* Tool header */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">
            {config.label}
          </span>
          {toolData.args && Object.keys(toolData.args).length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
              {Object.entries(toolData.args).map(([key, value]) =>
                `${key}: ${String(value)}`
              ).join(', ')}
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
      </div>

      {/* Tool result */}
      {hasResult && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="mt-3 pt-2 border-t border-gray-200/40 dark:border-gray-700/30"
        >
          <div className="text-xs text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto">
            <div className="whitespace-pre-wrap bg-gray-100/50 dark:bg-gray-800/50 rounded p-2 font-mono">
              {typeof toolData.result === 'string'
                ? toolData.result
                : JSON.stringify(toolData.result, null, 2)
              }
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}