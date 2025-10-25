import { auth } from '@/lib/auth/clerk';
import { TimezoneUpdater } from '@/components/timezone-updater';
import { CommandPalette } from '@/components/command-palette';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex-1 overflow-hidden max-w-full min-w-0">
      {session?.user && <TimezoneUpdater />}
      {session?.user && <CommandPalette />}
      {children}
    </div>
  );
}
