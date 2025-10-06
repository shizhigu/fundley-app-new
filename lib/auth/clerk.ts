import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db/config';

export type UserType = 'guest' | 'regular';

export interface AuthSession {
  user: {
    id: string;          // PostgreSQL UUID for business logic
    clerkId: string;     // Clerk ID for authentication
    email: string;
    type: UserType;
  } | null;
  getToken: (options?: { template: string }) => Promise<string | null>;
}

/**
 * Get the current authenticated user session
 * This function bridges Clerk authentication with PostgreSQL database
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

  try {
    // Get user's current organization from Clerk auth session
    const { orgId: clerkOrgId } = await clerkAuth();

    // Look up user in PostgreSQL database
    const users = await db`
      SELECT id, email, clerk_user_id, clerk_organization_id, created_at, updated_at
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `;

    let dbUser;
    if (users.length === 0) {
      // User doesn't exist in database, create them
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const insertedUsers = await db`
        INSERT INTO users (id, email, clerk_user_id, clerk_organization_id, created_at, updated_at)
        VALUES (uuid_generate_v4(), ${email}, ${clerkUserId}, ${clerkOrgId}, NOW(), NOW())
        RETURNING id, email, clerk_user_id, clerk_organization_id
      `;
      dbUser = insertedUsers[0];
      console.log(`✅ [Auth] User created with org: ${email} (org: ${clerkOrgId || 'none'})`);
    } else {
      dbUser = users[0];

      // Sync organization if it changed in Clerk but not in our DB
      if (clerkOrgId && dbUser.clerk_organization_id !== clerkOrgId) {
        await db`
          UPDATE users
          SET clerk_organization_id = ${clerkOrgId}, updated_at = NOW()
          WHERE clerk_user_id = ${clerkUserId}
        `;
        dbUser.clerk_organization_id = clerkOrgId;
        console.log(`✅ [Auth] User org synced: ${dbUser.email} → org: ${clerkOrgId}`);
      }
    }

    return {
      user: {
        id: dbUser.id,        // PostgreSQL UUID for business logic
        clerkId: clerkUserId, // Clerk ID for authentication
        email: dbUser.email,
        type: 'regular' as UserType, // All Clerk users are regular users
      },
      getToken
    };
  } catch (error) {
    console.error('Database error in auth:', error);
    // Fallback to Clerk data if database fails
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    return {
      user: {
        id: clerkUserId,      // Fallback: use Clerk ID as business ID
        clerkId: clerkUserId, // Clerk ID for authentication
        email: email,
        type: 'regular' as UserType,
      },
      getToken
    };
  }
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