'use client';

import { cn } from '@/lib/utils';
import { Search, Database, TrendingUp, FileText, AlertTriangle, Briefcase, Calculator, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToolStatusProps {
  name: string;
  status: 'pending' | 'running' | 'completed';
  displayAction?: string;
  displayResult?: string;
}

// Map tool names to user-friendly descriptions and icons
const toolConfig: Record<string, { label: string; icon: React.ElementType }> = {
  // ADK Financial Agent Tools
  financial_data_agent: {
    label: 'Analyzing financial data',
    icon: TrendingUp
  },
  get_financial_data: {
    label: 'Retrieving financial data',
    icon: TrendingUp
  },
  get_company_profile: {
    label: 'Fetching company profile',
    icon: Briefcase
  },
  get_stock_quote: {
    label: 'Getting stock quote',
    icon: TrendingUp
  },
  web_search: {
    label: 'Web Search Results',
    icon: Search
  },
  sql_query: {
    label: 'Querying financial database',
    icon: Database
  },
  extract_mda: {
    label: 'Extracting MD&A from SEC filings',
    icon: FileText
  },
  extract_risk_factors: {
    label: 'Extracting risk factors from 10-K',
    icon: AlertTriangle
  },
  extract_business_overview: {
    label: 'Extracting business overview',
    icon: Briefcase
  },
  // Legacy tools
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
  // Custom Metrics & Calculation tools
  calculateMetric: {
    label: 'Computing custom metric',
    icon: Calculator
  },
  searchMetrics: {
    label: 'Searching financial metrics',
    icon: Search
  },
  // Web Search tools
  webSearch: {
    label: 'Web Search Results',
    icon: Search
  },
  // Data Visualization tools
  create_visualization: {
    label: 'Creating data visualization',
    icon: TrendingUp
  },
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
        "inline-flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 min-w-0",
        "backdrop-blur-sm border min-h-[40px] max-w-sm",
        status === 'running' && [
          "bg-blue-50/50 dark:bg-blue-950/20",
          "border-blue-200/60 dark:border-blue-800/40",
          "shadow-[0_2px_8px_-2px_rgba(59,130,246,0.15)]",
          "dark:shadow-[0_2px_8px_-2px_rgba(59,130,246,0.1)]",
          "animate-pulse-subtle"
        ],
        status === 'completed' && [
          "bg-green-50/50 dark:bg-green-950/20",
          "border-green-200/40 dark:border-green-700/30",
          "opacity-90"
        ],
        status === 'pending' && [
          "bg-gray-50/30 dark:bg-gray-900/10",
          "border-gray-200/20 dark:border-gray-700/20",
          "opacity-60"
        ]
      )}>
      {/* Tool Icon with status color and animation */}
      <div className="relative flex-shrink-0">
        <Icon className={cn(
          "w-4 h-4",
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
          status === 'completed' && "text-green-600 dark:text-green-300",
          status === 'pending' && "text-gray-400 dark:text-gray-500"
        )}>
          {action}
        </span>
      </div>
    </motion.div>
  );
}

// Tool status list component for multiple tools
export function ToolStatusList({ tools }: { tools: ToolStatusProps[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-3">
      <AnimatePresence mode="popLayout">
        {tools.map((tool, index) => (
          <ToolStatus key={`${tool.name}-${index}`} {...tool} />
        ))}
      </AnimatePresence>
    </div>
  );
}