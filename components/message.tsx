'use client';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon, LoaderIcon } from './icons';
import { Shield } from 'lucide-react';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { DocumentMessage } from './document-message';
import { MessageReasoning } from './message-reasoning';
import { VisualizationMessage } from './visualization-message';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { ToolStatus } from './tool-status';
import { hasMetadata } from '@/lib/message-metadata';
import { TickerButtonGroup } from './ticker-button';
import { SuggestionButtonGroup } from './suggestion-button';
// Removed direct import - now using API route

// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [extractedMetadata, setExtractedMetadata] = useState<{ 
    tickers?: string[], 
    suggestions?: { text: string, containsRealData: boolean, verificationMessage?: string }[],
    containsRealData?: boolean,
    verificationMessage?: string
  } | null>(null);
  const [processedMessageId, setProcessedMessageId] = useState<string | null>(null);
  const [showFullVerification, setShowFullVerification] = useState(false);

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === 'file',
  );

  useDataStream();

  // Extract metadata when message is complete and it's an assistant message
  useEffect(() => {
    if (!isLoading && 
        message.role === 'assistant' && 
        message.id &&
        processedMessageId !== message.id) {
      
      setProcessedMessageId(message.id);
      
      // Check if message already has cached metadata
      if ((message as any).extractedMetadata) {
        console.log('📋 Using cached metadata from database for message', message.id, (message as any).extractedMetadata);
        setExtractedMetadata((message as any).extractedMetadata);
        return;
      } else {
        console.log('⚠️ No cached metadata found for message', message.id, 'extractedMetadata field:', typeof (message as any).extractedMetadata);
      }
      
      // Try both content.parts and direct parts structure
      let allText = '';
      
      if ((message as any).content?.parts) {
        allText = (message as any).content.parts
          ?.filter((part: any) => part.type === 'text')
          ?.map((part: any) => part.text)
          ?.join('') || '';
      } else if (message.parts) {
        allText = message.parts
          ?.filter((part: any) => part.type === 'text')
          ?.map((part: any) => part.text)
          ?.join('') || '';
      }
      
      if (allText.trim()) {
        // Extract metadata using complete message parts for data verification
        const messageParts = (message as any).content?.parts || message.parts || [];
        fetch('/api/metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messageParts: messageParts,
            userQuestion: undefined, // TODO: Add user question context from messages array
            messageId: message.id // Pass messageId to save metadata directly
          }),
        })
        .then(response => response.json())
        .then(result => {
          console.log('🎯 Metadata API response:', result);
          if (result.success && result.metadata) {
            console.log('📊 Setting metadata:', result.metadata);
            setExtractedMetadata(result.metadata);
          }
        })
        .catch(error => {
          console.error('Metadata API error:', error);
        });
      }
    }
  }, [isLoading, message.id, message.role, (message as any).content, message.parts, processedMessageId]);

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
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? 'file',
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
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
                  const parsedMessage = { content: sanitizeText(part.text), metadata: {} };
                  
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
                        <Markdown>{parsedMessage.content}</Markdown>
                        
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

              if (type === 'tool-getWeather') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  return (
                    <div key={toolCallId} className="skeleton">
                      <Weather />
                    </div>
                  );
                }

                if (state === 'output-available') {
                  const { output } = part;
                  return (
                    <div key={toolCallId}>
                      <Weather weatherAtLocation={output} />
                    </div>
                  );
                }
              }

              if (type === 'tool-createDocument') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId}>
                      <DocumentPreview isReadonly={isReadonly} args={input} />
                    </div>
                  );
                }

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

                  // Also show DocumentMessage for regular createDocument
                  if (output?.id) {
                    return (
                      <div key={toolCallId}>
                        <DocumentMessage
                          documentId={output.id}
                          title={output.title}
                          kind={output.kind}
                          preview={output.content}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <DocumentPreview
                        isReadonly={isReadonly}
                        result={output}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-updateDocument') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;

                  return (
                    <div key={toolCallId}>
                      <DocumentToolCall
                        type="update"
                        args={input}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }

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
                    <div key={toolCallId}>
                      <DocumentToolResult
                        type="update"
                        result={output}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-createVisualization' as any) {
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
                  
                  // Render the visualization directly in the message
                  console.log('Rendering VisualizationMessage with messageId:', message.id);
                  return (
                    <div key={toolCallId}>
                      <VisualizationMessage
                        id={output.id}
                        messageId={message.id} // Pass message ID for caching
                        title={output.title}
                        code={output.code || ''}
                        description={output.description}
                        cachedHtml={output.cachedHtml} // Pass cached HTML if available
                        cachedImage={output.cachedImage} // Pass cached image if available
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-requestSuggestions') {
                const { toolCallId, state } = part;

                if (state === 'input-available') {
                  const { input } = part;
                  return (
                    <div key={toolCallId}>
                      <DocumentToolCall
                        type="request-suggestions"
                        args={input}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }

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
                    <div key={toolCallId}>
                      <DocumentToolResult
                        type="request-suggestions"
                        result={output}
                        isReadonly={isReadonly}
                      />
                    </div>
                  );
                }
              }
              
              // Handle createDocumentWithData tool
              if (type === 'tool-createDocumentWithData' as any) {
                const { toolCallId, state } = part as any;
                
                if (state === 'output-available') {
                  const { output } = part as any;
                  
                  if (output?.id && output.success) {
                    return (
                      <div key={toolCallId}>
                        <DocumentMessage
                          documentId={output.id}
                          title={output.title}
                          kind={output.kind}
                          preview={output.content}
                        />
                      </div>
                    );
                  }
                  
                  // If document creation failed
                  if (output && !output.success) {
                    return (
                      <div key={toolCallId} className="text-red-500 p-2 border rounded">
                        Failed to create document: {output.message}
                      </div>
                    );
                  }
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
                        formattedData={output?.formattedData}
                      />
                    </div>
                  );
                }
              }
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
                chatId={chatId}
                message={message}
                vote={vote}
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
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

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
