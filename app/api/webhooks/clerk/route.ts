import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createOrUpdateUser, deleteUser } from '@/lib/db/users';
import {
  createOrUpdateOrganization,
  deleteOrganization,
  linkUserToOrganization,
  unlinkUserFromOrganization,
} from '@/lib/db/organizations';

/**
 * Clerk Webhook Handler
 *
 * Handles incoming webhook events from Clerk to sync user and organization data.
 *
 * Supported Events:
 * - user.created: Create new user in database
 * - user.updated: Update existing user data
 * - user.deleted: Mark user as deleted (soft delete)
 * - organization.created: Create new organization
 * - organization.updated: Update organization details
 * - organization.deleted: Mark organization as deleted (soft delete)
 * - organizationMembership.created: Link user to organization
 * - organizationMembership.updated: Update user-organization relationship (e.g., role changes)
 * - organizationMembership.deleted: Unlink user from organization
 */
export async function POST(req: Request) {
  // Get webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ [Webhook] Missing CLERK_WEBHOOK_SECRET environment variable');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Verify headers exist
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ [Webhook] Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create Svix webhook instance
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ [Webhook] Verification failed:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  // Handle the webhook event
  const eventType = evt.type;
  console.log(`📨 [Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      // ============ User Events ============
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, unsafe_metadata } = evt.data;
        const email = email_addresses[0]?.email_address || '';
        const clerkOrgId = (unsafe_metadata as any)?.clerkOrganizationId || null;

        await createOrUpdateUser({
          clerkUserId: id,
          email,
          clerkOrganizationId: clerkOrgId,
        });

        console.log(`✅ [Webhook] User ${eventType}: ${email} (${id})`);
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        await deleteUser(id!);
        console.log(`✅ [Webhook] User deleted: ${id}`);
        break;
      }

      // ============ Organization Events ============
      case 'organization.created':
      case 'organization.updated': {
        const { id, name, slug } = evt.data;

        // ✅ 使用 webhook 传来的 slug（可能为 null）
        await createOrUpdateOrganization({
          clerkOrganizationId: id,
          name: name || undefined,
          slug: slug || undefined, // 如果 webhook 传来的 slug 是 null，则为 undefined
        });

        console.log(`✅ [Webhook] Organization ${eventType}: ${name} (id: ${id}, slug: ${slug || 'auto-generated'})`);
        break;
      }

      case 'organization.deleted': {
        const { id } = evt.data;
        await deleteOrganization(id!);
        console.log(`✅ [Webhook] Organization deleted: ${id}`);
        break;
      }

      // ============ Organization Membership Events ============
      case 'organizationMembership.created': {
        const { organization, public_user_data } = evt.data;

        if (organization?.id && public_user_data?.user_id) {
          await linkUserToOrganization(
            public_user_data.user_id,
            organization.id
          );
          console.log(`✅ [Webhook] User ${public_user_data.user_id} linked to org ${organization.id}`);
        }
        break;
      }

      case 'organizationMembership.deleted': {
        const { public_user_data } = evt.data;

        if (public_user_data?.user_id) {
          await unlinkUserFromOrganization(public_user_data.user_id);
          console.log(`✅ [Webhook] User ${public_user_data.user_id} unlinked from organization`);
        }
        break;
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data } = evt.data;

        // 当用户的组织成员关系更新时（如角色变更），确保关联正确
        if (organization?.id && public_user_data?.user_id) {
          await linkUserToOrganization(
            public_user_data.user_id,
            organization.id
          );
          console.log(`✅ [Webhook] User ${public_user_data.user_id} membership updated in org ${organization.id}`);
        }
        break;
      }

      default:
        console.log(`⚠️ [Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error(`❌ [Webhook] Error processing ${eventType}:`, error);
    return new Response(`Webhook processing failed: ${error}`, { status: 500 });
  }
}
