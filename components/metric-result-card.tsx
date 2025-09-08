'use client';

import { cn } from '@/lib/utils';
import { Calculator, TrendingUp, TrendingDown, Minus, ArrowUpRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Markdown } from './markdown';

// JSON Visualizer Component
const JsonVisualizer = ({ data }: { data: string }) => {
  try {
    const parsed = JSON.parse(data);
    
    // Handle the specific metric calculation result format
    if (parsed.metric && parsed.symbols) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {parsed.metric}
            </span>
          </div>
          
          {parsed.symbols.map((symbolData: any, idx: number) => (
            <div key={idx} className="bg-gray-50/40 dark:bg-gray-800/40 rounded-lg p-3 border border-gray-200/30 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {symbolData.symbol}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {symbolData.values?.length || 0} periods
                </span>
              </div>
              
              {symbolData.values && symbolData.values.length > 0 && (
                <div className="space-y-1">
                  {symbolData.values.slice(0, 3).map((value: any, valueIdx: number) => (
                    <div key={valueIdx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {value.period}
                      </span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        {value.value !== null ? value.value.toFixed(4) : 'null'}
                      </span>
                    </div>
                  ))}
                  {symbolData.values.length > 3 && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
                      +{symbolData.values.length - 3} more periods
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Generic JSON object viewer
    return (
      <div className="space-y-2">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key} className="flex justify-between items-start text-xs">
            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-0 flex-shrink-0 mr-3">
              {key}:
            </span>
            <span className="font-mono text-gray-600 dark:text-gray-400 text-right break-all">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
    
  } catch (error) {
    // Fallback to formatted text if not valid JSON
    return (
      <pre className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 font-mono leading-relaxed">
        {data}
      </pre>
    );
  }
};

export interface MetricResultData {
  metricName: string;
  symbol: string;
  value: number;
  period: string;
  unit?: string;
  change?: number;
  changePercent?: number;
  description?: string;
}

interface MetricResultCardProps {
  data: MetricResultData[];
  title?: string;
  className?: string;
  rawOutput?: string; // For expandable debug info
}

export function MetricResultCard({ data, title, className, rawOutput }: MetricResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatValue = (value: number, unit?: string) => {
    if (unit === '%' || unit === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (unit === 'currency' || unit === '$') {
      if (Math.abs(value) >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      }
      if (Math.abs(value) >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      }
      return `$${value.toLocaleString()}`;
    }
    if (unit === 'ratio' || !unit) {
      return value.toFixed(2);
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        "inline-flex flex-col rounded-lg overflow-hidden max-w-md",
        "bg-white/30 dark:bg-gray-900/30",
        "backdrop-blur-md border border-white/20 dark:border-gray-700/20",
        "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-purple-500/3 pointer-events-none" />
      
      {/* Compact header - Clickable when rawOutput available */}
      <div 
        className={cn(
          "relative px-3 py-2 border-b border-gray-200/20 dark:border-gray-700/20",
          rawOutput && "cursor-pointer hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
        )}
        onClick={rawOutput ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {data[0]?.metricName || 'Metric Results'}
            </h3>
          </div>
          {rawOutput && (
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          )}
        </div>
      </div>

      {/* Compact results */}
      <div className="relative p-2 space-y-1">
        {data.slice(0, 4).map((result, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.15 }}
            className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-medium text-gray-900 dark:text-gray-100 font-mono">
                {result.symbol}
              </span>
              <span className="text-gray-500 dark:text-gray-400 truncate">
                {result.period}
              </span>
            </div>
            
            {result.value !== 0 && result.value !== null && (
              <div className="flex-shrink-0">
                <span className="font-bold text-gray-900 dark:text-gray-100 font-mono">
                  {formatValue(result.value, result.unit)}
                </span>
              </div>
            )}
          </motion.div>
        ))}
        
        {data.length > 4 && (
          <div className="text-center pt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{data.length - 4} more
            </span>
          </div>
        )}
      </div>
      
      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && rawOutput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-gray-200/40 dark:border-gray-700/40"
          >
            <div className="px-3 py-2">
              <div className="max-h-60 overflow-y-auto">
                <JsonVisualizer data={rawOutput} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Simple inline metric display for smaller results
export function InlineMetricResult({ 
  value, 
  unit, 
  label, 
  symbol 
}: { 
  value: number; 
  unit?: string; 
  label: string; 
  symbol?: string; 
}) {
  const formatValue = (value: number, unit?: string) => {
    if (unit === '%' || unit === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (unit === 'currency' || unit === '$') {
      if (Math.abs(value) >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      }
      if (Math.abs(value) >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      }
      return `$${value.toLocaleString()}`;
    }
    return value.toFixed(2);
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-blue-50/60 dark:bg-blue-950/30",
        "border border-blue-200/40 dark:border-blue-800/40",
        "backdrop-blur-sm text-sm font-medium"
      )}
    >
      <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      <span className="text-blue-900 dark:text-blue-100">
        {symbol && `${symbol}: `}
        <span className="font-bold font-mono">{formatValue(value, unit)}</span>
        {label && <span className="text-blue-700 dark:text-blue-300 ml-1">({label})</span>}
      </span>
    </motion.span>
  );
}