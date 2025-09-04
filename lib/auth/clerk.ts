import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';

export type UserType = 'guest' | 'regular';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    type: UserType;
  } | null;
  getToken: (options?: { template: string }) => Promise<string | null>;
}

/**
 * Get the current authenticated user session
 * This function bridges Clerk authentication with our database
 */
export async function auth(): Promise<AuthSession> {
  const { userId: clerkUserId, getToken } = await clerkAuth();
  
  if (!clerkUserId) {
    return { 
      user: null, 
      getToken: async () => null 
    };
  }

  // Get Clerk user details
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    return { 
      user: null, 
      getToken: async () => null 
    };
  }

  // For now, create a mock user object based on Clerk data
  // This will be replaced with proper Convex user lookup later
  const email = clerkUser.emailAddresses[0]?.emailAddress || '';
  const dbUser = {
    id: clerkUserId,
    email: email,
  };

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      type: 'regular' as UserType, // All Clerk users are regular users
    },
    getToken
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