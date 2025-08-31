import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/clerk';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  // Redirect old chat URLs to the permanent workspace
  redirect('/permanent');
}
