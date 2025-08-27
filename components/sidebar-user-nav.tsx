'use client';

import { ChevronUp, Building2 } from 'lucide-react';
import Image from 'next/image';
import { useClerk, useUser, useOrganization } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LoaderIcon } from './icons';

interface SidebarUserNavProps {
  user?: {
    id: string;
    email: string;
    type?: string;
  } | null;
}

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded, user: clerkUser } = useUser();
  const { organization } = useOrganization();
  const { setTheme, resolvedTheme } = useTheme();

  const displayEmail = clerkUser?.emailAddresses[0]?.emailAddress || user?.email || 'User';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {!isLoaded ? (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10 justify-between">
                <div className="flex flex-row gap-2">
                  <div className="size-6 bg-zinc-500/30 rounded-full animate-pulse" />
                  <span className="bg-zinc-500/30 text-transparent rounded-md animate-pulse">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                data-testid="user-nav-button"
                className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-auto py-2"
              >
                <div className="flex items-start gap-2 flex-1">
                  <Image
                    src={clerkUser?.imageUrl || `https://avatar.vercel.sh/${displayEmail}`}
                    alt={displayEmail ?? 'User Avatar'}
                    width={32}
                    height={32}
                    className="rounded-full mt-0.5"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span data-testid="user-email" className="text-sm font-medium truncate">
                      {displayEmail}
                    </span>
                    {organization && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Building2 className="size-3" />
                        {organization.name}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronUp className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              data-testid="user-nav-item-theme"
              className="cursor-pointer"
              onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {`Toggle ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}