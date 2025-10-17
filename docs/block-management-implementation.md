# Block Management System - Phase 1 Implementation

## Overview

This document describes the implementation of Phase 1 (Contextual View) of the Block Management system based on the progressive disclosure design principle.

## Architecture

### Design Principle

**"用方案 1 的'表象'去迎接用户，用方案 2 的'内核'去服务用户"**

- **UI Layer (方案 1)**: Contextual view shows blocks within current chat (familiar)
- **Data Layer (方案 2)**: Blocks stored independently with source tracking (flexible)

### Database Schema

Extended `analysis_blocks` table with new fields while preserving existing fields for backward compatibility:

**Legacy Fields (preserved)**:
- `chat_id` - Direct chat association (existing workflows)
- `content` - Flexible JSONB storage (existing format)
- `created_at` - Creation timestamp

**New Fields (added in migration 009)**:
- `user_id` - User ownership for notebook workflow
- `source_chat_id` - Optional source tracking for traceability
- `created_in_message_id` - Message that created this block
- `title` - Block title for notebook workflow
- `notebook_path` - Path to `analysis.ipynb` file
- `symbols` - Array of stock symbols (metadata)
- `tags` - Array of user-defined tags (organization)
- `description` - Block description (discovery)
- `is_template` - Template flag (Phase 3)
- `template_category` - Template categorization (Phase 3)
- `updated_at` - Last update timestamp
- `last_accessed_at` - Last access timestamp

**New Table**:
- `block_references` - For knowledge graph (Phase 3)

## Implementation Details

### 1. Database Migration

**File**: `lib/db/migrations/009_extend_analysis_blocks_for_notebook_workflow.sql`

- Added new fields using `ALTER TABLE` (non-destructive)
- Created indexes for efficient querying
- Added trigger for `updated_at` auto-update
- Created `block_references` table for future use

**Status**: ✅ Executed successfully

### 2. Frontend Components

#### State Management

**File**: `stores/block-view-store.ts`

Zustand store managing:
- View mode (`contextual` | `library`)
- Active block ID
- Filters and search state
- Sort preferences

#### UI Components

**File**: `components/block-card.tsx`

Individual block display with:
- Title, description, symbols, tags
- Source chat traceability
- Action menu (reference, duplicate, mark as template, delete)

**File**: `components/contextual-blocks-view.tsx`

Phase 1 main view showing:
- Blocks from current chat
- Empty state guidance
- Block operations (CRUD)
- Real-time fetching

**File**: `components/right-panel-blocks.tsx`

Container component with:
- View mode tabs (Current Chat | Library)
- Phase 2 placeholder (Library disabled for now)

### 3. Backend API

**Files**:
- `app/api/blocks/route.ts` (GET, POST)
- `app/api/blocks/[id]/route.ts` (PATCH, DELETE)
- `app/api/blocks/[id]/duplicate/route.ts` (POST)

**Endpoints**:

- `GET /api/blocks?view=contextual&chatId=xxx` - Get blocks for chat (Phase 1)
- `GET /api/blocks?view=library&search=...` - Get all blocks with filters (Phase 2)
- `POST /api/blocks` - Create new block
- `PATCH /api/blocks/[id]` - Update block
- `DELETE /api/blocks/[id]` - Delete block
- `POST /api/blocks/[id]/duplicate` - Duplicate block

**Features**:
- Supports both `source_chat_id` (new) and `chat_id` (legacy) for queries
- User ownership validation
- Nested response structure with resolved relationships

### 4. TypeScript Types

**File**: `lib/db/schema.ts`

Added interfaces:
- `AnalysisBlock` - Complete block type with all fields
- `BlockReference` - For knowledge graph (Phase 3)

### 5. Python Agent Integration

**File**: `chatbot-service/tools/block_tools.py`

Updated `create_analysis_block` function to:
- Fill `user_id` from `session_state['current_user_id']`
- Set `source_chat_id` = `chat_id` for traceability
- Set `title` from the title parameter
- Generate `notebook_path` if `current_block_id` is in session_state
- Maintain backward compatibility with existing workflows

**Key Changes**:
```python
# Legacy fields (preserved)
chat_id = session_state['current_session_id']

# New fields (added)
user_id = session_state.get('current_user_id')
block_id_from_state = session_state.get('current_block_id')
notebook_path = f"/tmp/fundley/{user_id}/blocks/{block_id_from_state}/analysis.ipynb"

# Insert with both legacy and new fields
INSERT INTO analysis_blocks (
    id, chat_id, content,           -- Legacy
    user_id, source_chat_id, title, notebook_path  -- New
)
```

### 6. Internationalization

**Files**: `messages/zh.json`, `messages/en.json`

Added translations for:
- View mode labels
- Block actions
- Empty states
- Confirmation messages

## Integration Points

### Current State

1. ✅ Database schema extended (migration 009)
2. ✅ Frontend components created
3. ✅ Backend API implemented
4. ✅ TypeScript types defined
5. ✅ Python Agent updated
6. ✅ i18n translations added

### Still Using Existing UI

The existing `AnalysisBlocksPanel` (right panel "Analysis" tab) continues to work as before, showing AI-generated analysis results.

**Reason**: The existing panel is production-ready and serves its purpose. The new `RightPanelBlocks` can be integrated when:
1. We want to expose the contextual/library view switching UI
2. We implement Phase 2 (Library view with search/filter)
3. We add notebook management features to the UI

### To Integrate New UI

Replace the current Analysis tab in `components/right-panel-tabs.tsx`:

```tsx
{activeTab === 'blocks' && (
  <div id="blocks-panel" role="tabpanel" className="h-full">
    {currentChatId ? (
      <RightPanelBlocks chatId={currentChatId} />
    ) : (
      <div className="flex items-center justify-center h-full">
        Select a chat to view analysis blocks
      </div>
    )}
  </div>
)}
```

## Phase Roadmap

### ✅ Phase 1: Contextual View (COMPLETED)

- [x] Database schema extension
- [x] Backend API
- [x] Contextual blocks view
- [x] Basic CRUD operations
- [x] Source chat traceability

### 🚧 Phase 2: Library Discovery (NEXT)

- [ ] Implement `BlockLibraryView` component
- [ ] Advanced search and filtering UI
- [ ] Multi-select and bulk operations
- [ ] Sort and group options
- [ ] Feature flag for progressive disclosure

### 🔮 Phase 3: Expert Features (FUTURE)

- [ ] Template creation workflow
- [ ] Block references and knowledge graph
- [ ] AI-powered block suggestions
- [ ] Advanced analytics (block reuse, popularity)
- [ ] Cross-chat block linking

## Testing Checklist

### Backend

- [ ] Create block via API
- [ ] Fetch blocks for chat (contextual view)
- [ ] Update block fields
- [ ] Delete block
- [ ] Duplicate block
- [ ] Verify both `chat_id` and `source_chat_id` queries work

### Frontend

- [ ] Blocks display in contextual view
- [ ] Empty state shows correctly
- [ ] Block card displays all metadata
- [ ] Action menu works (reference, duplicate, mark as template, delete)
- [ ] View mode tabs render (Library disabled)

### Integration

- [ ] Python Agent creates blocks with new fields
- [ ] `user_id` populated from session_state
- [ ] `source_chat_id` set correctly
- [ ] `notebook_path` generated for notebook workflow
- [ ] Legacy workflow (without block_id) still works

### Migration

- [ ] Existing blocks still display correctly
- [ ] New blocks have all fields populated
- [ ] No data loss during migration
- [ ] Indexes created successfully

## File Structure

```
fundley-app/
├── lib/
│   ├── db/
│   │   ├── schema.ts (updated with new types)
│   │   └── migrations/
│   │       └── 009_extend_analysis_blocks_for_notebook_workflow.sql
│   └── actions/
│       └── analysis-blocks.ts (existing, works with new schema)
├── stores/
│   └── block-view-store.ts (new)
├── components/
│   ├── block-card.tsx (new)
│   ├── contextual-blocks-view.tsx (new)
│   ├── right-panel-blocks.tsx (new)
│   ├── analysis-blocks-panel.tsx (existing, still in use)
│   └── right-panel-tabs.tsx (existing, not modified)
├── app/
│   └── api/
│       └── blocks/
│           ├── route.ts (new)
│           └── [id]/
│               ├── route.ts (new)
│               └── duplicate/
│                   └── route.ts (new)
├── messages/
│   ├── zh.json (updated)
│   └── en.json (updated)
└── chatbot-service/
    └── tools/
        └── block_tools.py (updated)
```

## Key Design Decisions

### 1. Non-Destructive Migration

- Preserved all existing fields (`chat_id`, `content`, `created_at`)
- Added new fields using `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- Ensures zero downtime and backward compatibility

### 2. Dual Field Support

- Queries support both `chat_id` and `source_chat_id`
- Allows gradual migration from old to new workflow
- New blocks populate both fields (`source_chat_id = chat_id`)

### 3. Progressive Disclosure

- Start with contextual view (familiar)
- Library view disabled (Phase 2)
- Feature flag for gradual rollout

### 4. Flexible Content

- Preserved JSONB `content` field for agent flexibility
- New structured fields for UI and querying
- Best of both worlds: flexibility + structure

## Performance Considerations

### Indexes Created

- `idx_analysis_blocks_user_id` - Fast user block queries
- `idx_analysis_blocks_source_chat` - Fast chat block queries
- `idx_analysis_blocks_symbols` (GIN) - Fast symbol searches
- `idx_analysis_blocks_tags` (GIN) - Fast tag searches
- `idx_analysis_blocks_is_template` (filtered) - Fast template queries

### Query Optimization

- Contextual view: Single query by `source_chat_id` or `chat_id`
- Library view: Indexed searches on symbols/tags/text
- Pagination ready (LIMIT clauses in place)

## Security

- All API endpoints require authentication via `auth()`
- User ownership validation on UPDATE/DELETE
- SQL injection prevention via parameterized queries
- No exposed internal IDs in client

## Next Steps

1. **User Testing**: Deploy Phase 1 to staging for user feedback
2. **Monitor Usage**: Track which blocks are accessed, duplicated, templated
3. **Plan Phase 2**: Based on usage patterns, implement Library view features
4. **Documentation**: Update CLAUDE.md with Block management system details

## References

- [Block Architecture Comparison](./block-architecture-comparison.md)
- Design Principle: "Strong Association, Loose Coupling"
- Progressive Disclosure: Entry → Growth → Expert
