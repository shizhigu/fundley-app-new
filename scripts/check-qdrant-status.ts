#!/usr/bin/env npx tsx

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import { getQdrantClient, FIELD_COLLECTION } from '../lib/fmp/qdrant-client'

/**
 * Check the current status of the Qdrant collection
 */
async function checkQdrantStatus() {
  try {
    console.log('🔍 Checking Qdrant collection status...\n')
    
    const client = getQdrantClient()
    
    // Get collection info
    const collectionInfo = await client.getCollection(FIELD_COLLECTION)
    console.log('📊 Collection Info:')
    console.log(`  Name: ${FIELD_COLLECTION}`)
    console.log(`  Points Count: ${collectionInfo.points_count}`)
    console.log(`  Vector Size: ${collectionInfo.config?.params?.vectors?.size}`)
    console.log(`  Distance: ${collectionInfo.config?.params?.vectors?.distance}`)
    console.log('')
    
    // Get some sample points to see what data is there
    console.log('🔍 Sample data in collection:')
    const sampleResults = await client.scroll(FIELD_COLLECTION, {
      limit: 10,
      with_payload: true,
      with_vector: false
    })
    
    if (sampleResults.points.length > 0) {
      const categories = new Set<string>()
      const tools = new Set<string>()
      const statements = new Set<string>()
      
      sampleResults.points.forEach((point, idx) => {
        if (idx < 5) { // Show first 5 samples
          console.log(`  ${idx + 1}. ${point.payload?.name} (${point.payload?.field})`)
          console.log(`     Category: ${point.payload?.category}`)
          console.log(`     Tool: ${point.payload?.tool}`)
          console.log(`     Statement: ${point.payload?.statement || 'N/A'}`)
        }
        
        if (point.payload?.category) categories.add(point.payload.category as string)
        if (point.payload?.tool) tools.add(point.payload.tool as string)
        if (point.payload?.statement) statements.add(point.payload.statement as string)
      })
      
      console.log('\n📈 Data Summary:')
      console.log(`  Total Points: ${collectionInfo.points_count}`)
      console.log(`  Categories: ${Array.from(categories).join(', ')}`)
      console.log(`  Tools: ${Array.from(tools).join(', ')}`)
      console.log(`  Statements: ${Array.from(statements).join(', ')}`)
      
    } else {
      console.log('  ⚠️ No data found in collection')
    }
    
  } catch (error) {
    console.error('❌ Error checking Qdrant status:', error)
    throw error
  }
}

// Run the check
if (require.main === module) {
  checkQdrantStatus()
    .then(() => {
      console.log('\n🏁 Status check completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Status check failed:', error)
      process.exit(1)
    })
}

export { checkQdrantStatus }