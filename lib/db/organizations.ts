import { db } from './config';

/**
 * Create or update an organization in PostgreSQL
 * Called by Clerk webhooks to keep organization data in sync
 */
export async function createOrUpdateOrganization(data: {
  clerkOrganizationId: string;
  name?: string;
  slug?: string;
}): Promise<void> {
  try {
    // Check if organization exists
    const existing = await db`
      SELECT id FROM organizations WHERE clerk_organization_id = ${data.clerkOrganizationId}
    `;

    if (existing.length > 0) {
      // Update existing organization
      await db`
        UPDATE organizations
        SET
          name = COALESCE(${data.name}, name),
          slug = COALESCE(${data.slug}, slug),
          updated_at = NOW()
        WHERE clerk_organization_id = ${data.clerkOrganizationId}
      `;
      console.log(`✅ [PG] Organization updated: ${data.name} (${data.clerkOrganizationId})`);
    } else {
      // Create new organization
      await db`
        INSERT INTO organizations (
          id,
          name,
          slug,
          clerk_organization_id,
          created_at,
          updated_at
        )
        VALUES (
          uuid_generate_v4(),
          ${data.name || ''},
          ${data.slug || ''},
          ${data.clerkOrganizationId},
          NOW(),
          NOW()
        )
      `;
      console.log(`✅ [PG] Organization created: ${data.name} (${data.clerkOrganizationId})`);
    }
  } catch (error) {
    console.error('❌ [PG] Error creating/updating organization:', error);
    throw error;
  }
}

/**
 * Delete an organization from PostgreSQL
 * For now, we just log the deletion event to avoid breaking foreign keys
 */
export async function deleteOrganization(clerkOrganizationId: string): Promise<void> {
  try {
    // Option 1: Soft delete (add deleted_at column in future)
    // await db`UPDATE organizations SET deleted_at = NOW() WHERE clerk_organization_id = ${clerkOrganizationId}`;

    // Option 2: Hard delete (not recommended - will break foreign keys)
    // await db`DELETE FROM organizations WHERE clerk_organization_id = ${clerkOrganizationId}`;

    // Option 3: Just log for now (current approach)
    console.log(`⚠️ [PG] Organization deletion logged: ${clerkOrganizationId} (not deleted from DB)`);
  } catch (error) {
    console.error('❌ [PG] Error deleting organization:', error);
    throw error;
  }
}

/**
 * Link a user to an organization
 */
export async function linkUserToOrganization(
  clerkUserId: string,
  clerkOrganizationId: string
): Promise<void> {
  try {
    // Get organization ID from PostgreSQL
    const org = await db`
      SELECT id FROM organizations WHERE clerk_organization_id = ${clerkOrganizationId}
    `;

    if (org.length === 0) {
      console.warn(`⚠️ [PG] Organization not found: ${clerkOrganizationId}`);
      return;
    }

    // Update user's organization
    await db`
      UPDATE users
      SET
        clerk_organization_id = ${clerkOrganizationId},
        organization_id = ${org[0].id},
        updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
    `;

    console.log(`✅ [PG] User ${clerkUserId} linked to organization ${clerkOrganizationId}`);
  } catch (error) {
    console.error('❌ [PG] Error linking user to organization:', error);
    throw error;
  }
}

/**
 * Unlink a user from an organization
 */
export async function unlinkUserFromOrganization(clerkUserId: string): Promise<void> {
  try {
    await db`
      UPDATE users
      SET
        clerk_organization_id = NULL,
        organization_id = NULL,
        updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
    `;

    console.log(`✅ [PG] User ${clerkUserId} unlinked from organization`);
  } catch (error) {
    console.error('❌ [PG] Error unlinking user from organization:', error);
    throw error;
  }
}
