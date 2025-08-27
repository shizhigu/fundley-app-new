#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'node:path'

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
import { QdrantClient } from '@qdrant/js-client-rest'
import { ALL_FINANCIAL_FIELDS } from '../lib/fmp/field-metadata'
import { voyageEmbeddings } from '../lib/fmp/voyage-embeddings'

const COLLECTION_NAME = 'fmp_fields_voyage_finance'
const VECTOR_SIZE = 1024

async function resetCollection() {
  console.log('🚀 Resetting Qdrant collection with Voyage Finance embeddings...')
  
  const qdrantUrl = process.env.QDRANT_URL
  const qdrantApiKey = process.env.QDRANT_API_KEY
  const voyageApiKey = process.env.VOYAGE_API_KEY
  
  if (!qdrantUrl || !qdrantApiKey) {
    console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY in environment variables')
    process.exit(1)
  }
  
  if (!voyageApiKey) {
    console.error('❌ Missing VOYAGE_API_KEY in environment variables')
    console.log('📝 Please add VOYAGE_API_KEY to your .env.local file')
    console.log('   Visit https://www.voyageai.com/ to get your API key')
    process.exit(1)
  }
  
  console.log(`📍 Connecting to Qdrant at: ${qdrantUrl}`)
  console.log(`🎯 Using Voyage Finance v2 model (1024 dimensions)`)
  
  const client = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
  })
  
  try {
    // Delete existing collection if it exists
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME)
    
    if (exists) {
      console.log(`📦 Deleting existing collection: ${COLLECTION_NAME}`)
      await client.deleteCollection(COLLECTION_NAME)
      console.log('✅ Collection deleted')
    }
    
    // Create new collection with 1024 dimensions for Voyage Finance
    console.log(`📦 Creating new collection: ${COLLECTION_NAME} with ${VECTOR_SIZE} dimensions`)
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    })
    console.log('✅ Collection created')
    
    // Index all fields with Voyage Finance embeddings
    console.log(`📊 Indexing ${ALL_FINANCIAL_FIELDS.length} fields with Voyage Finance model...`)
    
    const batchSize = 10
    const points: any[] = []
    
    for (let i = 0; i < ALL_FINANCIAL_FIELDS.length; i += batchSize) {
      const batch = ALL_FINANCIAL_FIELDS.slice(i, i + batchSize)
      
      // Create structured searchable text optimized for financial domain
      const texts = batch.map(field => {
        const parts = [
          `Financial Field: ${field.name}`,
          `Definition: ${field.description}`,
          `Category: ${field.category}`,
          field.aliases && field.aliases.length > 0 
            ? `Also known as: ${field.aliases.join(', ')}`
            : null,
          field.useCases && field.useCases.length > 0
            ? `Used for: ${field.useCases.join('; ')}`
            : null,
          field.unit ? `Unit: ${field.unit}` : null
        ]
        return `${parts.filter(p => p !== null).join('. ')}.`
      })
      
      // Generate embeddings with Voyage Finance model
      const startTime = Date.now()
      const embeddings = await voyageEmbeddings.embedDocuments(texts)
      const embedTime = Date.now() - startTime
      console.log(`  ⚡ Batch ${Math.floor(i/batchSize) + 1}: Generated embeddings in ${embedTime}ms`)
      
      // Create points for Qdrant
      batch.forEach((field, idx) => {
        const globalIndex = i + idx
        points.push({
          id: globalIndex,
          vector: embeddings[idx],
          payload: {
            field: field.field,
            name: field.name,
            description: field.description,
            category: field.category,
            aliases: field.aliases || [],
            useCases: field.useCases || [],
            unit: field.unit || null,
            tool: field.tool,
            statement: field.statement || null
          }
        })
      })
      
      console.log(`  ✅ Processed ${Math.min(i + batchSize, ALL_FINANCIAL_FIELDS.length)}/${ALL_FINANCIAL_FIELDS.length} fields`)
    }
    
    // Upload to Qdrant
    console.log('📤 Uploading to Qdrant...')
    const uploadBatchSize = 100
    for (let i = 0; i < points.length; i += uploadBatchSize) {
      const uploadBatch = points.slice(i, i + uploadBatchSize)
      await client.upsert(COLLECTION_NAME, {
        wait: true,
        points: uploadBatch
      })
      console.log(`  ✅ Uploaded ${Math.min(i + uploadBatchSize, points.length)}/${points.length} points`)
    }
    
    // Test search performance
    console.log('\n🧪 Testing search performance with Voyage Finance model...')
    const testQueries = [
      'revenue growth',
      'profit margin', 
      'debt coverage',
      'cash flow',
      'return on equity'
    ]
    
    for (const query of testQueries) {
      const startTime = Date.now()
      const embedding = await voyageEmbeddings.embedQuery(query)
      const embedTime = Date.now() - startTime
      
      const searchStart = Date.now()
      const results = await client.search(COLLECTION_NAME, {
        vector: embedding,
        limit: 5,
        with_payload: true
      })
      const searchTime = Date.now() - searchStart
      
      console.log(`  📊 Query: "${query}"`)
      console.log(`     Embed: ${embedTime}ms | Search: ${searchTime}ms | Total: ${embedTime + searchTime}ms`)
      console.log(`     Top result: ${results[0]?.payload?.name || 'N/A'} (score: ${results[0]?.score?.toFixed(3) || 'N/A'})`)
    }
    
    console.log('\n✅ Collection reset complete with Voyage Finance embeddings!')
    console.log('💡 Voyage Finance model is optimized for financial terminology and should provide better accuracy')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetCollection()