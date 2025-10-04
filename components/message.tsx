'use client';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import { PencilEditIcon, SparklesIcon, LoaderIcon } from './icons';
import { Shield } from 'lucide-react';
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
// Removed direct import - now using API route

// Chart.js visualization engine for frontend execution
const JSVisualizationEngine = {
  generateChartJSHTML: (data: any[], chartConfig: any, vizId: string = 'default'): string => {
    // Use the chartConfig directly as it's already a Chart.js config
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

// Citation Card Component - handles metadata fetching
const CitationCard = ({ citation }: { citation: any }) => {
  const [imageError, setImageError] = useState(false);
  const [metadata, setMetadata] = useState<{title?: string, description?: string, loading?: boolean}>({ loading: true });
  
  // Parse citation data
  const url = typeof citation === 'string' ? citation : citation.url || citation.link;
  
  // Fetch real page title and description with caching
  useEffect(() => {
    const cacheKey = `metadata_${url}`;
    
    // Check localStorage cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
          setMetadata({
            title: cachedData.title,
            description: cachedData.description,
            loading: false
          });
          return;
        }
      } catch (e) {
        // Invalid cached data, continue to fetch
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
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          title: data.title,
          description: data.description,
          timestamp: Date.now()
        }));
        
      } catch (error) {
        console.warn('Failed to fetch metadata for', url);
        // Fallback to domain name
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          const fallbackResult = {
            title: domain,
            description: `Content from ${domain}`,
            loading: false
          };
          
          setMetadata(fallbackResult);
          
          // Cache fallback too
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
  
  // Generate preview image URL (using favicon as fallback)
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
      className="block p-2 bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 rounded text-xs hover:bg-white/30 dark:hover:bg-gray-700/30 transition-colors group"
    >
      <div className="flex gap-2">
        {/* Preview Image */}
        <div className="flex-shrink-0">
          {!imageError ? (
            <img
              src={getPreviewImage(url)}
              alt={displayTitle}
              className="w-6 h-6 rounded object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">🌐</span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate text-xs">
            {displayTitle}
          </div>
          {displayDescription && (
            <div className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 text-xs">
              {displayDescription}
            </div>
          )}
          <div className="text-gray-400 dark:text-gray-500 mt-1 truncate text-xs">
            {new URL(url).hostname}
          </div>
        </div>
        
        {/* External link indicator */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-gray-400 text-xs">↗</span>
        </div>
      </div>
    </a>
  );
};

// Compact Search Results Component - restored working version
const SearchResultsCard = ({ toolCallId, output, input }: { toolCallId: string; output: any; input: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse the output exactly as before
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
      className={cn(
        "relative rounded-lg overflow-hidden max-w-xl", // Made smaller
        "bg-white/30 dark:bg-gray-900/30", // More transparent
        "backdrop-blur-md border border-white/20 dark:border-gray-700/20",
        "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]",
        "transition-all duration-200"
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-blue-500/3 pointer-events-none" />
      
      {/* Compact Header - Clickable */}
      <div 
        className="relative px-3 py-2 cursor-pointer hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400">🌐</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
              Web Search
            </h3>
            {input?.query && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                &ldquo;{input.query.substring(0, 30)}...&rdquo;
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {citations.length > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {citations.length} sources
              </span>
            )}
            <div className={cn(
              "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}>↓</div>
          </div>
        </div>
      </div>
      
      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-gray-200/40 dark:border-gray-700/40"
          >
            {/* Compact content */}
            {content && (
              <div className="px-3 py-2">
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-3 h-3 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0">✨</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                      Key Insights
                    </h4>
                    <div className="prose prose-xs dark:prose-invert max-w-none text-xs">
                      <Markdown>{content}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Compact Citations */}
            {citations.length > 0 && (
              <div className="px-3 pb-3 border-t border-gray-200/20 dark:border-gray-700/20">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 mt-2">
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

// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

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

  // 从两个地方收集附件：新的attachments字段和旧的parts中的file类型
  const attachmentsFromParts = message.parts?.filter(
    (part: any) => part.type === 'file',
  ) || [];

  // 从数据库的attachments字段获取附件
  const attachmentsFromDB = (message as any).attachments || [];

  // 合并两种类型的附件
  const allAttachments = [
    // 将parts中的file转换为Attachment格式
    ...attachmentsFromParts.map((part: any) => ({
      name: part.filename ?? 'file',
      contentType: part.mediaType,
      url: part.url,
    })),
    // 直接使用数据库中的attachments
    ...attachmentsFromDB
  ];

  // 🎯 SIMPLIFIED: Only extract suggestions for the latest assistant message
  useEffect(() => {
    // Only process if this is the latest assistant message that just finished streaming
    if (!isLoading && 
        message.role === 'assistant' && 
        message.id &&
        isLatest &&
        !suggestionsGenerated) {
      
      setSuggestionsGenerated(true);
      
      // Simple approach: always generate fresh suggestions, no caching
      const allText = message.parts
        ?.filter((part: any) => part.type === 'text')
        ?.map((part: any) => part.text)
        ?.join('') || '';
      
      if (allText.trim().length > 50) { // Only if there's meaningful content
        
        // Simple metadata API call - no complex ID validation
        // Handle BigInt serialization in message parts
        const serializableParts = JSON.parse(JSON.stringify(message.parts, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
        
        fetch('/api/simple-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messageText: allText.substring(0, 2000), // Limit text length
            messageParts: serializableParts,
          }),
        })
        .then(response => response.json())
        .then(result => {
          if (result.success && result.suggestions) {
            setExtractedMetadata({
              suggestions: result.suggestions,
              tickers: result.tickers,
              containsRealData: result.containsRealData,
              verificationMessage: result.verificationMessage
            });
          }
        })
        .catch(error => {
          console.warn('Suggestion API error:', error);
        });
      }
    }
  }, [isLoading, message.id, message.role, message.parts, suggestionsGenerated]);

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
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
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
                  onRemove={() => {}} // 消息中的附件不允许删除
                  isUploading={false}
                  showRemoveButton={false} // 消息中不显示删除按钮
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
                  // No metadata parsing - show clean text content
                  const parsedMessage = { content: sanitizeText(part.text), metadata: {} as MessageMetadata };
                  
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
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
                          'user-message-gunmetal': message.role === 'user',
                        })}
                      >
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{parsedMessage.content}</div>
                        ) : (
                          <Markdown>{parsedMessage.content}</Markdown>
                        )}
                        
                        {/* Render metadata components if available */}
                        {hasMetadata(parsedMessage.metadata) && (
                          <div className="flex flex-col gap-3 mt-2">
                            {/* Ticker buttons */}
                            {parsedMessage.metadata.tickers && (
                              <TickerButtonGroup 
                                tickers={parsedMessage.metadata.tickers}
                                className="not-prose"
                              />
                            )}
                            
                            {/* Suggestion buttons */}
                            {parsedMessage.metadata.suggestions && (
                              <SuggestionButtonGroup 
                                suggestions={parsedMessage.metadata.suggestions}
                                onSuggestionClick={(suggestion) => {
                                  // Find the textarea input element by multiple possible selectors
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
                                    // Set the value and trigger React's change event
                                    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                    nativeTextAreaValueSetter?.call(input, suggestion);
                                    
                                    // Trigger input and change events for React
                                    const inputEvent = new Event('input', { bubbles: true });
                                    input.dispatchEvent(inputEvent);
                                    
                                    const changeEvent = new Event('change', { bubbles: true });
                                    input.dispatchEvent(changeEvent);
                                    
                                    // Focus the input
                                    input.focus();
                                    
                                    // Move cursor to end
                                    input.selectionStart = input.selectionEnd = suggestion.length;
                                  } else {
                                    console.warn('Could not find textarea input element');
                                  }
                                }}
                                className="not-prose"
                              />
                            )}
                            
                            {/* Data verification badge */}
                            {message.role === 'assistant' && extractedMetadata?.containsRealData && extractedMetadata?.verificationMessage && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/30 w-fit text-xs">
                                <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span className="text-green-700 dark:text-green-300 font-medium">
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

              // Support only createJSVisualization tool (Python visualization removed)
              if (type === 'tool-createJSVisualization' as any) {
                const { toolCallId, state } = part as any;

                if (state === 'input-available') {
                  const { input } = part as any;
                  return (
                    <div key={toolCallId} className="skeleton">
                      <div className="flex items-center gap-2 p-2 text-sm">
                        <div className="animate-spin size-fit">
                          <LoaderIcon />
                        </div>
                        <span>Creating visualization: {input?.title}</span>
                      </div>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part as any;

                  if ('error' in output) {
                    return (
                      <div key={toolCallId} className="text-red-500 p-2 border rounded">
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  // Generate stable key for each visualization instance
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
                        key={uniqueKey} // Force unique component instance
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

              // Handle direct visualization parts from simple-chat-new
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

              // Handle direct web_search parts from simple-chat-new
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

              // Handle direct tool_status parts from simple-chat-new
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

              if (type === 'tool-requestSuggestions') {
                const { toolCallId, state } = part;

                if (state === 'output-available') {
                  const { output } = part;

                  if ('error' in output) {
                    return (
                      <div
                        key={toolCallId}
                        className="text-red-500 p-2 border rounded"
                      >
                        Error: {String(output.error)}
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId} className="text-sm text-gray-600">
                      Suggestions generated successfully
                    </div>
                  );
                }
              }
              
              // Handle calculate LaTeX metric tool
              if (type === 'tool-calculateLatexMetric') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  const metricName = input?.metricId || 'LaTeX Metric';
                  
                  return (
                    <div key={toolCallId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50/40 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-700/50 text-sm not-prose">
                      <div className="animate-spin text-purple-600 dark:text-purple-400">
                        <LoaderIcon size={14} />
                      </div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Computing LaTeX metric {metricName}...
                      </span>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { input } = part;
                  
                  // Extract metric name from input
                  const metricName = input?.metricId || 'LaTeX Metric';
                  const description = input?.dataRequirements?.description || '';
                  
                  return (
                    <div key={toolCallId} className="not-prose">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50/40 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-700/50 text-sm">
                        <div className="w-3 h-3 bg-purple-500/70 rounded-full"></div>
                        <span className="text-purple-700 dark:text-purple-300 font-medium">
                          LaTeX metric {metricName} calculated
                        </span>
                        {description && (
                          <span className="text-purple-600/70 dark:text-purple-400/70 text-xs">
                            • {description.slice(0, 50)}{description.length > 50 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              }
              
              // Handle financial tools
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
                  
                  // Generate displayAction based on tool and input
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
                      // Better formatting for data type labels
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
                  
                  // Generate past tense displayAction for completed state
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
                      // Better formatting for data type labels
                      const typeLabel = dataType.replace('get', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
                      completedAction = `Fetched ${symbols.join(', ')} ${typeLabel}`;
                    } else {
                      completedAction = 'Fetched financial data';
                    }
                  }
                  
                  // Check for errors or failure
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
                  
                  // Success case
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
              
              // Handle calculate metric tool
              if (type === 'tool-calculateMetric') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  const metricName = input?.metricName || input?.name || 'Financial Metric';
                  const symbols = input?.symbols || [];
                  
                  return (
                    <div key={toolCallId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/50 dark:border-gray-700/50 text-sm not-prose">
                      <div className="animate-spin text-gray-600 dark:text-gray-400">
                        <LoaderIcon size={14} />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Computing {metricName}{symbols.length > 0 ? ` for ${symbols.join(', ')}` : ''}...
                      </span>
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output, input } = part;
                  
                  // Try to extract metric name from the output string
                  let metricDisplayName = 'Custom Metric';
                  
                  if (output && typeof output === 'string') {
                    // Look for Chinese metric name in the output
                    const chineseMatch = output.match(/\*\*([^*]+)\s*Calculation Results\*\*/);
                    if (chineseMatch && chineseMatch[1]) {
                      metricDisplayName = chineseMatch[1];
                    }
                  }
                  
                  // Fallback to input parameters - but not the ID
                  if (metricDisplayName === 'Custom Metric') {
                    metricDisplayName = input?.metricName || input?.name || 'Financial Metric';
                  }
                  
                  const symbols = input?.symbols || [];
                  
                  // Simple success display without expansion
                  return (
                    <div key={toolCallId} className="not-prose">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/50 dark:border-gray-700/50 text-sm">
                        <div className="w-3 h-3 bg-green-500/70 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {metricDisplayName} calculated{symbols.length > 0 ? ` for ${symbols.join(', ')}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                }
              }

              // Handle web search tool
              if (type === 'tool-webSearch') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId} className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="animate-spin">
                          <LoaderIcon size={16} />
                        </div>
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          Searching the web...
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
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
                      <div key={toolCallId} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-red-600">⚠️</div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            Search Failed
                          </span>
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400">
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

              // saveCustomMetric is now handled as a regular server-side tool
            })}

            {/* Render extracted metadata at the end */}
            {extractedMetadata && ((extractedMetadata as any).tickers || (extractedMetadata as any).suggestions) && (
              <div className="flex flex-col gap-3 mt-4">
                {/* Data verification badge */}
                {extractedMetadata?.containsRealData && extractedMetadata?.verificationMessage && (
                  <div 
                    onClick={() => setShowFullVerification(!showFullVerification)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 w-fit text-xs opacity-50 hover:opacity-70 transition-all duration-200 cursor-pointer select-none"
                    title="点击展开验证详情"
                  >
                    <Shield className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 font-medium transition-all duration-200">
                      {showFullVerification ? extractedMetadata.verificationMessage : 'Verified'}
                    </span>
                  </div>
                )}

                {/* Ticker buttons */}
                {(extractedMetadata as any).tickers && (
                  <TickerButtonGroup 
                    tickers={(extractedMetadata as any).tickers}
                    className="not-prose"
                  />
                )}
                
                {/* Suggestion buttons */}
                {(extractedMetadata as any).suggestions && (
                  <SuggestionButtonGroup 
                    suggestions={(extractedMetadata as any).suggestions}
                    onSuggestionClick={(suggestion) => {
                      const input = document.querySelector('textarea[data-testid="multimodal-input"]') as HTMLTextAreaElement;
                      if (input) {
                        // React hack: 直接更新React的内部值
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                        nativeInputValueSetter?.call(input, suggestion);
                        
                        // 触发input事件让React知道变化
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
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
