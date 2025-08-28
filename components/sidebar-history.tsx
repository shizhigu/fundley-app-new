'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { AuthSession } from '@/lib/auth/clerk';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { ChatItem } from './sidebar-history-item';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon } from './icons';

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ 
  user,
  onChatSelect 
}: { 
  user: AuthSession['user'];
  onChatSelect?: () => void;
}) {
  const { id } = useParams();

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push('/');
    }
  };

  if (!user) {
    return (
      <div className="px-3 py-4 text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Login to save and revisit previous chats!
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-2">
          Today
        </div>
        <div className="flex flex-col gap-1">
          {[44, 32, 28, 64, 52].map((item) => (
            <div
              key={item}
              className="rounded-lg h-10 flex gap-2 px-3 items-center bg-gray-100/50 dark:bg-gray-700/20"
            >
              <div
                className="h-4 rounded-md flex-1 bg-gray-200 dark:bg-gray-600"
                style={{
                  width: `${item}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Your conversations will appear here once you start chatting!
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {paginatedChatHistories &&
          (() => {
            const chatsFromHistory = paginatedChatHistories.flatMap(
              (paginatedChatHistory) => paginatedChatHistory.chats,
            );

            const groupedChats = groupChatsByDate(chatsFromHistory);

            return (
              <>
                {groupedChats.today.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Today
                    </div>
                    <div className="space-y-0.5">
                      {groupedChats.today.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={onChatSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedChats.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Yesterday
                    </div>
                    <div className="space-y-0.5">
                      {groupedChats.yesterday.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={onChatSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedChats.lastWeek.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Last 7 Days
                    </div>
                    <div className="space-y-0.5">
                      {groupedChats.lastWeek.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={onChatSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedChats.lastMonth.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Last 30 Days
                    </div>
                    <div className="space-y-0.5">
                      {groupedChats.lastMonth.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={onChatSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedChats.older.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Older
                    </div>
                    <div className="space-y-0.5">
                      {groupedChats.older.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={onChatSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
      </div>

      <motion.div
        onViewportEnter={() => {
          if (!isValidating && !hasReachedEnd) {
            setSize((size) => size + 1);
          }
        }}
      />

      {hasReachedEnd ? (
        <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
          You have reached the end of your chat history.
        </div>
      ) : (
        <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div>Loading Chats...</div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
