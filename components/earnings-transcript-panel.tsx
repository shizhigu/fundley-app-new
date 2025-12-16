'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, FileText, ChevronRight, Languages, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface TranscriptDate {
  symbol?: string;
  quarter: number;
  fiscalYear: number;
  date: string;
}

interface TranscriptData {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  content: string;
}

// Helper to get cache key for translation
const getTranslationCacheKey = (symbol: string, year: number, quarter: number) =>
  `transcript_translation_${symbol}_${year}_Q${quarter}`;

export function EarningsTranscriptPanel() {
  const t = useTranslations('transcript');
  const [symbol, setSymbol] = useState('');
  const [availableDates, setAvailableDates] = useState<TranscriptDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<TranscriptDate | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedKeys, setTranslatedKeys] = useState<Set<string>>(new Set());

  // Check which dates have cached translations
  useEffect(() => {
    if (availableDates.length > 0 && symbol) {
      const keys = new Set<string>();
      const targetSymbol = symbol.trim().toUpperCase();
      availableDates.forEach((date) => {
        const cacheKey = getTranslationCacheKey(targetSymbol, date.fiscalYear, date.quarter);
        if (localStorage.getItem(cacheKey)) {
          keys.add(`${date.fiscalYear}-Q${date.quarter}`);
        }
      });
      setTranslatedKeys(keys);
    }
  }, [availableDates, symbol]);

  // Check for cached translation when transcript changes
  useEffect(() => {
    if (transcript) {
      const cacheKey = getTranslationCacheKey(transcript.symbol, transcript.year, transcript.quarter);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTranslation(cached);
      } else {
        setTranslation(null);
      }
      setShowTranslation(false);
    }
  }, [transcript]);

  // Fetch available transcript dates for the symbol
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || isLoadingDates) return;

    setIsLoadingDates(true);
    setError(null);
    setAvailableDates([]);
    setSelectedDate(null);
    setTranscript(null);
    setTranslation(null);
    setShowTranslation(false);

    try {
      const response = await fetch(
        `/api/earnings-transcript?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transcript dates');
      }

      const data = await response.json();

      if (!data.dates || data.dates.length === 0) {
        setError(t('noDates') || 'No transcripts available for this symbol');
        return;
      }

      setAvailableDates(data.dates);
    } catch (err) {
      console.error('Transcript dates fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingDates(false);
    }
  };

  // Fetch transcript content for selected date
  const handleSelectDate = async (date: TranscriptDate) => {
    if (isLoadingContent) return;

    setSelectedDate(date);
    setIsLoadingContent(true);
    setError(null);
    setTranscript(null);
    setTranslation(null);
    setShowTranslation(false);

    try {
      // Use the symbol from state, not from date object (API might not return it)
      const targetSymbol = date.symbol || symbol.trim().toUpperCase();
      const response = await fetch(
        `/api/earnings-transcript?symbol=${encodeURIComponent(targetSymbol)}&year=${date.fiscalYear}&quarter=${date.quarter}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transcript');
      }

      const data = await response.json();

      if (!data.content) {
        setError(t('noTranscript') || 'No transcript content available');
        return;
      }

      setTranscript(data);
    } catch (err) {
      console.error('Transcript content fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Handle translation
  const handleTranslate = async () => {
    if (!transcript || isTranslating) return;

    // Check cache first
    const cacheKey = getTranslationCacheKey(transcript.symbol, transcript.year, transcript.quarter);
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setTranslation(cached);
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript.content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();

      if (data.translation) {
        // Cache the translation
        localStorage.setItem(cacheKey, data.translation);
        setTranslation(data.translation);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Toggle between original and translation
  const toggleTranslation = () => {
    if (translation) {
      setShowTranslation(!showTranslation);
    } else {
      handleTranslate();
    }
  };

  // Retranslate - clear cache and translate again
  const handleRetranslate = async () => {
    if (!transcript || isTranslating) return;

    // Clear cache
    const cacheKey = getTranslationCacheKey(transcript.symbol, transcript.year, transcript.quarter);
    localStorage.removeItem(cacheKey);

    // Update translatedKeys state
    setTranslatedKeys((prev) => {
      const newKeys = new Set(prev);
      newKeys.delete(`${transcript.year}-Q${transcript.quarter}`);
      return newKeys;
    });

    setTranslation(null);
    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript.content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();

      if (data.translation) {
        // Cache the new translation
        localStorage.setItem(cacheKey, data.translation);
        setTranslation(data.translation);
        setShowTranslation(true);

        // Update translatedKeys
        setTranslatedKeys((prev) => {
          const newKeys = new Set(prev);
          newKeys.add(`${transcript.year}-Q${transcript.quarter}`);
          return newKeys;
        });
      }
    } catch (err) {
      console.error('Retranslation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('title') || 'Earnings Transcript'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('description') || 'View earnings call transcripts for any company'}
        </p>
      </div>

      {/* Search Form */}
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder={t('symbolPlaceholder') || 'e.g., AAPL, MSFT, GOOGL'}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            disabled={isLoadingDates}
          />
          <button
            type="submit"
            disabled={isLoadingDates || !symbol.trim()}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingDates ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Available Dates List */}
        {availableDates.length > 0 && !transcript && (
          <div className="divide-y divide-border">
            {availableDates.map((date, index) => (
              <button
                key={`${date.fiscalYear}-Q${date.quarter}`}
                onClick={() => handleSelectDate(date)}
                disabled={isLoadingContent}
                className={cn(
                  'w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left',
                  selectedDate?.fiscalYear === date.fiscalYear && selectedDate?.quarter === date.quarter && 'bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium text-foreground">
                      Q{date.quarter} {date.fiscalYear}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(date.date).toLocaleDateString()}
                    </div>
                  </div>
                  {translatedKeys.has(`${date.fiscalYear}-Q${date.quarter}`) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-brand-primary/10 text-brand-primary rounded">
                      <Languages className="w-3 h-3" />
                      {t('translated') || '已翻译'}
                    </span>
                  )}
                </div>
                {isLoadingContent && selectedDate?.fiscalYear === date.fiscalYear && selectedDate?.quarter === date.quarter ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Transcript Content */}
        {transcript && (
          <div className="p-4 space-y-4">
            {/* Back button, Header, and Translate button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setTranscript(null);
                    setTranslation(null);
                    setShowTranslation(false);
                  }}
                  className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {t('back') || 'Back'}
                </button>
                <div>
                  <span className="font-semibold text-foreground">
                    {transcript.symbol} - Q{transcript.quarter} {transcript.year}
                  </span>
                  {transcript.date && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({new Date(transcript.date).toLocaleDateString()})
                    </span>
                  )}
                </div>
              </div>

              {/* Translate Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTranslation}
                  disabled={isTranslating}
                  className={cn(
                    'px-3 py-1 text-sm border rounded-lg flex items-center gap-2 transition-colors',
                    showTranslation
                      ? 'bg-brand-primary text-white border-brand-primary hover:bg-brand-primary/90'
                      : 'border-border hover:bg-muted',
                    isTranslating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                  {isTranslating
                    ? (t('translating') || '翻译中...')
                    : showTranslation
                      ? (t('showOriginal') || '原文')
                      : translation
                        ? (t('showTranslation') || '中文')
                        : (t('translate') || '翻译')}
                </button>

                {/* Retranslate Button - only show when translation exists */}
                {translation && (
                  <button
                    onClick={handleRetranslate}
                    disabled={isTranslating}
                    className={cn(
                      'px-3 py-1 text-sm border border-border rounded-lg flex items-center gap-2 transition-colors hover:bg-muted',
                      isTranslating && 'opacity-50 cursor-not-allowed'
                    )}
                    title={t('retranslate') || '重新翻译'}
                  >
                    <RefreshCw className={cn('w-4 h-4', isTranslating && 'animate-spin')} />
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Text */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {showTranslation && translation ? (
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold text-foreground mt-6 mb-3 pb-2 border-b border-border">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-bold text-blue-500 dark:text-blue-400 mt-5 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-foreground leading-relaxed mb-4">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-brand-primary">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-4 text-sm">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-4 text-sm">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground">{children}</li>
                    ),
                  }}
                >
                  {translation}
                </ReactMarkdown>
              ) : (
                <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                  {transcript.content.replace(/\n/g, '\n\n')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!availableDates.length && !isLoadingDates && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">
              {t('emptyTitle') || 'Search for earnings transcripts'}
            </p>
            <p className="text-xs">
              {t('emptyHint') || 'Enter a stock symbol to view available transcripts'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
