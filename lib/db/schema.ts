import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

/**
 * FUNDLEY DATABASE SCHEMA
 * =======================
 * This schema combines the powerful Vercel Chatbot template features
 * with multi-tenant support for financial organizations.
 * 
 * ORGANIZATION MODE FLEXIBILITY:
 * ==============================
 * - User.organizationId is NULLABLE for flexibility
 * - Currently enforced at business logic level (not DB constraint)
 * - To switch modes: Change ENFORCE_ORGANIZATION_MODE in webhook handler
 * - No database migrations needed to support personal users later
 */

// ============================================================================
// CORE CHATBOT TABLES (Preserved from Vercel template)
// ============================================================================

/**
 * User table
 * IMPORTANT: organizationId is NULLABLE for future flexibility
 * - In ENFORCED mode: Business logic ensures all users have an org
 * - In OPTIONAL mode: Personal users have organizationId = null
 */
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  clerkUserId: varchar('clerkUserId', { length: 255 }).notNull().unique(), // Clerk user ID (e.g., user_xxx)
  email: varchar('email', { length: 255 }).notNull(),
  clerkOrganizationId: varchar('clerkOrganizationId', { length: 255 }), // NULLABLE - Clerk org ID (e.g., org_xxx)
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  clerkUserIdIdx: index('user_clerk_user_id_idx').on(table.clerkUserId),
  clerkOrgIdIdx: index('user_clerk_org_id_idx').on(table.clerkOrganizationId),
}));

export type User = InferSelectModel<typeof user>;

/**
 * Chat table - Personal research space
 * NOTE: No organizationId - chats are always personal
 * This ensures research privacy and independence
 */
export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
}, (table) => ({
  userIdIdx: index('chat_user_id_idx').on(table.userId),
}));

export type Chat = InferSelectModel<typeof chat>;

/**
 * Message table (v2) - Supports multimodal content
 * Powerful feature from template - fully preserved
 */
export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(), // Multipart messages
  attachments: json('attachments').notNull(), // File attachments
  createdAt: timestamp('createdAt').notNull(),
}, (table) => ({
  chatIdIdx: index('message_chat_id_idx').on(table.chatId),
}));

export type DBMessage = InferSelectModel<typeof message>;

/**
 * Visualization Cache table - Stores rendered visualization output
 * Avoids re-executing Python code on every page load
 */
export const visualizationCache = pgTable('VisualizationCache', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  messageId: uuid('messageId')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  title: text('title'),
  code: text('code').notNull(),
  htmlContent: text('htmlContent'), // Plotly HTML output
  imageUrl: text('imageUrl'),       // Matplotlib image URL or base64
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  messageIdIdx: index('viz_cache_message_id_idx').on(table.messageId),
}));

export type VisualizationCache = InferSelectModel<typeof visualizationCache>;

/**
 * Vote table (v2) - Message feedback system
 * Preserved for future ML training data
 */
export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

/**
 * Document table - Artifact system for code/text/image/sheet
 * One of the most powerful features - fully preserved
 * Future: Can add organizationId for sharing
 */
export const document = pgTable(
  'Document',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('kind', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    // Future: organizationId for shared documents
  },
  (table) => ({
    userIdIdx: index('document_user_id_idx').on(table.userId),
  }),
);

export type Document = InferSelectModel<typeof document>;

/**
 * Suggestion table - Document collaboration feature
 * Preserved for future collaborative features
 */
export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => document.id),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('suggestion_document_id_idx').on(table.documentId),
    userIdIdx: index('suggestion_user_id_idx').on(table.userId),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

/**
 * Stream table - Real-time streaming management
 * Critical for AI response streaming - preserved
 */
export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================================================
// MULTI-TENANT ORGANIZATION TABLES (New for Fundley)
// ============================================================================

/**
 * Organization table - Core tenant entity
 * Settings stored as JSONB for maximum flexibility
 */
export const organization = pgTable('Organization', {
  id: uuid('id').primaryKey().notNull().defaultRandom(), // Internal UUID
  clerkOrganizationId: varchar('clerkOrganizationId', { length: 255 }).notNull().unique(), // Clerk org ID (e.g., org_xxx)
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  settings: json('settings').notNull().default({}), // Flexible settings
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  clerkOrgIdIdx: index('org_clerk_org_id_idx').on(table.clerkOrganizationId),
  slugIdx: index('org_slug_idx').on(table.slug),
}));

export type Organization = InferSelectModel<typeof organization>;

/**
 * Organization Members table
 * For future many-to-many relationships and role management
 * Currently not used (User.organizationId is used instead)
 * Preserved for future expansion
 */
export const organizationMember = pgTable(
  'OrganizationMember',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organization.id),
    role: varchar('role', { length: 50 }).notNull().default('member'),
    joinedAt: timestamp('joinedAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.organizationId] }),
    userIdIdx: index('org_member_user_idx').on(table.userId),
    orgIdIdx: index('org_member_org_idx').on(table.organizationId),
  }),
);

export type OrganizationMember = InferSelectModel<typeof organizationMember>;

// ============================================================================
// FINANCIAL DOMAIN TABLES (Fundley-specific)
// ============================================================================

/**
 * Position table - Portfolio positions
 * JSONB for maximum flexibility during MVP
 * Can store stocks, bonds, derivatives, alternatives, etc.
 */
export const position = pgTable('Position', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  organizationId: uuid('organizationId')
    .notNull()
    .references(() => organization.id),
  /**
   * Example data structure:
   * {
   *   ticker: "AAPL",
   *   cusip: "037833100",
   *   shares: 10000,
   *   cost_basis: 1500000,
   *   current_value: 1800000,
   *   portfolio: "Growth Fund",
   *   asset_class: "Equity",
   *   custom_fields: {...}
   * }
   */
  data: json('data').notNull(),
  metadata: json('metadata').notNull().default({}), // Tags, permissions, etc.
  createdBy: uuid('createdBy')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: index('position_org_id_idx').on(table.organizationId),
  createdByIdx: index('position_created_by_idx').on(table.createdBy),
  // GIN index for JSONB queries - add in migration
}));

export type Position = InferSelectModel<typeof position>;

/**
 * OrgData table - Generic organizational data storage
 * Ultimate flexibility for MVP - can store anything
 * Types: portfolio, report, metric, benchmark, etc.
 */
export const orgData = pgTable('OrgData', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  organizationId: uuid('organizationId')
    .notNull()
    .references(() => organization.id),
  type: varchar('type', { length: 50 }).notNull(), // Data type identifier
  /**
   * Example types and data:
   * - type: "portfolio" -> { name: "Growth Fund", aum: 100000000, ... }
   * - type: "report" -> { title: "Monthly Report", content: "...", ... }
   * - type: "metric" -> { name: "Sharpe Ratio", value: 1.5, ... }
   */
  data: json('data').notNull(),
  metadata: json('metadata').notNull().default({}),
  createdBy: uuid('createdBy')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  orgTypeIdx: index('org_data_org_type_idx').on(table.organizationId, table.type),
  createdByIdx: index('org_data_created_by_idx').on(table.createdBy),
  // GIN index for JSONB queries - add in migration
}));

export type OrgData = InferSelectModel<typeof orgData>;

// ============================================================================
// DEPRECATED TABLES (Keep for reference, will be removed)
// ============================================================================

// Message v1 - deprecated
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

// Vote v1 - deprecated
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;