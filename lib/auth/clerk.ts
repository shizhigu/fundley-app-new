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
      // User doesn't exist in database, try to create or update existing by email
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';

      // Step 1: Handle organization - find or create
      let organizationId: string | null = null;

      if (clerkOrgId) {
        // Check if organization exists in our database
        const existingOrgs = await db`
          SELECT id FROM organizations
          WHERE clerk_organization_id = ${clerkOrgId}
          LIMIT 1
        `;

        if (existingOrgs.length > 0) {
          organizationId = existingOrgs[0].id;
          console.log(`✅ [Auth] Found existing organization: ${organizationId}`);
        } else {
          // Create new organization in our database
          try {
            // Generate slug from clerk org ID (remove 'org_' prefix and take first 12 chars)
            const slugFromClerkId = clerkOrgId.replace('org_', '').substring(0, 12).toLowerCase();

            const newOrgs = await db`
              INSERT INTO organizations (id, name, slug, clerk_organization_id, created_at, updated_at)
              VALUES (uuid_generate_v4(), 'Organization', ${slugFromClerkId}, ${clerkOrgId}, NOW(), NOW())
              RETURNING id
            `;
            organizationId = newOrgs[0].id;
            console.log(`✅ [Auth] Created new organization: ${organizationId} (slug: ${slugFromClerkId}) for Clerk org: ${clerkOrgId}`);
          } catch (orgError) {
            console.error(`⚠️ [Auth] Failed to create organization for ${clerkOrgId}:`, orgError);
            // Continue without organization_id - user can still be created
          }
        }
      }

      try {
        // Step 2: Insert new user with organization_id
        const insertedUsers = await db`
          INSERT INTO users (id, email, clerk_user_id, clerk_organization_id, organization_id, created_at, updated_at)
          VALUES (uuid_generate_v4(), ${email}, ${clerkUserId}, ${clerkOrgId}, ${organizationId}, NOW(), NOW())
          RETURNING id, email, clerk_user_id, clerk_organization_id, organization_id
        `;
        dbUser = insertedUsers[0];
        console.log(`✅ [Auth] User created: ${email} (clerk_org: ${clerkOrgId || 'none'}, org_id: ${organizationId || 'none'})`);
      } catch (insertError: any) {
        // If email already exists (duplicate key error), update the clerk_user_id and organization
        if (insertError.code === '23505') {
          console.log(`⚠️ [Auth] Email exists, updating clerk_user_id: ${email}`);
          const updatedUsers = await db`
            UPDATE users
            SET clerk_user_id = ${clerkUserId},
                clerk_organization_id = ${clerkOrgId},
                organization_id = ${organizationId},
                updated_at = NOW()
            WHERE email = ${email}
            RETURNING id, email, clerk_user_id, clerk_organization_id, organization_id
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

      // Sync organization if it changed in Clerk but not in our DB
      if (clerkOrgId && dbUser.clerk_organization_id !== clerkOrgId) {
        // Find or create organization
        let organizationId: string | null = null;

        const existingOrgs = await db`
          SELECT id FROM organizations
          WHERE clerk_organization_id = ${clerkOrgId}
          LIMIT 1
        `;

        if (existingOrgs.length > 0) {
          organizationId = existingOrgs[0].id;
        } else {
          try {
            // Generate slug from clerk org ID (remove 'org_' prefix and take first 12 chars)
            const slugFromClerkId = clerkOrgId.replace('org_', '').substring(0, 12).toLowerCase();

            const newOrgs = await db`
              INSERT INTO organizations (id, name, slug, clerk_organization_id, created_at, updated_at)
              VALUES (uuid_generate_v4(), 'Organization', ${slugFromClerkId}, ${clerkOrgId}, NOW(), NOW())
              RETURNING id
            `;
            organizationId = newOrgs[0].id;
            console.log(`✅ [Auth] Created new organization: ${organizationId} (slug: ${slugFromClerkId}) for Clerk org: ${clerkOrgId}`);
          } catch (orgError) {
            console.error(`⚠️ [Auth] Failed to create organization for ${clerkOrgId}:`, orgError);
          }
        }

        await db`
          UPDATE users
          SET clerk_organization_id = ${clerkOrgId},
              organization_id = ${organizationId},
              updated_at = NOW()
          WHERE clerk_user_id = ${clerkUserId}
        `;
        dbUser.clerk_organization_id = clerkOrgId;
        dbUser.organization_id = organizationId;
        console.log(`✅ [Auth] User org synced: ${dbUser.email} → clerk_org: ${clerkOrgId}, org_id: ${organizationId}`);
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