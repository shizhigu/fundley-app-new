import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/../convex/_generated/api';

// Server-side Convex HTTP client for API routes
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Adapter functions to match existing query interface
export const convexQueries = {
  // User queries
  async getUser(email: string) {
    const users = await convexClient.query(api.users.getCurrentUser);
    return users ? [users] : [];
  },

  async createUser(data: {
    email: string;
    clerkUserId: string;
    clerkOrganizationId?: string;
  }) {
    return await convexClient.mutation(api.users.store);
  },

  // Chat queries
  async getChatById({ id }: { id: string }) {
    return await convexClient.query(api.chats.get, { id: id as any });
  },

  async saveChat(data: {
    id: string;
    userId: string;
    title: string;
    visibility: 'private' | 'public';
  }) {
    return await convexClient.mutation(api.chats.create, {
      title: data.title,
      visibility: data.visibility,
    });
  },

  async deleteChatById({ id }: { id: string }) {
    return await convexClient.mutation(api.chats.remove, { id: id as any });
  },

  async getChatsByUserId({ id }: { id: string }) {
    return await convexClient.query(api.chats.list);
  },

  // Message queries  
  async getMessagesByChatId({ id }: { id: string }) {
    return await convexClient.query(api.messages.list, { chatId: id as any });
  },

  async saveMessages({ messages }: { 
    messages: Array<{
      id: string;
      chatId: string;
      role: 'user' | 'assistant' | 'system';
      parts: any;
      attachments: any[];
      createdAt: Date;
    }>;
  }) {
    const results = [];
    for (const message of messages) {
      const result = await convexClient.mutation(api.messages.create, {
        chatId: message.chatId as any,
        role: message.role,
        parts: message.parts,
        attachments: message.attachments,
      });
      results.push(result);
    }
    return results;
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

  // Document queries
  async saveDocument(data: {
    title: string;
    content?: string;
    kind: 'text' | 'code';
    userId: string;
  }) {
    return await convexClient.mutation(api.documents.create, {
      title: data.title,
      content: data.content,
      kind: data.kind,
    });
  },

  async getDocumentsById({ id }: { id: string }) {
    return await convexClient.query(api.documents.get, { id: id as any });
  },

  async getDocumentsByUserId({ userId }: { userId: string }) {
    return await convexClient.query(api.documents.list);
  },

  async updateDocumentById(
    { id }: { id: string },
    updates: {
      title?: string;
      content?: string;
    }
  ) {
    return await convexClient.mutation(api.documents.update, {
      id: id as any,
      ...updates,
    });
  },

  async deleteDocumentById({ id }: { id: string }) {
    return await convexClient.mutation(api.documents.remove, { id: id as any });
  },

  // Stream queries
  async createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
    return await convexClient.mutation(api.streams.create, {
      chatId: chatId as any,
      data: { streamId },
    });
  },

  // Vote queries
  async voteMessage({ 
    messageId, 
    chatId, 
    isUpvote 
  }: { 
    messageId: string; 
    chatId: string; 
    isUpvote: boolean; 
  }) {
    return await convexClient.mutation(api.votes.create, {
      messageId: messageId as any,
      chatId: chatId as any,
      isUpvote,
    });
  },

  async getVotesByChatId({ chatId }: { chatId: string }) {
    return await convexClient.query(api.votes.listByChat, { chatId: chatId as any });
  },

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
      dataHash,
      result,
    });
  },

  async getVisualizationCacheByMessageId(messageId: string) {
    const cacheEntries = await convexClient.query(api.visualizationCache.getByMessage, { 
      messageId: messageId as any 
    });
    return cacheEntries.length > 0 ? cacheEntries[0] : null;
  },
};

export default convexClient;