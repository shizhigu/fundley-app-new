// Type compatibility layer for Convex migration
// This file provides TypeScript types that match the old Drizzle schema for existing components

export interface User {
  _id: string;
  email: string;
  clerkUserId: string;
  clerkOrganizationId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  clerkOrganizationId: string;
  settings: any;
  createdAt: number;
  updatedAt: number;
}

export interface Chat {
  _id: string;
  title: string;
  userId: string;
  visibility: 'private' | 'public';
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  _id: string;
  id?: string; // For backward compatibility
  chatId: string; // Messages belong to specific chats in Convex
  role: 'user' | 'assistant' | 'system';
  parts: any;
  attachments: any;
  extractedMetadata?: any; // Cached metadata (tickers, suggestions, verification)
  createdAt: number;
}

export interface Stream {
  _id: string;
  chatId: string;
  createdAt: number;
}

export interface VisualizationCache {
  _id: string;
  messageId: string;
  visualizationType: string;
  visualizationData: any;
  visualizationSpec?: any;
  dataHash: string;
  createdAt: number;
  updatedAt: number;
}

// Analysis Blocks (Notebook-based workflow)
export interface AnalysisBlock {
  id: string;
  userId: string;

  // Mixed approach: Independent storage with source tracking
  sourceChatId?: string;
  createdInMessageId?: string;

  // Notebook workflow
  title: string;
  notebookPath?: string;

  // Metadata for organization and discovery
  symbols?: string[];
  tags?: string[];
  description?: string;

  // Template features
  isTemplate: boolean;
  templateCategory?: string;

  // Flexible content (JSONB)
  content?: any;

  // Legacy field for backward compatibility
  chatId?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;

  // Resolved relationships
  sourceChat?: {
    id: string;
    title: string;
  };
}

// Block references for knowledge graph (Phase 3)
export interface BlockReference {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  referenceType?: string;
  createdAt: string;
}

// Legacy types for backward compatibility
export interface Suggestion {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  isResolved: boolean;
  userId?: string;
  createdAt?: Date;
  documentCreatedAt?: Date;
}