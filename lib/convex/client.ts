import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// Server-side Convex HTTP client for API routes
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Adapter functions to match existing query interface
export const convexQueries = {
  // User queries
  async getUser(email: string) {
    const users = await convexClient.query(api.users.getCurrentUser);
    return users ? [users] : [];
  },

  async getUserByClerkId(clerkUserId: string) {
    return await convexClient.query(api.users.getByClerkUserId, { clerkUserId });
  },

  async createUser(data: {
    email: string;
    clerkUserId: string;
    clerkOrganizationId?: string;
  }) {
    return await convexClient.mutation(api.users.store);
  },

  // Permanent Chat queries (removed - using direct message-based architecture)

  // Message queries for permanent chat
  async getMessagesByUserId() {
    return await convexClient.query(api.messages.listForPersistentChat);
  },

  async saveMessages({ messages }: { 
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      parts: any;
      attachments: any[];
      createdAt: Date;
    }>;
  }) {
    // DEPRECATED: This function requires a chatId but is being used for backwards compatibility
    // For now, just return null since the new architecture requires explicit chat contexts
    console.warn('saveMessages is deprecated - use chat-based message creation');
    return null;
  },

  async deleteAllMessagesForUser() {
    // DEPRECATED: This function requires a chatId but is being used for backwards compatibility
    console.warn('deleteAllMessagesForUser is deprecated - use chat-based message deletion');
    return null;
  },

  async getMessageCountByUserId({ 
    id, 
    differenceInHours 
  }: { 
    id: string; 
    differenceInHours: number; 
  }) {
    // For now, return 0 to allow all messages
    // TODO: Implement proper message counting with time filtering
    return 0;
  },

  // Document functions removed (Vercel AI SDK legacy feature)

  // Stream queries for permanent chat
  async createStreamId({ streamId }: { streamId: string }) {
    return await convexClient.mutation(api.streams.create, {
      streamId,
    });
  },

  // Vote functionality removed

  // Organization queries
  async getOrganizations() {
    return await convexClient.query(api.organizations.list);
  },

  async createOrganization(data: {
    clerkOrganizationId: string;
    name: string;
    slug: string;
    settings?: any;
  }) {
    return await convexClient.mutation(api.organizations.create, {
      name: data.name,
      slug: data.slug,
      clerkOrganizationId: data.clerkOrganizationId,
    });
  },

  async updateUserOrganization(clerkUserId: string, clerkOrganizationId: string) {
    // For now, this is a no-op since Convex users.store() handles this
    // The users.store() function automatically syncs organization membership
    return Promise.resolve();
  },

  async removeUserFromOrganization(clerkUserId: string) {
    // For now, this is a no-op
    // In the future, could implement organization membership removal
    return Promise.resolve();
  },

  // Visualization cache queries
  async getVisualizationCache({ dataHash }: { dataHash: string }) {
    return await convexClient.query(api.visualizationCache.getByDataHash, { dataHash });
  },

  async saveVisualizationCache(data: {
    messageId: string;
    title?: string;
    code?: string;
    htmlContent?: string;
    imageUrl?: string;
    dataHash?: string;
    result?: any;
  }) {
    const dataHash = data.dataHash || JSON.stringify({ title: data.title, code: data.code });
    const result = data.result || { title: data.title, code: data.code, htmlContent: data.htmlContent, imageUrl: data.imageUrl };
    
    return await convexClient.mutation(api.visualizationCache.create, {
      messageId: data.messageId as any,
      visualizationType: data.title || 'generic',
      visualizationData: result,
      visualizationSpec: result,
      dataHash,
    });
  },

  async getVisualizationCacheByMessageId(messageId: string) {
    const cacheEntries = await convexClient.query(api.visualizationCache.getByMessage, { 
      messageId: messageId as any 
    });
    return cacheEntries.length > 0 ? cacheEntries[0] : null;
  },

  // Additional methods needed by actions.ts
  async getMessageById({ id }: { id: string }) {
    return await convexClient.query(api.messages.get, { id: id as any });
  },

  async deleteMessagesAfterTimestamp({
    timestamp,
  }: {
    timestamp: number;
  }) {
    // DEPRECATED: This function requires a chatId but is being used for backwards compatibility
    console.warn('removeMessagesAfterTimestamp is deprecated - use chat-based message deletion');
    return null;
  },
};

export default convexClient;