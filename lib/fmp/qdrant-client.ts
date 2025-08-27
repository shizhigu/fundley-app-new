import { QdrantClient } from '@qdrant/js-client-rest'
import { voyageEmbeddings } from './voyage-embeddings'

// Initialize Qdrant client lazily
let qdrantClient: QdrantClient | null = null

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    const QDRANT_URL = process.env.QDRANT_URL
    const QDRANT_API_KEY = process.env.QDRANT_API_KEY
    
    if (!QDRANT_URL || !QDRANT_API_KEY) {
      throw new Error('Qdrant configuration missing. Set QDRANT_URL and QDRANT_API_KEY in environment variables.')
    }
    
    qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    })
  }
  
  return qdrantClient
}

// Collection configuration
export const FIELD_COLLECTION = 'fmp_fields_voyage_finance' // Collection for Voyage Finance embeddings
const VECTOR_SIZE = 1024 // Voyage Finance v2 uses 1024 dimensions

/**
 * Initialize Qdrant collection for FMP field metadata
 */
export async function initializeFieldCollection() {
  try {
    const client = getQdrantClient()
    
    // Check if collection exists
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === FIELD_COLLECTION)
    
    if (!exists) {
      console.log(`Creating Qdrant collection: ${FIELD_COLLECTION}`)
      await client.createCollection(FIELD_COLLECTION, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        }
      })
      console.log(`Collection ${FIELD_COLLECTION} created successfully`)
    } else {
      console.log(`Collection ${FIELD_COLLECTION} already exists`)
    }
    
    // Create index for 'field' payload field to enable filtering
    console.log('Creating index for field filtering...')
    await client.createPayloadIndex(FIELD_COLLECTION, {
      field_name: 'field',
      field_schema: 'keyword'
    })
    console.log('Field index created successfully')
    
  } catch (error: any) {
    // Ignore error if index already exists
    if (error.message && error.message.includes('already exists')) {
      console.log('Field index already exists')
    } else {
      console.error('Error initializing Qdrant collection:', error)
      throw error
    }
  }
}

/**
 * Index field metadata into Qdrant
 */
export async function indexFieldMetadata(fields: Array<{
  field: string
  name: string
  description: string
  category: string
  aliases?: string[]
  useCases?: string[]
  unit?: string
  tool: string
  statement?: string
}>) {
  try {
    console.log(`Indexing ${fields.length} fields into Qdrant...`)
    
    // Generate embeddings for all fields in batches
    const batchSize = 10
    const points: any[] = []
    
    for (let i = 0; i < fields.length; i += batchSize) {
      const batch = fields.slice(i, i + batchSize)
      
      // Create structured searchable text using best practices
      const texts = batch.map(field => {
        // Build structured text with semantic markers
        const parts = [
          // Primary identifier
          `Field: ${field.name}`,
          
          // Core definition
          `Definition: ${field.description}`,
          
          // Category context
          `Category: ${field.category}`,
          
          // Alternative names (if exists)
          field.aliases && field.aliases.length > 0 
            ? `Also known as: ${field.aliases.join(', ')}`
            : null,
          
          // Practical applications (if exists)
          field.useCases && field.useCases.length > 0
            ? `Used for: ${field.useCases.join('; ')}`
            : null
        ]
        
        // Filter out null parts and join with period for semantic separation
        return parts.filter(p => p !== null).join('. ') + '.'
      })
      
      // Generate embeddings for the batch using Voyage Finance model
      const embeddings = await voyageEmbeddings.embedDocuments(texts)
      
      // Create points for Qdrant (use index as ID, store field name in payload)
      batch.forEach((field, idx) => {
        const globalIndex = i + idx // Calculate global index for unique ID
        points.push({
          id: globalIndex, // Use numeric ID for Qdrant
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
      
      console.log(`Processed ${Math.min(i + batchSize, fields.length)}/${fields.length} fields`)
    }
    
    // Upload to Qdrant in batches
    const uploadBatchSize = 100
    const client = getQdrantClient()
    for (let i = 0; i < points.length; i += uploadBatchSize) {
      const uploadBatch = points.slice(i, i + uploadBatchSize)
      await client.upsert(FIELD_COLLECTION, {
        wait: true,
        points: uploadBatch
      })
      console.log(`Uploaded ${Math.min(i + uploadBatchSize, points.length)}/${points.length} points to Qdrant`)
    }
    
    console.log('Field metadata indexing complete')
  } catch (error) {
    console.error('Error indexing field metadata:', error)
    throw error
  }
}

/**
 * Search for relevant fields based on a query
 */
export async function searchFields(
  query: string, 
  limit: number = 5
): Promise<Array<{
  field: string
  name: string
  description: string
  category: string
  tool: string
  statement?: string
  score: number
  aliases?: string[]
  useCases?: string[]
}>> {
  try {
    const startTime = Date.now()
    
    // Generate embedding for the query using Voyage Finance model
    const embedStartTime = Date.now()
    const queryEmbedding = await voyageEmbeddings.embedQuery(query)
    const embedTime = Date.now() - embedStartTime
    
    // Search in Qdrant
    const searchStartTime = Date.now()
    const client = getQdrantClient()
    const searchResult = await client.search(FIELD_COLLECTION, {
      vector: queryEmbedding,
      limit,
      with_payload: true
    })
    const searchTime = Date.now() - searchStartTime
    
    console.log(`Qdrant search timing - Embed: ${embedTime}ms, Vector Search: ${searchTime}ms`)
    
    // Format results
    return searchResult.map(result => ({
      field: result.payload?.field as string,
      name: result.payload?.name as string,
      description: result.payload?.description as string,
      category: result.payload?.category as string,
      tool: result.payload?.tool as string,
      statement: result.payload?.statement as string | undefined,
      aliases: result.payload?.aliases as string[] | undefined,
      useCases: result.payload?.useCases as string[] | undefined,
      score: result.score
    }))
  } catch (error) {
    console.error('Error searching fields:', error)
    throw error
  }
}

/**
 * Create indexes for payload fields to enable filtering
 * Call this separately if collection already exists but needs indexes
 */
export async function createFieldIndexes() {
  try {
    const client = getQdrantClient()
    
    console.log('Creating indexes for field filtering...')
    
    // Create index for 'field' - the actual field name in the data
    await client.createPayloadIndex(FIELD_COLLECTION, {
      field_name: 'field',
      field_schema: 'keyword'
    })
    console.log('Index for "field" created successfully')
    
    // Optional: Create indexes for other commonly filtered fields
    await client.createPayloadIndex(FIELD_COLLECTION, {
      field_name: 'category',
      field_schema: 'keyword'
    })
    console.log('Index for "category" created successfully')
    
    await client.createPayloadIndex(FIELD_COLLECTION, {
      field_name: 'tool',
      field_schema: 'keyword'
    })
    console.log('Index for "tool" created successfully')
    
    console.log('All indexes created successfully')
  } catch (error: any) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Some indexes already exist, continuing...')
    } else {
      console.error('Error creating indexes:', error)
      throw error
    }
  }
}

/**
 * Get field metadata by exact field name
 * Since we use numeric IDs, we need to search by payload filter
 */
export async function getFieldByName(fieldName: string) {
  try {
    const client = getQdrantClient()
    // Use search with exact match filter instead of scroll
    const result = await client.search(FIELD_COLLECTION, {
      vector: new Array(1024).fill(0), // Dummy vector since we're filtering only
      filter: {
        must: [{
          key: 'field',
          match: { 
            value: fieldName 
          }
        }]
      },
      limit: 1,
      with_payload: true,
      with_vector: false
    })
    
    if (!result || result.length === 0) {
      return null
    }
    
    return result[0].payload
  } catch (error: any) {
    console.error('Error retrieving field:', error)
    if (error.data) {
      console.error('Qdrant error details:', JSON.stringify(error.data, null, 2))
    }
    return null
  }
}