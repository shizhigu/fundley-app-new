'use client';

import { cn } from '@/lib/utils';
import { Globe, ExternalLink, Calendar, Sparkles, TrendingUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

interface WebSearchResultCardProps {
  query: string;
  results: WebSearchResult[];
  summary?: string;
  className?: string;
}

export function WebSearchResultCard({ 
  query, 
  results, 
  summary, 
  className 
}: WebSearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url || 'Unknown source';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-white/70 dark:bg-gray-900/70",
        "backdrop-blur-xl border border-white/20 dark:border-gray-700/30",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]",
        "hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.4)]",
        "transition-all duration-300 max-w-4xl",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      
      {/* Header - Clickable for expand/collapse */}
      <div 
        className="relative px-4 py-3 border-b border-gray-200/40 dark:border-gray-700/40 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Web Search Results
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              &ldquo;{query}&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/60 dark:bg-gray-800/60">
              <TrendingUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {results.length} sources
              </span>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* AI Summary */}
            {summary && (
              <div className="relative px-4 py-3 border-b border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-purple-500/10 dark:bg-purple-500/20 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                      Key Insights
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <div className="relative p-4">
                <div className="space-y-3">
                  {results.slice(0, 5).map((result, index) => (
                    <motion.a
                      key={index}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.2 }}
                      className={cn(
                        "block p-3 rounded-lg group",
                        "bg-gray-50/50 dark:bg-gray-800/50",
                        "border border-gray-200/30 dark:border-gray-700/30",
                        "hover:bg-gray-100/60 dark:hover:bg-gray-700/60",
                        "hover:border-gray-300/50 dark:hover:border-gray-600/50",
                        "transition-all duration-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h4 className={cn(
                            "text-sm font-medium mb-2 line-clamp-2",
                            "text-gray-900 dark:text-gray-100",
                            "group-hover:text-blue-600 dark:group-hover:text-blue-400",
                            "transition-colors duration-200"
                          )}>
                            {result.title}
                          </h4>
                          
                          {/* Snippet */}
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-2">
                            {result.snippet}
                          </p>
                          
                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                            <span className="truncate max-w-[200px]">
                              {result.source || getHostname(result.url)}
                            </span>
                            {result.publishedDate && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(result.publishedDate)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* External link icon */}
                        <div className="flex-shrink-0 mt-1">
                          <ExternalLink className={cn(
                            "w-4 h-4 text-gray-400 dark:text-gray-500",
                            "group-hover:text-gray-600 dark:group-hover:text-gray-400",
                            "transition-colors duration-200"
                          )} />
                        </div>
                      </div>
                    </motion.a>
                  ))}
                  
                  {results.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{results.length - 5} more sources found
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200/50 dark:via-gray-700/50 to-transparent" />
    </motion.div>
  );
}

// Compact inline search indicator
export function InlineSearchIndicator({ 
  query, 
  resultCount 
}: { 
  query: string; 
  resultCount: number; 
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-emerald-50/60 dark:bg-emerald-950/30",
        "border border-emerald-200/40 dark:border-emerald-800/40",
        "backdrop-blur-sm text-sm font-medium"
      )}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="text-emerald-900 dark:text-emerald-100">
        <span className="font-bold">{resultCount}</span>
        <span className="text-emerald-700 dark:text-emerald-300 ml-1">sources found</span>
      </span>
    </motion.span>
  );
}