import { headers } from 'next/headers';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { createOrUpdateUser, deleteUser } from '@/lib/db/users';
import { createOrUpdateOrganization, linkUserToOrganization, unlinkUserFromOrganization } from '@/lib/db/organizations';

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
  // Create Convex client
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
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
  console.log(`🎣 Clerk Webhook received: ${eventType}`);

  // User events
  if (eventType === 'user.created') {
    const { id, email_addresses, organization_memberships } = evt.data;
    const email = email_addresses?.[0]?.email_address;

    if (email && id) {
      try {
        await convex.mutation(api.users.create, {
          email,
          clerkUserId: id,
          clerkOrganizationId: organization_memberships?.[0]?.organization?.id,
        });
        console.log(`✅ User created: ${email} (${id})`);
      } catch (error) {
        console.error('Error creating user:', error);
      }

      // PostgreSQL dual-write
      try {
        await createOrUpdateUser({
          clerkUserId: id,
          email,
          clerkOrganizationId: organization_memberships?.[0]?.organization?.id,
        });
      } catch (error) {
        console.error('❌ [PG] Error creating user:', error);
      }
    } else {
      console.error('User creation webhook missing required fields:', { id, email });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, organization_memberships } = evt.data;
    const email = email_addresses?.[0]?.email_address;

    if (id) {
      try {
        await convex.mutation(api.users.updateByClerkId, {
          clerkUserId: id,
          email,
          clerkOrganizationId: organization_memberships?.[0]?.organization?.id,
        });
        console.log(`✅ User updated: ${email} (${id})`);
      } catch (error) {
        console.error('Error updating user:', error);
      }

      // PostgreSQL dual-write
      try {
        await createOrUpdateUser({
          clerkUserId: id,
          email,
          clerkOrganizationId: organization_memberships?.[0]?.organization?.id,
        });
      } catch (error) {
        console.error('❌ [PG] Error updating user:', error);
      }
    } else {
      console.error('User update webhook missing id');
    }
  }

  // User deleted
  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    // Note: We might want to soft delete instead of hard delete
    // For now, we'll keep the user record for data integrity
    console.log(`User deletion webhook received for ${id}`);

    // PostgreSQL dual-write (soft delete - just logs for now)
    if (id) {
      try {
        await deleteUser(id);
      } catch (error) {
        console.error('❌ [PG] Error deleting user:', error);
      }
    }
  }

  // Organization events
  if (eventType === 'organization.created') {
    const { id, name, slug } = evt.data;
    console.log(`📋 [Webhook] Organization created event received:`, { id, name, slug });

    if (id && name && slug) {
      // Convex write
      try {
        await convex.mutation(api.organizations.createFromWebhook, {
          clerkOrganizationId: id,
          name,
          slug,
          settings: {}
        });
        console.log(`✅ [Convex] Organization created: ${name} (${id})`);
      } catch (error) {
        console.error('❌ [Convex] Error creating organization:', error);
      }

      // PostgreSQL dual-write
      try {
        console.log(`🔄 [PG] Starting organization creation:`, { id, name, slug });
        await createOrUpdateOrganization({
          clerkOrganizationId: id,
          name,
          slug,
        });
        console.log(`✅ [PG] Organization creation completed successfully`);
      } catch (error) {
        console.error('❌ [PG] Error creating organization:', error);
        console.error('❌ [PG] Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
    } else {
      console.error('Organization creation webhook missing required fields:', { id, name, slug });
    }
  }

  if (eventType === 'organization.updated') {
    const { id, name, slug } = evt.data;
    if (id) {
      try {
        await convex.mutation(api.organizations.updateByClerkId, {
          clerkOrganizationId: id,
          name,
          slug,
        });
        console.log(`✅ Organization updated: ${name} (${id})`);
      } catch (error) {
        console.error('Error updating organization:', error);
      }

      // PostgreSQL dual-write
      try {
        await createOrUpdateOrganization({
          clerkOrganizationId: id,
          name,
          slug,
        });
      } catch (error) {
        console.error('❌ [PG] Error updating organization:', error);
      }
    } else {
      console.error('Organization update webhook missing id');
    }
  }

  if (eventType === 'organization.deleted') {
    const { id } = evt.data;
    if (id) {
      try {
        await convex.mutation(api.organizations.deleteByClerkId, {
          clerkOrganizationId: id,
        });
        console.log(`✅ Organization deleted: ${id}`);
      } catch (error) {
        console.error('Error deleting organization:', error);
      }
    } else {
      console.error('Organization deletion webhook missing id');
    }
  }

  // Organization membership events
  if (eventType === 'organizationMembership.created') {
    const { organization, public_user_data } = evt.data;
    const userId = public_user_data?.user_id;
    const orgId = organization?.id;

    if (userId && orgId) {
      try {
        await convex.mutation(api.users.updateByClerkId, {
          clerkUserId: userId,
          clerkOrganizationId: orgId,
        });
        console.log(`✅ User ${userId} joined organization ${orgId}`);
      } catch (error) {
        console.error('Error handling membership created:', error);
      }

      // PostgreSQL dual-write
      try {
        await linkUserToOrganization(userId, orgId);
      } catch (error) {
        console.error('❌ [PG] Error linking user to organization:', error);
      }
    } else {
      console.error('Membership creation webhook missing required fields:', { userId, orgId });
    }
  }

  if (eventType === 'organizationMembership.updated') {
    const { organization, public_user_data, role } = evt.data;
    const userId = public_user_data?.user_id;
    const orgId = organization?.id;
    if (userId && orgId) {
      console.log(`✅ Membership updated for user ${userId} in org ${orgId} (role: ${role})`);
    }
  }

  if (eventType === 'organizationMembership.deleted') {
    const { organization, public_user_data } = evt.data;
    const userId = public_user_data?.user_id;
    const orgId = organization?.id;

    if (userId && orgId && !ENFORCE_ORGANIZATION_MODE) {
      try {
        await convex.mutation(api.users.updateByClerkId, {
          clerkUserId: userId,
          clerkOrganizationId: undefined,
        });
        console.log(`✅ User ${userId} removed from organization ${orgId}`);
      } catch (error) {
        console.error('Error removing user from organization:', error);
      }

      // PostgreSQL dual-write
      try {
        await unlinkUserFromOrganization(userId);
      } catch (error) {
        console.error('❌ [PG] Error unlinking user from organization:', error);
      }
    } else if (userId && orgId) {
      console.warn(`⚠️ User ${userId} removed from org but ENFORCE_ORGANIZATION_MODE is true`);

      // PostgreSQL dual-write (even when mode is enforced)
      try {
        await unlinkUserFromOrganization(userId);
      } catch (error) {
        console.error('❌ [PG] Error unlinking user from organization:', error);
      }
    } else {
      console.error('Membership deletion webhook missing required fields:', { userId, orgId });
    }
  }

  return new Response('Webhook processed', { status: 200 });
}