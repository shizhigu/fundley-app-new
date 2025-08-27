-- ============================================================================
-- FUNDLEY DATABASE INITIALIZATION
-- ============================================================================
-- This script creates all tables for the Fundley AI Chatbot application
-- Combines Vercel Chatbot template features with multi-tenant financial support
--
-- ORGANIZATION MODE FLEXIBILITY:
-- - User.organizationId is NULLABLE for future flexibility
-- - Currently enforced at application level (not DB constraint)
-- - To switch modes: Change ENFORCE_ORGANIZATION_MODE in webhook handler
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE CHATBOT TABLES (From Vercel template)
-- ============================================================================

-- User table with Clerk integration
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "clerkUserId" VARCHAR(255) NOT NULL UNIQUE, -- Clerk user ID (e.g., user_xxx)
    "email" VARCHAR(255) NOT NULL,
    "clerkOrganizationId" VARCHAR(255), -- NULLABLE - Clerk org ID (e.g., org_xxx)
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for User table
CREATE INDEX IF NOT EXISTS "user_clerk_user_id_idx" ON "User"("clerkUserId");
CREATE INDEX IF NOT EXISTS "user_clerk_org_id_idx" ON "User"("clerkOrganizationId");

-- Chat table - Personal research space
CREATE TABLE IF NOT EXISTS "Chat" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    "title" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "visibility" VARCHAR DEFAULT 'private' NOT NULL CHECK ("visibility" IN ('public', 'private')),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Index for Chat table
CREATE INDEX IF NOT EXISTS "chat_user_id_idx" ON "Chat"("userId");

-- Message table v2 - Supports multimodal content
CREATE TABLE IF NOT EXISTS "Message_v2" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" UUID NOT NULL,
    "role" VARCHAR NOT NULL,
    "parts" JSONB NOT NULL,
    "attachments" JSONB NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE
);

-- Index for Message table
CREATE INDEX IF NOT EXISTS "message_chat_id_idx" ON "Message_v2"("chatId");

-- Vote table v2 - Message feedback
CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "chatId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "isUpvoted" BOOLEAN NOT NULL,
    PRIMARY KEY ("chatId", "messageId"),
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE,
    FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE
);

-- Document table - Artifact system
CREATE TABLE IF NOT EXISTS "Document" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "kind" VARCHAR DEFAULT 'text' NOT NULL CHECK ("kind" IN ('text', 'code', 'image', 'sheet')),
    "userId" UUID NOT NULL,
    PRIMARY KEY ("id", "createdAt"),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Index for Document table
CREATE INDEX IF NOT EXISTS "document_user_id_idx" ON "Document"("userId");

-- Suggestion table - Document collaboration
CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "documentId" UUID NOT NULL,
    "documentCreatedAt" TIMESTAMP NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "description" TEXT,
    "isResolved" BOOLEAN DEFAULT FALSE NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document"("id", "createdAt") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Stream table - Real-time streaming
CREATE TABLE IF NOT EXISTS "Stream" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE
);

-- ============================================================================
-- MULTI-TENANT ORGANIZATION TABLES
-- ============================================================================

-- Organization table - Core tenant entity
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, -- Internal UUID
    "clerkOrganizationId" VARCHAR(255) NOT NULL UNIQUE, -- Clerk org ID (e.g., org_xxx)
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) UNIQUE,
    "settings" JSONB DEFAULT '{}' NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for Organization table
CREATE INDEX IF NOT EXISTS "org_clerk_org_id_idx" ON "Organization"("clerkOrganizationId");
CREATE INDEX IF NOT EXISTS "org_slug_idx" ON "Organization"("slug");

-- Note: User.clerkOrganizationId references Clerk's organization ID directly
-- No foreign key constraint as it references external system

-- Organization Members table (for future many-to-many relationships)
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" VARCHAR(50) DEFAULT 'member' NOT NULL,
    "joinedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY ("userId", "organizationId"),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Indexes for OrganizationMember table
CREATE INDEX IF NOT EXISTS "org_member_user_idx" ON "OrganizationMember"("userId");
CREATE INDEX IF NOT EXISTS "org_member_org_idx" ON "OrganizationMember"("organizationId");

-- ============================================================================
-- FINANCIAL DOMAIN TABLES
-- ============================================================================

-- Position table - Portfolio positions with JSONB flexibility
CREATE TABLE IF NOT EXISTS "Position" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" UUID NOT NULL,
    "data" JSONB NOT NULL, -- Flexible position data
    "metadata" JSONB DEFAULT '{}' NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Indexes for Position table
CREATE INDEX IF NOT EXISTS "position_org_id_idx" ON "Position"("organizationId");
CREATE INDEX IF NOT EXISTS "position_created_by_idx" ON "Position"("createdBy");
-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS "position_data_gin" ON "Position" USING GIN ("data");

-- OrgData table - Generic organizational data storage
CREATE TABLE IF NOT EXISTS "OrgData" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL, -- portfolio, report, metric, etc.
    "data" JSONB NOT NULL, -- Flexible data structure
    "metadata" JSONB DEFAULT '{}' NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL
);

-- Indexes for OrgData table
CREATE INDEX IF NOT EXISTS "org_data_org_type_idx" ON "OrgData"("organizationId", "type");
CREATE INDEX IF NOT EXISTS "org_data_created_by_idx" ON "OrgData"("createdBy");
-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS "org_data_data_gin" ON "OrgData" USING GIN ("data");

-- ============================================================================
-- DEPRECATED TABLES (For backward compatibility, will be removed)
-- ============================================================================

-- Message v1 - deprecated
CREATE TABLE IF NOT EXISTS "Message" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" UUID NOT NULL,
    "role" VARCHAR NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE
);

-- Vote v1 - deprecated
CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "isUpvoted" BOOLEAN NOT NULL,
    PRIMARY KEY ("chatId", "messageId"),
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE,
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

-- ============================================================================
-- HELPFUL COMMENTS FOR FUTURE MIGRATIONS
-- ============================================================================

-- To switch from ENFORCED to OPTIONAL organization mode:
-- 1. No database changes needed (organizationId is already nullable)
-- 2. Change ENFORCE_ORGANIZATION_MODE = false in webhook handler
-- 3. Update middleware.ts to allow personal users on certain routes

-- To add Row Level Security (RLS) in the future:
-- ALTER TABLE "Position" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "org_isolation" ON "Position"
--   FOR ALL
--   USING ("organizationId" = current_setting('app.current_org_id')::uuid);

-- Example Position data structure:
-- {
--   "ticker": "AAPL",
--   "cusip": "037833100",
--   "shares": 10000,
--   "cost_basis": 1500000,
--   "current_value": 1800000,
--   "portfolio": "Growth Fund",
--   "asset_class": "Equity"
-- }

-- Example OrgData for different types:
-- type: "portfolio" -> {"name": "Growth Fund", "aum": 100000000}
-- type: "report" -> {"title": "Monthly Report", "content": "..."}
-- type: "metric" -> {"name": "Sharpe Ratio", "value": 1.5}