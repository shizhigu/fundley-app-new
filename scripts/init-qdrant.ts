#!/usr/bin/env tsx

/**
 * Initialize Qdrant collection with FMP field metadata
 * Run this script once to set up the vector database
 * 
 * Usage: pnpm tsx scripts/init-qdrant.ts
 */

import { fieldSearch } from '../lib/fmp/field-search'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  console.log('=== Initializing Qdrant Collection ===')
  console.log()
  
  // Check required environment variables
  const required = ['QDRANT_URL', 'QDRANT_API_KEY', 'JINA_API_KEY']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error()
    console.error('Please set these variables in your .env file')
    process.exit(1)
  }
  
  console.log('✓ Environment variables configured')
  console.log(`  - Qdrant URL: ${process.env.QDRANT_URL}`)
  console.log(`  - Jina API: Configured`)
  console.log()
  
  try {
    // Optional: Delete existing collection to start fresh
    // Uncomment if you want to reset the collection
    // const { getQdrantClient, FIELD_COLLECTION } = await import('../lib/fmp/qdrant-client')
    // try {
    //   const client = getQdrantClient()
    //   await client.deleteCollection(FIELD_COLLECTION)
    //   console.log('Deleted existing collection')
    // } catch (e) {
    //   // Collection might not exist, that's ok
    // }
    
    // Initialize field search (creates collection and indexes fields)
    console.log('Initializing field search...')
    await fieldSearch.initialize()
    
    // Test search functionality
    console.log()
    console.log('=== Testing Search Functionality ===')
    console.log()
    
    const testQueries = [
      'revenue',
      'profit margin',
      'research and development',
      'cash flow',
      'debt'
    ]
    
    for (const query of testQueries) {
      console.log(`Searching for: "${query}"`)
      const results = await fieldSearch.searchFields(query, 3)
      
      if (results.length > 0) {
        console.log('  Top results:')
        results.forEach((field, i) => {
          console.log(`    ${i + 1}. ${field.field} - ${field.name}`)
        })
      } else {
        console.log('  No results found')
      }
      console.log()
    }
    
    console.log('✅ Qdrant initialization complete!')
    console.log()
    console.log('Your vector database is ready for semantic field search.')
    console.log('The FMP tools will now use Qdrant for intelligent field discovery.')
    
  } catch (error) {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  }
}

// Run the initialization
main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})