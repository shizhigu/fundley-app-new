import type { Chat } from '@/lib/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  ShareIcon,
  TrashIcon,
} from './icons';
import { memo, useState, useEffect } from 'react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
  });
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (isActive && isNavigating) {
      setIsNavigating(false);
    }
    if (pathname !== `/chat/${chat.id}` && isNavigating) {
      setIsNavigating(false);
    }
  }, [pathname, chat.id, isNavigating]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorPoint({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isActive) {
      setIsNavigating(true);
      setOpenMobile(false);
      router.push(`/chat/${chat.id}`);
    }
  };

  return (
    <>
      <div className="mb-0.5">
        <a 
          href={`/chat/${chat.id}`}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          className={cn(
            "block w-full px-2 py-1.5 text-xs rounded-lg transition-all duration-200 text-left truncate",
            isActive || isNavigating 
              ? "bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/30"
          )}
        >
          {chat.title}
        </a>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            left: anchorPoint.x,
            top: anchorPoint.y,
            zIndex: 9999
          }}
        >
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <div style={{ width: 0, height: 0 }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="start" sideOffset={0}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <ShareIcon className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    className="cursor-pointer flex justify-between"
                    onClick={() => {
                      setVisibilityType('private');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LockIcon className="h-3 w-3" />
                      <span>Private</span>
                    </div>
                    {visibilityType === 'private' && (
                      <CheckCircleFillIcon className="h-3 w-3" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex justify-between"
                    onClick={() => {
                      setVisibilityType('public');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="h-3 w-3" />
                      <span>Public</span>
                    </div>
                    {visibilityType === 'public' && (
                      <CheckCircleFillIcon className="h-3 w-3" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => {
                setMenuOpen(false);
                onDelete(chat.id);
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
};

export const ChatItem = memo(PureChatItem);