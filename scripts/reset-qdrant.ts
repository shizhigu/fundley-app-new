#!/usr/bin/env tsx

/**
 * Reset Qdrant collection - deletes and recreates it
 */

import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const { getQdrantClient, FIELD_COLLECTION } = await import('../lib/fmp/qdrant-client')
  
  console.log('Resetting Qdrant collection...')
  
  try {
    const client = getQdrantClient()
    
    // Try to delete existing collection
    try {
      await client.deleteCollection(FIELD_COLLECTION)
      console.log(`✓ Deleted collection: ${FIELD_COLLECTION}`)
    } catch (e) {
      console.log(`Collection ${FIELD_COLLECTION} does not exist (OK)`)
    }
    
    console.log('Collection reset complete. Run "pnpm qdrant:init" to recreate and index.')
  } catch (error) {
    console.error('Error resetting collection:', error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})