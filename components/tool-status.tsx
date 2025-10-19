'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Database,
  TrendingUp,
  FileText,
  AlertTriangle,
  Briefcase,
  Calculator,
  Download,
  BarChart,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PythonIcon } from './icons';
import { useDevModeStore } from '@/stores/dev-mode-store';

export interface ToolStatusProps {
  name: string;
  status: 'pending' | 'running' | 'completed';
  displayAction?: string;
  displayResult?: string;
}

// Tool configuration mapping
const TOOL_CONFIG: Record<string, { label: string; icon: React.ElementType }> =
  {
    // Financial data tools
    financial_data_agent: { label: 'Data analyzed', icon: TrendingUp },
    get_financial_data: { label: 'Data loaded', icon: TrendingUp },
    get_company_profile: { label: 'Profile loaded', icon: Briefcase },
    get_earnings: { label: 'Earnings loaded', icon: Briefcase },
    get_stock_quote: { label: 'Quote loaded', icon: TrendingUp },
    get_financial_timeline: { label: 'Timeline built', icon: TrendingUp },
    get_analyst_estimates: { label: 'Estimates loaded', icon: Briefcase },
    search_docs: { label: 'Knowledge learned', icon: Search },
    call_api: { label: 'Custom Data loaded', icon: Calculator },

    // Analysis tools
    run_python_code: { label: 'Analysis completed', icon: PythonIcon },
    create_analysis_block: { label: 'Analysis block created', icon: BarChart },
    create_visualization: { label: 'Chart created', icon: TrendingUp },

    // SEC filing tools
    extract_mda: { label: 'MD&A reviewed', icon: FileText },
    extract_risk_factors: { label: 'Risks identified', icon: AlertTriangle },
    extract_business_overview: { label: 'Overview compiled', icon: Briefcase },
    extractMDA: { label: 'MD&A reviewed', icon: FileText },
    extractRiskFactors: { label: 'Risks identified', icon: AlertTriangle },
    extractBusinessOverview: { label: 'Overview compiled', icon: Briefcase },

    // Search and query tools
    web_search: { label: 'Search completed', icon: Search },
    webSearch: { label: 'Search completed', icon: Search },
    sql_query: { label: 'Query executed', icon: Database },
    searchMetrics: { label: 'Metrics searched', icon: Search },
    financialFieldsAgent: { label: 'Metrics found', icon: Search },

    // File operations
    read_script_lines: { label: 'Result reviewed', icon: FileText },
    edit_script_lines: { label: 'Result finetuned', icon: FileText },
    download_file_from_sandbox: {
      label: 'Artifact downloaded',
      icon: Download,
    },
    batch_download_files_from_sandbox: {
      label: 'Artifacts downloaded',
      icon: Download,
    },

    // Legacy tools
    getFinancialData: { label: 'Data loaded', icon: TrendingUp },
    getIncomeStatement: { label: 'Income loaded', icon: FileText },
    getBalanceSheet: { label: 'Balance loaded', icon: Database },
    getCashFlow: { label: 'Cash flow loaded', icon: TrendingUp },
    getFinancialRatios: { label: 'Ratios calculated', icon: Database },
    getKeyMetrics: { label: 'Metrics loaded', icon: TrendingUp },
    calculateMetric: { label: 'Metric calculated', icon: Calculator },
  };

// Status icon configuration
const STATUS_ICONS = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
} as const;

export function ToolStatus({ name, status, displayAction }: ToolStatusProps) {
  const config = TOOL_CONFIG[name] || { label: name, icon: Database };
  const ToolIcon = config.icon;
  const StatusIcon = STATUS_ICONS[status];
  const actionLabel = displayAction || config.label;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border min-h-[36px] max-w-sm transition-all duration-150',
        status === 'running' && ['bg-brand-avatar/50 border-brand-primary/30'],
        status === 'completed' && [
          'bg-brand-avatar/30 border-brand-primary/20 opacity-80',
        ],
        status === 'pending' && ['bg-muted/20 border-border/20 opacity-60'],
      )}
    >
      {/* Tool icon */}
      <div className="flex-shrink-0">
        <ToolIcon
          className={cn(
            'w-4 h-4',
            status === 'running' && 'text-brand-primary',
            status === 'completed' && 'text-brand-primary/80',
            status === 'pending' && 'text-muted-foreground',
          )}
        />
      </div>

      {/* Action label */}
      <span
        className={cn(
          'text-xs font-medium truncate flex-1',
          status === 'running' && 'text-brand-primary',
          status === 'completed' && 'text-brand-primary/80',
          status === 'pending' && 'text-muted-foreground',
        )}
      >
        {actionLabel}
      </span>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        <StatusIcon
          className={cn(
            'w-3.5 h-3.5',
            status === 'running' && 'animate-spin text-brand-primary',
            status === 'completed' && 'text-brand-primary/80',
            status === 'pending' && 'text-muted-foreground',
          )}
        />
      </div>
    </motion.div>
  );
}

export function ToolStatusList({ tools }: { tools: ToolStatusProps[] }) {
  const { isEnabled: devModeEnabled } = useDevModeStore();

  // Only show tool badges in developer mode
  if (!devModeEnabled || tools.length === 0) return null;

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
