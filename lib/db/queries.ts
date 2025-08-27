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
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  organization,
  type Organization,
  organizationMember,
  position,
  orgData,
  visualizationCache,
  type VisualizationCache,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Database error in getUser:', error);
    console.error('Trying to find user with email:', email);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  try {
    const [dbUser] = await db.select().from(user).where(eq(user.clerkUserId, clerkUserId));
    return dbUser || null;
  } catch (error) {
    console.error('Database error in getUserByClerkId:', error);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to get user by Clerk ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function createUser(email: string, clerkUserId: string) {
  try {
    return await db.insert(user).values({ 
      email, 
      clerkUserId,
      clerkOrganizationId: null, // Explicitly set to null initially
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
  } catch (error) {
    console.error('Database error creating user:', error);
    throw new ChatSDKError('bad_request:database', `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Guest user functionality is removed as Clerk handles all authentication
// If guest access is needed, consider using Clerk's anonymous auth or public routes

// ============================================================================
// ORGANIZATION QUERIES (New for multi-tenant support)
// ============================================================================

/**
 * Create a new organization
 * Called from Clerk webhook when organization is created
 */
export async function createOrganization({
  clerkOrganizationId,
  name,
  slug,
  settings = {},
}: {
  clerkOrganizationId: string;
  name: string;
  slug?: string;
  settings?: any;
}) {
  try {
    return await db.insert(organization).values({
      clerkOrganizationId,
      name,
      slug: slug || null,
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  } catch (error) {
    console.error('Database error creating organization:', error);
    throw new ChatSDKError('bad_request:database', `Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update user's organization
 * IMPORTANT: In ENFORCED mode, this is called when user joins org
 * In OPTIONAL mode (future), this would be optional
 */
export async function updateUserOrganization(clerkUserId: string, clerkOrganizationId: string) {
  try {
    return await db
      .update(user)
      .set({ 
        clerkOrganizationId,
        updatedAt: new Date() 
      })
      .where(eq(user.clerkUserId, clerkUserId));
  } catch (error) {
    console.error('Database error updating user organization:', error);
    console.error('ClerkUserId:', clerkUserId, 'ClerkOrganizationId:', clerkOrganizationId);
    throw new ChatSDKError('bad_request:database', `Failed to update user organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Remove user from organization
 * Only used in OPTIONAL mode (when personal users are allowed)
 */
export async function removeUserFromOrganization(clerkUserId: string) {
  try {
    return await db
      .update(user)
      .set({ 
        clerkOrganizationId: null,
        updatedAt: new Date() 
      })
      .where(eq(user.clerkUserId, clerkUserId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to remove user from organization');
  }
}

/**
 * Get organization by Clerk ID
 */
export async function getOrganizationByClerkId(clerkOrganizationId: string): Promise<Organization | null> {
  try {
    const [org] = await db.select().from(organization).where(eq(organization.clerkOrganizationId, clerkOrganizationId));
    return org || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get organization');
  }
}

// ============================================================================
// POSITION QUERIES (Financial data)
// ============================================================================

/**
 * Create a new position
 */
export async function createPosition({
  organizationId,
  data,
  metadata = {},
  createdBy,
}: {
  organizationId: string;
  data: any;
  metadata?: any;
  createdBy: string;
}) {
  try {
    return await db.insert(position).values({
      organizationId,
      data,
      metadata,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create position');
  }
}

/**
 * Get positions by organization
 */
export async function getPositionsByOrganization(organizationId: string) {
  try {
    return await db
      .select()
      .from(position)
      .where(eq(position.organizationId, organizationId))
      .orderBy(desc(position.updatedAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get positions');
  }
}

// ============================================================================
// GENERIC ORG DATA QUERIES (Flexible business data)
// ============================================================================

/**
 * Create generic org data
 */
export async function createOrgData({
  organizationId,
  type,
  data,
  metadata = {},
  createdBy,
}: {
  organizationId: string;
  type: string;
  data: any;
  metadata?: any;
  createdBy: string;
}) {
  try {
    return await db.insert(orgData).values({
      organizationId,
      type,
      data,
      metadata,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create org data');
  }
}

/**
 * Get org data by type
 */
export async function getOrgDataByType(organizationId: string, type: string) {
  try {
    return await db
      .select()
      .from(orgData)
      .where(
        and(
          eq(orgData.organizationId, organizationId),
          eq(orgData.type, type)
        )
      )
      .orderBy(desc(orgData.updatedAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get org data');
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
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

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
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
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
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

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const createdAt = new Date();
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt,
      })
      .onConflictDoUpdate({
        // Handle conflict on composite primary key
        target: [document.id],
        set: {
          title,
          kind,
          content,
          userId,
        }
      })
      .returning();
  } catch (error) {
    console.error('Error saving document:', error);
    // Log the actual error for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw new ChatSDKError('bad_request:database', `Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

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
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.createdAt, timestamp),
        ),
      );

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

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
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
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
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
  title,
  code,
  htmlContent,
  imageUrl,
}: {
  messageId: string;
  title?: string;
  code: string;
  htmlContent?: string;
  imageUrl?: string;
}) {
  try {
    const [cache] = await db
      .insert(visualizationCache)
      .values({
        messageId,
        title,
        code,
        htmlContent,
        imageUrl,
      })
      .onConflictDoUpdate({
        target: [visualizationCache.messageId],
        set: {
          title,
          code,
          htmlContent,
          imageUrl,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return cache;
  } catch (error) {
    console.error('Failed to save visualization cache:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to save visualization cache');
  }
}

export async function getVisualizationCacheByMessageId(messageId: string) {
  try {
    const [cache] = await db
      .select()
      .from(visualizationCache)
      .where(eq(visualizationCache.messageId, messageId))
      .limit(1);
    
    return cache || null;
  } catch (error) {
    console.error('Failed to get visualization cache:', error);
    return null;
  }
}

export async function getVisualizationCachesByChat(chatId: string) {
  try {
    const caches = await db
      .select({
        cache: visualizationCache,
        messageId: message.id,
      })
      .from(visualizationCache)
      .innerJoin(message, eq(visualizationCache.messageId, message.id))
      .where(eq(message.chatId, chatId))
      .orderBy(asc(visualizationCache.createdAt));
    
    return caches.map(row => row.cache);
  } catch (error) {
    console.error('Failed to get visualization caches by chat:', error);
    return [];
  }
}
