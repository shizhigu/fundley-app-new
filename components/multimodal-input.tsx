'use client';

import type { UIMessage } from 'ai';
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
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
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
  input,
  setInput,
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
}: {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
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
}) {
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
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    sendMessage({
      role: 'user',
      parts: [
        ...attachments.map((attachment) => ({
          type: 'file' as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: 'text',
          text: input,
        },
      ],
    }, {
      body: {
        selectedChatModel: selectedModelId,
        selectedVisibilityType: selectedVisibilityType,
      },
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();
    setInput('');

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col gap-4 bg-transparent">
      <AnimatePresence>
        {!isAtBottom && (
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
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Ask me anything about the market..."
        value={input}
        onChange={handleInput}
        className={cx(
          'professional-input min-h-[60px] max-h-[200px] overflow-y-auto resize-none rounded-2xl !text-sm bg-transparent pb-12 pl-4 pr-20 placeholder:text-foreground/40',
          'border-2 border-gray-400/80 dark:border-gray-500/80',
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]',
          'focus:border-blue-500 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_0_0_4px_rgba(59,130,246,0.2),0_1px_2px_rgba(0,0,0,0.2)] focus:ring-0 focus:outline-none',
          'dark:focus:border-blue-400 dark:focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_4px_rgba(96,165,250,0.2),0_1px_2px_rgba(0,0,0,0.4)]',
          'transition-all duration-200',
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
            uploadQueue={uploadQueue}
          />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;

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
        setMessages((messages) => messages);
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
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="glass-send-button rounded-full p-3 h-fit bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed [&_svg]:text-white [&_svg]:fill-white"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={(input?.length || 0) === 0 || (uploadQueue?.length || 0) > 0}
    >
      <ArrowUpIcon size={16} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if ((prevProps.uploadQueue?.length || 0) !== (nextProps.uploadQueue?.length || 0))
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
