'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { AuthSession } from '@/lib/auth/clerk';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
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
import { ChatItem } from './sidebar-history-item';
import { LoaderIcon } from './icons';

// Define Chat type to match Convex schema
type Chat = {
  _id: string;
  _creationTime: number;
  title: string;
  userId: string;
  visibility: 'private' | 'public';
  createdAt: number;
  updatedAt: number;
};

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

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

export function SidebarHistory({ 
  user,
  onChatSelect 
}: { 
  user: AuthSession['user'];
  onChatSelect?: () => void;
}) {
  const { id } = useParams();

  // Use Convex hooks instead of SWR
  const chats = useQuery(api.chats.list) || [];
  const deleteChat = useMutation(api.chats.remove);
  const isLoading = chats === undefined;

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasEmptyChatHistory = chats.length === 0;

  const handleDelete = async () => {
    if (!deleteId) return;

    const deletePromise = deleteChat({ id: deleteId });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: 'Chat deleted successfully',
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
        {(() => {
          const groupedChats = groupChatsByDate(chats);

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
                        key={chat._id}
                        chat={{
                          id: chat._id,
                          title: chat.title,
                          createdAt: new Date(chat.createdAt),
                          userId: chat.userId,
                          visibility: chat.visibility,
                        }}
                        isActive={chat._id === id}
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
                        key={chat._id}
                        chat={{
                          id: chat._id,
                          title: chat.title,
                          createdAt: new Date(chat.createdAt),
                          userId: chat.userId,
                          visibility: chat.visibility,
                        }}
                        isActive={chat._id === id}
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
                        key={chat._id}
                        chat={{
                          id: chat._id,
                          title: chat.title,
                          createdAt: new Date(chat.createdAt),
                          userId: chat.userId,
                          visibility: chat.visibility,
                        }}
                        isActive={chat._id === id}
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
                        key={chat._id}
                        chat={{
                          id: chat._id,
                          title: chat.title,
                          createdAt: new Date(chat.createdAt),
                          userId: chat.userId,
                          visibility: chat.visibility,
                        }}
                        isActive={chat._id === id}
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
                        key={chat._id}
                        chat={{
                          id: chat._id,
                          title: chat.title,
                          createdAt: new Date(chat.createdAt),
                          userId: chat.userId,
                          visibility: chat.visibility,
                        }}
                        isActive={chat._id === id}
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
