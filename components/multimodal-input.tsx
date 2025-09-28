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

import { ArrowUpIcon, PaperclipIcon, StopIcon, QuantumIcon, } from './icons';
import { EnhancedAttachmentPreview } from './enhanced-attachment-preview';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@/lib/ai-sdk-types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import type { VisibilityType } from './visibility-selector';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { AuthSession } from '@/lib/auth/clerk';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { chatModels } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { startTransition, useOptimistic } from 'react';
import { cn } from '@/lib/utils';

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
  selectedModelId,
  setSelectedModelId,
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
  selectedModelId: string;
  setSelectedModelId?: (modelId: string) => void;
  isAtBottom?: boolean;
  scrollToBottom?: () => void;
}) {
  // 内部input状态管理
  const [input, setInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

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
      textareaRef.current.style.height = '60px';
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

  useEffect(() => {
    if (status === 'submitted' && scrollToBottom) {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);


  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4 bg-transparent">
      {/* Modern Loading Indicator */}
      <AnimatePresence>
        {status === 'streaming' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="
              relative px-6 py-3 rounded-2xl
              bg-white/[0.03] dark:bg-white/[0.05]
              backdrop-blur-xl backdrop-saturate-150
              border border-white/[0.08] dark:border-white/[0.12]
              shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]
              before:absolute before:inset-0 before:rounded-2xl
              before:bg-gradient-to-r before:from-violet-500/[0.08] before:via-blue-500/[0.08] before:to-cyan-500/[0.08]
              before:opacity-50
            "
          >
            <div className="relative flex items-center justify-center gap-3">
              {/* Modern pulse animation */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-blue-400"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground/60 tracking-wide">
                Processing...
              </span>
            </div>
          </motion.div>
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

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder={status === 'streaming' ? "AI is processing your request..." : "Ask me anything about the market..."}
        value={input}
        onChange={handleInput}
        disabled={status === 'streaming'}
        className={cx(
          'professional-input min-h-[60px] max-h-[200px] overflow-y-auto resize-none rounded-2xl !text-sm bg-transparent pb-12 pl-4 pr-20 placeholder:text-foreground/40',
          'border-2 border-gray-400/80 dark:border-gray-500/80',
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]',
          'focus:border-blue-500 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_0_0_4px_rgba(59,130,246,0.2),0_1px_2px_rgba(0,0,0,0.2)] focus:ring-0 focus:outline-none',
          'dark:focus:border-blue-400 dark:focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_4px_rgba(96,165,250,0.2),0_1px_2px_rgba(0,0,0,0.4)]',
          'transition-all duration-300 ease-out',
          status === 'streaming' && 'opacity-50 cursor-not-allowed backdrop-blur-[2px]',
          className,
        )}
        rows={2}
        autoFocus={status !== 'streaming'}
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

      <div className="absolute bottom-0 left-0 p-3 flex flex-row items-center gap-2">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
        <CompactModelSelector user={user} selectedModelId={selectedModelId} setSelectedModelId={setSelectedModelId} />
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
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
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
    <Button
      data-testid="attachments-button"
      className="glass-input-button rounded-lg p-2 h-fit hover:bg-white/10 transition-all duration-200 border border-gray-200 dark:border-white/20"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={16} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

// Compact Model Selector for input area
function PureCompactModelSelector({
  user,
  selectedModelId,
  setSelectedModelId,
}: {
  user: AuthSession['user'];
  selectedModelId: string;
  setSelectedModelId?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);

  const userType = user?.type ?? 'guest';
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  // Get simple model name
  const getSimpleModelName = (modelId: string) => {
    const names = {
      'grok-3': 'Grok',
      'gemini-2.5-pro': 'Gemini', 
      'gpt-5': 'GPT',
      'Fast': 'Fast'
    };
    return names[modelId as keyof typeof names] || modelId;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-8 w-8 p-0 transition-all duration-200 rounded-xl',
            'bg-white/10 backdrop-blur-md border',
            'border-gray-200 dark:border-white/20',
            'hover:bg-white/20 hover:border-gray-300 dark:hover:border-white/30',
            'text-foreground/80 hover:text-foreground',
            open && 'bg-white/20 border-gray-300 dark:border-white/30'
          )}
        >
          <QuantumIcon size={16} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="start" 
        className="w-fit p-1 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
        sideOffset={4}
      >
        <div className="space-y-1">
          {availableChatModels.map((chatModel) => {
            const { id } = chatModel;
            const isSelected = id === optimisticModelId;
            const simpleName = getSimpleModelName(id);

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  startTransition(() => {
                    setOptimisticModelId(id);
                    setSelectedModelId?.(id);
                  });
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  'flex items-center justify-center rounded-md whitespace-nowrap',
                  'text-foreground/70 hover:text-foreground hover:bg-white/15',
                  isSelected && 'bg-gray-900 text-white shadow-md font-semibold border border-gray-700'
                )}
              >
                {simpleName}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const CompactModelSelector = memo(PureCompactModelSelector);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="glass-send-button rounded-full p-2 h-fit bg-error/10 border border-error/20 hover:bg-error/20 transition-all duration-200"
      onClick={(event) => {
        event.preventDefault();
        stop();
        // setMessages removed during AgentOS migration
      }}
    >
      <StopIcon size={16} />
    </Button>
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
    <Button
      data-testid="send-button"
      className="glass-send-button rounded-full p-3 h-fit bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed [&_svg]:text-white [&_svg]:fill-white"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={(input?.length || 0) === 0}
    >
      <ArrowUpIcon size={16} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
