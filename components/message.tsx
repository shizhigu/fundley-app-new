'use client';

import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import { PencilEditIcon, LoaderIcon } from './icons';
import { Shield, Heart } from 'lucide-react';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { EnhancedAttachmentPreview } from './enhanced-attachment-preview';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { MessageReasoning } from './message-reasoning';
import { JSVisualizationMessage } from './js-visualization-message';
import { WebSearchResultCard } from './web-search-result-card';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import type { ChatMessage } from '@/lib/types';
import { ToolStatus } from './tool-status';
import { hasMetadata, MessageMetadata } from '@/lib/message-metadata';
import { TickerButtonGroup } from './ticker-button';
import { SuggestionButtonGroup } from './suggestion-button';
import { StockLoader } from './stock-loader';
import { CollapsibleUserMessage } from './collapsible-user-message';

// Chart.js visualization engine for frontend execution
const JSVisualizationEngine = {
  generateChartJSHTML: (data: any[], chartConfig: any, vizId: string = 'default'): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: white;
    }
    .chart-container {
      width: 100%;
      height: 400px;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="chart-container">
    <canvas id="chart-${vizId}"></canvas>
  </div>
  <script>
    try {
      console.log('🔥 Chart.js Visualization - ID: ${vizId}');
      const config = ${JSON.stringify(chartConfig)};

      console.log('📊 Chart config:', config);

      const ctx = document.getElementById('chart-${vizId}').getContext('2d');
      new Chart(ctx, config);
    } catch (error) {
      console.error('Chart rendering error:', error);
      document.body.innerHTML = '<div style="padding: 20px; color: red;">Chart rendering failed: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`;
  }
};

// Citation Card Component - 2025 Design
const CitationCard = ({ citation }: { citation: any }) => {
  const [imageError, setImageError] = useState(false);
  const [metadata, setMetadata] = useState<{title?: string, description?: string, loading?: boolean}>({ loading: true });

  const url = typeof citation === 'string' ? citation : citation.url || citation.link;

  useEffect(() => {
    const cacheKey = `metadata_${url}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
          setMetadata({
            title: cachedData.title,
            description: cachedData.description,
            loading: false
          });
          return;
        }
      } catch (e) {
        // Continue to fetch
      }
    }

    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        const metadataResult = {
          title: data.title,
          description: data.description,
          loading: false
        };

        setMetadata(metadataResult);
        localStorage.setItem(cacheKey, JSON.stringify({
          title: data.title,
          description: data.description,
          timestamp: Date.now()
        }));

      } catch (error) {
        console.warn('Failed to fetch metadata for', url);
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          const fallbackResult = {
            title: domain,
            description: `Content from ${domain}`,
            loading: false
          };
          setMetadata(fallbackResult);
          localStorage.setItem(cacheKey, JSON.stringify({
            title: domain,
            description: `Content from ${domain}`,
            timestamp: Date.now()
          }));
        } catch {
          const defaultResult = {
            title: 'Web Page',
            description: 'External content',
            loading: false
          };
          setMetadata(defaultResult);
          localStorage.setItem(cacheKey, JSON.stringify({
            title: 'Web Page',
            description: 'External content',
            timestamp: Date.now()
          }));
        }
      }
    };

    fetchMetadata();
  }, [url]);

  const displayTitle = metadata.loading ? 'Loading...' : metadata.title || new URL(url).hostname;
  const displayDescription = metadata.loading ? '' : metadata.description || '';

  const getPreviewImage = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '/favicon.ico';
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-2 bg-card border border-border/50 rounded-lg text-xs hover:scale-[1.02] hover:border-brand-primary/30 transition-all duration-150 group"
    >
      <div className="flex gap-2">
        <div className="flex-shrink-0">
          {!imageError ? (
            <img
              src={getPreviewImage(url)}
              alt={displayTitle}
              className="w-6 h-6 rounded object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <span className="text-xs">🌐</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground group-hover:text-brand-primary truncate text-xs transition-colors duration-150">
            {displayTitle}
          </div>
          {displayDescription && (
            <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {displayDescription}
            </div>
          )}
          <div className="text-muted-foreground/70 mt-1 truncate text-xs">
            {new URL(url).hostname}
          </div>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <span className="text-muted-foreground text-xs">↗</span>
        </div>
      </div>
    </a>
  );
};

// Search Results Card - 2025 Design
const SearchResultsCard = ({ toolCallId, output, input }: { toolCallId: string; output: any; input: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let content = '';
  let citations = [];

  if (typeof output === 'string') {
    content = output;
  } else if (output && typeof output === 'object') {
    content = output.content || output.answer || JSON.stringify(output);
    citations = output.citations || [];
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative rounded-xl overflow-hidden max-w-xl bg-card border border-border/50 transition-all duration-150 hover:scale-[1.02] hover:border-brand-primary/30"
    >
      <div
        className="relative px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors duration-150"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 text-brand-primary">🌐</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground">
              Web Search
            </h3>
            {input?.query && (
              <p className="text-xs text-muted-foreground truncate">
                &ldquo;{input.query.substring(0, 30)}...&rdquo;
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {citations.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {citations.length} sources
              </span>
            )}
            <div className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
              isExpanded && "rotate-180"
            )}>↓</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/50"
          >
            {content && (
              <div className="px-3 py-2">
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-3 h-3 text-brand-primary mt-0.5 flex-shrink-0">✨</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-brand-primary mb-1">
                      Key Insights
                    </h4>
                    <div className="prose prose-xs dark:prose-invert max-w-none text-xs">
                      <Markdown>{content}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {citations.length > 0 && (
              <div className="px-3 pb-3 border-t border-border/30">
                <h4 className="text-xs font-medium text-foreground mb-2 mt-2">
                  Sources ({citations.length})
                </h4>
                <div className="space-y-1">
                  {citations.map((citation: any, idx: number) => (
                    <CitationCard key={idx} citation={citation} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main Message Component
const PurePreviewMessage = ({
  message,
  isLoading,
  isLatest,
  setMessages,
  regenerate,
  isReadonly,
  addToolResult,
  requiresScrollPadding,
}: {
  message: ChatMessage;
  isLoading: boolean;
  isLatest?: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  addToolResult?: UseChatHelpers<ChatMessage>['addToolResult'];
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [extractedMetadata, setExtractedMetadata] = useState<{
    tickers?: string[],
    suggestions?: { text: string, containsRealData: boolean, verificationMessage?: string }[],
    containsRealData?: boolean,
    verificationMessage?: string
  } | null>(null);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);
  const [showFullVerification, setShowFullVerification] = useState(false);

  // Collect attachments from two sources
  const attachmentsFromParts = message.parts?.filter(
    (part: any) => part.type === 'file',
  ) || [];

  const attachmentsFromDB = (message as any).attachments || [];

  const allAttachments = [
    ...attachmentsFromParts.map((part: any) => ({
      name: part.filename ?? 'file',
      contentType: part.mediaType,
      url: part.url,
    })),
    ...attachmentsFromDB
  ];

  // Extract suggestions from XML tags in streamed content
  useEffect(() => {
    if (message.role !== 'assistant' || !message.parts) {
      return;
    }

    const allText = message.parts
      ?.filter((part: any) => part.type === 'text')
      ?.map((part: any) => part.text)
      ?.join('') || '';

    if (!allText.trim()) {
      return;
    }

    const extractSuggestions = (content: string) => {
      if (!content.includes('</suggestions>')) {
        return null;
      }

      try {
        const regex = /<suggestions>([\s\S]*?)<\/suggestions>/;
        const match = content.match(regex);

        if (!match || !match[1]) {
          return null;
        }

        const jsonStr = match[1].trim();
        const suggestions = JSON.parse(jsonStr);

        if (!Array.isArray(suggestions)) {
          console.warn('Suggestions not an array:', suggestions);
          return null;
        }

        const validSuggestions = suggestions.filter(
          s => s && typeof s === 'object' && s.label && s.prompt
        );

        if (validSuggestions.length === 0) {
          return null;
        }

        return validSuggestions.map(s => ({
          text: s.prompt,
          containsRealData: false,
        }));
      } catch (e) {
        return null;
      }
    };

    const extractedSuggestions = extractSuggestions(allText);

    if (extractedSuggestions) {
      setExtractedMetadata({
        suggestions: extractedSuggestions,
        tickers: extractedMetadata?.tickers,
        containsRealData: extractedMetadata?.containsRealData,
        verificationMessage: extractedMetadata?.verificationMessage
      });
    }
  }, [message.role, message.parts]);

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-9 flex items-center rounded-full justify-center shrink-0 bg-brand-avatar border border-brand-primary/20">
              <Heart size={16} className="text-brand-primary fill-brand-primary/20" strokeWidth={2.5} />
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {allAttachments.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="mb-4"
              >
                <EnhancedAttachmentPreview
                  attachments={allAttachments}
                  onRemove={() => {}}
                  isUploading={false}
                  showRemoveButton={false}
                />
              </div>
            )}

            {message.parts?.map((part: any, index: number) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning' && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  let cleanedText = part.text;
                  const suggestionsTagRegex = /<suggestions>[\s\S]*?<\/suggestions>/g;
                  cleanedText = cleanedText.replace(suggestionsTagRegex, '').trim();

                  const parsedMessage = { content: sanitizeText(cleanedText), metadata: {} as MessageMetadata };

                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100 transition-opacity duration-150"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'user-message-gunmetal px-4 py-3 rounded-lg border-2 border-border bg-muted/30': message.role === 'user',
                        })}
                      >
                        {message.role === 'user' ? (
                          <CollapsibleUserMessage content={parsedMessage.content} />
                        ) : (
                          <Markdown>{parsedMessage.content}</Markdown>
                        )}

                        {hasMetadata(parsedMessage.metadata) && (
                          <div className="flex flex-col gap-3 mt-2">
                            {parsedMessage.metadata.tickers && (
                              <TickerButtonGroup
                                tickers={parsedMessage.metadata.tickers}
                                className="not-prose"
                              />
                            )}

                            {parsedMessage.metadata.suggestions && (
                              <SuggestionButtonGroup
                                suggestions={parsedMessage.metadata.suggestions}
                                onSuggestionClick={(suggestion) => {
                                  const selectors = [
                                    'textarea[data-testid="multimodal-input"]',
                                    'textarea[name="message"]',
                                    'textarea[placeholder*="market"]',
                                    'textarea[placeholder*="Ask"]',
                                    '.professional-input',
                                    'form textarea'
                                  ];

                                  let input: HTMLTextAreaElement | null = null;
                                  for (const selector of selectors) {
                                    input = document.querySelector(selector) as HTMLTextAreaElement;
                                    if (input) break;
                                  }

                                  if (input) {
                                    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                    nativeTextAreaValueSetter?.call(input, suggestion);

                                    const inputEvent = new Event('input', { bubbles: true });
                                    input.dispatchEvent(inputEvent);

                                    const changeEvent = new Event('change', { bubbles: true });
                                    input.dispatchEvent(changeEvent);

                                    input.focus();
                                    input.selectionStart = input.selectionEnd = suggestion.length;
                                  } else {
                                    console.warn('Could not find textarea input element');
                                  }
                                }}
                                className="not-prose"
                              />
                            )}

                            {message.role === 'assistant' && extractedMetadata?.containsRealData && extractedMetadata?.verificationMessage && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-brand-primary/20 w-fit text-xs">
                                <Shield className="w-3.5 h-3.5 text-brand-primary" />
                                <span className="text-brand-primary font-medium">
                                  {extractedMetadata.verificationMessage}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        regenerate={regenerate}
                      />
                    </div>
                  );
                }
              }

              // JS Visualization Tool
              if (type === 'tool-createJSVisualization' as any) {
                const { toolCallId, state } = part as any;

                if (state === 'input-available') {
                  const { input } = part as any;
                  return (
                    <div key={toolCallId} className="bg-card border border-border/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <StockLoader size={14} />
                        <span>Creating visualization: {input?.title}</span>
                      </div>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  if ('error' in output) {
                    return (
                      <div key={toolCallId} className="text-destructive p-3 border border-destructive/50 rounded-lg">
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  const uniqueKey = `js-viz-${toolCallId}-${output.id}`;

                  console.log(`🎨 Rendering JS Visualization:`, {
                    toolCallId,
                    vizId: output.id,
                    title: output.title,
                    uniqueKey,
                    hasHtml: !!output.cachedHtml
                  });

                  return (
                    <div key={uniqueKey} data-viz-id={output.id} data-tool-call={toolCallId}>
                      <JSVisualizationMessage
                        key={uniqueKey}
                        id={output.id}
                        title={output.title}
                        description={output.description}
                        cachedHtml={output.cachedHtml}
                        metadata={output.metadata}
                      />
                    </div>
                  );
                }
              }

              // Direct visualization parts
              if (type === 'visualization') {
                const { chartjsConfig, title, description } = part;
                const vizId = `viz-${message.id}-${index}`;

                if (chartjsConfig) {
                  return (
                    <div key={key} className="my-4">
                      <JSVisualizationMessage
                        id={vizId}
                        title={title || 'Chart'}
                        description={description || 'Generated visualization'}
                        cachedHtml={JSVisualizationEngine.generateChartJSHTML([], chartjsConfig, vizId)}
                        metadata={{}}
                      />
                    </div>
                  );
                }
              }

              // Direct web_search parts
              if (type === 'web_search') {
                const { query, results, summary } = part;

                return (
                  <div key={key} className="my-4">
                    <WebSearchResultCard
                      query={query || 'Search results'}
                      results={results || []}
                      summary={summary}
                    />
                  </div>
                );
              }

              // Direct tool_status parts
              if (type === 'tool_status') {
                const { name, status, displayResult, formattedData } = part;

                return (
                  <div key={key} className="my-4">
                    <ToolStatus
                      name={name}
                      status={status}
                      displayResult={displayResult}
                    />
                  </div>
                );
              }

              // Request Suggestions Tool
              if (type === 'tool-requestSuggestions') {
                const { toolCallId, state } = part;

                if (state === 'output-available') {
                  const { output } = part;

                  if ('error' in output) {
                    return (
                      <div
                        key={toolCallId}
                        className="text-destructive p-3 border border-destructive/50 rounded-lg"
                      >
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId} className="text-sm text-muted-foreground">
                      Suggestions generated successfully
                    </div>
                  );
                }
              }

              // Calculate LaTeX Metric Tool
              if (type === 'tool-calculateLatexMetric') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  const metricName = input?.metricId || 'LaTeX Metric';

                  return (
                    <div key={toolCallId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-avatar border border-brand-primary/20 text-sm not-prose">
                      <StockLoader size={12} />
                      <span className="text-brand-primary font-medium">
                        Computing LaTeX metric {metricName}...
                      </span>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { input } = part;
                  const metricName = input?.metricId || 'LaTeX Metric';
                  const description = input?.dataRequirements?.description || '';

                  return (
                    <div key={toolCallId} className="not-prose">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-avatar border border-brand-primary/20 text-sm">
                        <div className="w-3 h-3 bg-brand-primary rounded-full"></div>
                        <span className="text-brand-primary font-medium">
                          LaTeX metric {metricName} calculated
                        </span>
                        {description && (
                          <span className="text-brand-primary/70 text-xs">
                            • {description.slice(0, 50)}{description.length > 50 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              }

              // Financial Tools
              if ((type as any) === 'tool-financialFieldsAgent' ||
                  (type as any) === 'tool-getIncomeStatement' ||
                  (type as any) === 'tool-findIncomeStatementFields' ||
                  (type as any) === 'tool-getKeyMetrics' ||
                  (type as any) === 'tool-findKeyMetricsFields' ||
                  (type as any) === 'tool-getFinancialRatios' ||
                  (type as any) === 'tool-getFinancialData' ||
                  (type as any) === 'tool-findFinancialRatioFields') {
                const { toolCallId, state } = part as any;
                const toolName = (type as string).replace('tool-', '');

                if (state === 'input-available') {
                  const { input } = part as any;

                  let displayAction = 'Processing request';

                  if ((type as any) === 'tool-financialFieldsAgent' ||
                      (type as any) === 'tool-findIncomeStatementFields' ||
                      (type as any) === 'tool-findKeyMetricsFields' ||
                      (type as any) === 'tool-findFinancialRatioFields') {
                    displayAction = `Analyzing "${input?.query || 'financial query'}"`;
                  } else if ((type as any) === 'tool-getIncomeStatement') {
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      displayAction = `Fetching ${symbols.join(', ')} financials`;
                    } else {
                      displayAction = 'Fetching financial data';
                    }
                  } else if ((type as any) === 'tool-getKeyMetrics') {
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      displayAction = `Fetching ${symbols.join(', ')} key metrics`;
                    } else {
                      displayAction = 'Fetching key metrics';
                    }
                  } else if ((type as any) === 'tool-getFinancialRatios') {
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      displayAction = `Fetching ${symbols.join(', ')} financial ratios`;
                    } else {
                      displayAction = 'Fetching financial ratios';
                    }
                  } else if ((type as any) === 'tool-getFinancialData') {
                    const symbols = input?.symbols || [];
                    const dataType = input?.dataType || 'financial data';
                    if (symbols.length > 0) {
                      const typeLabel = dataType.replace('get', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
                      displayAction = `Fetching ${symbols.join(', ')} ${typeLabel}`;
                    } else {
                      displayAction = 'Fetching financial data';
                    }
                  }

                  return (
                    <div key={toolCallId}>
                      <ToolStatus
                        name={toolName}
                        status="running"
                        displayAction={displayAction}
                      />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  let completedAction = 'Completed';
                  if ((type as any) === 'tool-financialFieldsAgent' ||
                      (type as any) === 'tool-findIncomeStatementFields' ||
                      (type as any) === 'tool-findKeyMetricsFields' ||
                      (type as any) === 'tool-findFinancialRatioFields') {
                    completedAction = 'Analyzed financial fields';
                  } else if ((type as any) === 'tool-getIncomeStatement') {
                    const input = (part as any).input;
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      completedAction = `Fetched ${symbols.join(', ')} financials`;
                    } else {
                      completedAction = 'Fetched financial data';
                    }
                  } else if ((type as any) === 'tool-getKeyMetrics') {
                    const input = (part as any).input;
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      completedAction = `Fetched ${symbols.join(', ')} key metrics`;
                    } else {
                      completedAction = 'Fetched key metrics';
                    }
                  } else if ((type as any) === 'tool-getFinancialRatios') {
                    const input = (part as any).input;
                    const symbols = input?.symbols || (input?.symbol ? [input.symbol] : []);
                    if (symbols.length > 0) {
                      completedAction = `Fetched ${symbols.join(', ')} financial ratios`;
                    } else {
                      completedAction = 'Fetched financial ratios';
                    }
                  } else if ((type as any) === 'tool-getFinancialData') {
                    const input = (part as any).input;
                    const symbols = input?.symbols || [];
                    const dataType = input?.dataType || 'financial data';
                    if (symbols.length > 0) {
                      const typeLabel = dataType.replace('get', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
                      completedAction = `Fetched ${symbols.join(', ')} ${typeLabel}`;
                    } else {
                      completedAction = 'Fetched financial data';
                    }
                  }

                  if ('error' in output || (output && 'success' in output && !output.success)) {
                    const errorMessage = output?.message || 'Failed to retrieve data';
                    return (
                      <div key={toolCallId}>
                        <ToolStatus
                          name={toolName}
                          status="completed"
                          displayAction={completedAction}
                          displayResult={errorMessage}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <ToolStatus
                        name={toolName}
                        status="completed"
                        displayAction={completedAction}
                        displayResult={output?.displayResult || 'Success'}
                      />
                    </div>
                  );
                }
              }

              // Calculate Metric Tool
              if (type === 'tool-calculateMetric') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  const metricName = input?.metricName || input?.name || 'Financial Metric';
                  const symbols = input?.symbols || [];

                  return (
                    <div key={toolCallId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/50 text-sm not-prose">
                      <StockLoader size={12} />
                      <span className="text-foreground font-medium">
                        Computing {metricName}{symbols.length > 0 ? ` for ${symbols.join(', ')}` : ''}...
                      </span>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output, input } = part;

                  let metricDisplayName = 'Custom Metric';

                  if (output && typeof output === 'string') {
                    const chineseMatch = output.match(/\*\*([^*]+)\s*Calculation Results\*\*/);
                    if (chineseMatch && chineseMatch[1]) {
                      metricDisplayName = chineseMatch[1];
                    }
                  }

                  if (metricDisplayName === 'Custom Metric') {
                    metricDisplayName = input?.metricName || input?.name || 'Financial Metric';
                  }

                  const symbols = input?.symbols || [];

                  return (
                    <div key={toolCallId} className="not-prose">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/50 text-sm">
                        <div className="w-3 h-3 bg-brand-primary rounded-full"></div>
                        <span className="text-foreground font-medium">
                          {metricDisplayName} calculated{symbols.length > 0 ? ` for ${symbols.join(', ')}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                }
              }

              // Web Search Tool
              if (type === 'tool-webSearch') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId} className="border border-border/50 rounded-lg p-4 bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <StockLoader size={14} />
                        <span className="font-medium text-brand-primary">
                          Searching the web...
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Query:</strong> {input?.query}
                        {input?.searchAfterDate && (
                          <div><strong>After:</strong> {input.searchAfterDate}</div>
                        )}
                        {input?.searchBeforeDate && (
                          <div><strong>Before:</strong> {input.searchBeforeDate}</div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output, input } = part;

                  if (typeof output === 'string' && output.startsWith('Search failed:')) {
                    return (
                      <div key={toolCallId} className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-destructive">⚠️</div>
                          <span className="font-medium text-destructive">
                            Search Failed
                          </span>
                        </div>
                        <div className="text-sm text-destructive">
                          {output}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <SearchResultsCard
                      key={toolCallId}
                      toolCallId={toolCallId}
                      output={output}
                      input={input}
                    />
                  );
                }
              }
            })}

            {extractedMetadata && ((extractedMetadata as any).tickers || (extractedMetadata as any).suggestions) && (
              <div className="flex flex-col gap-3 mt-4">
                {extractedMetadata?.containsRealData && extractedMetadata?.verificationMessage && (
                  <div
                    onClick={() => setShowFullVerification(!showFullVerification)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/30 w-fit text-xs opacity-50 hover:opacity-70 transition-all duration-150 cursor-pointer select-none"
                    title="点击展开验证详情"
                  >
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium transition-all duration-150">
                      {showFullVerification ? extractedMetadata.verificationMessage : 'Verified'}
                    </span>
                  </div>
                )}

                {(extractedMetadata as any).tickers && (
                  <TickerButtonGroup
                    tickers={(extractedMetadata as any).tickers}
                    className="not-prose"
                  />
                )}

                {(extractedMetadata as any).suggestions && (
                  <SuggestionButtonGroup
                    suggestions={(extractedMetadata as any).suggestions}
                    onSuggestionClick={(suggestion) => {
                      const input = document.querySelector('textarea[data-testid="multimodal-input"]') as HTMLTextAreaElement;
                      if (input) {
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                        nativeInputValueSetter?.call(input, suggestion);

                        const inputEvent = new Event('input', { bubbles: true });
                        input.dispatchEvent(inputEvent);

                        input.focus();
                      }
                    }}
                    className="not-prose"
                  />
                )}
              </div>
            )}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                message={message}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isLatest !== nextProps.isLatest) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

    return false;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message min-h-96"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex gap-4 w-full">
        <div className="size-9 flex items-center rounded-full justify-center shrink-0 bg-brand-avatar border border-brand-primary/20">
          <Heart size={16} className="text-brand-primary fill-brand-primary/20" strokeWidth={2.5} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-4">
            <StockLoader size={16} />
            <span className="text-sm text-muted-foreground">Thinking...</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
