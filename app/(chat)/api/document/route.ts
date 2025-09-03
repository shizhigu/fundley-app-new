import { auth } from '@clerk/nextjs/server';
import type { ArtifactKind } from '@/components/artifact';
import { convexQueries } from '@/lib/convex/client';
import { ChatSDKError } from '@/lib/errors';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || id === 'undefined') {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is missing or invalid',
    ).toResponse();
  }

  const { getToken, userId } = await auth();

  if (!userId) {
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  // Create authenticated Convex client
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
  const token = await getToken({ template: 'convex' }); 
  if (token) { convex.setAuth(token); }

  const document = await convex.query(api.documents.get, { id: id as Id<"documents"> });

  if (!document) {
    return new ChatSDKError('not_found:document').toResponse();
  }

  // Note: Permission checking is now handled by Convex documents.get function
  // which already verifies the user has access to this document

  return Response.json([document], { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('not_found:document').toResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  let existingDocument = null;
  
  try {
    existingDocument = await convexQueries.getDocumentsById({ id });
  } catch (error: any) {
    // If the error is due to invalid ID format, we'll create a new document instead
    if (!error?.message?.includes('Value does not match validator')) {
      throw error; // Re-throw non-validation errors
    }
    console.log('Document ID format error during POST, will create new document:', { id });
  }

  if (existingDocument) {
    // Get the Convex user ID corresponding to the Clerk user ID
    const convexUser = await convexQueries.getUserByClerkId(session.user.id);
    const convexUserId = convexUser?._id;
    
    if (!convexUserId || existingDocument.userId !== convexUserId) {
      return new ChatSDKError('forbidden:document').toResponse();
    }
  }

  const document = await convexQueries.saveDocument({
    title,
    content,
    kind,
    userId: session.user.id,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const timestamp = searchParams.get('timestamp');

  if (!id) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is required.',
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter timestamp is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  let document = null;
  
  try {
    document = await convexQueries.getDocumentsById({ id });
  } catch (error: any) {
    // If the error is due to invalid ID format (UUID vs Convex ID), provide helpful message
    if (error?.message?.includes('Value does not match validator')) {
      console.log('Document ID format error during DELETE:', { id, error: error.message });
      return new ChatSDKError(
        'bad_request:api', 
        `Invalid document ID format. Expected Convex ID but received: ${id}`
      ).toResponse();
    }
    throw error; // Re-throw other errors
  }

  if (!document) {
    return new ChatSDKError('not_found:document').toResponse();
  }

  // Get the Convex user ID corresponding to the Clerk user ID  
  const convexUser = await convexQueries.getUserByClerkId(session.user.id);
  const convexUserId = convexUser?._id;
  
  if (!convexUserId || document.userId !== convexUserId) {
    return new ChatSDKError('forbidden:document').toResponse();
  }

  // For now, delete the entire document
  // TODO: Implement timestamp-based deletion in Convex
  const documentsDeleted = await convexQueries.deleteDocumentById({ id });

  return Response.json(documentsDeleted, { status: 200 });
}
