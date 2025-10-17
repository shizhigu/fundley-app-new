# Watchlist API Documentation

## Database Schema

```sql
CREATE TABLE watchlist (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    asset_type VARCHAR(20) DEFAULT 'stock' CHECK (asset_type IN ('stock', 'crypto', 'option')),
    added_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    alert_price_high DECIMAL(12, 2),
    alert_price_low DECIMAL(12, 2),
    position_size DECIMAL(12, 2),
    UNIQUE(user_id, symbol)
);
```

**Key Points:**
- ✅ `user_id` references `users.id` (UUID), NOT `clerk_user_id`
- ✅ Unique constraint prevents duplicate symbols per user
- ✅ Cascade delete removes watchlist items when user is deleted
- ✅ JSONB tags support flexible grouping/filtering

## API Endpoints

### GET /api/watchlist
Get user's watchlist

**Response:**
```json
{
  "watchlist": [
    {
      "id": 1,
      "user_id": "uuid-here",
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "asset_type": "stock",
      "added_at": "2025-01-15T10:30:00Z",
      "notes": "Long-term hold",
      "tags": ["tech", "growth"],
      "alert_price_high": 200.00,
      "alert_price_low": 150.00,
      "position_size": 100
    }
  ]
}
```

### POST /api/watchlist
Add item to watchlist

**Request:**
```json
{
  "symbol": "TSLA",
  "name": "Tesla Inc.",
  "asset_type": "stock",
  "notes": "Watch for Q4 earnings",
  "tags": ["tech", "ev"],
  "alert_price_high": 300.00,
  "alert_price_low": 200.00
}
```

**Response:**
```json
{
  "item": { /* Watchlist item */ }
}
```

### DELETE /api/watchlist?symbol=AAPL
Remove item from watchlist

**Response:**
```json
{
  "success": true
}
```

## Usage Examples

### Frontend (React)

```typescript
// Add to watchlist
const addToWatchlist = async (symbol: string, name: string) => {
  const response = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      name,
      asset_type: 'stock',
      tags: ['tech']
    })
  })
  const data = await response.json()
  return data.item
}

// Get watchlist
const getWatchlist = async () => {
  const response = await fetch('/api/watchlist')
  const data = await response.json()
  return data.watchlist
}

// Remove from watchlist
const removeFromWatchlist = async (symbol: string) => {
  await fetch(`/api/watchlist?symbol=${symbol}`, {
    method: 'DELETE'
  })
}
```

### Direct Database Queries

```typescript
import { db } from '@/lib/db/config'

// Get user's watchlist
const watchlist = await db`
  SELECT * FROM watchlist
  WHERE user_id = ${userId}
  ORDER BY added_at DESC
`

// Add item
await db`
  INSERT INTO watchlist (user_id, symbol, name, tags)
  VALUES (${userId}, ${symbol}, ${name}, ${JSON.stringify(tags)})
  ON CONFLICT (user_id, symbol) DO NOTHING
`

// Filter by tags
const techStocks = await db`
  SELECT * FROM watchlist
  WHERE user_id = ${userId}
  AND tags @> '["tech"]'::jsonb
`

// Check if symbol exists
const exists = await db`
  SELECT EXISTS(
    SELECT 1 FROM watchlist
    WHERE user_id = ${userId} AND symbol = ${symbol}
  )
`
```

## Migration

```bash
# Migration already run: 008_create_watchlist.sql
# To verify:
psql $DATABASE_URL -c "\\d watchlist"
```

## TypeScript Types

See `/lib/db/schema/watchlist.ts` for type definitions:
- `Watchlist` - Full watchlist item
- `WatchlistInsert` - Insert payload
- `WatchlistUpdate` - Update payload
