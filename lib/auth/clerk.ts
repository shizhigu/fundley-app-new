import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import { getUserByClerkId, createUser } from '@/lib/db/queries';

export type UserType = 'guest' | 'regular';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    type: UserType;
  } | null;
}

/**
 * Get the current authenticated user session
 * This function bridges Clerk authentication with our database
 */
export async function auth(): Promise<AuthSession> {
  const { userId: clerkUserId } = await clerkAuth();
  
  if (!clerkUserId) {
    return { user: null };
  }

  // Get Clerk user details
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    return { user: null };
  }

  // Get or create user in our database
  let dbUser = await getUserByClerkId(clerkUserId);
  
  if (!dbUser) {
    // Create user in our database if they don't exist
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const [newUser] = await createUser(email, clerkUserId);
    dbUser = newUser;
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      type: 'regular' as UserType, // All Clerk users are regular users
    }
  };
}

/**
 * Require authentication for a route
 * Throws an error if the user is not authenticated
 */
export async function requireAuth(): Promise<NonNullable<AuthSession['user']>> {
  const session = await auth();
  
  if (!session.user) {
    throw new Error('Unauthorized');
  }
  
  return session.user;
}