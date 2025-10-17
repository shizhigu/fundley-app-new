import { auth as clerkAuth, currentUser, clerkClient } from '@clerk/nextjs/server';
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
    // Look up user in PostgreSQL database
    const users = await db`
      SELECT id, email, clerk_user_id, created_at, updated_at
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `;

    let dbUser;
    if (users.length === 0) {
      // User doesn't exist in database, try to create or update existing by email
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';

      try {
        // Insert new user
        const insertedUsers = await db`
          INSERT INTO users (id, email, clerk_user_id, created_at, updated_at)
          VALUES (uuid_generate_v4(), ${email}, ${clerkUserId}, NOW(), NOW())
          RETURNING id, email, clerk_user_id
        `;
        dbUser = insertedUsers[0];
        console.log(`✅ [Auth] User created: ${email}`);
      } catch (insertError: any) {
        // If email already exists (duplicate key error), update the clerk_user_id
        if (insertError.code === '23505') {
          console.log(`⚠️ [Auth] Email exists, updating clerk_user_id: ${email}`);
          const updatedUsers = await db`
            UPDATE users
            SET clerk_user_id = ${clerkUserId},
                updated_at = NOW()
            WHERE email = ${email}
            RETURNING id, email, clerk_user_id
          `;
          if (updatedUsers.length > 0) {
            dbUser = updatedUsers[0];
            console.log(`✅ [Auth] User clerk_user_id updated: ${email}`);
          } else {
            throw new Error('Failed to update user with existing email');
          }
        } else {
          throw insertError;
        }
      }
    } else {
      dbUser = users[0];
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