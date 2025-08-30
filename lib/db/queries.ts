import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  organization,
  type Organization,
  visualizationCache,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ============================================================================
// USER QUERIES
// ============================================================================

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Database error in getUser:', error);
    console.error('Trying to find user with email:', email);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  try {
    const users = await db.select().from(user).where(eq(user.clerkUserId, clerkUserId));
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Database error in getUserByClerkId:', error);
    throw new ChatSDKError(
      'bad_request:database', 
      'Failed to get user by Clerk ID',
    );
  }
}

export async function createUser(email: string, clerkUserId: string) {
  try {
    const [newUser] = await db.insert(user).values({
      email,
      clerkUserId,
    }).returning();

    return newUser;
  } catch (error) {
    console.error('Database error in createUser:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

// ============================================================================
// ORGANIZATION QUERIES
// ============================================================================

export async function createOrganization({
  clerkOrganizationId,
  name,
  slug,
}: {
  clerkOrganizationId: string;
  name: string;
  slug: string;
}): Promise<Organization> {
  try {
    const [newOrg] = await db.insert(organization).values({
      clerkOrganizationId,
      name,
      slug,
    }).returning();
    
    return newOrg;
  } catch (error) {
    console.error('Database error in createOrganization:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create organization'
    );
  }
}

export async function updateUserOrganization(clerkUserId: string, clerkOrganizationId: string) {
  try {
    return await db
      .update(user)
      .set({ 
        clerkOrganizationId,
        updatedAt: new Date(),
      })
      .where(eq(user.clerkUserId, clerkUserId))
      .returning();
  } catch (error) {
    console.error('Database error in updateUserOrganization:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update user organization'
    );
  }
}

export async function removeUserFromOrganization(clerkUserId: string) {
  try {
    return await db
      .update(user)
      .set({ 
        clerkOrganizationId: null,
        updatedAt: new Date(),
      })
      .where(eq(user.clerkUserId, clerkUserId))
      .returning();
  } catch (error) {
    console.error('Database error in removeUserFromOrganization:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to remove user from organization'
    );
  }
}

export async function getOrganizationByClerkId(clerkOrganizationId: string): Promise<Organization | null> {
  try {
    const orgs = await db.select().from(organization).where(eq(organization.clerkOrganizationId, clerkOrganizationId));
    return orgs.length > 0 ? orgs[0] : null;
  } catch (error) {
    console.error('Database error in getOrganizationByClerkId:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get organization by Clerk ID',
    );
  }
}

// ============================================================================
// CHAT QUERIES  
// ============================================================================

export async function saveChat({
  id,
  userId,
  title,
  visibility = 'private',
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: VisibilityType;
}) {
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set({
          title,
          visibility,
          updatedAt: new Date(),
        })
        .where(eq(chat.id, id))
        .returning();
    }

    return await db
      .insert(chat)
      .values({
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        title,
        visibility,
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id)).returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
}: {
  id: string;
}): Promise<Array<Chat>> {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages).returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const [selectedMessage] = await db
      .select()
      .from(message)
      .where(eq(message.id, id));
    return selectedMessage;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by id after timestamp',
    );
  }
}

// ============================================================================
// VOTE QUERIES
// ============================================================================

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      const updatedVote = await db
        .update(vote)
        .set({
          isUpvoted: type === 'up' ? true : false,
        })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
        .returning();

      return updatedVote[0];
    }

    const newVote = await db
      .insert(vote)
      .values({
        chatId,
        messageId,
        isUpvoted: type === 'up' ? true : false,
      })
      .returning();

    return newVote[0];
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

export async function saveDocument({
  id,
  title,
  content,
  userId,
  kind,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
  kind: ArtifactKind;
}) {
  try {
    const selectedDocument = await db.select().from(document).where(eq(document.id, id));

    if (selectedDocument.length > 0) {
      return await db
        .update(document)
        .set({
          title,
          content,
          updatedAt: new Date(),
        })
        .where(eq(document.id, id))
        .returning();
    }

    return await db
      .insert(document)
      .values({
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        title,
        content,
        kind,
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save document',
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const selectedDocuments = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocuments;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

// ============================================================================
// CHAT UTILITIES
// ============================================================================

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  try {
    return await db
      .update(chat)
      .set({
        visibility,
        updatedAt: new Date(),
      })
      .where(eq(chat.id, chatId))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    let query = db
      .select({ count: count() })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(eq(chat.userId, userId));

    if (startDate) {
      query = query.where(and(gte(message.createdAt, startDate)));
    }

    if (endDate) {
      query = query.where(and(lt(message.createdAt, endDate)));
    }

    const [result] = await query;
    return result.count;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

// ============================================================================
// STREAM QUERIES  
// ============================================================================

export async function createStreamId({
  id,
  chatId,
}: {
  id: string;
  chatId: string;
}) {
  try {
    return await db.insert(stream).values({
      id,
      chatId,
      createdAt: new Date(),
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    return await db.select().from(stream).where(eq(stream.chatId, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// ============================================================================
// VISUALIZATION CACHE QUERIES
// ============================================================================

export async function saveVisualizationCache({
  messageId,
  visualizationType,
  visualizationData,
  visualizationSpec,
  dataHash,
}: {
  messageId: string;
  visualizationType: string;
  visualizationData: any;
  visualizationSpec?: any;
  dataHash: string;
}) {
  try {
    const existingCache = await db
      .select()
      .from(visualizationCache)
      .where(
        and(
          eq(visualizationCache.messageId, messageId),
          eq(visualizationCache.dataHash, dataHash)
        )
      );

    if (existingCache.length > 0) {
      return existingCache[0];
    }

    const [newCache] = await db
      .insert(visualizationCache)
      .values({
        messageId,
        visualizationType,
        visualizationData,
        visualizationSpec: visualizationSpec || null,
        dataHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newCache;
  } catch (error) {
    console.error('Database error in saveVisualizationCache:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save visualization cache',
    );
  }
}

export async function getVisualizationCacheByMessageId(messageId: string) {
  try {
    return await db
      .select()
      .from(visualizationCache)
      .where(eq(visualizationCache.messageId, messageId));
  } catch (error) {
    console.error('Database error in getVisualizationCacheByMessageId:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visualization cache by message id',
    );
  }
}

export async function getVisualizationCachesByChat(chatId: string) {
  try {
    return await db
      .select()
      .from(visualizationCache)
      .innerJoin(message, eq(visualizationCache.messageId, message.id))
      .where(eq(message.chatId, chatId))
      .orderBy(desc(visualizationCache.createdAt));
  } catch (error) {
    console.error('Database error in getVisualizationCachesByChat:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visualization caches by chat id',
    );
  }
}