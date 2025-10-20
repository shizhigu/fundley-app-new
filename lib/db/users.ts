import { db } from './config';

/**
 * Create or update a user in PostgreSQL
 * Called by Clerk webhooks to keep user data in sync
 */
export async function createOrUpdateUser(data: {
  clerkUserId: string;
  email?: string;
}): Promise<void> {
  try {
    // Check if user exists
    const existing = await db`
      SELECT id FROM users WHERE clerk_user_id = ${data.clerkUserId}
    `;

    if (existing.length > 0) {
      // Update existing user
      await db`
        UPDATE users
        SET
          email = COALESCE(${data.email}, email),
          updated_at = NOW()
        WHERE clerk_user_id = ${data.clerkUserId}
      `;
      console.log(`✅ [PG] User updated: ${data.email} (${data.clerkUserId})`);
    } else {
      // Create new user with 10 free addon credits
      await db`
        INSERT INTO users (
          id,
          email,
          clerk_user_id,
          addon_credits,
          created_at,
          updated_at
        )
        VALUES (
          uuid_generate_v4(),
          ${data.email || ''},
          ${data.clerkUserId},
          10,
          NOW(),
          NOW()
        )
      `;
      console.log(`✅ [PG] User created with 10 free credits: ${data.email} (${data.clerkUserId})`);
    }
  } catch (error) {
    console.error('❌ [PG] Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Delete a user from PostgreSQL (soft delete - keep for data integrity)
 * For now, we just log the deletion event
 */
export async function deleteUser(clerkUserId: string): Promise<void> {
  try {
    // Option 1: Soft delete (add deleted_at column in future)
    // await db`UPDATE users SET deleted_at = NOW() WHERE clerk_user_id = ${clerkUserId}`;

    // Option 2: Hard delete (not recommended - will break foreign keys)
    // await db`DELETE FROM users WHERE clerk_user_id = ${clerkUserId}`;

    // Option 3: Just log for now (current approach)
    console.log(`⚠️ [PG] User deletion logged: ${clerkUserId} (not deleted from DB)`);
  } catch (error) {
    console.error('❌ [PG] Error deleting user:', error);
    throw error;
  }
}
