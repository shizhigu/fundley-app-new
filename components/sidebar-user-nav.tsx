'use client';

import { useState } from 'react';
import { ChevronUp, Settings, Moon, Sun, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useClerk, useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from './icons';
import { SettingsDialog } from './settings-dialog';
import { cn } from '@/lib/utils';

interface SidebarUserNavProps {
  user?: {
    id: string;
    email: string;
    type?: string;
  } | null;
}

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  const t = useTranslations('nav');
  const tTheme = useTranslations('theme');
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded, user: clerkUser } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayEmail = clerkUser?.emailAddresses[0]?.emailAddress || user?.email || 'User';

  const handleSignOut = async () => {
    // 清空 localStorage，防止数据泄露给下一个登录用户
    try {
      localStorage.clear();
      console.log('✅ localStorage cleared on sign out');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }

    await signOut();
    router.push('/');
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {!isLoaded ? (
            <Button
              variant="ghost"
              className="w-full h-auto py-2 px-3 bg-card border border-border rounded-lg justify-between hover:bg-muted transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <span className="bg-muted text-transparent rounded-md animate-pulse">
                  Loading...
                </span>
              </div>
              <div className="animate-spin text-muted-foreground">
                <LoaderIcon />
              </div>
            </Button>
          ) : (
            <Button
              data-testid="user-nav-button"
              variant="ghost"
              className="w-full h-auto py-2 px-3 bg-card border border-border rounded-lg hover:bg-muted hover:border-brand-primary/20 transition-all duration-200"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Image
                  src={clerkUser?.imageUrl || `https://avatar.vercel.sh/${displayEmail}`}
                  alt={displayEmail ?? 'User Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0 text-left">
                  <span
                    data-testid="user-email"
                    className="text-sm font-medium text-foreground truncate"
                  >
                    {displayEmail}
                  </span>
                </div>
              </div>
              <ChevronUp className="ml-2 w-4 h-4 flex-shrink-0 text-muted-foreground" />
            </Button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          data-testid="user-nav-menu"
          side="top"
          align="start"
          className="w-[--radix-popper-anchor-width]"
        >
          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2"
            onSelect={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
            <span>{t('settings')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            data-testid="user-nav-item-theme"
            className="cursor-pointer flex items-center gap-2"
            onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" />
                <span>{tTheme('light')}</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                <span>{tTheme('dark')}</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            data-testid="user-nav-item-auth"
            className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
            onSelect={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            <span>{t('signOut')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
