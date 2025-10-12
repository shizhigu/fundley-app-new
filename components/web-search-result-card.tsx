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
  className,
}: WebSearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
        'relative rounded-lg overflow-hidden border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md max-w-4xl',
        className
      )}
    >
      {/* Header - Clickable for expand/collapse */}
      <div
        className="px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-primary/10">
            <Globe className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Web Search Results</h3>
            <p className="text-xs text-muted-foreground truncate">&ldquo;{query}&rdquo;</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {results.length} sources
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* AI Summary */}
            {summary && (
              <div className="px-4 py-3 border-b border-border bg-brand-primary/5">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-brand-primary/10 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-brand-primary mb-1">Key Insights</h4>
                    <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <div className="p-4">
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
                        'block p-3 rounded-lg group bg-background border border-border hover:bg-muted/50 hover:border-brand-primary/20 transition-all duration-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h4
                            className={cn(
                              'text-sm font-medium mb-2 line-clamp-2 text-foreground group-hover:text-brand-primary transition-colors duration-200'
                            )}
                          >
                            {result.title}
                          </h4>

                          {/* Snippet */}
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-2">
                            {result.snippet}
                          </p>

                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                          <ExternalLink
                            className={cn(
                              'w-4 h-4 text-muted-foreground group-hover:text-brand-primary transition-colors duration-200'
                            )}
                          />
                        </div>
                      </div>
                    </motion.a>
                  ))}

                  {results.length > 5 && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-muted-foreground">
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
    </motion.div>
  );
}

// Compact inline search indicator
export function InlineSearchIndicator({
  query,
  resultCount,
}: {
  query: string;
  resultCount: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-sm font-medium'
      )}
    >
      <Globe className="w-3.5 h-3.5 text-brand-primary" />
      <span className="text-foreground">
        <span className="font-bold">{resultCount}</span>
        <span className="text-muted-foreground ml-1">sources found</span>
      </span>
    </motion.span>
  );
}
