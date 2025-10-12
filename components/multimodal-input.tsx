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

import { ArrowUpIcon, StopIcon } from './icons';
import { EnhancedAttachmentPreview } from './enhanced-attachment-preview';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Paperclip, Sparkles } from 'lucide-react';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { AuthSession } from '@/lib/auth/clerk';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type VisibilityType = 'private' | 'public';

// Streaming Timer Component
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
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="
        relative px-3 py-2 rounded-xl w-fit mx-auto
        bg-white/[0.05] dark:bg-white/[0.08]
        backdrop-blur-lg backdrop-saturate-150
        border border-white/[0.12] dark:border-white/[0.16]
        shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)]
      "
    >
      <div className="flex items-center gap-3">
        {/* Compact pulse animation */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-blue-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          ))}
        </div>

        {/* Timer display */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-mono text-muted-foreground/70 tabular-nums"
        >
          {formatTime(elapsedTime)}
        </motion.div>
      </div>
    </motion.div>
  );
});

StreamingTimer.displayName = 'StreamingTimer';

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
}) {
  // 内部input状态管理
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowSize();

  // Listen for template prefill event
  useEffect(() => {
    const handleTemplatePrefill = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const prompt = customEvent.detail;
      setInput(prompt);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const textarea = textareaRef.current;
          textarea.style.height = 'auto';
          const newHeight = Math.min(textarea.scrollHeight + 2, 200);
          textarea.style.height = `${newHeight}px`;
        }
      });
    };

    window.addEventListener('template-prefill', handleTemplatePrefill);
    return () => window.removeEventListener('template-prefill', handleTemplatePrefill);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 200; // 与CSS max-h-[200px] 保持一致
      const newHeight = Math.min(textareaRef.current.scrollHeight + 2, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '100px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitForm = useCallback(() => {
    // 防止重复提交 - 如果状态不是 ready，直接返回
    if (status !== 'ready' || !input.trim()) {
      return;
    }

    // Call sendMessage with AgentOS format: (content, attachments)
    sendMessage(input, attachments.length > 0 ? attachments : undefined);

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();
    setInput('');

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    status,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
  ]);

  // 直接将File对象添加到attachments，不上传到blob
  const addFileToAttachments = (file: File) => {
    return {
      file: file, // 保存原始File对象
      name: file.name,
      contentType: file.type,
      size: file.size,
    };
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // 直接添加File对象到attachments，无需上传
      const newAttachments = files.map(addFileToAttachments);

      setAttachments((currentAttachments) => {
        const updated = [...currentAttachments, ...newAttachments];
        return updated;
      });

      toast.success(`Added ${files.length} file(s)`);
    },
    [setAttachments],
  );

  // 拖拽上传处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当离开整个drop zone时才取消dragging状态
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

      // 过滤支持的文件类型
      const supportedFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        const isText = file.type === 'text/plain';
        const isDoc = file.type.includes('document') || file.type.includes('word');
        const isCSV = file.type === 'text/csv';
        const isJSON = file.type === 'application/json';
        return isImage || isPDF || isText || isDoc || isCSV || isJSON;
      });

      if (supportedFiles.length === 0) {
        toast.error('No supported files found. Please upload images, PDFs, text, or documents.');
        return;
      }

      if (supportedFiles.length < files.length) {
        toast.error(`${files.length - supportedFiles.length} unsupported file(s) skipped`);
      }

      // 添加文件到attachments
      const newAttachments = supportedFiles.map(addFileToAttachments);

      setAttachments((currentAttachments) => {
        const updated = [...currentAttachments, ...newAttachments];
        return updated;
      });

      toast.success(`Added ${supportedFiles.length} file(s)`);
    },
    [setAttachments],
  );

  useEffect(() => {
    if (status === 'submitted' && scrollToBottom) {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  // 粘贴图片处理
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];

      // 遍历剪贴板项目，查找图片
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 检查是否是图片类型
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      // 如果找到图片，添加到附件
      if (imageFiles.length > 0) {
        e.preventDefault(); // 阻止默认粘贴行为

        const newAttachments = imageFiles.map(addFileToAttachments);

        setAttachments((currentAttachments) => {
          const updated = [...currentAttachments, ...newAttachments];
          return updated;
        });

        toast.success(`Pasted ${imageFiles.length} image(s)`);
      }
    },
    [setAttachments],
  );


  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4 bg-transparent">
      {/* Modern Loading Indicator with Timer */}
      <AnimatePresence>
        {status === 'streaming' && (
          <StreamingTimer />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {scrollToBottom && isAtBottom === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-28 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>


      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        accept="image/*,application/pdf,.txt,.doc,.docx,.csv,application/json"
        onChange={handleFileChange}
        tabIndex={-1}
      />

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
          className="mb-4"
        />
      )}

      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative"
      >
        {/* 拖拽覆盖层 */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 rounded-2xl bg-primary/10 dark:bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <div className="text-primary text-lg font-semibold mb-1">Drop files here</div>
                <div className="text-muted-foreground text-sm">Images, PDFs, documents supported</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Textarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder="Ask me anything about the market..."
          value={input}
          onChange={handleInput}
          onPaste={handlePaste}
          className={cx(
            'professional-input min-h-[100px] max-h-[200px] overflow-y-auto resize-none rounded-2xl !text-sm bg-transparent pb-12 pl-4 pr-20 placeholder:text-foreground/40',
            'border-2 border-gray-400/80 dark:border-gray-500/80',
            'shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]',
            'focus:border-blue-500 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_0_0_4px_rgba(59,130,246,0.2),0_1px_2px_rgba(0,0,0,0.2)] focus:ring-0 focus:outline-none',
            'dark:focus:border-blue-400 dark:focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_4px_rgba(96,165,250,0.2),0_1px_2px_rgba(0,0,0,0.4)]',
            'transition-all duration-300 ease-out',
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
                toast.error('Please wait for the model to finish its response!');
              } else {
                submitForm();
              }
            }
          }}
        />
      </div>

      <div className="absolute bottom-0 left-0 p-3 flex flex-row items-center gap-2">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
        <SuggestionsButton messages={messages} />
      </div>

      <div className="absolute bottom-0 right-0 p-3 flex flex-row items-center">
        {status === 'submitted' ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
          />
        )}
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

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  return (
    <button
      data-testid="attachments-button"
      className="neuro-raised-sm w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-foreground hover:text-primary transition-all duration-300"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      type="button"
    >
      <Paperclip size={18} />
    </button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);


function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
}) {
  return (
    <button
      data-testid="stop-button"
      className="neuro-raised-sm w-12 h-12 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-300 shadow-[3px_3px_6px_rgba(239,68,68,0.15),-2px_-2px_4px_rgba(255,255,255,0.9)]"
      onClick={(event) => {
        event.preventDefault();
        stop();
      }}
      type="button"
    >
      <StopIcon size={18} />
    </button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
}: {
  submitForm: () => void;
  input: string;
}) {
  return (
    <button
      data-testid="send-button"
      className="neuro-primary w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={(input?.length || 0) === 0}
      type="button"
    >
      <ArrowUpIcon size={18} className="text-white fill-white" />
    </button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

// Suggestions Button - extracts suggestions from latest assistant message
function PureSuggestionsButton({
  messages,
}: {
  messages: Array<UIMessage>;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; prompt: string }>>([]);

  // Extract suggestions from the latest assistant message
  useEffect(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find(m => m.role === 'assistant');

    if (!latestAssistantMessage?.parts) {
      setSuggestions([]);
      return;
    }

    // Get all text content
    const allText = latestAssistantMessage.parts
      ?.filter((part: any) => part.type === 'text')
      ?.map((part: any) => part.text)
      ?.join('') || '';

    if (!allText.trim() || !allText.includes('</suggestions>')) {
      setSuggestions([]);
      return;
    }

    try {
      // Extract suggestions from XML tags
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
          s => s && typeof s === 'object' && s.label && s.prompt
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
    // Dispatch template-prefill event
    window.dispatchEvent(new CustomEvent('template-prefill', { detail: prompt }));
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
            'neuro-raised-sm w-10 h-10 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center transition-all duration-300 relative',
            'text-foreground hover:text-primary',
            open && 'neuro-pill-active'
          )}
        >
          <Sparkles size={18} />
          {/* Badge indicating number of suggestions */}
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-fit max-w-md p-2 neuro-card"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
            AI Suggestions
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              className={cn(
                'w-full px-3 py-2 text-sm transition-all duration-300 rounded-lg text-left',
                'neuro-raised-sm bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900',
                'hover:text-primary hover:neuro-pill-active'
              )}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{suggestion.label}</span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SuggestionsButton = memo(PureSuggestionsButton, (prevProps, nextProps) => {
  // Re-render when messages change
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  const prevLatest = prevProps.messages[prevProps.messages.length - 1];
  const nextLatest = nextProps.messages[nextProps.messages.length - 1];
  if (prevLatest?.id !== nextLatest?.id) return false;
  return true;
});
