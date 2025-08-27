import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { 
  createUser, 
  getUser,
  createOrganization,
  updateUserOrganization,
  removeUserFromOrganization 
} from '@/lib/db/queries';

/**
 * Clerk Webhook Handler
 * 
 * IMPORTANT: Organization Mode Flexibility
 * =========================================
 * Current: ENFORCED organization mode - every user must belong to an organization
 * Future: OPTIONAL organization mode - supports both personal and organization users
 * 
 * To switch to optional mode in the future:
 * 1. Change ENFORCE_ORGANIZATION_MODE to false below
 * 2. Update middleware.ts to allow personal users on certain routes
 * 3. No database changes needed - organizationId is already nullable
 * 
 * Design Decision:
 * - User.organizationId is NULLABLE in database for flexibility
 * - Business logic enforces organization requirement (not database constraint)
 * - This allows easy migration to mixed mode without schema changes
 */

// Configuration flag - change this to support personal users in the future
const ENFORCE_ORGANIZATION_MODE = true; // Set to false to allow personal users

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log(`Webhook received: ${eventType}`);

  // User events
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, organization_memberships } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (email) {
      // Check if user exists
      const existingUsers = await getUser(email);
      
      if (existingUsers.length === 0) {
        // Create user in database
        // NOTE: organizationId is null initially, will be updated when user joins org
        await createUser(email, id);
        console.log(`User created: ${email} (${id})`);
      }

      // Update organization if user has one
      // This handles the case where user is created with an org already
      if (organization_memberships && organization_memberships.length > 0) {
        const primaryOrgId = organization_memberships[0].organization.id;
        await updateUserOrganization(id, primaryOrgId);
        console.log(`User ${email} associated with org ${primaryOrgId}`);
      }
    }
  }

  // User deleted
  if (eventType === 'user.deleted') {
    // Note: We might want to soft delete instead of hard delete
    // For now, we'll keep the user record for data integrity
    console.log(`User deletion webhook received for ${evt.data.id}`);
  }

  // Organization events
  if (eventType === 'organization.created') {
    const { id, name, slug } = evt.data;
    await createOrganization({
      clerkOrganizationId: id,
      name,
      slug,
      settings: {}
    });
    console.log(`Organization created: ${name} (${id})`);
  }

  if (eventType === 'organization.updated') {
    const { id, name, slug } = evt.data;
    // Update organization in database
    // TODO: Implement updateOrganization function
    console.log(`Organization updated: ${name} (${id})`);
  }

  if (eventType === 'organization.deleted') {
    // Note: Be careful with deletion - might want to soft delete
    console.log(`Organization deletion webhook received for ${evt.data.id}`);
  }

  // Organization membership events
  if (eventType === 'organizationMembership.created') {
    const { organization, public_user_data } = evt.data;
    const userId = public_user_data.user_id;
    const orgId = organization.id;
    
    /**
     * IMPORTANT: Organization Assignment Logic
     * =========================================
     * In ENFORCED mode: User's organizationId is updated to the new org
     * In OPTIONAL mode: User can belong to multiple orgs (future feature)
     * 
     * Current: One org per user (updates organizationId)
     * Future: Many-to-many relationship (organization_members table)
     */
    
    await updateUserOrganization(userId, orgId);
    console.log(`User ${userId} joined organization ${orgId}`);
  }

  if (eventType === 'organizationMembership.updated') {
    // Handle role changes, etc.
    const { organization, public_user_data, role } = evt.data;
    console.log(`Membership updated for user ${public_user_data.user_id} in org ${organization.id}`);
  }

  if (eventType === 'organizationMembership.deleted') {
    const { organization, public_user_data } = evt.data;
    const userId = public_user_data.user_id;
    
    /**
     * IMPORTANT: Membership Removal Logic
     * ====================================
     * In ENFORCED mode: This shouldn't happen (users must belong to an org)
     * In OPTIONAL mode: Set user's organizationId to null
     * 
     * For multi-org support: Remove from organization_members table only
     */
    
    if (!ENFORCE_ORGANIZATION_MODE) {
      await removeUserFromOrganization(userId);
      console.log(`User ${userId} removed from organization ${organization.id}`);
    } else {
      console.warn(`User ${userId} removed from org but ENFORCE_ORGANIZATION_MODE is true`);
    }
  }

  return new Response('Webhook processed', { status: 200 });
}