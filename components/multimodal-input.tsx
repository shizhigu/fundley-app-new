'use client';

import type { UIMessage } from '@/lib/ai-sdk-types';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { useTranslations } from 'next-intl';

import { ArrowUpIcon, StopIcon } from './icons';
import { EnhancedAttachmentPreview } from './enhanced-attachment-preview';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { VoiceRecorder } from './voice-recorder';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  Paperclip,
  Sparkles,
  Send,
  Command,
  Loader2,
  Link2,
  X,
} from 'lucide-react';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { AuthSession } from '@/lib/auth/clerk';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { StockLoader } from './stock-loader';

type VisibilityType = 'private' | 'public';

// ============================================================================
// Ultra-Premium 2025 Design - Streaming Timer Component
// ============================================================================
const StreamingTimer = memo(() => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative px-4 py-2 rounded-xl w-fit mx-auto bg-card border border-border"
    >
      <div className="flex items-center gap-3">
        {/* Stock K-line animation */}
        {/* <StockLoader size={12} /> */}

        {/* Timer display */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-mono text-muted-foreground tabular-nums tracking-wider"
        >
          {formatTime(elapsedTime)}
        </motion.div>
      </div>
    </motion.div>
  );
});

StreamingTimer.displayName = 'StreamingTimer';

// ============================================================================
// Ultra-Premium 2025 Design - Main Input Component
// ============================================================================
function PureMultimodalInput({
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  user,
  isAtBottom,
  scrollToBottom,
  chatId,
}: {
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  className?: string;
  selectedVisibilityType: VisibilityType;
  user: AuthSession['user'];
  isAtBottom?: boolean;
  scrollToBottom?: () => void;
  chatId?: string;
}) {
  // ========================================================================
  // State Management
  // ========================================================================
  const t = useTranslations('chat');
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [referencedFile, setReferencedFile] = useState<{
    name: string;
    path: string;
    size: number;
    extension: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );
  const latestInputRef = useRef('');
  const draftPersistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DRAFT_PERSIST_DELAY = 400;

  const scheduleDraftPersist = useCallback(
    (value: string) => {
      if (draftPersistTimeout.current) {
        clearTimeout(draftPersistTimeout.current);
      }
      draftPersistTimeout.current = setTimeout(() => {
        setLocalStorageInput(value);
        draftPersistTimeout.current = null;
      }, DRAFT_PERSIST_DELAY);
    },
    [setLocalStorageInput],
  );

  // ========================================================================
  // Listen for file reference events from workspace
  // ========================================================================
  useEffect(() => {
    const handleFileReferenced = (event: CustomEvent) => {
      setReferencedFile(event.detail);
      // Clear localStorage after reading
      localStorage.removeItem('chat-referenced-file');
    };

    window.addEventListener('file-referenced', handleFileReferenced as EventListener);

    return () => {
      window.removeEventListener('file-referenced', handleFileReferenced as EventListener);
    };
  }, []);

  // ========================================================================
  // Detect OS for keyboard shortcut hint
  // ========================================================================
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // ========================================================================
  // AI Autocomplete State
  // ========================================================================
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // ========================================================================
  // AI Autocomplete - Fetch Recommendations
  // ========================================================================
  const fetchRecommendations = useCallback(
    async (text: string) => {
      // Only fetch for inputs between 2-100 characters
      if (text.length < 2 || text.length > 100) {
        setShowAiSuggestions(false);
        return;
      }

      console.log('🔍 Fetching recommendations for:', text);
      setIsLoadingSuggestions(true);
      setAiSuggestions([]); // Clear old suggestions when starting new fetch
      try {
        // Call our Next.js API route (which will call AgentOS with session_state)
        const response = await fetch('/api/recommendation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            chatId: chatId,
            // TODO: Add sessionState from useChat hook
            sessionState: {},
          }),
        });

        if (!response.ok) {
          console.error('Failed to fetch recommendations:', response.status);
          setShowAiSuggestions(false);
          return;
        }

        const data = await response.json();
        console.log('🤖 Autocomplete response:', data);

        // Agent returns JSON object: { recommendations: ["prompt1", "prompt2", ...] }
        let suggestions: string[] = [];

        if (typeof data.content === 'string') {
          try {
            const parsed = JSON.parse(data.content);
            suggestions = parsed.recommendations || [];
          } catch (e) {
            console.error('Failed to parse content as JSON:', e);
          }
        } else if (
          data.content?.recommendations &&
          Array.isArray(data.content.recommendations)
        ) {
          suggestions = data.content.recommendations;
        }

        console.log('📋 Parsed suggestions:', suggestions);

        if (suggestions.length > 0) {
          setAiSuggestions(suggestions);
          // Auto-focus textarea and show suggestions
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
            setShowAiSuggestions(true);
          });
        } else {
          toast.error('No suggestions available');
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        toast.error('Failed to get suggestions');
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [chatId],
  );

  // ========================================================================
  // AI Autocomplete - Manual Trigger
  // ========================================================================
  const handleManualSuggestions = useCallback(() => {
    const text = input.trim();
    console.log('✨ Manual AI suggestions triggered:', {
      text,
      length: text.length,
    });

    // Validate input length
    if (text.length === 0) {
      toast.error('Please enter some text first');
      return;
    }
    if (text.length > 100) {
      toast.error('Please enter less than 100 characters');
      return;
    }

    fetchRecommendations(text);
  }, [input, fetchRecommendations]);

  // ========================================================================
  // Voice & Template Handling
  // ========================================================================
  const handleVoiceTranscript = useCallback(
    (transcript: string, metadata?: any) => {
      setInput(transcript);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight(textareaRef.current);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const handleTemplatePrefill = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const prompt = customEvent.detail;
      setInput(prompt);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight(textareaRef.current);
        }
      });
    };

    window.addEventListener('template-prefill', handleTemplatePrefill);
    return () =>
      window.removeEventListener('template-prefill', handleTemplatePrefill);
  }, []);

  // ========================================================================
  // Textarea Auto-Resize
  // ========================================================================
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    const maxHeight = 200;
    const newHeight = Math.min(textarea.scrollHeight + 2, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '100px';
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustTextareaHeight(textareaRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    latestInputRef.current = input;
    scheduleDraftPersist(input);
  }, [input, scheduleDraftPersist]);

  useEffect(() => {
    return () => {
      if (draftPersistTimeout.current) {
        clearTimeout(draftPersistTimeout.current);
      }
      setLocalStorageInput(latestInputRef.current);
    };
  }, [setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustTextareaHeight(event.target);
  };

  // ========================================================================
  // Form Submission
  // ========================================================================
  const submitForm = useCallback(() => {
    if (status !== 'ready' || !input.trim()) {
      return;
    }

    // 如果有引用文件,在message前面添加文件路径信息
    let messageToSend = input;
    if (referencedFile) {
      // Add /data/workspace prefix if path doesn't start with it
      const fullPath = referencedFile.path.startsWith('/data/workspace')
        ? referencedFile.path
        : `/data/workspace${referencedFile.path.startsWith('/') ? '' : '/'}${referencedFile.path}`;
      const filePrefix = `[Referenced File: ${fullPath}]\n\n`;
      messageToSend = filePrefix + input;
    }

    sendMessage(messageToSend, attachments.length > 0 ? attachments : undefined);

    setAttachments([]);
    setLocalStorageInput('');
    setReferencedFile(null); // Clear referenced file after sending
    resetTextareaHeight();
    setInput('');

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    status,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    referencedFile,
  ]);

  // ========================================================================
  // File Upload Handling
  // ========================================================================
  const addFileToAttachments = (file: File) => {
    return {
      file: file,
      name: file.name,
      contentType: file.type,
      size: file.size,
    };
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const newAttachments = files.map(addFileToAttachments);

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...newAttachments,
      ]);
      toast.success(`Added ${files.length} file(s)`);
    },
    [setAttachments],
  );

  // ========================================================================
  // Drag & Drop Handling
  // ========================================================================
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);

      const supportedFiles = files.filter((file) => {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        const isText = file.type === 'text/plain';
        const isDoc =
          file.type.includes('document') || file.type.includes('word');
        const isCSV = file.type === 'text/csv';
        const isJSON = file.type === 'application/json';
        return isImage || isPDF || isText || isDoc || isCSV || isJSON;
      });

      if (supportedFiles.length === 0) {
        toast.error(
          'No supported files found. Please upload images, PDFs, text, or documents.',
        );
        return;
      }

      if (supportedFiles.length < files.length) {
        toast.error(
          `${files.length - supportedFiles.length} unsupported file(s) skipped`,
        );
      }

      const newAttachments = supportedFiles.map(addFileToAttachments);
      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...newAttachments,
      ]);

      toast.success(`Added ${supportedFiles.length} file(s)`);
    },
    [setAttachments],
  );

  // ========================================================================
  // Paste Image Handling
  // ========================================================================
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const newAttachments = imageFiles.map(addFileToAttachments);
        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...newAttachments,
        ]);
        toast.success(`Pasted ${imageFiles.length} image(s)`);
      }
    },
    [setAttachments],
  );

  // ========================================================================
  // Auto Scroll on Submit
  // ========================================================================
  useEffect(() => {
    if (status === 'submitted' && scrollToBottom) {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  // ========================================================================
  // Ultra-Premium 2025 UI Rendering
  // ========================================================================
  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4">
      {/* ==================== Streaming Timer ==================== */}
      {/* Removed: Timer now shown in DisplayMessageBox component */}
      {/* <AnimatePresence>
        {status === 'streaming' && <StreamingTimer />}
      </AnimatePresence> */}

      {/* ==================== Scroll to Bottom Button ==================== */}
      <AnimatePresence>
        {scrollToBottom && isAtBottom === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-32 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full shadow-lg"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== Hidden File Input ==================== */}
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        accept="image/*,application/pdf,.txt,.doc,.docx,.csv,application/json"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* ==================== Referenced File Preview ==================== */}
      {referencedFile && (
        <div className="mx-3 mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                {referencedFile.name}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                {referencedFile.path.startsWith('/data/workspace')
                  ? referencedFile.path
                  : `/data/workspace${referencedFile.path.startsWith('/') ? '' : '/'}${referencedFile.path}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReferencedFile(null)}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
            >
              <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== Attachment Preview ==================== */}
      {attachments.length > 0 && (
        <EnhancedAttachmentPreview
          data-testid="attachments-preview"
          attachments={attachments}
          onRemove={(index) => {
            const newAttachments = [...attachments];
            newAttachments.splice(index, 1);
            setAttachments(newAttachments);
          }}
          isUploading={status === 'streaming'}
          className="mb-2"
        />
      )}

      {/* ==================== AI Autocomplete Dropdown ==================== */}
      <AnimatePresence>
        {showAiSuggestions && aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden mb-2"
          >
            {/* Header */}
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {isLoadingSuggestions
                    ? 'Loading suggestions...'
                    : 'AI Suggestions'}
                </span>
              </div>
            </div>

            {/* Suggestions List */}
            <div className="max-h-[300px] overflow-y-auto">
              {isLoadingSuggestions && aiSuggestions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading suggestions...</span>
                  </div>
                </div>
              ) : (
                aiSuggestions.map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      setShowAiSuggestions(false);
                      // Focus and adjust textarea
                      requestAnimationFrame(() => {
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                          adjustTextareaHeight(textareaRef.current);
                        }
                      });
                    }}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors duration-150',
                      'hover:bg-muted/50 border-b border-border last:border-b-0',
                      'focus:outline-none focus:bg-muted/70',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                      <span className="text-sm text-foreground">{prompt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== Main Input Container ==================== */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative"
      >
        {/* Drag Overlay - Clean Design */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 rounded-xl bg-brand-primary/5 border-2 border-dashed border-brand-primary/50 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center px-6 py-4">
                <div className="text-brand-primary text-base font-medium mb-1">
                  Drop files here
                </div>
                <div className="text-muted-foreground text-sm">
                  Images, PDFs, documents supported
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ultra-Premium Textarea - Stripe/Linear Style */}
        <Textarea
          data-testid="multimodal-input"
          data-tour="chat-input"
          ref={textareaRef}
          placeholder={t('placeholder')}
          value={input}
          onChange={handleInput}
          onPaste={handlePaste}
          onFocus={() => {
            setIsInputFocused(true);
            // Show suggestions if we have them
            if (aiSuggestions.length > 0) {
              setShowAiSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
              setIsInputFocused(false);
              setShowAiSuggestions(false);
            }, 200);
          }}
          className={cn(
            // Core styling - clean and minimal
            'min-h-[100px] max-h-[200px] overflow-y-auto resize-none',
            'rounded-xl bg-card text-base leading-relaxed',
            // Hide scrollbar but keep scroll functionality
            'scrollbar-hide',
            // Professional spacing
            'px-4 py-3 pb-12 pr-20',
            // Subtle border - NO yellow, NO pink!
            'border border-border',
            'focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20',
            // Smooth transitions
            'transition-colors duration-200',
            // Professional placeholder
            'placeholder:text-muted-foreground',
            className,
          )}
          rows={2}
          autoFocus
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();

              if (status !== 'ready') {
                toast.error(
                  'Please wait for the model to finish its response!',
                );
              } else {
                submitForm();
              }
            }
          }}
        />

        {/* ==================== Bottom Left Actions ==================== */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <AttachmentsButton fileInputRef={fileInputRef} status={status} />
          <VoiceRecorder onTranscript={handleVoiceTranscript} />
          <CommandPaletteButton />
          <AISuggestionsButton
            onTrigger={handleManualSuggestions}
            isLoading={isLoadingSuggestions}
            status={status}
          />
          <SuggestionsButton messages={messages} />
        </div>

        {/* ==================== Bottom Right Actions ==================== */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {status === 'submitted' ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <SendButton input={input} submitForm={submitForm} />
          )}
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.isAtBottom !== nextProps.isAtBottom) return false;

    return true;
  },
);

// ============================================================================
// Ultra-Premium 2025 Design - Action Buttons
// ============================================================================

// ==================== Attachments Button ====================
function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  const t = useTranslations('chat');
  return (
    <button
      data-testid="attachments-button"
      className={cn(
        // Clean button styling
        'h-10 px-3 rounded-lg',
        'bg-card border border-border',
        'flex items-center justify-center gap-2',
        // Subtle hover effect
        'hover:bg-muted transition-colors duration-200',
        // Text styling - clean and minimal
        'text-sm text-foreground',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      type="button"
      disabled={status !== 'ready'}
    >
      <Paperclip className="w-4 h-4" />
      {/* <span className="hidden sm:inline">{t('attachFile')}</span> */}
    </button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

// ==================== AI Suggestions Button ====================
function PureAISuggestionsButton({
  onTrigger,
  isLoading,
  status,
}: {
  onTrigger: () => void;
  isLoading: boolean;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  return (
    <button
      data-testid="ai-suggestions-button"
      className={cn(
        // Brand color styling - lighter than Send button
        'h-10 px-3 rounded-lg',
        'bg-brand-primary/10 border border-brand-primary/30',
        'flex items-center justify-center gap-2',
        // Brand color hover effect
        'hover:bg-brand-primary/15 transition-colors duration-200',
        // Text styling - brand color
        'text-sm text-brand-primary font-medium',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      onClick={(event) => {
        event.preventDefault();
        onTrigger();
      }}
      type="button"
      disabled={status !== 'ready' || isLoading}
      title="Get AI suggestions for your query"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Ask Better</span>
    </button>
  );
}

const AISuggestionsButton = memo(PureAISuggestionsButton);

// ==================== Stop Button ====================
function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
}) {
  const t = useTranslations('chat');
  return (
    <button
      data-testid="stop-button"
      className={cn(
        // Clean stop button
        'h-10 px-4 rounded-lg',
        'bg-destructive/10 border border-destructive/30',
        'flex items-center justify-center gap-2',
        // Hover effect
        'hover:bg-destructive/20 transition-colors duration-200',
        // Text styling
        'text-sm font-medium text-destructive',
      )}
      onClick={(event) => {
        event.preventDefault();
        stop();
      }}
      type="button"
    >
      <StopIcon size={16} />
      <span>{t('stopRecording')}</span>
    </button>
  );
}

const StopButton = memo(PureStopButton);

// ==================== Send Button - ONLY BRAND COLOR ELEMENT ====================
function PureSendButton({
  submitForm,
  input,
}: {
  submitForm: () => void;
  input: string;
}) {
  const t = useTranslations('common');
  return (
    <button
      data-testid="send-button"
      className={cn(
        // Premium brand button - THE ONLY BRAND COLOR ELEMENT
        'h-10 px-4 rounded-lg',
        'bg-brand-primary',
        'flex items-center justify-center gap-2',
        // Clean hover effect
        'hover:opacity-90 transition-opacity duration-200',
        // Text styling
        'text-sm font-medium text-white',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={(input?.length || 0) === 0}
      type="button"
    >
      <Send className="w-4 h-4" />
      <span>{t('send')}</span>
    </button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

// ============================================================================
// Ultra-Premium 2025 Design - Suggestions Button
// ============================================================================
function PureSuggestionsButton({
  messages,
}: {
  messages: Array<UIMessage>;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; prompt: string }>
  >([]);

  // Extract suggestions from the latest assistant message
  useEffect(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (!latestAssistantMessage?.parts) {
      setSuggestions([]);
      return;
    }

    const allText =
      latestAssistantMessage.parts
        ?.filter((part: any) => part.type === 'text')
        ?.map((part: any) => part.text)
        ?.join('') || '';

    if (!allText.trim() || !allText.includes('</suggestions>')) {
      setSuggestions([]);
      return;
    }

    try {
      const regex = /<suggestions>([\s\S]*?)<\/suggestions>/;
      const match = allText.match(regex);

      if (!match || !match[1]) {
        setSuggestions([]);
        return;
      }

      const jsonStr = match[1].trim();
      const parsedSuggestions = JSON.parse(jsonStr);

      if (Array.isArray(parsedSuggestions)) {
        const validSuggestions = parsedSuggestions.filter(
          (s) => s && typeof s === 'object' && s.label && s.prompt,
        );
        setSuggestions(validSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      setSuggestions([]);
    }
  }, [messages]);

  const handleSuggestionClick = (prompt: string) => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent('template-prefill', { detail: prompt }),
    );
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            // Clean button styling
            'h-10 px-3 rounded-lg relative',
            'bg-card border border-border',
            'flex items-center justify-center gap-2',
            // Hover effect
            'hover:bg-muted transition-colors duration-200',
            // Text styling
            'text-sm text-foreground',
            // Active state with brand color
            open && 'border-brand-primary/50 bg-brand-primary/5',
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Suggestions</span>
          {/* Clean badge */}
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-fit max-w-md p-2 bg-card border border-border rounded-lg shadow-xl"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
            Suggestions
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              className={cn(
                // Clean suggestion button
                'w-full px-3 py-2 text-sm rounded-lg text-left',
                'bg-transparent border border-transparent',
                'hover:bg-muted hover:border-border transition-colors duration-200',
              )}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
                <span className="font-medium text-foreground">
                  {suggestion.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SuggestionsButton = memo(
  PureSuggestionsButton,
  (prevProps, nextProps) => {
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    const prevLatest = prevProps.messages[prevProps.messages.length - 1];
    const nextLatest = nextProps.messages[nextProps.messages.length - 1];
    if (prevLatest?.id !== nextLatest?.id) return false;
    return true;
  },
);

// ============================================================================
// Command Palette Button
// ============================================================================
function CommandPaletteButton() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔘 Command palette button clicked');
    window.dispatchEvent(new Event('open-command-palette'));
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          // Clean button styling
          'h-10 w-10 rounded-lg',
          'bg-card border border-border',
          'flex items-center justify-center',
          // Hover effect
          'hover:bg-muted transition-colors duration-200',
          // Text styling
          'text-muted-foreground hover:text-foreground',
        )}
      >
        <Command className="w-4 h-4" />
      </button>

      {/* Premium Tooltip - appears on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
          <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}
