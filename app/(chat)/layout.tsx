import { auth } from '@/lib/auth/clerk';
import { DataStreamProvider } from '@/components/data-stream-provider';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <DataStreamProvider>
      <div className="flex-1 overflow-hidden max-w-full min-w-0">
        {children}
      </div>
    </DataStreamProvider>
  );
}
