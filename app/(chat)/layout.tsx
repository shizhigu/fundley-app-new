import { auth } from '@/lib/auth/clerk';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="h-screen w-full">
      {children}
    </div>
  );
}
