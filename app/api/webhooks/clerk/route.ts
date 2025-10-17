import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createOrUpdateUser, deleteUser } from '@/lib/db/users';

/**
 * Clerk Webhook Handler
 *
 * Handles incoming webhook events from Clerk to sync user data.
 *
 * Supported Events:
 * - user.created: Create new user in database
 * - user.updated: Update existing user data
 * - user.deleted: Mark user as deleted (soft delete)
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
        const { id, email_addresses } = evt.data;
        const email = email_addresses[0]?.email_address || '';

        await createOrUpdateUser({
          clerkUserId: id,
          email,
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

      default:
        console.log(`⚠️ [Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error(`❌ [Webhook] Error processing ${eventType}:`, error);
    return new Response(`Webhook processing failed: ${error}`, { status: 500 });
  }
}
