import { auth } from '@/lib/auth/clerk';
import type { ArtifactKind } from '@/components/artifact';
import { convexQueries } from '@/lib/convex/client';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter id is missing',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:document').toResponse();
  }

  const document = await convexQueries.getDocumentsById({ id });

  if (!document) {
    return new ChatSDKError('not_found:document').toResponse();
  }

  if (document.userId !== session.user.id) {
    return new ChatSDKError('forbidden:document').toResponse();
  }

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

  const existingDocument = await convexQueries.getDocumentsById({ id });

  if (existingDocument && existingDocument.userId !== session.user.id) {
    return new ChatSDKError('forbidden:document').toResponse();
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

  const document = await convexQueries.getDocumentsById({ id });

  if (!document || document.userId !== session.user.id) {
    return new ChatSDKError('forbidden:document').toResponse();
  }

  // For now, delete the entire document
  // TODO: Implement timestamp-based deletion in Convex
  const documentsDeleted = await convexQueries.deleteDocumentById({ id });

  return Response.json(documentsDeleted, { status: 200 });
}
