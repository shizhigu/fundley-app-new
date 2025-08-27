#!/usr/bin/env npx tsx

import { config } from 'dotenv'
import { createFieldIndexes } from '../lib/fmp/qdrant-client'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  console.log('Creating Qdrant indexes...')
  
  try {
    await createFieldIndexes()
    console.log('✅ Indexes created successfully!')
  } catch (error) {
    console.error('❌ Failed to create indexes:', error)
    process.exit(1)
  }
}

main()